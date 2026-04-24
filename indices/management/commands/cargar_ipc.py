import requests
from datetime import datetime

from django.core.management.base import BaseCommand

from indices.models import IndiceIPC

INDEC_URL = (
    "https://apis.datos.gob.ar/series/api/series/"
    "?ids=148.3_INIVELNAL_DICI_M_26&format=json&limit=1000"
)


class Command(BaseCommand):
    help = "Carga el IPC mensual histórico completo desde la API del INDEC."

    def handle(self, *args, **options):
        self.stdout.write("Consultando API del INDEC para datos históricos...")

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

        # Mostrar rango de fechas disponibles
        if datos:
            primera_fecha = datos[0][0][:10] if datos[0] and datos[0][0] else "N/A"
            ultima_fecha = datos[-1][0][:10] if datos[-1] and datos[-1][0] else "N/A"
            self.stdout.write(f"Rango de datos: {primera_fecha} a {ultima_fecha}")
            self.stdout.write(f"Total de registros disponibles: {len(datos)}")

        creados    = 0
        omitidos   = 0
        actualizados = 0

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

            # Intentar crear o actualizar el registro
            obj, created = IndiceIPC.objects.get_or_create(
                anio=fecha.year,
                mes=fecha.month,
                defaults={"porcentaje": round(float(valor), 2)},
            )
            
            if created:
                creados += 1
            else:
                # Si el registro ya existe, verificar si necesita actualización
                if obj.porcentaje != round(float(valor), 2):
                    obj.porcentaje = round(float(valor), 2)
                    obj.save()
                    actualizados += 1
                else:
                    omitidos += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo. Creados: {creados} | Actualizados: {actualizados} | Ya existían: {omitidos}"
            )
        )
