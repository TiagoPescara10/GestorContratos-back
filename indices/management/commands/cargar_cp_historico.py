from django.core.management.base import BaseCommand
from indices.models import IndiceCP
from decimal import Decimal


# Coeficiente mensual oficial, fuente: argentina.gob.ar (Índice Casa Propia)
CP_HISTORICO = [
    # (anio, mes, coeficiente_mensual)
    # 2022
    (2022, 1,  Decimal('1.0317')),
    (2022, 2,  Decimal('1.0318')),
    (2022, 3,  Decimal('1.0326')),
    (2022, 4,  Decimal('1.0334')),
    (2022, 5,  Decimal('1.0349')),
    (2022, 6,  Decimal('1.0374')),
    (2022, 7,  Decimal('1.0396')),
    (2022, 8,  Decimal('1.0434')),
    (2022, 9,  Decimal('1.0476')),
    (2022, 10, Decimal('1.0499')),
    (2022, 11, Decimal('1.0522')),
    (2022, 12, Decimal('1.0557')),
    # 2023
    (2023, 1,  Decimal('1.0558')),
    (2023, 2,  Decimal('1.0571')),
    (2023, 3,  Decimal('1.0576')),
    (2023, 4,  Decimal('1.0628')),
    (2023, 5,  Decimal('1.0691')),
    (2023, 6,  Decimal('1.0756')),
    (2023, 7,  Decimal('1.0831')),
    (2023, 8,  Decimal('1.1172')),
    (2023, 9,  Decimal('1.1244')),
    (2023, 10, Decimal('1.1333')),
    (2023, 11, Decimal('1.1459')),
    (2023, 12, Decimal('1.1682')),
    # 2024
    (2024, 1,  Decimal('1.1986')),
    (2024, 2,  Decimal('1.1388')),
    (2024, 3,  Decimal('1.1204')),
    (2024, 4,  Decimal('1.0895')),
    (2024, 5,  Decimal('1.0719')),
    (2024, 6,  Decimal('1.0625')),
    (2024, 7,  Decimal('1.0562')),
    (2024, 8,  Decimal('1.0475')),
    (2024, 9,  Decimal('1.0408')),
    (2024, 10, Decimal('1.0365')),
    (2024, 11, Decimal('1.0329')),
    (2024, 12, Decimal('1.0307')),
    # 2025
    (2025, 1,  Decimal('1.0284')),
    (2025, 2,  Decimal('1.0296')),
    (2025, 3,  Decimal('1.0305')),
    (2025, 4,  Decimal('1.0314')),
    (2025, 5,  Decimal('1.0323')),
    (2025, 6,  Decimal('1.0332')),
    (2025, 7,  Decimal('1.0341')),
    (2025, 8,  Decimal('1.0318')),
    (2025, 9,  Decimal('1.0296')),
    (2025, 10, Decimal('1.0274')),
    (2025, 11, Decimal('1.0253')),
    (2025, 12, Decimal('1.0232')),
]


class Command(BaseCommand):
    help = 'Carga datos históricos del Índice Casa Propia (2022-2025) desde argentina.gob.ar'

    def handle(self, *args, **kwargs):
        creados = 0
        omitidos = 0

        for anio, mes, nivel in CP_HISTORICO:
            obj, created = IndiceCP.objects.get_or_create(
                anio=anio,
                mes=mes,
                defaults={'nivel': nivel}
            )

            if created:
                creados += 1
                variacion = round((float(nivel) - 1) * 100, 2)
                self.stdout.write(f'✅ {anio}/{mes:02d}: {nivel} (var: {variacion}%)')
            else:
                omitidos += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. Creados: {creados} | Ya existían: {omitidos}'
        ))
