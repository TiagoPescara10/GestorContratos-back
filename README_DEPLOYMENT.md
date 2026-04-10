# Gestor de Contratos - Deployment Guide

## Resumen de Cambios Realizados

### 1. Autenticación JWT Implementada
- **Modelo de Usuario**: `usuarios.Usuario` (extiende AbstractUser)
- **Endpoints de Auth**:
  - `POST /api/auth/login/` - Login con email/password
  - `GET /api/auth/perfil/` - Perfil del usuario actual
  - `PUT /api/auth/perfil/actualizar/` - Actualizar perfil
  - `GET /api/auth/usuarios/` - Listar usuarios (solo admin)
  - `POST /api/auth/usuarios/crear/` - Crear usuario (solo admin)

### 2. Configuración de Producción
- **Variables de Entorno**: Configurado con `python-decouple`
- **Base de Datos**: PostgreSQL en producción, SQLite en desarrollo
- **CORS**: Configurado para frontend específico
- **JWT**: Tokens con 60min (access) y 7 días (refresh)

### 3. Seguridad
- Autenticación requerida para todos los endpoints (excepto login)
- Validación de contraseñas de Django
- CORS restringido en producción
- Variables de entorno para datos sensibles

## Deploy en Render

### 1. Preparación del Repositorio
```bash
# Asegurar que todos los paquetes están en requirements.txt
pip freeze > requirements.txt

# Crear archivo .env con variables de producción
cp .env.example .env
# Editar .env con valores reales
```

### 2. Configuración en Render
1. **Crear Web Service**:
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

2. **Crear PostgreSQL Database**:
   - Plan: Starter (o superior según necesidades)
   - Notar las credenciales

3. **Variables de Entorno en Render**:
   ```
   DEBUG=False
   SECRET_KEY=tu-clave-segura-generada
   ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com
   DB_NAME=nombre_db_render
   DB_USER=usuario_db_render
   DB_PASSWORD=password_db_render
   DB_HOST=host_db_render
   DB_PORT=5432
   CORS_ALLOWED_ORIGINS=https://tu-frontend.com,https://www.tu-frontend.com
   ```

### 3. Deploy Automático
Render detectará el `render.yaml` y configurará automáticamente:
- Web service con Django
- Base de datos PostgreSQL
- Variables de entorno

## Comandos Útiles

### Desarrollo Local
```bash
# Instalar dependencias
pip install -r requirements.txt

# Migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
# O usar el script:
python manage.py shell < scripts/crear_superuser.py

# Correr servidor
python manage.py runserver
```

### Producción
```bash
# Colectar static files (si se usa)
python manage.py collectstatic --noinput

# Verificar configuración
python manage.py check --deploy
```

## Endpoints de la API

### Autenticación
- `POST /api/auth/login/` - Login
- `GET /api/auth/perfil/` - Perfil
- `PUT /api/auth/perfil/actualizar/` - Actualizar perfil

### Contratos (requieren autenticación)
- `GET /api/contratos/` - Listar contratos
- `POST /api/contratos/` - Crear contrato
- `GET /api/contratos/{id}/` - Detalle contrato
- `PUT /api/contratos/{id}/` - Actualizar contrato
- `DELETE /api/contratos/{id}/` - Soft delete

### Índices y Estadísticas
- `GET /api/indices/` - Índices disponibles
- `GET /api/estadisticas/` - Dashboard metrics

## Frontend Integration

### Login Example
```javascript
const login = async (email, password) => {
  const response = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  // Guardar tokens
  localStorage.setItem('access', data.access);
  localStorage.setItem('refresh', data.refresh);
  
  return data.user;
};
```

### API Calls Example
```javascript
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('access');
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  return response.json();
};
```

## Consideraciones de Seguridad

1. **Cambiar Contraseñas**: 
   - Cambiar contraseña del superusuario por defecto
   - Usar SECRET_KEY seguro en producción

2. **CORS**: Configurar solo dominios del frontend

3. **Base de Datos**: Usar PostgreSQL, nunca SQLite en producción

4. **Logs**: Monitorear logs en `/logs/app.log`

5. **Backups**: Configurar backups automáticos de la base de datos

## Troubleshooting

### Migration Issues
```bash
# Si hay problemas con migraciones
python manage.py migrate --fake-initial
# O resetear la base de datos (cuidado en producción!)
rm db.sqlite3
python manage.py migrate
```

### Token Issues
- Los tokens access expiran en 1 hora
- Usar token refresh para obtener nuevos tokens
- Implementar lógica de refresh en el frontend

### Database Connection
- Verificar variables de entorno de DB
- Asegurar que PostgreSQL está corriendo
- Chequear firewall/permisos de conexión

## Próximos Pasos

1. **Testing**: Crear tests para endpoints de autenticación
2. **Frontend**: Integrar con React/Vue/Angular
3. **Monitoring**: Configurar monitoring y alertas
4. **CI/CD**: Configurar GitHub Actions para deploy automático
5. **Performance**: Optimizar queries y agregar caché (Redis)
