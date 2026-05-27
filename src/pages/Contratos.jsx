import { Box, Heading, Flex, Input, VStack, useColorModeValue, Button, Icon, HStack, Text, useToast, SimpleGrid, FormControl, FormLabel } from "@chakra-ui/react"
import { useState, useMemo } from "react"
import CardContrato from "../components/CardContrato"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import ErrorMessage from "../components/ui/ErrorMessage"
import EmptyState from "../components/ui/EmptyState"
import { useContracts } from "../hooks/useContracts"
import { useApiError } from "../hooks/useApiError"
import { MdAdd, MdSearch, MdRefresh, MdFilterAlt, MdClose } from "react-icons/md"
import { useNavigate } from "react-router-dom"

export default function Contratos() {
  const [busqueda, setBusqueda] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const { contracts, loading, error, loadContracts, deleteContract, refreshContracts } = useContracts()
  const { handleError, handleSuccess } = useApiError()
  const navigate = useNavigate()

  const hayFiltroFecha = fechaDesde || fechaHasta

  const aplicarFiltros = () => {
    const params = {}
    if (fechaDesde) params.fechaDesde = fechaDesde
    if (fechaHasta) params.fechaHasta = fechaHasta
    loadContracts(params)
  }

  const limpiarFiltros = () => {
    setFechaDesde("")
    setFechaHasta("")
    setBusqueda("")
    loadContracts()
  }

  // Filter contracts by tenant name using useMemo for performance
  const contratosFiltrados = useMemo(() => {
    if (!contracts) return []
    return contracts.filter((contrato) =>
      contrato.inquilinoNombre?.toLowerCase().includes(busqueda.toLowerCase())
    )
  }, [contracts, busqueda])

  // Delete contract function - ahora solo elimina, la confirmación está en CardContrato
  const handleEliminar = async (id) => {
    try {
      await deleteContract(id)
      handleSuccess("Contrato eliminado exitosamente")
    } catch (error) {
      handleError(error, { title: "Error al eliminar contrato" })
    }
  }

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
          <Flex 
            justify="space-between" 
            align="center"
            direction={{ base: "column", md: "row" }}
            gap={4}
          >
            <Heading color={textColor} size="xl">
              Contratos
            </Heading>
            <HStack spacing={3}>
              <Button
                leftIcon={<Icon as={MdRefresh} />}
                onClick={refreshContracts}
                isLoading={loading}
                variant="outline"
                colorScheme="blue"
              >
                Actualizar
              </Button>
              <Button
                leftIcon={<Icon as={MdAdd} />}
                onClick={() => navigate("/cargar-contrato")}
                colorScheme="blue"
                bg="blue.600"
                _hover={{ bg: "blue.700" }}
              >
                Nuevo Contrato
              </Button>
            </HStack>
          </Flex>

          {/* Search Bar */}
          <Box position="relative">
            <Icon 
              as={MdSearch} 
              position="absolute" 
              left={3} 
              top="50%" 
              transform="translateY(-50%)" 
              color="gray.400"
            />
            <Input
              placeholder="Buscar por nombre de inquilino..."
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              bg={cardBg}
              borderColor="gray.300"
              pl={10}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px blue.500"
              }}
              _placeholder={{ color: "gray.500" }}
            />
          </Box>

          {/* Filtro por rango de fechas */}
          <Box bg={cardBg} p={4} borderRadius="xl" borderWidth="1px" borderColor="gray.200">
            <Text fontWeight="semibold" mb={3} fontSize="sm" color="gray.600">
              Filtrar por rango de fechas de inicio
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={3} alignItems="flex-end">
              <FormControl>
                <FormLabel fontSize="xs" color="gray.500" mb={1}>Desde</FormLabel>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  bg={useColorModeValue("gray.50", "gray.700")}
                  size="sm"
                  borderRadius="md"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.500" mb={1}>Hasta</FormLabel>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  bg={useColorModeValue("gray.50", "gray.700")}
                  size="sm"
                  borderRadius="md"
                />
              </FormControl>
              <Button
                leftIcon={<Icon as={MdFilterAlt} />}
                colorScheme="blue"
                size="sm"
                onClick={aplicarFiltros}
                isDisabled={!hayFiltroFecha}
              >
                Filtrar
              </Button>
              {hayFiltroFecha && (
                <Button
                  leftIcon={<Icon as={MdClose} />}
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  onClick={limpiarFiltros}
                >
                  Limpiar
                </Button>
              )}
            </SimpleGrid>
          </Box>

          {/* Results Count */}
          {busqueda && (
            <Text color="gray.600" fontSize="sm">
              Se encontraron {contratosFiltrados.length} contratos
            </Text>
          )}

          {/* Content */}
          {loading ? (
            <LoadingSpinner text="Cargando contratos..." />
          ) : error ? (
            <ErrorMessage 
              message={error.message || "Error al cargar los contratos"} 
              onRetry={refreshContracts}
            />
          ) : contratosFiltrados.length === 0 ? (
            <EmptyState 
              title={busqueda ? "No se encontraron contratos" : "No hay contratos cargados"}
              description={busqueda 
                ? "Intenta con otros términos de búsqueda" 
                : "Comienza creando tu primer contrato"
              }
              actionText={!busqueda ? "Crear Primer Contrato" : undefined}
              onAction={!busqueda ? () => navigate("/cargar-contrato") : undefined}
              icon={busqueda ? MdSearch : MdAdd}
            />
          ) : (
            <VStack spacing={4} align="stretch">
              {contratosFiltrados.map((c) => (
                <CardContrato
                  key={c.id}
                  contrato={c}
                  onEliminar={handleEliminar}
                />
              ))}
            </VStack>
          )}
        </VStack>
      </Box>
  )
}