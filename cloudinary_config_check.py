#!/usr/bin/env python
"""
Script para verificar configuración de Cloudinary y probar diferentes resource types
"""
import os
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import cloudinary
import cloudinary.uploader
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from contratos.models import Contrato

def test_cloudinary_direct_upload():
    """Probar subida directa con Cloudinary API"""
    print("=== PRUEBA DIRECTA CON CLOUDINARY API ===")
    
    try:
        # Probar subida directa con resource_type raw
        result = cloudinary.uploader.upload(
            b"test content for raw file",
            resource_type="raw",
            public_id="test/raw/test_file",
            folder="garantes"
        )
        
        print(f"✅ Subida directa exitosa")
        print(f"📁 URL: {result.get('url')}")
        print(f"📊 Resource Type: {result.get('resource_type')}")
        print(f"🔗 Secure URL: {result.get('secure_url')}")
        
        # Probar acceso
        import requests
        response = requests.head(result['secure_url'], timeout=5)
        print(f"🌐 Acceso: {response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en subida directa: {str(e)}")
        return False

def test_django_storage():
    """Probar Django storage con Cloudinary"""
    print("\n=== PRUEBA CON DJANGO STORAGE ===")
    
    try:
        # Crear archivo de prueba
        test_content = b"Test PDF content for Django storage"
        test_file = SimpleUploadedFile(
            "test_django.pdf", 
            test_content, 
            content_type="application/pdf"
        )
        
        # Crear contrato de prueba
        from datetime import date
        contrato_test = Contrato.objects.create(
            pais="Argentina",
            provincia="Buenos Aires", 
            localidad="Test",
            direccion="Test 123",
            tipoPropiedad="departamento",
            inquilinoNombre="Test Inquilino",
            inquilinoDni="12345678",
            propietarioNombre="Test Propietario",
            propietarioDni="87654321",
            propietarioEmail="test@test.com",
            propietarioNombreCompleto="Test Propietario",
            valorMensual=10000,
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 12, 31),
            diaPago=1,
            garanteNombre="Test Garante",
            garanteDni="55555555"
        )
        
        # Subir archivo
        contrato_test.garanteDocumentoArchivo = test_file
        contrato_test.save()
        
        url = contrato_test.garanteDocumentoArchivo.url
        print(f"📁 URL generada: {url}")
        
        # Analizar URL
        if '/raw/' in url:
            print(f"✅ URL usa /raw/ correctamente")
        elif '/image/' in url:
            print(f"❌ URL usa /image/ (incorrecto para PDF)")
        else:
            print(f"⚠️ URL con formato desconocido")
        
        # Probar acceso
        import requests
        response = requests.head(url, timeout=5)
        print(f"🌐 Acceso: {response.status_code}")
        
        # Limpiar
        contrato_test.delete()
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Error en Django storage: {str(e)}")
        return False

def check_cloudinary_settings():
    """Verificar configuración actual de Cloudinary"""
    print("\n=== CONFIGURACIÓN ACTUAL ===")
    
    print(f"Cloudinary Cloud Name: {cloudinary.config().cloud_name}")
    print(f"Cloudinary Secure: {cloudinary.config().secure}")
    print(f"Django Storage: {settings.DEFAULT_FILE_STORAGE}")
    
    if hasattr(settings, 'CLOUDINARY_STORAGE'):
        config = settings.CLOUDINARY_STORAGE
        print(f"Storage Cloud Name: {config.get('CLOUD_NAME')}")
        print(f"Resource Type: {config.get('RESOURCE_TYPE')}")
        print(f"Media Type: {config.get('MEDIA_TYPE')}")
        print(f"Sign URL: {config.get('SIGN_URL')}")

if __name__ == "__main__":
    check_cloudinary_settings()
    
    print("\n" + "="*50)
    
    response1 = input("¿Probar subida directa con Cloudinary API? (s/N): ").lower().strip()
    if response1 == 's':
        test_cloudinary_direct_upload()
    
    response2 = input("\n¿Probar con Django storage? (s/N): ").lower().strip()
    if response2 == 's':
        test_django_storage()
    
    print("\n📋 RECOMENDACIONES:")
    print("1. Si la subida directa funciona pero Django storage no, el problema está en django-cloudinary-storage")
    print("2. Tu compañero debe verificar en Cloudinary Dashboard:")
    print("   - Settings > Upload > Auto-create folders")
    print("   - Settings > Security > Restricted media types")
    print("   - Settings > Delivery > Signed URLs")
