#!/usr/bin/env python
"""
Script de migración: importa contratos desde un JSON exportado de localStorage.

Uso:
    python importar_desde_localstorage.py contratos.json [--dry-run]

El archivo JSON debe ser el valor de la clave de localStorage, es decir,
una lista de objetos contrato o un dict { "contratos": [...] }.

Ejemplo de exportación desde el navegador:
    JSON.stringify(JSON.parse(localStorage.getItem('contratos')))

Ejecutar desde la raíz del proyecto con el virtualenv activo:
    cd gestor_contratos
    python scripts/importar_desde_localstorage.py ../contratos_export.json
"""
import os
import sys
import json
import argparse
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

# Configurar Django
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.db import transaction
from contratos.models import Contrato, EstadoPago
from contratos import services


# ── Mapeo de campos localStorage → modelo Django ──────────────────────────────
# Ajustar según los nombres reales que use tu app React.

CAMPO_MAP = {
    # Propiedad
    'pais':                      'pais',
    'provincia':                 'provincia',
    'localidad':                 'localidad',
    'codigoPostal':              'codigoPostal',
    'tipoPropiedad':             'tipoPropiedad',
    # Inquilino
    'inquilinoNombre':           'inquilinoNombre',
    'inquilinoDni':              'inquilinoDni',
    'inquilinoTelefono':         'inquilinoTelefono',
    # Propietario
    'propietarioNombre':         'propietarioNombre',
    'propietarioDni':            'propietarioDni',
    'propietarioTelefono':       'propietarioTelefono',
    'propietarioCbu':            'propietarioCbu',
    'propietarioNombreCompleto': 'propietarioNombreCompleto',
    'propietarioCobraEn':        'propietarioCobraEn',
    'propietarioCondicionFiscal':'propietarioCondicionFiscal',
    'propietarioEmail':          'propietarioEmail',
    'propietarioAlias':          'propietarioAlias',
    'propietarioNecesitaFactura':'propietarioNecesitaFactura',
    'propietarioCuit':           'propietarioCuit',
    # Garante
    'garanteNombre':             'garanteNombre',
    'garanteDni':                'garanteDni',
    'garanteTelefono':           'garanteTelefono',
    'garanteDocumentoTipo':      'garanteDocumentoTipo',
    'garanteDocumentoArchivo':   'garanteDocumentoArchivo',
    # Financiero
    'valorMensual':              'valorMensual',
    'monedaMensual':             'monedaMensual',
    'valorDeposito':             'valorDeposito',
    'monedaDeposito':            'monedaDeposito',
    'honorarios':                'honorarios',
    'tipoInteresMora':           'tipoInteresMora',
    'valorInteresMora':          'valorInteresMora',
    # Temporal
    'fechaInicio':               'fechaInicio',
    'fechaFin':                  'fechaFin',
    'diaPago':                   'diaPago',
    # Ajustes
    'frecuenciaAumento':         'frecuenciaAumento',
    'tipoAumento':               'tipoAumento',
    # Extras
    'conceptosExtras':           'conceptosExtras',
}


def parsear_decimal(valor) -> Decimal | None:
    if valor is None or valor == '':
        return None
    try:
        return Decimal(str(valor))
    except InvalidOperation:
        return None


