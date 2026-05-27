"""
Lógica de negocio de contratos:
  - Generación de meses
  - Cálculo y aplicación de aumentos
  - Aplicación de mora
  - Resumen financiero
"""
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
import calendar

from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.utils import timezone

from .models import Contrato, EstadoMensual, AumentoMensual, EstadoPago, TipoAumentoHistorico

logger = logging.getLogger('contratos')


def _calcular_dias_atraso(estado_mensual: EstadoMensual, fecha_referencia: date | None = None) -> int:
    fecha = fecha_referencia or timezone.localdate()
    return max((fecha - estado_mensual.fecha_vencimiento).days, 0)


def _aplicar_mora_en_mes(
    estado_mensual: EstadoMensual,
    porcentaje: Decimal,
    aplicado_por: str = '',
    dias_atraso: int | None = None,
    recargo_mora: Decimal | None = None,
) -> dict | None:
    if estado_mensual.estado == EstadoPago.PAGADO:
        raise ValueError('No se puede aplicar mora a un mes pagado.')

    if estado_mensual.mora_aplicada:
        raise ValueError('La mora ya fue aplicada para este mes.')

    if dias_atraso is None:
        dias_atraso = _calcular_dias_atraso(estado_mensual)

    if dias_atraso <= 0:
        return None

    monto_anterior = estado_mensual.montoFinal
    if recargo_mora is None:
        monto_nuevo = calcular_nuevo_monto(monto_anterior, porcentaje)
        recargo_mora = (monto_nuevo - monto_anterior).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    else:
        recargo_mora = Decimal(str(recargo_mora)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        monto_nuevo = (monto_anterior + recargo_mora).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    AumentoMensual.objects.create(
        estadoMensual     = estado_mensual,
        tipoAumento       = TipoAumentoHistorico.MORA,
        porcentajeAumento = porcentaje,
        montoAnterior     = monto_anterior,
        montoNuevo        = monto_nuevo,
        razon             = f'Recargo por mora {dias_atraso} dias',
        aplicadoPor       = aplicado_por,
    )

    estado_mensual.montoFinal = monto_nuevo
    estado_mensual.tieneRecargo = True
    estado_mensual.mora_aplicada = True
    estado_mensual.dias_atraso = dias_atraso
    estado_mensual.recargo_mora = recargo_mora
    estado_mensual.fecha_aplicacion_mora = timezone.now()
    estado_mensual.save(update_fields=[
        'montoFinal', 'tieneRecargo', 'mora_aplicada', 'dias_atraso',
        'recargo_mora', 'fecha_aplicacion_mora', 'updatedAt'
    ])

    return {
        'mes': estado_mensual.mes,
        'anio': estado_mensual.anio,
        'dias_atraso': estado_mensual.dias_atraso,
        'recargo_mora': str(estado_mensual.recargo_mora),
        'montoAnterior': str(monto_anterior),
        'montoNuevo': str(monto_nuevo),
    }


def generar_meses(contrato: Contrato, sobreescribir: bool = False) -> list:
    """
    Genera todos los EstadoMensual entre fechaInicio y fechaFin.
    Si sobreescribir=True elimina los existentes primero.
    Devuelve lista de objetos creados (solo los nuevos).
    """
    if sobreescribir:
        contrato.meses.all().delete()

    creados = []
    # El primer mes debe ser el de la fecha de inicio, aunque el día sea el último del mes
    cursor = date(contrato.fechaInicio.year, contrato.fechaInicio.month, 1)
    fin    = date(contrato.fechaFin.year,    contrato.fechaFin.month,    1)

    # Si la fecha de inicio es, por ejemplo, 31/12/2025, esto asegura que diciembre 2025 se incluya
    while cursor <= fin:
        mes_idx = cursor.month - 1
        obj, created = EstadoMensual.objects.get_or_create(
            contrato = contrato,
            mes      = mes_idx,
            anio     = cursor.year,
            defaults = {
                'montoBase':  contrato.valorMensual,
                'montoFinal': contrato.valorMensual,
                'estado':     EstadoPago.PENDIENTE,
            }
        )
        if created:
            creados.append(obj)
        cursor += relativedelta(months=1)

    logger.info('Contrato %s: %d meses generados', contrato.pk, len(creados))
    return creados


def calcular_nuevo_monto(monto_anterior: Decimal, porcentaje: Decimal) -> Decimal:
    """Aplica porcentaje con redondeo bancario a 2 decimales."""
    nuevo = monto_anterior * (1 + porcentaje / Decimal('100'))
    return nuevo.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


@transaction.atomic
def aplicar_aumento(
    contrato: Contrato,
    tipo_aumento: str,
    porcentaje: Decimal | None = None,
    monto_fijo: Decimal | None = None,
    indice_anterior: Decimal | None = None,
    indice_nuevo: Decimal | None = None,
    mes_desde: int | None = None,
    anio_desde: int | None = None,
    razon: str = '',
    aplicado_por: str = '',
) -> list:
    from datetime import date
    from django.db.models import Q

    hoy = date.today()

    # Construir filtro de meses futuros o actuales no pagados.
    # Nota: el campo mes se guarda 0-indexed, mientras que date.today().month es 1-indexed.
    filtro_futuro = Q(anio__gt=hoy.year) | Q(anio=hoy.year, mes__gte=hoy.month - 1)

    # Si se especifica mes de inicio, filtrar solo desde ese mes sin restricción de futuro.
    # Esto permite aplicar aumentos históricos a meses del pasado.
    if mes_desde and anio_desde:
        mes_idx = mes_desde - 1  # convertir a 0-indexed
        filtro_desde = Q(anio__gt=anio_desde) | Q(anio=anio_desde, mes__gte=mes_idx)
        qs = contrato.meses.exclude(estado=EstadoPago.PAGADO).filter(
            filtro_desde
        ).order_by('anio', 'mes')
    else:
        qs = contrato.meses.exclude(estado=EstadoPago.PAGADO).filter(
            filtro_futuro
        ).order_by('anio', 'mes')

    # Materializa el queryset una sola vez
    meses_list = list(qs)

    # Una query para todos los meses en lugar de N exists() individuales
    aumentos_existentes = set(
        AumentoMensual.objects.filter(
            estadoMensual__in=meses_list,
            tipoAumento=tipo_aumento,
        ).values_list('estadoMensual_id', flat=True)
    )

    nuevos_aumentos   = []
    meses_a_actualizar = []
    resultados        = []
    ahora             = timezone.now()

    for em in meses_list:
        monto_anterior = em.montoFinal

        if tipo_aumento == 'monto_fijo':
            if monto_fijo is None:
                raise ValueError('monto_fijo requerido para tipo de aumento monto_fijo')
            monto_nuevo = (monto_anterior + monto_fijo).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            porcentaje_aplicado = (
                (monto_fijo / monto_anterior * Decimal('100')).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP
                ) if monto_anterior != 0 else Decimal('0')
            )
        else:
            if porcentaje is None:
                raise ValueError('porcentaje requerido para tipo de aumento distinto de monto_fijo')
            monto_nuevo = calcular_nuevo_monto(monto_anterior, porcentaje)
            porcentaje_aplicado = porcentaje

        nuevos_aumentos.append(AumentoMensual(
            estadoMensual     = em,
            tipoAumento       = tipo_aumento,
            indiceAnterior    = indice_anterior,
            indiceNuevo       = indice_nuevo,
            porcentajeAumento = porcentaje_aplicado,
            montoAnterior     = monto_anterior,
            montoNuevo        = monto_nuevo,
            razon             = razon or f'Aumento {tipo_aumento} {porcentaje_aplicado}%',
            aplicadoPor       = aplicado_por,
        ))

        em.montoFinal       = monto_nuevo
        em.aumento_aplicado = True
        em.updatedAt        = ahora
        meses_a_actualizar.append(em)

        resultados.append({
            'mes':                em.mes,
            'anio':               em.anio,
            'montoAnterior':      str(monto_anterior),
            'montoNuevo':         str(monto_nuevo),
            'porcentajeAplicado': str(porcentaje_aplicado),
        })

    AumentoMensual.objects.bulk_create(nuevos_aumentos)
    EstadoMensual.objects.bulk_update(
        meses_a_actualizar, ['montoFinal', 'aumento_aplicado', 'updatedAt']
    )

    logger.info(
        'Contrato %s: aumento %s aplicado a %d meses',
        contrato.pk, tipo_aumento, len(resultados)
    )
    return resultados


