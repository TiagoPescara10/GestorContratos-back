from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
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
