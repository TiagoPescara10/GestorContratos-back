from django.contrib import admin
from .models import Contrato, EstadoMensual, AumentoMensual


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display  = ['id', 'inquilinoNombre', 'propietarioNombre', 'localidad',
                     'tipoPropiedad', 'valorMensual', 'monedaMensual', 'fechaInicio', 'fechaFin']
    list_filter   = ['tipoPropiedad', 'monedaMensual', 'eliminado']
    search_fields = ['inquilinoNombre', 'propietarioNombre', 'localidad', 'inquilinoDni']
    readonly_fields = ['duracion', 'createdAt', 'updatedAt']


@admin.register(EstadoMensual)
class EstadoMensualAdmin(admin.ModelAdmin):
    list_display = ['contrato', 'mes', 'anio', 'estado', 'montoBase', 'montoFinal', 'tieneRecargo']
    list_filter  = ['estado', 'anio']


@admin.register(AumentoMensual)
class AumentoMensualAdmin(admin.ModelAdmin):
    list_display = ['estadoMensual', 'tipoAumento', 'porcentajeAumento', 'montoAnterior',
                    'montoNuevo', 'aplicadoEn']
    list_filter  = ['tipoAumento']