@transaction.atomic
def aplicar_mora(
    contrato: Contrato,
    aplicado_por: str = '',
    mes: int | None = None,
    anio: int | None = None,
    dias_atraso: int | None = None,
    recargo_mora: Decimal | None = None,
) -> list:
    """
    Aplica recargo por mora según las reglas de negocio:
    - Mes pasado sin pagar → siempre recargo
    - Mes actual sin pagar y hoy > diaPago → recargo
    - Mes futuro → sin recargo
    """
    if not contrato.valorInteresMora:
        return []

    porcentaje = contrato.valorInteresMora
    resultados = []

    if mes is not None and anio is not None:
        estado_mensual = contrato.meses.filter(mes=mes - 1, anio=anio).first()
        if not estado_mensual:
            raise EstadoMensual.DoesNotExist('No existe el mes indicado para este contrato.')

        resultado = _aplicar_mora_en_mes(
            estado_mensual=estado_mensual,
            porcentaje=porcentaje,
            aplicado_por=aplicado_por,
            dias_atraso=dias_atraso,
            recargo_mora=recargo_mora,
        )
        return [resultado] if resultado else []

    for em in contrato.meses.exclude(estado=EstadoPago.PAGADO):
        if not em.tiene_recargo_calculado:
            continue

        try:
            resultado = _aplicar_mora_en_mes(
                estado_mensual=em,
                porcentaje=porcentaje,
                aplicado_por=aplicado_por,
                dias_atraso=_calcular_dias_atraso(em),
            )
        except ValueError:
            continue

        if resultado:
            resultados.append(resultado)

    logger.info('Contrato %s: mora aplicada a %d meses', contrato.pk, len(resultados))
    return resultados


