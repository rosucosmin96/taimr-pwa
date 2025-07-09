import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CurrencyDollarIcon, UserGroupIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import {
  Box,
  Grid,
  Stack,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Button,
  HStack,
  VStack,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { apiClient, StatsOverview, Service } from '../lib/api';

interface ServiceStats {
  serviceId: string;
  serviceName: string;
  revenue: number;
  hours: number;
  meetings: number;
}

const Stats: React.FC = () => {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [previousStats, setPreviousStats] = useState<StatsOverview | null>(null);
  const [clientStats, setClientStats] = useState<any[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('last7days');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Fetch services on component mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesData = await apiClient.getServices();
        setServices(servicesData);

        // If there's only one service, automatically select it
        if (servicesData.length === 1) {
          setSelectedService(servicesData[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch services:', err);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        let startDateParam: string | undefined;
        let endDateParam: string | undefined;
        let serviceIdParam: string | undefined;

        if (period === 'custom') {
          if (!startDate || !endDate) {
            // Don't show error, just don't fetch yet
            setLoading(false);
            return;
          }
          startDateParam = startDate;
          endDateParam = endDate;
        } else if (period !== 'allTime') {
          // Calculate relative periods
          const today = new Date();
          const endDate = new Date(today);

          switch (period) {
            case 'last7days':
              const sevenDaysAgo = new Date(today);
              sevenDaysAgo.setDate(today.getDate() - 7);
              startDateParam = sevenDaysAgo.toISOString().split('T')[0];
              endDateParam = today.toISOString().split('T')[0];
              break;
            case 'last30days':
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              startDateParam = thirtyDaysAgo.toISOString().split('T')[0];
              endDateParam = today.toISOString().split('T')[0];
              break;
            case 'last90days':
              const ninetyDaysAgo = new Date(today);
              ninetyDaysAgo.setDate(today.getDate() - 90);
              startDateParam = ninetyDaysAgo.toISOString().split('T')[0];
              endDateParam = today.toISOString().split('T')[0];
              break;
            case 'thisMonth':
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              startDateParam = firstDayOfMonth.toISOString().split('T')[0];
              endDateParam = today.toISOString().split('T')[0];
              break;
            case 'thisYear':
              const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
              startDateParam = firstDayOfYear.toISOString().split('T')[0];
              endDateParam = today.toISOString().split('T')[0];
              break;
          }
        }

        // Set service ID if not "all"
        if (selectedService !== 'all') {
          serviceIdParam = selectedService;
        }

        const data = await apiClient.getStatsOverview(startDateParam, endDateParam, serviceIdParam);
        setStats(data);

        // Fetch previous period stats for comparison (except for allTime and custom)
        if (period !== 'allTime' && period !== 'custom' && startDateParam && endDateParam) {
          try {
            const currentStart = new Date(startDateParam);
            const currentEnd = new Date(endDateParam);
            const periodDuration = currentEnd.getTime() - currentStart.getTime();

            // Calculate previous period dates
            const previousEnd = new Date(currentStart);
            const previousStart = new Date(previousEnd.getTime() - periodDuration);

            const previousStartStr = previousStart.toISOString().split('T')[0];
            const previousEndStr = previousEnd.toISOString().split('T')[0];

            const previousData = await apiClient.getStatsOverview(previousStartStr, previousEndStr, serviceIdParam);
            setPreviousStats(previousData);
          } catch (err) {
            console.error('Failed to fetch previous period stats:', err);
            setPreviousStats(null);
          }
        } else {
          setPreviousStats(null);
        }

        // Fetch client statistics
        if (startDateParam && endDateParam) {
          try {
            const clients = await apiClient.getClients(serviceIdParam);
            const clientStatsPromises = clients.map(async (client) => {
              try {
                // For now, we'll use mock data since the API doesn't have client-specific stats
                // In a real implementation, you'd have an endpoint like /stats/client/{client_id}
                const mockClientStats = {
                  clientId: client.id,
                  clientName: client.name,
                  totalMeetings: Math.floor(Math.random() * 10) + 1,
                  canceledMeetings: Math.floor(Math.random() * 3),
                  totalRevenue: Math.random() * 1000 + 100,
                  pricePerHour: client.custom_price_per_hour || 50,
                  hours: Math.random() * 20 + 2
                };

                return {
                  ...mockClientStats,
                  pricePerMeeting: mockClientStats.totalRevenue / mockClientStats.totalMeetings
                };
              } catch (err) {
                console.error(`Failed to fetch stats for client ${client.name}:`, err);
                return {
                  clientId: client.id,
                  clientName: client.name,
                  totalMeetings: 0,
                  canceledMeetings: 0,
                  totalRevenue: 0,
                  pricePerHour: client.custom_price_per_hour || 0,
                  hours: 0,
                  pricePerMeeting: 0
                };
              }
            });

            const clientStatsData = await Promise.all(clientStatsPromises);
            setClientStats(clientStatsData);
          } catch (err) {
            console.error('Failed to fetch client stats:', err);
            setClientStats([]);
          }
        } else {
          setClientStats([]);
        }

        // If "All Services" is selected, fetch stats for each service
        if (selectedService === 'all' && services.length > 0) {
          const serviceStatsPromises = services.map(async (service) => {
            try {
              const serviceData = await apiClient.getStatsOverview(startDateParam, endDateParam, service.id);
              return {
                serviceId: service.id,
                serviceName: service.name,
                revenue: serviceData.total_revenue,
                hours: serviceData.total_hours,
                meetings: serviceData.total_meetings
              };
            } catch (err) {
              console.error(`Failed to fetch stats for service ${service.name}:`, err);
              return {
                serviceId: service.id,
                serviceName: service.name,
                revenue: 0,
                hours: 0,
                meetings: 0
              };
            }
          });

          const serviceStatsData = await Promise.all(serviceStatsPromises);
          setServiceStats(serviceStatsData);
        } else {
          setServiceStats([]);
        }
      } catch (err) {
        setError('Failed to load statistics');
        console.error('Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period, startDate, endDate, selectedService, services]);

  const handleCustomPeriodSelect = () => {
    if (startDate && endDate) {
      onClose();
    }
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Select dates';
    return `${startDate} to ${endDate}`;
  };

  // Calculate percentage change
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Filter clients based on search term
  const filteredClientStats = clientStats.filter(client =>
    client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  // Check if we should show service selector (only if multiple services exist)
  const shouldShowServiceSelector = services.length > 1;

  // Check if we should show period comparison (not for allTime or custom)
  const shouldShowPeriodComparison = period !== 'allTime' && period !== 'custom' && previousStats !== null;

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

  // Service comparison data for charts
  const serviceRevenueData = serviceStats.map(service => ({
    name: service.serviceName,
    revenue: service.revenue,
    hours: service.hours
  }));

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Statistics</Heading>

      {/* Period and Service Selectors */}
      <Box>
        <HStack spacing={4} align="start" flexWrap="wrap">
          {/* Period Selector */}
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            maxW="200px"
            bg="white"
            mb={period === 'custom' ? 4 : 0}
          >
            <option value="allTime">All Time</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="last90days">Last 90 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
            <option value="custom">Custom Period</option>
          </Select>

          {/* Service Selector - Only show if multiple services exist */}
          {shouldShowServiceSelector && (
            <Select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              maxW="200px"
              bg="white"
            >
              <option value="all">All Services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          )}
        </HStack>

        {/* Custom Date Range Popover */}
        {period === 'custom' && (
          <Box mt={4}>
            <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="bottom-start">
              <PopoverTrigger>
                <Button
                  variant="outline"
                  bg="white"
                  w="300px"
                  justifyContent="space-between"
                  _hover={{ bg: 'gray.50' }}
                >
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent p={4} w="400px">
                <PopoverBody>
                  <VStack spacing={4}>
                    <Text fontWeight="semibold" fontSize="sm">Select Date Range</Text>
                    <HStack spacing={4} w="full">
                      <VStack align="start" flex={1}>
                        <Text fontSize="sm" fontWeight="medium">Start Date</Text>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            width: '100%'
                          }}
                        />
                      </VStack>
                      <VStack align="start" flex={1}>
                        <Text fontSize="sm" fontWeight="medium">End Date</Text>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            width: '100%'
                          }}
                        />
                      </VStack>
                    </HStack>
                    <HStack spacing={3} w="full" justify="flex-end">
                      <Button size="sm" variant="ghost" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="purple"
                        onClick={handleCustomPeriodSelect}
                        isDisabled={!startDate || !endDate}
                      >
                        Apply
                      </Button>
                    </HStack>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Box>
        )}
      </Box>

      {/* KPI Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
        {kpis.map((kpi) => (
          <StatsCard key={kpi.title} {...kpi} />
        ))}
      </Grid>

      {/* Average Price Metrics */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={4}>
        <StatsCard
          title="Average Price per Meeting"
          value={`$${stats && stats.total_meetings > 0 ? (stats.total_revenue / stats.total_meetings).toFixed(2) : '0.00'}`}
          icon={<CurrencyDollarIcon style={{ width: 28, height: 28 }} color="#38A169" />}
          color="green.100"
        />
        <StatsCard
          title="Average Price per Hour"
          value={`$${stats && stats.total_hours > 0 ? (stats.total_revenue / stats.total_hours).toFixed(2) : '0.00'}`}
          icon={<ClockIcon style={{ width: 28, height: 28 }} color="#3182CE" />}
          color="blue.100"
        />
      </Grid>

      {/* Service Comparison Section - Only show when "All Services" is selected */}
      {selectedService === 'all' && serviceStats.length > 0 && (
        <Box>
          <Heading as="h2" size="md" mb={4}>Service Comparison</Heading>

          {/* Service Comparison Charts */}
          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6} mb={6}>
            {/* Revenue by Service */}
            <Box bg="white" rounded="xl" shadow="md" p={6}>
              <Text fontWeight="semibold" fontSize="lg" mb={4}>Revenue by Service</Text>
              <Box h="64" w="full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceRevenueData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#38A169" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Hours by Service */}
            <Box bg="white" rounded="xl" shadow="md" p={6}>
              <Text fontWeight="semibold" fontSize="lg" mb={4}>Hours by Service</Text>
              <Box h="64" w="full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceRevenueData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                    <Bar dataKey="hours" fill="#3182CE" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>

          {/* Service Comparison Table */}
          <Box bg="white" rounded="xl" shadow="md" p={6}>
            <Text fontWeight="semibold" fontSize="lg" mb={4}>Service Breakdown</Text>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Service</Th>
                    <Th isNumeric>Revenue</Th>
                    <Th isNumeric>Hours</Th>
                    <Th isNumeric>Meetings</Th>
                    <Th isNumeric>Avg. Revenue/Hour</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {serviceStats.map((service) => (
                    <Tr key={service.serviceId}>
                      <Td fontWeight="medium">{service.serviceName}</Td>
                      <Td isNumeric>${service.revenue.toFixed(2)}</Td>
                      <Td isNumeric>{service.hours.toFixed(1)}h</Td>
                      <Td isNumeric>{service.meetings}</Td>
                      <Td isNumeric>
                        ${service.hours > 0 ? (service.revenue / service.hours).toFixed(2) : '0.00'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      )}

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

      {/* Period Comparison Panel - Histogram */}
      {shouldShowPeriodComparison && (
        <Box bg="white" rounded="xl" shadow="md" p={6}>
          <Text fontWeight="semibold" fontSize="lg" mb={4}>Period Comparison</Text>
          <Box h="64" w="full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  name: 'Previous Period',
                  revenue: previousStats?.total_revenue || 0,
                  fill: '#E2E8F0'
                },
                {
                  name: 'Current Period',
                  revenue: stats?.total_revenue || 0,
                  fill: '#38A169'
                }
              ]}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Flex justify="center" mt={4} gap={8}>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">Previous Period</Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.700">
                ${previousStats?.total_revenue.toFixed(2) || '0.00'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">Current Period</Text>
              <Text fontSize="lg" fontWeight="bold" color="green.600">
                ${stats?.total_revenue.toFixed(2) || '0.00'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">Change</Text>
              <Text
                fontSize="lg"
                fontWeight="bold"
                color={calculatePercentageChange(stats?.total_revenue || 0, previousStats?.total_revenue || 0) >= 0 ? 'green.600' : 'red.600'}
              >
                {calculatePercentageChange(stats?.total_revenue || 0, previousStats?.total_revenue || 0) >= 0 ? '+' : ''}
                {calculatePercentageChange(stats?.total_revenue || 0, previousStats?.total_revenue || 0).toFixed(1)}%
              </Text>
            </Box>
          </Flex>
        </Box>
      )}

      {/* Client Statistics Table */}
      {clientStats.length > 0 && (
        <Box>
          <Heading as="h2" size="md" mb={4}>Client Statistics</Heading>
          <Box bg="white" rounded="xl" shadow="md" p={6}>
            {/* Search Bar */}
            <Box mb={4}>
              <input
                type="text"
                placeholder="Search clients by name..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#805AD5'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </Box>

            <Box overflowX="auto">
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Client</Th>
                      <Th isNumeric>Total Meetings</Th>
                      <Th isNumeric>Canceled Meetings</Th>
                      <Th isNumeric>Total Revenue</Th>
                      <Th isNumeric>Price Per Hour</Th>
                      <Th isNumeric>Total Hours</Th>
                      <Th isNumeric>Price Per Meeting</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredClientStats.map((client) => (
                      <Tr key={client.clientId}>
                        <Td fontWeight="medium">{client.clientName}</Td>
                        <Td isNumeric>{client.totalMeetings}</Td>
                        <Td isNumeric>{client.canceledMeetings}</Td>
                        <Td isNumeric>${client.totalRevenue.toFixed(2)}</Td>
                        <Td isNumeric>${client.pricePerHour.toFixed(2)}</Td>
                        <Td isNumeric>{client.hours.toFixed(1)}h</Td>
                        <Td isNumeric>${client.pricePerMeeting.toFixed(2)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>

            {/* No results message */}
            {filteredClientStats.length === 0 && clientSearchTerm && (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No clients found matching "{clientSearchTerm}"</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default Stats;
