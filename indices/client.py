"""
Cliente para la API externa de índices (api.argly.com.ar).
Caché en memoria de 24 hs para no saturar la API externa.
"""
import logging
import time
from typing import Optional

import requests
from django.conf import settings

logger   = logging.getLogger('indices')
_cache: dict = {}
CACHE_TTL = 86_400   # 24 hs en segundos
BASE_URL  = getattr(settings, 'ARGLY_API_BASE', 'https://api.argly.com.ar/api')


def obtener_indice(tipo: str) -> dict:
    """
    Obtiene el índice 'IPC' o 'ICL' desde la API o caché.
    Retorna dict: { tipo, valor, anterior, fecha, raw } o { error }.
    """
    tipo  = tipo.upper()
    ahora = time.time()

    cached = _cache.get(tipo)
    if cached and (ahora - cached['ts']) < CACHE_TTL:
        logger.info('Índice %s desde caché', tipo)
        return cached['data']

    url = f"{BASE_URL}/{tipo.lower()}"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        raw = resp.json()
    except requests.exceptions.Timeout:
        logger.error('Timeout al consultar índice %s', tipo)
        return {'error': f'Timeout al consultar la API de índices ({tipo}).'}
    except requests.exceptions.HTTPError as exc:
        logger.error('HTTP error índice %s: %s', tipo, exc)
        return {'error': f'Error HTTP {resp.status_code} al consultar {tipo}.'}
    except Exception as exc:
        logger.error('Error inesperado índice %s: %s', tipo, exc)
        return {'error': str(exc)}

    data = _normalizar(tipo, raw)
    _cache[tipo] = {'ts': ahora, 'data': data}
    logger.info('Índice %s actualizado: %s', tipo, data.get('valor'))
    return data


def _normalizar(tipo: str, raw) -> dict:
    """
    Normaliza la respuesta de argly.com.ar al formato interno.
    Ajustar según estructura real de la API.
    """
    # La API puede devolver una lista o un dict — manejamos ambos casos
    entry = {}
    if isinstance(raw, dict):
        # Ejemplo de respuesta argly:
        # {'data': {'indice_ipc': 12.34, 'anterior': 11.2, 'fecha': '2026-03'}}
        # o {'data': [{'valor': ...}]}
        data_branch = raw.get('data', raw)
        if isinstance(data_branch, list) and data_branch:
            entry = data_branch[0]
        elif isinstance(data_branch, dict):
            entry = data_branch
        else:
            entry = raw
    elif isinstance(raw, list) and raw:
        entry = raw[0]

    # Compatibilidad con varias claves posibles de índice de IPC/ICL
    valor_candidates = [
        entry.get('indice_ipc'),
        entry.get('indice_icl'),
        entry.get('valor'),
        entry.get('value'),
        entry.get('porcentaje'),
        entry.get('variacion'),
    ]
    valor = next((v for v in valor_candidates if v is not None), 0)

    anterior_candidates = [
        entry.get('anterior'),
        entry.get('prev'),
        entry.get('valorAnterior'),
        entry.get('valor_anterior'),
    ]
    anterior = next((v for v in anterior_candidates if v is not None), 0)

    fecha = (entry.get('fecha') or entry.get('date') or entry.get('periodo') or '')

    try:
        valor = float(valor)
    except (TypeError, ValueError):
        valor = 0.0

    try:
        anterior = float(anterior)
    except (TypeError, ValueError):
        anterior = 0.0

    return {
        'tipo':     tipo,
        'valor':    valor,
        'anterior': anterior,
        'fecha':    str(fecha),
        'raw':      raw,
    }


def limpiar_cache(tipo: Optional[str] = None):
    if tipo:
        _cache.pop(tipo.upper(), None)
    else:
        _cache.clear()
