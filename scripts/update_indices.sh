#!/bin/bash
# Script para actualizar índices automáticamente en Render
# Este script se ejecutará via cron jobs

echo "=== Actualizando IPC ==="
python manage.py cargar_ipc

echo "=== Actualizando ICL ==="
python manage.py cargar_icl

echo "=== Actualización completada $(date) ==="
