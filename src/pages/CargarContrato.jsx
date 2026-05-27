import { lazy, Suspense } from "react"
import { Box, useColorModeValue } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import LoadingSpinner from "../components/ui/LoadingSpinner"

const FormContrato = lazy(() => import("../components/FormContrato"))

function CargarContrato() {
  const navigate = useNavigate()

  return (
    <Box 
      p={{ base: 4, md: 8 }} 
      minH="100vh" 
      bg={useColorModeValue("gray.50", "gray.900")}
      maxW="1200px"
      mx="auto"
    >
      <Suspense fallback={<LoadingSpinner />}>
        <FormContrato onSave={() => navigate("/contratos")} />
      </Suspense>
    </Box>
  )
}

export default CargarContrato