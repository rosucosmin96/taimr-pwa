import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string; // Chakra color (e.g., 'green.100')
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color = 'gray.100' }) => (
  <Box bg={color} borderRadius="xl" boxShadow="sm" p={4} className="responsive-container">
    <Flex align="center" minW={0}>
      {icon && (
        <Flex
          align="center"
          justify="center"
          boxSize={{ base: 10, sm: 12 }}
          bg="whiteAlpha.800"
          borderRadius="full"
          mr={{ base: 3, sm: 4 }}
          flexShrink={0}
        >
          {icon}
        </Flex>
      )}
      <Box minW={0} flex={1}>
        <Text
          fontSize={{ base: "xs", sm: "sm" }}
          color="gray.500"
          fontWeight="medium"
          className="responsive-label"
          noOfLines={2}
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {title}
        </Text>
        <Text
          fontSize={{ base: "lg", sm: "2xl" }}
          fontWeight="bold"
          color="gray.900"
          className="responsive-text"
          noOfLines={1}
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {value}
        </Text>
      </Box>
    </Flex>
  </Box>
);

export default StatsCard;
