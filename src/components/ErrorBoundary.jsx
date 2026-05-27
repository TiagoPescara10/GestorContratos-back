import React from 'react'
import { Box, Text, Button, Heading, VStack } from '@chakra-ui/react'
import { MdRefresh, MdHome } from 'react-icons/md'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          minH="100vh" 
          bg="gray.50" 
          p={8}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box 
            bg="white" 
            p={8} 
            borderRadius="2xl" 
            boxShadow="lg"
            maxW="500px"
            w="full"
          >
            <VStack spacing={6} align="center">
              <Box
                w="80px"
                h="80px"
                bg="red.100"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="3xl">Oops!</Text>
              </Box>
              
              <VStack spacing={3} align="center">
                <Heading size="lg" color="gray.800">
                  Algo salió mal
                </Heading>
                <Text color="gray.600" textAlign="center">
                  Ha ocurrido un error inesperado. Por favor, intenta nuevamente o contacta al soporte si el problema persiste.
                </Text>
              </VStack>

              <VStack spacing={3} w="full">
                <Button
                  leftIcon={<MdRefresh />}
                  onClick={this.handleReset}
                  colorScheme="blue"
                  w="full"
                >
                  Intentar nuevamente
                </Button>
                
                <Button
                  leftIcon={<MdHome />}
                  onClick={this.handleGoHome}
                  variant="outline"
                  w="full"
                >
                  Ir al inicio
                </Button>
              </VStack>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box 
                  bg="gray.100" 
                  p={4} 
                  borderRadius="md" 
                  w="full"
                  maxH="200px"
                  overflow="auto"
                >
                  <Text fontSize="sm" color="red.600" fontFamily="mono">
                    {this.state.error.toString()}
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>
        </Box>
      )
    }

    return this.props.children
  }
}
