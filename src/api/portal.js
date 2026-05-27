import { api } from './client';

// ── Acceso público (sin auth) ────────────────────────────────────────────────

export const getPortalPublico = (token) =>
  api.get(`portal/${token}/`);

export const getPortalMes = (token, mes, anio) =>
  api.get(`portal/${token}/${mes}/${anio}/`);

export const subirComprobante = (token, mes, anio, archivo) => {
  const formData = new FormData();
  formData.append('comprobante', archivo);
  return api.post(`portal/${token}/comprobante/${mes}/${anio}/`, formData);
};

// ── Admin (requiere JWT) ─────────────────────────────────────────────────────

export const getPortales = () =>
  api.get('portales/');

export const getPortalInfo = (contratoId) =>
  api.get(`contratos/${contratoId}/portal/`);

export const activarPortal = (contratoId) =>
  api.post(`contratos/${contratoId}/portal/activar/`, {});

export const desactivarPortal = (contratoId) =>
  api.delete(`contratos/${contratoId}/portal/desactivar/`);

export const marcarRevisado = (token, mes, anio) =>
  api.patch(`portales/${token}/comprobante/${mes}/${anio}/revisar/`, {});

export const marcarPagado = (contratoId, mes, anio) =>
  api.put(`contratos/${contratoId}/meses/${mes}-${anio}/estado/`, { estado: 'pagado' });
