import { useEffect, useState, useMemo } from "react"
import {
  Box, Heading, Text, Input, InputGroup, InputLeftElement,
  VStack, HStack, Spinner, Center, Icon, useColorModeValue, Avatar
} from "@chakra-ui/react"
import { FiSearch, FiChevronRight } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { getContratos } from "../api/contratos"

export default function Propietarios() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const navigate = useNavigate()

  const bgCard = useColorModeValue("white", "gray.800")
  const borderColor = useColorModeValue("gray.200", "gray.600")
  const bgHover = useColorModeValue("gray.50", "gray.700")

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await getContratos({ page_size: 200 })
        setContratos(data.results || data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const propietarios = useMemo(() => {
    const mapa = {}
    contratos.forEach(c => {
      const nombre = c.propietarioNombre || "Sin nombre"
      if (!mapa[nombre]) {
        mapa[nombre] = {
          nombre,
          telefono: c.propietarioTelefono || "",
          email: c.propietarioEmail || "",
          cantidad: 0,
          activos: 0,
        }
      }
      mapa[nombre].cantidad += 1
      const hoy = new Date()
      if (new Date(c.fechaInicio) <= hoy && new Date(c.fechaFin) >= hoy) {
        mapa[nombre].activos += 1
      }
    })
    return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [contratos])

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return propietarios
    const q = busqueda.toLowerCase()
    return propietarios.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.telefono.includes(q) ||
      p.email.toLowerCase().includes(q)
    )
  }, [propietarios, busqueda])

  if (loading) return <Center minH="100vh"><Spinner size="xl" color="blue.400" /></Center>

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1100px" mx="auto">
      <VStack align="stretch" spacing={6}>

        <Box>
          <Heading size="lg">Propietarios</Heading>
          <Text color="gray.500" fontSize="sm" mt={1}>
            {propietarios.length} propietarios · {contratos.length} contratos
          </Text>
        </Box>

        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            bg={bgCard}
          />
        </InputGroup>

        <VStack align="stretch" spacing={2}>
          {filtrados.length === 0 && (
            <Text color="gray.400" textAlign="center" py={8}>No se encontraron propietarios</Text>
          )}
          {filtrados.map(p => (
            <HStack
              key={p.nombre}
              bg={bgCard}
              border="0.5px solid"
              borderColor={borderColor}
              borderRadius="lg"
              p={4}
              cursor="pointer"
              justify="space-between"
              _hover={{ bg: bgHover, borderColor: "blue.300" }}
              transition="all 0.15s"
              onClick={() => navigate(`/propietarios/${encodeURIComponent(p.nombre)}`)}
            >
              <HStack spacing={3}>
                <Avatar size="sm" name={p.nombre} bg="blue.100" color="blue.700" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="500" fontSize="sm">{p.nombre}</Text>
                  <HStack spacing={3}>
                    {p.telefono && <Text fontSize="xs" color="gray.500">{p.telefono}</Text>}
                    {p.email && <Text fontSize="xs" color="gray.500">{p.email}</Text>}
                  </HStack>
                </VStack>
              </HStack>
              <HStack spacing={3}>
                <VStack align="end" spacing={0}>
                  <Text fontSize="xs" color="gray.400">{p.cantidad} contrato{p.cantidad !== 1 ? "s" : ""}</Text>
                  <Text fontSize="xs" color="green.500">{p.activos} activo{p.activos !== 1 ? "s" : ""}</Text>
                </VStack>
                <Icon as={FiChevronRight} color="gray.400" boxSize={4} />
              </HStack>
            </HStack>
          ))}
        </VStack>

      </VStack>
    </Box>
  )
}
