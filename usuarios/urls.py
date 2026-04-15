from django.urls import path
from .views import (
    LoginView, UsuarioCreateView, UsuarioListView,
    perfil_usuario, actualizar_perfil, crear_usuario_cliente
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('crear-usuario-cliente/', crear_usuario_cliente, name='crear-usuario-cliente'),
    path('usuarios/', UsuarioListView.as_view(), name='usuario-list'),
    path('usuarios/crear/', UsuarioCreateView.as_view(), name='usuario-create'),
    path('perfil/', perfil_usuario, name='perfil'),
    path('perfil/actualizar/', actualizar_perfil, name='actualizar-perfil'),
]
