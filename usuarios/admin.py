from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ['email', 'username', 'nombre_completo', 'telefono', 'activo', 'fecha_creacion']
    list_filter = ['activo', 'is_superuser', 'fecha_creacion']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-fecha_creacion']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información Personal', {'fields': ('first_name', 'last_name', 'email', 'telefono')}),
        ('Permisos', {'fields': ('activo', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas', {'fields': ('last_login', 'date_joined', 'fecha_creacion')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'telefono', 'password1', 'password2'),
        }),
    )
