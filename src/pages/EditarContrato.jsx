import { useEffect, useState, lazy, Suspense } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Flex, Box, Text, useColorModeValue } from "@chakra-ui/react"
import Sidebar from "../components/Sidebar"
import { getContrato } from "../api/contratos"
import LoadingSpinner from "../components/ui/LoadingSpinner"

const FormContrato = lazy(() => import("../components/FormContrato"))

function EditarContrato() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [contrato, setContrato] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await getContrato(id)
        setContrato(data)
      } catch (error) {
        console.error(error)
      }
    }

    if (id) cargar()
  }, [id])

  if (!contrato) return <Text p={8}>Cargando contrato...</Text>

  return (
    <Flex>
      <Sidebar />

      <Box 
        flex="1" 
        ml="220px"
        p={{ base: 4, md: 8 }} 
        minH="100vh" 
        bg={useColorModeValue("gray.50", "gray.900")}
        maxW="1200px"
        mx="auto"
      >
        <Suspense fallback={<LoadingSpinner />}>
          <FormContrato
            contratoInicial={contrato}
            onSave={() => navigate(`/detalle/${contrato.id}`)}
          />
        </Suspense>
      </Box>
    </Flex>
  )
}

export default EditarContrato