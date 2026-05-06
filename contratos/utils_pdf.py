import os
from io import BytesIO
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, Image
)
from reportlab.lib.colors import HexColor, black

MESES_ES = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
    5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
    9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
}

COLOR_GRIS = HexColor("#444444")
COLOR_LINEA = HexColor("#aaaaaa")

LOGO_PATH = os.path.join(os.path.dirname(__file__), '..', 'logo-inmobiliaria-recibo.jpg')


def _get_styles():
    return {
        "subtitulo": ParagraphStyle(
            "subtitulo", fontName="Helvetica", fontSize=9,
            textColor=COLOR_GRIS, alignment=TA_CENTER, leading=13, spaceAfter=0
        ),
        "cuerpo": ParagraphStyle(
            "cuerpo", fontName="Helvetica", fontSize=10,
            textColor=black, leading=15, spaceAfter=6, alignment=TA_LEFT
        ),
        "celda_izq": ParagraphStyle(
            "celda_izq", fontName="Helvetica", fontSize=10,
            textColor=black, leading=13
        ),
        "celda_der": ParagraphStyle(
            "celda_der", fontName="Helvetica", fontSize=10,
            textColor=black, leading=13, alignment=TA_RIGHT
        ),
        "celda_izq_bold": ParagraphStyle(
            "celda_izq_bold", fontName="Helvetica-Bold", fontSize=10,
            textColor=black, leading=13
        ),
        "celda_der_bold": ParagraphStyle(
            "celda_der_bold", fontName="Helvetica-Bold", fontSize=10,
            textColor=black, leading=13, alignment=TA_RIGHT
        ),
        "firma": ParagraphStyle(
            "firma", fontName="Helvetica-Bold", fontSize=10,
            textColor=black, alignment=TA_LEFT, spaceBefore=6
        ),
    }


def _formatear_monto(monto):
    monto = Decimal(str(monto))
    entero = int(monto)
    centavos = int((monto - entero) * 100)
    entero_fmt = f"{entero:,}".replace(",", ".")
    return f"$ {entero_fmt},{centavos:02d}"


def _build_header(story, styles):
    if os.path.exists(LOGO_PATH):
        LOGO_W = 3.5 * inch
        LOGO_RATIO = 316 / 711
        logo = Image(LOGO_PATH, width=LOGO_W, height=LOGO_W * LOGO_RATIO)
        logo.hAlign = "LEFT"
        story.append(logo)
        story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph(
        "Martires Riocuartenses N° 1395 – X5800 – Rio Cuarto – Córdoba.",
        styles["subtitulo"]
    ))
    story.append(Paragraph(
        "9 de Julio Nº 483-x6125-Serrano-Córdoba.",
        styles["subtitulo"]
    ))
    story.append(Paragraph(
        "Tel: 358 4864404 o 3385 465877 - E-Mail: inmobiliariagiordanoconti@gmail.com",
        styles["subtitulo"]
    ))
    story.append(Spacer(1, 0.4 * cm))


def _build_intro(story, styles, contrato, monto_alquiler, mes_nombre, anio):
    try:
        from utils.numero_a_letras import convertir_monto_a_letras
        monto_letras = convertir_monto_a_letras(monto_alquiler)
    except Exception:
        monto_letras = str(monto_alquiler)

    fecha_formateada = (
        f"{contrato.fechaInicio.day} DE "
        f"{MESES_ES[contrato.fechaInicio.month]} {contrato.fechaInicio.year}"
    )

    direccion_completa = contrato.direccion
    if contrato.piso and contrato.piso.strip() not in ('', '-'):
        direccion_completa += f" Piso {contrato.piso}"
    if contrato.departamento and contrato.departamento.strip() not in ('', '-'):
        direccion_completa += f" Dpto. {contrato.departamento}"

    texto = (
        f"Recibo del Sr./Sra. <b>{contrato.inquilinoNombre.upper()}</b>, "
        f"DNI Nº {contrato.inquilinoDni}, "
        f"TEL Nº {contrato.inquilinoTelefono}, "
        f"EMAIL {getattr(contrato, 'inquilinoEmail', '')}, "
        f"de la ciudad de {contrato.localidad}, provincia de {contrato.provincia} "
        f"la suma de pesos: {monto_letras} ({_formatear_monto(monto_alquiler)}), "
        f"por cuenta y orden de terceros, conforme contrato de locación con fecha {fecha_formateada}, "
        f"con relación al inmueble ubicado en {direccion_completa}, en concepto de:"
    )
    story.append(Paragraph(texto, styles["cuerpo"]))
    story.append(Spacer(1, 0.3 * cm))


def _build_lineas(story, styles, filas):
    PAGE_WIDTH = A4[0] - 5 * cm
    COL_LABEL = PAGE_WIDTH * 0.65
    COL_VALOR = PAGE_WIDTH * 0.35

    rows = []
    estilos = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (0, -1), 0),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 0),
    ]

    for i, fila in enumerate(filas):
        negrita = fila.get("negrita", False)
        s_izq = styles["celda_izq_bold"] if negrita else styles["celda_izq"]
        s_der = styles["celda_der_bold"] if negrita else styles["celda_der"]

        rows.append([
            Paragraph(fila["label"], s_izq),
            Paragraph(fila.get("valor", ""), s_der),
        ])

        if fila.get("separador_arriba"):
            estilos.append(("LINEABOVE", (0, i), (-1, i), 0.5, COLOR_LINEA))

    tabla = Table(rows, colWidths=[COL_LABEL, COL_VALOR])
    tabla.setStyle(TableStyle(estilos))
    story.append(tabla)
    story.append(Spacer(1, 0.4 * cm))


