from django.http import JsonResponse
from django.core.management import execute_from_command_line
from django.db import connection
from django.views.decorators.csrf import csrf_exempt

def health_check(request):
    """
    Health check endpoint to keep Render server awake
    """
    return JsonResponse({'status': 'ok'})

@csrf_exempt
def cargar_indices(request):
    """
    Endpoint temporal para cargar IPC y ICL manualmente
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    results = {}
    
    try:
        # Cargar IPC
        from io import StringIO
        import sys
        
        # Capturar output del comando
        old_stdout = sys.stdout
        sys.stdout = captured_output = StringIO()
        
        execute_from_command_line(['manage.py', 'cargar_ipc'])
        
        sys.stdout = old_stdout
        ipc_output = captured_output.getvalue()
        
        results['ipc'] = {
            'status': 'success',
            'output': ipc_output.strip()
        }
        
    except Exception as e:
        results['ipc'] = {
            'status': 'error',
            'error': str(e)
        }
    
    try:
        # Cargar ICL
        old_stdout = sys.stdout
        sys.stdout = captured_output = StringIO()
        
        execute_from_command_line(['manage.py', 'cargar_icl'])
        
        sys.stdout = old_stdout
        icl_output = captured_output.getvalue()
        
        results['icl'] = {
            'status': 'success',
            'output': icl_output.strip()
        }
        
    except Exception as e:
        results['icl'] = {
            'status': 'error',
            'error': str(e)
        }
    
    # Verificar datos cargados
    try:
        with connection.cursor() as cursor:
            # Contar IPC
            cursor.execute("SELECT COUNT(*) FROM indices_indiceipc")
            ipc_count = cursor.fetchone()[0]
            
            # Contar ICL
            cursor.execute("SELECT COUNT(*) FROM indices_indiceicl")
            icl_count = cursor.fetchone()[0]
            
            results['verification'] = {
                'ipc_records': ipc_count,
                'icl_records': icl_count
            }
    except Exception as e:
        results['verification'] = {
            'error': str(e)
        }
    
    return JsonResponse(results)
