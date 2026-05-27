import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Box, Heading, Text, Button, Spinner, Center,
  SimpleGrid, HStack, Icon
} from "@chakra-ui/react"
import { FiArrowLeft, FiTrendingUp } from "react-icons/fi"
import { getContrato, getMeses } from "../api/contratos"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts"

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function VariacionContrato() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contrato, setContrato] = useState(null)
  const [datosMeses, setDatosMeses] = useState([])
  const [loading, setLoading] = useState(true)

  const gridStroke = "#2d3748"

  useEffect(() => {
    const cargar = async () => {
      try {
        const [c, mesesApi] = await Promise.all([getContrato(id), getMeses(id)])
        console.log('mesesApi:', mesesApi)
        console.log('primer mes:', mesesApi[0])
        setContrato(c)

        const datos = mesesApi
          .map(mes => {
            const montoFinal = Number(mes.montoFinal || mes.montoBase || 0)
            const mora = Number(mes.recargo_mora || 0)
            const montoSinMora = montoFinal - mora
            return {
              label: `${MESES_NOMBRES[mes.mes].slice(0, 3)} ${mes.anio}`,
              mes: mes.mes,
              anio: mes.anio,
              monto: montoSinMora,
              montoConMora: mora > 0 ? montoFinal : null,
              estado: mes.estado,
              aumento_aplicado: false,
            }
          })
          .filter(d => d.monto > 0)
          .sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes)

        datos.forEach((d, i) => {
          if (i > 0 && d.monto !== datos[i - 1].monto) {
            d.aumento_aplicado = true
          }
        })

        setDatosMeses(datos)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [id])

  const montoInicial = datosMeses[0]?.monto || 0
  const montoActual = datosMeses[datosMeses.length - 1]?.monto || montoInicial
  const variacionTotal = montoInicial > 0
    ? (((datosMeses[datosMeses.length - 1]?.monto - montoInicial) / montoInicial) * 100).toFixed(1)
    : 0
  const mesesConAumento = datosMeses.filter(d => d.aumento_aplicado).length

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <Box bg="gray.800" border="0.5px solid" borderColor="gray.600" borderRadius="md" px={3} py={2}>
        <Text fontSize="sm" fontWeight="500" color="white">{label}</Text>
        <Text fontSize="sm" color="green.400">
          ${Number(payload[0].value).toLocaleString("es-AR")}
        </Text>
        {d?.montoConMora && (
          <Text fontSize="xs" color="red.400">
            Con mora: ${Number(d.montoConMora).toLocaleString("es-AR")}
          </Text>
        )}
        <Text fontSize="xs" color="gray.400" textTransform="capitalize">{d?.estado}</Text>
        {d?.aumento_aplicado && (
          <Text fontSize="xs" color="blue.400">↑ Aumento aplicado</Text>
        )}
      </Box>
    )
  }

  if (loading) return <Center minH="100vh"><Spinner size="xl" color="purple.400" /></Center>
  if (!contrato) return <Center minH="100vh"><Text>Contrato no encontrado</Text></Center>

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1000px" mx="auto">

      <HStack mb={6} spacing={3}>
        <Button
          leftIcon={<Icon as={FiArrowLeft} />}
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/detalle/${id}`)}
        >
          Volver
        </Button>
      </HStack>

      <HStack mb={6} spacing={3} align="flex-start">
        <Icon as={FiTrendingUp} boxSize={6} color="purple.500" mt={1} />
        <Box>
          <Heading size="lg">Variación de montos</Heading>
          <Text color="gray.500" fontSize="sm" mt={1}>
            {contrato.inquilinoNombre} — {contrato.direccion}
          </Text>
        </Box>
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        {[
          { label: "Monto inicial", valor: `$${Number(montoInicial).toLocaleString("es-AR")}` },
          { label: "Monto actual", valor: `$${Number(montoActual).toLocaleString("es-AR")}` },
          { label: "Variación total", valor: `${variacionTotal}%` },
          { label: "Aumentos aplicados", valor: mesesConAumento },
        ].map(m => (
          <Box key={m.label} bg="gray.800" borderRadius="md" p={4}>
            <Text fontSize="12px" color="gray.400" mb={1}>{m.label}</Text>
            <Text fontSize="20px" fontWeight="500" color="white">{m.valor}</Text>
          </Box>
        ))}
      </SimpleGrid>

      <Box bg="gray.900" border="0.5px solid" borderColor="gray.700" borderRadius="lg" p={5}>
        <Text fontSize="sm" fontWeight="500" color="gray.400" mb={4}>
          Evolución mensual del monto — {datosMeses.length} meses
        </Text>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={datosMeses} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#aaa" }}
              tickLine={{ stroke: "#ddd" }}
              axisLine={{ stroke: "#ddd" }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#aaa" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="monto"
              stroke="#7F77DD"
              strokeWidth={2.5}
              dot={({ cx, cy, payload }) => (
                <circle
                  key={`dot-${payload.label}`}
                  cx={cx}
                  cy={cy}
                  r={payload.aumento_aplicado ? 7 : 4}
                  fill={payload.aumento_aplicado ? "#378ADD" : "#7F77DD"}
                  stroke="white"
                  strokeWidth={2}
                />
              )}
              activeDot={{ r: 7, stroke: "#7F77DD", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <HStack mt={3} spacing={4} justify="center">
          <HStack spacing={1}>
            <Box w="10px" h="10px" borderRadius="full" bg="purple.400" />
            <Text fontSize="12px" color="gray.400">Monto mensual</Text>
          </HStack>
          <HStack spacing={1}>
            <Box w="10px" h="10px" borderRadius="full" bg="blue.400" border="2px solid white" boxShadow="0 0 0 1px #378ADD" />
            <Text fontSize="12px" color="gray.400">Mes con aumento</Text>
          </HStack>
        </HStack>
      </Box>

    </Box>
  )
}
