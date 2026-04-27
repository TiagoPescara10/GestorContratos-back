#!/usr/bin/env python
"""
Script para migrar archivos locales existentes a Cloudinary
"""
import os
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from contratos.models import Contrato

def migrate_existing_files():
    """Migrar archivos locales existentes a Cloudinary"""
    print("=== MIGRACIÓN DE ARCHIVOS A CLOUDINARY ===")
    
    media_root = Path(BASE_DIR / 'media')
    if not media_root.exists():
        print("❌ No existe directorio media/")
        return
    
    contratos = Contrato.objects.all()
    migrated_count = 0
    
    for contrato in contratos:
        print(f"\nProcesando contrato #{contrato.pk}: {contrato.inquilinoNombre}")
        
        # Migrar archivo de garante
        if contrato.garanteDocumentoArchivo:
            old_path = Path(str(contrato.garanteDocumentoArchivo.path))
            if old_path.exists() and old_path.is_file():
                print(f"  📄 Garante: {old_path.name}")
                try:
                    # Abrir archivo y guardarlo en Cloudinary
                    with open(old_path, 'rb') as f:
                        contrato.garanteDocumentoArchivo.save(old_path.name, File(f), save=True)
                    print(f"  ✅ Garante migrado a Cloudinary")
                    migrated_count += 1
                except Exception as e:
                    print(f"  ❌ Error migrando garante: {e}")
            else:
                print(f"  ⚠️ Archivo de garante no encontrado: {old_path}")
        
        # Migrar PDF de contrato
        if contrato.contratoPdf:
            old_path = Path(str(contrato.contratoPdf.path))
            if old_path.exists() and old_path.is_file():
                print(f"  📄 Contrato PDF: {old_path.name}")
                try:
                    # Abrir archivo y guardarlo en Cloudinary
                    with open(old_path, 'rb') as f:
                        contrato.contratoPdf.save(old_path.name, File(f), save=True)
                    print(f"  ✅ Contrato PDF migrado a Cloudinary")
                    migrated_count += 1
                except Exception as e:
                    print(f"  ❌ Error migrando contrato PDF: {e}")
            else:
                print(f"  ⚠️ Archivo de contrato no encontrado: {old_path}")
    
    print(f"\n=== RESUMEN ===")
    print(f"Contratos procesados: {contratos.count()}")
    print(f"Archivos migrados: {migrated_count}")
    
    if migrated_count > 0:
        print(f"\n✅ Migración completada. Los archivos ahora están en Cloudinary.")
        print(f"⚠️ Puedes eliminar los archivos locales del directorio media/ si lo deseas.")
    else:
        print(f"\n⚠️ No se migraron archivos.")

def check_file_urls():
    """Verificar URLs actuales de los archivos"""
    print("\n=== VERIFICACIÓN DE URLs ===")
    
    contratos = Contrato.objects.exclude(garanteDocumentoArchivo__isnull=True).exclude(garanteDocumentoArchivo='')
    print(f"Contratos con archivo de garante: {contratos.count()}")
    
    for contrato in contratos[:3]:  # Mostrar primeros 3
        if contrato.garanteDocumentoArchivo:
            url = contrato.garanteDocumentoArchivo.url
            print(f"  Contrato #{contrato.pk}: {url}")
    
    contratos_pdf = Contrato.objects.exclude(contratoPdf__isnull=True).exclude(contratoPdf='')
    print(f"Contratos con PDF: {contratos_pdf.count()}")
    
    for contrato in contratos_pdf[:3]:  # Mostrar primeros 3
        if contrato.contratoPdf:
            url = contrato.contratoPdf.url
            print(f"  Contrato #{contrato.pk}: {url}")

if __name__ == "__main__":
    check_file_urls()
    
    response = input("\n¿Deseas migrar los archivos locales a Cloudinary? (s/N): ").lower().strip()
    if response == 's':
        migrate_existing_files()
        check_file_urls()
    else:
        print("Migración cancelada.")
