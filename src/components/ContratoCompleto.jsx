import { useEffect, useState } from "react"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "")

const resolverUrlArchivo = (url) => {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/media/") || url.startsWith("/static/")) return `${BACKEND_ORIGIN}${url}`
  if (url.startsWith("/")) return `${BACKEND_ORIGIN}${url}`
  // Solo nombre de archivo o path relativo sin /media/
  return `${BACKEND_ORIGIN}/media/${url}`
}
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  SimpleGrid,

  Box,
  Heading,
  Text,
  Badge,
  Divider,
  Spinner,
  Center,
  HStack,
  Icon,
  Card,
  CardBody,
  useColorModeValue
} from "@chakra-ui/react"
import {
  MdBusiness,
  MdPerson,
  MdHome,
  MdCalendarToday,
  MdAttachMoney,
  MdDescription,
  MdPictureAsPdf,
  MdPercent,
  MdAccountBalance,
  MdClose,
  MdOpenInNew
} from "react-icons/md"
import capitalizar from "../utils/capitalizar"
import formatearMonto from "../utils/formatearMonto"
import { getContrato } from "../api/contratos"

const formatearDni = (dni) => {
  if (!dni) return "-"
  const solo = String(dni).replace(/\D/g, "")
  if (solo.length <= 7) return solo
  if (solo.length === 8) return `${solo.slice(0, 2)}.${solo.slice(2, 5)}.${solo.slice(5)}`
  return `${solo.slice(0, 2)}.${solo.slice(2, 5)}.${solo.slice(5)}`
}

