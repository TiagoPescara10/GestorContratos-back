import requests
from datetime import datetime

from django.core.management.base import BaseCommand

from indices.models import IndiceIPC

INDEC_URL = (
    "https://apis.datos.gob.ar/series/api/series/"
    "?ids=148.3_INIVELNAL_DICI_M_26&limit=200&start=0&format=json"
)


class Command(BaseCommand):
    help = "Carga el IPC mensual desde la API del INDEC (desde enero 2021)."

    def handle(self, *args, **options):
        self.stdout.write("Consultando API del INDEC...")

        try:
            resp = requests.get(INDEC_URL, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            self.stderr.write(f"Error al consultar INDEC: {exc}")
            return

        datos = data.get("data", [])
        if not datos:
            self.stderr.write("La API no devolvió datos.")
            return

        creados    = 0
        omitidos   = 0
        fecha_min  = datetime(2021, 1, 1)

        for punto in datos:
            # Cada punto es [fecha_str, valor], ej: ["2024-03-01", 3.7]
            if not isinstance(punto, list) or len(punto) < 2:
                continue

            fecha_str, valor = punto[0], punto[1]
            if valor is None:
                continue

            try:
                fecha = datetime.strptime(fecha_str[:10], "%Y-%m-%d")
            except ValueError:
                continue

            if fecha < fecha_min:
                continue

            _, created = IndiceIPC.objects.get_or_create(
                anio=fecha.year,
                mes=fecha.month,
                defaults={"porcentaje": round(float(valor), 2)},
            )
            if created:
                creados += 1
            else:
                omitidos += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo. Creados: {creados} | Ya existían: {omitidos}"
            )
        )
