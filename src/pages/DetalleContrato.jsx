import { useEffect, useReducer, lazy, Suspense, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Select,
  SimpleGrid,
  Badge,
  Button,
  Flex,
  Divider,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  useDisclosure,
  Icon,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  MdVisibility,
  MdEdit,
  MdDelete,
  MdAttachMoney,
  MdCalendarToday,
  MdTrendingUp,
  MdArrowBack
} from "react-icons/md";
import { FiTrendingUp } from "react-icons/fi";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const ContratoCompleto = lazy(() => import("../components/ContratoCompleto"));

import PortalSection from "../components/portal/PortalSection";
import { calcularAumento } from "../utils/aplicarAumento";
import { obtenerIndice, getIndiceIPC, getIndiceICLHistorico, getIndiceCP } from "../api/indices";
import { aplicarAumento as aplicarAumentoAPI, aplicarAumentoMora as aplicarAumentoMoraAPI, confirmarAumento as confirmarAumentoAPI, deleteContrato, patchContrato } from "../api/contratos";
import { calcularRecargoMora, verificarRecargo } from "../utils/verificarRecargo";
import capitalizar from "../utils/capitalizar";
import formatearMonto from "../utils/formatearMonto";
import { montoALetras } from "../utils/montoALetras";
import { normalizarConceptosExtras, calcularTotalConceptosExtras, calcularMontoIva } from "../utils/conceptosExtras";

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

const obtenerClaveMorasStorage = (contratoId) => `moras-aplicadas-${contratoId}`;

