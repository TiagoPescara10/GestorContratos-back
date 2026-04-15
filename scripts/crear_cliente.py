import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

User = get_user_model()

# Crear usuario para el cliente
email = "giordanoconti@inmobiliaria.com"  # REEMPLAZAR con email real del cliente
password = "giorconti2026$"  # REEMPLAZAR con password real del cliente
nombre = "GiordanoConti"  # REEMPLAZAR con nombre real del cliente
apellido = "Inmobiliaria"  # REEMPLAZAR con apellido real del cliente

if not User.objects.filter(email=email).exists():
    user = User.objects.create_user(
        email=email,
        password=password,
        nombre=nombre,
        apellido=apellido,
        is_staff=False,
        is_superuser=False
    )
    print(f"✅ Usuario {email} creado exitosamente")
else:
    print(f"⚠️  Usuario {email} ya existe")
