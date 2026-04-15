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
    # Get all environment variables that might be database-related
    db_env_vars = {k: v for k, v in os.environ.items() if 'DB' in k.upper() or 'DATABASE' in k.upper()}
    
    config_info = {
        'DEBUG': getattr(settings, 'DEBUG', 'NOT_SET'),
        'ALLOWED_HOSTS': getattr(settings, 'ALLOWED_HOSTS', []),
        'CORS_ALLOWED_ORIGINS': getattr(settings, 'CORS_ALLOWED_ORIGINS', []),
        'CORS_ALLOW_ALL_ORIGINS': getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', 'NOT_SET'),
        'CORS_ALLOW_CREDENTIALS': getattr(settings, 'CORS_ALLOW_CREDENTIALS', 'NOT_SET'),
        'SECRET_KEY': getattr(settings, 'SECRET_KEY', 'NOT_SET')[:10] + '...' if getattr(settings, 'SECRET_KEY', None) else 'NOT_SET',
        'DATABASES': settings.DATABASES,
        'DB_ENV_VARS': db_env_vars,
        'ALL_ENV_VARS': dict(list(os.environ.items())[:20]),  # First 20 env vars
        'ENV_VARS': {
            'ALLOWED_HOSTS': os.environ.get('ALLOWED_HOSTS', 'NOT_SET'),
            'CORS_ALLOWED_ORIGINS': os.environ.get('CORS_ALLOWED_ORIGINS', 'NOT_SET'),
            'DEBUG': os.environ.get('DEBUG', 'NOT_SET'),
            'DATABASE_URL': os.environ.get('DATABASE_URL', 'NOT_SET'),
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
