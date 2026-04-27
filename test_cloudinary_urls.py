#!/usr/bin/env python
"""
Script para probar URLs de Cloudinary y verificar acceso
"""
import os
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from contratos.models import Contrato
import requests

def test_cloudinary_url_access():
    """Probar acceso a URLs de Cloudinary"""
    print("=== PRUEBA DE ACCESO A URLS DE CLOUDINARY ===")
    
    # Crear contrato de prueba
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
        fechaInicio="2024-01-01",
        fechaFin="2024-12-31",
        diaPago=1,
        garanteNombre="Test Garante",
        garanteDni="55555555"
    )
    
    try:
        # Subir archivo de garante
        test_content = b"Test PDF content for Cloudinary access test"
        test_file = SimpleUploadedFile(
            "test_access.pdf", 
            test_content, 
            content_type="application/pdf"
        )
        
        contrato_test.garanteDocumentoArchivo = test_file
        contrato_test.save()
        
        url = contrato_test.garanteDocumentoArchivo.url
        print(f"📁 URL generada: {url}")
        
        # Probar acceso a la URL
        print(f"🌐 Probando acceso a la URL...")
        response = requests.get(url, timeout=10)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Content-Type: {response.headers.get('content-type', 'N/A')}")
        print(f"📏 Content-Length: {response.headers.get('content-length', 'N/A')}")
        
        if response.status_code == 200:
            print(f"✅ URL accesible correctamente")
            print(f"📄 Contenido descargado: {len(response.content)} bytes")
        else:
            print(f"❌ Error accediendo a la URL: {response.status_code}")
            print(f"📄 Response: {response.text[:200]}...")
        
        # Limpiar
        contrato_test.delete()
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Error en la prueba: {str(e)}")
        if contrato_test.pk:
            contrato_test.delete()
        return False

def check_existing_urls():
    """Verificar URLs de contratos existentes"""
    print("\n=== VERIFICACIÓN DE URLS EXISTENTES ===")
    
    contratos = Contrato.objects.exclude(garanteDocumentoArchivo__isnull=True).exclude(garanteDocumentoArchivo='')
    
    for contrato in contratos[:3]:  # Primeros 3
        if contrato.garanteDocumentoArchivo:
            url = contrato.garanteDocumentoArchivo.url
            print(f"\nContrato #{contrato.pk}:")
            print(f"  📁 URL: {url}")
            
            try:
                response = requests.head(url, timeout=5)
                print(f"  📊 Status: {response.status_code}")
                if response.status_code == 200:
                    print(f"  ✅ Accesible")
                else:
                    print(f"  ❌ No accesible")
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")

if __name__ == "__main__":
    print("Configuración actual:")
    print(f"Storage: {settings.DEFAULT_FILE_STORAGE}")
    print(f"Cloudinary configurado: {hasattr(settings, 'CLOUDINARY_STORAGE')}")
    
    if hasattr(settings, 'CLOUDINARY_STORAGE'):
        config = settings.CLOUDINARY_STORAGE
        print(f"Cloud Name: {config.get('CLOUD_NAME')}")
        print(f"Resource Type: {config.get('RESOURCE_TYPE', 'default')}")
        print(f"Sign URL: {config.get('SIGN_URL', 'default')}")
    
    check_existing_urls()
    
    response = input("\n¿Deseas probar subida y acceso de un nuevo archivo? (s/N): ").lower().strip()
    if response == 's':
        success = test_cloudinary_url_access()
        if success:
            print("\n🎉 Prueba exitosa. Las URLs de Cloudinary son accesibles.")
        else:
            print("\n❌ La prueba falló. Revisa la configuración de Cloudinary.")
