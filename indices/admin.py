from django.contrib import admin
from .models import HistorialIndice, IndiceICL, IndiceCP

@admin.register(HistorialIndice)
class HistorialIndiceAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'valor', 'anterior', 'fecha', 'consultadoEn']
    list_filter  = ['tipo']

@admin.register(IndiceICL)
class IndiceICLAdmin(admin.ModelAdmin):
    list_display = ['anio', 'mes', 'nivel', 'fecha_actualizacion']

@admin.register(IndiceCP)
class IndiceCPAdmin(admin.ModelAdmin):
    list_display = ['anio', 'mes', 'nivel', 'fecha_actualizacion']
