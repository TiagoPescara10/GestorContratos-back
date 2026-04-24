from django.http import JsonResponse
import requests
from django.views.decorators.csrf import csrf_exempt

def health_check(request):
    """
    Health check endpoint to keep Render server awake
    """
    return JsonResponse({'status': 'ok'})

@csrf_exempt
def diagnosticar_ipc(request):
    """
    Endpoint temporal para diagnosticar problema de carga de IPC
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        # 1. Consultar API directamente
        indec_url = "https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&format=json&last=5"
        resp = requests.get(indec_url, timeout=30)
        resp.raise_for_status()
        api_data = resp.json()
        
        # 2. Verificar datos en BD
        from indices.models import IndiceIPC
        latest_bd = IndiceIPC.objects.order_by('-anio', '-mes').first()
        total_bd = IndiceIPC.objects.count()
        
        # 3. Comparar
        latest_api = api_data.get('data', [])[-1] if api_data.get('data') else None
        
        return JsonResponse({
            'api_ultima_fecha': latest_api[0] if latest_api else None,
            'api_ultimo_valor': latest_api[1] if latest_api else None,
            'api_total_registros': api_data.get('count', 0),
            'bd_ultima_fecha': f"{latest_bd.anio}-{latest_bd.mes:02d}" if latest_bd else None,
            'bd_ultimo_valor': float(latest_bd.porcentaje) if latest_bd else None,
            'bd_total_registros': total_bd,
            'diferencia_meses': "NECESITA ACTUALIZACIÓN" if latest_api and latest_bd and 
                                (latest_api[0][:7] != f"{latest_bd.anio}-{latest_bd.mes:02d}") else "OK"
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def forzar_carga_ipc(request):
    """
    Endpoint temporal para forzar carga de IPC faltante
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        # Ejecutar comando corregido
        from django.core.management import execute_from_command_line
        from io import StringIO
        import sys
        
        # Capturar output
        old_stdout = sys.stdout
        sys.stdout = captured_output = StringIO()
        
        execute_from_command_line(['manage.py', 'cargar_ipc'])
        
        sys.stdout = old_stdout
        output = captured_output.getvalue()
        
        # Verificar resultado
        from indices.models import IndiceIPC
        latest = IndiceIPC.objects.order_by('-anio', '-mes').first()
        total = IndiceIPC.objects.count()
        
        return JsonResponse({
            'status': 'success',
            'output': output.strip(),
            'ultima_fecha_bd': f"{latest.anio}-{latest.mes:02d}" if latest else None,
            'total_registros_bd': total,
            'mensaje': 'IPC actualizado correctamente'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)
