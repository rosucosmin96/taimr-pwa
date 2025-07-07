import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Box, Flex, Stack, Heading, Text, Button, Badge, Avatar, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, Meeting, Client, Service } from '../lib/api';

const Meetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [meetingsData, clientsData, servicesData] = await Promise.all([
          apiClient.getMeetings(),
          apiClient.getClients(),
          apiClient.getServices()
        ]);
        setMeetings(meetingsData);
        setClients(clientsData);
        setServices(servicesData);
      } catch (err) {
        setError('Failed to load meetings');
        console.error('Meetings fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' - ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const statusStyles: Record<string, { bg: string; color: string; icon: React.ReactElement }> = {
    'upcoming': { bg: 'blue.100', color: 'blue.700', icon: <ClockIcon style={{ width: 16, height: 16, marginRight: 4, color: '#3182CE' }} /> },
    'done': { bg: 'green.100', color: 'green.700', icon: <CheckCircleIcon style={{ width: 16, height: 16, marginRight: 4, color: '#38A169' }} /> },
    'canceled': { bg: 'red.100', color: 'red.700', icon: <XCircleIcon style={{ width: 16, height: 16, marginRight: 4, color: '#E53E3E' }} /> },
  };

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Meetings</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Meetings</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Meetings</Heading>
      <Box bg="white" rounded="xl" shadow="md" p={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontWeight="semibold" fontSize="lg">All Meetings</Text>
          <Button leftIcon={<CalendarDaysIcon style={{ width: 20, height: 20 }} />} colorScheme="purple" borderRadius="lg">
            Add Meeting
          </Button>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {meetings.map((meeting) => (
            <Flex key={meeting.id} align="center" justify="space-between" py={4}>
              <Flex align="center" gap={4}>
                <Avatar name={getClientName(meeting.client_id)} size="md" bg="purple.500" />
                <Box>
                  <Text fontWeight="medium" color="gray.900">{getClientName(meeting.client_id)}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {getServiceName(meeting.service_id)} &bull; {formatDateTime(meeting.start_time)}
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    ${meeting.price_total.toFixed(2)} • {meeting.paid ? 'Paid' : 'Unpaid'}
                  </Text>
                </Box>
              </Flex>
              <Badge px={3} py={1} borderRadius="full" fontSize="xs" bg={statusStyles[meeting.status].bg} color={statusStyles[meeting.status].color} display="flex" alignItems="center">
                {statusStyles[meeting.status].icon}{meeting.status}
              </Badge>
            </Flex>
          ))}
          {meetings.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              No meetings found. Schedule your first meeting to get started.
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default Meetings;
