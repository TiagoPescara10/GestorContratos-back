import { useEffect, useState } from "react"
import {
  Box, Heading, Text, SimpleGrid, VStack,
  Spinner, Center, useColorModeValue
} from "@chakra-ui/react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { getContratos, getMeses } from "../api/contratos"
import formatearMonto from "../utils/formatearMonto"
import capitalizar from "../utils/capitalizar"

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function Finanzas() {
  const [loading, setLoading] = useState(true)
  const [contratos, setContratos] = useState([])
  const [mesesData, setMesesData] = useState([])

  const bgCard = useColorModeValue("white", "gray.800")
  const borderColor = useColorModeValue("gray.200", "gray.600")
  const bgMetrica = useColorModeValue("gray.50", "gray.700")
  const gridStroke = useColorModeValue("#f0f0f0", "#2d3748")

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  useEffect(() => {
    const controller = new AbortController()
    const cargar = async () => {
      try {
        const data = await getContratos({ page_size: 200 })
        const lista = data.results || data
        const activos = lista.filter(c =>
          new Date(c.fechaInicio) <= today && new Date(c.fechaFin) >= today
        )
        setContratos(activos)

        const mesesResults = await Promise.allSettled(
          activos.map(c => getMeses(c.id).then(m => ({ contrato: c, meses: m })))
        )
        const mesesPorContrato = mesesResults
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)

        const grafico = []
        for (let i = 11; i >= 0; i--) {
          const fecha = new Date(currentYear, currentMonth - i, 1)
          const mes = fecha.getMonth()
          const anio = fecha.getFullYear()

          let estipulado = 0
          let cobrado = 0
          let honorarios = 0

          mesesPorContrato.forEach(({ contrato, meses }) => {
            const estadoMes = meses.find(m => m.mes === mes && m.anio === anio)
            if (!estadoMes) return
            const monto = Number(estadoMes.montoFinal || estadoMes.montoBase || 0)
            const mora = Number(estadoMes.recargo_mora || 0)
            const montoSinMora = monto - mora
            estipulado += montoSinMora
            if (estadoMes.estado === "pagado") cobrado += montoSinMora
            honorarios += (Number(contrato.valorMensual || 0) * Number(contrato.honorarios || 0)) / 100
          })

          grafico.push({
            label: `${MESES_NOMBRES[mes].slice(0, 3)} ${anio}`,
            estipulado: Math.round(estipulado),
            cobrado: Math.round(cobrado),
            honorarios: Math.round(honorarios),
          })
        }

        if (!controller.signal.aborted) setMesesData(grafico)
      } catch (e) {
        if (!controller.signal.aborted) console.error(e)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    cargar()
    return () => controller.abort()
  }, [])

  if (loading) return <Center minH="100vh"><Spinner size="xl" color="purple.400" /></Center>

  const mesActualData = mesesData[mesesData.length - 1] || {}
  const totalEstipulado = mesActualData.estipulado || 0
  const totalCobrado = mesActualData.cobrado || 0
  const totalPendiente = totalEstipulado - totalCobrado
  const totalHonorarios = mesActualData.honorarios || 0
  const pctCobrado = totalEstipulado > 0 ? ((totalCobrado / totalEstipulado) * 100).toFixed(0) : 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <Box bg={bgCard} border="0.5px solid" borderColor={borderColor} borderRadius="md" px={3} py={2} shadow="sm">
        <Text fontSize="sm" fontWeight="500" mb={1}>{label}</Text>
        {payload.map(p => (
          <Text key={p.name} fontSize="sm" color={p.color}>
            {p.name}: ${Number(p.value).toLocaleString("es-AR")}
          </Text>
        ))}
      </Box>
    )
  }

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1200px" mx="auto">
      <VStack align="stretch" spacing={6}>

        <Box>
          <Heading size="lg">Finanzas</Heading>
          <Text color="gray.500" fontSize="sm" mt={1}>
            {capitalizar(today.toLocaleString("es-AR", { month: "long", year: "numeric" }))}
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
          {[
            { label: "Total estipulado", valor: `$${formatearMonto(totalEstipulado)}`, color: "blue.600" },
            { label: "Total cobrado", valor: `$${formatearMonto(totalCobrado)}`, color: "green.600" },
            { label: "Pendiente", valor: `$${formatearMonto(totalPendiente)}`, color: "red.500" },
            { label: "Honorarios", valor: `$${formatearMonto(totalHonorarios)}`, color: "purple.600" },
            { label: "% cobrado", valor: `${pctCobrado}%`, color: pctCobrado >= 80 ? "green.600" : "orange.500" },
          ].map(m => (
            <Box key={m.label} bg={bgCard} border="0.5px solid" borderColor={borderColor} borderRadius="lg" p={5} shadow="sm">
              <Text fontSize="12px" color="gray.600" mb={1}>{m.label}</Text>
              <Text fontSize="20px" fontWeight="700" color={m.color}>{m.valor}</Text>
            </Box>
          ))}
        </SimpleGrid>

        <Box bg={bgCard} border="0.5px solid" borderColor={borderColor} borderRadius="lg" p={5}>
          <Text fontSize="sm" fontWeight="500" color="gray.500" mb={4}>
            Evolución últimos 12 meses
          </Text>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mesesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#888" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="estipulado" name="Estipulado" fill="#378ADD" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cobrado" name="Cobrado" fill="#1D9E75" radius={[3, 3, 0, 0]} />
              <Bar dataKey="honorarios" name="Honorarios" fill="#7F77DD" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>

      </VStack>
    </Box>
  )
}
