import {
  Box,
  VStack,
  Text,
  Flex,
  Icon,
  useColorModeValue,
  Tooltip,
  Divider,
  Avatar,
  useBreakpointValue
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  MdLogout,
  MdBusiness,
  MdAccountBalance,
  MdAddBox,
  MdPeople,
  MdPendingActions,
  MdTrendingUp,
  MdAttachMoney,
  MdPortrait,
} from "react-icons/md";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const bgColor = useColorModeValue("gray.900", "gray.800");
  const hoverBg = useColorModeValue("gray.800", "gray.700");
  const activeBg = useColorModeValue("blue.600", "blue.500");
  const textColor = useColorModeValue("white", "gray.100");

  const menuItems = [
    { 
      path: "/dashboard", 
      icon: MdAccountBalance, 
      label: "Panel de Control",
      description: "Vista general y métricas"
    },
    { 
      path: "/cargar-contrato", 
      icon: MdAddBox, 
      label: "Nuevo Contrato",
      description: "Agregar nuevo contrato"
    },
    {
      path: "/contratos",
      icon: MdPeople,
      label: "Contratos",
      description: "Gestionar contratos"
    },
    {
      path: "/pendientes",
      icon: MdPendingActions,
      label: "Pendientes",
      description: "Contratos pendientes de pago"
    },
    {
      path: "/indices",
      icon: MdTrendingUp,
      label: "Índices",
      description: "IPC e ICL histórico"
    },
    {
      path: "/finanzas",
      icon: MdAttachMoney,
      label: "Finanzas",
      description: "Resumen financiero"
    },
    {
      path: "/propietarios",
      icon: MdPeople,
      label: "Propietarios",
      description: "Lista de propietarios"
    },
    {
      path: "/portal-inquilinos",
      icon: MdPortrait,
      label: "Portal Inquilinos",
      description: "Gestión de portales y comprobantes"
    },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = () => {
    if (!user) return "GC";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username?.substring(0, 2).toUpperCase() || "GC";
  };

  const getUserDisplayName = () => {
    if (!user) return "Giordano Conti";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || "Usuario";
  };

  return (
    <Box
      w={{ base: "60px", md: "240px" }}
      bg={bgColor}
      color={textColor}
      h="100vh"
      p={{ base: 2, md: 4 }}
      position="fixed"
      left={0}
      top={0}
      transition="all 0.3s ease"
      boxShadow="lg"
      zIndex="1000"
      overflowY="hidden"
      overflowX="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Logo/Brand */}
      <Flex
        align="center"
        mb={4}
        justify={{ base: "center", md: "flex-start" }}
      >
        <Avatar
          w="40px"
          h="40px"
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          borderRadius="lg"
          display="flex"
          align="center"
          justify="center"
          mr={{ base: 0, md: 3 }}
          name={getUserInitials()}
          icon={<Icon as={MdBusiness} boxSize={6} color="white" />}
        />
        <VStack align="start" spacing={0} display={{ base: "none", md: "flex" }}>
          <Text 
            fontSize="xl" 
            fontWeight="bold"
            color={textColor}
            noOfLines={1}
          >
            {getUserDisplayName()}
          </Text>
          <Text 
            fontSize="xs" 
            color="gray.400"
            noOfLines={1}
          >
            Gestión Inmobiliaria
          </Text>
        </VStack>
      </Flex>

      {/* Navigation Menu */}
      <VStack align="stretch" spacing={2} flex="1">
        {menuItems.map((item) => (
          <Tooltip
            key={item.path}
            label={item.label}
            description={!isMobile ? item.description : undefined}
            placement="right"
            isDisabled={!isMobile}
            openDelay={500}
          >
            <Link to={item.path}>
              <Flex
                align="center"
                p={2}
                borderRadius="lg"
                bg={isActive(item.path) ? activeBg : "transparent"}
                color={isActive(item.path) ? "white" : textColor}
                _hover={{
                  bg: isActive(item.path) ? activeBg : hoverBg,
                  transform: "translateX(2px)",
                }}
                transition="all 0.2s ease"
                cursor="pointer"
                justify={{ base: "center", md: "flex-start" }}
                position="relative"
              >
                {isActive(item.path) && (
                  <Box
                    position="absolute"
                    left={0}
                    top="50%"
                    transform="translateY(-50%)"
                    w="2px"
                    h="60%"
                    bg="white"
                    borderRadius="0 2px 2px 0"
                  />
                )}
                <Icon as={item.icon} boxSize={6} mr={{ base: 0, md: 3 }} />
                <Text 
                  display={{ base: "none", md: "block" }}
                  fontWeight={isActive(item.path) ? "medium" : "normal"}
                >
                  {item.label}
                </Text>
              </Flex>
            </Link>
          </Tooltip>
        ))}
        {/* Logout Button */}
        <Tooltip
          label="Cerrar Sesión"
          placement="right"
          isDisabled={!isMobile}
        >
          <Flex
            align="center"
            p={2}
            borderRadius="lg"
            color="red.400"
            _hover={{
              bg: "red.500",
              color: "white",
              transform: "translateX(2px)",
            }}
            transition="all 0.2s ease"
            cursor="pointer"
            justify={{ base: "center", md: "flex-start" }}
            onClick={handleLogout}
          >
            <Icon as={MdLogout} boxSize={6} mr={{ base: 0, md: 3 }} />
            <Text display={{ base: "none", md: "block" }}>
              Cerrar Sesión
            </Text>
          </Flex>
        </Tooltip>
      </VStack>

      <Divider
        my={3}
        borderColor="gray.600"
        display={{ base: "none", md: "block" }}
      />

      {/* User Info */}
      <Box display={{ base: "none", md: "block" }} w="100%" flexShrink={0}>
        <VStack align="start" spacing={1} p={3} borderRadius="lg" bg="gray.800">
          <Text fontSize="xs" color="gray.400">
            Usuario actual
          </Text>
          <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
            {user?.username || "admin"}
          </Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {user?.email || "admin@example.com"}
          </Text>
        </VStack>
      </Box>

    </Box>
  );
}
