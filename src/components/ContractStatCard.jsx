import { memo } from "react";
import {
  Box,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";

const ContractStatCard = ({ label, count, color }) => (
  <Box
    shadow="lg"
    borderRadius="2xl"
    p={8}                 // 🔥 más padding
    minH="140px"         // 🔥 altura mínima
    _hover={{
      transform: "translateY(-6px)",
      shadow: "xl",
    }}
    transition="0.2s"
  >
    <Flex justify="space-between" align="center" h="100%">
      <Stat>
        <StatLabel fontSize="md" color="gray.500">
          {label}
        </StatLabel>

        <StatNumber fontSize="3xl" mt={2}>   {/* 🔥 número más grande */}
          <Badge
            bg={color}
            color="white"
            rounded="full"
            px={4}
            py={1.5}
            fontSize="lg"
          >
            {count}
          </Badge>
        </StatNumber>
      </Stat>

      <Icon as={FiFileText} boxSize={10} color={color} /> {/* 🔥 icono más grande */}
    </Flex>
  </Box>
);

export default memo(ContractStatCard);