import {
  Box,
  VStack,
  Heading,
  Text,
  Card,
  CardBody,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import CardContrato from "../components/CardContrato";
import { getContratos } from "../api/contratos";
import { generarMeses } from "../utils/generarMeses";
import formatearMonto from "../utils/formatearMonto";
import capitalizar from "../utils/capitalizar";
import {
  calcularTotalConceptosExtrasContrato as calcularTotalConceptosExtras,
  calcularMontoIvaContrato as calcularMontoIva,
} from "../utils/conceptosExtras";

const calcularMontoMensual = (contrato, alquilerBase) => {
  const extras = calcularTotalConceptosExtras(contrato);
  const iva = calcularMontoIva(alquilerBase, contrato);
  return Number(alquilerBase || 0) + extras + iva;
};

const enriquecerContrato = (contrato) => {
  const mesActual = contrato.mes_actual
  if (!mesActual) return { ...contrato, estadosMeses: {}, montosMeses: {} }

  const key = `${mesActual.nombreMes} ${mesActual.anio}`
  return {
    ...contrato,
    estadosMeses: { [key]: mesActual.estado },
    montosMeses: { [key]: mesActual.montoFinal || contrato.valorMensual },
    mesesApi: [mesActual],
  }
};

const Pendientes = () => {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPendiente, setTotalPendiente] = useState(0);

  const bgColor = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.750");
  const textColor = useColorModeValue("gray.800", "white");

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const mesNombre = capitalizar(
    today.toLocaleString("es-AR", { month: "long", year: "numeric" })
  );

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getContratos({ page_size: 200 });
      const lista = data.results || data;

      // Solo contratos activos
      const activos = lista.filter(
        (c) => new Date(c.fechaInicio) <= today && new Date(c.fechaFin) >= today
      );

      const enriquecidos = activos.map(enriquecerContrato);

      // Filtrar los que tienen el mes actual en "pendiente"
      const conPendiente = enriquecidos.filter((c) => {
        const meses = generarMeses(c.fechaInicio, c.fechaFin);
        const mesActual = meses.find((m) => m.mes === currentMonth && m.año === currentYear);
        if (!mesActual) return false;
        const key = `${mesActual.nombre} ${mesActual.año}`;
        const estado = c.estadosMeses?.[key] || "pendiente";
        return estado === "pendiente";
      });

      // Calcular total pendiente
      let total = 0;
      conPendiente.forEach((c) => {
        const meses = generarMeses(c.fechaInicio, c.fechaFin);
        const mesActual = meses.find((m) => m.mes === currentMonth && m.año === currentYear);
        if (mesActual) {
          const key = `${mesActual.nombre} ${mesActual.año}`;
          const base = c.montosMeses?.[key] || c.valorMensual || 0;
          total += calcularMontoMensual(c, base);
        }
      });

      setPendientes(conPendiente);
      setTotalPendiente(total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();

    const handleUpdate = () => cargar();
    window.addEventListener("contractsUpdated", handleUpdate);
    return () => window.removeEventListener("contractsUpdated", handleUpdate);
  }, []);

  return (
    <Box p={{ base: 4, md: 8 }} minH="100vh" bg={bgColor}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <Heading size="xl" color={textColor}>
            Pendientes de Pago
          </Heading>
          <Text color="gray.600" mt={2}>
            Contratos activos que aún no pagaron en {mesNombre}
          </Text>
        </Box>

        {/* Resumen */}
        <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
          <CardBody p={6}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Contratos pendientes</StatLabel>
                <StatNumber fontSize="2xl" fontWeight="bold" color="red.500">
                  {loading ? "..." : pendientes.length}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Total a cobrar</StatLabel>
                <StatNumber fontSize="2xl" fontWeight="bold" color="red.600">
                  {loading ? "..." : `$${formatearMonto(totalPendiente)}`}
                </StatNumber>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Lista */}
        {loading ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" color="blue.500" />
            <Text mt={4} color="gray.500">Cargando contratos...</Text>
          </Box>
        ) : pendientes.length === 0 ? (
          <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
            <CardBody p={10} textAlign="center">
              <Text fontSize="lg" color="green.500" fontWeight="semibold">
                ¡Todo al día!
              </Text>
              <Text color="gray.500" mt={2}>
                No hay contratos pendientes de pago este mes.
              </Text>
            </CardBody>
          </Card>
        ) : (
          <VStack spacing={4} align="stretch">
            {pendientes.map((c) => (
              <CardContrato key={c.id} contrato={c} />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default Pendientes;
