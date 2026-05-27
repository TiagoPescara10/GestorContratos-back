export function eliminarContratoPorId(id) {
  const contratos = JSON.parse(localStorage.getItem("contratos")) || [];

  const nuevosContratos = contratos.filter(
    (ct) => String(ct.id) !== String(id)
  );

  localStorage.setItem("contratos", JSON.stringify(nuevosContratos));
}