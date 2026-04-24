from django.http import JsonResponse
from django.core.management import execute_from_command_line
from django.db import connection

def health_check(request):
    """
    Health check endpoint to keep Render server awake
    """
    return JsonResponse({'status': 'ok'})

def run_migrations(request):
    """
    Endpoint temporal para ejecutar migraciones manualmente
    """
    try:
        # Ejecutar migraciones
        execute_from_command_line(['manage.py', 'migrate', '--noinput'])
        
        # Verificar si las nuevas columnas existen
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'contratos_contrato' 
                AND column_name IN ('piso', 'departamento', 'garantes')
            """)
            columns = [row[0] for row in cursor.fetchall()]
            
            # Verificar tablas de índices
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name LIKE 'indices_%'
            """)
            indices_tables = [row[0] for row in cursor.fetchall()]
            
        return JsonResponse({
            'status': 'success',
            'message': 'Migraciones ejecutadas correctamente',
            'new_columns': columns,
            'indices_tables': indices_tables
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)
