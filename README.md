# Gestor de Contratos

Sistema profesional para la gestión integral de contratos de alquiler, construido con React, Vite y Chakra UI.

## Características Principales

- **Gestión de Contratos**: Crear, editar, visualizar y eliminar contratos de alquiler
- **Dashboard Interactivo**: Estadísticas en tiempo real y resúmenes mensuales
- **Búsqueda Avanzada**: Filtrado rápido por nombre de inquilino
- **Diseño Responsivo**: Experiencia optimizada para todos los dispositivos
- **Autenticación Segura**: Sistema de login con manejo de sesiones
- **Notificaciones Inteligentes**: Alertas para contratos por vencer y aumentos
- **UI Moderna**: Interfaz elegante con Chakra UI y animaciones fluidas

## Stack Tecnológico

- **Frontend**: React 19.2.4 con Vite 8.0.1
- **UI Framework**: Chakra UI 2.10.9 con Emotion
- **Routing**: React Router DOM 7.13.2
- **Icons**: React Icons 5.6.0
- **Animations**: Framer Motion 12.38.0
- **Build Tool**: Vite con HMR

## Estructura del Proyecto

```
src/
|-- api/           # Cliente API y endpoints
|-- components/    # Componentes reutilizables
|-- hooks/         # Custom hooks React
|-- pages/         # Componentes de página
|-- routes/        # Configuración de routing
|-- utils/         # Funciones utilitarias
|-- constants/     # Constantes de la aplicación
```

## Componentes Clave

- **Layout**: Estructura principal con sidebar responsive
- **Sidebar**: Navegación moderna con tooltips y estados activos
- **CardContrato**: Tarjeta de contrato con información completa
- **ContractStatCard**: Componente para estadísticas
- **ErrorBoundary**: Manejo de errores global

## Hooks Personalizados

- **useAuth**: Gestión de autenticación y sesiones
- **useContracts**: Manejo de datos de contratos con caché

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd gestor-contratos

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

### Variables de Entorno

Crear archivo `.env` con las siguientes variables:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Scripts Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Linting del código
```

## Características de UI/UX

- **Diseño Moderno**: Interfaz limpia y profesional
- **Responsive Design**: Adaptación perfecta a móviles y tablets
- **Dark Mode Ready**: Soporte para modo oscuro
- **Animaciones Fluidas**: Transiciones suaves y micro-interacciones
- **Accesibilidad**: Cumplimiento de estándares WCAG
- **Loading States**: Indicadores de carga optimizados

## Optimizaciones de Rendimiento

- **Code Splitting**: Carga lazy de componentes
- **Memoización**: Optimización de renders con React.memo
- **Debouncing**: Optimización de búsquedas y llamadas API
- **Caché Inteligente**: Almacenamiento en caché de respuestas API
- **Bundle Optimization**: Configuración optimizada de Vite

## Desarrollo

### Flujo de Trabajo

1. **Branching**: Usar feature branches para nuevas funcionalidades
2. **Code Review**: Revisión de código antes de mergear
3. **Testing**: Tests unitarios para componentes críticos
4. **Linting**: Mantener código limpio con ESLint

### Convenciones

- **Components**: PascalCase para componentes
- **Functions**: camelCase para funciones
- **Constants**: UPPER_SNAKE_CASE para constantes
- **Files**: Nombre descriptivo y coherente

## Credenciales de Prueba

- **Usuario**: admin
- **Contraseña**: password123

## Despliegue

### Producción

```bash
# Build optimizado
npm run build

# Preview local del build
npm run preview
```

### Configuración de Servidor

- Configurar servidor para servir archivos estáticos
- Configurar routing para SPA
- Optimizar caché de assets

## Contribución

1. Fork del proyecto
2. Crear feature branch
3. Commits descriptivos
4. Pull request con descripción detallada

## Licencia

MIT License - Ver archivo LICENSE para detalles

## Soporte

Para soporte técnico o preguntas:
- Crear issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar documentación técnica

---

**Desarrollado con React + Vite + Chakra UI**
