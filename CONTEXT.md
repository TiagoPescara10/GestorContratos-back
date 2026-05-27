# CONTEXT.md — Gestor de Contratos Inmobiliarios

## Descripción General

Sistema de gestión de contratos inmobiliarios para la **Inmobiliaria Giordano Conti** (Río Cuarto, Córdoba). Permite administrar contratos de alquiler, inquilinos, propietarios, garantes, estados de pago mensuales, aplicación de aumentos según índices económicos (IPC, ICL, Casa Propia), mora, y generación de recibos en formato Word.

Está compuesto por dos proyectos separados:
- **Frontend**: SPA React servida desde Vercel/estático
- **Backend**: API REST Django desplegada en Render con PostgreSQL

---

## Arquitectura

```
[Usuario] → [React SPA] → [Django REST API] → [PostgreSQL]
                                    ↓
                              [Cloudinary]       (archivos PDF, garantes)
                              [api.argly.com.ar] (índices IPC, ICL)
```

- Autenticación: JWT (access 60min / refresh 7 días) con refresh automático en el cliente
- CORS habilitado en producción solo para dominios específicos
- Soft delete en contratos (campo `eliminado`)
- Paginación estándar de 20 registros por página

---

## Stack Tecnológico

### Frontend — `/home/tiago/Escritorio/GestorContratos`

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2.4 | Framework UI |
| Vite | 8.0.1 | Bundler y dev server |
| Chakra UI | 2.10.9 | Componentes y estilos |
| React Router DOM | 7.13.2 | Navegación SPA |
| Emotion | 11.14 | CSS-in-JS |
| Framer Motion | 12.38 | Animaciones |
| React DatePicker | 9.1.0 | Selector de fechas |
| React Icons | 5.6.0 | Iconos |
| ESLint | 9.39.4 | Linter |

**Variables de entorno:**
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_NODE_ENV=development
VITE_ENABLE_DEBUG=false
VITE_API_TIMEOUT=30000
```

### Backend — `/home/tiago/Escritorio/backend/gestor_contratos_backend`

| Tecnología | Versión | Uso |
|---|---|---|
| Django | 4.2+ | Framework web |
| Django REST Framework | 3.14+ | API REST |
| simplejwt | 5.3 | Autenticación JWT |
| django-cors-headers | 4.3 | CORS |
| django-filter | 23.5 | Filtrado de querysets |
| drf-spectacular | 0.27 | Documentación OpenAPI |
| python-docx | 0.8.11 | Generación de documentos Word |
| num2words | 0.5.12 | Números a letras (español) |
| Cloudinary + django-cloudinary-storage | 1.44 | Almacenamiento de archivos |
| psycopg2-binary | 2.9 | PostgreSQL |
| python-dateutil | 2.8 | Manejo de fechas |
| APScheduler | 3.10 | Tareas programadas |
| gunicorn | 21.2 | WSGI server |
| python-decouple | 3.8 | Variables de entorno |

**Variables de entorno:**
```
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=...
DATABASE_URL=postgres://...
CLOUDINARY_CLOUD_NAME=dmnwbg0rj
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CORS_ALLOWED_ORIGINS=...
```

---

## Estructura de Carpetas

### Frontend
```
src/
├── api/
│   ├── client.js           # Cliente HTTP centralizado con refresh JWT automático
│   ├── contratos.js        # Llamadas API de contratos
│   └── indices.js          # Llamadas API de índices económicos
├── components/
│   ├── FormContrato.jsx    # Formulario crear/editar contrato (componente más complejo)
│   ├── ContratoCompleto.jsx
│   ├── CardContrato.jsx
│   ├── Layout.jsx
│   ├── Sidebar.jsx
│   └── ui/                 # LoadingSpinner, EmptyState, ErrorMessage
├── hooks/
│   ├── useAuth.js          # Login, logout, tokens
│   ├── useContracts.js     # CRUD de contratos
│   ├── useApiError.js      # Manejo centralizado de errores
│   └── useAsyncOperation.js
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Contratos.jsx
│   ├── DetalleContrato.jsx # Página más grande: meses, mora, aumentos, recibos
│   ├── CargarContrato.jsx
│   ├── EditarContrato.jsx
│   └── Pendientes.jsx
├── routes/
│   ├── AppRouter.jsx
│   └── ProtectedRoute.jsx
└── utils/
    ├── montoALetras.js
    ├── formatearMonto.js
    ├── generarMeses.js
    ├── aplicarAumento.js
    ├── verificarRecargo.js
    ├── capitalizar.js
    ├── contratos.js
    └── performance.js
