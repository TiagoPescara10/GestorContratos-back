import {
  Box,
  Flex,
  Text,
  VStack,
  useColorModeValue,
  Button,
  Icon
} from "@chakra-ui/react"
import { MdRefresh, MdErrorOutline } from "react-icons/md"

export default function ErrorMessage({ 
  message = "Ocurrió un error inesperado",
  onRetry,
  fullScreen = false,
  icon = MdErrorOutline
}) {
  const bg = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('gray.600', 'gray.400')
  const errorColor = useColorModeValue('red.500', 'red.400')

  const content = (
    <VStack spacing={4} maxW="400px" textAlign="center">
      <Icon as={icon} boxSize={12} color={errorColor} />
      <VStack spacing={2}>
        <Text color={textColor} fontSize="lg" fontWeight="medium">
          {message}
        </Text>
        {onRetry && (
          <Button
            leftIcon={<MdRefresh />}
            colorScheme="blue"
            variant="outline"
            onClick={onRetry}
            size="sm"
          >
            Reintentar
          </Button>
        )}
      </VStack>
    </VStack>
  )

  if (fullScreen) {
    return (
      <Flex 
        h="100vh" 
        w="100vw"
        bg={bg}
        justify="center" 
        align="center"
        position="fixed"
        top={0}
        left={0}
        zIndex={9999}
      >
        {content}
      </Flex>
    )
  }

  return (
    <Flex 
      h="200px" 
      w="100%"
      justify="center" 
      align="center"
    >
      {content}
    </Flex>
  )
}
