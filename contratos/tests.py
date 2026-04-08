"""
Tests de la app contratos.
Ejecutar con: python manage.py test contratos
"""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, Mock

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Contrato, EstadoMensual, AumentoMensual, EstadoPago
from . import services


# ── Fixtures ──────────────────────────────────────────────────────────────────

def crear_contrato(**kwargs) -> Contrato:
    hoy = date.today()
    defaults = dict(
        pais='Argentina',
        provincia='Córdoba',
        localidad='Córdoba Capital',
        codigoPostal='5000',
        tipoPropiedad='departamento',
        inquilinoNombre='Juan Pérez',
        inquilinoDni='12345678',
        propietarioNombre='María García',
        propietarioDni='87654321',
        propietarioNombreCompleto='María García López',
        propietarioEmail='maria@test.com',
        valorMensual=Decimal('100000.00'),
        monedaMensual='ARS',
        fechaInicio=hoy.replace(day=1),
        fechaFin=(hoy.replace(day=1) + timedelta(days=365)),
        diaPago=10,
    )
    defaults.update(kwargs)
    return Contrato.objects.create(**defaults)


# ── Tests de modelos ──────────────────────────────────────────────────────────

class ContratoModelTest(TestCase):

    def test_estado_activo(self):
        hoy = date.today()
        c = crear_contrato(
            fechaInicio=hoy - timedelta(days=60),
            fechaFin=hoy + timedelta(days=60),
        )
        self.assertEqual(c.estado, 'activo')

    def test_estado_vencido(self):
        hoy = date.today()
        c = crear_contrato(
            fechaInicio=hoy - timedelta(days=365),
            fechaFin=hoy - timedelta(days=1),
        )
        self.assertEqual(c.estado, 'vencido')

    def test_estado_prox_avencer(self):
        hoy = date.today()
        c = crear_contrato(
            fechaInicio=hoy - timedelta(days=335),
            fechaFin=hoy + timedelta(days=20),
        )
        self.assertEqual(c.estado, 'proxAvencer')

    def test_duracion_calculada(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2025, 1, 1),
        )
        self.assertEqual(c.duracion, 12)

    def test_soft_delete_excluye_del_queryset(self):
        c = crear_contrato(inquilinoDni='11111111')
        c.eliminado = True
        c.save()
        self.assertFalse(Contrato.objects.filter(eliminado=False, pk=c.pk).exists())


class EstadoMensualTest(TestCase):

    def setUp(self):
        hoy = date.today()
        self.contrato = crear_contrato(
            fechaInicio=date(hoy.year, hoy.month, 1) - timedelta(days=60),
            fechaFin=date(hoy.year, hoy.month, 1) + timedelta(days=365),
            diaPago=5,
        )
        services.generar_meses(self.contrato)

    def test_fecha_vencimiento_correcta(self):
        em = self.contrato.meses.first()
        self.assertEqual(em.fecha_vencimiento.day, self.contrato.diaPago)

    def test_sin_recargo_si_pagado(self):
        em = self.contrato.meses.first()
        em.estado = EstadoPago.PAGADO
        em.save()
        self.assertFalse(em.tiene_recargo_calculado)

    def test_recargo_en_mes_pasado(self):
        hoy = date.today()
        mes_pasado = hoy.replace(day=1) - timedelta(days=1)
        em = self.contrato.meses.filter(
            mes=mes_pasado.month - 1, anio=mes_pasado.year
        ).first()
        if em:
            self.assertTrue(em.tiene_recargo_calculado)


# ── Tests de servicios ────────────────────────────────────────────────────────

class GenerarMesesTest(TestCase):

    def test_genera_cantidad_correcta(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 6, 30),
        )
        creados = services.generar_meses(c)
        self.assertEqual(len(creados), 6)

    def test_no_duplica_si_ya_existen(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 3, 31),
        )
        services.generar_meses(c)
        services.generar_meses(c)   # segunda vez
        self.assertEqual(c.meses.count(), 3)

    def test_sobreescribir_regenera(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 3, 31),
        )
        services.generar_meses(c)
        em = c.meses.first()
        em.estado = EstadoPago.PAGADO
        em.save()
        services.generar_meses(c, sobreescribir=True)
        self.assertEqual(c.meses.filter(estado=EstadoPago.PAGADO).count(), 0)

    def test_meses_0_indexed(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 1, 31),
        )
        services.generar_meses(c)
        em = c.meses.first()
        self.assertEqual(em.mes, 0)   # enero = 0


