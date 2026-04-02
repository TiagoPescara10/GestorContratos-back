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

from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.utils import timezone

from .models import Contrato, EstadoMensual, AumentoMensual, EstadoPago, TipoAumentoHistorico

logger = logging.getLogger('contratos')


def generar_meses(contrato: Contrato, sobreescribir: bool = False) -> list:
    """
    Genera todos los EstadoMensual entre fechaInicio y fechaFin.
    Si sobreescribir=True elimina los existentes primero.
    Devuelve lista de objetos creados (solo los nuevos).
    """
    if sobreescribir:
        contrato.meses.all().delete()

    creados = []
    cursor = date(contrato.fechaInicio.year, contrato.fechaInicio.month, 1)
    fin    = date(contrato.fechaFin.year,    contrato.fechaFin.month,    1)

    while cursor <= fin:
        # mes 0-indexed (igual que JS Date.getMonth())
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
    """
    Aplica aumento acumulativo a todos los meses pendientes/parciales.
    Si mes_desde/anio_desde se proveen, solo aplica desde ese mes en adelante.
    """
    qs = contrato.meses.exclude(estado=EstadoPago.PAGADO).order_by('anio', 'mes')

    if mes_desde and anio_desde:
        mes_idx = mes_desde - 1  # convertir a 0-indexed
        qs = qs.filter(
            anio__gt=anio_desde
        ) | contrato.meses.filter(
            anio=anio_desde,
            mes__gte=mes_idx,
        ).exclude(estado=EstadoPago.PAGADO).order_by('anio', 'mes')

    resultados = []
    for em in qs:
        monto_anterior = em.montoFinal

        if tipo_aumento == 'monto_fijo':
            if monto_fijo is None:
                raise ValueError('monto_fijo requerido para tipo de aumento monto_fijo')
            monto_nuevo = (monto_anterior + monto_fijo).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            porcentaje_aplicado = (monto_fijo / monto_anterior * Decimal('100')).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP) if monto_anterior != 0 else Decimal('0')
        else:
            if porcentaje is None:
                raise ValueError('porcentaje requerido para tipo de aumento distinto de monto_fijo')
            monto_nuevo = calcular_nuevo_monto(monto_anterior, porcentaje)
            porcentaje_aplicado = porcentaje

        AumentoMensual.objects.create(
            estadoMensual     = em,
            tipoAumento       = tipo_aumento,
            indiceAnterior    = indice_anterior,
            indiceNuevo       = indice_nuevo,
            porcentajeAumento = porcentaje_aplicado,
            montoAnterior     = monto_anterior,
            montoNuevo        = monto_nuevo,
            razon             = razon or f'Aumento {tipo_aumento} {porcentaje_aplicado}%',
            aplicadoPor       = aplicado_por,
        )

        em.montoFinal = monto_nuevo
        em.save(update_fields=['montoFinal', 'updatedAt'])

        resultados.append({
            'mes':               em.mes,
            'anio':              em.anio,
            'montoAnterior':     str(monto_anterior),
            'montoNuevo':        str(monto_nuevo),
            'porcentajeAplicado': str(porcentaje),
        })

    logger.info(
        'Contrato %s: aumento %s %.4f%% aplicado a %d meses',
        contrato.pk, tipo_aumento, porcentaje, len(resultados)
    )
    return resultados


@transaction.atomic
def aplicar_mora(contrato: Contrato, aplicado_por: str = '') -> list:
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

    for em in contrato.meses.exclude(estado=EstadoPago.PAGADO):
        if not em.tiene_recargo_calculado:
            continue

        monto_anterior = em.montoFinal
        monto_nuevo    = calcular_nuevo_monto(monto_anterior, porcentaje)

        AumentoMensual.objects.create(
            estadoMensual     = em,
            tipoAumento       = TipoAumentoHistorico.MORA,
            porcentajeAumento = porcentaje,
            montoAnterior     = monto_anterior,
            montoNuevo        = monto_nuevo,
            razon             = f'Recargo por mora {porcentaje}%',
            aplicadoPor       = aplicado_por,
        )

        em.montoFinal   = monto_nuevo
        em.tieneRecargo = True
        em.save(update_fields=['montoFinal', 'tieneRecargo', 'updatedAt'])

        resultados.append({
            'mes':           em.mes,
            'anio':          em.anio,
            'montoAnterior': str(monto_anterior),
            'montoNuevo':    str(monto_nuevo),
        })

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
