from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers

from .client import obtener_indice
from .models import HistorialIndice


class HistorialIndiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = HistorialIndice
        fields = '__all__'


def _guardar_historial(data: dict):
    """Persiste la consulta en HistorialIndice solo si no hay error."""
    if data.get('error'):
        return
    HistorialIndice.objects.create(
        tipo     = data['tipo'],
        valor    = data['valor'],
        anterior = data.get('anterior') or 0,
        fecha    = data.get('fecha', ''),
    )


class IndiceIPCView(APIView):
    """GET /api/indices/ipc/"""
    def get(self, request):
        data = obtener_indice('IPC')
        if data.get('error'):
            return Response(data, status=status.HTTP_502_BAD_GATEWAY)
        _guardar_historial(data)
        return Response(data)


class IndiceICLView(APIView):
    """GET /api/indices/icl/"""
    def get(self, request):
        data = obtener_indice('ICL')
        if data.get('error'):
            return Response(data, status=status.HTTP_502_BAD_GATEWAY)
        _guardar_historial(data)
        return Response(data)


class HistorialIndicesView(APIView):
    """GET /api/indices/historial/?tipo=IPC"""
    def get(self, request):
        qs   = HistorialIndice.objects.all()
        tipo = request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo.upper())
        serializer = HistorialIndiceSerializer(qs[:100], many=True)
        return Response(serializer.data)
