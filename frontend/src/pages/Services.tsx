import React, { useState, useEffect } from 'react';
import { Cog6ToothIcon, PencilSquareIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Box, Flex, Stack, Heading, Text, Button, Badge, IconButton, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, Service } from '../lib/api';

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getServices();
        setServices(data);
      } catch (err) {
        setError('Failed to load services');
        console.error('Services fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Services</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Services</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Services</Heading>
      <Box bg="white" rounded="xl" shadow="md" p={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontWeight="semibold" fontSize="lg">Your Services</Text>
          <Button leftIcon={<Cog6ToothIcon style={{ width: 20, height: 20 }} />} colorScheme="purple" borderRadius="lg">
            Add Service
          </Button>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {services.map((service) => (
            <Flex key={service.id} align="center" justify="space-between" py={4}>
              <Box>
                <Text fontWeight="medium" color="gray.900">{service.name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {formatDuration(service.default_duration_minutes)} &bull; ${service.default_price_per_hour}/h
                </Text>
              </Box>
              <Flex align="center" gap={4}>
                <Badge colorScheme="green" px={2} py={1} borderRadius="full" display="flex" alignItems="center" fontSize="sm">
                  <CheckCircleIcon style={{ width: 18, height: 18, marginRight: 4 }} />Active
                </Badge>
                <IconButton aria-label="Edit" icon={<PencilSquareIcon style={{ width: 20, height: 20 }} />} variant="ghost" />
              </Flex>
            </Flex>
          ))}
          {services.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              No services found. Create your first service to get started.
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default Services;
