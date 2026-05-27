import { useToast } from '@chakra-ui/react'

export function useApiError() {
  const toast = useToast()

  const handleError = (error, options = {}) => {
    const {
      title = 'Error',
      duration = 5000,
      isClosable = true,
      position = 'top'
    } = options

    let description = 'Ocurrió un error inesperado'
    let status = 'error'

    if (error?.type === 'NETWORK_ERROR') {
      description = 'Error de conexión. Verifica tu conexión a internet.'
      status = 'warning'
    } else if (error?.type === 'VALIDATION_ERROR') {
      description = 'Por favor verifica los datos ingresados.'
      status = 'warning'
    } else if (error?.type === 'PERMISSION_ERROR') {
      description = 'No tienes permisos para realizar esta acción.'
      status = 'warning'
    } else if (error?.type === 'NOT_FOUND_ERROR') {
      description = 'El recurso solicitado no fue encontrado.'
      status = 'info'
    } else if (error?.type === 'SERVER_ERROR') {
      description = 'Error del servidor. Por favor intenta más tarde.'
      status = 'error'
    } else if (error?.message) {
      description = error.message
    }

    toast({
      title,
      description,
      status,
      duration,
      isClosable,
      position
    })

    return { description, status }
  }

  const handleSuccess = (message, options = {}) => {
    const {
      title = 'Éxito',
      duration = 3000,
      isClosable = true,
      position = 'top'
    } = options

    toast({
      title,
      description: message,
      status: 'success',
      duration,
      isClosable,
      position
    })
  }

  return {
    handleError,
    handleSuccess
  }
}
