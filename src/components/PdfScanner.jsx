// src/components/PdfScanner.jsx
import { useState, useRef } from "react"
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  Button, Box, Text, VStack, HStack, Badge,
  Grid, Icon, List, ListItem, ListIcon,
  Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react"
import { FiUpload, FiFileText, FiAlertTriangle, FiCheck } from "react-icons/fi"


async function extraerDatosConClaude(archivo) {
  const { api } = await import("../api/client")

  const formData = new FormData()
  formData.append('pdf', archivo)

  return await api.post('analizar-contrato-pdf/', formData)
}

const ETAPAS = [
  "Leyendo el documento...",
  "Identificando partes del contrato...",
  "Extrayendo cláusulas de aumento y mora...",
  "Verificando datos extraídos...",
]

export default function PdfScanner({ isOpen, onClose, onDatosExtraidos }) {
  const [archivo, setArchivo] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [etapa, setEtapa] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const handleArchivo = (file) => {
    if (!file || file.type !== "application/pdf") {
      setError("Solo se aceptan archivos PDF")
      return
    }
    setArchivo(file)
    setError(null)
    setResultado(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleArchivo(e.dataTransfer.files[0])
  }

  const handleAnalizar = async () => {
    if (!archivo) return
    setCargando(true)
    setError(null)
    setEtapa(0)

    try {
      const intervalo = setInterval(() => {
        setEtapa(prev => prev < ETAPAS.length - 1 ? prev + 1 : prev)
      }, 1500)

      const res = await extraerDatosConClaude(archivo)
      clearInterval(intervalo)
      setEtapa(ETAPAS.length - 1)
      setResultado(res)
    } catch (err) {
      setError("No se pudo analizar el PDF. " + err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleConfirmar = () => {
    if (!resultado) return
    onDatosExtraidos(resultado.datos, resultado.advertencias)
    handleCerrar()
  }

  const handleCerrar = () => {
    setArchivo(null)
    setCargando(false)
    setEtapa(0)
    setResultado(null)
    setError(null)
    onClose()
  }

  const confianzaColor = {
    alta: "green",
    media: "yellow",
    baja: "red",
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCerrar} size="lg" closeOnOverlayClick={!cargando} scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflow="hidden">
        <ModalHeader>Cargar contrato desde PDF</ModalHeader>
        {!cargando && <ModalCloseButton />}
        <ModalBody overflowY="auto" py={3}>
          <VStack spacing={3} align="stretch">

            {/* Dropzone — solo cuando no hay archivo */}
            {!archivo && !resultado && (
              <Box
                border="2px dashed"
                borderColor="gray.300"
                borderRadius="md"
                p={8}
                textAlign="center"
                cursor="pointer"
                bg="gray.50"
                _dark={{ bg: "gray.700", borderColor: "gray.500" }}
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={e => handleArchivo(e.target.files[0])}
                />
                <Icon as={FiUpload} boxSize={10} color="gray.400" mb={3} />
                <Text fontWeight="500">Arrastrá el PDF acá o hacé click</Text>
                <Text fontSize="sm" color="gray.500">Solo archivos PDF</Text>
              </Box>
            )}

            {/* Archivo seleccionado — compacto */}
            {archivo && !resultado && (
              <HStack
                bg="blue.50"
                _dark={{ bg: "blue.900" }}
                borderRadius="md"
                px={3}
                py={2}
                justify="space-between"
              >
                <HStack spacing={2}>
                  <Icon as={FiFileText} color="blue.500" boxSize={4} />
                  <Text fontSize="sm" color="blue.600" _dark={{ color: "blue.300" }} isTruncated maxW="260px">
                    {archivo.name}
                  </Text>
                </HStack>
                <Text fontSize="xs" color="gray.400">{(archivo.size / 1024).toFixed(0)} KB</Text>
              </HStack>
            )}

            {/* Progreso */}
            {cargando && (
              <Box position="relative" overflow="hidden">
                <style>{`
                  @keyframes scanLine {
                    0% { top: 12px; opacity: 1; }
                    85% { opacity: 1; }
                    100% { top: 148px; opacity: 0; }
                  }
                  @keyframes scanLine2 {
                    0% { top: 12px; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 148px; opacity: 0; }
                  }
                  @keyframes fadeRow {
                    0% { opacity: 0; background: #E6F1FB; }
                    30% { opacity: 1; background: #E6F1FB; }
                    100% { opacity: 1; background: transparent; }
                  }
                  @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                  }
                  @keyframes dotPulse {
                    0%, 100% { transform: scale(0.8); opacity: 0.4; }
                    50% { transform: scale(1.2); opacity: 1; }
                  }
                  .scan-row { opacity: 0; animation: fadeRow 0.4s ease forwards; }
                  .scan-row:nth-child(1) { animation-delay: 0.3s; }
                  .scan-row:nth-child(2) { animation-delay: 0.7s; }
                  .scan-row:nth-child(3) { animation-delay: 1.1s; }
                  .scan-row:nth-child(4) { animation-delay: 1.5s; }
                  .scan-row:nth-child(5) { animation-delay: 1.9s; }
                  .scan-row:nth-child(6) { animation-delay: 2.3s; }
                  .dot1 { animation: dotPulse 1.2s ease-in-out infinite 0s; }
                  .dot2 { animation: dotPulse 1.2s ease-in-out infinite 0.4s; }
                  .dot3 { animation: dotPulse 1.2s ease-in-out infinite 0.8s; }
                  .scan-beam { position: absolute; left: 0; right: 0; height: 3px; background: #378ADD; animation: scanLine 2.5s ease-in-out infinite; box-shadow: 0 0 8px #378ADD; }
                  .scan-glow { position: absolute; left: 0; right: 0; height: 20px; background: linear-gradient(to bottom, rgba(55,138,221,0.15), transparent); animation: scanLine2 2.5s ease-in-out infinite; }
                  .pulse-text { animation: pulse 2s ease-in-out infinite; }
                `}</style>

                <Grid templateColumns="1fr 1fr" gap={3}>
                  {/* Documento animado */}
                  <Box
                    position="relative"
                    bg="gray.50"
                    _dark={{ bg: "gray.700" }}
                    borderRadius="md"
                    border="0.5px solid"
                    borderColor="gray.200"
                    p={3}
                    h="160px"
                    overflow="hidden"
                  >
                    <VStack spacing="6px" align="stretch">
                      {[90, 75, 85, 60, null, 80, 70, 90, 55, null, 85, 65, 75].map((w, i) =>
                        w === null ? (
                          <Box key={i} h="1px" bg="gray.200" my={1} />
                        ) : (
                          <Box key={i} h={i === 0 ? "8px" : "6px"} bg={i === 0 ? "gray.300" : "gray.200"} borderRadius="sm" w={`${w}%`} />
                        )
                      )}
                    </VStack>
                    <div className="scan-beam" />
                    <div className="scan-glow" />
                  </Box>

                  {/* Campos detectados */}
                  <VStack spacing={2} align="stretch">
                    <Text fontSize="12px" color="gray.500" mb={1}>Campos detectados</Text>
                    {[
                      { label: "Inquilino" },
                      { label: "Propietario" },
                      { label: "Dirección" },
                      { label: "Monto" },
                      { label: "Fechas", warn: true },
                      { label: "Garantes" },
                    ].map(({ label, warn }) => (
                      <Box
                        key={label}
                        className="scan-row"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        px={2}
                        py="6px"
                        borderRadius="md"
                        fontSize="12px"
                      >
                        <Text color="gray.500">{label}</Text>
                        <Text color={warn ? "orange.400" : "green.500"} fontSize="11px">
                          {warn ? "⚠" : "✓"}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Grid>

                {/* Mensaje pulsante */}
                <Box
                  mt={3}
                  bg="gray.50"
                  _dark={{ bg: "gray.700" }}
                  borderRadius="md"
                  px={3}
                  py={2}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <Text fontSize="18px">🧠</Text>
                  <Text fontSize="12px" color="gray.500" className="pulse-text">
                    {ETAPAS[etapa]}
                  </Text>
                </Box>

                {/* Dots */}
                <HStack justify="center" mt={3} spacing={2}>
                  <Box className="dot1" w="7px" h="7px" borderRadius="full" bg="blue.400" />
                  <Box className="dot2" w="7px" h="7px" borderRadius="full" bg="blue.400" />
                  <Box className="dot3" w="7px" h="7px" borderRadius="full" bg="blue.400" />
                </HStack>
              </Box>
            )}

            {/* Error */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Resultado */}
            {resultado && (
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="600" fontSize="lg">Análisis completado</Text>
                  <Badge colorScheme={confianzaColor[resultado.confianza] || "gray"} fontSize="sm" px={3} py={1} borderRadius="full">
                    Confianza: {resultado.confianza}
                  </Badge>
                </HStack>

                {/* Campos extraídos */}
                <Box bg="green.50" _dark={{ bg: "green.900" }} borderRadius="md" p={3}>
                  <Text fontWeight="500" color="green.700" _dark={{ color: "green.300" }} mb={2} fontSize="sm">
                    Campos detectados
                  </Text>
                  <HStack flexWrap="wrap" spacing={2}>
                    {Object.entries(resultado.datos)
                      .filter(([, v]) => v && v !== "" && v !== false && !(Array.isArray(v) && v.length === 0))
                      .map(([k]) => (
                        <Badge key={k} colorScheme="green" fontSize="xs">{k}</Badge>
                      ))}
                  </HStack>
                </Box>

                {/* Advertencias */}
                {resultado.advertencias?.length > 0 && (
                  <Box bg="yellow.50" _dark={{ bg: "yellow.900" }} borderRadius="md" p={3}>
                    <HStack mb={2}>
                      <Icon as={FiAlertTriangle} color="yellow.600" />
                      <Text fontWeight="500" color="yellow.700" _dark={{ color: "yellow.300" }} fontSize="sm">
                        {resultado.advertencias.length} advertencia{resultado.advertencias.length > 1 ? "s" : ""}
                      </Text>
                    </HStack>
                    <List spacing={1}>
                      {resultado.advertencias.map((adv, i) => (
                        <ListItem key={i} fontSize="sm">
                          <ListIcon as={FiAlertTriangle} color="yellow.500" />
                          <strong>{adv.campo}:</strong> {adv.mensaje}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </VStack>
            )}

          </VStack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={handleCerrar} isDisabled={cargando}>
            Cancelar
          </Button>
          {!resultado ? (
            <Button
              colorScheme="blue"
              onClick={handleAnalizar}
              isLoading={cargando}
              isDisabled={!archivo || cargando}
              leftIcon={<Icon as={FiFileText} />}
            >
              Analizar PDF
            </Button>
          ) : (
            <Button
              colorScheme="green"
              onClick={handleConfirmar}
              leftIcon={<Icon as={FiCheck} />}
            >
              Usar estos datos
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