```

### Backend
```
gestor_contratos_backend/
├── config/
│   ├── settings.py         # Configuración principal
│   └── urls.py             # Router raíz
├── contratos/              # App principal
│   ├── models.py
│   ├── views.py            # ContratoViewSet + acciones
│   ├── serializers.py
│   ├── services.py         # Lógica de negocio pura
│   ├── filters.py
│   └── migrations/
├── usuarios/               # Autenticación
│   ├── models.py           # AbstractUser extendido con email como USERNAME_FIELD
│   └── views.py
├── indices/                # Índices económicos
│   ├── models.py           # IndiceIPC, IndiceICL, IndiceCP, HistorialIndice
│   ├── client.py           # Consulta api.argly.com.ar con caché 24h
│   ├── scheduler.py        # APScheduler para updates automáticos
│   └── management/commands/
│       ├── cargar_ipc.py
│       ├── cargar_icl.py
│       └── cargar_cp.py
├── estadisticas/
│   ├── views.py
│   └── services.py
├── utils/
│   └── numero_a_letras.py
└── scripts/
    ├── crear_superuser.py
    ├── importar_desde_localstorage.py
    └── verificar_deploy.py
```

---

## Modelos de Datos Principales

### `Contrato`
Campo central del sistema. Cada contrato pertenece a un `Usuario`.

```python
# Propiedad
provincia, localidad, direccion, piso, departamento, tipoPropiedad

# Inquilino
inquilinoNombre, inquilinoDni, inquilinoTelefono, inquilinoEmail

# Propietario
propietarioNombre, propietarioDni, propietarioTelefono, propietarioCbu,
propietarioEmail, propietarioCuit, propietarioCondicionFiscal, propietarioAlias

# Garantes
garantes: JSONField  # lista de objetos con nombre, dni, domicilio, documentoArchivo (URL Cloudinary)

# Términos económicos
valorMensual: Decimal
monedaMensual: str
honorarios: Decimal  # % que cobra la inmobiliaria al propietario
tipoInteresMora: str
valorInteresMora: Decimal

# Temporales
fechaInicio, fechaFin: date
diaPago: int
duracion: int  # calculado

# Ajustes automáticos
frecuenciaAumento: int  # meses entre aumentos
tipoAumento: str  # IPC | ICL | casa_propia | porcentaje_fijo | monto_fijo

# IVA
incluye_iva: bool
porcentaje_iva: Decimal

# Conceptos extras
conceptosExtras: JSONField  # [{"nombre": "Luz", "precio": 5000}, ...]
valorConceptosExtras: Decimal

# Archivos
contratoPdf: FileField  # ⚠️ guarda URL Cloudinary, debería ser CharField
contratoImagen: ImageField

# Control
eliminado: bool
eliminadoEn: datetime
usuario: ForeignKey(Usuario)
createdAt, updatedAt: datetime
```

### `EstadoMensual`
Un registro por mes por contrato. `mes` es **0-indexed** (0=Enero, 11=Diciembre).

```python
contrato: ForeignKey(Contrato)
mes: int          # 0-indexed (0=Enero ... 11=Diciembre)
anio: int
estado: str       # pendiente | pagado | parcial
montoBase: Decimal
montoFinal: Decimal
iva: Decimal
tieneRecargo: bool
recargo_mora: Decimal
dias_atraso: int
mora_aplicada: bool
fecha_aplicacion_mora: datetime
aumento_aplicado: bool
```

### `AumentoMensual`
Historial de cada aumento aplicado a un `EstadoMensual`.

```python
estadoMensual: ForeignKey(EstadoMensual)
tipoAumento: str       # IPC | ICL | casa_propia | porcentaje_fijo | monto_fijo | mora
indiceAnterior: Decimal
indiceNuevo: Decimal
porcentajeAumento: Decimal
montoAnterior: Decimal
montoNuevo: Decimal
razon: str
aplicadoPor: str
aplicadoEn: datetime
```

### `Usuario`
Extiende `AbstractUser`. Login por **email** (no username).

```python
email: str  # USERNAME_FIELD
telefono: str
activo: bool
```

### Índices Económicos
```python
IndiceIPC(anio, mes, porcentaje)
IndiceICL(anio, mes, nivel)
IndiceCP(anio, mes, nivel)
HistorialIndice(tipo, valor, anterior, fecha, consultadoEn)
```

---

## Endpoints Clave

### Autenticación
```
POST   /api/auth/login/                  # { email, password } → { access, refresh }
POST   /api/auth/refresh/                # { refresh } → { access }
GET    /api/auth/perfil/
```

### Contratos (ContratoViewSet)
```
GET    /api/contratos/                               # Listado filtrable y paginado
POST   /api/contratos/                               # Crear contrato
GET    /api/contratos/{id}/                          # Detalle
PUT    /api/contratos/{id}/                          # Actualizar
DELETE /api/contratos/{id}/                          # Soft delete

GET    /api/contratos/{id}/meses/                    # Lista EstadoMensual
PUT    /api/contratos/{id}/meses/{mes}-{anio}/estado/ # Cambiar estado de pago

POST   /api/contratos/{id}/generar-meses/            # Regenerar EstadoMensual
POST   /api/contratos/{id}/aplicar-aumento/          # Preview de aumento
POST   /api/contratos/{id}/confirmar-aumento/        # Aplicar aumento confirmado
POST   /api/contratos/{id}/aplicar-aumento-mora/     # Aplicar recargo por mora
POST   /api/contratos/{id}/recalcular-montos/        # Recalcular desde base

