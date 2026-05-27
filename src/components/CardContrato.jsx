import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  useDisclosure,
  Icon,
  Card,
  CardBody,
  Divider,
  useColorModeValue,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast
} from "@chakra-ui/react"
import { lazy, Suspense, memo } from "react"
import { Link } from "react-router-dom"
import {
  MdHome,
  MdPerson,
  MdBusiness,
  MdVisibility,
  MdEdit,
  MdDelete,
  MdPayment,
  MdCalendarToday,
  MdAttachMoney,
  MdTrendingUp
} from "react-icons/md"

import capitalizar from "../utils/capitalizar"
import formatearMonto from "../utils/formatearMonto"
import LoadingSpinner from "./ui/LoadingSpinner"

const ContratoCompleto = lazy(() => import("./ContratoCompleto"))
  
function CardContrato({ contrato, onEliminar, compact = false }) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure()
  const cardBg = useColorModeValue("white", "gray.750")
  const textColor = useColorModeValue("gray.800", "white")
  const borderColor = useColorModeValue("gray.300", "gray.600")
  const hoverBg = useColorModeValue("gray.50", "gray.700")
  const toast = useToast()

  const handleEliminar = async () => {
    onDeleteModalOpen()
  };

  const confirmarEliminacion = async () => {
    try {
      await onEliminar(contrato.id);
      onDeleteModalClose();
      // El toast de éxito lo maneja el componente padre (Contratos.jsx)
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

  const hoy = new Date()
  const fechaFin = new Date(contrato.fechaFin + "T00:00:00")
  const estaActivo = fechaFin >= hoy

  return (
    <Card
      bg={cardBg}
      shadow="sm"
      border="1px solid"
      borderColor={borderColor}
      _hover={{ bg: hoverBg, shadow: "md", borderColor: useColorModeValue("blue.300", "blue.600") }}
      transition="all 0.2s ease"
      borderRadius="md"
      overflow="hidden"
    >
      <CardBody p={compact ? 3 : 4}>
        {/* Header with Status - Diseño horizontal compacto */}
        <Flex justify="space-between" align="center" mb={compact ? 2 : 3}>
          {/* Izquierda: Info principal */}
          <Flex align="center" gap={3} flex={1}>
            <Badge
              colorScheme={estaActivo ? "green" : "red"}
              px={2}
              py={1}
              borderRadius="full"
              fontSize="2xs"
              fontWeight="medium"
              minW="50px"
              textAlign="center"
            >
              {estaActivo ? "Activo" : "Finalizado"}
            </Badge>
            
            <VStack align="start" spacing={0} flex={1}>
              <Text fontSize={compact ? "sm" : "md"} fontWeight="600" color={textColor} noOfLines={1}>
                {capitalizar(contrato.tipoPropiedad || "Propiedad")}
              </Text>
              <HStack fontSize={compact ? "xs" : "sm"} color="gray.600">
                <Icon as={MdHome} boxSize={3} />
                <Text noOfLines={1}>{contrato.localidad}</Text>
                <Text color="gray.400">•</Text>
                <Text noOfLines={1}>{contrato.provincia}</Text>
                <Text color="gray.400">•</Text>
                <Text noOfLines={1}>{contrato.direccion}</Text>
              </HStack>
            </VStack>
          </Flex>
          
          {/* Derecha: ID y valor */}
          <VStack align="end" spacing={1}>
            <Text fontSize="2xs" color="gray.500">ID: {contrato.id}</Text>
            <Text fontSize={compact ? "sm" : "md"} fontWeight="600" color="green.600">
              {formatearMonto(contrato.valorMensual)}
            </Text>
          </VStack>
        </Flex>

        {compact ? <Divider my={2} /> : <Divider my={3} />}

        {/* Info compacta en grid horizontal - mismo diseño para ambos modos */}
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3} mb={3}>
          <HStack spacing={2}>
            <Icon as={MdPerson} boxSize={4} color="blue.500" />
            <Box>
              <Text fontSize="xs" color="gray.500">Inquilino</Text>
              <Text fontSize="sm" fontWeight="500" color={textColor} noOfLines={1}>
                {capitalizar(contrato.inquilinoNombre)}
              </Text>
            </Box>
          </HStack>

          <HStack spacing={2}>
            <Icon as={MdBusiness} boxSize={4} color="blue.500" />
            <Box>
              <Text fontSize="xs" color="gray.500">Propietario</Text>
              <Text fontSize="sm" fontWeight="500" color={textColor} noOfLines={1}>
                {capitalizar(contrato.propietarioNombre)}
              </Text>
            </Box>
          </HStack>
          
          <HStack spacing={2}>
            <Icon as={MdCalendarToday} boxSize={4} color="orange.500" />
            <Box>
              <Text fontSize="xs" color="gray.500">Vence</Text>
              <Text fontSize="sm" fontWeight="500" color={textColor}>
                {new Date(contrato.fechaFin + "T00:00:00").toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </Box>
          </HStack>
          
          <HStack spacing={2}>
            <Icon as={MdPayment} boxSize={4} color="green.500" />
            <Box>
              <Text fontSize="xs" color="gray.500">Dia pago</Text>
              <Text fontSize="sm" fontWeight="500" color={textColor}>
                {contrato.diaPago || "-"}
              </Text>
            </Box>
          </HStack>
          
          <HStack spacing={2}>
            <Icon as={MdTrendingUp} boxSize={4} color="purple.500" />
            <Box>
              <Text fontSize="xs" color="gray.500">Aumento</Text>
              <Text fontSize="sm" fontWeight="500" color={textColor}>
                {contrato.frecuenciaAumento || "-"}
              </Text>
            </Box>
          </HStack>
        </SimpleGrid>

        {compact ? <Divider my={2} /> : <Divider my={3} />}

        {/* Action Buttons - Diseño unificado */}
        <HStack spacing={2} mt={3}>
          <Button
            size="sm"
            leftIcon={<Icon as={MdVisibility} boxSize={4} />}
            onClick={onOpen}
            colorScheme="blue"
            variant="outline"
            flex={1}
          >
            Ver
          </Button>

          <Button
            size="sm"
            leftIcon={<Icon as={MdPayment} boxSize={4} />}
            as={Link}
            to={`/detalle/${contrato.id}`}
            colorScheme="green"
            variant="outline"
            flex={1}
          >
            Pagos
          </Button>

          <Button
            size="sm"
            leftIcon={<Icon as={MdEdit} boxSize={4} />}
            as={Link}
            to={`/editar-contrato/${contrato.id}`}
            colorScheme="orange"
            variant="outline"
            flex={1}
          >
            Editar
          </Button>

          <Button
            size="sm"
            leftIcon={<Icon as={MdDelete} boxSize={4} />}
            onClick={handleEliminar}
            colorScheme="red"
            variant="outline"
            flex={1}
          >
            Eliminar
          </Button>
        </HStack>
      </CardBody>

      {/* Modal con detalles completos */}
      <Suspense fallback={<LoadingSpinner />}>
        <ContratoCompleto isOpen={isOpen} onClose={onClose} contratoId={contrato.id} />
      </Suspense>

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
    </Card>
  )
}

export default memo(CardContrato)