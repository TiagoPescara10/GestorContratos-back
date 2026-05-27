from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from django.core.cache import cache

from .client import obtener_indice
from .models import HistorialIndice, IndiceIPC, IndiceICL, IndiceCP

CACHE_TTL_INDICES = 24 * 60 * 60  # 24 horas


class IndiceIPCSerializer(serializers.ModelSerializer):
    class Meta:
        model  = IndiceIPC
        fields = ['anio', 'mes', 'porcentaje']


def _calcular_variaciones(registros, campo='porcentaje'):
    resultado = []
    anterior = None
    for r in registros:
        valor = float(getattr(r, campo))
        if anterior is not None:
            variacion = round((valor / float(anterior) - 1) * 100, 2)
        else:
            variacion = None
        resultado.append({
            'anio':      r.anio,
            'mes':       r.mes,
            'nivel':     valor,
            'variacion': variacion,
        })
        anterior = getattr(r, campo)
    return resultado


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
    """GET /api/indices/ipc/ — variación mensual directa desde BD."""
    def get(self, request):
        data = cache.get('indices_ipc')
        if data is None:
            data = [
                {
                    'anio':      r.anio,
                    'mes':       r.mes,
                    'nivel':     float(r.porcentaje),
                    'variacion': float(r.porcentaje),
                }
                for r in IndiceIPC.objects.all()
            ]
            cache.set('indices_ipc', data, CACHE_TTL_INDICES)
        return Response(data)


class IndiceICLHistoricoView(APIView):
    """GET /api/indices/icl-historico/ — nivel + variación mensual desde tabla local."""
    def get(self, request):
        data = cache.get('indices_icl_historico')
        if data is None:
            data = _calcular_variaciones(IndiceICL.objects.all(), campo='nivel')
            cache.set('indices_icl_historico', data, CACHE_TTL_INDICES)
        return Response(data)


class IndiceICLView(APIView):
    """GET /api/indices/icl/"""
    def get(self, request):
        data = obtener_indice('ICL')
        if data.get('error'):
            return Response(data, status=status.HTTP_502_BAD_GATEWAY)
        _guardar_historial(data)
        return Response(data)


class IndiceCPView(APIView):
    """GET /api/indices/casa-propia/ — coeficiente mensual + variacion = (nivel-1)*100."""
    def get(self, request):
        resultado = []
        for r in IndiceCP.objects.all():
            nivel = float(r.nivel)
            resultado.append({
                'anio':      r.anio,
                'mes':       r.mes,
                'nivel':     nivel,
                'variacion': round((nivel - 1) * 100, 2),
            })
        return Response(resultado)


class HistorialIndicesView(APIView):
    """GET /api/indices/historial/?tipo=IPC"""
    def get(self, request):
        qs   = HistorialIndice.objects.all()
        tipo = request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo.upper())
        serializer = HistorialIndiceSerializer(qs[:100], many=True)
        return Response(serializer.data)