const leerMorasAplicadasStorage = (contratoId) => {
  if (!contratoId || typeof window === "undefined") {
    return {};
  }

  try {
    const guardado = window.localStorage.getItem(obtenerClaveMorasStorage(contratoId));
    if (!guardado) {
      return {};
    }

    const parsed = JSON.parse(guardado);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const guardarMorasAplicadasStorage = (contratoId, moras) => {
  if (!contratoId || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(obtenerClaveMorasStorage(contratoId), JSON.stringify(moras));
  } catch {
    // Ignorar errores de persistencia local.
  }
};

const combinarMorasAplicadas = (...fuentes) => (
  fuentes.reduce((acumulado, fuente) => {
    if (!fuente || typeof fuente !== "object") {
      return acumulado;
    }

    return {
      ...acumulado,
      ...fuente,
    };
  }, {})
);

const obtenerInfoMoraAplicada = (mes) => {
  const moraAplicada = Boolean(
    mes?.moraAplicada
    ?? mes?.mora_aplicada
    ?? mes?.recargoAplicado
    ?? mes?.recargo_aplicado
    ?? mes?.interesMoraAplicado
    ?? mes?.interes_mora_aplicado
  );

  const diasAtraso = Number(
    mes?.diasAtraso
    ?? mes?.dias_atraso
    ?? mes?.diasMora
    ?? mes?.dias_mora
    ?? 0
  );

  const recargo = Number(
    mes?.recargoMora
    ?? mes?.recargo_mora
    ?? mes?.moraCalculada
    ?? mes?.mora_calculada
    ?? mes?.interesMora
    ?? mes?.interes_mora
    ?? 0
  );

  return {
    aplicada: moraAplicada,
    diasAtraso: Number.isNaN(diasAtraso) ? 0 : diasAtraso,
    recargo: Number.isNaN(recargo) ? 0 : recargo,
  };
};

const normalizarPorcentajeAumento = (aumento) => {
  if (typeof aumento === "number") {
    return aumento;
  }

  if (aumento && aumento.porcentajeAumento !== undefined) {
    return Number(aumento.porcentajeAumento);
  }

  if (aumento && aumento.indiceNuevo !== undefined) {
    return Number(aumento.indiceNuevo);
  }

  if (aumento && aumento.valor !== undefined) {
    return Number(aumento.valor);
  }

  return null;
};

const obtenerNombresConceptosExtras = (conceptosExtras = []) => {
  if (!Array.isArray(conceptosExtras) || conceptosExtras.length === 0) {
    return "-";
  }

  return conceptosExtras
    .map((item) => (typeof item === "string" ? item : item?.nombre))
    .filter(Boolean)
    .join(", ");
};

const calcularMontoTotalMes = (alquilerPuro, totalExtras, aplicaIva) => {
  const alquilerBase = Number(alquilerPuro || 0);
  const extras = Number(totalExtras || 0);
  const iva = calcularMontoIva(alquilerBase, aplicaIva);

  return alquilerBase + extras + iva;
};

const construirEstadoMeses = (contratoObj, mesesApi) => {
  const mesesMapeados = mesesApi.map((mes) => ({
    ...mes,
    id: mes.id,
    nombre: mes.nombreMes,
    año: mes.anio,
    mes: mes.mes,
    montoFinal: mes.montoFinal ?? mes.monto_final ?? null,
    aumentos: Array.isArray(mes.aumentos)
      ? mes.aumentos
      : Array.isArray(mes.aumento)
        ? mes.aumento
        : [],
    aumento_aplicado: mes.aumento_aplicado ?? false,
    estado: mes.estado,
  }));

  const nuevosEstados = {};
  const nuevosMontos = {};
  let montoAnterior = Number(contratoObj.valorMensual);

  mesesMapeados.forEach((mes) => {
    const key = `${mes.nombre} ${mes.año}`;
    const montoFinalBackend = Number(mes.montoFinal || 0);

    if (montoFinalBackend > 0) {
      const recargMora = Number(
        mes.recargo_mora ?? mes.recargoMora ?? 0
      );
      const alquilerPuro = montoFinalBackend - recargMora;

      nuevosEstados[key] = mes.estado;
      nuevosMontos[key] = alquilerPuro;
      montoAnterior = alquilerPuro;
    } else {
      let montoCalculado = montoAnterior;

      mes.aumentos
        .filter((aumento) => {
          const tipo = (aumento.tipoAumento || aumento.tipo_aumento || "")
            .toString()
            .toLowerCase()
            .trim();
          return tipo !== "mora";
        })
        .forEach((aumento) => {
          const porcentaje = normalizarPorcentajeAumento(aumento);
          if (porcentaje !== null && !Number.isNaN(porcentaje)) {
            montoCalculado = calcularAumento(montoCalculado, contratoObj.tipoAumento, porcentaje);
          }
        });

      nuevosEstados[key] = mes.estado;
      nuevosMontos[key] = montoCalculado;
      montoAnterior = montoCalculado;
    }
  });

  return {
    meses: mesesMapeados,
    estados: nuevosEstados,
    montos: nuevosMontos,
  };
};

const aplicarRedondeo = (monto) => Math.ceil(monto / 100) * 100;

const monthNameToIndex = {
  Enero: 0, Febrero: 1, Marzo: 2, Abril: 3, Mayo: 4, Junio: 5,
  Julio: 6, Agosto: 7, Septiembre: 8, Octubre: 9, Noviembre: 10, Diciembre: 11,
};

const buildRangoCompleto = (fuente, mesAbsInicio, mesAbsFin) => {
  const lookup = new Map(fuente.map((r) => [r.anio * 12 + r.mes, r]));
  const rango = [];
  for (let abs = mesAbsInicio; abs <= mesAbsFin; abs++) {
    const mes  = abs % 12 === 0 ? 12 : abs % 12;
    const anio = Math.floor((abs - 1) / 12);
    rango.push(lookup.get(abs) ?? { anio, mes, variacion: null });
  }
  return rango;
};

const rellenarUltimaVariacion = (rango) => {
  let lastVal = null;
  return rango.map((r) => {
    if (r.variacion != null) { lastVal = r.variacion; return r; }
    if (lastVal != null) return { ...r, variacion: lastVal, repetido: true };
    return r;
  });
};

const normalizarTipoAumento = (tipo) => {
  if (!tipo) return "IPC"
  if (tipo.toLowerCase() === "fijo") return "porcentaje_fijo"
  return tipo
}

const initialState = {
  contrato: null,
  meses: [],
  estadosMeses: {},
  montosMeses: {},
  morasAplicadas: {},
  isOpen: false,
  mesSeleccionado: null,
  montoPreview: null,
  indicePreview: null,
  indiceAnterior: null,
  ipcMesesDetalle: null,
  mesesPreview: 1,
  isMoraModalOpen: false,
  moraPreview: null,
  isExtrasModalOpen: false,
  conceptoExtraEditando: null,
  isDetalleAumentoModalOpen: false,
  detalleAumentoData: null,
  isReciboModalOpen: false,
  tipoRecibo: 'inquilino',
  mesKeyRecibo: null,
  isDescargandoRecibo: false,
  isDescargandoPdf: false,
}

function detalleReducer(state, action) {
  switch (action.type) {
    case 'CONTRATO_SET':
      return { ...state, contrato: action.payload.contrato }
    case 'CONTRATO_MERGE':
      return { ...state, contrato: { ...state.contrato, ...action.payload.fields } }
    case 'MESES_DATOS_SET':
      return {
        ...state,
        ...(action.payload.meses !== undefined && { meses: action.payload.meses }),
        ...(action.payload.estadosMeses !== undefined && { estadosMeses: action.payload.estadosMeses }),
        ...(action.payload.montosMeses !== undefined && { montosMeses: action.payload.montosMeses }),
        ...(action.payload.morasAplicadas !== undefined && { morasAplicadas: action.payload.morasAplicadas }),
      }
    case 'MORAS_SET':
      return { ...state, morasAplicadas: action.payload.morasAplicadas }
    case 'MODAL_AUMENTO_ABRIR':
      return { ...state, isOpen: true, ...action.payload }
    case 'MODAL_AUMENTO_CERRAR':
      return { ...state, isOpen: false, mesSeleccionado: null, montoPreview: null,
               indicePreview: null, indiceAnterior: null, ipcMesesDetalle: null, mesesPreview: 1 }
    case 'IPCMESES_DETALLE_SET':
      return { ...state, ipcMesesDetalle: action.payload.ipcMesesDetalle }
    case 'MODAL_MORA_ABRIR':
      return { ...state, isMoraModalOpen: true, moraPreview: action.payload.moraPreview }
    case 'MODAL_MORA_CERRAR':
      return { ...state, isMoraModalOpen: false, moraPreview: null }
    case 'MODAL_EXTRAS_ABRIR':
      return { ...state, isExtrasModalOpen: true, conceptoExtraEditando: action.payload.conceptoExtraEditando }
    case 'MODAL_EXTRAS_CERRAR':
      return { ...state, isExtrasModalOpen: false, conceptoExtraEditando: null }
    case 'CONCEPTO_EXTRA_SET':
      return { ...state, conceptoExtraEditando: action.payload.conceptoExtraEditando }
    case 'MODAL_DETALLE_AUMENTO_ABRIR':
      return { ...state, isDetalleAumentoModalOpen: true, detalleAumentoData: action.payload.detalleAumentoData }
    case 'MODAL_DETALLE_AUMENTO_CERRAR':
      return { ...state, isDetalleAumentoModalOpen: false }
    case 'MODAL_RECIBO_ABRIR':
      return { ...state, isReciboModalOpen: true, mesKeyRecibo: action.payload.mesKeyRecibo, tipoRecibo: 'inquilino' }
    case 'MODAL_RECIBO_CERRAR':
      return { ...state, isReciboModalOpen: false }
    case 'TIPO_RECIBO_SET':
      return { ...state, tipoRecibo: action.payload.tipoRecibo }
    case 'DESCARGANDO_RECIBO_SET':
      return { ...state, isDescargandoRecibo: action.payload.value }
    case 'DESCARGANDO_PDF_SET':
      return { ...state, isDescargandoPdf: action.payload.value }
    default:
      return state
  }
}

export default function DetalleContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOpen: isContratoModalOpen, onOpen: onOpenContratoModal, onClose: onCloseContratoModal } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();

  const [state, dispatch] = useReducer(detalleReducer, initialState)
  const {
    contrato, meses, estadosMeses, montosMeses, morasAplicadas,
    isOpen, mesSeleccionado, montoPreview, indicePreview, indiceAnterior, ipcMesesDetalle, mesesPreview,
    isMoraModalOpen, moraPreview,
    isExtrasModalOpen, conceptoExtraEditando, isDetalleAumentoModalOpen, detalleAumentoData,
    isReciboModalOpen, tipoRecibo, mesKeyRecibo,
    isDescargandoRecibo, isDescargandoPdf,
  } = state

  const toast = useToast();

  const handleEliminarContrato = async () => {
    onDeleteModalOpen();
  };

  const abrirReciboModal = (mesKey) => {
    dispatch({ type: 'MODAL_RECIBO_ABRIR', payload: { mesKeyRecibo: mesKey } })
  };

  const handleDescargarRecibo = async () => {
    if (!mesKeyRecibo || !contrato) return;
    const [nombreMes, anio] = mesKeyRecibo.split(" ");
    const montoAlquiler = Number(montosMeses[mesKeyRecibo] || contrato.valorMensual || 0);
    const conceptosExtras = normalizarConceptosExtras(contrato.conceptosExtras);
    const totalExtras = calcularTotalConceptosExtras(conceptosExtras);
    const honorariosPct = Number(contrato.honorarios || 0);

    const moraAplicadaInfo = leerMorasAplicadasStorage(contrato.id)[mesKeyRecibo] || morasAplicadas[mesKeyRecibo];
    const recargoMoraAplicado = Number(moraAplicadaInfo?.recargo || 0);

    const payload = {
      mes: nombreMes,
      anio: Number(anio),
      montoAlquiler,
      totalExtras,
      honorariosPct,
      conceptosExtras,
      ...(tipoRecibo === 'inquilino' && {
        recargoMora: recargoMoraAplicado,
        diasAtraso: moraAplicadaInfo?.diasAtraso ?? 0,
        tipoInteresMora: contrato.tipoInteresMora,
        valorInteresMora: contrato.valorInteresMora,
      }),
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
    const token = localStorage.getItem('access_token');
    const endpoint = tipoRecibo === 'inquilino'
      ? `${API_BASE_URL}/contratos/${contrato.id}/recibo/`
      : `${API_BASE_URL}/contratos/${contrato.id}/recibo-propietario/`;

    dispatch({ type: 'DESCARGANDO_RECIBO_SET', payload: { value: true } })
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Error al generar el recibo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      if (tipoRecibo === 'inquilino') {
        const nombreLimpio = contrato.inquilinoNombre.replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `recibo_${nombreLimpio}_${nombreMes}_${anio}.docx`;
      } else {
        const nombreLimpio = contrato.propietarioNombre.replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `recibo_propietario_${nombreLimpio}_${nombreMes}_${anio}.docx`;
      }
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      dispatch({ type: 'MODAL_RECIBO_CERRAR' })
      toast({
        title: tipoRecibo === 'inquilino' ? "Recibo de inquilino generado" : "Recibo de propietario generado",
        description: `Descargado para ${nombreMes} ${anio}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error al generar recibo",
        description: error.message || "No se pudo generar el recibo. Inténtalo de nuevo.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'DESCARGANDO_RECIBO_SET', payload: { value: false } })
    }
  };

  const handleDescargarPdf = async () => {
    if (!mesKeyRecibo || !contrato) return;
    const [nombreMes, anio] = mesKeyRecibo.split(" ");
    const montoAlquiler = Number(montosMeses[mesKeyRecibo] || contrato.valorMensual || 0);
    const conceptosExtras = normalizarConceptosExtras(contrato.conceptosExtras);
    const totalExtras = calcularTotalConceptosExtras(conceptosExtras);
    const honorariosPct = Number(contrato.honorarios || 0);
    const moraAplicadaInfo = leerMorasAplicadasStorage(contrato.id)[mesKeyRecibo] || morasAplicadas[mesKeyRecibo];
    const recargoMoraAplicado = Number(moraAplicadaInfo?.recargo || 0);

    const payload = {
      mes: nombreMes,
      anio: Number(anio),
      montoAlquiler,
      totalExtras,
      honorariosPct,
      conceptosExtras,
      ...(tipoRecibo === 'inquilino' && {
        recargoMora: recargoMoraAplicado,
        diasAtraso: moraAplicadaInfo?.diasAtraso ?? 0,
        tipoInteresMora: contrato.tipoInteresMora,
        valorInteresMora: contrato.valorInteresMora,
      }),
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
    const token = localStorage.getItem('access_token');
    const endpoint = tipoRecibo === 'inquilino'
      ? `${API_BASE_URL}/contratos/${contrato.id}/recibo-pdf/`
      : `${API_BASE_URL}/contratos/${contrato.id}/recibo-propietario-pdf/`;

    dispatch({ type: 'DESCARGANDO_PDF_SET', payload: { value: true } })
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Error al generar el PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const nombreLimpio = (tipoRecibo === 'inquilino' ? contrato.inquilinoNombre : contrato.propietarioNombre).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `recibo_${nombreLimpio}_${nombreMes}_${anio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      dispatch({ type: 'MODAL_RECIBO_CERRAR' })
      toast({
        title: "PDF generado",
        description: `Descargado para ${nombreMes} ${anio}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error al generar PDF",
        description: error.message || "No se pudo generar el PDF. Inténtalo de nuevo.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'DESCARGANDO_PDF_SET', payload: { value: false } })
    }
  };

  const confirmarEliminacion = async () => {
    try {
      await deleteContrato(id);
      onDeleteModalClose();
      window.dispatchEvent(new Event("contractsUpdated"));
      toast({
        title: "Contrato eliminado",
        description: "El contrato se ha eliminado correctamente.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate("/contratos");
    } catch (error) {
      console.error("Error eliminando contrato:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el contrato. Inténtalo de nuevo.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const cargarMeses = async (contratoObj) => {
    const { getMeses } = await import("../api/contratos");
    const mesesApi = await getMeses(contratoObj.id ?? id);

    const estadoMeses = construirEstadoMeses(contratoObj, mesesApi);
    const morasPersistidas = leerMorasAplicadasStorage(contratoObj.id ?? id);
    const morasDesdeApi = {};

    estadoMeses.meses.forEach((mes) => {
      const key = `${mes.nombre} ${mes.año}`;
      const moraInfo = obtenerInfoMoraAplicada(mes);
      if (moraInfo.aplicada) {
        morasDesdeApi[key] = moraInfo;
      }
    });

    const siguienteEstadoMoras = combinarMorasAplicadas(morasPersistidas, morasAplicadas, morasDesdeApi);

    dispatch({ type: 'MESES_DATOS_SET', payload: { meses: estadoMeses.meses, estadosMeses: estadoMeses.estados, montosMeses: estadoMeses.montos, morasAplicadas: siguienteEstadoMoras } })
    guardarMorasAplicadasStorage(contratoObj.id ?? id, siguienteEstadoMoras);
  };


  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    const cargarMesesIniciales = async (contratoObj) => {
      const { getMeses } = await import("../api/contratos");
      const mesesApi = await getMeses(contratoObj.id ?? id);

      const estadoMeses = construirEstadoMeses(contratoObj, mesesApi);
      const morasPersistidas = leerMorasAplicadasStorage(contratoObj.id ?? id);
      const morasDesdeApi = {};

      estadoMeses.meses.forEach((mes) => {
        const key = `${mes.nombre} ${mes.año}`;
        const moraInfo = obtenerInfoMoraAplicada(mes);
        if (moraInfo.aplicada) {
          morasDesdeApi[key] = moraInfo;
        }
      });

      const siguienteEstadoMoras = {
        ...morasPersistidas,
        ...morasDesdeApi,
      };
      dispatch({ type: 'MESES_DATOS_SET', payload: { meses: estadoMeses.meses, estadosMeses: estadoMeses.estados, montosMeses: estadoMeses.montos, morasAplicadas: siguienteEstadoMoras } })
      guardarMorasAplicadasStorage(contratoObj.id ?? id, siguienteEstadoMoras);
      return mesesApi;
    };

    const aplicarAumentosHistoricosAutomaticamente = async (contratoObj, mesesApiLocal) => {
      const tipoAum = (contratoObj.tipoAumento || "").toUpperCase();
      if (tipoAum !== "IPC" && tipoAum !== "ICL" && tipoAum !== "CASA_PROPIA") return false;

      const frecKey = (contratoObj.frecuenciaAumento || "").toString().toLowerCase().replace(/\s+/g, "");
      const frecMap = { mensual: 1, trimestral: 3, cuatrimestral: 4, semestral: 6, anual: 12 };
      const intervaloLocal = frecMap[frecKey];
      if (!intervaloLocal) return false;

      const mesNombreAIdx = {
        Enero: 0, Febrero: 1, Marzo: 2, Abril: 3, Mayo: 4, Junio: 5,
        Julio: 6, Agosto: 7, Septiembre: 8, Octubre: 9, Noviembre: 10, Diciembre: 11,
      };

      const hoy = new Date();
      const añoHoy = hoy.getFullYear();
      const mesHoy = hoy.getMonth();

      const pendientes = mesesApiLocal
        .map((mes, index) => ({ mes, index }))
        .filter(({ mes, index }) => {
          if (mes.aumento_aplicado === true) return false;
          if (!((index - intervaloLocal) >= 0 && (index - intervaloLocal) % intervaloLocal === 0)) return false;
          const mesIdx = mesNombreAIdx[mes.nombreMes];
          if (mesIdx === undefined) return false;
          return mes.anio < añoHoy || (mes.anio === añoHoy && mesIdx < mesHoy);
        });

      if (pendientes.length === 0) return false;

      let todosIndicesHistorico;
      try {
        todosIndicesHistorico = tipoAum === "ICL"
          ? await getIndiceICLHistorico()
          : tipoAum === "CASA_PROPIA"
            ? await getIndiceCP()
            : await getIndiceIPC();
      } catch {
        return false;
      }

      const toastId = "historicos-procesando";
      toast({
        id: toastId,
        title: "Actualizando aumentos históricos...",
        status: "info",
        duration: null,
        isClosable: false,
      });

      let seAplicoAlguno = false;

      for (const { mes } of pendientes) {
        const mesNum1 = mesNombreAIdx[mes.nombreMes] + 1;
        const anioNum = mes.anio;
        const mesAbsMes = anioNum * 12 + mesNum1;

        // Ventana fija: exactamente los N meses inmediatamente anteriores al mes de aumento
        const mesAbsFin = mesAbsMes - 1;
        const mesAbsInicio = mesAbsFin - intervaloLocal + 1;

        let pctAcumulado;

        if (tipoAum === "CASA_PROPIA") {
          const cpFiltrado = (todosIndicesHistorico || [])
            .filter((r) => {
              const abs = r.anio * 12 + r.mes;
              return abs >= mesAbsInicio && abs <= mesAbsFin && r.nivel != null;
            })
            .sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes));

          if (cpFiltrado.length === 0) continue;

          const acumulado = cpFiltrado.reduce((acc, r) => acc * Number(r.nivel), 1) - 1;
          pctAcumulado = Number((acumulado * 100).toFixed(4));
        } else {
          const ipcFiltrado = (todosIndicesHistorico || [])
            .filter((r) => {
              const abs = r.anio * 12 + r.mes;
              return abs >= mesAbsInicio && abs <= mesAbsFin;
            })
            .sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes));

          if (ipcFiltrado.length === 0 || ipcFiltrado.some((r) => r.variacion == null)) continue;

          const factorAcumulado = ipcFiltrado.reduce(
            (acc, r) => acc * (1 + Number(r.variacion) / 100),
            1
          );
          pctAcumulado = Number(((factorAcumulado - 1) * 100).toFixed(4));
        }

        try {
          await confirmarAumentoAPI(contratoObj.id, {
            tipoAumento: tipoAum,
            porcentajeAumento: pctAcumulado,
            indiceAnterior: 0,
            indiceNuevo: pctAcumulado,
            mesDesde: mesNum1,
            anioDesde: anioNum,
            razon: `Aumento histórico automático ${mes.nombreMes} ${mes.anio}`,
            aplicadoPor: "frontend",
          });
          seAplicoAlguno = true;
          // Recargar para que el backend aplique el siguiente aumento sobre el montoFinal actualizado
          const { getMeses } = await import("../api/contratos");
          await getMeses(contratoObj.id);
        } catch (err) {
          console.error(`Error aplicando aumento histórico ${mes.nombreMes} ${mes.anio}:`, err);
        }
      }

      toast.close(toastId);

      if (seAplicoAlguno) {
        toast({
          title: "Aumentos históricos aplicados ✅",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      return seAplicoAlguno;
    };

    const cargarContrato = async () => {
      try {
        const { getContrato } = await import("../api/contratos");
        const c = await getContrato(id);
        // Warm index cache in parallel so subsequent calls are instant
        await Promise.all([
          getIndiceIPC().catch(() => null),
          getIndiceICLHistorico().catch(() => null),
          getIndiceCP().catch(() => null),
        ]);
        if (isMounted) {
          dispatch({ type: 'CONTRATO_SET', payload: { contrato: c } })
          const mesesCargados = await cargarMesesIniciales(c);
          const seActualizo = await aplicarAumentosHistoricosAutomaticamente(c, mesesCargados);
          if (seActualizo) {
            await cargarMesesIniciales(c);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (id) {
      cargarContrato();
    }

    // Escuchar el evento para recargar el contrato si se actualiza
    const handleContractsUpdated = () => {
      if (id) cargarContrato();
    };
    window.addEventListener("contractsUpdated", handleContractsUpdated);

    return () => {
      isMounted = false;
      controller.abort();
      window.removeEventListener("contractsUpdated", handleContractsUpdated);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const conceptosExtras = useMemo(() =>
    contrato ? normalizarConceptosExtras(contrato.conceptosExtras) : []
  , [contrato])

  const totalConceptosExtras = useMemo(() =>
    calcularTotalConceptosExtras(conceptosExtras)
  , [conceptosExtras])

  const aplicaIva = useMemo(() =>
    Boolean(contrato?.incluye_iva ?? contrato?.iva)
  , [contrato])

  const alquilerPreviewAnterior = useMemo(() => Number(montoPreview?.anterior || 0), [montoPreview])
  const alquilerPreviewNuevo = useMemo(() => aplicarRedondeo(Number(montoPreview?.nuevo || 0)), [montoPreview])
  const ivaPreviewAnterior = useMemo(() => calcularMontoIva(alquilerPreviewAnterior, aplicaIva), [alquilerPreviewAnterior, aplicaIva])
  const ivaPreviewNuevo = useMemo(() => calcularMontoIva(alquilerPreviewNuevo, aplicaIva), [alquilerPreviewNuevo, aplicaIva])
  const totalPreviewAnterior = useMemo(() => calcularMontoTotalMes(alquilerPreviewAnterior, totalConceptosExtras, aplicaIva), [alquilerPreviewAnterior, totalConceptosExtras, aplicaIva])
  const totalPreviewNuevo = useMemo(() => calcularMontoTotalMes(alquilerPreviewNuevo, totalConceptosExtras, aplicaIva), [alquilerPreviewNuevo, totalConceptosExtras, aplicaIva])

  const handleEstadoChange = useCallback(async (mesKey, valor) => {
    if (!contrato) return
    const [nombreMes, anio] = mesKey.split(" ");
    const mesIndex = monthNameToIndex[nombreMes];
    if (mesIndex == null) {
      console.error("Mes inválido para actualizar estado:", mesKey);
      return;
    }
    try {
      const { updateMesEstado, getMeses } = await import("../api/contratos");
      await updateMesEstado(contrato.id, mesIndex, Number(anio), valor);
      const mesesApi = await getMeses(contrato.id);
      const mesesMapeados = mesesApi.map((mes) => ({
        ...mes,
        nombre: mes.nombreMes,
        año: mes.anio,
        mes: mes.mes,
        montoFinal: mes.montoFinal ?? mes.monto_final,
        aumentos: Array.isArray(mes.aumentos) ? mes.aumentos : Array.isArray(mes.aumento) ? mes.aumento : [],
      }));
      const nuevosEstados = {};
      mesesApi.forEach((mes) => {
        const key = `${mes.nombreMes} ${mes.anio}`;
        nuevosEstados[key] = mes.estado;
      });
      const morasDesdeApi = {};
      mesesMapeados.forEach((mes) => {
        const key = `${mes.nombre} ${mes.año}`;
        const moraInfo = obtenerInfoMoraAplicada(mes);
        if (moraInfo.aplicada) {
          morasDesdeApi[key] = moraInfo;
        }
      });
      const siguienteEstadoMoras = combinarMorasAplicadas(
        leerMorasAplicadasStorage(contrato.id),
        morasAplicadas,
        morasDesdeApi,
      );
      dispatch({ type: 'MESES_DATOS_SET', payload: { meses: mesesMapeados, estadosMeses: nuevosEstados, morasAplicadas: siguienteEstadoMoras } })
      guardarMorasAplicadasStorage(contrato.id, siguienteEstadoMoras);
      if (valor === "pagado") {
        const montoBaseMes = Number(montosMeses[mesKey] || contrato.valorMensual || 0);
        const moraAplicadaMes = leerMorasAplicadasStorage(contrato.id)[mesKey] || morasAplicadas[mesKey];
        const recargoMoraMes = Number(moraAplicadaMes?.recargo || 0);
        const montoPagado = calcularMontoTotalMes(montoBaseMes, totalConceptosExtras, aplicaIva) + recargoMoraMes;
        const event = new CustomEvent("contractsUpdated", {
          detail: { contratoId: contrato.id, mes: nombreMes, anio: Number(anio), monto: Number(montoPagado) }
        });
        window.dispatchEvent(event);
      } else {
        window.dispatchEvent(new Event("contractsUpdated"));
      }
    } catch (error) {
      console.error("Error actualizando el estado de mes en la API:", error);
      alert("No se pudo actualizar el estado de mes en la API");
    }
  }, [contrato, montosMeses, morasAplicadas, totalConceptosExtras, aplicaIva])

  const abrirModalConceptosExtras = useCallback((conceptoExtra) => {
    dispatch({ type: 'MODAL_EXTRAS_ABRIR', payload: { conceptoExtraEditando: {
      nombre: conceptoExtra.nombre,
      precio: conceptoExtra.precio ?? "",
    } } })
  }, [])

  const abrirConfirmacionMora = useCallback((mes, mesKey, estado, montoBase) => {
    if (!contrato) return
    const preview = calcularRecargoMora({
      mes, estado,
      diaPago: contrato.diaPago,
      tipoInteresMora: contrato.tipoInteresMora,
      valorInteresMora: contrato.valorInteresMora,
      montoBase,
    });
    if (!preview.recargo) {
      alert("No se pudo calcular la mora para este mes. Revisá el tipo y valor de interés por mora.");
      return;
    }
    const tipoMora = normalizarTipoInteresMora(contrato.tipoInteresMora);
    const valorInteres = Number(contrato.valorInteresMora || 0);
    const recargoPorDia = tipoMora === "fijo"
      ? valorInteres
      : Number(montoBase) * (valorInteres / 100);
    dispatch({ type: 'MODAL_MORA_ABRIR', payload: { moraPreview: {
      mes, mesKey, estado, montoBase,
      diasAtraso: preview.diasAtraso,
      recargoPorDia,
      recargo: preview.recargo,
      totalConMora: Number(montoBase) + Number(preview.recargo),
    } } })
  }, [contrato])

  const abrirConfirmacion = useCallback(async (mesKey) => {
    if (!contrato) return
    let indice = null;
    let indiceAnterior = null;
    dispatch({ type: 'IPCMESES_DETALLE_SET', payload: { ipcMesesDetalle: null } })
    const tipo = contrato.tipoAumento?.toUpperCase();
    const frecuenciaKey = (contrato.frecuenciaAumento || "").toString().toLowerCase().replace(/\s+/g, "");
    const frecuenciaMap = { mensual: 1, trimestral: 3, cuatrimestral: 4, semestral: 6, anual: 12 };

    if (tipo === "CASA_PROPIA") {
      try {
        const todosCp = await getIndiceCP();
        const [nombreMesSelec, anioSelecStr] = mesKey.split(" ");
        const mesNumSelec = monthNameToIndex[nombreMesSelec] + 1;
        const anioNumSelec = Number(anioSelecStr);
        const frecuencia = frecuenciaMap[frecuenciaKey] || 1;
        const mesAbsSeleccionado = anioNumSelec * 12 + mesNumSelec;
        const mesAbsFin = mesAbsSeleccionado - 1;
        const mesAbsInicio = mesAbsFin - frecuencia + 1;
        const cpRango = (todosCp || [])
          .filter((r) => { const abs = r.anio * 12 + r.mes; return abs >= mesAbsInicio && abs <= mesAbsFin && r.nivel != null; })
          .sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes));
        if (cpRango.length === 0) { alert("No hay datos del índice Casa Propia para el período seleccionado."); return; }
        const acumulado = cpRango.reduce((acc, r) => acc * Number(r.nivel), 1) - 1;
        const pctAcumulado = acumulado * 100;
        const montoAnterior = montosMeses[mesKey];
        const montoNuevo = montoAnterior * (1 + acumulado);
        dispatch({ type: 'MODAL_AUMENTO_ABRIR', payload: { mesSeleccionado: mesKey, indicePreview: pctAcumulado, indiceAnterior: 0, mesesPreview: frecuencia, montoPreview: { anterior: montoAnterior, nuevo: montoNuevo }, ipcMesesDetalle: cpRango } })
      } catch (error) {
        console.error("Error obteniendo índices Casa Propia:", error);
        alert("No se pudieron obtener los índices de Casa Propia.");
      }
      return;
    }

    if (tipo === "IPC") {
      try {
        const todosIpc = await getIndiceIPC();
        const [nombreMesSelec, anioSelecStr] = mesKey.split(" ");
        const mesNumSelec = monthNameToIndex[nombreMesSelec] + 1;
        const anioNumSelec = Number(anioSelecStr);
        const frecuencia = frecuenciaMap[frecuenciaKey] || 1;
        const mesAbsSeleccionado = anioNumSelec * 12 + mesNumSelec;
        const mesAbsFin = mesAbsSeleccionado - 1;
        const mesAbsInicio = mesAbsFin - frecuencia + 1;
        const ipcRangoBase = buildRangoCompleto(todosIpc || [], mesAbsInicio, mesAbsFin);
        if (ipcRangoBase.every((r) => r.variacion == null)) { alert("No hay datos de IPC del INDEC para el período seleccionado."); return; }
        const ipcRango = rellenarUltimaVariacion(ipcRangoBase);
        const factorAcumulado = ipcRango.reduce((acc, r) => r.variacion != null ? acc * (1 + Number(r.variacion) / 100) : acc, 1);
        const pctAcumulado = (factorAcumulado - 1) * 100;
        const montoAnterior = montosMeses[mesKey];
        const montoNuevo = calcularAumento(montoAnterior, contrato.tipoAumento, pctAcumulado, 1);
        dispatch({ type: 'MODAL_AUMENTO_ABRIR', payload: { mesSeleccionado: mesKey, indicePreview: pctAcumulado, indiceAnterior: 0, mesesPreview: frecuencia, montoPreview: { anterior: montoAnterior, nuevo: montoNuevo }, ipcMesesDetalle: ipcRango } })
      } catch (error) {
        console.error("Error obteniendo índices IPC:", error);
        alert("No se pudieron obtener los índices IPC del INDEC.");
      }
      return;
    }

    if (tipo === "ICL") {
      try {
        const todosIcl = await getIndiceICLHistorico();
        const [nombreMesSelec, anioSelecStr] = mesKey.split(" ");
        const mesNumSelec = monthNameToIndex[nombreMesSelec] + 1;
        const anioNumSelec = Number(anioSelecStr);
        const frecuencia = frecuenciaMap[frecuenciaKey] || 1;
        const mesAbsSeleccionado = anioNumSelec * 12 + mesNumSelec;
        const mesAbsFin = mesAbsSeleccionado - 1;
        const mesAbsInicio = mesAbsFin - frecuencia + 1;
        if (mesAbsInicio < 2023 * 12 + 1) { alert("No hay datos históricos del ICL para el período seleccionado (disponible desde enero 2023)."); return; }
        const iclRangoBase = buildRangoCompleto(todosIcl || [], mesAbsInicio, mesAbsFin);
        if (iclRangoBase.every((r) => r.variacion == null)) { alert("No hay datos del ICL para el período seleccionado."); return; }
        const iclRango = rellenarUltimaVariacion(iclRangoBase);
        const factorAcumulado = iclRango.reduce((acc, r) => r.variacion != null ? acc * (1 + Number(r.variacion) / 100) : acc, 1);
        const pctAcumulado = (factorAcumulado - 1) * 100;
        const montoAnterior = montosMeses[mesKey];
        const montoNuevo = montoAnterior * factorAcumulado;
        dispatch({ type: 'MODAL_AUMENTO_ABRIR', payload: { mesSeleccionado: mesKey, indicePreview: pctAcumulado, indiceAnterior: 0, mesesPreview: frecuencia, montoPreview: { anterior: montoAnterior, nuevo: montoNuevo }, ipcMesesDetalle: iclRango } })
      } catch (error) {
        console.error("Error obteniendo índices ICL:", error);
        alert("No se pudieron obtener los índices ICL.");
      }
      return;
    }

    if (tipo === "FIJO") {
      const valor = Number(contrato.valorInteresMora || contrato.valorDeposito || 0);
      if (!valor || Number.isNaN(valor)) {
        alert("Para tipo de aumento fijo hace falta un valor numérico en 'valorInteresMora'");
        return;
      }
      indice = valor;
    } else {
      try {
        const result = await aplicarAumentoAPI(contrato.id, { tipoAumento: normalizarTipoAumento(contrato.tipoAumento) });
        if (!result) throw new Error("No se recibió respuesta de aplicar aumento");
        indice = Number(result.porcentajeSugerido ?? result.indiceNuevo ?? result.valor ?? 0);
        indiceAnterior = Number(result.indiceAnterior ?? 0);
        if (!indice || Number.isNaN(indice)) {
          indice = await obtenerIndice(normalizarTipoAumento(contrato.tipoAumento), contrato.valorInteresMora);
        }
      } catch (error) {
        console.warn("⚠️ Fallback a indice directo para aumento", error);
        indice = await obtenerIndice(normalizarTipoAumento(contrato.tipoAumento), contrato.valorInteresMora);
      }
    }

    if (!indice || Number.isNaN(indice)) {
      alert("No se pudo calcular el índice de aumento para este contrato");
      return;
    }

    const meses = frecuenciaMap[frecuenciaKey] || 1;
    const montoAnterior = montosMeses[mesKey];
    const montoNuevo = calcularAumento(montoAnterior, contrato.tipoAumento, indice, meses);
    dispatch({ type: 'MODAL_AUMENTO_ABRIR', payload: { mesSeleccionado: mesKey, montoPreview: { anterior: montoAnterior, nuevo: montoNuevo }, indicePreview: indice, indiceAnterior, mesesPreview: meses, ipcMesesDetalle: null } })
  }, [contrato, montosMeses])

  const abrirDetalleAumento = useCallback(async (mesKey, alquilerActual) => {
    if (!contrato) return
    const tipo = contrato.tipoAumento?.toUpperCase();
    if (tipo !== "IPC" && tipo !== "ICL" && tipo !== "CASA_PROPIA") return;
    const [nombreMes, anioStr] = mesKey.split(" ");
    const mesNum1 = monthNameToIndex[nombreMes] + 1;
    const anioNum = Number(anioStr);
    const mesAbsMes = anioNum * 12 + mesNum1;
    const frecuenciaKey = (contrato.frecuenciaAumento || "").toString().toLowerCase().replace(/\s+/g, "");
    const frecuencia = { mensual: 1, trimestral: 3, cuatrimestral: 4, semestral: 6, anual: 12 }[frecuenciaKey] || 1;
    const mesAbsFin = mesAbsMes - 1;
    const mesAbsInicio = mesAbsFin - frecuencia + 1;
    try {
      const todosIndices = tipo === "ICL"
        ? await getIndiceICLHistorico()
        : tipo === "CASA_PROPIA"
          ? await getIndiceCP()
          : await getIndiceIPC();
      let indiceFiltrado;
      if (tipo === "CASA_PROPIA") {
        indiceFiltrado = (todosIndices || [])
          .filter((r) => { const abs = r.anio * 12 + r.mes; return abs >= mesAbsInicio && abs <= mesAbsFin && r.nivel != null; })
          .sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes))
          .map((r) => ({ ...r, variacion: (Number(r.nivel) - 1) * 100 }));
      } else {
        indiceFiltrado = rellenarUltimaVariacion(buildRangoCompleto(todosIndices || [], mesAbsInicio, mesAbsFin));
      }
      if (indiceFiltrado.length === 0 || indiceFiltrado.every((r) => r.variacion == null)) return;
      const factorAcumulado = indiceFiltrado.reduce((acc, r) => r.variacion != null ? acc * (1 + Number(r.variacion) / 100) : acc, 1);
      const pctAcumulado = (factorAcumulado - 1) * 100;
      const montoAnterior = alquilerActual / factorAcumulado;
      dispatch({ type: 'MODAL_DETALLE_AUMENTO_ABRIR', payload: { detalleAumentoData: {
        mesKey, montoAnterior, montoNuevo: alquilerActual,
        ipcMeses: indiceFiltrado, pctAcumulado,
        indexType: tipo === "CASA_PROPIA" ? "Casa Propia" : tipo,
      } } })
    } catch (err) {
      console.error("Error obteniendo detalles del aumento:", err);
    }
  }, [contrato])

  const pageBg = useColorModeValue("gray.50", "gray.900")
  const headingColor = useColorModeValue("gray.800", "white")

  if (!contrato) return <Text>Contrato no encontrado</Text>;

  const morasPersistidas = leerMorasAplicadasStorage(contrato.id);
  const hayErroresConceptosExtras =
    conceptoExtraEditando?.precio === "" || Number.isNaN(Number(conceptoExtraEditando?.precio));

  const handleConceptoExtraChange = (value) => {
    if (value !== "" && Number.isNaN(Number(value))) {
      return;
    }

    if (conceptoExtraEditando) {
      dispatch({ type: 'CONCEPTO_EXTRA_SET', payload: { conceptoExtraEditando: { ...conceptoExtraEditando, precio: value === "" ? "" : Number(value) } } })
    }
  };

  const guardarConceptosExtras = async () => {
    if (!conceptoExtraEditando || hayErroresConceptosExtras) {
      return;
    }

    const conceptosExtrasActualizados = conceptosExtras.map((item) => (
      item.nombre === conceptoExtraEditando.nombre
        ? { ...item, precio: Number(conceptoExtraEditando.precio) }
        : item
    ));

    const payload = {
      conceptosExtras: conceptosExtrasActualizados,
      valorConceptosExtras: calcularTotalConceptosExtras(conceptosExtrasActualizados),
    };

    try {
      await patchContrato(contrato.id, payload);
      dispatch({ type: 'CONTRATO_MERGE', payload: { fields: payload } })
      dispatch({ type: 'MODAL_EXTRAS_CERRAR' })
      window.dispatchEvent(new Event("contractsUpdated"));
      toast({
        title: "Conceptos extras actualizados",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error actualizando conceptos extras:", error);
      alert("No se pudieron actualizar los conceptos extras.");
    }
  };

  const confirmarMora = async () => {
    if (!moraPreview) {
      return;
    }

    const payloadMora = {
      mes: moraPreview.mes.mes + 1,
      mesNumero: moraPreview.mes.mes + 1,
      mes_numero: moraPreview.mes.mes + 1,
      mesIndex: moraPreview.mes.mes,
      mes_index: moraPreview.mes.mes,
      nombreMes: moraPreview.mes.nombre,
      nombre_mes: moraPreview.mes.nombre,
      anio: moraPreview.mes.año,
      ano: moraPreview.mes.año,
      diaPago: Number(contrato.diaPago),
      dia_pago: Number(contrato.diaPago),
      diasAtraso: moraPreview.diasAtraso,
      dias_atraso: moraPreview.diasAtraso,
      tipoInteresMora: contrato.tipoInteresMora,
      tipo_interes_mora: contrato.tipoInteresMora,
      valorInteresMora: Number(contrato.valorInteresMora || 0),
      valor_interes_mora: Number(contrato.valorInteresMora || 0),
      montoBase: moraPreview.montoBase,
      monto_base: moraPreview.montoBase,
      recargo: Number(moraPreview.recargo.toFixed(2)),
      recargoMora: Number(moraPreview.recargo.toFixed(2)),
      recargo_mora: Number(moraPreview.recargo.toFixed(2)),
      recargoCalculado: Number(moraPreview.recargo.toFixed(2)),
      recargo_calculado: Number(moraPreview.recargo.toFixed(2)),
    };

    try {
      await aplicarAumentoMoraAPI(contrato.id, payloadMora);

      const siguienteEstadoMoras = combinarMorasAplicadas(
        leerMorasAplicadasStorage(contrato.id),
        morasAplicadas,
        {
          [moraPreview.mesKey]: {
            aplicada: true,
            diasAtraso: moraPreview.diasAtraso,
            recargo: moraPreview.recargo,
          },
        },
      );

      guardarMorasAplicadasStorage(contrato.id, siguienteEstadoMoras);
      dispatch({ type: 'MORAS_SET', payload: { morasAplicadas: siguienteEstadoMoras } })

      await cargarMeses(contrato);
      dispatch({ type: 'MODAL_MORA_CERRAR' })
      window.dispatchEvent(new Event("contractsUpdated"));
      toast({
        title: `Mora aplicada por ${moraPreview.diasAtraso} ${moraPreview.diasAtraso === 1 ? "día" : "días"}`,
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error aplicando mora:", error);
      const detalleBackend = error?.data
        ? typeof error.data === "string"
          ? error.data
          : JSON.stringify(error.data)
        : error?.message || "Error desconocido";
      alert(`No se pudo aplicar la mora en el backend. ${detalleBackend}`);
    }
  };

  const eliminarConceptoExtra = async (nombreConcepto) => {
    const conceptosExtrasActualizados = conceptosExtras.filter((item) => item.nombre !== nombreConcepto);

    try {
      await patchContrato(contrato.id, {
        conceptosExtras: conceptosExtrasActualizados,
        valorConceptosExtras: calcularTotalConceptosExtras(conceptosExtrasActualizados),
      });
      dispatch({ type: 'CONTRATO_MERGE', payload: { fields: {
        conceptosExtras: conceptosExtrasActualizados,
        valorConceptosExtras: calcularTotalConceptosExtras(conceptosExtrasActualizados),
      } } })
      dispatch({ type: 'MODAL_EXTRAS_CERRAR' })
      window.dispatchEvent(new Event("contractsUpdated"));
      toast({
        title: "Concepto extra eliminado",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error eliminando conceptos extras:", error);
      alert("No se pudieron eliminar los conceptos extras.");
    }
  };

  // 🔹 Aplica + toast
  const confirmarAumento = async () => {
    const esIpcReal = contrato.tipoAumento?.toUpperCase() === "IPC" && ipcMesesDetalle?.length > 0;
    const esIclReal = contrato.tipoAumento?.toUpperCase() === "ICL" && ipcMesesDetalle?.length > 0;
    const esCasaPropia = contrato.tipoAumento?.toUpperCase() === "CASA_PROPIA" && ipcMesesDetalle?.length > 0;
    const montoAnterior = montosMeses[mesSeleccionado];
    const montoNuevo = aplicarRedondeo(
      (esIclReal || esCasaPropia)
        ? montoAnterior * (1 + indicePreview / 100)
        : calcularAumento(montoAnterior, contrato.tipoAumento, indicePreview, (esIpcReal || esIclReal) ? 1 : mesesPreview)
    );

    try {
      const [nombreMesSeleccionado, anioSeleccionado] = mesSeleccionado.split(" ");
      const mesDesde = monthNameToIndex[nombreMesSeleccionado] + 1;
      const anioDesde = Number(anioSeleccionado);

      const esICL = contrato.tipoAumento?.toLowerCase() === "icl";
      const porcentajeAcumulado = (esIpcReal || esIclReal || esCasaPropia)
        ? Number(indicePreview.toFixed(4))
        : esICL
          ? Number(((indicePreview / 12) * mesesPreview).toFixed(4))
          : Number(((Math.pow(1 + indicePreview / 100, mesesPreview) - 1) * 100).toFixed(4));

      await confirmarAumentoAPI(contrato.id, {
        tipoAumento: normalizarTipoAumento(contrato.tipoAumento),
        porcentajeAumento: porcentajeAcumulado,
        indiceAnterior: indiceAnterior ?? 0,
        indiceNuevo: porcentajeAcumulado,
        mesDesde,
        anioDesde,
        razon: `Aumento automático ${mesSeleccionado}`,
        aplicadoPor: "frontend",
      });

      // Recargar desde la API — es la única fuente de verdad
      await cargarMeses(contrato);
    } catch (error) {
      console.error("❌ Error confirmando aumento en la API", error);
      alert("No se pudo confirmar el aumento en el backend.");
      dispatch({ type: 'MODAL_AUMENTO_CERRAR' })
      return;
    }

    dispatch({ type: 'MODAL_AUMENTO_CERRAR' })

    toast({
      position: "top-right",
      duration: 4000,
      isClosable: true,
      render: () => (
        <Box
          p={4}
          bg="white"
          color="black"
          borderRadius="xl"
          boxShadow="xl"
          borderLeft="6px solid green"
        >
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">✅ Aumento aplicado</Text>
            <Text fontSize="sm">📅 {mesSeleccionado}</Text>
            <Text fontSize="sm">
              💰 Antes: {contrato.monedaMensual} {formatearMonto(montoAnterior)}
            </Text>
            <Text fontSize="sm">
              📈 Ahora: {contrato.monedaMensual} {formatearMonto(montoNuevo)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Índice aplicado: {indicePreview}%
            </Text>
            <Text fontSize="xs" color="gray.500">
              Honorarios Inmobiliaria: {contrato.honorarios}%
            </Text>
          </VStack>
        </Box>
      ),
    });
  };


  // Normalizar frecuencia para evitar problemas de mayúsculas/minúsculas/espacios
  const frecuenciaKey = (contrato.frecuenciaAumento || "").toString().toLowerCase().replace(/\s+/g, "");
  const frecuenciaMap = {
    mensual: 1,
    trimestral: 3,
    cuatrimestral: 4,
    semestral: 6,
    anual: 12,
  };
  const intervalo = frecuenciaMap[frecuenciaKey] || null;

  // 🔥 FECHA ACTUAL PARA DETERMINAR FUTURO
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-based (0=Enero)
  const currentYear = currentDate.getFullYear();

  return (
    <Box p={{ base: 4, md: 8 }} minH="100vh" bg={pageBg}>
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} mb={6}>
        <HStack spacing={3}>
          <Button
            variant="ghost"
            leftIcon={<Icon as={MdArrowBack} boxSize={5} />}
            onClick={() => navigate(-1)}
            color="gray.500"
            _hover={{ color: "gray.800", bg: "gray.100" }}
            px={2}
          />
          <Heading size="xl" color={headingColor}>
            Pagos del Contrato
          </Heading>
        </HStack>

        <HStack spacing={2} gap={2} flexWrap="wrap">
          <Tooltip label="Ver Contrato">
            <Button
              onClick={onOpenContratoModal}
              colorScheme="blue"
              variant="outline"
              size="sm"
            >
              <Icon as={MdVisibility} boxSize={4} />
            </Button>
          </Tooltip>
          <Tooltip label="Editar">
            <Button
              onClick={() => navigate(`/editar-contrato/${id}`)}
              colorScheme="orange"
              variant="outline"
              size="sm"
            >
              <Icon as={MdEdit} boxSize={4} />
            </Button>
          </Tooltip>
          <Tooltip label="Eliminar">
            <Button
              onClick={handleEliminarContrato}
              colorScheme="red"
              variant="outline"
              size="sm"
            >
              <Icon as={MdDelete} boxSize={4} />
            </Button>
          </Tooltip>
          <Tooltip label="Calculadora">
            <Button
              onClick={() => window.open('https://arquiler.com', '_blank')}
              colorScheme="teal"
              variant="outline"
              size="sm"
            >
              🧮
            </Button>
          </Tooltip>
          <Tooltip label="Variación de montos">
            <Button
              colorScheme="purple"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/contratos/${id}/variacion`)}
            >
              <Icon as={FiTrendingUp} boxSize={4} />
            </Button>
          </Tooltip>
        </HStack>
      </Flex>

      {/* Cards - Centered properly */}
      <SimpleGrid 
        columns={{ base: 1, md: 2, lg: 3 }} 
        spacing={6}
        maxW="1200px"
        mx="auto"
      >
                    {(() => {


                      return null;
                    })()}
            {meses.map((mes, index) => {
              const mesKey = `${mes.nombre} ${mes.año}`;
              const estado = estadosMeses[mesKey] || "pendiente";
              const alquilerPuro = Number(montosMeses[mesKey] || 0);
              const montoIva = calcularMontoIva(alquilerPuro, aplicaIva);
              const montoBaseConExtrasEIva = calcularMontoTotalMes(alquilerPuro, totalConceptosExtras, aplicaIva);
              const recargoInfo = calcularRecargoMora({
                mes,
                estado,
                diaPago: contrato.diaPago,
                tipoInteresMora: contrato.tipoInteresMora,
                valorInteresMora: contrato.valorInteresMora,
                montoBase: alquilerPuro,
              });
              const moraAplicadaInfo = morasPersistidas[mesKey] || morasAplicadas[mesKey] || obtenerInfoMoraAplicada(mes);
              const moraYaAplicada = Boolean(moraAplicadaInfo?.aplicada);
              const recargoMoraAplicado = Number(moraAplicadaInfo?.recargo || 0);
              const montoTotalMes = montoBaseConExtrasEIva + recargoMoraAplicado;
              const mesIndex = monthNameToIndex[mes.nombre];
              const isCurrentOrFuture =
                mes.año > currentYear ||
                (mes.año === currentYear && mesIndex >= currentMonth);

              // Mes anterior
              const mesAnterior = meses[index - 1];
              const cantidadAumentosActual = Array.isArray(mes.aumentos) ? mes.aumentos.length : 0;
              const cantidadAumentosAnterior = mesAnterior && Array.isArray(mesAnterior.aumentos)
                ? mesAnterior.aumentos.length
                : 0;

              // Mostrar botón solo en los meses de frecuencia
              const esMesDeAumento = intervalo && ((index - intervalo) % intervalo === 0) && (index - intervalo) >= 0 && isCurrentOrFuture;
              const aumentoAplicado = cantidadAumentosActual > cantidadAumentosAnterior;
              const tieneAumentoDeIndice = Array.isArray(mes.aumentos) && mes.aumentos
                .slice(cantidadAumentosAnterior)
                .some((a) => {
                  const tipo = (a.tipoAumento || a.tipo_aumento || "").toString().toLowerCase().trim();
                  return tipo !== "mora";
                });

              return (
                <Box
                  key={index}
                  bg="white"
                  p={8}
                  borderRadius="2xl"
                  shadow="lg"
                  borderWidth="1px"
                >
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading size="lg">
                    {mes.nombre} {mes.año}
                  </Heading>

                  <Badge
                    colorScheme={estado === "pagado" ? "green" : "red"}
                  >
                    {estado === "pagado"
                      ? "Pagado ✅"
                      : "No pagado ❌"}
                  </Badge>
                </Flex>


          {/* 💰 MONTO FINAL ARRIBA */}
          <Text fontSize="2xl" fontWeight="bold" mb={3}>
            {contrato.monedaMensual} {formatearMonto(montoTotalMes)}
          </Text>

          {/* 📊 GRID 3 Y 3 */}
          <SimpleGrid columns={2} spacing={4} mb={4}>

            {/* IZQUIERDA */}
            <VStack align="start" spacing={1}>
              {tieneAumentoDeIndice ? (
                <Text fontSize="sm" color="green.600">
                  <strong>Alquiler actualizado:</strong> {formatearMonto(alquilerPuro)}
                </Text>
              ) : (
                <Text fontSize="sm">
                  <strong>Alquiler:</strong> {formatearMonto(alquilerPuro)}
                </Text>
              )}

              {aplicaIva && (
                <Text fontSize="sm">
                  <strong>IVA(21%):</strong> {formatearMonto(montoIva)}
                </Text>
              )}

              {moraYaAplicada && (
                <Text fontSize="sm" color="red.600">
                  <strong>Mora:</strong> {formatearMonto(recargoMoraAplicado)}
                </Text>
              )}

              <Text fontSize="sm">
                <strong>Día de pago:</strong> {contrato.diaPago}
              </Text>

            </VStack>

            {/* DERECHA */}
            <VStack align="start" spacing={1}>
              <Text fontSize="sm">
                <strong>Tipo de aumento:</strong> {contrato.tipoAumento}
              </Text>

              <Text fontSize="sm">
                <strong>Frecuencia:</strong> {contrato.frecuenciaAumento ? capitalizar(contrato.frecuenciaAumento) : "-"}
              </Text>
            </VStack>

          </SimpleGrid>

                <Box
                  mt={2}
                  mb={2}
                  p={2}
                  bg="gray.50"
                  borderRadius="lg"
                  borderWidth="1px"
                >
                  <VStack align="stretch" spacing={1}>
                    <Text fontSize="2xs" fontWeight="bold" color="gray.700" lineHeight="1.1">
                      Conceptos extras
                    </Text>
                    {conceptosExtras.length > 0 ? (
                      <>
                        {conceptosExtras.map((item) => (
                          <Flex key={item.nombre} w="full" align="center" gap={1}>
                            <Text fontSize="xs" flex="1" minW="0" color="gray.700" lineHeight="1.1">
                              {item.nombre}: {contrato.monedaMensual} {formatearMonto(item.precio || 0)}
                            </Text>
                            <HStack spacing={1} ml="auto" flexShrink={0} justify="flex-end">
                              <Button
                                size="xs"
                                h="22px"
                                w="22px"
                                minW="22px"
                                p={0}
                                borderRadius="md"
                                variant="outline"
                                onClick={() => abrirModalConceptosExtras(item)}
                              >
                                ✏️
                              </Button>
                              <Button
                                size="xs"
                                h="22px"
                                w="22px"
                                minW="22px"
                                p={0}
                                borderRadius="md"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => eliminarConceptoExtra(item.nombre)}
                              >
                                🗑️
                              </Button>
                            </HStack>
                          </Flex>
                        ))}
                        <Flex justify="space-between" align="center" pt={1} mt={1} borderTop="1px solid" borderColor="gray.200">
                          <Text fontSize="xs" color="gray.600" fontWeight="semibold" lineHeight="1.1">
                            Total
                          </Text>
                          <Text fontSize="xs" color="gray.600" fontWeight="semibold" lineHeight="1.1">
                            {contrato.monedaMensual} {formatearMonto(totalConceptosExtras)}
                          </Text>
                        </Flex>
                      </>
                    ) : (
                      <Text fontSize="xs" color="gray.500">No hay conceptos extras cargados.</Text>
                    )}
                  </VStack>
                </Box>

                <HStack spacing={2} mb={3} align="center">
                  <Select
                    flex="1"
                    value={estado}
                    onChange={(e) => handleEstadoChange(mesKey, e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </Select>
                  {tieneAumentoDeIndice && (
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="green"
                      px={3}
                      flexShrink={0}
                      onClick={() => abrirDetalleAumento(mesKey, alquilerPuro)}
                    >
                      📈
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    px={3}
                    flexShrink={0}
                    onClick={() => abrirReciboModal(mesKey)}
                    title="Ver y descargar recibo"
                  >
                    🧾
                  </Button>
                </HStack>

                {esMesDeAumento && (
                  aumentoAplicado ? (
                    <Button
                      w="full"
                      bg="gray.400"
                      color="white"
                      disabled
                      mb={2}
                    >
                      Aplicado
                    </Button>
                  ) : (
                    <Button
                      w="full"
                      bg={estado === "pagado" ? "green.500" : "black"}
                      color="white"
                      _hover={estado === "pagado" ? {} : { bg: "gray.800" }}
                      onClick={() => abrirConfirmacion(mesKey)}
                      disabled={estado === "pagado" || aumentoAplicado}
                      mb={2}
                    >
                      {estado === "pagado" ? "Pagado" : "📈 Aplicar Aumento"}
                    </Button>
                  )
                )}

                {moraYaAplicada ? (
                  <>
                    <Box
                      w="full"
                      p={3}
                      bg="red.50"
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor="red.200"
                      mb={2}
                    >
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="bold" color="red.600">
                          Mora aplicada por {moraAplicadaInfo.diasAtraso} {moraAplicadaInfo.diasAtraso === 1 ? "día" : "días"}
                        </Text>
                        <Text fontSize="sm" color="red.600">
                          Valor: {contrato.monedaMensual} {formatearMonto(moraAplicadaInfo.recargo || 0)}
                        </Text>
                      </VStack>
                    </Box>

                    <Button
                      w="full"
                      bg="red.300"
                      color="white"
                      disabled
                      mb={2}
                      _disabled={{ opacity: 1, cursor: "not-allowed", bg: "red.300", color: "white" }}
                    >
                      ⚠️ Mora aplicada
                    </Button>
                  </>
                ) : (
                  verificarRecargo(
                    mes,
                    mesKey,
                    contrato.diaPago,
                    estadosMeses
                  ) && recargoInfo.diasAtraso > 0 && (
                    <Button
                      w="full"
                      bg="red.500"
                      color="white"
                      _hover={{ bg: "red.600" }}
                      onClick={() => abrirConfirmacionMora(mes, mesKey, estado, alquilerPuro)}
                    >
                      ⚠️ Aplicar Mora ({recargoInfo.diasAtraso} {recargoInfo.diasAtraso === 1 ? "día" : "días"})
                    </Button>
                  )
                )}
              </Box>
            );
          })}
        </SimpleGrid>

        {contrato && <PortalSection contratoId={contrato.id} />}

        {/* 🔥 MODAL */}
        <Modal isOpen={isOpen} onClose={() => dispatch({ type: 'MODAL_AUMENTO_CERRAR' })} isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Confirmar aumento</ModalHeader>
            <ModalCloseButton />

            <ModalBody>
              <VStack align="start" spacing={3}>
                <Text>
                  📅 <strong>{mesSeleccionado}</strong>
                </Text>

                <Text>
                  💰 Total antes: {contrato?.monedaMensual}{" "}
                  {formatearMonto(totalPreviewAnterior)}
                </Text>

                <Text>
                  📈 Total ahora: {contrato?.monedaMensual}{" "}
                  {formatearMonto(totalPreviewNuevo)}
                </Text>

              </VStack>

              <VStack align="start" spacing={1} mt={4}>
                <Text fontSize="sm" color="gray.600">
                  Alquiler base: {contrato?.monedaMensual} {formatearMonto(alquilerPreviewAnterior)} {"->"} {contrato?.monedaMensual} {formatearMonto(alquilerPreviewNuevo)}
                </Text>

                <Text fontSize="sm" color="gray.600">
                  Expensas y extras: {contrato?.monedaMensual} {formatearMonto(totalConceptosExtras)}
                </Text>

                {aplicaIva && (
                  <Text fontSize="sm" color="gray.600">
                    IVA (21%): {contrato?.monedaMensual} {formatearMonto(ivaPreviewAnterior)} {"->"} {contrato?.monedaMensual} {formatearMonto(ivaPreviewNuevo)}
                  </Text>
                )}

                {contrato?.tipoAumento?.toLowerCase() !== "monto_fijo" && (() => {
                  const tipoAum = contrato?.tipoAumento?.toLowerCase();
                  const esICL = tipoAum === "icl";
                  const esIpcReal = tipoAum === "ipc" && ipcMesesDetalle?.length > 0;
                  const esIclReal = tipoAum === "icl" && ipcMesesDetalle?.length > 0;
                  const esCP = tipoAum === "casa_propia" && ipcMesesDetalle?.length > 0;
                  const iclMensual = esICL && !esIclReal ? indicePreview / 12 : null;
                  const pctAcumulado = (esIpcReal || esIclReal || esCP)
                    ? Number(indicePreview).toFixed(2)
                    : esICL
                      ? (iclMensual * mesesPreview).toFixed(2)
                      : (((Math.pow(1 + indicePreview / 100, mesesPreview)) - 1) * 100).toFixed(2);

                  const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

                  return (
                    <Box mt={2} p={3} bg="blue.50" borderRadius="lg" borderLeft="4px solid" borderLeftColor="blue.400" w="100%">
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                          Detalle del índice acumulado
                        </Text>
                        {esCP ? (
                          ipcMesesDetalle.map((rec) => (
                            <Text key={`${rec.anio}-${rec.mes}`} fontSize="sm" color="blue.600">
                              Casa Propia {nombresMeses[rec.mes - 1]} {rec.anio}: {rec.nivel != null ? `${((Number(rec.nivel) - 1) * 100).toFixed(2)}%` : "Sin datos ⚠️"}
                            </Text>
                          ))
                        ) : esIpcReal ? (
                          ipcMesesDetalle.map((rec) => (
                            <Text key={`${rec.anio}-${rec.mes}`} fontSize="sm" color={rec.variacion == null ? "orange.500" : "blue.600"}>
                              IPC {nombresMeses[rec.mes - 1]} {rec.anio}: {rec.variacion != null ? `${Number(rec.variacion).toFixed(2)}%${rec.repetido ? ' *' : ''}` : "Sin datos ⚠️"}
                            </Text>
                          ))
                        ) : esIclReal ? (
                          ipcMesesDetalle.map((rec) => (
                            <Text key={`${rec.anio}-${rec.mes}`} fontSize="sm" color={rec.variacion == null ? "orange.500" : "blue.600"}>
                              ICL {nombresMeses[rec.mes - 1]} {rec.anio}: {rec.variacion != null ? `${Number(rec.variacion).toFixed(2)}%${rec.repetido ? ' *' : ''}` : "Sin datos ⚠️"}
                            </Text>
                          ))
                        ) : esICL ? (
                          <Text fontSize="sm" color="blue.600">
                            ICL anual: {indicePreview}% → mensual: {iclMensual.toFixed(4)}% · Período: {mesesPreview} {mesesPreview === 1 ? "mes" : "meses"}
                          </Text>
                        ) : (
                          <Text fontSize="sm" color="blue.600">
                            IPC mensual: {indicePreview}% · Período: {mesesPreview} {mesesPreview === 1 ? "mes" : "meses"}
                          </Text>
                        )}
                        <Text fontSize="sm" fontWeight="bold" color="blue.700">
                          % acumulado: {pctAcumulado}%
                        </Text>
                        {(esIpcReal || esIclReal) && ipcMesesDetalle.some((r) => r.repetido) && (
                          <Text fontSize="xs" color="orange.600" fontStyle="italic">
                            * Se repiten los valores del último mes disponible para completar el cálculo.
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  );
                })()}

                {contrato?.conceptosExtras?.length > 0 && (
                  <Text fontSize="sm" color="gray.600">
                    Conceptos Extras: {obtenerNombresConceptosExtras(contrato.conceptosExtras)}
                  </Text>
                )}

              </VStack>
            </ModalBody>

            <ModalFooter justifyContent="space-between">
              <Button
                bg="black"
                _hover={{ bg: "gray.800" }}
                color="white"
                title="Calculadora de alquileres"
                onClick={() => window.open('https://arquiler.com', '_blank')}
              >
                🧮
              </Button>

              <Flex gap={3}>
                <Button onClick={() => dispatch({ type: 'MODAL_AUMENTO_CERRAR' })} bg="black" _hover={{ bg: "gray.800" }} color="white">
                  Cancelar
                </Button>
                <Button onClick={confirmarAumento} bg="black" _hover={{ bg: "gray.800" }} color="white">
                  Confirmar
                </Button>
              </Flex>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={isMoraModalOpen} onClose={() => dispatch({ type: 'MODAL_MORA_CERRAR' })} isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Confirmar mora</ModalHeader>
            <ModalCloseButton />

            <ModalBody>
              {moraPreview && (
                <VStack align="start" spacing={3}>
                  <Text>
                    📅 <strong>{moraPreview.mesKey}</strong>
                  </Text>
                  <Text>
                    ⏳ Días de atraso: <strong>{moraPreview.diasAtraso}</strong>
                  </Text>
                  <Text>
                    💰 Monto actual: {contrato?.monedaMensual} {formatearMonto(moraPreview.montoBase)}
                  </Text>
                  <Text>
                    🧮 Recargo por día: {contrato?.monedaMensual} {formatearMonto(moraPreview.recargoPorDia)}
                  </Text>
                  <Text>
                    ⚠️ Recargo acumulado: {contrato?.monedaMensual} {formatearMonto(moraPreview.recargo)}
                  </Text>
                  <Text>
                    📈 Total con mora: {contrato?.monedaMensual} {formatearMonto(moraPreview.totalConMora)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Fórmula: {normalizarTipoInteresMora(contrato.tipoInteresMora) === "fijo"
                      ? `${contrato.monedaMensual} ${formatearMonto(contrato.valorInteresMora)} por día`
                      : `${moraPreview.diasAtraso} ${moraPreview.diasAtraso === 1 ? "día" : "días"} x ${contrato.valorInteresMora}% del valor mensual por día`}
                  </Text>
                </VStack>
              )}
            </ModalBody>

            <ModalFooter>
              <Button mr={3} onClick={() => dispatch({ type: 'MODAL_MORA_CERRAR' })} bg="black" _hover={{ bg: "gray.800" }} color="white">
                Cancelar
              </Button>
              <Button onClick={confirmarMora} bg="red.500" _hover={{ bg: "red.600" }} color="white">
                Confirmar mora
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={isExtrasModalOpen} onClose={() => dispatch({ type: 'MODAL_EXTRAS_CERRAR' })} isCentered size="lg">
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Editar concepto extra</ModalHeader>
            <ModalCloseButton />

            <ModalBody>
              <VStack spacing={4} align="stretch">
                {conceptoExtraEditando ? (
                  <FormControl isInvalid={hayErroresConceptosExtras}>
                    <FormLabel>{conceptoExtraEditando.nombre}</FormLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={conceptoExtraEditando.precio}
                      onChange={(e) => handleConceptoExtraChange(e.target.value)}
                    />
                    <FormErrorMessage>Ingresá un valor numérico válido.</FormErrorMessage>
                  </FormControl>
                ) : (
                  <Text color="gray.500">No hay conceptos extras para editar.</Text>
                )}
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button mr={3} variant="ghost" onClick={() => dispatch({ type: 'MODAL_EXTRAS_CERRAR' })}>
                Cancelar
              </Button>
              <Button bg="black" _hover={{ bg: "gray.800" }} color="white" onClick={guardarConceptosExtras} isDisabled={!conceptoExtraEditando || hayErroresConceptosExtras}>
                Guardar cambios
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal detalle aumento (solo lectura) */}
        <Modal isOpen={isDetalleAumentoModalOpen} onClose={() => dispatch({ type: 'MODAL_DETALLE_AUMENTO_CERRAR' })} isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Detalle del aumento</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {detalleAumentoData && (() => {
                const { mesKey, montoAnterior, montoNuevo, ipcMeses, pctAcumulado, indexType = "IPC" } = detalleAumentoData;
                const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                const montoAnteriorRedondeado = aplicarRedondeo(montoAnterior);
                const montoNuevoRedondeado = aplicarRedondeo(montoNuevo);
                const totalAnterior = calcularMontoTotalMes(montoAnteriorRedondeado, totalConceptosExtras, aplicaIva);
                const totalNuevo = calcularMontoTotalMes(montoNuevoRedondeado, totalConceptosExtras, aplicaIva);
                const hayRepetidos = ipcMeses.some((r) => r.repetido);

                return (
                  <VStack align="start" spacing={3}>
                    <Text>📅 <strong>{mesKey}</strong></Text>
                    <Text>💰 Total antes: {contrato.monedaMensual} {formatearMonto(totalAnterior)}</Text>
                    <Text>📈 Total ahora: {contrato.monedaMensual} {formatearMonto(totalNuevo)}</Text>

                    <VStack align="start" spacing={1} w="full">
                      <Text fontSize="sm" color="gray.600">
                        Alquiler base: {contrato.monedaMensual} {formatearMonto(montoAnteriorRedondeado)} {"->"} {contrato.monedaMensual} {formatearMonto(montoNuevoRedondeado)}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Expensas y extras: {contrato.monedaMensual} {totalConceptosExtras > 0 ? formatearMonto(totalConceptosExtras) : "-"}
                      </Text>
                      {aplicaIva && (
                        <Text fontSize="sm" color="gray.600">
                          IVA (21%): {contrato.monedaMensual} {formatearMonto(calcularMontoIva(montoAnteriorRedondeado, true))} {"->"} {contrato.monedaMensual} {formatearMonto(calcularMontoIva(montoNuevoRedondeado, true))}
                        </Text>
                      )}

                      <Box mt={2} p={3} bg="blue.50" borderRadius="lg" borderLeft="4px solid" borderLeftColor="blue.400" w="100%">
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                            Detalle del índice acumulado
                          </Text>
                          {ipcMeses.map((rec) => (
                            <Text key={`${rec.anio}-${rec.mes}`} fontSize="sm" color={rec.variacion == null ? "orange.500" : "blue.600"}>
                              {indexType} {nombresMeses[rec.mes - 1]} {rec.anio}: {rec.variacion != null ? `${Number(rec.variacion).toFixed(2)}%${rec.repetido ? ' *' : ''}` : "Sin datos ⚠️"}
                            </Text>
                          ))}
                          <Text fontSize="sm" fontWeight="bold" color="blue.700">
                            % acumulado: {pctAcumulado.toFixed(2)}%
                          </Text>
                          {hayRepetidos && (
                            <Text fontSize="xs" color="orange.600" fontStyle="italic">
                              * Se repiten los valores del último mes disponible para completar el cálculo.
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    </VStack>
                  </VStack>
                );
              })()}
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => dispatch({ type: 'MODAL_DETALLE_AUMENTO_CERRAR' })} bg="black" _hover={{ bg: "gray.800" }} color="white">
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal recibo (placeholder) */}
        <Modal isOpen={Boolean(isReciboModalOpen)} onClose={() => dispatch({ type: 'MODAL_RECIBO_CERRAR' })} isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl">
            <ModalHeader>Recibo</ModalHeader>
            <ModalCloseButton />
            <ModalBody />
            <ModalFooter>
              <Button onClick={() => dispatch({ type: 'MODAL_RECIBO_CERRAR' })} bg="black" _hover={{ bg: "gray.800" }} color="white">
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Suspense fallback={<LoadingSpinner />}>
          <ContratoCompleto isOpen={isContratoModalOpen} onClose={onCloseContratoModal} contratoId={contrato.id} />
        </Suspense>

        {/* Modal de vista previa y descarga de recibo */}
        <Modal
          isOpen={isReciboModalOpen}
          onClose={() => dispatch({ type: 'MODAL_RECIBO_CERRAR' })}
          size="2xl"
          isCentered
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader borderBottomWidth="1px">Vista previa del recibo</ModalHeader>
            <ModalCloseButton />
            <ModalBody py={4}>
              <Flex justify="center" mb={4}>
                <Select
                  value={tipoRecibo}
                  onChange={(e) => dispatch({ type: 'TIPO_RECIBO_SET', payload: { tipoRecibo: e.target.value } })}
                  width="200px"
                >
                  <option value="inquilino">Inquilino</option>
                  <option value="propietario">Propietario</option>
                </Select>
              </Flex>
              {(() => {
                if (!mesKeyRecibo || !contrato) return null;
                const [nombreMes, anio] = mesKeyRecibo.split(" ");
                const montoAlquiler = Number(montosMeses[mesKeyRecibo] || contrato.valorMensual || 0);
                const conceptosExtras = normalizarConceptosExtras(contrato.conceptosExtras);
                const totalExtras = calcularTotalConceptosExtras(conceptosExtras);
                const honorariosPct = Number(contrato.honorarios || 0);
                const montoHonorarios = montoAlquiler * honorariosPct / 100;
                const subtotal = montoAlquiler + totalExtras;
                const totalPropietario = subtotal - montoHonorarios;
                const moraAplicadaInfoPreview = leerMorasAplicadasStorage(contrato.id)[mesKeyRecibo] || morasAplicadas[mesKeyRecibo];
                const recargoMoraPreview = Number(moraAplicadaInfoPreview?.recargo || 0);
                const diasAtrasoPreview = moraAplicadaInfoPreview?.diasAtraso ?? 0;
                const totalInquilino = montoAlquiler + totalExtras + recargoMoraPreview;

                const fmt = (n) => Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                const direccionCompleta = [
                  contrato.direccion,
                  contrato.piso ? `Piso ${contrato.piso}` : null,
                  contrato.departamento ? `Dpto. ${contrato.departamento}` : null,
                ].filter(Boolean).join(' ');

                const fechaInicio = contrato.fechaInicio
                  ? new Date(contrato.fechaInicio + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
                  : '';

                const DOTS = '…………………………………………………………………………………………………………………………………………………………………';

                const LineaDetalle = ({ label, valor, negrita }) => (
                  <Box
                    display="flex"
                    fontFamily="'Courier New', Courier, monospace"
                    fontSize="xs"
                    lineHeight="1.7"
                    fontWeight={negrita ? 'bold' : 'normal'}
                  >
                    <Box flex="1" overflow="hidden" whiteSpace="nowrap">
                      {label}{DOTS}
                    </Box>
                    <Box flexShrink={0} pl={2} minW="100px" textAlign="right">
                      {valor}
                    </Box>
                  </Box>
                );

                return (
                  <Box
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="md"
                    p={6}
                    fontSize="xs"
                    boxShadow="sm"
                  >
                    {/* Encabezado centrado */}
                    <Box textAlign="center" mb={4}>
                      <img src="/logo_inmo.jpeg" alt="Logo inmobiliaria" style={{ height: "80px", display: "block", margin: "0 auto 12px auto" }} />
                      <Text fontWeight="bold" fontSize="sm" mb={1}>INMOBILIARIA GIORDANO CONTI</Text>
                      <Text>Mártires Riocuartenses N° 1395 – X5800 – Rio Cuarto – Córdoba.</Text>
                      <Text>9 de Julio Nº 483-x6125-Serrano-Córdoba.</Text>
                      <Text>Tel: 358 4864404 o 3385 465877 - E-Mail: inmobiliariagiordanoconti@gmail.com</Text>
                    </Box>

                    <Box borderTop="1px solid" borderColor="gray.400" mb={4} />

                    {/* Párrafo cuerpo */}
                    {tipoRecibo === 'inquilino' ? (
                      <Text mb={4} lineHeight="1.8" textAlign="justify">
                        Recibo del Sr./Sra. <strong>{contrato.inquilinoNombre?.toUpperCase()}</strong>, DNI N°{' '}
                        {contrato.inquilinoDni}, TEL N° {contrato.inquilinoTelefono || '—'}, de la ciudad de{' '}
                        {contrato.localidad}, provincia de {contrato.provincia} la suma de pesos:{' '}
                        <strong>{montoALetras(montoAlquiler)} ($ {fmt(montoAlquiler)})</strong>, por cuenta y orden de
                        terceros, conforme contrato de locación con fecha {fechaInicio}, con relación al inmueble
                        ubicado en {direccionCompleta}, en concepto de:
                      </Text>
                    ) : (
                      <Text mb={4} lineHeight="1.8" textAlign="justify">
                        Recibo del Sr./Sra. <strong>{contrato.inquilinoNombre?.toUpperCase()}</strong>, DNI N°{' '}
                        {contrato.inquilinoDni}, TEL N° {contrato.inquilinoTelefono || '—'}, de la ciudad de{' '}
                        {contrato.localidad}, provincia de {contrato.provincia} la suma de pesos:{' '}
                        <strong>{montoALetras(montoAlquiler)} ($ {fmt(montoAlquiler)})</strong>, por cuenta y orden de
                        terceros, conforme contrato de locación con fecha {fechaInicio}, con relación al inmueble
                        ubicado en {direccionCompleta}, en concepto de:
                      </Text>
                    )}

                    {/* Líneas de detalle */}
                    <Box>
                      <LineaDetalle
                        label={`-ALQUILER ${nombreMes.toUpperCase()} ${anio}`}
                        valor={`$ ${fmt(montoAlquiler)}`}
                      />
                      {conceptosExtras.map((item, i) => (
                        <LineaDetalle
                          key={i}
                          label={`-${item.nombre.toUpperCase()}`}
                          valor={Number(item.precio) > 0 ? `$ ${fmt(item.precio)}` : 'Abona Inquilino'}
                        />
                      ))}
                      {tipoRecibo === 'inquilino' && recargoMoraPreview > 0 && (
                        <LineaDetalle
                          label={`-MORA (${diasAtrasoPreview} días x ${contrato.valorInteresMora}%)`}
                          valor={`$ ${fmt(recargoMoraPreview)}`}
                        />
                      )}
                      <Box borderTop="1px solid" borderColor="gray.300" my={1} />
                      <LineaDetalle
                        label="SUBTOTAL"
                        valor={`$ ${fmt(tipoRecibo === 'inquilino' ? totalInquilino : subtotal)}`}
                      />
                      {tipoRecibo === 'inquilino' && (
                        <LineaDetalle label="-DESCUENTO" valor="" />
                      )}
                      {tipoRecibo === 'propietario' && (
                        <LineaDetalle
                          label={`-GTOS ADMINIST. ${honorariosPct}%`}
                          valor={`$ ${fmt(montoHonorarios)}`}
                        />
                      )}
                      <Box borderTop="1px solid" borderColor="gray.300" my={1} />
                      <LineaDetalle
                        label="TOTAL"
                        valor={`$ ${fmt(tipoRecibo === 'inquilino' ? totalInquilino : totalPropietario)}`}
                        negrita
                      />
                    </Box>

                    <Box borderTop="1px solid" borderColor="gray.400" mt={5} mb={3} />
                    <Text fontWeight="bold">
                      Recibí Conforme:{' '}
                      {tipoRecibo === 'inquilino'
                        ? 'PAGO RECIBIDO MEDIANTE TRANSFERENCIA BANCARIA'
                        : 'PAGO REALIZADO MEDIANTE TRANSFERENCIA BANCARIA'}
                    </Text>
                  </Box>
                );
              })()}
            </ModalBody>
            <ModalFooter gap={2}>
              <Button variant="ghost" onClick={() => dispatch({ type: 'MODAL_RECIBO_CERRAR' })}>
                Cancelar
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleDescargarRecibo}
                isLoading={isDescargandoRecibo}
                loadingText="Generando..."
              >
                Descargar Word
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDescargarPdf}
                isLoading={isDescargandoPdf}
                loadingText="Generando..."
              >
                Descargar PDF
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal de confirmación de eliminación */}
        <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirmar Eliminación</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="start">
                <Text>¿Estás seguro de que querés eliminar este contrato?</Text>
                <Text fontWeight="bold" color="red.500">
                  {capitalizar(contrato.tipoPropiedad || "Propiedad")} - {contrato.localidad}, {contrato.provincia}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Inquilino: {capitalizar(contrato.inquilinoNombre)}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Esta acción no se puede deshacer.
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
                Cancelar
              </Button>
              <Button colorScheme="red" onClick={confirmarEliminacion}>
                Eliminar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </Box>
  );
}