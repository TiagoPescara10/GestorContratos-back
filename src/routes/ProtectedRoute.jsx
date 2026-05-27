import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import {
  Box,
  Flex,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from "@chakra-ui/react"
import { useEffect, useState } from "react"

export default function ProtectedRoute({ element }) {
  const { isAuthenticated, loading, user } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)
  
  const bg = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('gray.600', 'gray.400')

  // Check localStorage as fallback for immediate auth check
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser && !loading && !isAuthenticated) {
      // If we have tokens in localStorage but state says not authenticated,
      // give it a moment to sync
      const timeout = setTimeout(() => {
        if (!isAuthenticated) {
          setShouldRedirect(true)
        }
      }, 100)
      
      return () => clearTimeout(timeout)
    } else if (!token && !loading) {
      setShouldRedirect(true)
    }
  }, [isAuthenticated, loading])

  if (loading) {
    return (
      <Flex 
        h="100vh" 
        w="100vw"
        bg={bg}
        justify="center" 
        align="center"
      >
        <VStack spacing={4}>
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="blue.500"
            size="xl"
          />
          <Text color={textColor} fontSize="lg" fontWeight="medium">
            Verificando autenticación...
          </Text>
        </VStack>
      </Flex>
    )
  }

  // Check both state and localStorage for authentication
  const token = localStorage.getItem('access_token')
  const isActuallyAuthenticated = isAuthenticated && user && token

  if (!isActuallyAuthenticated || shouldRedirect) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  }

  return element
}
