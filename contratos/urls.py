from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContratoViewSet, analizar_contrato_pdf
from .views_portal import (
    portal_detalle,
    portal_mes_detalle,
    portal_subir_comprobante,
    portales_list,
    portal_marcar_revisado,
)

router = DefaultRouter()
router.register(r'contratos', ContratoViewSet, basename='contrato')

urlpatterns = [
    path('', include(router.urls)),
    path('analizar-contrato-pdf/', analizar_contrato_pdf, name='analizar-contrato-pdf'),

    # Portal Inquilino — acceso público por token
    path('portal/<uuid:token>/',                                        portal_detalle,           name='portal-detalle'),
    path('portal/<uuid:token>/<int:mes>/<int:anio>/',                   portal_mes_detalle,       name='portal-mes-detalle'),
    path('portal/<uuid:token>/comprobante/<int:mes>/<int:anio>/',       portal_subir_comprobante, name='portal-subir-comprobante'),

    # Portal Inquilino — admin (requiere JWT)
    path('portales/',                                                   portales_list,            name='portales-list'),
    path('portales/<uuid:token>/comprobante/<int:mes>/<int:anio>/revisar/', portal_marcar_revisado, name='portal-marcar-revisado'),
]
