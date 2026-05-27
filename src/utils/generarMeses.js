import  capitalizar  from "./capitalizar";
export const generarMeses = (fechaInicio, fechaFin) => {
  const [añoInicio, mesInicio, diaInicio] = fechaInicio.split("-");
  const [añoFin, mesFin, diaFin] = fechaFin.split("-");

  const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
  const fin = new Date(añoFin, mesFin - 1, diaFin);

  const meses = [];

  let current = new Date(inicio);

  while (current <= fin) {
    const nombreMes = current.toLocaleString("es-AR", {
      month: "long",
    });

    meses.push({
      mes: current.getMonth(),
      año: current.getFullYear(),
      nombre: capitalizar(nombreMes),
    });

    current.setMonth(current.getMonth() + 1);
  }

  return meses;
};