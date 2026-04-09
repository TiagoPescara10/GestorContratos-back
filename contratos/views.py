import logging
from decimal import Decimal

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Contrato, EstadoMensual
from .serializers import (
    ContratoListSerializer, ContratoDetailSerializer,
    EstadoMensualSerializer, EstadoMensualUpdateSerializer,
    AplicarAumentoSerializer, ConfirmarAumentoSerializer, AplicarMoraSerializer,
)
from .filters import ContratoFilter
from . import services
from indices.client import obtener_indice

logger = logging.getLogger('contratos')


class ContratoViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de contratos + acciones especiales.

    list:   GET  /api/contratos/
    create: POST /api/contratos/
    retrieve: GET  /api/contratos/{id}/
    update: PUT  /api/contratos/{id}/
    destroy: DELETE /api/contratos/{id}/   (soft delete)
    """
    queryset        = Contrato.objects.filter(eliminado=False)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ContratoFilter
    search_fields   = ['inquilinoNombre', 'inquilinoDni', 'propietarioNombre', 'localidad']
    ordering_fields = ['fechaInicio', 'fechaFin', 'valorMensual', 'localidad', 'createdAt']
    ordering        = ['-createdAt']
    parser_classes  = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return ContratoListSerializer
        return ContratoDetailSerializer

    def perform_create(self, serializer):
        contrato = serializer.save()
        # Generar meses automáticamente al crear
        creados = services.generar_meses(contrato)
        logger.info('Contrato %s creado con %d meses', contrato.pk, len(creados))

    def perform_update(self, serializer):
        contrato = serializer.save()
        # Regenerar meses si cambiaron las fechas
        services.generar_meses(contrato, sobreescribir=False)

    def destroy(self, request, *args, **kwargs):
        """Soft delete — no borra físicamente el registro."""
        contrato = self.get_object()
        contrato.eliminado   = True
        contrato.eliminadoEn = timezone.now()
        contrato.save(update_fields=['eliminado', 'eliminadoEn'])
        logger.info('Contrato %s marcado como eliminado', contrato.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── POST /contratos/{id}/generar-meses/ ────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='generar-meses')
    def generar_meses(self, request, pk=None):
        contrato     = self.get_object()
        sobreescribir = request.data.get('sobreescribir', False)
        creados      = services.generar_meses(contrato, sobreescribir=bool(sobreescribir))
        return Response({
            'message': f'{len(creados)} meses generados.',
            'creados': EstadoMensualSerializer(creados, many=True).data,
        }, status=status.HTTP_201_CREATED if creados else status.HTTP_200_OK)

    # ── GET /contratos/{id}/meses/ ─────────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='meses')
    def meses(self, request, pk=None):
        contrato = self.get_object()
        return Response(
            EstadoMensualSerializer(contrato.meses.all(), many=True).data
        )

    # ── PUT /contratos/{id}/meses/{mes}-{anio}/estado/ ─────────────────────────
    @action(detail=True, methods=['put'],
            url_path=r'meses/(?P<mes>\d+)-(?P<anio>\d+)/estado')
    def actualizar_estado_mes(self, request, pk=None, mes=None, anio=None):
        contrato = self.get_object()
        try:
            em = contrato.meses.get(mes=int(mes), anio=int(anio))
        except EstadoMensual.DoesNotExist:
            return Response(
                {'error': f'No existe el mes {mes}/{anio} para este contrato.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = EstadoMensualUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        em.estado = serializer.validated_data['estado']
        em.save(update_fields=['estado', 'updatedAt'])
        logger.info('Contrato %s mes %s/%s → %s', pk, mes, anio, em.estado)
        return Response(EstadoMensualSerializer(em).data)

    # ── POST /contratos/{id}/aplicar-aumento/ ─────────────────────────────────
    @action(detail=True, methods=['post'], url_path='aplicar-aumento')
    def aplicar_aumento(self, request, pk=None):
        """
        Calcula el aumento sugerido (no lo aplica aún).
        Para IPC/ICL consulta la API externa.
        """
        contrato   = self.get_object()
        serializer = AplicarAumentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tipo = data['tipoAumento']

        indice_anterior = indice_nuevo = None

        if tipo in ('IPC', 'ICL', 'casa_propia'):
            resultado = obtener_indice(tipo)
            if resultado.get('error'):
                return Response({'error': resultado['error']}, status=status.HTTP_502_BAD_GATEWAY)
            porcentaje      = Decimal(str(resultado['valor']))
            indice_anterior = Decimal(str(resultado.get('anterior', 0)))
            indice_nuevo    = porcentaje
            monto_fijo      = None
        elif tipo == 'monto_fijo':
            monto_fijo = data.get('montoFijo')
            if monto_fijo is None:
                return Response({'error': 'montoFijo es requerido para tipo monto_fijo.'}, status=status.HTTP_400_BAD_REQUEST)
            porcentaje = None
            indice_anterior = None
            indice_nuevo = None
        else:
            porcentaje = data['porcentajeFijo']
            monto_fijo = None

        # Tomar monto base del primer mes pendiente desde mesDesde/anioDesde (o el primero disponible)
        mes_desde  = data.get('mesDesde')
        anio_desde = data.get('anioDesde')
        if mes_desde and anio_desde:
            mes_ref = contrato.meses.filter(mes=mes_desde - 1, anio=anio_desde).first()
        else:
            mes_ref = contrato.meses.order_by('anio', 'mes').first()

        monto_base = mes_ref.montoFinal if mes_ref else contrato.valorMensual

        if tipo == 'monto_fijo':
            monto_fijo = Decimal(str(monto_fijo))
            nuevo_monto = (monto_base + monto_fijo).quantize(Decimal('0.01'))
            porcentaje_sugerido = None
        else:
            nuevo_monto = services.calcular_nuevo_monto(monto_base, porcentaje)
            porcentaje_sugerido = porcentaje

        return Response({
            'tipoAumento':        tipo,
            'porcentajeSugerido': str(porcentaje_sugerido) if porcentaje_sugerido is not None else None,
            'montoBase':          str(monto_base),
            'nuevoMonto':         str(nuevo_monto),
            'indiceAnterior':     str(indice_anterior) if indice_anterior is not None else None,
            'indiceNuevo':        str(indice_nuevo)    if indice_nuevo    is not None else None,
            'montoFijo':          str(monto_fijo) if tipo == 'monto_fijo' else None,
        })

    # ── POST /contratos/{id}/confirmar-aumento/ ────────────────────────────────
    @action(detail=True, methods=['post'], url_path='confirmar-aumento')
    def confirmar_aumento(self, request, pk=None):
        """Aplica el aumento confirmado a los meses correspondientes."""
        contrato   = self.get_object()
        serializer = ConfirmarAumentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        resultados = services.aplicar_aumento(
            contrato        = contrato,
            tipo_aumento    = data['tipoAumento'],
            porcentaje      = data['porcentajeAumento'],
            monto_fijo      = data.get('montoFijo'),
            indice_anterior = data.get('indiceAnterior'),
            indice_nuevo    = data.get('indiceNuevo'),
            mes_desde       = data.get('mesDesde'),
            anio_desde      = data.get('anioDesde'),
            razon           = data.get('razon', ''),
            aplicado_por    = data.get('aplicadoPor', ''),
        )
        return Response({
            'message':    f'Aumento aplicado a {len(resultados)} meses.',
            'resultados': resultados,
        })

    # ── POST /contratos/{id}/aplicar-aumento-mora/ ─────────────────────────────
    @action(detail=True, methods=['post'], url_path='aplicar-aumento-mora')
    def aplicar_mora(self, request, pk=None):
        contrato   = self.get_object()
        serializer = AplicarMoraSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if not contrato.valorInteresMora:
            return Response(
                {'error': 'Este contrato no tiene configurado un interés de mora.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            resultados = services.aplicar_mora(
                contrato     = contrato,
                aplicado_por = data.get('aplicadoPor', ''),
                mes          = data.get('mes'),
                anio         = data.get('anio'),
                dias_atraso  = data.get('diasAtraso'),
                recargo_mora = data.get('recargoMora'),
            )
        except EstadoMensual.DoesNotExist:
            return Response(
                {'error': 'No existe el mes indicado para este contrato.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response({
            'message':    f'Mora aplicada a {len(resultados)} meses.',
            'resultados': resultados,
        })

    # ── GET /contratos/{id}/resumen-financiero/ ────────────────────────────────
    @action(detail=True, methods=['get'], url_path='resumen-financiero')
    def resumen_financiero(self, request, pk=None):
        contrato = self.get_object()
        return Response(services.resumen_financiero(contrato))

    # ── GET /contratos/buscar/ ────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        """Búsqueda avanzada — usa los mismos filtros que el listado."""
        qs         = self.filter_queryset(self.get_queryset())
        serializer = ContratoListSerializer(qs, many=True)
        return Response(serializer.data)
