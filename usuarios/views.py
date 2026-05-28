from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .models import Usuario, PerfilInmobiliaria
from .serializers import UsuarioSerializer, LoginSerializer, UsuarioListSerializer, PerfilInmobiliariaSerializer

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def crear_usuario_cliente(request):
    """Endpoint temporal para crear usuario del cliente"""
    try:
        email = "giordanoconti@inmobiliaria.com"
        password = "giorconti2026$"
        nombre = "GiordanoConti"
        apellido = "Inmobiliaria"
        
        if User.objects.filter(email=email).exists():
            return Response({
                'message': 'Usuario ya existe',
                'email': email
            }, status=200)
        
        user = User.objects.create_user(
            email=email,
            password=password,
            nombre=nombre,
            apellido=apellido,
            is_staff=False,
            is_superuser=False
        )
        
        return Response({
            'message': 'Usuario creado exitosamente',
            'email': email,
            'nombre': nombre,
            'apellido': apellido
        }, status=201)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)


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


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def perfil_inmobiliaria(request):
    """
    GET: devuelve el perfil (público, para el portal del inquilino)
    PUT: actualiza el perfil (requiere auth)
    """
    perfil = PerfilInmobiliaria.get_singleton()

    if request.method == 'GET':
        serializer = PerfilInmobiliariaSerializer(perfil)
        return Response(serializer.data)

    # PUT requiere autenticación
    if not request.user or not request.user.is_authenticated:
        return Response({'detail': 'Autenticación requerida.'}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = PerfilInmobiliariaSerializer(perfil, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def subir_logo_inmobiliaria(request):
    """
    Sube el logo a Cloudinary y actualiza la URL en PerfilInmobiliaria.
    """
    archivo = request.FILES.get('logo')
    if not archivo:
        return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            archivo,
            folder='perfil_inmobiliaria',
            public_id='logo',
            overwrite=True,
            resource_type='image',
        )
        url = result.get('secure_url', '')
        perfil = PerfilInmobiliaria.get_singleton()
        perfil.logo = url
        perfil.save()
        return Response({'logo': url})
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
