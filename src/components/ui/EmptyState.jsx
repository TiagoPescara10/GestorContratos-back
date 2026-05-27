import {
  Box,
  Flex,
  Text,
  VStack,
  useColorModeValue,
  Button,
  Icon
} from "@chakra-ui/react"
import { MdInbox, MdAdd } from "react-icons/md"

export default function EmptyState({ 
  title = "No hay datos",
  description = "No se encontraron elementos para mostrar",
  actionText,
  onAction,
  icon = MdInbox
}) {
  const bg = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('gray.600', 'gray.400')
  const iconColor = useColorModeValue('gray.400', 'gray.500')

  return (
    <Flex 
      h="300px" 
      w="100%"
      justify="center" 
      align="center"
    >
      <VStack spacing={4} maxW="400px" textAlign="center">
        <Icon as={icon} boxSize={12} color={iconColor} />
        <VStack spacing={2}>
          <Text color={textColor} fontSize="lg" fontWeight="medium">
            {title}
          </Text>
          <Text color={textColor} fontSize="sm">
            {description}
          </Text>
          {actionText && onAction && (
            <Button
              leftIcon={<MdAdd />}
              colorScheme="blue"
              onClick={onAction}
              size="sm"
              mt={2}
            >
              {actionText}
            </Button>
          )}
        </VStack>
      </VStack>
    </Flex>
  )
}
