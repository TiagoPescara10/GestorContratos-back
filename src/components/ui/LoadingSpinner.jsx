import {
  Box,
  Flex,
  Spinner,
  Text,
  VStack,
  useColorModeValue
} from "@chakra-ui/react"

export default function LoadingSpinner({ 
  size = "xl", 
  text = "Cargando...", 
  fullScreen = false,
  thickness = "4px"
}) {
  const bg = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('gray.600', 'gray.400')

  const content = (
    <VStack spacing={4}>
      <Spinner
        thickness={thickness}
        speed="0.65s"
        emptyColor="gray.200"
        color="blue.500"
        size={size}
      />
      <Text color={textColor} fontSize="lg" fontWeight="medium">
        {text}
      </Text>
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
