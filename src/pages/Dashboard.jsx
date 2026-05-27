

import { Box, Stat, StatLabel, StatNumber, Heading, useColorModeValue, Text, VStack, HStack, SimpleGrid, Card, CardBody } from "@chakra-ui/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import ContractStatCard from "../components/ContractStatCard";
import CardContrato from "../components/CardContrato";
import { getContratos } from "../api/contratos";
import { generarMeses } from "../utils/generarMeses";
import formatearMonto from "../utils/formatearMonto";
import capitalizar from "../utils/capitalizar";
import {
  calcularTotalConceptosExtrasContrato as calcularTotalConceptosExtras,
  calcularMontoIvaContrato as calcularMontoIva,
} from "../utils/conceptosExtras";

const calcularMontoMensualDashboard = (contrato, alquilerBase) => {
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

const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [totalPaidManual, setTotalPaidManual] = useState(0);

  const loadContracts = useCallback(async () => {
    try {
      const data = await getContratos({ page_size: 200 })
      const contractsList = data.results || data
      const enrichedContracts = contractsList.map(enriquecerContrato)
      setContracts(enrichedContracts)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const handleContractsUpdated = useCallback((e) => {
    if (e.detail && e.detail.monto && e.detail.mes && e.detail.anio) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      // Solo sumar si es el mes actual
      const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      if (
        (typeof e.detail.mes === "number" && e.detail.mes === currentMonth) ||
        (typeof e.detail.mes === "string" && monthNames[currentMonth] === e.detail.mes)
      ) {
        if (e.detail.anio === currentYear) {
          setTotalPaidManual(prev => prev + Number(e.detail.monto));
        }
      }
    } else {
      // Si no hay detalle, recargar contratos y resetear suma manual
      loadContracts();
      setTotalPaidManual(0);
    }
  }, [loadContracts])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContracts()
  }, [loadContracts])

  useEffect(() => {
    window.addEventListener("contractsUpdated", handleContractsUpdated)
    return () => window.removeEventListener("contractsUpdated", handleContractsUpdated)
  }, [handleContractsUpdated])

  const today = new Date();

  const activeContracts = useMemo(() => {
    const now = new Date()
    return contracts.filter(c =>
      new Date(c.fechaInicio) <= now &&
      new Date(c.fechaFin) >= now
    )
  }, [contracts])

  const { totalStipulated, totalPaid } = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    let totalStipulated = 0;
    let totalPaid = 0;
    activeContracts.forEach(c => {
      const meses = generarMeses(c.fechaInicio, c.fechaFin);
      const mesActual = meses.find(m => m.mes === month && m.año === year);
      if (mesActual) {
        let estado = "pendiente";
        if (c.estadosMeses && typeof c.estadosMeses === "object") {
          const key = `${mesActual.nombre} ${mesActual.año}`;
          estado = c.estadosMeses[key] || "pendiente";
        }
        let alquilerBase = c.valorMensual;
        if (c.montosMeses && typeof c.montosMeses === "object") {
          const key = `${mesActual.nombre} ${mesActual.año}`;
          alquilerBase = c.montosMeses[key] || c.valorMensual;
        }
        const monto = calcularMontoMensualDashboard(c, alquilerBase);
        totalStipulated += Number(monto);
        if (estado === "pagado") {
          totalPaid += Number(monto);
        }
      }
    });
    return { totalStipulated, totalPaid };
  }, [activeContracts])

  // Sumar pagos manuales (reactivo)
  const totalPaidFinal = totalPaid + totalPaidManual;

  // Honorarios del mes
  const totalHonorarios = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    let total = 0
    activeContracts.forEach(c => {
      const meses = generarMeses(c.fechaInicio, c.fechaFin)
      const mesActual = meses.find(m => m.mes === month && m.año === year)
      if (mesActual) {
        const honorariosPct = Number(c.honorarios || 0)
        const alquilerBase = Number(c.valorMensual || 0)
        total += (alquilerBase * honorariosPct) / 100
      }
    })
    return total
  }, [activeContracts])

  // ✅ activos
  const active = activeContracts.length;

  // ⚠️ por vencer (próximos 30 días)
  const expiringContracts = useMemo(() => {
    const now = new Date()
    return contracts.filter(c => {
      const start = new Date(c.fechaInicio);
      const end = new Date(c.fechaFin);
      const diff = (end - now) / (1000 * 60 * 60 * 24);
      return start <= now && end >= now && diff <= 30;
    })
  }, [contracts])
  const expiring = expiringContracts.length;

  // ❌ vencidos
  const expired = useMemo(() => {
    const now = new Date()
    return contracts.filter(c => new Date(c.fechaFin) < now).length
  }, [contracts])

  // === CONTRATOS QUE REQUIEREN AUMENTO EL PRÓXIMO MES ===
  const contractsToIncreaseNextMonth = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return activeContracts.filter((c) => {
      if (now.getDate() < 15) return false
      if (!c.frecuenciaAumento) return false

      const frecuenciaKey = (c.frecuenciaAumento || "").toLowerCase().replace(/\s+/g, "")
      const intervalo = { mensual:1, trimestral:3, cuatrimestral:4, semestral:6, anual:12 }[frecuenciaKey]
      if (!intervalo) return false

      const fechaInicio = new Date(c.fechaInicio + "T00:00:00")
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear

      const mesesTranscurridos =
        (nextYear - fechaInicio.getFullYear()) * 12 +
        (nextMonth - fechaInicio.getMonth())

      if (mesesTranscurridos <= 0) return false

      const leToca = mesesTranscurridos % intervalo === 0
      if (!leToca) return false

      const mesProximo = c.mes_proximo
      if (mesProximo && mesProximo.mes === nextMonth && mesProximo.anio === nextYear) {
        return !mesProximo.aumento_aplicado
      }

      return true
    })
  }, [activeContracts])

  const bgColor = useColorModeValue("gray.100", "gray.900")
  const cardBg = useColorModeValue("white", "gray.750")
  const textColor = useColorModeValue("gray.800", "white")

  return (
    <Box
      p={{ base: 4, md: 8 }}
      minH="100vh"
      bg={bgColor}
    >
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <Heading size="xl" color={textColor}>
            Panel de Control
          </Heading>
          <Text color="gray.600" mt={2}>
            Resumen general de tus contratos y estadísticas
          </Text>
        </Box>
        {/* === RESUMEN DEL MES ACTUAL === */}
        <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
          <CardBody p={6}>
            <Heading size="md" mb={6} color={textColor}>
              Resumen del Mes
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={6}>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Mes actual</StatLabel>
                <StatNumber fontSize="xl" fontWeight="bold">
                  {capitalizar(today.toLocaleString("es-AR", { month: "long", year: "numeric" }))}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Total estipulado</StatLabel>
                <StatNumber color="blue.600" fontSize="xl" fontWeight="bold">
                  ${formatearMonto(totalStipulated)}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Total pagado</StatLabel>
                <StatNumber color="green.600" fontSize="xl" fontWeight="bold">
                  ${formatearMonto(totalPaidFinal)}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Pendiente</StatLabel>
                <StatNumber color="red.600" fontSize="xl" fontWeight="bold">
                  ${formatearMonto(totalStipulated - totalPaidFinal)}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.600">Honorarios</StatLabel>
                <StatNumber color="purple.600" fontSize="xl" fontWeight="bold">
                  ${formatearMonto(totalHonorarios)}
                </StatNumber>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>
        {/* Contract Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          <ContractStatCard
            label="Contratos Activos"
            count={active}
            color="green.500"
          />

          <ContractStatCard
            label="Por Vencer"
            count={expiring}
            color="yellow.400"
          />

          <ContractStatCard
            label="Vencidos"
            count={expired}
            color="red.500"
          />
        </SimpleGrid>

        {/* Expiring Contracts Section */}
        {expiringContracts.length > 0 && (
          <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
            <CardBody p={6}>
              <HStack justify="space-between" mb={4}>
                <Heading size="md" color="yellow.600">
                  Contratos por Expirar
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Próximos 30 días
                </Text>
              </HStack>
              <VStack spacing={4} align="stretch">
                {expiringContracts.map(c => (
                  <CardContrato key={c.id} contrato={c} />
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Contracts Requiring Increase Next Month Section */}
        <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
          <CardBody p={6}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md" color="orange.600">
                Próximos Aumentos
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Para el próximo mes (con 15 días de antelación)
              </Text>
            </HStack>
            {contractsToIncreaseNextMonth.length > 0 ? (
              <VStack spacing={4} align="stretch">
                {contractsToIncreaseNextMonth.map((c) => (
                  <CardContrato key={c.id} contrato={c} />
                ))}
              </VStack>
            ) : (
              <Box
                p={8}
                textAlign="center"
                bg="orange.50"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="orange.200"
              >
                <Text color="gray.500">
                  No hay contratos para aumentar el próximo mes
                </Text>
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default Dashboard;
