#!/usr/bin/env python
"""
Script para probar la configuración de Cloudinary
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

def test_cloudinary_config():
    """Probar la configuración de Cloudinary"""
    print("=== PRUEBA DE CONFIGURACIÓN DE CLOUDINARY ===")
    
    # Verificar variables de entorno
    print("1. Variables de entorno:")
    print(f"   CLOUDINARY_CLOUD_NAME: {os.environ.get('CLOUDINARY_CLOUD_NAME', 'NO ENCONTRADO')}")
    print(f"   CLOUDINARY_API_KEY: {os.environ.get('CLOUDINARY_API_KEY', 'NO ENCONTRADO')}")
    print(f"   CLOUDINARY_API_SECRET: {'ENCONTRADA' if os.environ.get('CLOUDINARY_API_SECRET') else 'NO ENCONTRADA'}")
    
    # Verificar configuración de Django
    print("\n2. Configuración de Django:")
    print(f"   DEFAULT_FILE_STORAGE: {settings.DEFAULT_FILE_STORAGE}")
    print(f"   Cloudinary Storage disponible: {hasattr(settings, 'CLOUDINARY_STORAGE')}")
    
    if hasattr(settings, 'CLOUDINARY_STORAGE'):
        cloud_config = settings.CLOUDINARY_STORAGE
        print(f"   Cloud Name: {cloud_config.get('CLOUD_NAME', 'NO CONFIGURADO')}")
        print(f"   API Key: {'CONFIGURADO' if cloud_config.get('API_KEY') else 'NO CONFIGURADO'}")
        print(f"   API Secret: {'CONFIGURADO' if cloud_config.get('API_SECRET') else 'NO CONFIGURADO'}")
    
    return True

def test_file_upload():
    """Probar subida de archivo a Cloudinary"""
    print("\n=== PRUEBA DE SUBIDA DE ARCHIVO ===")
    
    try:
        # Crear un archivo de prueba
        test_content = b"Este es un archivo de prueba para Cloudinary"
        test_file = SimpleUploadedFile(
            "test_cloudinary.txt", 
            test_content, 
            content_type="text/plain"
        )
        
        # Intentar guardar un contrato de prueba
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
            diaPago=1
        )
        
        # Subir archivo
        contrato_test.contratoPdf = test_file
        contrato_test.save()
        
        print(f"✅ Archivo subido exitosamente: {contrato_test.contratoPdf.name}")
        print(f"📁 URL del archivo: {contrato_test.contratoPdf.url if hasattr(contrato_test.contratoPdf, 'url') else 'No disponible'}")
        
        # Limpiar
        contrato_test.delete()
        print("🧹 Contrato de prueba eliminado")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en la prueba de subida: {str(e)}")
        return False

def test_garante_file_upload():
    """Probar subida de archivo de garante"""
    print("\n=== PRUEBA DE SUBIDA DE ARCHIVO DE GARANTE ===")
    
    try:
        # Crear un archivo de prueba para garante
        test_content = b"Documento de garante de prueba"
        test_file = SimpleUploadedFile(
            "garante_test.txt", 
            test_content, 
            content_type="text/plain"
        )
        
        # Intentar guardar un contrato con archivo de garante
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
        
        # Subir archivo de garante
        contrato_test.garanteDocumentoArchivo = test_file
        contrato_test.save()
        
        print(f"✅ Archivo de garante subido exitosamente: {contrato_test.garanteDocumentoArchivo.name}")
        print(f"📁 URL del archivo: {contrato_test.garanteDocumentoArchivo.url if hasattr(contrato_test.garanteDocumentoArchivo, 'url') else 'No disponible'}")
        
        # Limpiar
        contrato_test.delete()
        print("🧹 Contrato de prueba eliminado")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en la prueba de subida de garante: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando pruebas de Cloudinary...")
    
    # Probar configuración
    config_ok = test_cloudinary_config()
    
    if config_ok:
        # Probar subida de archivos
        upload_ok = test_file_upload()
        garante_ok = test_garante_file_upload()
        
        print(f"\n=== RESUMEN ===")
        print(f"Configuración: {'✅ OK' if config_ok else '❌ ERROR'}")
        print(f"Subida PDF: {'✅ OK' if upload_ok else '❌ ERROR'}")
        print(f"Subida Garante: {'✅ OK' if garante_ok else '❌ ERROR'}")
        
        if config_ok and upload_ok and garante_ok:
            print("\n🎉 Todas las pruebas pasaron correctamente. Cloudinary está funcionando!")
        else:
            print("\n⚠️ Algunas pruebas fallaron. Revisa la configuración.")
    else:
        print("\n❌ La configuración de Cloudinary no es correcta.")