def _make_doc(buffer):
    return SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm
    )


def generar_recibo_inquilino_pdf(contrato, data):
    monto_alquiler = Decimal(str(data['montoAlquiler']))
    conceptos = list(contrato.conceptosExtras or []) or data.get('conceptosExtras') or []
    if conceptos:
        total_extras = sum(Decimal(str(item.get('precio', item.get('valor', 0)))) for item in conceptos)
    else:
        total_extras = Decimal(str(data.get('totalExtras') or 0))
    recargo_mora = Decimal(str(data.get('recargoMora') or 0))
    dias_atraso = data.get('diasAtraso') or 0
    valor_interes = Decimal(str(data.get('valorInteresMora') or 0))
    total_monto = (monto_alquiler + total_extras + recargo_mora).quantize(Decimal('0.01'))

    mes_nombre = data['mes'].upper()
    anio = data['anio']

    buffer = BytesIO()
    doc = _make_doc(buffer)
    styles = _get_styles()
    story = []

    _build_header(story, styles)
    _build_intro(story, styles, contrato, monto_alquiler, mes_nombre, anio)

    filas = [
        {"label": f"-ALQUILER {mes_nombre} {anio}", "valor": f"{_formatear_monto(monto_alquiler)}."},
    ]

    if conceptos:
        for item in conceptos:
            nombre = str(item.get('nombre', item.get('concepto', 'EXTRA'))).upper()
            valor = Decimal(str(item.get('precio', item.get('valor', 0))))
            if valor > 0:
                filas.append({"label": f"-{nombre}", "valor": f"{_formatear_monto(valor)}."})
            else:
                filas.append({"label": f"-{nombre}", "valor": "Abona la locataria."})
    elif total_extras > 0:
        filas.append({"label": "-EXPENSAS", "valor": f"{_formatear_monto(total_extras)}."})
    else:
        filas.append({"label": "-EXPENSAS", "valor": "Abona la locataria."})

    if recargo_mora > 0:
        filas.append({
            "label": f"-MORA ({dias_atraso} días x {valor_interes}%)",
            "valor": f"{_formatear_monto(recargo_mora)}."
        })

    filas.append({"label": "SUBTOTAL", "valor": f"{_formatear_monto(total_monto)}.", "separador_arriba": True, "negrita": True})
    filas.append({"label": "-DESCUENTO", "valor": ""})
    filas.append({"label": "TOTAL", "valor": f"{_formatear_monto(total_monto)}.", "negrita": True, "separador_arriba": True})

    _build_lineas(story, styles, filas)

    story.append(Paragraph(
        "Recibí Conforme: PAGO RECIBIDO MEDIANTE TRANSFERENCIA BANCARIA",
        styles["firma"]
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generar_recibo_propietario_pdf(contrato, data):
    monto_alquiler = Decimal(str(data['montoAlquiler']))
    honorarios_pct = Decimal(str(contrato.honorarios or 0))
    monto_honorarios = (monto_alquiler * honorarios_pct / 100).quantize(Decimal('0.01'))
    conceptos_calc = list(contrato.conceptosExtras or []) or data.get('conceptosExtras') or []
    total_extras_prop = sum(Decimal(str(c.get('precio', c.get('valor', 0)))) for c in conceptos_calc)
    subtotal = (monto_alquiler + total_extras_prop).quantize(Decimal('0.01'))
    total_propietario = (subtotal - monto_honorarios).quantize(Decimal('0.01'))

    mes_nombre = data['mes'].upper()
    anio = data['anio']

    buffer = BytesIO()
    doc = _make_doc(buffer)
    styles = _get_styles()
    story = []

    _build_header(story, styles)
    _build_intro(story, styles, contrato, monto_alquiler, mes_nombre, anio)

    conceptos_prop = list(contrato.conceptosExtras or []) or data.get('conceptosExtras') or []
    extras_normales = [c for c in conceptos_prop if str(c.get('nombre', '')).lower() not in ('emos', 'municipal')]
    item_emos      = next((c for c in conceptos_prop if str(c.get('nombre', '')).lower() == 'emos'), None)
    item_municipal = next((c for c in conceptos_prop if str(c.get('nombre', '')).lower() == 'municipal'), None)

    filas = [
        {"label": f"-ALQUILER {mes_nombre} {anio}", "valor": f"{_formatear_monto(monto_alquiler)}."},
    ]
    if extras_normales and (item_emos or item_municipal):
        filas.append({"label": "-EXPENSAS", "valor": "Paga Inquilino."})
    if item_emos:
        valor_emos = Decimal(str(item_emos.get('precio', item_emos.get('valor', 0))))
        filas.append({"label": "-EMOS", "valor": f"{_formatear_monto(valor_emos)}." if valor_emos > 0 else "Abona la locataria."})
    if item_municipal:
        valor_mun = Decimal(str(item_municipal.get('precio', item_municipal.get('valor', 0))))
        filas.append({"label": "-MUNICIPAL", "valor": f"{_formatear_monto(valor_mun)}." if valor_mun > 0 else "Abona la locataria."})
    filas += [
        {"label": "SUBTOTAL", "valor": f"{_formatear_monto(subtotal)}.", "separador_arriba": True, "negrita": True},
        {"label": f"-GTOS ADMINIST. {honorarios_pct}%", "valor": f"{_formatear_monto(monto_honorarios)}."},
        {"label": "TOTAL", "valor": f"{_formatear_monto(total_propietario)}.", "negrita": True, "separador_arriba": True},
    ]

    _build_lineas(story, styles, filas)

    story.append(Paragraph(
        "Recibí Conforme: PAGO REALIZADO MEDIANTE TRANSFERENCIA BANCARIA",
        styles["firma"]
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
