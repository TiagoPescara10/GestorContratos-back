#!/usr/bin/env python
"""
Script para probar subida de archivos a Cloudinary y verificar URLs
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

def test_cloudinary_upload():
    """Probar subida de archivo a Cloudinary y verificar URL"""
    print("=== PRUEBA DE SUBIDA A CLOUDINARY ===")
    
    try:
        # Crear un archivo de prueba
        test_content = b"Este es un archivo de prueba para Cloudinary - PDF Test"
        test_file = SimpleUploadedFile(
            "test_cloudinary.pdf", 
            test_content, 
            content_type="application/pdf"
        )
        
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
        
        # Subir archivo de garante
        contrato_test.garanteDocumentoArchivo = test_file
        contrato_test.save()
        
        print(f"✅ Archivo subido")
        print(f"📁 Nombre del archivo: {contrato_test.garanteDocumentoArchivo.name}")
        print(f"🔗 URL del archivo: {contrato_test.garanteDocumentoArchivo.url}")
        print(f"🌐 URL es de Cloudinary: {'cloudinary' in contrato_test.garanteDocumentoArchivo.url}")
        
        # Probar también con PDF de contrato
        test_content2 = b"Contrato PDF de prueba para Cloudinary"
        test_file2 = SimpleUploadedFile(
            "contrato_test.pdf", 
            test_content2, 
            content_type="application/pdf"
        )
        
        contrato_test.contratoPdf = test_file2
        contrato_test.save()
        
        print(f"\n✅ Contrato PDF subido")
        print(f"📁 Nombre: {contrato_test.contratoPdf.name}")
        print(f"🔗 URL: {contrato_test.contratoPdf.url}")
        print(f"🌐 URL es de Cloudinary: {'cloudinary' in contrato_test.contratoPdf.url}")
        
        # Limpiar
        contrato_test.delete()
        print(f"\n🧹 Contrato de prueba eliminado")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en la prueba: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def check_existing_contracts():
    """Verificar URLs de contratos existentes"""
    print("\n=== VERIFICACIÓN DE CONTRATOS EXISTENTES ===")
    
    contratos = Contrato.objects.all()
    print(f"Total contratos: {contratos.count()}")
    
    for contrato in contratos:
        print(f"\nContrato #{contrato.pk}: {contrato.inquilinoNombre}")
        
        if contrato.garanteDocumentoArchivo:
            url = contrato.garanteDocumentoArchivo.url
            print(f"  📄 Garante: {url}")
            print(f"  🌐 Es Cloudinary: {'cloudinary' in url}")
        
        if contrato.contratoPdf:
            url = contrato.contratoPdf.url
            print(f"  📄 Contrato PDF: {url}")
            print(f"  🌐 Es Cloudinary: {'cloudinary' in url}")

if __name__ == "__main__":
    print("Configuración actual:")
    print(f"Storage: {settings.DEFAULT_FILE_STORAGE}")
    print(f"Cloudinary configurado: {hasattr(settings, 'CLOUDINARY_STORAGE')}")
    
    check_existing_contracts()
    
    response = input("\n¿Deseas probar subida de un nuevo archivo a Cloudinary? (s/N): ").lower().strip()
    if response == 's':
        success = test_cloudinary_upload()
        if success:
            print("\n🎉 Prueba exitosa. Cloudinary está funcionando correctamente.")
        else:
            print("\n❌ La prueba falló. Revisa la configuración.")
