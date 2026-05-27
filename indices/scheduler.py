import logging
import re
import subprocess
import tempfile
from datetime import datetime, date

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger('indices.scheduler')

INDEC_URL = (
    "https://apis.datos.gob.ar/series/api/series/"
    "?ids=148.3_INIVELNAL_DICI_M_26&format=json"
)
ARGLY_ICL_URL = "https://api.argly.com.ar/api/icl/history"
ARGLY_IPC_URL = "https://api.argly.com.ar/api/ipc"
CP_PAGE_URL = "https://www.argentina.gob.ar/obras-publicas/coeficiente-casa-propia"

_MESES_ES = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
}
_RE_FILA_CP = re.compile(r'^([a-z]{3})-(\d{2})\s+([\d,]+)', re.IGNORECASE | re.MULTILINE)


def _cargar_ipc():
    from .models import IndiceIPC

    hoy = date.today()
    if IndiceIPC.objects.filter(anio=hoy.year, mes=hoy.month).exists():
        logger.info("[Scheduler] IPC — %d-%02d ya existe, continuando para cubrir huecos.", hoy.year, hoy.month)

    logger.info("[Scheduler] Iniciando carga de IPC...")

    # === 1. HISTÓRICO DESDE INDEC (nivel acumulado → variación mensual) ===
    try:
        resp = requests.get(INDEC_URL, timeout=30)
        resp.raise_for_status()
        datos = resp.json().get("data", [])
    except Exception as exc:
        logger.error("[Scheduler] Error consultando INDEC: %s", exc)
        datos = []

    creados = actualizados = omitidos = 0

    for i, punto in enumerate(datos):
        if not isinstance(punto, list) or len(punto) < 2:
            continue
        fecha_str, nivel = punto[0], punto[1]
        if nivel is None or i == 0:
            continue
        nivel_anterior = datos[i - 1][1]
        if nivel_anterior is None or nivel_anterior == 0:
            continue
        try:
            fecha = datetime.strptime(fecha_str[:10], "%Y-%m-%d")
        except ValueError:
            continue

        variacion = round((float(nivel) / float(nivel_anterior) - 1) * 100, 2)

        obj, created = IndiceIPC.objects.get_or_create(
            anio=fecha.year,
            mes=fecha.month,
            defaults={"porcentaje": variacion},
        )
        if created:
            creados += 1
        elif abs(float(obj.porcentaje) - variacion) > 0.01:
            obj.porcentaje = variacion
            obj.save()
            actualizados += 1
        else:
            omitidos += 1

    logger.info(
        "[Scheduler] IPC INDEC — Creados: %d | Actualizados: %d | Ya existían: %d",
        creados, actualizados, omitidos,
    )

    # === 2. MES MÁS RECIENTE DESDE ARGLY (variación directa, sin cálculo) ===
    try:
        resp_argly = requests.get(ARGLY_IPC_URL, timeout=10)
        resp_argly.raise_for_status()
        data_argly = resp_argly.json().get('data', {})

        mes_argly   = data_argly.get('mes')
        anio_argly  = data_argly.get('anio')
        valor_argly = data_argly.get('indice_ipc')

        if mes_argly and anio_argly and valor_argly is not None:
            obj, created = IndiceIPC.objects.get_or_create(
                anio=anio_argly,
                mes=mes_argly,
                defaults={"porcentaje": round(float(valor_argly), 2)},
            )
            if created:
                logger.info("[Scheduler] IPC Argly — agregado %d-%02d: %s%%", anio_argly, mes_argly, valor_argly)
            else:
                logger.info("[Scheduler] IPC Argly — %d-%02d ya existía", anio_argly, mes_argly)
    except Exception as exc:
        logger.error("[Scheduler] Error consultando Argly IPC: %s", exc)


