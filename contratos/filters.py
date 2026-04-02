from datetime import date, timedelta
import django_filters
from .models import Contrato


class ContratoFilter(django_filters.FilterSet):
    tipoPropiedad = django_filters.CharFilter(field_name='tipoPropiedad')
    monedaMensual = django_filters.CharFilter(field_name='monedaMensual')
    provincia     = django_filters.CharFilter(field_name='provincia', lookup_expr='icontains')
    localidad     = django_filters.CharFilter(field_name='localidad', lookup_expr='icontains')
    inquilino     = django_filters.CharFilter(field_name='inquilinoNombre', lookup_expr='icontains')
    propietario   = django_filters.CharFilter(field_name='propietarioNombre', lookup_expr='icontains')
    fechaDesde    = django_filters.DateFilter(field_name='fechaInicio', lookup_expr='gte')
    fechaHasta    = django_filters.DateFilter(field_name='fechaFin',    lookup_expr='lte')
    montoMin      = django_filters.NumberFilter(field_name='valorMensual', lookup_expr='gte')
    montoMax      = django_filters.NumberFilter(field_name='valorMensual', lookup_expr='lte')
    estado        = django_filters.CharFilter(method='filter_estado')

    class Meta:
        model  = Contrato
        fields = ['tipoPropiedad', 'monedaMensual']

    def filter_estado(self, queryset, name, value):
        hoy = date.today()
        if value == 'activo':
            # Activo y con más de 30 días para vencer
            en_30 = hoy + timedelta(days=30)
            return queryset.filter(fechaInicio__lte=hoy, fechaFin__gt=en_30)
        if value == 'vencido':
            return queryset.filter(fechaFin__lt=hoy)
        if value in ('proxAvencer', 'proxVencer'):
            en_30 = hoy + timedelta(days=30)
            return queryset.filter(fechaFin__range=[hoy, en_30])
        return queryset
