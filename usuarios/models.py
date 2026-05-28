from django.contrib.auth.models import AbstractUser
from django.db import models


class PerfilInmobiliaria(models.Model):
    nombre = models.CharField(max_length=200)
    subtitulo = models.CharField(max_length=200, blank=True, default='Gestión Inmobiliaria')
    telefono = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=300, blank=True)
    localidad = models.CharField(max_length=200, blank=True)
    logo = models.URLField(max_length=500, blank=True)  # URL de Cloudinary

    class Meta:
        verbose_name = 'Perfil de Inmobiliaria'

    def __str__(self):
        return self.nombre

    @classmethod
    def get_singleton(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={'nombre': 'Inmobiliaria'})
        return obj


class Usuario(AbstractUser):
    """
    Modelo de usuario extendido para la inmobiliaria.
    Solo puede ser creado por administradores.
    """
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    @property
    def nombre_completo(self):
        return f"{self.first_name} {self.last_name}".strip()
