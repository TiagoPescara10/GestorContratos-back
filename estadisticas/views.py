from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.cache import cache
from .services import calcular_estadisticas_globales

CACHE_KEY_ESTADISTICAS = 'estadisticas_globales'
CACHE_TTL_ESTADISTICAS = 5 * 60  # 5 minutos


class EstadisticasGlobalesView(APIView):
    """GET /api/estadisticas/"""
    def get(self, request):
        data = cache.get(CACHE_KEY_ESTADISTICAS)
        if data is None:
            data = calcular_estadisticas_globales()
            cache.set(CACHE_KEY_ESTADISTICAS, data, CACHE_TTL_ESTADISTICAS)
        return Response(data)
