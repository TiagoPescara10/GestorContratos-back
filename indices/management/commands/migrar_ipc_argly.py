import requests
from django.core.management.base import BaseCommand

from indices.models import IndiceIPC

ARGLY_IPC_HISTORY_URL = "https://api.argly.com.ar/api/ipc/history"


class Command(BaseCommand):
    help = "Carga todos los registros históricos de IPC desde Argly usando get_or_create."

    def handle(self, *args, **options):
        self.stdout.write("Consultando Argly IPC history...")

        try:
            resp = requests.get(ARGLY_IPC_HISTORY_URL, timeout=30)
            resp.raise_for_status()
            registros = resp.json().get("data", [])
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Error al consultar Argly: {exc}"))
            return

        if not registros:
            self.stderr.write(self.style.WARNING("La API devolvió 0 registros."))
            return

        self.stdout.write(f"Registros recibidos: {len(registros)}")

        creados = actualizados = omitidos = 0
        for r in registros:
            anio = r["anio"]
            mes = r["mes"]
            porcentaje = round(float(r["valor"]), 2)

            obj, created = IndiceIPC.objects.get_or_create(
                anio=anio,
                mes=mes,
                defaults={"porcentaje": porcentaje},
            )
            if created:
                creados += 1
            elif abs(float(obj.porcentaje) - porcentaje) > 0.01:
                obj.porcentaje = porcentaje
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
