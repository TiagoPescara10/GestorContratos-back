import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Spinner,
  Center,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  SimpleGrid,
  Icon,
  useToast,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  Card,
  CardBody,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import {
  MdOpenInNew,
  MdContentCopy,
  MdCheckCircle,
  MdOutlineFilePresent,
  MdLink,
  MdPeople,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { getPortales, marcarRevisado, marcarPagado } from "../api/portal";
import { api } from "../api/client";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function formatMonto(valor) {
  const num = Number(valor);
  if (isNaN(num)) return "—";
  return `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ComprobanteRow({ mes, portal, onMesActualizado }) {
  const [revisando, setRevisando]   = useState(false);
  const [pagando, setPagando]       = useState(false);
  const toast = useToast();

  const handleRevisar = async () => {
    setRevisando(true);
    try {
      const actualizado = await marcarRevisado(portal.token, mes.mes, mes.anio);
      toast({ title: "Marcado como revisado", status: "success", duration: 2000, isClosable: true });
      onMesActualizado(actualizado);
    } catch (err) {
      toast({ title: "Error", description: err?.message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setRevisando(false);
    }
  };

  const handlePagar = async () => {
    setPagando(true);
    try {
      const actualizado = await marcarPagado(portal.contrato, mes.mes, mes.anio);
      toast({ title: "Mes marcado como pagado", status: "success", duration: 2000, isClosable: true });
      onMesActualizado(actualizado);
    } catch (err) {
      toast({ title: "Error", description: err?.message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setPagando(false);
    }
  };

  return (
    <Box
      p={3}
      border="1px solid"
      borderColor={mes.comprobante_revisado ? "green.200" : "orange.200"}
      borderRadius="lg"
      bg={mes.comprobante_revisado ? "green.50" : "orange.50"}
    >
      <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
        <VStack align="start" spacing={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {MESES[mes.mes]} {mes.anio}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {formatMonto(mes.montoFinal)}
          </Text>
        </VStack>
        <HStack spacing={2} flexWrap="wrap">
          <Badge
            colorScheme={mes.comprobante_revisado ? "green" : "orange"}
            borderRadius="full"
            px={2}
            fontSize="xs"
          >
            {mes.comprobante_revisado ? "Revisado" : "Sin revisar"}
          </Badge>
          <Badge
            colorScheme={mes.estado === "pagado" ? "green" : "gray"}
            borderRadius="full"
            px={2}
            fontSize="xs"
          >
            {mes.estado === "pagado" ? "Pagado" : "Pendiente"}
          </Badge>
        </HStack>
      </HStack>

      {mes.comprobante_nombre && (
        <HStack spacing={2} mb={2}>
          <Icon as={MdOutlineFilePresent} color="gray.500" />
          <Text fontSize="xs" color="gray.600" noOfLines={1}>
            {mes.comprobante_nombre}
          </Text>
          <Button
            as="a"
            href={mes.comprobante_url}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            variant="link"
            colorScheme="blue"
            leftIcon={<Icon as={MdOpenInNew} />}
          >
            Abrir
          </Button>
        </HStack>
      )}

      <HStack spacing={2} mt={1}>
        {!mes.comprobante_revisado && (
          <Button
            size="xs"
            colorScheme="orange"
            variant="outline"
            onClick={handleRevisar}
            isLoading={revisando}
            loadingText="..."
          >
            Marcar revisado
          </Button>
        )}
        {mes.estado !== "pagado" && (
          <Button
            size="xs"
            colorScheme="green"
            onClick={handlePagar}
            isLoading={pagando}
            loadingText="..."
          >
            Marcar pagado
          </Button>
        )}
        {mes.comprobante_revisado && mes.estado === "pagado" && (
          <HStack color="green.600" spacing={1}>
            <Icon as={MdCheckCircle} />
            <Text fontSize="xs">Listo</Text>
          </HStack>
        )}
      </HStack>
    </Box>
  );
}

function PortalCard({ portal, onMesActualizado }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [verHistorial, setVerHistorial] = useState(false);

  const mesesConComprobante = (portal.meses_comprobantes || []).filter(
    (m) => m.comprobante_url
  );
  const sinRevisar = mesesConComprobante.filter((m) => !m.comprobante_revisado);
  const historial  = mesesConComprobante.filter((m) => m.comprobante_revisado);

  const hoy        = new Date();
  const mesActual  = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  const linkMes    = `${window.location.origin}/inquilino/${portal.token}/${mesActual}/${anioActual}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(linkMes || "");
    toast({ title: "Enlace copiado", status: "info", duration: 2000, isClosable: true });
  };

  return (
    <AccordionItem
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      mb={3}
      overflow="hidden"
    >
      <AccordionButton
        _expanded={{ bg: "blue.50" }}
        px={4}
        py={3}
        _hover={{ bg: "gray.50" }}
      >
        <HStack flex="1" spacing={3} flexWrap="wrap" gap={2}>
          <VStack align="start" spacing={0} flex="1" minW="180px">
            <Text fontWeight="semibold" fontSize="sm">
              {portal.contrato_nombre}
            </Text>
            <Text fontSize="xs" color="gray.500">{portal.contrato_direccion}</Text>
          </VStack>

          <HStack spacing={2} flexWrap="wrap">
            <Badge
              colorScheme={portal.activo ? "green" : "gray"}
              borderRadius="full"
              px={2}
              fontSize="xs"
            >
              {portal.activo ? "Activo" : "Inactivo"}
            </Badge>
            {sinRevisar.length > 0 && (
              <Badge colorScheme="orange" borderRadius="full" px={2} fontSize="xs">
                {sinRevisar.length} sin revisar
              </Badge>
            )}
          </HStack>
        </HStack>

        <HStack spacing={2} mr={2} onClick={(e) => e.stopPropagation()}>
          {historial.length > 0 && (
            <Button
              size="xs"
              variant="ghost"
              colorScheme="gray"
              onClick={() => setVerHistorial((v) => !v)}
            >
              {verHistorial ? "Ocultar historial" : `Ver historial (${historial.length})`}
            </Button>
          )}
          {portal.mes_actual_estado === "pagado" ? (
            <Badge colorScheme="yellow" borderRadius="full" px={2} fontSize="xs">
              Mes actual pagado
            </Badge>
          ) : (() => {
            const telefono = portal.contrato_inquilino?.telefono;
            const nombre   = portal.contrato_inquilino?.nombre || portal.contrato_nombre;
            const numero   = telefono ? telefono.replace(/\D/g, "") : null;
            const mensaje  = encodeURIComponent(
              `Hola ${nombre}, te recordamos que tenés un pago pendiente. Podés ver el detalle y subir tu comprobante aquí: ${linkMes}`
            );
            const waUrl    = numero ? `https://wa.me/${numero}?text=${mensaje}` : null;
            return (
              <Tooltip label={waUrl ? "Enviar WhatsApp" : "Sin teléfono registrado"}>
                <IconButton
                  as={waUrl ? "a" : "button"}
                  href={waUrl || undefined}
                  target={waUrl ? "_blank" : undefined}
                  rel={waUrl ? "noopener noreferrer" : undefined}
                  icon={<Icon as={FaWhatsapp} />}
                  size="xs"
                  variant="ghost"
                  aria-label="WhatsApp"
                  color={waUrl ? "green.500" : "gray.300"}
                  isDisabled={!waUrl}
                  _disabled={{ cursor: "not-allowed", opacity: 0.4 }}
                />
              </Tooltip>
            );
          })()}
          {portal.activo && portal.link && (
            <>
              <Tooltip label="Copiar enlace">
                <IconButton
                  icon={<Icon as={MdContentCopy} />}
                  size="xs"
                  variant="ghost"
                  aria-label="Copiar enlace"
                  onClick={copiarLink}
                />
              </Tooltip>
              <Tooltip label="Abrir portal">
                <IconButton
                  as="a"
                  href={portal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<Icon as={MdOpenInNew} />}
                  size="xs"
                  variant="ghost"
                  aria-label="Abrir portal"
                />
              </Tooltip>
            </>
          )}
          <Tooltip label="Ver contrato">
            <IconButton
              icon={<Icon as={MdLink} />}
              size="xs"
              variant="ghost"
              aria-label="Ver contrato"
              onClick={() => navigate(`/detalle/${portal.contrato}`)}
            />
          </Tooltip>
        </HStack>

        <AccordionIcon />
      </AccordionButton>

      <AccordionPanel px={4} pb={4}>
        {/* Pendientes — visible por defecto */}
        {sinRevisar.length === 0 ? (
          <HStack color="green.600" spacing={2} py={2} mb={historial.length > 0 ? 3 : 0}>
            <Icon as={MdCheckCircle} />
            <Text fontSize="sm" fontWeight="medium">Sin comprobantes pendientes ✓</Text>
          </HStack>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={historial.length > 0 ? 4 : 0}>
            {sinRevisar.map((mes) => (
              <ComprobanteRow
                key={`${mes.mes}-${mes.anio}`}
                mes={mes}
                portal={portal}
                onMesActualizado={onMesActualizado}
              />
            ))}
          </SimpleGrid>
        )}

        {/* Historial — controlado por el botón del header */}
        {verHistorial && historial.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {historial.map((mes) => (
              <ComprobanteRow
                key={`${mes.mes}-${mes.anio}`}
                mes={mes}
                portal={portal}
                onMesActualizado={onMesActualizado}
              />
            ))}
          </SimpleGrid>
        )}
      </AccordionPanel>
    </AccordionItem>
  );
}

