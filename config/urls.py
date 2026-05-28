from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from core.views import health_check, check_cloudinary_config, cargar_indices, forzar_migraciones, actualizar_indices, crear_usuario_produccion
from usuarios.views import perfil_inmobiliaria, subir_logo_inmobiliaria

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health-check'),
    path('api/health/', health_check, name='api-health-check'),
    path('check-cloudinary/', check_cloudinary_config, name='check-cloudinary'),
    path('cargar-indices/', cargar_indices, name='cargar-indices'),
    path('forzar-migraciones/', forzar_migraciones, name='forzar-migraciones'),
    path('actualizar-indices/', actualizar_indices, name='actualizar-indices'),
    path('crear-usuario-produccion/', crear_usuario_produccion, name='crear-usuario-produccion'),

    # Perfil inmobiliaria (acceso directo /api/perfil/)
    path('api/perfil/', perfil_inmobiliaria, name='api-perfil-inmobiliaria'),
    path('api/perfil/logo/', subir_logo_inmobiliaria, name='api-perfil-inmobiliaria-logo'),

    # Apps
    path('api/auth/', include('usuarios.urls')),
    path('api/', include('contratos.urls')),
    path('api/', include('indices.urls')),
    path('api/', include('estadisticas.urls')),

    # Documentación automática
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# No servir archivos locales - usamos Cloudinary
