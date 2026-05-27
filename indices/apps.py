import os

from django.apps import AppConfig


class IndicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'indices'
    verbose_name = 'Índices'

    def ready(self):
        # RUN_MAIN='true' → proceso hijo del reloader (desarrollo)
        # RUN_MAIN ausente  → Gunicorn u otro servidor de producción
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
            from .scheduler import iniciar_scheduler
            iniciar_scheduler()
