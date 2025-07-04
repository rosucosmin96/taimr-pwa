import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import { CalendarDaysIcon, UserGroupIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Box, Grid, Heading, Text, Flex, Stack, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, StatsOverview, Meeting } from '../lib/api';

interface KPI {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, meetingsData] = await Promise.all([
          apiClient.getStatsOverview(),
          apiClient.getMeetings('upcoming')
        ]);
        setStats(statsData);
        setMeetings(meetingsData);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={2}>Dashboard</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={2}>Dashboard</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  const kpis: KPI[] = [
    {
      title: 'Total Revenue',
      value: `$${stats?.total_revenue.toFixed(2) || '0.00'}`,
      icon: <CurrencyDollarIcon style={{ width: 28, height: 28 }} color="#38A169" />,
      color: 'green.100'
    },
    {
      title: 'Total Clients',
      value: stats?.total_clients || 0,
      icon: <UserGroupIcon style={{ width: 28, height: 28 }} color="#3182CE" />,
      color: 'blue.100'
    },
    {
      title: 'Upcoming Meetings',
      value: meetings.length,
      icon: <CalendarDaysIcon style={{ width: 28, height: 28 }} color="#805AD5" />,
      color: 'purple.100'
    },
    {
      title: 'Total Hours',
      value: stats?.total_hours || 0,
      icon: <ClockIcon style={{ width: 28, height: 28 }} color="#D69E2E" />,
      color: 'yellow.100'
    },
  ];

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

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={2}>Dashboard</Heading>

      {/* KPI Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
        {kpis.map((kpi) => (
          <StatsCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} color={kpi.color} />
        ))}
      </Grid>

      {/* Calendar Preview & Upcoming Meetings */}
      <Flex direction={{ base: 'column', md: 'row' }} bg="white" rounded="xl" shadow="md" p={6} gap={6}>
        <Box flex="1" bg="gray.50" rounded="lg" p={4} boxShadow="sm" mb={{ base: 4, md: 0 }}>
          <Text fontWeight="semibold" fontSize="lg" mb={2}>Today</Text>
          <Flex gap={2} mb={4}>
            {[6,7,8,9,10].map((d, i) => (
              <Flex key={d} direction="column" align="center" px={3} py={2} rounded="lg" bg={i===1 ? 'purple.400' : 'gray.100'} color={i===1 ? 'white' : 'gray.700'} minW={10}>
                <Text fontSize="xs" fontWeight="medium">{['Sat','Sun','Mon','Tue','Wed'][i]}</Text>
                <Text fontSize="lg" fontWeight="bold">{d}</Text>
              </Flex>
            ))}
          </Flex>
          <Stack spacing={2}>
            {meetings.slice(0, 3).map((meeting) => (
              <Flex key={meeting.id} align="center" gap={2}>
                <Box w={3} h={3} rounded="full" bg="green.400" as="span" />
                <Text fontSize="sm">
                  Meeting - {formatTime(meeting.start_time)}
                </Text>
              </Flex>
            ))}
            {meetings.length === 0 && (
              <Text fontSize="sm" color="gray.500">No upcoming meetings today</Text>
            )}
          </Stack>
        </Box>

        {/* Upcoming Meetings */}
        <Box flex="1" bg="gray.50" rounded="lg" p={4} boxShadow="sm">
          <Text fontWeight="semibold" fontSize="lg" mb={2}>Upcoming Meetings</Text>
          <Stack spacing={4}>
            {meetings.slice(0, 3).map((meeting) => (
              <Box key={meeting.id} bg="white" rounded="lg" p={4} shadow="sm">
                <Flex align="center" justify="space-between">
                  <Text fontWeight="medium">Meeting</Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatDate(meeting.start_time)} at {formatTime(meeting.start_time)}
                  </Text>
                </Flex>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  ${meeting.price_total.toFixed(2)} • {meeting.status}
                </Text>
              </Box>
            ))}
            {meetings.length === 0 && (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                No upcoming meetings
              </Text>
            )}
          </Stack>
        </Box>
      </Flex>
    </Stack>
  );
};

export default Dashboard;
