import React, { useState, useEffect } from 'react';
import { UserIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { Box, Flex, Stack, Heading, Text, Button, Avatar, Badge, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, Client, Service } from '../lib/api';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsData, servicesData] = await Promise.all([
          apiClient.getClients(),
          apiClient.getServices()
        ]);
        setClients(clientsData);
        setServices(servicesData);
      } catch (err) {
        setError('Failed to load clients');
        console.error('Clients fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Clients</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Clients</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Clients</Heading>
      <Box bg="white" rounded="xl" shadow="md" p={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontWeight="semibold" fontSize="lg">Your Clients</Text>
          <Button leftIcon={<UserIcon style={{ width: 20, height: 20 }} />} colorScheme="purple" borderRadius="lg">
            Add Client
          </Button>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {clients.map((client) => (
            <Flex key={client.id} align="center" justify="space-between" py={4}>
              <Flex align="center" gap={4}>
                <Avatar name={client.name} size="md" bg="purple.500" />
                <Box>
                  <Text fontWeight="medium" color="gray.900">{client.name}</Text>
                  <Flex align="center" color="gray.500" fontSize="sm" gap={2}>
                    <EnvelopeIcon style={{ width: 16, height: 16 }} />{client.email}
                    <PhoneIcon style={{ width: 16, height: 16, marginLeft: 8 }} />{client.phone}
                  </Flex>
                  <Flex gap={2} mt={1} flexWrap="wrap">
                    <Badge px={2} py={0.5} borderRadius="full" bg="purple.100" color="purple.700" fontSize="xs" fontWeight="medium">
                      {getServiceName(client.service_id)}
                    </Badge>
                    {client.custom_price_per_hour && (
                      <Badge px={2} py={0.5} borderRadius="full" bg="green.100" color="green.700" fontSize="xs" fontWeight="medium">
                        ${client.custom_price_per_hour}/h
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </Flex>
            </Flex>
          ))}
          {clients.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              No clients found. Add your first client to get started.
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default Clients;
