const formatearMonto = (monto) => {
  if (!monto) return "-";
  return (Math.ceil(Number(monto) / 100) * 100).toLocaleString("es-AR");
};

export default formatearMonto;