def _cargar_icl():
    from .models import IndiceICL

    hoy = date.today()
    if IndiceICL.objects.filter(anio=hoy.year, mes=hoy.month).exists():
        logger.info("[Scheduler] ICL — %d-%02d ya existe, continuando para cubrir huecos.", hoy.year, hoy.month)

    logger.info("[Scheduler] Iniciando carga de ICL...")
    try:
        resp = requests.get(ARGLY_ICL_URL, timeout=30)
        resp.raise_for_status()
        registros = resp.json().get("data", [])
    except Exception as exc:
        logger.error("[Scheduler] Error consultando argly: %s", exc)
        return

    ultimo_por_mes: dict[tuple, float] = {}
    for r in registros:
        fecha_str = r.get("fecha")
        valor = r.get("valor")
        if not fecha_str or valor is None:
            continue
        try:
            fecha = datetime.strptime(fecha_str, "%d/%m/%Y")
        except ValueError:
            continue
        ultimo_por_mes[(fecha.year, fecha.month)] = float(valor)

    creados = actualizados = omitidos = 0
    for (anio, mes), nivel in sorted(ultimo_por_mes.items()):
        redondeado = round(nivel, 4)
        obj, created = IndiceICL.objects.get_or_create(
            anio=anio,
            mes=mes,
            defaults={"nivel": redondeado},
        )
        if created:
            creados += 1
        elif float(obj.nivel) != redondeado:
            obj.nivel = redondeado
            obj.save()
            actualizados += 1
        else:
            omitidos += 1

    logger.info(
        "[Scheduler] ICL — Creados: %d | Actualizados: %d | Ya existían: %d",
        creados, actualizados, omitidos,
    )


def _cargar_cp():
    from .models import IndiceCP

    logger.info("[Scheduler] Iniciando carga de Casa Propia desde PDF oficial...")

    # 1. Encontrar URL del PDF en la página
    try:
        resp = requests.get(CP_PAGE_URL, timeout=20)
        resp.raise_for_status()
        match = re.search(
            r'https://www\.argentina\.gob\.ar/sites/default/files/coeficiente_de_actualizacion[^"\']+\.pdf',
            resp.text,
        )
    except Exception as exc:
        logger.error("[Scheduler] Casa Propia — error al acceder a la página: %s", exc)
        return

    if not match:
        logger.error("[Scheduler] Casa Propia — no se encontró enlace al PDF en la página.")
        return

    pdf_url = match.group(0)
    logger.info("[Scheduler] Casa Propia — PDF: %s", pdf_url)

    # 2. Descargar PDF
    try:
        resp = requests.get(pdf_url, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        logger.error("[Scheduler] Casa Propia — error al descargar PDF: %s", exc)
        return

    # 3. Extraer texto con pdftotext
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name

    try:
        resultado = subprocess.run(
            ["pdftotext", tmp_path, "-"],
            capture_output=True, text=True, timeout=30,
        )
    except Exception as exc:
        logger.error("[Scheduler] Casa Propia — error en pdftotext: %s", exc)
        return

    # 4. Parsear filas
    creados = actualizados = omitidos = 0
    for m in _RE_FILA_CP.finditer(resultado.stdout):
        mes_str, anio_str, nivel_str = m.groups()
        mes = _MESES_ES.get(mes_str.lower())
        if mes is None:
            continue
        anio = 2000 + int(anio_str)
        nivel = round(float(nivel_str.replace(',', '.')), 4)

        obj, created = IndiceCP.objects.get_or_create(
            anio=anio,
            mes=mes,
            defaults={"nivel": nivel},
        )
        if created:
            creados += 1
        elif float(obj.nivel) != nivel:
            obj.nivel = nivel
            obj.save()
            actualizados += 1
        else:
            omitidos += 1

    logger.info(
        "[Scheduler] Casa Propia — Creados: %d | Actualizados: %d | Ya existían: %d",
        creados, actualizados, omitidos,
    )


def iniciar_scheduler():
    scheduler = BackgroundScheduler(timezone="America/Argentina/Buenos_Aires")
    scheduler.add_job(
        _cargar_ipc,
        trigger=CronTrigger(hour=8, minute=0),
        id="cargar_ipc_mensual",
        replace_existing=True,
    )
    scheduler.add_job(
        _cargar_icl,
        trigger=CronTrigger(hour=8, minute=15),
        id="cargar_icl_mensual",
        replace_existing=True,
    )
    scheduler.add_job(
        _cargar_cp,
        trigger=CronTrigger(day='15-30', hour=8, minute=30),
        id="cargar_cp_mensual",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "[Scheduler] Iniciado — "
        "IPC diario a las 08:00 (idempotente) | "
        "ICL diario a las 08:15 (idempotente) | "
        "Casa Propia días 15-30 a las 08:30 "
        "(hora Argentina)"
    )
