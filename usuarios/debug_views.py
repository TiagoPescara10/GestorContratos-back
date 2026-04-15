from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
import os

@csrf_exempt
@require_GET
def debug_config(request):
    """
    Endpoint temporal para depurar configuración del servidor
    """
    config_info = {
        'DEBUG': getattr(settings, 'DEBUG', 'NOT_SET'),
        'ALLOWED_HOSTS': getattr(settings, 'ALLOWED_HOSTS', []),
        'CORS_ALLOWED_ORIGINS': getattr(settings, 'CORS_ALLOWED_ORIGINS', []),
        'CORS_ALLOW_ALL_ORIGINS': getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', 'NOT_SET'),
        'CORS_ALLOW_CREDENTIALS': getattr(settings, 'CORS_ALLOW_CREDENTIALS', 'NOT_SET'),
        'SECRET_KEY': getattr(settings, 'SECRET_KEY', 'NOT_SET')[:10] + '...' if getattr(settings, 'SECRET_KEY', None) else 'NOT_SET',
        'DATABASES': {
            'default': {
                'ENGINE': settings.DATABASES['default']['ENGINE'],
                'NAME': settings.DATABASES['default']['NAME'],
            }
        },
        'ENV_VARS': {
            'ALLOWED_HOSTS': os.environ.get('ALLOWED_HOSTS', 'NOT_SET'),
            'CORS_ALLOWED_ORIGINS': os.environ.get('CORS_ALLOWED_ORIGINS', 'NOT_SET'),
            'DEBUG': os.environ.get('DEBUG', 'NOT_SET'),
        }
    }
    
    return JsonResponse({
        'status': 'debug_info',
        'config': config_info,
        'headers': dict(request.headers),
        'host': request.get_host(),
        'scheme': request.scheme,
        'path': request.path,
    })
