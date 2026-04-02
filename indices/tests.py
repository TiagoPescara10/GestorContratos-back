from unittest.mock import patch, Mock

from django.test import TestCase

from .client import obtener_indice


class IndiceClientTest(TestCase):

    @patch('indices.client.requests.get')
    def test_obtener_indice_ipc_data_indice_ipc(self, mock_get):
        mock_resp = Mock()
        mock_resp.json.return_value = {
            'data': {
                'indice_ipc': 8.75,
                'anterior': 8.10,
                'fecha': '2026-03',
            }
        }
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        res = obtener_indice('IPC')

        self.assertEqual(res['tipo'], 'IPC')
        self.assertEqual(res['valor'], 8.75)
        self.assertEqual(res['anterior'], 8.1)
        self.assertEqual(res['fecha'], '2026-03')

    @patch('indices.client.requests.get')
    def test_obtener_indice_icl_data_valor(self, mock_get):
        mock_resp = Mock()
        mock_resp.json.return_value = {
            'data': {
                'valor': 3.14,
                'anterior': 3.05,
                'fecha': '2026-03',
            }
        }
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        res = obtener_indice('ICL')

        self.assertEqual(res['tipo'], 'ICL')
        self.assertEqual(res['valor'], 3.14)
        self.assertEqual(res['anterior'], 3.05)
        self.assertEqual(res['fecha'], '2026-03')
