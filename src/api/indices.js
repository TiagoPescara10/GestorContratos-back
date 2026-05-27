import { api } from './client';

const _cache = {};

export const getIndiceIPC = async () => {
  if (_cache.ipc) return _cache.ipc;
  _cache.ipc = await api.get('indices/ipc/');
  return _cache.ipc;
};

export const getIndiceICL = async () => {
  if (_cache.icl) return _cache.icl;
  _cache.icl = await api.get('indices/icl/');
  return _cache.icl;
};

export const getIndiceICLHistorico = async () => {
  if (_cache.iclHistorico) return _cache.iclHistorico;
  _cache.iclHistorico = await api.get('indices/icl-historico/');
  return _cache.iclHistorico;
};

export const getIndiceCasaPropia = async () => {
  if (_cache.casaPropia) return _cache.casaPropia;
  _cache.casaPropia = await api.get('indices/casa-propia/');
  return _cache.casaPropia;
};

export const getIndiceCP = async () => {
  if (_cache.casaPropia) return _cache.casaPropia;
  _cache.casaPropia = await api.get('indices/casa-propia/');
  return _cache.casaPropia;
};

export const getHistorialIndices = async () => {
  return api.get('indices/historial/');
};

export const obtenerIndice = async (tipoAjuste, valorFijo = null) => {
  if (!tipoAjuste) return null;

  const tipo = String(tipoAjuste).toUpperCase();

  if (tipo === 'IPC') {
    const data = await getIndiceIPC();
    return data?.valor ?? null;
  }

  if (tipo === 'ICL') {
    const data = await getIndiceICL();
    return data?.valor ?? null;
  }

  if (tipo === 'CASA_PROPIA' || tipo === 'CASA' || tipo === 'CASA PROPIA') {
    const data = await getIndiceCasaPropia();
    if (data && data.valor != null) {
      return data.valor;
    }
    // Si no existe endpoint, devolvemos null para manejar en UI.
    return null;
  }

  if (tipo === 'FIJO') {
    return Number(valorFijo) || null;
  }

  return null;
};

