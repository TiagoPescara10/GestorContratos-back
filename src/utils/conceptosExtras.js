// Versión para formularios: precio almacenado como "" (string vacío para inputs editables).
// Usada por DetalleContrato.jsx y FormContrato.jsx.
export const normalizarConceptosExtras = (conceptosExtras = []) => {
  if (!Array.isArray(conceptosExtras)) {
    return [];
  }

  return conceptosExtras
    .map((item) => {
      if (typeof item === "string") {
        return { nombre: item, precio: "" };
      }

      if (item && typeof item === "object" && item.nombre) {
        return {
          nombre: item.nombre,
          precio: item.precio ?? "",
        };
      }

      return null;
    })
    .filter(Boolean);
};

// Versión para display: precio almacenado como Number (para cálculos de Dashboard/Pendientes).
// Usada por Dashboard.jsx y Pendientes.jsx (importar con alias normalizarConceptosExtras).
export const normalizarConceptosExtrasDisplay = (conceptosExtras = []) => {
  if (!Array.isArray(conceptosExtras)) {
    return [];
  }

  return conceptosExtras
    .map((item) => {
      if (typeof item === "string") {
        return { nombre: item, precio: 0 };
      }

      if (item && typeof item === "object" && item.nombre) {
        return {
          nombre: item.nombre,
          precio: Number(item.precio || 0),
        };
      }

      return null;
    })
    .filter(Boolean);
};

// Versión para formularios: recibe el array ya normalizado.
// Usada por DetalleContrato.jsx y FormContrato.jsx.
export const calcularTotalConceptosExtras = (conceptosExtras = []) => (
  conceptosExtras.reduce((total, item) => total + Number(item?.precio || 0), 0)
);

// Versión para display: recibe el objeto contrato completo, con fallback a valorConceptosExtras.
// Usada por Dashboard.jsx y Pendientes.jsx (importar con alias calcularTotalConceptosExtras).
export const calcularTotalConceptosExtrasContrato = (contrato) => {
  const conceptosExtras = normalizarConceptosExtrasDisplay(contrato.conceptosExtras);

  if (conceptosExtras.length > 0) {
    return conceptosExtras.reduce((total, item) => total + Number(item.precio || 0), 0);
  }

  return Number(contrato.valorConceptosExtras || 0);
};

// Versión para DetalleContrato: recibe aplicaIva como booleano ya resuelto.
export const calcularMontoIva = (alquilerPuro, aplicaIva) => {
  if (!aplicaIva) {
    return 0;
  }

  return Number(alquilerPuro || 0) * 0.21;
};

// Versión para Dashboard/Pendientes: recibe el objeto contrato y resuelve aplicaIva internamente.
// Usada por Dashboard.jsx y Pendientes.jsx (importar con alias calcularMontoIva).
export const calcularMontoIvaContrato = (alquilerBase, contrato) => {
  const aplicaIva = Boolean(contrato.incluye_iva ?? contrato.iva);

  if (!aplicaIva) {
    return 0;
  }

  return Number(alquilerBase || 0) * 0.21;
};