def parsear_fecha(valor) -> str | None:
    """Acepta YYYY-MM-DD, DD/MM/YYYY o timestamps epoch (ms)."""
    if not valor:
        return None
    if isinstance(valor, (int, float)):
        # Timestamp en milisegundos (JS Date.getTime())
        return datetime.fromtimestamp(valor / 1000).strftime('%Y-%m-%d')
    valor = str(valor).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(valor, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    print(f"  ⚠️  No se pudo parsear fecha: {valor!r}")
    return None


def transformar_contrato(raw: dict) -> dict:
    """Transforma un objeto raw de localStorage al formato esperado por el modelo."""
    data = {}
    for src, dst in CAMPO_MAP.items():
        if src in raw:
            data[dst] = raw[src]

    # Conversiones de tipo
    for campo in ('valorMensual', 'valorDeposito', 'honorarios', 'valorInteresMora'):
        if campo in data:
            data[campo] = parsear_decimal(data[campo])

    for campo in ('fechaInicio', 'fechaFin'):
        if campo in data:
            data[campo] = parsear_fecha(data[campo])

    if 'diaPago' in data:
        try:
            data['diaPago'] = int(data['diaPago'])
        except (ValueError, TypeError):
            data['diaPago'] = 1

    if 'propietarioNecesitaFactura' in data:
        v = data['propietarioNecesitaFactura']
        data['propietarioNecesitaFactura'] = bool(v) if not isinstance(v, str) else v.lower() == 'true'

    if 'conceptosExtras' in data and not isinstance(data['conceptosExtras'], list):
        data['conceptosExtras'] = []

    # Defaults obligatorios
    data.setdefault('pais', 'Argentina')
    data.setdefault('monedaMensual', 'ARS')
    data.setdefault('conceptosExtras', [])
    data.setdefault('propietarioNombreCompleto', data.get('propietarioNombre', ''))
    data.setdefault('propietarioEmail', 'sin-email@migrado.local')

    return data


def importar(ruta_json: str, dry_run: bool = False):
    with open(ruta_json, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    # Puede ser lista directa o { "contratos": [...] }
    if isinstance(raw_data, dict):
        contratos_raw = raw_data.get('contratos') or list(raw_data.values())[0]
    else:
        contratos_raw = raw_data

    print(f"📂 {len(contratos_raw)} contratos encontrados en el archivo.")
    if dry_run:
        print("🔍 Modo dry-run activado — no se guardará nada.\n")

    ok = errores = omitidos = 0

    for i, raw in enumerate(contratos_raw, 1):
        try:
            data = transformar_contrato(raw)
        except Exception as exc:
            print(f"  [{i}] ❌ Error transformando: {exc}")
            errores += 1
            continue

        # Validaciones mínimas
        if not data.get('fechaInicio') or not data.get('fechaFin'):
            print(f"  [{i}] ⏭  Omitido — fechas inválidas: {raw.get('inquilinoNombre', '?')}")
            omitidos += 1
            continue
        if not data.get('valorMensual'):
            print(f"  [{i}] ⏭  Omitido — valorMensual inválido: {raw.get('inquilinoNombre', '?')}")
            omitidos += 1
            continue

        # Verificar duplicado por DNI inquilino
        dni = data.get('inquilinoDni', '')
        if dni and Contrato.objects.filter(inquilinoDni=dni, eliminado=False).exists():
            print(f"  [{i}] ⏭  Omitido — DNI duplicado: {dni}")
            omitidos += 1
            continue

        if dry_run:
            print(f"  [{i}] ✅ (dry) {data.get('inquilinoNombre')} — {data.get('localidad')}")
            ok += 1
            continue

        try:
            with transaction.atomic():
                contrato = Contrato.objects.create(**data)
                meses_creados = services.generar_meses(contrato)
                print(f"  [{i}] ✅ #{contrato.pk} {contrato.inquilinoNombre} "
                      f"({len(meses_creados)} meses generados)")
                ok += 1
        except Exception as exc:
            print(f"  [{i}] ❌ Error guardando '{data.get('inquilinoNombre', '?')}': {exc}")
            errores += 1

    print(f"\n{'─'*50}")
    print(f"✅ Importados: {ok}  |  ⏭  Omitidos: {omitidos}  |  ❌ Errores: {errores}")
    if dry_run:
        print("🔍 Dry-run finalizado — ningún registro fue guardado.")


def main():
    parser = argparse.ArgumentParser(description='Importar contratos desde localStorage JSON')
    parser.add_argument('archivo', help='Ruta al archivo JSON exportado de localStorage')
    parser.add_argument('--dry-run', action='store_true',
                        help='Simula la importación sin guardar en base de datos')
    args = parser.parse_args()

    if not Path(args.archivo).exists():
        print(f"❌ Archivo no encontrado: {args.archivo}")
        sys.exit(1)

    importar(args.archivo, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
