import { api } from './client';

export const getContratos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const path = `contratos/${query ? `?${query}` : ''}`;
  return api.get(path);
};

export const getContrato = async (id) => {
  return api.get(`contratos/${id}/`);
};

export const createContrato = async (contrato) => {
  if (contrato instanceof FormData) {
    return api.post('contratos/', contrato);
  }
  const payload = { ...contrato };
  delete payload.id;
  return api.post('contratos/', payload);
};

export const recalcularMontos = async (id) => {
  return api.post(`contratos/${id}/recalcular-montos/`, {});
};

export const updateContrato = async (id, contrato) => {
  if (contrato instanceof FormData) {
    return api.put(`contratos/${id}/`, contrato);
  }
  const payload = { ...contrato };
  delete payload.id;
  return api.put(`contratos/${id}/`, payload);
};

export const patchContrato = async (id, contrato) => {
  const payload = { ...contrato };
  delete payload.id;
  return api.patch(`contratos/${id}/`, payload);
};

export const deleteContrato = async (id) => {
  return api.delete(`contratos/${id}/`);
};

export const getMeses = async (id) => {
  return api.get(`contratos/${id}/meses/`);
};

export const updateMesEstado = async (id, mes, anio, estado) => {
  return api.put(`contratos/${id}/meses/${mes}-${anio}/estado/`, { estado });
};

export const aplicarAumento = async (id, body = {}) => {
  return api.post(`contratos/${id}/aplicar-aumento/`, body);
};

export const confirmarAumento = async (id, body = {}) => {
  return api.post(`contratos/${id}/confirmar-aumento/`, body);
};

export const aplicarAumentoMora = async (id, body = {}) => {
  return api.post(`contratos/${id}/aplicar-aumento-mora/`, body);
};

export const getResumenFinanciero = async (id) => {
  return api.get(`contratos/${id}/resumen-financiero/`);
};

export const buscarContratos = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return api.get(`contratos/buscar/?${query}`);
};
