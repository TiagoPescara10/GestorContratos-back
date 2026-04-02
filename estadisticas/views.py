from rest_framework.views import APIView
from rest_framework.response import Response
from .services import calcular_estadisticas_globales


class EstadisticasGlobalesView(APIView):
    """GET /api/estadisticas/"""
    def get(self, request):
        return Response(calcular_estadisticas_globales())
