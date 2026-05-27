# # INSTRUCCIONES COMPLETAS DEPLOYMENT - FRONTEND + BACKEND

## # Repositorios

**Frontend:** `Tiagooo10/gestor-contratos`  
**Backend:** `ValenBelone7/gestor_contratos_backend`

## # Pasos para tu Amigo

### # 1. Obtener Cambios de AMBOS Repositorios

**Frontend:**
```bash
cd /ruta/al/frontend
git checkout main
git pull origin main
```

**Backend:**
```bash
cd /ruta/al/backend
git checkout main
git pull origin main
```

### # 2. Configurar Backend

**Variables de Entorno:**
```bash
# Copiar .env.example a .env
cp .env.example .env

# Configurar variables en .env
DJANGO_SECRET_KEY=tu_clave_secreta_aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOW_ALL_ORIGINS=True
API_BASE_URL=http://localhost:8000/api
```

**Instalar Dependencias:**
```bash
# Activar virtualenv
source venv/bin/activate

# Instalar nuevas dependencias
pip install -r requirements.txt
```

**Migraciones y Superusuario:**
```bash
# Aplicar migraciones
python manage.py migrate

# Crear superusuario (opcional, ya existe uno)
python scripts/crear_superuser.py
```

**Iniciar Backend:**
```bash
python manage.py runserver 8000
```

### # 3. Configurar Frontend

**Variables de Entorno:**
```bash
# Copiar .env.example a .env.local
cp .env.example .env.local

# Configurar variables en .env.local
VITE_API_BASE_URL=http://localhost:8000/api
VITE_NODE_ENV=development
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000
```

**Instalar Dependencias:**
```bash
npm install
```

**Iniciar Frontend:**
```bash
npm run dev
```

### # 4. Probar Integración

**Credenciales de Demo:**
- **Email:** admin@inmobiliaria.com
- **Contraseña:** password123

**Pasos de Prueba:**
1. Iniciar backend en puerto 8000
2. Iniciar frontend en puerto 3001
3. Ir a http://localhost:3001
4. Hacer login con credenciales de demo
5. Verificar que cargue el dashboard
6. Probar crear un contrato

## # Cambios Importantes Realizados

### # Backend (Django)

**Nuevas Features:**
- **JWT Authentication** con refresh tokens
- **App de usuarios** con modelo personalizado
- **Variables de entorno** con python-decouple
- **CORS configurado** para frontend
- **Configuración PostgreSQL** para producción
- **Endpoints de auth:** `/api/auth/login/`, `/api/auth/refresh/`
- **Configuración Render** para deployment

**Archivos Nuevos:**
- `usuarios/` - App completa de autenticación
- `.env.example` - Plantilla de variables de entorno
- `render.yaml` - Configuración para Render
- `scripts/crear_superuser.py` - Script para crear admin

**Cambios Clave:**
- Login ahora usa **email** en lugar de username
- JWT tokens con 60min access, 7d refresh
- CORS permite puertos 3000 y 3001

### # Frontend (React)

**Nuevas Features:**
- **Sistema JWT completo** con refresh automático
- **API client optimizado** con manejo de errores
- **Componentes UI reutilizables** (Loading, Error, Empty)
- **Sidebar mejorado** con info de usuario
- **Configuración Vite** optimizada para producción
- **TypeScript** configurado
- **Scripts de deployment** para Vercel

**Archivos Nuevos:**
- `src/components/ui/` - Componentes reutilizables
- `src/hooks/useApiError.js` - Manejo de errores
- `src/hooks/useAsyncOperation.js` - Operaciones asíncronas
- `scripts/build-prod.js` - Limpieza para producción
- `vercel.json` - Configuración Vercel
- `tsconfig.json` - Configuración TypeScript

## # Deployment en Producción

### # Backend (Render)

**1. Conectar a Render:**
- Conectar repo `ValenBelone7/gestor_contratos_backend`
- Render detectará automáticamente Django

**2. Variables de Entorno en Render:**
```
DJANGO_SECRET_KEY=tu_clave_secreta_produccion
DEBUG=False
ALLOWED_HOSTS=tu-dominio-render.com
DATABASE_URL=postgresql://...
CORS_ALLOWED_ORIGINS=https://tu-frontend-vercel.com
API_BASE_URL=https://tu-backend-render.com/api
```

**3. Build Command:**
```bash
pip install -r requirements.txt && python manage.py migrate
```

### # Frontend (Vercel)

**1. Conectar a Vercel:**
- Conectar repo `Tiagooo10/gestor-contratos`
- Vercel detectará automáticamente React/Vite

**2. Variables de Entorno en Vercel:**
```
VITE_API_BASE_URL=https://tu-backend-render.com/api
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000
VITE_DISABLE_CONSOLE=true
```

**3. Build Command:**
```bash
npm run build:prod
```

## # Troubleshooting

### # Problemas Comunes

**1. Error 401 Unauthorized:**
- Verificar credenciales (email no username)
- Revisar que el backend esté corriendo
- Chequear configuración CORS

**2. Error CORS:**
- Verificar que el frontend esté en la lista de orígenes permitidos
- Revisar variables de entorno CORS_ALLOWED_ORIGINS

**3. Login no funciona:**
- Usar email: admin@inmobiliaria.com
- Verificar que el usuario exista en el backend
- Revisar contraseña (password123)

**4. Build fails:**
- Verificar todas las dependencias instaladas
- Revisar variables de entorno
- Correr `npm run lint:check` para errores

### # Comandos Útiles

**Backend:**
```bash
# Ver logs
python manage.py shell

# Crear superusuario manual
python manage.py createsuperuser

# Ver migraciones
python manage.py showmigrations
```

**Frontend:**
```bash
# Verificar código
npm run lint:check

# Corregir automáticamente
npm run lint

# Type checking
npm run type-check

# Build local
npm run build:prod
```

## # Checklist Final

- [ ] **Pull de ambos repositorios**
- [ ] **Configurar variables de entorno backend**
- [ ] **Instalar dependencias backend**
- [ ] **Correr migraciones backend**
- [ ] **Configurar variables de entorno frontend**
- [ ] **Instalar dependencias frontend**
- [ ] **Probar login localmente**
- [ ] **Probar CRUD de contratos**
- [ ] **Configurar deployment backend (Render)**
- [ ] **Configurar deployment frontend (Vercel)**
- [ ] **Probar en producción**

## # Contacto y Soporte

Si hay problemas:
1. **Revisar logs** del backend y frontend
2. **Verificar variables de entorno** en ambos lados
3. **Probar localmente** antes de deployment
4. **Revisar CORS** y autenticación

**¡Ambos proyectos están 100% listos para producción!** # #
