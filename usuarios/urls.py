from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, UsuarioCreateView, UsuarioListView,
    perfil_usuario, actualizar_perfil, crear_usuario_cliente,
    perfil_inmobiliaria, subir_logo_inmobiliaria,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('crear-usuario-cliente/', crear_usuario_cliente, name='crear-usuario-cliente'),
    path('usuarios/', UsuarioListView.as_view(), name='usuario-list'),
    path('usuarios/crear/', UsuarioCreateView.as_view(), name='usuario-create'),
    path('perfil/', perfil_usuario, name='perfil'),
    path('perfil/actualizar/', actualizar_perfil, name='actualizar-perfil'),
    # Perfil de inmobiliaria (singleton)
    path('perfil-inmobiliaria/', perfil_inmobiliaria, name='perfil-inmobiliaria'),
    path('perfil-inmobiliaria/logo/', subir_logo_inmobiliaria, name='perfil-inmobiliaria-logo'),
]
