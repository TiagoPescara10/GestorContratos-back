from django.urls import path
from .views import (
    LoginView, UsuarioCreateView, UsuarioListView,
    perfil_usuario, actualizar_perfil
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('usuarios/', UsuarioListView.as_view(), name='usuario-list'),
    path('usuarios/crear/', UsuarioCreateView.as_view(), name='usuario-create'),
    path('perfil/', perfil_usuario, name='perfil'),
    path('perfil/actualizar/', actualizar_perfil, name='actualizar-perfil'),
]
