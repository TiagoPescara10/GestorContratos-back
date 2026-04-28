import re
import subprocess
import tempfile
import requests

from django.core.management.base import BaseCommand

from indices.models import IndiceCP

PAGE_URL = "https://www.argentina.gob.ar/obras-publicas/coeficiente-casa-propia"

MESES_ES = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
}

# Patrón: "ene-25   1,0708   CVS   Casa Propia"
RE_FILA = re.compile(
    r'^([a-z]{3})-(\d{2})\s+([\d,]+)',
    re.IGNORECASE | re.MULTILINE,
)


def _obtener_url_pdf(stderr) -> str | None:
    """Busca el enlace al PDF actual en la página oficial."""
    try:
        resp = requests.get(PAGE_URL, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        stderr.write(f"Error al acceder a la página: {exc}")
        return None

    match = re.search(
        r'https://www\.argentina\.gob\.ar/sites/default/files/coeficiente_de_actualizacion[^"\']+\.pdf',
        resp.text,
    )
    if not match:
        stderr.write("No se encontró enlace al PDF en la página.")
        stderr.write("Posible cambio en el sitio — revisá manualmente: " + PAGE_URL)
        return None
    return match.group(0)


def _descargar_y_parsear(pdf_url: str, stderr) -> list[tuple[int, int, float]]:
    """Descarga el PDF, extrae texto con pdftotext y parsea las filas."""
    try:
        resp = requests.get(pdf_url, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        stderr.write(f"Error al descargar el PDF: {exc}")
        return []

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name

    try:
        resultado = subprocess.run(
            ["pdftotext", tmp_path, "-"],
            capture_output=True, text=True, timeout=30,
        )
    except Exception as exc:
        stderr.write(f"Error al ejecutar pdftotext: {exc}")
        return []

    datos = []
    for match in RE_FILA.finditer(resultado.stdout):
        mes_str, anio_str, nivel_str = match.groups()
        mes = MESES_ES.get(mes_str.lower())
        if mes is None:
            continue
        anio = 2000 + int(anio_str)
        nivel = round(float(nivel_str.replace(',', '.')), 4)
        datos.append((anio, mes, nivel))

    return datos


class Command(BaseCommand):
    help = "Carga el Índice Casa Propia desde el PDF oficial (argentina.gob.ar)."

    def handle(self, *args, **options):
        self.stdout.write("Buscando PDF en " + PAGE_URL)

        pdf_url = _obtener_url_pdf(self.stderr)
        if not pdf_url:
            return
        self.stdout.write(f"PDF encontrado: {pdf_url}")

        datos = _descargar_y_parsear(pdf_url, self.stderr)
        if not datos:
            self.stderr.write("No se pudieron parsear datos del PDF.")
            return

        self.stdout.write(f"{len(datos)} registros extraídos del PDF.")

        creados = actualizados = omitidos = 0
        for anio, mes, nivel in datos:
            obj, created = IndiceCP.objects.get_or_create(
                anio=anio,
                mes=mes,
                defaults={"nivel": nivel},
            )
            if created:
                creados += 1
                self.stdout.write(f"  ✅ {anio}/{mes:02d}: {nivel}")
            elif float(obj.nivel) != nivel:
                obj.nivel = nivel
                obj.save()
                actualizados += 1
                self.stdout.write(f"  🔄 {anio}/{mes:02d}: {nivel} (actualizado)")
            else:
                omitidos += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nListo. Creados: {creados} | Actualizados: {actualizados} | Ya existían: {omitidos}"
        ))
