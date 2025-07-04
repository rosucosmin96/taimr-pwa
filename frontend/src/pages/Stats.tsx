import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CurrencyDollarIcon, UserGroupIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Box, Grid, Stack, Heading, Text, Spinner, Alert, AlertIcon, Select, Flex } from '@chakra-ui/react';
import { apiClient, StatsOverview } from '../lib/api';

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('last7days');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getStatsOverview(period);
        setStats(data);
      } catch (err) {
        setError('Failed to load statistics');
        console.error('Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period]);

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Statistics</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Statistics</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  const kpis = [
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
      title: 'Total Meetings',
      value: stats?.total_meetings || 0,
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

  // Meeting status data for pie chart
  const meetingStatusData = [
    { name: 'Done', value: stats?.done_meetings || 0, color: '#38A169' },
    { name: 'Canceled', value: stats?.canceled_meetings || 0, color: '#E53E3E' },
    { name: 'Upcoming', value: (stats?.total_meetings || 0) - (stats?.done_meetings || 0) - (stats?.canceled_meetings || 0), color: '#3182CE' },
  ];

  // Weekly revenue data (mock data for now)
  const weeklyData = [
    { name: 'Mon', Revenue: 150, Meetings: 3 },
    { name: 'Tue', Revenue: 200, Meetings: 4 },
    { name: 'Wed', Revenue: 180, Meetings: 3 },
    { name: 'Thu', Revenue: 220, Meetings: 4 },
    { name: 'Fri', Revenue: 160, Meetings: 3 },
    { name: 'Sat', Revenue: 120, Meetings: 2 },
    { name: 'Sun', Revenue: 80, Meetings: 1 },
  ];

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Statistics</Heading>

      {/* Period Selector */}
      <Box>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          maxW="200px"
          bg="white"
        >
          <option value="last7days">Last 7 Days</option>
          <option value="last30days">Last 30 Days</option>
          <option value="last90days">Last 90 Days</option>
          <option value="thisMonth">This Month</option>
          <option value="thisYear">This Year</option>
        </Select>
      </Box>

      {/* KPI Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
        {kpis.map((kpi) => (
          <StatsCard key={kpi.title} {...kpi} />
        ))}
      </Grid>

      {/* Charts */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
        {/* Weekly Revenue Chart */}
        <Box bg="white" rounded="xl" shadow="md" p={6}>
          <Text fontWeight="semibold" fontSize="lg" mb={4}>Weekly Revenue</Text>
          <Box h="64" w="full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Revenue" fill="#38A169" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Meeting Status Distribution */}
        <Box bg="white" rounded="xl" shadow="md" p={6}>
          <Text fontWeight="semibold" fontSize="lg" mb={4}>Meeting Status</Text>
          <Box h="64" w="full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={meetingStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {meetingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Grid>
    </Stack>
  );
};

export default Stats;
