import { Box, Flex } from '@chakra-ui/react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <Flex minH="100vh">
      <Sidebar />
      <Box
        flex="1"
        ml={{ base: "60px", md: "240px" }}
        transition="margin-left 0.3s ease"
      >
        {children}
      </Box>
    </Flex>
  )
}