def resumen_financiero(contrato: Contrato) -> dict:
    """Resumen financiero completo de un contrato."""
    meses      = contrato.meses.all()
    pagados    = meses.filter(estado=EstadoPago.PAGADO).count()
    pendientes = meses.filter(estado=EstadoPago.PENDIENTE).count()
    parciales  = meses.filter(estado=EstadoPago.PARCIAL).count()

    # Deuda: suma de meses vencidos/actuales sin pagar
    deuda = Decimal('0')
    for m in meses.exclude(estado=EstadoPago.PAGADO):
        if m.tiene_recargo_calculado or date(m.anio, m.mes + 1, 1) <= date.today().replace(day=1):
            deuda += m.montoFinal

    # Mes actual
    hoy = date.today()
    mes_actual = meses.filter(mes=hoy.month - 1, anio=hoy.year).first()
    monto_final_actual = mes_actual.montoFinal if mes_actual else contrato.valorMensual

    # Próximo vencimiento
    proximo = meses.filter(estado=EstadoPago.PENDIENTE).order_by('anio', 'mes').first()

    return {
        'montoBaseMensual':   str(contrato.valorMensual),
        'montoFinalActual':   str(monto_final_actual),
        'proximoVencimiento': str(proximo.fecha_vencimiento) if proximo else None,
        'diasRestantes':      contrato.dias_restantes,
        'estadoPagos': {
            'pagado':    pagados,
            'pendiente': pendientes,
            'parcial':   parciales,
            'total':     meses.count(),
        },
        'deuda': str(deuda),
    }
