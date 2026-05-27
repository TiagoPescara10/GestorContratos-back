import { useEffect, useState, useMemo, useCallback, memo } from "react"
import {
  Box, Heading, ButtonGroup, Button, Text,
  Spinner, Center, useColorModeValue, VStack, HStack, Badge
} from "@chakra-ui/react"
import { getIndiceIPC, getIndiceICLHistorico } from "../api/indices"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts"

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const CustomTooltip = memo(({ active, payload, label, colorLinea, isIPC }) => {
  if (!active || !payload?.length) return null
  return (
    <Box bg="gray.800" border="0.5px solid" borderColor="gray.600" borderRadius="md" px={3} py={2}>
      <Text fontSize="sm" fontWeight="500" color="white">{label}</Text>
      <Text fontSize="sm" color={colorLinea}>
        {isIPC ? `${payload[0].value}%` : payload[0].value?.toLocaleString("es-AR")}
      </Text>
    </Box>
  )
})

export default function Indices() {
  const [indice, setIndice] = useState("IPC")
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [anioSeleccionado, setAnioSeleccionado] = useState(null)

  const colorLinea = indice === "IPC" ? "#378ADD" : "#1D9E75"
  const isIPC = indice === "IPC"

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let raw
      if (indice === "IPC") {
        raw = await getIndiceIPC()
      } else {
        raw = await getIndiceICLHistorico()
      }

      const lista = Array.isArray(raw) ? raw : (raw?.resultados ?? raw?.data ?? raw?.results ?? [])

      // DIAGNÓSTICO: conteo por año antes de cualquier transformación
      const conteoRaw = lista.reduce((acc, item) => {
        acc[item.anio] = (acc[item.anio] || 0) + 1
        return acc
      }, {})
      console.log(`[Indices] ${indice} — registros crudos del backend: total=${lista.length}`, conteoRaw)

      const transformados = lista
        .map(item => {
          const valorRaw = indice === "IPC"
            ? (item.variacion ?? item.porcentaje ?? item.nivel ?? 0)
            : (item.nivel ?? item.variacion ?? item.porcentaje ?? 0)
          return {
            anio: item.anio,
            mes: item.mes,
            label: `${MESES[item.mes - 1]} ${item.anio}`,
            valor: parseFloat(valorRaw),
          }
        })
        .filter(d => !isNaN(d.valor))
        .sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes)

      setDatos(transformados)
      const anios = [...new Set(transformados.map(d => d.anio))].sort((a, b) => b - a)
      setAnioSeleccionado(anios[0] ?? null)
    } catch {
      setError("No se pudieron cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [indice])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const aniosDisponibles = useMemo(() =>
    [...new Set(datos.map(d => d.anio))].sort((a, b) => b - a)
  , [datos])

  const datosFiltrados = useMemo(() =>
    anioSeleccionado ? datos.filter(d => d.anio === anioSeleccionado) : datos
  , [datos, anioSeleccionado])

  const promedio = useMemo(() =>
    datosFiltrados.length
      ? (datosFiltrados.reduce((s, d) => s + d.valor, 0) / datosFiltrados.length).toFixed(2)
      : 0
  , [datosFiltrados])

  const maximo = useMemo(() =>
    datosFiltrados.length
      ? Math.max(...datosFiltrados.map(d => d.valor)).toFixed(2)
      : 0
  , [datosFiltrados])

  const ultimo = useMemo(() =>
    datosFiltrados.length
      ? datosFiltrados[datosFiltrados.length - 1]?.valor?.toFixed(2)
      : 0
  , [datosFiltrados])

  const bgMetrica = useColorModeValue("gray.50", "gray.700")

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1100px" mx="auto">
      <HStack justify="space-between" align="flex-start" mb={6} flexWrap="wrap" gap={3}>
        <VStack align="start" spacing={0}>
          <Heading size="lg">Índices Económicos</Heading>
          <Text color="gray.500" fontSize="sm">Evolución mensual de índices de ajuste</Text>
        </VStack>
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            onClick={() => setIndice("IPC")}
            colorScheme={indice === "IPC" ? "blue" : "gray"}
            variant={indice === "IPC" ? "solid" : "outline"}
          >
            IPC
          </Button>
          <Button
            onClick={() => setIndice("ICL")}
            colorScheme={indice === "ICL" ? "teal" : "gray"}
            variant={indice === "ICL" ? "solid" : "outline"}
          >
            ICL
          </Button>
        </ButtonGroup>
      </HStack>

      {loading && <Center py={20}><Spinner size="xl" color="blue.400" /></Center>}
      {error && <Center py={10}><Text color="red.400">{error}</Text></Center>}

      {!loading && !error && (
        <VStack spacing={5} align="stretch">

          {/* Métricas */}
          <HStack spacing={4} flexWrap="wrap">
            {[
              { label: "Último valor", valor: isIPC ? `${ultimo}%` : Number(ultimo).toLocaleString("es-AR") },
              { label: "Promedio anual", valor: isIPC ? `${promedio}%` : Number(promedio).toLocaleString("es-AR") },
              { label: "Máximo anual", valor: isIPC ? `${maximo}%` : Number(maximo).toLocaleString("es-AR") },
            ].map(m => (
              <Box key={m.label} flex="1" minW="140px" bg={bgMetrica} borderRadius="md" p={4}>
                <Text fontSize="12px" color="gray.500" mb={1}>{m.label}</Text>
                <Text fontSize="22px" fontWeight="500">{m.valor}</Text>
              </Box>
            ))}
          </HStack>

          {/* Selector de año */}
          <HStack spacing={2} flexWrap="wrap">
            <Text fontSize="sm" color="gray.500" mr={1}>Año:</Text>
            {aniosDisponibles.map(anio => (
              <Button
                key={anio}
                size="xs"
                variant={anioSeleccionado === anio ? "solid" : "outline"}
                colorScheme={anioSeleccionado === anio ? (isIPC ? "blue" : "teal") : "gray"}
                onClick={() => setAnioSeleccionado(anio)}
              >
                {anio}
              </Button>
            ))}
            <Button
              size="xs"
              variant={anioSeleccionado === null ? "solid" : "outline"}
              colorScheme={anioSeleccionado === null ? "purple" : "gray"}
              onClick={() => setAnioSeleccionado(null)}
            >
              Todos
            </Button>
          </HStack>

          {/* Gráfico */}
          <Box
            bg="gray.900"
            border="0.5px solid"
            borderColor="gray.700"
            borderRadius="lg"
            p={5}
          >
            <Text fontSize="sm" fontWeight="500" mb={4} color="gray.400">
              {isIPC ? "Variación mensual IPC (%)" : "Nivel ICL mensual"}
              {anioSeleccionado ? ` — ${anioSeleccionado}` : " — Histórico"}
            </Text>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={datosFiltrados} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#aaa" }}
                  tickLine={false}
                  interval={anioSeleccionado ? 0 : "preserveStartEnd"}
                  angle={datosFiltrados.length > 12 ? -35 : 0}
                  textAnchor={datosFiltrados.length > 12 ? "end" : "middle"}
                  height={datosFiltrados.length > 12 ? 50 : 30}
                  padding={{ right: 20 }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#aaa" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip colorLinea={colorLinea} isIPC={isIPC} />} />
                {isIPC && (
                  <ReferenceLine y={0} stroke="#E24B4A" strokeDasharray="4 4" strokeWidth={1} />
                )}
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={colorLinea}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colorLinea }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

        </VStack>
      )}
    </Box>
  )
}
