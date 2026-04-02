from django.urls import path
from .views import EstadisticasGlobalesView

urlpatterns = [
    path('estadisticas/', EstadisticasGlobalesView.as_view(), name='estadisticas-globales'),
]
