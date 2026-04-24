import os

from django.apps import AppConfig


class IndicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'indices'
    verbose_name = 'Índices'

    def ready(self):
        # Iniciar scheduler solo si no estamos en Render (usará cron jobs)
        if 'onrender.com' not in os.environ.get('RENDER_EXTERNAL_HOSTNAME', ''):
            # Evitar doble arranque con el reloader de desarrollo
            if os.environ.get('RUN_MAIN') == 'true':
                from .scheduler import iniciar_scheduler
                iniciar_scheduler()