POST   /api/contratos/{id}/recibo/                   # Generar recibo inquilino (.docx)
POST   /api/contratos/{id}/recibo-propietario/       # Generar recibo propietario (.docx)

GET    /api/contratos/{id}/resumen-financiero/
GET    /api/contratos/buscar/
```

### Índices Económicos
```
GET    /api/indices/ipc/
GET    /api/indices/ipc-actual/
GET    /api/indices/icl/
GET    /api/indices/icl-historico/
GET    /api/indices/casa-propia/
GET    /api/indices/historial/?tipo=IPC
```

### Estadísticas y Utilidades
```
GET    /api/estadisticas/
GET    /health/
GET    /check-cloudinary/
GET    /api/docs/              # Swagger UI
```

---

## Funciones Clave del Backend (`services.py`)

```python
generar_meses(contrato, sobreescribir=False)
# Crea un EstadoMensual por cada mes entre fechaInicio y fechaFin.
# mes es 0-indexed. Usa relativedelta para iterar meses.

calcular_nuevo_monto(monto_anterior, porcentaje)
# Aplica porcentaje con redondeo bancario ROUND_HALF_UP a 2 decimales.

aplicar_aumento(contrato, tipo_aumento, porcentaje, monto_fijo, ...)
# Aplica aumento a meses futuros no pagados (o desde un mes específico).
# Registra AumentoMensual por cada mes afectado.
# Soporta: IPC, ICL, casa_propia, porcentaje_fijo, monto_fijo.

aplicar_mora(contrato, mes, anio, dias_atraso, recargo_mora)
# Aplica recargo de mora a un EstadoMensual específico.
# Solo si contrato.valorInteresMora está definido.

resumen_financiero(contrato)
# Devuelve totales de pagados/pendientes/parciales y deuda acumulada.
```

---

## Funciones Clave del Frontend

### `DetalleContrato.jsx`
Página más compleja. Contiene:
- Vista de meses con estados de pago y cambio de estado
- Modal de aumento (preview + confirmación)
- Modal de mora (calcular y aplicar)
- Modal de conceptos extras (editar precios por mes)
- Modal de recibo con vista previa idéntica al Word y descarga
- Persistencia de moras aplicadas en `localStorage` con clave `moras-aplicadas-{contratoId}`

### `FormContrato.jsx`
Formulario unificado para crear y editar contratos. Incluye:
- `OPCIONES_CONCEPTOS_EXTRAS`: `["Luz", "Gas", "Agua", "Cochera", "Expensas", "Cloacas", "Emos", "Municipal"]`
- Emos y Municipal se guardan con `precio: 0` y no son editables
- Subida de PDF del contrato y archivos de garantes (multipart)

### `client.js`
- Interceptor de 401 con cola de requests durante el refresh
- Métodos: `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete`
- Tipos de error: `VALIDATION_ERROR`, `PERMISSION_ERROR`, `NOT_FOUND_ERROR`, `SERVER_ERROR`, `NETWORK_ERROR`

---

## Convenciones de Código

### Frontend
- Componentes en PascalCase, archivos `.jsx`
- Hooks con prefijo `use`, retornan objetos `{ data, loading, error, fn }`
- Estilos solo con Chakra UI (sin CSS externo)
- Estado local con `useState`, sin Redux ni Context global
- `localStorage` para tokens JWT y moras aplicadas
- Meses en el frontend son **1-indexed** en display pero se convierten a 0-indexed al comunicarse con el backend
- `normalizarConceptosExtras()` normaliza el JSONField que puede venir como array de strings o array de objetos

### Backend
- Modelos con campos en `camelCase` (convención del proyecto, no la de Django)
- ViewSets con `@action` para endpoints extra
- Lógica de negocio en `services.py`, no en views ni serializers
- `@transaction.atomic` para operaciones que afectan múltiples registros
- `mes` siempre **0-indexed** en BD (0=Enero, 11=Diciembre)
- Soft delete: nunca se borran contratos físicamente
- Logging por app: `logger = logging.getLogger('contratos')`

---

## Gotchas y Decisiones Importantes

- **`mes` es 0-indexed en BD**: enero=0, diciembre=11. El frontend muestra `mes + 1`. Fuente frecuente de bugs.
- **`contratoPdf` es `FileField` pero guarda URLs de Cloudinary**: debería ser `CharField`. Funciona pero es técnicamente incorrecto.
- **Moras en localStorage**: las moras aplicadas se persisten en `localStorage` del browser con la clave `moras-aplicadas-{id}`, además de en BD.
- **Conceptos extras son JSON libre**: el backend no valida los nombres, guarda lo que manda el frontend.
- **Emos y Municipal**: siempre tienen `precio: 0`, aparecen como "Abona la locataria" en los recibos.
- **Recibo PDF pendiente**: el botón "Descargar PDF" en el frontend ya existe y llama a `/recibo-pdf/` y `/recibo-propietario-pdf/`, pero esos endpoints no están implementados en el backend todavía.
- **Honorarios**: se calculan sobre el alquiler puro (`valorMensual`), no sobre el total con extras.
- **IVA**: opcional por contrato (`incluye_iva`), se aplica al alquiler base.
