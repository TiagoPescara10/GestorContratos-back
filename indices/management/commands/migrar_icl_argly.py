from django.core.management.base import BaseCommand

from indices.models import IndiceICL
from indices.scheduler import _cargar_icl


class Command(BaseCommand):
    help = "Borra los registros ICL desde 2023 y los recarga desde la API de Argly."

    def handle(self, *args, **options):
        # 1. Borrar registros desde 2023
        qs_borrar = IndiceICL.objects.filter(anio__gte=2023)
        borrados = qs_borrar.count()
        qs_borrar.delete()
        self.stdout.write(f"Registros ICL borrados (anio >= 2023): {borrados}")

        # 2. Recargar desde Argly (misma lógica que el scheduler)
        self.stdout.write("Cargando ICL desde Argly...")
        _cargar_icl()

        # 3. Resumen
        total_cargados = IndiceICL.objects.filter(anio__gte=2023).count()
        self.stdout.write(f"Registros ICL cargados (anio >= 2023): {total_cargados}")

        ultimos = IndiceICL.objects.order_by('-anio', '-mes')[:5]
        self.stdout.write("Últimos 5 registros:")
        for r in ultimos:
            self.stdout.write(f"  {r.anio}/{r.mes:02d} — nivel: {r.nivel}")

        self.stdout.write(self.style.SUCCESS("Migración completada."))
