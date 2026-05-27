import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Box, Heading, Text, VStack, HStack, Spinner,
  Center, Icon, Button, useColorModeValue, Avatar, SimpleGrid
} from "@chakra-ui/react"
import { FiArrowLeft, FiPhone, FiMail, FiCreditCard } from "react-icons/fi"
import { getContratos } from "../api/contratos"
import CardContrato from "../components/CardContrato"

export default function InquilinoDetalle() {
  const { nombre } = useParams()
  const navigate = useNavigate()
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)

  const bgCard = useColorModeValue("white", "gray.800")
  const borderColor = useColorModeValue("gray.200", "gray.600")

  const nombreDecoded = decodeURIComponent(nombre)

  useEffect(() => {
    const controller = new AbortController()
    const cargar = async () => {
      try {
        const data = await getContratos({ inquilino: nombreDecoded })
        const lista = data.results || data
        if (!controller.signal.aborted) setContratos(lista)
      } catch (e) {
        if (!controller.signal.aborted) console.error(e)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    cargar()
    return () => controller.abort()
  }, [nombreDecoded])

  const activos = useMemo(() => {
    const hoy = new Date()
    return contratos.filter(c =>
      new Date(c.fechaInicio) <= hoy && new Date(c.fechaFin) >= hoy
    )
  }, [contratos])

  if (loading) return <Center minH="100vh"><Spinner size="xl" color="blue.400" /></Center>

  const inquilino = contratos[0] || {}

  return (
    <Box p={{ base: 4, md: 8 }} maxW="1100px" mx="auto">
      <VStack align="stretch" spacing={6}>

        <HStack>
          <Button
            leftIcon={<Icon as={FiArrowLeft} />}
            variant="ghost"
            size="sm"
            onClick={() => navigate("/inquilinos")}
          >
            Inquilinos
          </Button>
        </HStack>

        <Box bg={bgCard} border="0.5px solid" borderColor={borderColor} borderRadius="lg" p={5}>
          <HStack spacing={4} align="flex-start">
            <Avatar size="lg" name={nombreDecoded} bg="blue.100" color="blue.700" flexShrink={0} />
            <VStack align="start" spacing={1}>
              <Heading size="md">{nombreDecoded}</Heading>
              <HStack spacing={4} flexWrap="wrap" pt={1}>
                {inquilino.inquilinoDni && (
                  <HStack spacing={1}>
                    <Icon as={FiCreditCard} boxSize={3} color="gray.400" />
                    <Text fontSize="sm" color="gray.600">DNI {inquilino.inquilinoDni}</Text>
                  </HStack>
                )}
                {inquilino.inquilinoTelefono && (
                  <HStack spacing={1}>
                    <Icon as={FiPhone} boxSize={3} color="gray.400" />
                    <Text fontSize="sm" color="gray.600">{inquilino.inquilinoTelefono}</Text>
                  </HStack>
                )}
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {contratos.length} contrato{contratos.length !== 1 ? "s" : ""} · {activos.length} activo{activos.length !== 1 ? "s" : ""}
              </Text>
            </VStack>
          </HStack>
        </Box>

        <Text fontSize="sm" fontWeight="500" color="gray.500">
          Todos los contratos
        </Text>
        <VStack align="stretch" spacing={3}>
          {contratos.map(c => (
            <CardContrato key={c.id} contrato={c} />
          ))}
        </VStack>

      </VStack>
    </Box>
  )
}
