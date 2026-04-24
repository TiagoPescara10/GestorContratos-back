# Configuración del Scheduler para Producción (Render)

## Opción 1: Render Cron Jobs (Recomendado)

### Configuración en Render Dashboard:

1. **Ve a tu servicio backend en Render**
2. **Cron Jobs tab → Add Cron Job**

#### Cron Job para IPC (días 15-30 a las 08:00):
```bash
# Comando
python manage.py cargar_ipc

# Schedule
0 8 15-30 * *
```

#### Cron Job para ICL (días 15-30 a las 08:15):
```bash
# Comando  
python manage.py cargar_icl

# Schedule
15 8 15-30 * *
```

### Explicación del schedule:
- `0 8 15-30 * *` = Minuto 0, Hora 8, Días 15-30, Mes *, Día semana *
- `15 8 15-30 * *` = Minuto 15, Hora 8, Días 15-30, Mes *, Día semana *

## Opción 2: Script Wrapper

Usa el script `scripts/update_indices.sh`:

```bash
# Comando
bash scripts/update_indices.sh

# Schedule (ejecutar ambos comandos)
0 8 15-30 * *
```

## Comandos Disponibles:

### Cargar IPC:
```bash
python manage.py cargar_ipc
```
- Obtiene datos históricos del INDEC
- Actualiza tabla `indices_indiceipc`
- Se ejecuta los días 15-30 a las 08:00

### Cargar ICL:
```bash
python manage.py cargar_icl
```
- Obtiene datos históricos de Argly API
- Actualiza tabla `indices_indiceicl`
- Se ejecuta los días 15-30 a las 08:15

## Verificación:

Para verificar que funciona manualmente:

```bash
# Ver últimos IPC
python manage.py shell -c "
from indices.models import IndiceIPC
print(IndiceIPC.objects.order_by('-anio', '-mes')[:5])
"

# Ver últimos ICL
python manage.py shell -c "
from indices.models import IndiceICL
print(IndiceICL.objects.order_by('-anio', '-mes')[:5])
"
```

## Notas:

- El scheduler automático de Django está deshabilitado en producción
- Los cron jobs de Render son más confiables para producción
- Los logs de los cron jobs aparecen en los logs del servicio
- Configura timezone en `settings.py`: `TIME_ZONE = 'America/Argentina/Buenos_Aires'`
