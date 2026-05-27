import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, VStack, HStack, Heading, Text, Badge,
  Button, Spinner, Center, Icon, useToast, Divider,
} from "@chakra-ui/react";
import { MdUploadFile, MdCheckCircle, MdHourglassEmpty } from "react-icons/md";
import { getPortalMes, subirComprobante } from "../api/portal";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function formatMonto(valor) {
  const num = Number(valor);
  if (isNaN(num)) return "—";
  return `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortalMes() {
  const { token, mes, anio } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef(null);
  const toast   = useToast();

  useEffect(() => {
    getPortalMes(token, mes, anio)
      .then(setData)
      .catch((err) => {
        if (err?.status === 403)      setError("Este portal no está disponible.");
        else if (err?.status === 404) setError("El enlace no es válido o ya no existe.");
        else                          setError("No se pudo cargar la información. Intentá más tarde.");
      })
      .finally(() => setLoading(false));
  }, [token, mes, anio]);

  const handleArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.type !== "application/pdf") {
      toast({ title: "Solo se aceptan archivos PDF.", status: "error", duration: 3000, isClosable: true });
      return;
    }
    setSubiendo(true);
    try {
      const actualizado = await subirComprobante(token, mes, anio, archivo);
      setData((prev) => ({ ...prev, mes: actualizado }));
      toast({ title: "Comprobante enviado ✓", status: "success", duration: 4000, isClosable: true });
    } catch (err) {
      toast({ title: "Error al subir", description: err?.message || "Intentá de nuevo.", status: "error", duration: 4000, isClosable: true });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

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

  const { contrato, mes: mesData } = data;
  const isPagado         = mesData.estado === "pagado";
  const tieneComprobante = Boolean(mesData.comprobante_url);
  const mesNum           = Number(mes);
  const anioNum          = Number(anio);

  const alquilerEfectivo =
    Number(mesData.montoFinal || 0)
    - Number(mesData.cargosAdicionales || 0)
    - Number(mesData.iva || 0)
    - Number(mesData.honorarios || 0)
    - (mesData.mora_aplicada ? Number(mesData.recargo_mora || 0) : 0);

  const extrasConPrecio = (contrato.conceptosExtras || []).filter((c) => Number(c.precio) > 0);
  const totalExtras     = extrasConPrecio.reduce((sum, c) => sum + Number(c.precio), 0);
  const totalMostrado   =
    alquilerEfectivo
    + totalExtras
    + Number(mesData.iva || 0)
    + Number(mesData.honorarios || 0)
    + (mesData.mora_aplicada ? Number(mesData.recargo_mora || 0) : 0);

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="blue.700" color="white" px={4} pt={8} pb={6}>
        <Box maxW="480px" mx="auto">
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
        </Box>
      </Box>

      {/* Body */}
      <Box maxW="480px" mx="auto" px={4} py={6}>
        <Heading size="lg" mb={1} color="gray.800">
          {MESES[mesNum]} {anioNum}
        </Heading>

        {mesData.fecha_vencimiento && !isPagado && (
          <Text fontSize="sm" color="gray.400" mb={4}>
            Vence {new Date(mesData.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-AR")}
          </Text>
        )}

        {/* Desglose */}
        <Box bg="white" borderRadius="xl" p={5} boxShadow="sm" border="1px solid" borderColor="gray.100" mb={5}>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text color="gray.500">Alquiler</Text>
              <Text fontWeight="medium" color="gray.800">{formatMonto(alquilerEfectivo)}</Text>
            </HStack>

            {extrasConPrecio.map((c, i) => (
                <HStack key={i} justify="space-between">
                  <Text color="gray.500">{c.nombre}</Text>
                  <Text fontWeight="medium" color="gray.800">{formatMonto(c.precio)}</Text>
                </HStack>
              ))
            }

            {Number(mesData.iva) > 0 && (
              <HStack justify="space-between">
                <Text color="gray.500">IVA</Text>
                <Text fontWeight="medium" color="gray.800">{formatMonto(mesData.iva)}</Text>
              </HStack>
            )}

            {Number(mesData.honorarios) > 0 && (
              <HStack justify="space-between">
                <Text color="gray.500">Honorarios</Text>
                <Text fontWeight="medium" color="gray.800">{formatMonto(mesData.honorarios)}</Text>
              </HStack>
            )}

            {mesData.mora_aplicada && Number(mesData.recargo_mora) > 0 && (
              <HStack justify="space-between">
                <Text color="red.500">Mora ({mesData.dias_atraso} días)</Text>
                <Text fontWeight="medium" color="red.500">+{formatMonto(mesData.recargo_mora)}</Text>
              </HStack>
            )}

            <Divider />

            <HStack justify="space-between" align="baseline">
              <Text fontWeight="bold" fontSize="lg" color="gray.800">Total</Text>
              <Text fontWeight="bold" fontSize="2xl" color="blue.700">{formatMonto(totalMostrado)}</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Estado y acción */}
        {isPagado ? (
          <HStack color="green.600" spacing={2} justify="center" py={4}>
            <Icon as={MdCheckCircle} boxSize={6} />
            <Text fontSize="lg" fontWeight="semibold">Pagado ✓</Text>
          </HStack>
        ) : tieneComprobante ? (
          <HStack
            color="orange.600"
            bg="orange.50"
            border="1px solid"
            borderColor="orange.200"
            borderRadius="xl"
            spacing={2}
            justify="center"
            py={4}
            px={5}
          >
            <Icon as={MdCheckCircle} boxSize={5} />
            <Text fontSize="md" fontWeight="medium">Comprobante en revisión ✓</Text>
          </HStack>
        ) : (
          <VStack align="stretch" spacing={3}>
            <Badge
              colorScheme={mesData.estado === "mora" ? "red" : "orange"}
              borderRadius="full"
              px={3}
              py={1}
              fontSize="sm"
              alignSelf="flex-start"
            >
              {mesData.estado === "mora" ? "En mora" : "Pendiente de pago"}
            </Badge>
            <Button
              w="full"
              h="60px"
              borderRadius="xl"
              colorScheme="blue"
              fontSize="lg"
              leftIcon={<Icon as={MdUploadFile} boxSize={6} />}
              onClick={() => fileRef.current?.click()}
              isLoading={subiendo}
              loadingText="Subiendo..."
            >
              Subir comprobante
            </Button>
          </VStack>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleArchivo}
        />
      </Box>
    </Box>
  );
}