class AplicarAumentoTest(TestCase):

    def setUp(self):
        hoy = date.today()
        self.contrato = crear_contrato(
            fechaInicio=hoy.replace(day=1) - timedelta(days=30),
            fechaFin=hoy.replace(day=1) + timedelta(days=365),
            valorMensual=Decimal('100000.00'),
        )
        services.generar_meses(self.contrato)

    def test_aumento_porcentaje_fijo(self):
        services.aplicar_aumento(
            self.contrato,
            tipo_aumento='porcentaje_fijo',
            porcentaje=Decimal('10'),
        )
        # Verificar que se aplicó a meses futuros (último mes)
        em = self.contrato.meses.last()
        self.assertEqual(em.montoFinal, Decimal('110000.00'))

    def test_aumento_es_acumulativo(self):
        services.aplicar_aumento(self.contrato, 'porcentaje_fijo', Decimal('10'))
        services.aplicar_aumento(self.contrato, 'porcentaje_fijo', Decimal('10'))
        em = self.contrato.meses.last()
        # El segundo aumento se aplica sobre el monto ya ajustado.
        self.assertEqual(em.montoFinal, Decimal('121000.00'))

    def test_aplica_segundo_aumento_en_meses_posteriores(self):
        hoy = date.today()
        mes_actual = self.contrato.meses.get(anio=hoy.year, mes=hoy.month - 1)
        siguiente_mes = mes_actual.mes + 1
        siguiente_anio = mes_actual.anio
        if siguiente_mes > 11:
            siguiente_mes = 0
            siguiente_anio += 1

        services.aplicar_aumento(
            self.contrato,
            tipo_aumento='porcentaje_fijo',
            porcentaje=Decimal('10'),
            mes_desde=mes_actual.mes + 1,
            anio_desde=mes_actual.anio,
        )
        services.aplicar_aumento(
            self.contrato,
            tipo_aumento='porcentaje_fijo',
            porcentaje=Decimal('10'),
            mes_desde=siguiente_mes + 1,
            anio_desde=siguiente_anio,
        )

        affected = self.contrato.meses.filter(
            anio=siguiente_anio,
            mes=siguiente_mes,
        ).first()
        self.assertEqual(affected.montoFinal, Decimal('121000.00'))

    def test_no_aplica_a_meses_pagados(self):
        em = self.contrato.meses.first()
        em.estado = EstadoPago.PAGADO
        em.montoFinal = Decimal('100000.00')
        em.save()
        services.aplicar_aumento(self.contrato, 'porcentaje_fijo', Decimal('10'))
        em.refresh_from_db()
        self.assertEqual(em.montoFinal, Decimal('100000.00'))

    def test_no_aplica_a_meses_pasados_pendientes(self):
        # El primer mes es pasado, debería no aplicarse
        em_pasado = self.contrato.meses.first()
        monto_original = em_pasado.montoFinal
        services.aplicar_aumento(self.contrato, 'porcentaje_fijo', Decimal('10'))
        em_pasado.refresh_from_db()
        self.assertEqual(em_pasado.montoFinal, monto_original)

    def test_aplica_aumento_a_mes_actual(self):
        hoy = date.today()
        em_actual = self.contrato.meses.get(anio=hoy.year, mes=hoy.month - 1)
        monto_original_actual = em_actual.montoFinal

        services.aplicar_aumento(self.contrato, 'porcentaje_fijo', Decimal('10'))

        em_actual.refresh_from_db()
        self.assertEqual(em_actual.montoFinal, Decimal('110000.00'))
        self.assertNotEqual(em_actual.montoFinal, monto_original_actual)

    def test_crea_registro_aumento_mensual(self):
        services.aplicar_aumento(self.contrato, 'porcentaje_fijo', Decimal('5'))
        self.assertEqual(AumentoMensual.objects.filter(
            estadoMensual__contrato=self.contrato
        ).count(), 13)


class AplicarMoraTest(TestCase):

    def setUp(self):
        hoy = date.today()
        self.contrato = crear_contrato(
            fechaInicio=date(hoy.year, hoy.month, 1) - timedelta(days=90),
            fechaFin=date(hoy.year, hoy.month, 1) + timedelta(days=365),
            diaPago=1,
            valorInteresMora=Decimal('5'),
        )
        services.generar_meses(self.contrato)

    def test_sin_valorInteresMora_devuelve_vacio(self):
        self.contrato.valorInteresMora = None
        self.contrato.save()
        resultados = services.aplicar_mora(self.contrato)
        self.assertEqual(resultados, [])

    def test_aplica_mora_a_meses_pasados(self):
        resultados = services.aplicar_mora(self.contrato)
        self.assertGreater(len(resultados), 0)


# ── Tests de API (endpoints) ──────────────────────────────────────────────────

