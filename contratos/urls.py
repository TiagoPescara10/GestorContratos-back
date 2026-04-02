from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContratoViewSet

router = DefaultRouter()
router.register(r'contratos', ContratoViewSet, basename='contrato')

urlpatterns = [
    path('', include(router.urls)),
]
