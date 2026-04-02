from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Count
from contratos.models import Contrato, EstadoPago


def calcular_estadisticas_globales() -> dict:
    hoy   = date.today()
    en_30 = hoy + timedelta(days=30)
    qs    = Contrato.objects.filter(eliminado=False)

    total      = qs.count()
    activos    = qs.filter(fechaInicio__lte=hoy, fechaFin__gt=en_30).count()
    vencidos   = qs.filter(fechaFin__lt=hoy).count()
    por_vencer = qs.filter(fechaFin__range=[hoy, en_30]).count()

    # Montos por moneda (solo contratos activos)
    activos_qs = qs.filter(fechaInicio__lte=hoy, fechaFin__gte=hoy)
    monedas: dict = {}
    for row in activos_qs.values('monedaMensual').annotate(total=Sum('valorMensual')):
        monedas[row['monedaMensual']] = str(row['total'] or Decimal('0'))

    monto_total = sum(float(v) for v in monedas.values())

    # Distribución por tipo de propiedad
    tipos: dict = {}
    for row in qs.values('tipoPropiedad').annotate(cantidad=Count('id')):
        tipos[row['tipoPropiedad']] = row['cantidad']

    return {
        'totalContratos':    total,
        'activos':           activos,
        'vencidos':          vencidos,
        'porVencer':         por_vencer,
        'montoTotalMensual': str(round(monto_total, 2)),
        'monedas':           monedas,
        'tiposPropiedades':  tipos,
    }
