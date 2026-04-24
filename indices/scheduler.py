import logging
from datetime import datetime

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger('indices.scheduler')

INDEC_URL = (
    "https://apis.datos.gob.ar/series/api/series/"
    "?ids=148.3_INIVELNAL_DICI_M_26&format=json"
)
ARGLY_ICL_URL = "https://api.argly.com.ar/api/icl/history"


def _cargar_ipc():
    from .models import IndiceIPC

    logger.info("[Scheduler] Iniciando carga de IPC...")
    try:
        resp = requests.get(INDEC_URL, timeout=30)
        resp.raise_for_status()
        datos = resp.json().get("data", [])
    except Exception as exc:
        logger.error("[Scheduler] Error consultando INDEC: %s", exc)
        return

    creados = actualizados = omitidos = 0
    for punto in datos:
        if not isinstance(punto, list) or len(punto) < 2:
            continue
        fecha_str, valor = punto[0], punto[1]
        if valor is None:
            continue
        try:
            fecha = datetime.strptime(fecha_str[:10], "%Y-%m-%d")
        except ValueError:
            continue
        redondeado = round(float(valor), 2)
        obj, created = IndiceIPC.objects.get_or_create(
            anio=fecha.year,
            mes=fecha.month,
            defaults={"porcentaje": redondeado},
        )
        if created:
            creados += 1
        elif float(obj.porcentaje) != redondeado:
            obj.porcentaje = redondeado
            obj.save()
            actualizados += 1
        else:
            omitidos += 1

    logger.info(
        "[Scheduler] IPC — Creados: %d | Actualizados: %d | Ya existían: %d",
        creados, actualizados, omitidos,
    )


def _cargar_icl():
    from .models import IndiceICL

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


def iniciar_scheduler():
    scheduler = BackgroundScheduler(timezone="America/Argentina/Buenos_Aires")
    scheduler.add_job(
        _cargar_ipc,
        trigger=CronTrigger(day='15-30', hour=8, minute=0),
        id="cargar_ipc_mensual",
        replace_existing=True,
    )
    scheduler.add_job(
        _cargar_icl,
        trigger=CronTrigger(day='15-30', hour=8, minute=15),
        id="cargar_icl_mensual",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "[Scheduler] Iniciado — IPC días 15-30 a las 08:00, ICL días 15-30 a las 08:15 (hora Argentina)"
    )