export default function PortalAdmin() {
  const [portales, setPortales] = useState([]);
  const [loading, setLoading]   = useState(true);
  const bgColor = useColorModeValue("gray.100", "gray.900");
  const cardBg  = useColorModeValue("white", "gray.800");

  const actualizarMes = useCallback((portalId, mesActualizado) => {
    const hoy = new Date();
    setPortales((prev) => prev.map((p) => {
      if (p.id !== portalId) return p;
      const esActual =
        mesActualizado.mes === hoy.getMonth() &&
        mesActualizado.anio === hoy.getFullYear();
      return {
        ...p,
        meses_comprobantes: p.meses_comprobantes.map((m) =>
          m.mes === mesActualizado.mes && m.anio === mesActualizado.anio
            ? { ...m, ...mesActualizado }
            : m
        ),
        ...(esActual ? { mes_actual_estado: mesActualizado.estado } : {}),
      };
    }));
  }, []);

  const cargar = useCallback(async () => {
    try {
      const data = await getPortales();
      const hoy  = new Date();
      const enriquecidos = await Promise.all(
        data.map(async (portal) => {
          try {
            const contrato    = await api.get(`contratos/${portal.contrato}/`);
            const meses       = contrato.meses || [];
            const mesActual   = meses.find(
              (m) => m.mes === hoy.getMonth() && m.anio === hoy.getFullYear()
            );
            return {
              ...portal,
              meses_comprobantes: meses.filter((m) => m.comprobante_url),
              mes_actual_estado:  mesActual?.estado || null,
            };
          } catch {
            return { ...portal, meses_comprobantes: [], mes_actual_estado: null };
          }
        })
      );
      setPortales(enriquecidos);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalSinRevisar = portales.reduce(
    (acc, p) => acc + (p.comprobantes_pendientes || 0),
    0
  );
  const activos = portales.filter((p) => p.activo).length;

  return (
    <Box p={{ base: 4, md: 8 }} minH="100vh" bg={bgColor}>
      <VStack align="stretch" spacing={6}>
        <HStack spacing={3}>
          <Icon as={MdPeople} boxSize={7} color="blue.500" />
          <Heading size="xl">Portal de Inquilinos</Heading>
        </HStack>

        {/* Stats */}
        <Card bg={cardBg} boxShadow="md" borderRadius="xl">
          <CardBody p={6}>
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={6}>
              <Stat>
                <StatLabel fontSize="sm" color="gray.500">Portales totales</StatLabel>
                <StatNumber fontSize="2xl">{portales.length}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.500">Portales activos</StatLabel>
                <StatNumber fontSize="2xl" color="green.500">{activos}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontSize="sm" color="gray.500">Comprobantes sin revisar</StatLabel>
                <StatNumber fontSize="2xl" color={totalSinRevisar > 0 ? "orange.500" : "gray.400"}>
                  {totalSinRevisar}
                </StatNumber>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        <Divider />

        {loading ? (
          <Center py={12}>
            <Spinner size="xl" color="blue.500" />
          </Center>
        ) : portales.length === 0 ? (
          <Center py={12}>
            <VStack spacing={2}>
              <Text fontSize="lg" color="gray.500">No hay portales creados aún.</Text>
              <Text fontSize="sm" color="gray.400">
                Activá el portal desde el detalle de cualquier contrato.
              </Text>
            </VStack>
          </Center>
        ) : (
          <>
            <Text fontSize="sm" color="gray.500">
              Hacé clic en un portal para ver y gestionar los comprobantes subidos.
            </Text>
            <Accordion allowMultiple defaultIndex={[]}>
              {portales
                .sort((a, b) => (b.comprobantes_pendientes || 0) - (a.comprobantes_pendientes || 0))
                .map((portal) => (
                  <PortalCard key={portal.id} portal={portal} onMesActualizado={(m) => actualizarMes(portal.id, m)} />
                ))}
            </Accordion>
          </>
        )}
      </VStack>
    </Box>
  );
}
