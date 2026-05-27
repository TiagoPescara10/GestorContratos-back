import os
import re

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

import cloudinary.uploader

from .models import PortalInquilino, EstadoMensual, EstadoPago
from .serializers import (
    ContratoPortalSerializer,
    EstadoMensualPortalSerializer,
    EstadoMensualSerializer,
    PortalInquilinoSerializer,
)


# ── Vistas públicas (sin autenticación) ──────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def portal_detalle(request, token):
    """Datos del contrato para el portal público del inquilino."""
    portal = PortalInquilino.objects.filter(token=token).select_related('contrato').first()
    if portal is None:
        return Response({'error': 'Portal no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if not portal.activo:
        return Response({'error': 'Este portal no está disponible.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ContratoPortalSerializer(
        portal.contrato,
        context={'request': request},
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def portal_mes_detalle(request, token, mes, anio):
    """Datos de un mes específico del portal público del inquilino."""
    portal = PortalInquilino.objects.filter(token=token).select_related('contrato').first()
    if portal is None:
        return Response({'error': 'Portal no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if not portal.activo:
        return Response({'error': 'Este portal no está disponible.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        em = portal.contrato.meses.get(mes=int(mes), anio=int(anio))
    except EstadoMensual.DoesNotExist:
        return Response(
            {'error': f'No existe el mes {mes}/{anio} para este contrato.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    contrato = portal.contrato
    return Response({
        'contrato': {
            'inquilinoNombre': contrato.inquilinoNombre,
            'direccion':       contrato.direccion,
            'piso':            contrato.piso,
            'departamento':    contrato.departamento,
            'localidad':       contrato.localidad,
            'provincia':       contrato.provincia,
            'conceptosExtras': contrato.conceptosExtras or [],
        },
        'mes': EstadoMensualPortalSerializer(em).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def portal_subir_comprobante(request, token, mes, anio):
    """Sube o reemplaza el comprobante PDF de un mes pendiente. Acceso por token."""
    portal = PortalInquilino.objects.filter(token=token).select_related('contrato').first()
    if portal is None:
        return Response({'error': 'Portal no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if not portal.activo:
        return Response({'error': 'Este portal no está disponible.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        em = portal.contrato.meses.get(mes=int(mes), anio=int(anio))
    except EstadoMensual.DoesNotExist:
        return Response(
            {'error': f'No existe el mes {mes}/{anio} para este contrato.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if em.estado == EstadoPago.PAGADO:
        return Response(
            {'error': 'Este mes ya está marcado como pagado. No se puede subir comprobante.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    archivo = request.FILES.get('comprobante')
    if not archivo:
        return Response({'error': 'No se recibió ningún archivo (campo: comprobante).'}, status=status.HTTP_400_BAD_REQUEST)

    if archivo.content_type != 'application/pdf':
        return Response({'error': 'El archivo debe ser un PDF.'}, status=status.HTTP_400_BAD_REQUEST)

    nombre_sin_ext = os.path.splitext(archivo.name)[0]
    nombre_limpio = re.sub(r'[^a-zA-Z0-9_-]', '_', nombre_sin_ext)

    archivo.seek(0)
    result = cloudinary.uploader.upload(
        archivo.read(),
        folder=f"comprobantes/{portal.contrato.pk}",
        public_id=f"em_{em.pk}_{mes}_{anio}_{nombre_limpio}",
        format='pdf',
        resource_type='raw',
        access_mode='public',
        type='upload',
        overwrite=True,
    )

    em.comprobante_url      = result['secure_url']
    em.comprobante_nombre   = archivo.name
    em.comprobante_subidoEn = timezone.now()
    em.comprobante_revisado = False
    em.save(update_fields=[
        'comprobante_url', 'comprobante_nombre',
        'comprobante_subidoEn', 'comprobante_revisado',
    ])

    return Response(EstadoMensualPortalSerializer(em).data, status=status.HTTP_200_OK)


# ── Vistas admin ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portales_list(request):
    """Lista todos los portales (activos e inactivos) del usuario, con conteo de comprobantes sin revisar."""
    qs = PortalInquilino.objects.filter(
        contrato__eliminado=False,
    ).select_related('contrato').prefetch_related('contrato__meses')

    if not request.user.is_superuser:
        qs = qs.filter(contrato__usuario=request.user)

    serializer = PortalInquilinoSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def portal_marcar_revisado(request, token, mes, anio):
    """Marca el comprobante de un mes como revisado por el admin."""
    qs = PortalInquilino.objects.filter(token=token).select_related('contrato')
    if not request.user.is_superuser:
        qs = qs.filter(contrato__usuario=request.user, contrato__eliminado=False)

    portal = qs.first()
    if portal is None:
        return Response({'error': 'Portal no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        em = portal.contrato.meses.get(mes=int(mes), anio=int(anio))
    except EstadoMensual.DoesNotExist:
        return Response({'error': f'No existe el mes {mes}/{anio}.'}, status=status.HTTP_404_NOT_FOUND)

    if not em.comprobante_url:
        return Response({'error': 'Este mes no tiene comprobante.'}, status=status.HTTP_400_BAD_REQUEST)

    em.comprobante_revisado = True
    em.save(update_fields=['comprobante_revisado', 'updatedAt'])

    return Response(EstadoMensualSerializer(em).data)
