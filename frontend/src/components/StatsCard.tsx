import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string; // Chakra color (e.g., 'green.100')
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color = 'gray.100' }) => (
  <Box bg={color} borderRadius="xl" boxShadow="sm" p={4}>
    <Flex align="center">
      {icon && (
        <Flex
          align="center"
          justify="center"
          boxSize={12}
          bg="whiteAlpha.800"
          borderRadius="full"
          mr={4}
        >
          {icon}
        </Flex>
      )}
      <Box>
        <Text fontSize="sm" color="gray.500" fontWeight="medium">{title}</Text>
        <Text fontSize="2xl" fontWeight="bold" color="gray.900">{value}</Text>
      </Box>
    </Flex>
  </Box>
);

export default StatsCard;
