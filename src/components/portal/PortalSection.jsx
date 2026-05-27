import { useEffect, useState } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Heading,
  Divider,
  Spinner,
  Icon,
  useToast,
  useColorModeValue,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";
import { MdContentCopy, MdOpenInNew, MdLink, MdLinkOff } from "react-icons/md";
import { getPortalInfo, activarPortal, desactivarPortal } from "../../api/portal";

export default function PortalSection({ contratoId }) {
  const [portal, setPortal]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activando, setActivando] = useState(false);
  const toast = useToast();

  const bg          = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const cargar = () => {
    setLoading(true);
    getPortalInfo(contratoId)
      .then((data) => setPortal(data?.portal !== null ? data : null))
      .catch(() => setPortal(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [contratoId]);

  const handleActivar = async () => {
    setActivando(true);
    try {
      const data = await activarPortal(contratoId);
      setPortal(data);
      toast({
        title: "Portal activado",
        description: "El enlace ya está listo para compartir.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error al activar portal",
        description: err?.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setActivando(false);
    }
  };

  const handleDesactivar = async () => {
    setActivando(true);
    try {
      await desactivarPortal(contratoId);
      setPortal((prev) => ({ ...prev, activo: false }));
      toast({ title: "Portal desactivado", status: "info", duration: 3000, isClosable: true });
    } catch (err) {
      toast({
        title: "Error al desactivar",
        description: err?.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setActivando(false);
    }
  };

  const copiarLink = () => {
    if (!portal?.link) return;
    navigator.clipboard.writeText(portal.link);
    toast({ title: "Enlace copiado", status: "info", duration: 2000, isClosable: true });
  };

  return (
    <Box mt={8}>
      <Divider mb={6} />
      <Heading size="sm" mb={4} color="gray.600">
        Portal del Inquilino
      </Heading>

      <Box
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="xl"
        p={4}
      >
        {loading ? (
          <HStack spacing={3}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="sm" color="gray.500">Cargando...</Text>
          </HStack>
        ) : !portal || portal.activo === false && portal.portal === null ? (
          /* Sin portal creado */
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium" fontSize="sm">Sin portal activo</Text>
              <Text fontSize="xs" color="gray.500">
                Activá el portal para que el inquilino pueda subir comprobantes.
              </Text>
            </VStack>
            <Button
              size="sm"
              colorScheme="blue"
              leftIcon={<Icon as={MdLink} />}
              onClick={handleActivar}
              isLoading={activando}
              loadingText="Activando..."
            >
              Activar portal
            </Button>
          </HStack>
        ) : portal.activo === false ? (
          /* Portal inactivo (ya existía) */
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <VStack align="start" spacing={0}>
              <HStack spacing={2}>
                <Text fontWeight="medium" fontSize="sm">Portal inactivo</Text>
                <Badge colorScheme="gray" borderRadius="full" px={2} fontSize="xs">Inactivo</Badge>
              </HStack>
              <Text fontSize="xs" color="gray.500">
                El token se conserva. Reactivar vuelve a dar acceso con el mismo enlace.
              </Text>
            </VStack>
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              leftIcon={<Icon as={MdLink} />}
              onClick={handleActivar}
              isLoading={activando}
              loadingText="Activando..."
            >
              Reactivar
            </Button>
          </HStack>
        ) : (
          /* Portal activo */
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <HStack spacing={2}>
                <Text fontWeight="medium" fontSize="sm">Portal activo</Text>
                <Badge colorScheme="green" borderRadius="full" px={2} fontSize="xs">Activo</Badge>
                {portal.comprobantes_pendientes > 0 && (
                  <Badge colorScheme="orange" borderRadius="full" px={2} fontSize="xs">
                    {portal.comprobantes_pendientes} comprobante{portal.comprobantes_pendientes > 1 ? "s" : ""} sin revisar
                  </Badge>
                )}
              </HStack>
              <Button
                size="xs"
                colorScheme="red"
                variant="ghost"
                leftIcon={<Icon as={MdLinkOff} />}
                onClick={handleDesactivar}
                isLoading={activando}
              >
                Desactivar
              </Button>
            </HStack>

            {portal.link && (
              <HStack
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="lg"
                px={3}
                py={2}
                spacing={2}
              >
                <Text fontSize="xs" color="gray.600" flex="1" isTruncated>
                  {portal.link}
                </Text>
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
              </HStack>
            )}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
