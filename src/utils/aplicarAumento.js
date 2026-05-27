export const calcularAumento = (monto, tipoAjuste, indice, meses = 1) => {
  const tipo = (tipoAjuste || "").toLowerCase();

  if (tipo === "icl") {
    const iclMensual = indice / 12;
    return monto * (1 + (iclMensual / 100) * meses);
  }

  if (tipo === "ipc" || tipo === "casa_propia" || tipo === "porcentaje_fijo" || tipo === "fijo") {
    return monto * Math.pow(1 + indice / 100, meses);
  }

  if (tipo === "monto_fijo") {
    return monto + indice;
  }

  return monto;
};