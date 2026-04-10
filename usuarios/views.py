from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .models import Usuario
from .serializers import UsuarioSerializer, LoginSerializer, UsuarioListSerializer

User = get_user_model()


class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required for login
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UsuarioListSerializer(user).data
        })


class UsuarioCreateView(generics.CreateAPIView):
    """
    Endpoint para crear usuarios (solo admin).
    """
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Solo superusuarios pueden crear nuevos usuarios
        if not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Solo los administradores pueden crear usuarios")
        serializer.save()


class UsuarioListView(generics.ListAPIView):
    """
    Listado de usuarios (solo admin).
    """
    queryset = Usuario.objects.all()
    serializer_class = UsuarioListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_superuser:
            return Usuario.objects.filter(id=self.request.user.id)
        return Usuario.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    """
    Obtener perfil del usuario actual.
    """
    serializer = UsuarioListSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def actualizar_perfil(request):
    """
    Actualizar perfil del usuario actual.
    """
    user = request.user
    data = request.data
    
    # Campos permitidos para auto-actualización
    allowed_fields = ['first_name', 'last_name', 'telefono']
    
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    user.save()
    serializer = UsuarioListSerializer(user)
    return Response(serializer.data)
