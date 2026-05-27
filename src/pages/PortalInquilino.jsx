import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, VStack, HStack, SimpleGrid, Heading, Text, Badge,
  Button, Spinner, Center, Icon, useToast,
} from "@chakra-ui/react";
import { MdUploadFile, MdCheckCircle, MdHourglassEmpty } from "react-icons/md";
import { getPortalPublico, subirComprobante } from "../api/portal";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function formatMonto(valor) {
  const num = Number(valor);
  if (isNaN(num)) return "—";
  return `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getChip(estado, fechaVencimiento) {
  if (estado === "pagado") return { label: "Pagado", colorScheme: "green" };
  if (estado === "mora")   return { label: "En mora", colorScheme: "red" };
  if (fechaVencimiento && new Date() > new Date(fechaVencimiento + "T23:59:59"))
    return { label: "En mora", colorScheme: "red" };
  return { label: "Pendiente", colorScheme: "orange" };
}

function MesCard({ mes, token, onUploadSuccess }) {
  const fileRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const toast = useToast();

  const isPagado = mes.estado === "pagado";
  const enviado  = Boolean(mes.comprobante_url);
  const chip     = getChip(mes.estado, mes.fecha_vencimiento);

  const handleArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.type !== "application/pdf") {
      toast({ title: "Solo se aceptan archivos PDF.", status: "error", duration: 3000, isClosable: true });
      return;
    }
    setSubiendo(true);
    try {
      const actualizado = await subirComprobante(token, mes.mes, mes.anio, archivo);
      onUploadSuccess(actualizado);
      toast({ title: "Comprobante enviado ✓", status: "success", duration: 4000, isClosable: true });
    } catch (err) {
      toast({ title: "Error al subir", description: err?.message || "Intentá de nuevo.", status: "error", duration: 4000, isClosable: true });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  return (
    <Box bg="white" borderRadius="xl" p={4} boxShadow="sm" border="1px solid" borderColor="gray.100">
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="semibold" fontSize="md">{MESES[mes.mes]} {mes.anio}</Text>
        <Badge colorScheme={chip.colorScheme} borderRadius="full" px={3} py={1} fontSize="xs" fontWeight="bold">
          {chip.label}
        </Badge>
      </HStack>

      <Text fontSize="xl" fontWeight="bold" color="gray.800">
        {formatMonto(mes.montoFinal)}
      </Text>

      {mes.fecha_vencimiento && !isPagado && (
        <Text fontSize="xs" color="gray.400" mt={1}>
          Vence {new Date(mes.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-AR")}
        </Text>
      )}

      {/* Desglose */}
      <Box mt={3} pt={3} borderTop="1px solid" borderColor="gray.100">
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">Alquiler</Text>
            <Text fontSize="xs" fontWeight="medium" color="gray.700">{formatMonto(mes.montoBase)}</Text>
          </HStack>
          {Number(mes.cargosAdicionales) > 0 && (
            <HStack justify="space-between">
              <Text fontSize="xs" color="gray.500">Expensas</Text>
              <Text fontSize="xs" fontWeight="medium" color="gray.700">{formatMonto(mes.cargosAdicionales)}</Text>
            </HStack>
          )}
          {mes.mora_aplicada && Number(mes.recargo_mora) > 0 && (
            <HStack justify="space-between">
              <Text fontSize="xs" color="red.500">Mora ({mes.dias_atraso}d)</Text>
              <Text fontSize="xs" fontWeight="medium" color="red.500">+{formatMonto(mes.recargo_mora)}</Text>
            </HStack>
          )}
        </VStack>
      </Box>

      {!isPagado && (
        enviado ? (
          <HStack color="blue.600" spacing={2} mt={3}>
            <Icon as={MdCheckCircle} boxSize={5} />
            <Text fontSize="sm" fontWeight="medium">Comprobante enviado ✓</Text>
          </HStack>
        ) : (
          <Button
            mt={3} w="full" h="52px" borderRadius="xl"
            colorScheme="blue" leftIcon={<Icon as={MdUploadFile} boxSize={5} />}
            onClick={() => fileRef.current?.click()}
            isLoading={subiendo} loadingText="Subiendo..."
          >
            Subir comprobante
          </Button>
        )
      )}

      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleArchivo} />
    </Box>
  );
}

function MontoActual({ meses }) {
  const hoy = new Date();
  const actual = meses.find(m => m.mes === hoy.getMonth() && m.anio === hoy.getFullYear());
  if (!actual) return null;
  return (
    <Box mt={3}>
      <Text fontSize="xs" opacity={0.7}>Mes actual</Text>
      <Text fontSize="2xl" fontWeight="bold">{formatMonto(actual.montoFinal)}</Text>
    </Box>
  );
}

export default function PortalInquilino() {
  const { token } = useParams();
  const [contrato, setContrato] = useState(null);
  const [meses, setMeses]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    getPortalPublico(token)
      .then((data) => { setContrato(data); setMeses(data.meses || []); })
      .catch((err) => {
        if (err?.status === 403)      setError("Este portal no está disponible.");
        else if (err?.status === 404) setError("El enlace no es válido o ya no existe.");
        else                          setError("No se pudo cargar la información. Intentá más tarde.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleUploadSuccess = (actualizado) =>
    setMeses((prev) => prev.map((m) =>
      m.mes === actualizado.mes && m.anio === actualizado.anio ? actualizado : m
    ));

  if (loading) return (
    <Center minH="100vh" bg="gray.50">
      <VStack spacing={3}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text color="gray.400" fontSize="sm">Cargando...</Text>
      </VStack>
    </Center>
  );

  if (error) return (
    <Center minH="100vh" bg="gray.50">
      <VStack spacing={3} textAlign="center" px={6}>
        <Icon as={MdHourglassEmpty} boxSize={14} color="gray.300" />
        <Heading size="md" color="gray.500">Portal no disponible</Heading>
        <Text color="gray.400" fontSize="sm">{error}</Text>
      </VStack>
    </Center>
  );

  const pendientes = meses.filter((m) => m.estado !== "pagado");
  const pagados    = meses.filter((m) => m.estado === "pagado");

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="blue.700" color="white" px={4} pt={8} pb={6}>
        <Box maxW={{ base: "430px", md: "900px" }} mx="auto">
          <Text fontSize="xs" fontWeight="bold" letterSpacing="wider" opacity={0.65} textTransform="uppercase" mb={3}>
            Portal del Inquilino
          </Text>
          <Heading size="md" fontWeight="bold" lineHeight="1.2" mb={1}>
            {contrato.inquilinoNombre}
          </Heading>
          <Text fontSize="sm" opacity={0.85}>
            {contrato.direccion}
            {contrato.piso ? `, Piso ${contrato.piso}` : ""}
            {contrato.departamento ? ` Dpto. ${contrato.departamento}` : ""}
          </Text>
          <Text fontSize="xs" opacity={0.65}>
            {contrato.localidad}, {contrato.provincia}
          </Text>
          <MontoActual meses={meses} />
        </Box>
      </Box>

      {/* Cards */}
      <Box maxW={{ base: "430px", md: "900px" }} mx="auto" px={4} py={5}>
        <VStack align="stretch" spacing={5}>
          {pendientes.length > 0 && (
            <VStack align="stretch" spacing={3}>
              <Text fontSize="xs" fontWeight="bold" color="gray.400" letterSpacing="wider" textTransform="uppercase">
                Pendientes ({pendientes.length})
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                {pendientes.map((mes) => (
                  <MesCard key={`${mes.mes}-${mes.anio}`} mes={mes} token={token} onUploadSuccess={handleUploadSuccess} />
                ))}
              </SimpleGrid>
            </VStack>
          )}

          {pagados.length > 0 && (
            <VStack align="stretch" spacing={3}>
              <Text fontSize="xs" fontWeight="bold" color="gray.400" letterSpacing="wider" textTransform="uppercase">
                Pagados ({pagados.length})
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                {pagados.map((mes) => (
                  <MesCard key={`${mes.mes}-${mes.anio}`} mes={mes} token={token} onUploadSuccess={handleUploadSuccess} />
                ))}
              </SimpleGrid>
            </VStack>
          )}

          {meses.length === 0 && (
            <Center py={10}>
              <Text color="gray.400" fontSize="sm">No hay meses cargados.</Text>
            </Center>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
