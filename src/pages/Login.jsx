import {
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Button,
  Checkbox,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Text,
  useToast,
  useColorModeValue,
  Icon,
  Container,
} from "@chakra-ui/react"
import { keyframes } from "@emotion/react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { MdLock, MdPerson, MdVisibility, MdVisibilityOff } from "react-icons/md"

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`

function Login() {
  const [form, setForm] = useState({
    usuario: "",
    password: "",
    recordar: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const cardBg = useColorModeValue("white", "gray.800")
  const textColor = useColorModeValue("gray.800", "white")
  const inputBg = useColorModeValue("gray.50", "gray.700")

  useEffect(() => {
    const rememberedUser = localStorage.getItem("recordarUsuario")
    if (rememberedUser) {
      setForm(prev => ({ ...prev, usuario: rememberedUser, recordar: true }))
    }
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === "checkbox" ? checked : value })
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  function validateForm() {
    const newErrors = {}
    if (!form.usuario.trim()) newErrors.usuario = "El usuario es requerido"
    if (!form.password.trim()) newErrors.password = "La contraseña es requerida"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validateForm()) return

    try {
      await login(form)
      toast({
        title: "¡Bienvenido!",
        description: `Has iniciado sesión como ${form.usuario}`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top",
      })
      navigate("/dashboard")
    } catch (error) {
      toast({
        title: "Error de autenticación",
        description: error.message || "Usuario o contraseña incorrectos",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      })
    }
  }

  return (
    <Flex minH="100vh" overflow="hidden">

      {/* Panel izquierdo — solo en desktop */}
      <Flex
        flex="1"
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        align="center"
        justify="center"
        p={8}
        display={{ base: "none", lg: "flex" }}
      >
        <VStack spacing={6} color="white" textAlign="center">
          <Flex
            w="120px"
            h="120px"
            bg="white"
            borderRadius="full"
            alignItems="center"
            justifyContent="center"
            animation={`${fadeIn} 1s ease-out`}
          >
            <Text fontSize="4xl" fontWeight="bold" color="purple.600" lineHeight="1">
              GC
            </Text>
          </Flex>
          <Heading size="2xl" animation={`${fadeIn} 1.2s ease-out`}>
            Gestor de Contratos
          </Heading>
          <Text fontSize="xl" maxW="400px" opacity={0.9}>
            Sistema profesional para la gestión integral de contratos de alquiler
          </Text>
        </VStack>
      </Flex>

      {/* Panel derecho — formulario */}
      <Flex
        flex={{ base: "1", lg: "0.8" }}
        bg={useColorModeValue("gray.50", "gray.900")}
        align="center"
        justify="center"
        px={{ base: 4, sm: 8 }}
        py={{ base: 8, sm: 12 }}
      >
        <Container maxW={{ base: "full", sm: "md" }} px={0}>
          <Box
            bg={cardBg}
            p={{ base: 6, sm: 8 }}
            borderRadius="2xl"
            boxShadow="xl"
            animation={`${fadeIn} 0.8s ease-out`}
          >
            <VStack spacing={6} align="stretch">

              {/* Logo visible solo en mobile */}
              <Flex
                display={{ base: "flex", lg: "none" }}
                direction="column"
                align="center"
                gap={2}
              >
                <Flex
                  w="72px"
                  h="72px"
                  bg="purple.600"
                  borderRadius="full"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="2xl" fontWeight="bold" color="white" lineHeight="1">
                    GC
                  </Text>
                </Flex>
                <Text fontWeight="semibold" color="purple.600" fontSize="sm">
                  Gestor de Contratos
                </Text>
              </Flex>

              <VStack spacing={1}>
                <Heading
                  size={{ base: "lg", sm: "xl" }}
                  color={textColor}
                  textAlign="center"
                >
                  Iniciar Sesión
                </Heading>
                <Text color="gray.500" textAlign="center" fontSize={{ base: "sm", sm: "md" }}>
                  Ingresa tus credenciales para acceder
                </Text>
              </VStack>

              <FormControl isInvalid={!!errors.usuario}>
                <FormLabel color={textColor} fontSize={{ base: "sm", sm: "md" }}>
                  Usuario
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdPerson} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    pl={10}
                    placeholder="Ingrese su usuario"
                    name="usuario"
                    value={form.usuario}
                    onChange={handleChange}
                    bg={inputBg}
                    borderColor={errors.usuario ? "red.500" : "gray.300"}
                    _focus={{
                      borderColor: errors.usuario ? "red.500" : "blue.500",
                      boxShadow: errors.usuario
                        ? "0 0 0 1px var(--chakra-colors-red-500)"
                        : "0 0 0 1px var(--chakra-colors-blue-500)",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </InputGroup>
                {errors.usuario && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {errors.usuario}
                  </Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.password}>
                <FormLabel color={textColor} fontSize={{ base: "sm", sm: "md" }}>
                  Contraseña
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdLock} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    pl={10}
                    placeholder="Ingrese su contraseña"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    bg={inputBg}
                    borderColor={errors.password ? "red.500" : "gray.300"}
                    _focus={{
                      borderColor: errors.password ? "red.500" : "blue.500",
                      boxShadow: errors.password
                        ? "0 0 0 1px var(--chakra-colors-red-500)"
                        : "0 0 0 1px var(--chakra-colors-blue-500)",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <InputRightElement>
                    <Icon
                      as={showPassword ? MdVisibilityOff : MdVisibility}
                      color="gray.400"
                      cursor="pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
                {errors.password && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {errors.password}
                  </Text>
                )}
              </FormControl>

              <Flex justify="space-between" align="center">
                <Checkbox
                  name="recordar"
                  isChecked={form.recordar}
                  onChange={handleChange}
                  colorScheme="blue"
                  size={{ base: "sm", sm: "md" }}
                >
                  Recordarme
                </Checkbox>
              </Flex>

              <Button
                bg="#764ba2"
                color="white"
                _hover={{ bg: "#5a3a7c" }}
                _active={{ bg: "#3a2a5c" }}
                onClick={handleSubmit}
                isLoading={loading}
                loadingText="Iniciando sesión..."
                width="full"
                size="lg"
                fontSize={{ base: "sm", sm: "md" }}
                fontWeight="medium"
              >
                Iniciar sesión
              </Button>

            </VStack>
          </Box>
        </Container>
      </Flex>
    </Flex>
  )
}

export default Login
