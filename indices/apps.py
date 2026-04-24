import os

from django.apps import AppConfig


class IndicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'indices'
    verbose_name = 'Índices'

    def ready(self):
        # Evitar doble arranque con el reloader de desarrollo
        if os.environ.get('RUN_MAIN') != 'true':
            return
        from .scheduler import iniciar_scheduler
        iniciar_scheduler()
