from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config

User = get_user_model()


class Command(BaseCommand):
    help = 'Crea el superusuario inicial desde variables de entorno'

    def handle(self, *args, **kwargs):
        email = config('SUPERUSER_EMAIL')
        password = config('SUPERUSER_PASSWORD')
        nombre = config('SUPERUSER_NOMBRE', default='Admin')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': nombre,
                'last_name': '',
                'is_staff': True,
                'is_superuser': True,
            }
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write('Superusuario creado')
        else:
            self.stdout.write('Ya existe')
