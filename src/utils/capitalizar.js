const capitalizar = (texto) => {
  if (!texto) return "-";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export default capitalizar;