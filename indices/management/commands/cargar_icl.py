import requests
from datetime import datetime

from django.core.management.base import BaseCommand

from indices.models import IndiceICL

ARGLY_URL = "https://api.argly.com.ar/api/icl/history"


class Command(BaseCommand):
    help = "Carga el ICL mensual histórico desde la API de argly (último valor de cada mes)."

    def handle(self, *args, **options):
        self.stdout.write("Consultando API de argly para datos históricos del ICL...")

        try:
            resp = requests.get(ARGLY_URL, timeout=30)
            resp.raise_for_status()
            registros = resp.json().get("data", [])
        except Exception as exc:
            self.stderr.write(f"Error al consultar argly: {exc}")
            return

        if not registros:
            self.stderr.write("La API no devolvió datos.")
            return

        self.stdout.write(f"Total de registros diarios: {len(registros)}")

        # Agrupar por mes: guardar el último valor de cada mes
        ultimo_por_mes: dict[tuple, float] = {}
        for r in registros:
            fecha_str = r.get("fecha")
            valor     = r.get("valor")
            if not fecha_str or valor is None:
                continue
            try:
                fecha = datetime.strptime(fecha_str, "%d/%m/%Y")
            except ValueError:
                continue
            clave = (fecha.year, fecha.month)
            # Los registros vienen en orden cronológico; el último sobrescribe
            ultimo_por_mes[clave] = float(valor)

        self.stdout.write(f"Meses únicos encontrados: {len(ultimo_por_mes)}")

        creados      = 0
        omitidos     = 0
        actualizados = 0

        for (anio, mes), nivel in sorted(ultimo_por_mes.items()):
            nivel_redondeado = round(nivel, 4)
            obj, created = IndiceICL.objects.get_or_create(
                anio=anio,
                mes=mes,
                defaults={"nivel": nivel_redondeado},
            )
            if created:
                creados += 1
            elif float(obj.nivel) != nivel_redondeado:
                obj.nivel = nivel_redondeado
                obj.save()
                actualizados += 1
            else:
                omitidos += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Listo. Creados: {creados} | Actualizados: {actualizados} | Ya existían: {omitidos}"
            )
        )
