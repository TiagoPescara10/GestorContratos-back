# 📋 Instrucciones para Deployment - Frontend Gestor de Contratos

## 🔄 **Cómo Obtener los Cambios Recientes**

Tu amigo necesita hacer lo siguiente para obtener todas las mejoras recientes:

### **1. Hacer Pull de los Cambios**
```bash
# Asegurarse de estar en la rama main
git checkout main

# Obtener los cambios más recientes
git pull origin main

# Verificar que tenga todos los archivos nuevos
git status
```

### **2. Verificar Archivos Nuevos**
Deberían aparecer estos archivos nuevos:
- `src/components/ui/` (carpeta con componentes reutilizables)
- `src/hooks/useApiError.js`
- `src/hooks/useAsyncOperation.js`
- `scripts/build-prod.js`
- `.env.example`
- `.env.production`
- `vercel.json`
- `tsconfig.json`
- `README-DEPLOYMENT.md`

## 🚀 **Configuración para Deployment**

### **Variables de Entorno Necesarias**

Copiar `.env.example` a `.env.local` y configurar:

```bash
# Para Desarrollo Local
VITE_API_BASE_URL=http://localhost:8000/api
VITE_NODE_ENV=development
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000

# Para Producción (Vercel)
VITE_API_BASE_URL=https://tu-backend-dominio.com/api
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000
VITE_DISABLE_CONSOLE=true
```

### **Scripts Disponibles**

```bash
# Desarrollo
npm run dev

# Build estándar
npm run build

# Build para producción (limpia console.logs)
npm run build:prod

# Verificar código
npm run lint:check

# Corregir código automáticamente
npm run lint

# Type checking (TypeScript)
npm run type-check

# Limpiar build
npm run clean

# Previsualizar producción
npm run preview
```

## 🔧 **Cambios Importantes Realizados**

### **Autenticación Mejorada**
- ✅ Sistema JWT completo con refresh tokens
- ✅ Manejo automático de expiración de tokens
- ✅ Login con email (ya no usa username)
- ✅ Credenciales de demo actualizadas

### **API Client Optimizado**
- ✅ Cliente fetch con autenticación automática
- ✅ Reintentos automáticos en errores 401
- ✅ Manejo de errores global
- ✅ Headers configurados correctamente

### **UI/UX Profesional**
- ✅ Componentes reutilizables (Loading, Error, Empty states)
- ✅ Sidebar con información de usuario real
- ✅ Estados de carga mejorados
- ✅ Diseño consistente con Chakra UI

### **Production Ready**
- ✅ Configuración Vite optimizada
- ✅ Code splitting para mejor performance
- ✅ Limpieza automática de console.logs
- ✅ Configuración para Vercel lista

## 🎯 **Backend Integration**

### **Endpoints Configurados**
El frontend ahora está configurado para funcionar con estos endpoints:

```
POST /api/auth/login/          - Login
POST /api/auth/refresh/        - Refresh token
GET  /api/contratos/           - Listar contratos
POST /api/contratos/           - Crear contrato
GET  /api/contratos/{id}/       - Detalle contrato
PUT  /api/contratos/{id}/       - Actualizar contrato
DELETE /api/contratos/{id}/     - Eliminar contrato
```

### **Credenciales de Demo**
- **Usuario:** admin@inmobiliaria.com
- **Contraseña:** password123

## 🌐 **Deployment en Vercel**

### **Opción 1: Automática (Recomendada)**
1. Conectar el repo a Vercel
2. Vercel detectará automáticamente que es un proyecto React/Vite
3. Configurar las variables de entorno en el dashboard de Vercel

### **Opción 2: Manual**
```bash
# Build para producción
npm run build:prod

# Deploy con Vercel CLI
vercel --prod
```

## ⚠️ **Notas Importantes**

### **BREAKING CHANGES**
1. **Login ahora usa email** en lugar de username
2. **Credenciales de demo cambiaron** a `admin@inmobiliaria.com`
3. **Variables de entorno** ahora usan prefijo `VITE_`

### **Configuración Backend**
Asegurarse que el backend tenga:
- CORS configurado para permitir el dominio del frontend
- JWT settings configurados correctamente
- Endpoints de autenticación funcionando

### **Testing**
1. Probar login con las nuevas credenciales
2. Verificar que las llamadas API incluyan el token
3. Probar refresh automático de tokens
4. Verificar que los loading states funcionen

## 🆘 **Soporte**

Si hay problemas:
1. Verificar las variables de entorno
2. Revisar la consola del navegador
3. Verificar que el backend esté corriendo
4. Confirmar CORS configurado correctamente

---

## ✅ **Checklist Pre-Deployment**

- [ ] Hacer `git pull` de los cambios recientes
- [ ] Instalar dependencias: `npm install`
- [ ] Configurar variables de entorno
- [ ] Probar en desarrollo: `npm run dev`
- [ ] Probar build: `npm run build:prod`
- [ ] Verificar que no haya errores en consola
- [ ] Configurar variables en Vercel (si aplica)
- [ ] Deploy!

**El frontend está 100% listo para producción!** 🚀
