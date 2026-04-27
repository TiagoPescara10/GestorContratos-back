"""
Django settings para Gestor de Contratos de Alquiler
"""
import os
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-cambia-esta-clave-en-produccion-abc123xyz')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# Additional fallback for Render
if 'onrender.com' in os.environ.get('RENDER_EXTERNAL_HOSTNAME', ''):
    ALLOWED_HOSTS.extend([
        'gestor-contratos-backend.onrender.com',
        'onrender.com',
        '*.onrender.com'
    ])

# Debug prints will be added after CORS configuration

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Terceros
    'cloudinary_storage',
    'cloudinary',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'rest_framework_simplejwt',
    # Apps propias
    'usuarios',
    'contratos',
    'indices',
    'estadisticas',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database configuration - Forzar PostgreSQL en producción
import dj_database_url

# Usar PostgreSQL en Render (ignorar DEBUG temporalmente)
if 'onrender.com' in os.environ.get('RENDER_EXTERNAL_HOSTNAME', ''):
    DATABASE_URL = 'postgresql://gestorpostgre:8H9IYSjy9nebhjWjlunVPgOkzGoxXHvO@dpg-d7g25b1o3t8c73ftkvlg-a/gestor_contratos'
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    # Development: usar SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-ar'
TIME_ZONE = 'America/Argentina/Buenos_Aires'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
# MEDIA_URL y MEDIA_ROOT se configuran dinámicamente según Cloudinary

# Custom user model
AUTH_USER_MODEL = 'usuarios.Usuario'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ──────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'contratos.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# ── Swagger / drf-spectacular ──────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'Gestor de Contratos API',
    'DESCRIPTION': 'API REST para gestión de contratos de alquiler',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS', 
    default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://giordanoconti-gestorcontratos.vercel.app',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Allow all origins in development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # Production CORS settings
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_ALL_ORIGINS = False

# Debug: print current configuration
print(f"DEBUG={DEBUG}")
print(f"ALLOWED_HOSTS={ALLOWED_HOSTS}")
print(f"CORS_ALLOWED_ORIGINS={CORS_ALLOWED_ORIGINS}")
print(f"CORS_ALLOW_ALL_ORIGINS={CORS_ALLOW_ALL_ORIGINS}")

# ── Caché (filesystem en dev, Redis recomendado en prod) ──────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': str(BASE_DIR / 'cache'),
        'TIMEOUT': 86400,   # 24 horas
    }
}

# ── APIs externas ──────────────────────────────────────────────────────────────
ARGLY_API_BASE = 'https://api.argly.com.ar/api'

# ── Logging ────────────────────────────────────────────────────────────────────
if DEBUG:
    # Development: use console logging only (temporarily for production debugging)
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
        },
        'loggers': {
            'contratos': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
            'indices':   {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        },
    }
else:
    # Production: use only console logging (Render captures stdout)
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
        },
        'loggers': {
            'contratos': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
            'indices':   {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        },
    }

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── Cloudinary (almacenamiento de archivos) ────────────────────────────────────
# Usar Cloudinary siempre que las credenciales estén disponibles
CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='')
if CLOUDINARY_CLOUD_NAME:
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': config('CLOUDINARY_API_KEY'),
        'API_SECRET': config('CLOUDINARY_API_SECRET'),
    }
    # Para Cloudinary, MEDIA_URL apunta a las URLs de Cloudinary
    MEDIA_URL = 'https://res.cloudinary.com/' + CLOUDINARY_CLOUD_NAME + '/image/upload/'
else:
    # Fallback a almacenamiento local si no hay credenciales de Cloudinary
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
