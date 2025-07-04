import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Box, Flex, Stack, Heading, Text, Button, Avatar, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, Meeting, Client, Service } from '../lib/api';

const Calendar: React.FC = () => {
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
          apiClient.getMeetings('upcoming'),
          apiClient.getClients(),
          apiClient.getServices()
        ]);
        setMeetings(meetingsData);
        setClients(clientsData);
        setServices(servicesData);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error('Calendar fetch error:', err);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get current week days
  const getCurrentWeekDays = () => {
    const today = new Date();
    const days: Array<{ label: string; date: number; isToday: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      days.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        isToday: i === today.getDay()
      });
    }
    return days;
  };

  const days = getCurrentWeekDays();

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Calendar</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Calendar</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Calendar</Heading>
      <Box bg="white" rounded="xl" shadow="md" p={6}>
        <Flex gap={2} mb={6}>
          {days.map((d, i) => (
            <Flex
              key={d.date}
              direction="column"
              align="center"
              px={3}
              py={2}
              rounded="lg"
              bg={d.isToday ? 'purple.400' : 'gray.100'}
              color={d.isToday ? 'white' : 'gray.700'}
              minW={10}
            >
              <Text fontSize="xs" fontWeight="medium">{d.label}</Text>
              <Text fontSize="lg" fontWeight="bold">{d.date}</Text>
            </Flex>
          ))}
        </Flex>
        <Stack spacing={4}>
          {meetings.slice(0, 5).map((meeting) => (
            <Flex
              key={meeting.id}
              align="center"
              justify="space-between"
              p={4}
              rounded="lg"
              boxShadow="sm"
              bg="purple.50"
              borderLeft="4px solid"
              borderColor="purple.400"
            >
              <Box>
                <Text fontWeight="medium">{getClientName(meeting.client_id)}</Text>
                <Text fontSize="sm" color="gray.600">{getServiceName(meeting.service_id)}</Text>
                <Text fontSize="xs" color="gray.500">
                  {formatDate(meeting.start_time)} at {formatTime(meeting.start_time)}
                </Text>
              </Box>
              <Flex align="center" gap={2}>
                <Avatar name={getClientName(meeting.client_id)} size="sm" bg="purple.500" />
                <Text fontSize="sm" color="gray.600">
                  ${meeting.price_total.toFixed(2)}
                </Text>
              </Flex>
            </Flex>
          ))}
          {meetings.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              No upcoming meetings. Schedule your first meeting to get started.
            </Text>
          )}
        </Stack>
        <Button leftIcon={<PlusIcon style={{ width: 20, height: 20 }} />} colorScheme="purple" borderRadius="full" mt={8} position="static">
          Schedule Meeting
        </Button>
      </Box>
    </Stack>
  );
};

export default Calendar;
