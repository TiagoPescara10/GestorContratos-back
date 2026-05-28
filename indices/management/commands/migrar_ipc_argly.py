from datetime import datetime

import requests
from django.core.management.base import BaseCommand

from indices.models import IndiceIPC

ARGLY_IPC_HISTORY_URL = "https://api.argly.com.ar/api/ipc/history"

_CAMPOS_VALOR = ["indice_ipc", "valor", "porcentaje", "variacion", "ipc"]
_CAMPOS_FECHA = ["fecha", "date", "periodo", "mes_anio"]


def _extraer_valor(r: dict):
    """Retorna el primer campo numérico que exista en el registro (None-safe)."""
    for campo in _CAMPOS_VALOR:
        v = r.get(campo)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                continue
    return None


def _extraer_fecha(r: dict):
    """Retorna (anio, mes) probando varios formatos. Retorna None si no puede parsear."""
    for campo in _CAMPOS_FECHA:
        fecha_str = r.get(campo)
        if not fecha_str:
            continue
        fecha_str = str(fecha_str).strip()
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%Y", "%Y-%m"):
            try:
                dt = datetime.strptime(fecha_str[:len(fmt.replace("%d","00").replace("%m","00").replace("%Y","0000").replace("%",""))], fmt)
                return dt.year, dt.month
            except ValueError:
                continue
        # Intento genérico por longitud
        try:
            if len(fecha_str) >= 10:
                dt = datetime.strptime(fecha_str[:10], "%Y-%m-%d")
                return dt.year, dt.month
        except ValueError:
            pass
    return None


class Command(BaseCommand):
    help = "Carga todos los registros históricos de IPC desde Argly usando get_or_create."

    def handle(self, *args, **options):
        self.stdout.write("Consultando Argly IPC history...")

        try:
            resp = requests.get(ARGLY_IPC_HISTORY_URL, timeout=30)
            resp.raise_for_status()
            raw_json = resp.json()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Error al consultar Argly: {exc}"))
            return

        registros = raw_json.get("data", [])

        if not registros:
            self.stderr.write(self.style.WARNING("La API devolvió 0 registros."))
            self.stdout.write(f"Respuesta completa: {raw_json}")
            return

        self.stdout.write(f"Registros recibidos: {len(registros)}")
        self.stdout.write(f"Primer registro (raw): {registros[0]}")
        self.stdout.write(f"Campos disponibles:    {list(registros[0].keys())}")

        ultimo_por_mes: dict[tuple, float] = {}
        saltados = 0
        for r in registros:
            valor = _extraer_valor(r)
            fecha = _extraer_fecha(r)

            if valor is None or fecha is None:
                saltados += 1
                continue

            anio, mes = fecha
            ultimo_por_mes[(anio, mes)] = valor

        self.stdout.write(f"Registros parseados: {len(ultimo_por_mes)} | Saltados: {saltados}")

        if not ultimo_por_mes:
            self.stderr.write(self.style.ERROR(
                "Ningún registro pudo parsearse. "
                "Revisá los campos del primer registro impreso arriba."
            ))
            return

        creados = actualizados = omitidos = 0
        for (anio, mes), porcentaje in sorted(ultimo_por_mes.items()):
            redondeado = round(porcentaje, 2)
            obj, created = IndiceIPC.objects.get_or_create(
                anio=anio,
                mes=mes,
                defaults={"porcentaje": redondeado},
            )
            if created:
                creados += 1
            elif abs(float(obj.porcentaje) - redondeado) > 0.01:
                obj.porcentaje = redondeado
                obj.save()
                actualizados += 1
            else:
                omitidos += 1

        self.stdout.write(
            f"Creados: {creados} | Actualizados: {actualizados} | Ya existían: {omitidos}"
        )

        ultimos = IndiceIPC.objects.order_by('-anio', '-mes')[:5]
        self.stdout.write("Últimos 5 registros:")
        for r in ultimos:
            self.stdout.write(f"  {r.anio}/{r.mes:02d} — {r.porcentaje}%")

        self.stdout.write(self.style.SUCCESS("Migración completada."))
