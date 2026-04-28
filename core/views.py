import json
from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.views.decorators.csrf import csrf_exempt
from contratos.models import Contrato

def health_check(request):
    """
    Health check endpoint to keep Render server awake
    """
    return JsonResponse({'status': 'ok'})

def check_cloudinary_config(request):
    """
    Endpoint para verificar configuración de Cloudinary en producción
    """
    try:
        # Verificar configuración
        storage_info = {
            'storage_class': default_storage.__class__.__name__,
            'storage_module': default_storage.__class__.__module__,
        }
        
        # Verificar si es Cloudinary
        is_cloudinary = 'cloudinary' in storage_info['storage_module'].lower()
        
        # Verificar variables de entorno
        env_vars = {
            'CLOUDINARY_CLOUD_NAME': getattr(settings, 'CLOUDINARY_CLOUD_NAME', None),
            'has_cloudinary_storage': hasattr(settings, 'CLOUDINARY_STORAGE'),
        }
        
        if hasattr(settings, 'CLOUDINARY_STORAGE'):
            env_vars['cloudinary_cloud_name'] = settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')
        
        # Probar subida de archivo pequeño
        test_result = None
        if is_cloudinary:
            try:
                test_content = b"test file for cloudinary"
                test_file = SimpleUploadedFile("test.txt", test_content)
                test_path = default_storage.save("test/test_file.txt", test_file)
                test_url = default_storage.url(test_path)
                
                # Limpiar archivo de prueba
                if hasattr(default_storage, 'delete'):
                    default_storage.delete(test_path)
                
                test_result = {
                    'success': True,
                    'path': test_path,
                    'url': test_url,
                    'is_cloudinary_url': 'cloudinary' in test_url
                }
            except Exception as e:
                test_result = {
                    'success': False,
                    'error': str(e)
                }
        
        return JsonResponse({
            'status': 'ok',
            'storage_info': storage_info,
            'is_cloudinary': is_cloudinary,
            'environment': env_vars,
            'test_upload': test_result
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)


@csrf_exempt
def cargar_indices(request):
    """
    Endpoint especial para cargar índices históricos en producción (Render)
    ya que no tenemos acceso a la shell en el plan gratuito.
    """
    if request.method != 'POST':
        return JsonResponse({
            'status': 'error',
            'message': 'Método no permitido. Use POST.'
        }, status=405)
    
    try:
        # Ejecutar comandos de management
        resultados = {}
        
        # Cargar IPC histórico
        try:
            call_command('cargar_ipc')
            resultados['ipc'] = 'success'
        except Exception as e:
            resultados['ipc'] = f'error: {str(e)}'
        
        # Cargar ICL histórico
        try:
            call_command('cargar_icl_historico')
            resultados['icl'] = 'success'
        except Exception as e:
            resultados['icl'] = f'error: {str(e)}'
        
        # Cargar Casa Propia histórico
        try:
            call_command('cargar_cp_historico')
            resultados['casa_propia'] = 'success'
        except Exception as e:
            resultados['casa_propia'] = f'error: {str(e)}'
        
        # Verificar si todo fue exitoso
        all_success = all(v == 'success' for v in resultados.values())
        
        return JsonResponse({
            'status': 'success' if all_success else 'partial',
            'resultados': resultados,
            'message': 'Índices cargados exitosamente' if all_success else 'Algunos índices tuvieron errores'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error general: {str(e)}'
        }, status=500)


@csrf_exempt
def forzar_migraciones(request):
    """
    Endpoint especial para forzar migraciones en producción (Render)
    ya que no tenemos acceso a la shell en el plan gratuito.
    """
    if request.method != 'POST':
        return JsonResponse({
            'status': 'error',
            'message': 'Método no permitido. Use POST.'
        }, status=405)
    
    try:
        # Ejecutar migrate
        call_command('migrate')
        
        return JsonResponse({
            'status': 'success',
            'message': 'Migraciones aplicadas exitosamente'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error al aplicar migraciones: {str(e)}'
        }, status=500)


@csrf_exempt
def actualizar_indices(request):
    """
    Endpoint para actualizar índices actuales (alternativa a cron jobs)
    Permite actualizar IPC, ICL y Casa Propia individualmente o todos.
    """
    if request.method != 'POST':
        return JsonResponse({
            'status': 'error',
            'message': 'Método no permitido. Use POST.'
        }, status=405)
    
    try:
        # Obtener parámetro para saber qué índice actualizar
        data = json.loads(request.body) if request.body else {}
        indice_tipo = data.get('tipo', 'todos')  # 'ipc', 'icl', 'casa_propia', 'todos'
        
        resultados = {}
        
        if indice_tipo in ['ipc', 'todos']:
            try:
                call_command('cargar_ipc')
                resultados['ipc'] = 'success'
            except Exception as e:
                resultados['ipc'] = f'error: {str(e)}'
        
        if indice_tipo in ['icl', 'todos']:
            try:
                call_command('cargar_icl')
                resultados['icl'] = 'success'
            except Exception as e:
                resultados['icl'] = f'error: {str(e)}'
        
        if indice_tipo in ['casa_propia', 'todos']:
            try:
                call_command('cargar_cp')
                resultados['casa_propia'] = 'success'
            except Exception as e:
                resultados['casa_propia'] = f'error: {str(e)}'
        
        # Verificar si todo fue exitoso
        all_success = all(v == 'success' for v in resultados.values())
        
        return JsonResponse({
            'status': 'success' if all_success else 'partial',
            'resultados': resultados,
            'message': f'Índices actualizados: {indice_tipo}' if all_success else 'Algunos índices tuvieron errores'
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error general: {str(e)}'
        }, status=500)
