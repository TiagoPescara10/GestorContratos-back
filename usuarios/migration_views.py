from django.http import JsonResponse
from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import os

@csrf_exempt
@require_POST
def run_migrations(request):
    """
    Endpoint temporal para ejecutar migraciones manualmente
    """
    try:
        # Ejecutar migraciones
        call_command('migrate', verbosity=2, interactive=False)
        
        # Crear usuario cliente
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if not User.objects.filter(email="giordanoconti@inmobiliaria.com").exists():
            User.objects.create_user(
                email="giordanoconti@inmobiliaria.com",
                password="giorconti2026$",
                nombre="GiordanoConti",
                apellido="Inmobiliaria",
                is_staff=False,
                is_superuser=False
            )
        
        return JsonResponse({
            'status': 'success',
            'message': 'Migrations completed successfully and user created'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)
