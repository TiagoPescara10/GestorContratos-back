const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizarTipoInteresMora = (tipoInteresMora) => {
  const valor = (tipoInteresMora || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!valor) {
    return "";
  }

  if (valor.includes("fij") || valor.includes("monto")) {
    return "fijo";
  }

  if (valor.includes("porc") || valor.includes("%")) {
    return "porcentaje";
  }

  return valor;
};

const obtenerFechaVencimiento = (mes, diaPago) => {
  const diaPagoNumero = Number(diaPago);
  if (!diaPagoNumero || Number.isNaN(diaPagoNumero)) {
    return null;
  }

  const ultimoDiaMes = new Date(mes.año, mes.mes + 1, 0).getDate();
  const diaVencimiento = Math.min(diaPagoNumero, ultimoDiaMes);

  return new Date(mes.año, mes.mes, diaVencimiento);
};

export const calcularDiasAtraso = (mes, diaPago, fechaReferencia = new Date()) => {
  const fechaVencimiento = obtenerFechaVencimiento(mes, diaPago);
  if (!fechaVencimiento) {
    return 0;
  }

  const hoy = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth(),
    fechaReferencia.getDate()
  );

  if (hoy <= fechaVencimiento) {
    return 0;
  }

  return Math.floor((hoy - fechaVencimiento) / MS_PER_DAY);
};

export const calcularRecargoMora = ({
  mes,
  estado,
  diaPago,
  tipoInteresMora,
  valorInteresMora,
  montoBase,
  fechaReferencia = new Date(),
}) => {
  if (estado === "pagado") {
    return { diasAtraso: 0, recargo: 0 };
  }

  const diasAtraso = calcularDiasAtraso(mes, diaPago, fechaReferencia);
  if (diasAtraso <= 0) {
    return { diasAtraso: 0, recargo: 0 };
  }

  const valor = Number(valorInteresMora || 0);
  if (!valor || Number.isNaN(valor)) {
    return { diasAtraso, recargo: 0 };
  }

  const base = Number(montoBase || 0);
  if (!base || Number.isNaN(base)) {
    return { diasAtraso, recargo: 0 };
  }

  if (normalizarTipoInteresMora(tipoInteresMora) === "fijo") {
    return {
      diasAtraso,
      recargo: diasAtraso * valor,
    };
  }

  return {
    diasAtraso,
    recargo: base * ((valor / 100) * diasAtraso),
  };
};

export const verificarRecargo = (mes, mesKey, diaPago, estadosMeses) => {
  const estado = estadosMeses[mesKey];

  if (estado === "pagado") return false;

  return calcularDiasAtraso(mes, diaPago) > 0;
};