class ContratoAPITest(APITestCase):

    def _payload_base(self, **kwargs):
        hoy = date.today()
        data = {
            'pais': 'Argentina',
            'provincia': 'Córdoba',
            'localidad': 'Villa María',
            'tipoPropiedad': 'casa',
            'inquilinoNombre': 'Pedro Ramírez',
            'inquilinoDni': '99887766',
            'propietarioNombre': 'Ana López',
            'propietarioDni': '66778899',
            'propietarioNombreCompleto': 'Ana López de García',
            'propietarioEmail': 'ana@test.com',
            'valorMensual': '200000.00',
            'monedaMensual': 'ARS',
            'fechaInicio': str(hoy.replace(day=1)),
            'fechaFin': str((hoy.replace(day=1) + timedelta(days=365))),
            'diaPago': 15,
            'valorConceptosExtras': '1500.00',
        }
        data.update(kwargs)
        return data

    def test_crear_contrato(self):
        url  = reverse('contrato-list')
        resp = self.client.post(url, self._payload_base(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Contrato.objects.count(), 1)

    def test_guardar_valor_conceptos_extras(self):
        url  = reverse('contrato-list')
        resp = self.client.post(url, self._payload_base(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        contrato = Contrato.objects.first()
        self.assertEqual(contrato.valorConceptosExtras, Decimal('1500.00'))

    def test_crear_genera_meses_automaticamente(self):
        url = reverse('contrato-list')
        self.client.post(url, self._payload_base(), format='json')
        c = Contrato.objects.first()
        self.assertGreater(c.meses.count(), 0)

    def test_listar_contratos(self):
        crear_contrato()
        url  = reverse('contrato-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_detalle_contrato(self):
        c    = crear_contrato()
        url  = reverse('contrato-detail', args=[c.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['inquilinoNombre'], c.inquilinoNombre)

    def test_soft_delete(self):
        c    = crear_contrato()
        url  = reverse('contrato-detail', args=[c.pk])
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        c.refresh_from_db()
        self.assertTrue(c.eliminado)

    def test_filtro_por_estado_activo(self):
        crear_contrato()
        hoy = date.today()
        crear_contrato(
            inquilinoDni='00000001',
            fechaInicio=hoy - timedelta(days=400),
            fechaFin=hoy - timedelta(days=1),
        )
        url  = reverse('contrato-list') + '?estado=vencido'
        resp = self.client.get(url)
        self.assertEqual(resp.data['count'], 1)

    def test_dni_duplicado_rechazado(self):
        crear_contrato(inquilinoDni='55555555')
        url  = reverse('contrato-list')
        resp = self.client.post(url, self._payload_base(inquilinoDni='55555555'), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fecha_fin_menor_que_inicio(self):
        url  = reverse('contrato-list')
        hoy  = date.today()
        resp = self.client.post(url, self._payload_base(
            fechaInicio=str(hoy),
            fechaFin=str(hoy - timedelta(days=1)),
        ), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_actualizar_estado_mes(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 3, 31),
        )
        services.generar_meses(c)
        em  = c.meses.first()
        url = reverse('contrato-actualizar-estado-mes', args=[c.pk, em.mes, em.anio])
        resp = self.client.put(url, {'estado': 'pagado'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        em.refresh_from_db()
        self.assertEqual(em.estado, EstadoPago.PAGADO)

    def test_resumen_financiero(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 6, 30),
        )
        services.generar_meses(c)
        url  = reverse('contrato-resumen-financiero', args=[c.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('montoBaseMensual', resp.data)
        self.assertIn('estadoPagos', resp.data)
        self.assertIn('deuda', resp.data)

    def test_confirmar_aumento_porcentaje_fijo(self):
        c = crear_contrato(
            fechaInicio=date(2026, 5, 1),
            fechaFin=date(2026, 7, 31),
        )
        services.generar_meses(c)
        url  = reverse('contrato-confirmar-aumento', args=[c.pk])
        resp = self.client.post(url, {
            'tipoAumento': 'porcentaje_fijo',
            'porcentajeAumento': '10.0000',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        em = c.meses.first()
        self.assertEqual(em.montoFinal, Decimal('110000.00'))

    @patch('contratos.views.obtener_indice')
    def test_aplicar_aumento_ipc_usa_api_externa(self, mock_indice):
        mock_indice.return_value = {'tipo': 'IPC', 'valor': 10.0, 'anterior': 9.3, 'fecha': '2026-03', 'raw': {}}
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 3, 31),
            valorMensual=Decimal('100000.00'),
        )
        services.generar_meses(c)

        url = reverse('contrato-aplicar-aumento', args=[c.pk])
        resp = self.client.post(url, {'tipoAumento': 'IPC'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['porcentajeSugerido'], '10.0')
        self.assertEqual(resp.data['indiceAnterior'], '9.3')

    def test_aplicar_aumento_monto_fijo(self):
        c = crear_contrato(
            fechaInicio=date(2024, 1, 1),
            fechaFin=date(2024, 3, 31),
            valorMensual=Decimal('100000.00'),
        )
        services.generar_meses(c)
        url = reverse('contrato-aplicar-aumento', args=[c.pk])
        resp = self.client.post(url, {'tipoAumento': 'monto_fijo', 'montoFijo': '1000.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['nuevoMonto'], '101000.00')

    def test_mes_inicio_coincide_con_fecha_inicio(self):
        """El primer EstadoMensual debe coincidir con el mes y año de fechaInicio, sin importar el día."""
        c = crear_contrato(
            fechaInicio=date(2025, 12, 31),
            fechaFin=date(2026, 3, 31),
        )
        services.generar_meses(c, sobreescribir=True)
        primer_mes = c.meses.order_by('anio', 'mes').first()
        self.assertIsNotNone(primer_mes)
        self.assertEqual(primer_mes.mes, 11)  # diciembre = 11
        self.assertEqual(primer_mes.anio, 2025)

