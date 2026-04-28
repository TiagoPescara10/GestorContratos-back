from django.core.management.base import BaseCommand
from indices.models import IndiceICL
from decimal import Decimal


# Valores del día 1 de cada mes, fuente: BCRA (diar_icl.xls)
ICL_HISTORICO = [
    (2021, 1,  Decimal('1.13')),
    (2021, 2,  Decimal('1.17')),
    (2021, 3,  Decimal('1.20')),
    (2021, 4,  Decimal('1.23')),
    (2021, 5,  Decimal('1.28')),
    (2021, 6,  Decimal('1.34')),
    (2021, 7,  Decimal('1.41')),
    (2021, 8,  Decimal('1.46')),
    (2021, 9,  Decimal('1.50')),
    (2021, 10, Decimal('1.56')),
    (2021, 11, Decimal('1.60')),
    (2021, 12, Decimal('1.65')),
    (2022, 1,  Decimal('1.72')),
    (2022, 2,  Decimal('1.77')),
    (2022, 3,  Decimal('1.82')),
    (2022, 4,  Decimal('1.89')),
    (2022, 5,  Decimal('1.97')),
    (2022, 6,  Decimal('2.09')),
    (2022, 7,  Decimal('2.23')),
    (2022, 8,  Decimal('2.35')),
    (2022, 9,  Decimal('2.47')),
    (2022, 10, Decimal('2.61')),
    (2022, 11, Decimal('2.77')),
    (2022, 12, Decimal('2.93')),
]


class Command(BaseCommand):
    help = 'Carga datos históricos del ICL (2021-2022) desde el BCRA'

    def handle(self, *args, **kwargs):
        creados = 0
        omitidos = 0

        for anio, mes, nivel in ICL_HISTORICO:
            obj, created = IndiceICL.objects.get_or_create(
                anio=anio,
                mes=mes,
                defaults={'nivel': nivel}
            )

            if created:
                creados += 1
                self.stdout.write(f'✅ {anio}/{mes:02d}: {nivel}')
            else:
                omitidos += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. Creados: {creados} | Ya existían: {omitidos}'
        ))
