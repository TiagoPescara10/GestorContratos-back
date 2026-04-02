from django.contrib import admin
from .models import HistorialIndice

@admin.register(HistorialIndice)
class HistorialIndiceAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'valor', 'anterior', 'fecha', 'consultadoEn']
    list_filter  = ['tipo']
