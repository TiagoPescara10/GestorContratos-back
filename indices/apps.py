import os

from django.apps import AppConfig


class IndicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'indices'
    verbose_name = 'Índices'

    def ready(self):
        # Deshabilitar scheduler temporalmente en producción
        # TODO: Configurar scheduler apropiadamente para producción
        pass
