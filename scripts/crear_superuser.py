#!/usr/bin/env python
"""
Script para crear un usuario superusuario inicial.
Ejecutar: python manage.py shell < scripts/crear_superuser.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from usuarios.models import Usuario

User = get_user_model()

def crear_superusuario():
    """Crear un superusuario por defecto si no existe."""
    email = 'admin@inmobiliaria.com'
    password = 'admin123456'  # CAMBIAR ESTO EN PRODUCCIÓN
    
    if User.objects.filter(email=email).exists():
        print(f"El usuario {email} ya existe.")
        return
    
    user = User.objects.create_superuser(
        username='admin',
        email=email,
        first_name='Administrador',
        last_name='Sistema',
        password=password,
        telefono='11-1234-5678'
    )
    
    print(f"Superusuario creado: {email}")
    print(f"Contraseña: {password}")
    print("¡IMPORTANTE! Cambia esta contraseña en producción.")

if __name__ == '__main__':
    crear_superusuario()
