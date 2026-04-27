#!/usr/bin/env python
"""
Script simple para verificar configuración de Cloudinary
"""
import os
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from decouple import config

print("=== VERIFICACIÓN DE CONFIGURACIÓN DE CLOUDINARY ===")
print()

# Variables de entorno
print("1. Variables de entorno:")
cloud_name = config('CLOUDINARY_CLOUD_NAME', default='')
print(f"   CLOUDINARY_CLOUD_NAME: {cloud_name}")
print(f"   CLOUDINARY_API_KEY: {config('CLOUDINARY_API_KEY', default='NO ENCONTRADO')}")
print(f"   CLOUDINARY_API_SECRET: {'ENCONTRADA' if config('CLOUDINARY_API_SECRET', default='') else 'NO ENCONTRADA'}")
print()

# Configuración de Django
print("2. Configuración de Django:")
print(f"   DEFAULT_FILE_STORAGE: {settings.DEFAULT_FILE_STORAGE}")
print(f"   MEDIA_URL: {settings.MEDIA_URL}")
print(f"   MEDIA_ROOT: {getattr(settings, 'MEDIA_ROOT', 'NO CONFIGURADO')}")
print(f"   Cloudinary Storage disponible: {hasattr(settings, 'CLOUDINARY_STORAGE')}")
print()

if hasattr(settings, 'CLOUDINARY_STORAGE'):
    cloud_config = settings.CLOUDINARY_STORAGE
    print("3. Configuración de Cloudinary:")
    print(f"   Cloud Name: {cloud_config.get('CLOUD_NAME', 'NO CONFIGURADO')}")
    print(f"   API Key: {'CONFIGURADO' if cloud_config.get('API_KEY') else 'NO CONFIGURADO'}")
    print(f"   API Secret: {'CONFIGURADO' if cloud_config.get('API_SECRET') else 'NO CONFIGURADO'}")
    print()

# Verificar si está usando Cloudinary
if cloud_name and settings.DEFAULT_FILE_STORAGE == 'cloudinary_storage.storage.MediaCloudinaryStorage':
    print("✅ Cloudinary está configurado y será usado para almacenamiento de archivos")
elif cloud_name:
    print("⚠️ Las credenciales de Cloudinary están configuradas pero el storage no es Cloudinary")
else:
    print("❌ Cloudinary no está configurado, se usará almacenamiento local")

print()
print("=== ESTADO FINAL ===")
if cloud_name and 'cloudinary' in settings.DEFAULT_FILE_STORAGE.lower():
    print("🎉 Configuración correcta - Los archivos se guardarán en Cloudinary")
else:
    print("❌ Configuración incorrecta - Los archivos se guardarán localmente")