// Utility functions moved to component level to avoid hooks order violations
const normalizarTipoInteresMora = (tipoInteresMora) => {
  const valor = (tipoInteresMora || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (!valor) {
    return ""
  }

  if (valor.includes("fij") || valor.includes("monto")) {
    return "fijo"
  }

  if (valor.includes("porc") || valor.includes("%")) {
    return "porcentaje"
  }

  return valor
}

const obtenerNombresConceptosExtras = (conceptosExtras = []) => {
  if (!Array.isArray(conceptosExtras) || conceptosExtras.length === 0) {
    return "-"
  }

  return conceptosExtras
    .map((item) => {
      if (typeof item === "string") {
        return item
      }

      if (item && typeof item === "object" && item.nombre) {
        return item.nombre
      }

      return ""
    })
    .filter(Boolean)
    .join(", ")
}

const obtenerTotalConceptosExtras = (contrato) => {
  if (!Array.isArray(contrato.conceptosExtras)) {
    return Number(contrato.valorConceptosExtras || 0)
  }

  return contrato.conceptosExtras
    .filter((item) => typeof item === "object" && item.precio)
    .reduce((total, item) => total + Number(item.precio || 0), 0)
}

function ContratoCompleto({ isOpen, onClose, contratoId }) {
  const [contrato, setContrato] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen || !contratoId) {
      setContrato(null)
      setLoading(false)
      setError(null)
      return
    }

    const cargarContrato = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getContrato(contratoId)
        setContrato(data)
      } catch (err) {
        setError(err.message || "No se pudo cargar el contrato")
        console.error("Error cargando contrato:", err)
      } finally {
        setLoading(false)
      }
    }

    cargarContrato()
  }, [isOpen, contratoId])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent bg={useColorModeValue("white", "gray.800")}>
        <ModalHeader>
          <HStack justify="space-between" align="center">
            <Heading size="lg" color={useColorModeValue("gray.800", "white")}>
              Detalles del Contrato
            </Heading>
            <ModalCloseButton as="button">
              <Icon as={MdClose} boxSize={6} />
            </ModalCloseButton>
          </HStack>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <Center py={10}>
              <Spinner size="xl" />
            </Center>
          ) : error ? (
            <Center py={10}>
              <Text color="red.500">{error}</Text>
            </Center>
          ) : !contrato ? (
            <Center py={10}>
              <Text>Cargando contrato...</Text>
            </Center>
          ) : (
            <VStack spacing={6} align="stretch">
              {/* Property Information */}
              <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                <CardBody p={4}>
                  <HStack spacing={2} mb={3}>
                    <Icon as={MdBusiness} boxSize={5} color="blue.500" />
                    <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                      Datos de la Propiedad
                    </Heading>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Tipo</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.tipoPropiedad)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdDescription} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Dirección</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.direccion)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Localidad</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.localidad)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Provincia</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.provincia)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">País</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.pais)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Código Postal</Text>
                        <Text fontWeight="semibold">{contrato.codigoPostal || "-"}</Text>
                      </Box>
                    </HStack>
                    {contrato.piso && (
                      <HStack spacing={3}>
                        <Icon as={MdHome} boxSize={4} color="gray.400" />
                        <Box>
                          <Text fontSize="sm" color="gray.600" fontWeight="medium">Piso</Text>
                          <Text fontWeight="semibold">{contrato.piso}</Text>
                        </Box>
                      </HStack>
                    )}
                    {contrato.departamento && (
                      <HStack spacing={3}>
                        <Icon as={MdHome} boxSize={4} color="gray.400" />
                        <Box>
                          <Text fontSize="sm" color="gray.600" fontWeight="medium">Departamento</Text>
                          <Text fontWeight="semibold">{contrato.departamento}</Text>
                        </Box>
                      </HStack>
                    )}
                  </SimpleGrid>
                </CardBody>
              </Card>

              <Divider />

              {/* Tenant Information */}
              <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                <CardBody p={4}>
                  <HStack spacing={2} mb={3}>
                    <Icon as={MdPerson} boxSize={5} color="blue.500" />
                    <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                      Datos del Inquilino
                    </Heading>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <HStack spacing={3}>
                      <Icon as={MdPerson} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Nombre</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.inquilinoNombre)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdDescription} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">DNI</Text>
                        <Text fontWeight="semibold">{formatearDni(contrato.inquilinoDni)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Teléfono</Text>
                        <Text fontWeight="semibold">{contrato.inquilinoTelefono}</Text>
                      </Box>
                    </HStack>
                  </SimpleGrid>
                </CardBody>
              </Card>

              <Divider />

              {/* Owner Information */}
              <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                <CardBody p={4}>
                  <HStack spacing={2} mb={3}>
                    <Icon as={MdBusiness} boxSize={5} color="purple.500" />
                    <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                      Datos del Propietario
                    </Heading>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <HStack spacing={3}>
                      <Icon as={MdPerson} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Nombre Completo</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.propietarioNombreCompleto)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdDescription} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">DNI</Text>
                        <Text fontWeight="semibold">{formatearDni(contrato.propietarioDni)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">CUIT</Text>
                        <Text fontWeight="semibold">{contrato.propietarioCuit || "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Email</Text>
                        <Text fontWeight="semibold">{contrato.propietarioEmail || "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Teléfono</Text>
                        <Text fontWeight="semibold">{contrato.propietarioTelefono}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">CBU</Text>
                        <Text fontWeight="semibold">{contrato.propietarioCbu || "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Alias</Text>
                        <Text fontWeight="semibold">{contrato.propietarioAlias || "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Cobra en</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.propietarioCobraEn)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Condición Fiscal</Text>
                        <Text fontWeight="semibold">{contrato.propietarioCondicionFiscal || "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdHome} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Necesita Factura</Text>
                        <Badge colorScheme={contrato.propietarioNecesitaFactura ? "green" : "gray"}>
                          {contrato.propietarioNecesitaFactura ? "Sí" : "No"}
                        </Badge>
                      </Box>
                    </HStack>
                  </SimpleGrid>
                </CardBody>
              </Card>

              <Divider />

              {/* Guarantors Information */}
              <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                <CardBody p={4}>
                  <HStack spacing={2} mb={3}>
                    <Icon as={MdAccountBalance} boxSize={5} color="orange.500" />
                    <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                      Datos de los Garantes
                    </Heading>
                  </HStack>
                  
                  {(() => {
                    // Verificar si hay garantes nuevos (array) o viejos (campos individuales)
                    const garantesArray = contrato.garantes && Array.isArray(contrato.garantes) ? contrato.garantes : null;
                    const garanteViejo = contrato.garanteNombre ? {
                      nombre: contrato.garanteNombre,
                      dni: contrato.garanteDni,
                      telefono: contrato.garanteTelefono,
                      documentoTipo: contrato.garanteDocumentoTipo,
                      documentoArchivo: contrato.garanteDocumentoArchivo
                    } : null;
                    
                    const todosLosGarantes = garantesArray || (garanteViejo ? [garanteViejo] : []);
                    
                    if (todosLosGarantes.length === 0) {
                      return (
                        <Text color="gray.500" textAlign="center" py={4}>
                          No hay garantes registrados para este contrato
                        </Text>
                      );
                    }
                    
                    return todosLosGarantes.map((garante, index) => (
                      <Box key={index} mb={4}>
                        {index > 0 && <Divider my={3} />}
                        <HStack spacing={2} mb={2}>
                          <Icon as={MdPerson} boxSize={4} color="orange.400" />
                          <Text fontWeight="semibold" color={useColorModeValue("gray.700", "gray.200")}>
                            Garante {index + 1}
                          </Text>
                        </HStack>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <HStack spacing={3}>
                            <Icon as={MdPerson} boxSize={4} color="gray.400" />
                            <Box>
                              <Text fontSize="sm" color="gray.600" fontWeight="medium">Nombre</Text>
                              <Text fontWeight="semibold">{capitalizar(garante.nombre) || "-"}</Text>
                            </Box>
                          </HStack>
                          <HStack spacing={3}>
                            <Icon as={MdDescription} boxSize={4} color="gray.400" />
                            <Box>
                              <Text fontSize="sm" color="gray.600" fontWeight="medium">DNI</Text>
                              <Text fontWeight="semibold">{formatearDni(garante.dni)}</Text>
                            </Box>
                          </HStack>
                          <HStack spacing={3}>
                            <Icon as={MdHome} boxSize={4} color="gray.400" />
                            <Box>
                              <Text fontSize="sm" color="gray.600" fontWeight="medium">Teléfono</Text>
                              <Text fontWeight="semibold">{garante.telefono || "-"}</Text>
                            </Box>
                          </HStack>
                          <HStack spacing={3} align="start">
                            <Icon as={MdDescription} boxSize={4} color="gray.400" mt={1} />
                            <Box>
                              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                                {garante.documentoTipo || "Documentos"}
                              </Text>
                              {(() => {
                                const docs = Array.isArray(garante.documentos) && garante.documentos.length > 0
                                  ? garante.documentos
                                  : garante.documentoArchivo
                                    ? [garante.documentoArchivo]
                                    : []
                                if (docs.length === 0) return <Text fontWeight="semibold">-</Text>
                                return (
                                  <VStack align="start" spacing={1} mt={1}>
                                    {docs.map((doc, j) => {
                                      const url = typeof doc === 'string' ? doc : null
                                      return url ? (
                                        <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                                          Ver documento 📎
                                        </a>
                                      ) : (
                                        <Text key={j} fontSize="sm">{doc?.name || `Archivo ${j + 1}`}</Text>
                                      )
                                    })}
                                  </VStack>
                                )
                              })()}
                            </Box>
                          </HStack>
                        </SimpleGrid>
                      </Box>
                    ));
                  })()}
                </CardBody>
              </Card>

              <Divider />

              {/* Contract Terms */}
              <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                <CardBody p={4}>
                  <HStack spacing={2} mb={3}>
                    <Icon as={MdDescription} boxSize={5} color="green.500" />
                    <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                      Términos del Contrato
                    </Heading>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <HStack spacing={3}>
                      <Icon as={MdAttachMoney} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Valor Mensual</Text>
                        <Text fontWeight="semibold">{formatearMonto(contrato.valorMensual)} {contrato.monedaMensual}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdAttachMoney} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Valor Depósito</Text>
                        <Text fontWeight="semibold">{formatearMonto(contrato.valorDeposito)} {contrato.monedaDeposito}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdCalendarToday} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Fecha Inicio</Text>
                        <Text fontWeight="semibold">{contrato.fechaInicio?.split("-").reverse().join("/")}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdCalendarToday} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Fecha Fin</Text>
                        <Text fontWeight="semibold">{contrato.fechaFin?.split("-").reverse().join("/")}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdCalendarToday} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Duración</Text>
                        <Text fontWeight="semibold">{contrato.duracion} meses</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdCalendarToday} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Día de Pago</Text>
                        <Text fontWeight="semibold">{contrato.diaPago}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdPercent} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Tipo de Aumento</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.tipoAumento)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdCalendarToday} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Frecuencia de Aumento</Text>
                        <Text fontWeight="semibold">{capitalizar(contrato.frecuenciaAumento)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdAttachMoney} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Honorarios</Text>
                        <Text fontWeight="semibold">{contrato.honorarios} %</Text>
                      </Box>
                    </HStack>
                  </SimpleGrid>
                </CardBody>
              </Card>

              <Divider />

              {/* Additional Concepts */}
              <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                <CardBody p={4}>
                  <HStack spacing={2} mb={3}>
                    <Icon as={MdDescription} boxSize={5} color="purple.500" />
                    <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                      Conceptos Adicionales
                    </Heading>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <HStack spacing={3}>
                      <Icon as={MdDescription} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Conceptos Extras</Text>
                        <Text fontWeight="semibold">{obtenerNombresConceptosExtras(contrato.conceptosExtras)}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdAttachMoney} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Valor Conceptos Extras</Text>
                        <Text fontWeight="semibold">{obtenerTotalConceptosExtras(contrato) ? `${formatearMonto(obtenerTotalConceptosExtras(contrato))} ${contrato.monedaMensual}` : "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdPercent} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Tipo Interés por Mora</Text>
                        <Text fontWeight="semibold">{contrato.tipoInteresMora ? capitalizar(normalizarTipoInteresMora(contrato.tipoInteresMora)) : "-"}</Text>
                      </Box>
                    </HStack>
                    <HStack spacing={3}>
                      <Icon as={MdPercent} boxSize={4} color="gray.400" />
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Valor Interés por Mora</Text>
                        <Text fontWeight="semibold">
                          {contrato.valorInteresMora
                            ? normalizarTipoInteresMora(contrato.tipoInteresMora) === "porcentaje"
                              ? `${(contrato.valorInteresMora)} %`
                              : `${Number(contrato.valorInteresMora).toLocaleString("es-AR")} ${contrato.monedaMensual}`
                            : "-"}
                        </Text>
                      </Box>
                    </HStack>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {contrato.contratoPdf && (
                <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                  <CardBody p={4}>
                    <HStack spacing={2} mb={3}>
                      <Icon as={MdPictureAsPdf} boxSize={5} color="red.500" />
                      <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                        Contrato PDF
                      </Heading>
                    </HStack>
                    <HStack spacing={3} align="center">
                      <Text fontSize="sm" color="gray.500" flex={1} noOfLines={1}>
                        {contrato.contratoPdf.split("/").pop()}
                      </Text>
                      <a href={contrato.contratoPdf} target="_blank" rel="noopener noreferrer">
                        Ver contrato 📄
                      </a>
                    </HStack>
                  </CardBody>
                </Card>
              )}

              {Array.isArray(contrato.contratoAnexos) && contrato.contratoAnexos.length > 0 && (
                <Card bg={useColorModeValue("gray.50", "gray.700")} borderRadius="lg">
                  <CardBody p={4}>
                    <HStack spacing={2} mb={3}>
                      <Icon as={MdDescription} boxSize={5} color="orange.500" />
                      <Heading size="sm" color={useColorModeValue("gray.800", "white")}>
                        Anexos
                      </Heading>
                    </HStack>
                    <VStack align="start" spacing={1}>
                      {contrato.contratoAnexos.map((url, j) => (
                        typeof url === 'string' ? (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                            Ver documento 📎
                          </a>
                        ) : (
                          <Text key={j} fontSize="sm">{`Anexo ${j + 1}`}</Text>
                        )
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}

            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <Button 
            leftIcon={<Icon as={MdClose} boxSize={4} />}
            onClick={onClose} 
            colorScheme="blue"
            variant="outline"
          >
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default ContratoCompleto
