import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CurrencyDollarIcon, UserGroupIcon, CalendarDaysIcon, ClockIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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
  TableContainer,
  Card,
  CardBody,
  SimpleGrid,
  Divider,
  Badge,
  useBreakpointValue,
  GridItem
} from '@chakra-ui/react';
import { apiClient, StatsOverview, Service, DailyBreakdownItem } from '../lib/api';
import ClientStatisticsModal from '../components/ClientStatisticsModal';

interface ServiceStats {
  serviceId: string;
  serviceName: string;
  revenue: number;
  hours: number;
  meetings: number;
}

const SIDEBAR_WIDTH = 256;
const SAFE_MARGIN = 32;
const MIN_CELL_WIDTH = 220;

const ResponsiveContentWrapper: React.FC<{ children: (maxWidth: number) => React.ReactNode }> = ({ children }) => {
  const isSidebarActive = useBreakpointValue({ base: false, md: true });
  const [maxWidth, setMaxWidth] = useState(
    window.innerWidth - (isSidebarActive ? SIDEBAR_WIDTH : 0) - SAFE_MARGIN
  );
  useEffect(() => {
    function handleResize() {
      setMaxWidth(window.innerWidth - (isSidebarActive ? SIDEBAR_WIDTH : 0) - SAFE_MARGIN);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarActive]);
  return <div style={{ width: '100%', maxWidth, margin: '0 auto', transition: 'max-width 0.2s' }}>{children(maxWidth)}</div>;
};

const useKpiGridLayout = () => {
  const isSidebarActive = useBreakpointValue({ base: false, md: true });
  const [isTwoByFour, setIsTwoByFour] = useState(false);
  useEffect(() => {
    function handleResize() {
      const sidebar = isSidebarActive ? SIDEBAR_WIDTH : 0;
      const safe = SAFE_MARGIN;
      const gridMinWidth = 4 * MIN_CELL_WIDTH; // 4 columns
      setIsTwoByFour(window.innerWidth < sidebar + gridMinWidth + safe);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarActive]);
  return isTwoByFour;
};

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
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdownItem[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  const isTwoByFour = useKpiGridLayout();

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

        // Helper to strip milliseconds from ISO string
        const toIsoNoMillis = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');
        if (period === 'custom') {
          if (!startDate || !endDate) {
            setLoading(false);
            return;
          }
          // Convert custom local dates to UTC boundaries
          const start = new Date(startDate);
          const end = new Date(endDate);
          const startOfDayLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
          const endOfDayLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
          startDateParam = toIsoNoMillis(startOfDayLocal);
          endDateParam = toIsoNoMillis(endOfDayLocal);
        } else if (period !== 'allTime') {
          // Calculate relative periods
          const today = new Date();
          const endDateLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          let startDateLocal;
          switch (period) {
            case 'last7days':
              startDateLocal = new Date(today);
              startDateLocal.setDate(today.getDate() - 6); // Changed from -7 to -6 to get exactly 7 days
              startDateLocal.setHours(0, 0, 0, 0);
              break;
            case 'last30days':
              startDateLocal = new Date(today);
              startDateLocal.setDate(today.getDate() - 29); // Changed from -30 to -29 to get exactly 30 days
              startDateLocal.setHours(0, 0, 0, 0);
              break;
            case 'last90days':
              startDateLocal = new Date(today);
              startDateLocal.setDate(today.getDate() - 89); // Changed from -90 to -89 to get exactly 90 days
              startDateLocal.setHours(0, 0, 0, 0);
              break;
            case 'thisMonth':
              startDateLocal = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
              break;
            case 'thisYear':
              startDateLocal = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
              break;
            default:
              startDateLocal = new Date(today);
              startDateLocal.setHours(0, 0, 0, 0);
          }
          startDateParam = toIsoNoMillis(startDateLocal);
          endDateParam = toIsoNoMillis(endDateLocal);
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
            const clientStatsData = await apiClient.getClientStats(startDateParam, endDateParam, serviceIdParam);
            setClientStats(clientStatsData.map(item => {
              const stats = item.client_stats;
              const totalRevenue = stats.total_revenue;
              const totalMeetings = stats.total_meetings;
              const doneMeetings = stats.done_meetings;
              const hours = stats.total_hours;
              return {
                clientId: stats.client_id,
                clientName: stats.client_name,
                totalMeetings,
                doneMeetings,
                canceledMeetings: stats.canceled_meetings,
                totalRevenue,
                pricePerHour: hours > 0 ? totalRevenue / hours : 0,
                hours,
                pricePerMeeting: doneMeetings > 0 ? totalRevenue / doneMeetings : 0,
                // Optionally, you can add: meetings: item.meetings
              };
            }));
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

        // Fetch daily breakdown for the period
        if (startDateParam && endDateParam) {
          try {
            const breakdown = await apiClient.getDailyBreakdown(startDateParam, endDateParam, serviceIdParam);
            setDailyBreakdown(breakdown);
          } catch (err) {
            setDailyBreakdown([]);
          }
        } else {
          setDailyBreakdown([]);
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

  // Add helper function for safe formatting
  const safeToFixed = (value: number | undefined | null, digits = 2) =>
    typeof value === 'number' && !isNaN(value) ? value.toFixed(digits) : '0.00';

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
      <Stack spacing={{ base: 4, md: 8 }} px={{ base: 3, md: 8 }} py={{ base: 2, md: 4 }}>
        <Heading as="h1" size={{ base: "md", md: "lg" }} mb={4}>Statistics</Heading>
        <Flex justify="center" align="center" minH={{ base: "150px", md: "200px" }}>
          <Spinner size={{ base: "md", md: "lg" }} color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={{ base: 4, md: 8 }} px={{ base: 3, md: 8 }} py={{ base: 2, md: 4 }}>
        <Heading as="h1" size={{ base: "md", md: "lg" }} mb={4}>Statistics</Heading>
        <Alert status="error" borderRadius="lg">
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
      title: 'Done Meetings',
      value: stats?.done_meetings || 0,
      icon: <CalendarDaysIcon style={{ width: 28, height: 28 }} color="#805AD5" />,
      color: 'purple.100'
    },
    {
      title: 'Total Hours',
      value: stats?.total_hours || 0,
      icon: <ClockIcon style={{ width: 28, height: 28 }} color="#D69E2E" />,
      color: 'yellow.100'
    },
    {
      title: 'Revenue Paid',
      value: `$${stats?.revenue_paid?.toFixed(2) || '0.00'}`,
      icon: <CurrencyDollarIcon style={{ width: 28, height: 28 }} color="#38A169" />,
      color: 'green.100'
    },
    {
      title: 'Clients with Memberships',
      value: stats?.clients_with_memberships || 0,
      icon: <UserGroupIcon style={{ width: 28, height: 28 }} color="#3182CE" />,
      color: 'blue.100'
    },
    // New KPI: Price per Meeting
    {
      title: 'Price per Meeting',
      value: `$${stats && stats.done_meetings > 0 ? (stats.total_revenue / stats.done_meetings).toFixed(2) : '0.00'}`,
      icon: <CurrencyDollarIcon style={{ width: 28, height: 28 }} color="#38A169" />,
      color: 'green.100'
    },
    // New KPI: Price per Hour
    {
      title: 'Price per Hour',
      value: `$${stats && stats.total_hours > 0 ? (stats.total_revenue / stats.total_hours).toFixed(2) : '0.00'}`,
      icon: <ClockIcon style={{ width: 28, height: 28 }} color="#3182CE" />,
      color: 'blue.100'
    }
  ];

  // Adjust grid layout for 8 cards
  const kpiGridColumns = { base: 1, sm: 2, md: 3, lg: 4, xl: 4, '2xl': 4 };

  // Meeting status data for pie chart
  const meetingStatusData = [
    { name: 'Done', value: stats?.done_meetings || 0, color: '#38A169' },
    { name: 'Canceled', value: stats?.canceled_meetings || 0, color: '#E53E3E' },
    { name: 'Upcoming', value: (stats?.total_meetings || 0) - (stats?.done_meetings || 0) - (stats?.canceled_meetings || 0), color: '#3182CE' },
  ];

  // Membership status data for pie chart
  const membershipStatusData = [
    { name: 'Active', value: stats?.active_memberships || 0, color: '#38A169' },
    { name: 'Expired', value: (stats?.total_memberships || 0) - (stats?.active_memberships || 0), color: '#E53E3E' },
  ];

  // Weekly revenue data (from API)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = dailyBreakdown.map(item => {
    const dateObj = new Date(item.date + 'T00:00:00Z');
    return {
      name: dayNames[dateObj.getUTCDay()],
      Revenue: item.revenue,
      Meetings: item.meetings_count,
    };
  });

  // Service comparison data for charts
  const serviceRevenueData = serviceStats.map(service => ({
    name: service.serviceName,
    revenue: service.revenue,
    hours: service.hours
  }));

  return (
    <ResponsiveContentWrapper>
      {(maxWidth) => (
        <Stack spacing={{ base: 4, md: 8 }} px={{ base: 1, sm: 2, md: 8 }} py={{ base: 2, md: 4 }} w="full" maxW={maxWidth} minW={0} overflowX="hidden">
          <Heading as="h1" size={{ base: "md", md: "lg" }} mb={4} textAlign={{ base: "center", md: "left" }} className="responsive-heading">Statistics</Heading>

          {/* Period and Service Selectors */}
          <Box w="full" maxW={maxWidth} minW={0} className="responsive-container">
            <Flex wrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }} align="start" w="full" minW={0} className="mobile-spacing">
              {/* Period Selector */}
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                maxW={{ base: "100%", sm: 220 }}
                minW={{ base: "200px", sm: 120 }}
                flexShrink={1}
                bg="white"
                size={{ base: "md", md: "sm" }}
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: "purple.500", boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)" }}
                fontSize={{ base: "sm", md: "md" }}
                className="responsive-text"
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
                  maxW={{ base: "100%", sm: 220 }}
                  minW={{ base: "200px", sm: 120 }}
                  flexShrink={1}
                  bg="white"
                  size={{ base: "md", md: "sm" }}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{ borderColor: "purple.500", boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)" }}
                  fontSize={{ base: "sm", md: "md" }}
                  className="responsive-text"
                >
                  <option value="all">All Services</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </Select>
              )}
            </Flex>

            {/* Custom Date Range Popover */}
            {period === 'custom' && (
              <Box mt={3} w="full" maxW={maxWidth} minW={0}>
                <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="bottom-start">
                  <PopoverTrigger>
                    <Button
                      variant="outline"
                      bg="white"
                      w="full"
                      maxW={maxWidth}
                      justifyContent="space-between"
                      size={{ base: "md", md: "sm" }}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{ bg: 'gray.50' }}
                      rightIcon={<ChevronDownIcon style={{ width: 16, height: 16 }} />}
                      fontSize={{ base: "sm", md: "md" }}
                    >
                      {formatDateRange()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent p={4} w={{ base: "calc(100vw - 32px)", md: "400px" }} maxW="400px">
                    <PopoverBody>
                      <VStack spacing={4}>
                        <Text fontWeight="semibold" fontSize="sm">Select Date Range</Text>
                        <VStack spacing={4} w="full">
                          <VStack align="start" w="full">
                            <Text fontSize="sm" fontWeight="medium">Start Date</Text>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{
                                padding: '12px 16px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '16px',
                                width: '100%',
                                outline: 'none'
                              }}
                            />
                          </VStack>
                          <VStack align="start" w="full">
                            <Text fontSize="sm" fontWeight="medium">End Date</Text>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{
                                padding: '12px 16px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '16px',
                                width: '100%',
                                outline: 'none'
                              }}
                            />
                          </VStack>
                        </VStack>
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
          <Grid
            templateColumns={isTwoByFour ? '1fr 1fr' : '1fr 1fr 1fr 1fr'}
            templateRows={isTwoByFour ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)'}
            gap={4}
            w="full"
          >
            {kpis.map((kpi) => (
              <GridItem w="100%" h="100%" key={kpi.title}>
                <StatsCard {...kpi} />
              </GridItem>
            ))}
          </Grid>

          {/* Service Comparison Section - Only show when "All Services" is selected */}
          {selectedService === 'all' && serviceStats.length > 0 && (
            <Box w="full" maxW={maxWidth} minW={0}>
              <Heading as="h2" size={{ base: "sm", md: "md" }} mb={4} textAlign={{ base: "center", md: "left" }}>Service Comparison</Heading>

              {/* Service Comparison Charts */}
              <VStack spacing={{ base: 3, md: 4 }} mb={6} w="full">
                {/* Revenue by Service */}
                <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW="100%">
                  <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Revenue by Service</Text>
                  <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serviceRevenueData}>
                        <XAxis dataKey="name" fontSize={isMobile ? 8 : 12} />
                        <YAxis fontSize={isMobile ? 8 : 12} />
                        <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#38A169" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                {/* Hours by Service */}
                <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW="100%">
                  <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Hours by Service</Text>
                  <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serviceRevenueData}>
                        <XAxis dataKey="name" fontSize={isMobile ? 8 : 12} />
                        <YAxis fontSize={isMobile ? 8 : 12} />
                        <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                        <Bar dataKey="hours" fill="#3182CE" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </VStack>

              {/* Service Comparison Cards for Mobile, Table for Desktop */}
              {isMobile ? (
                <VStack spacing={{ base: 2, md: 3 }} align="stretch" w="full">
                  {serviceStats.map((service) => (
                    <Card key={service.serviceId} shadow="sm" border="1px solid" borderColor="gray.100" w="full" maxW="100%">
                      <CardBody p={{ base: 3, md: 4 }}>
                        <VStack spacing={{ base: 2, md: 3 }} align="stretch">
                          <Text fontWeight="semibold" fontSize={{ base: "sm", md: "md" }}>{service.serviceName}</Text>
                          <SimpleGrid columns={2} spacing={{ base: 2, md: 3 }}>
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Revenue</Text>
                              <Text fontWeight="bold" color="green.600" fontSize={{ base: "sm", md: "md" }}>${service.revenue.toFixed(2)}</Text>
                            </Box>
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Hours</Text>
                              <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>{service.hours.toFixed(1)}h</Text>
                            </Box>
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Meetings</Text>
                              <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>{service.meetings}</Text>
                            </Box>
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Avg. Revenue/Hour</Text>
                              <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
                                ${service.hours > 0 ? (service.revenue / service.hours).toFixed(2) : '0.00'}
                              </Text>
                            </Box>
                          </SimpleGrid>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              ) : (
                <Box bg="white" rounded="xl" shadow="md" p={{ base: 4, md: 6 }} w="full" maxW="100%">
                  <Text fontWeight="semibold" fontSize={{ base: "md", md: "lg" }} mb={4}>Service Breakdown</Text>
                  <TableContainer maxW="100%">
                    <Table variant="simple" size={{ base: "sm", md: "md" }}>
                      <Thead>
                        <Tr>
                          <Th fontSize={{ base: "xs", md: "sm" }}>Service</Th>
                          <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Revenue</Th>
                          <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Hours</Th>
                          <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Meetings</Th>
                          <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Avg. Revenue/Hour</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {serviceStats.map((service) => (
                          <Tr key={service.serviceId}>
                            <Td fontWeight="medium" fontSize={{ base: "xs", md: "sm" }}>{service.serviceName}</Td>
                            <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>${service.revenue.toFixed(2)}</Td>
                            <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>{service.hours.toFixed(1)}h</Td>
                            <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>{service.meetings}</Td>
                            <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>
                              ${service.hours > 0 ? (service.revenue / service.hours).toFixed(2) : '0.00'}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Charts */}
          <VStack spacing={{ base: 3, md: 4 }} w="full" maxW={maxWidth} minW={0}>
            {/* Weekly Revenue Chart */}
            <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW="100%">
              <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Weekly Revenue</Text>
              <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="name" fontSize={isMobile ? 8 : 12} />
                    <YAxis fontSize={isMobile ? 8 : 12} />
                    <Tooltip />
                    <Bar dataKey="Revenue" fill="#38A169" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Meeting Status Distribution */}
            <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW="100%">
              <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Meeting Status</Text>
              <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={meetingStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 50 : 80}
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

            {/* Membership Status Distribution */}
            {stats?.total_memberships && stats.total_memberships > 0 && (
              <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW="100%">
                <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Membership Status</Text>
                <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={membershipStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 50 : 80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {membershipStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </VStack>

          {/* Period Comparison Panel - Histogram */}
          {shouldShowPeriodComparison && (
            <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW={maxWidth} minW={0}>
              <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Period Comparison</Text>
              <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
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
                    <XAxis dataKey="name" fontSize={isMobile ? 8 : 12} />
                    <YAxis fontSize={isMobile ? 8 : 12} />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <VStack spacing={{ base: 3, md: 4 }} mt={4} w="full">
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 3, md: 4 }} w="full">
                  <Box textAlign="center">
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Previous Period</Text>
                    <Text fontSize={{ base: "sm", md: "lg" }} fontWeight="bold" color="gray.700">
                      ${previousStats?.total_revenue.toFixed(2) || '0.00'}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Current Period</Text>
                    <Text fontSize={{ base: "sm", md: "lg" }} fontWeight="bold" color="green.600">
                      ${stats?.total_revenue.toFixed(2) || '0.00'}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Change</Text>
                    <Text
                      fontSize={{ base: "sm", md: "lg" }}
                      fontWeight="bold"
                      color={calculatePercentageChange(stats?.total_revenue || 0, previousStats?.total_revenue || 0) >= 0 ? 'green.600' : 'red.600'}
                    >
                      {calculatePercentageChange(stats?.total_revenue || 0, previousStats?.total_revenue || 0) >= 0 ? '+' : ''}
                      {calculatePercentageChange(stats?.total_revenue || 0, previousStats?.total_revenue || 0).toFixed(1)}%
                    </Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </Box>
          )}

          {/* Membership Revenue Comparison */}
          {stats?.total_memberships && stats.total_memberships > 0 && (
            <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW={maxWidth} minW={0}>
              <Text fontWeight="semibold" fontSize={{ base: "sm", md: "lg" }} mb={3}>Membership Revenue Breakdown</Text>
              <Box h={{ base: "40", md: "64" }} w="full" maxW="100%">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    {
                      name: 'Total Revenue',
                      revenue: stats?.membership_revenue || 0,
                      fill: '#38A169'
                    },
                    {
                      name: 'Revenue Paid',
                      revenue: stats?.membership_revenue_paid || 0,
                      fill: '#3182CE'
                    },
                    {
                      name: 'Revenue Outstanding',
                      revenue: (stats?.membership_revenue || 0) - (stats?.membership_revenue_paid || 0),
                      fill: '#E53E3E'
                    }
                  ]}>
                    <XAxis dataKey="name" fontSize={isMobile ? 8 : 12} />
                    <YAxis fontSize={isMobile ? 8 : 12} />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <VStack spacing={{ base: 3, md: 4 }} mt={4} w="full">
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 3, md: 4 }} w="full">
                  <Box textAlign="center">
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Total Revenue</Text>
                    <Text fontSize={{ base: "sm", md: "lg" }} fontWeight="bold" color="green.600">
                      ${stats?.membership_revenue.toFixed(2) || '0.00'}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Revenue Paid</Text>
                    <Text fontSize={{ base: "sm", md: "lg" }} fontWeight="bold" color="blue.600">
                      ${stats?.membership_revenue_paid.toFixed(2) || '0.00'}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Outstanding</Text>
                    <Text fontSize={{ base: "sm", md: "lg" }} fontWeight="bold" color="red.600">
                      ${((stats?.membership_revenue || 0) - (stats?.membership_revenue_paid || 0)).toFixed(2)}
                    </Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </Box>
          )}

          {/* Client Statistics Table */}
          {clientStats.length > 0 && (
            <Box w="full" maxW={maxWidth} minW={0}>
              <Heading as="h2" size={{ base: "sm", md: "md" }} mb={4} textAlign={{ base: "center", md: "left" }}>Client Statistics</Heading>
              <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} w="full" maxW="100%">
                {/* Search Bar */}
                <Box mb={4} w="full" maxW="100%">
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
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#805AD5'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </Box>

                {/* Mobile Cards vs Desktop Table */}
                {isMobile ? (
                  <VStack spacing={{ base: 2, md: 3 }} align="stretch" w="full">
                    {filteredClientStats.map((client) => (
                      <Card key={client.clientId} shadow="sm" border="1px solid" borderColor="gray.100" w="full" maxW="100%">
                        <CardBody p={{ base: 3, md: 4 }}>
                          <VStack spacing={{ base: 2, md: 3 }} align="stretch">
                            <Text fontWeight="semibold" fontSize={{ base: "sm", md: "md" }} color="purple.600">{client.clientName}</Text>
                            <SimpleGrid columns={2} spacing={{ base: 2, md: 3 }}>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Total Meetings</Text>
                                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>{client.totalMeetings}</Text>
                              </Box>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Done Meetings</Text>
                                <Text fontWeight="bold" color="red.500" fontSize={{ base: "sm", md: "md" }}>{client.doneMeetings}</Text>
                              </Box>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Total Revenue</Text>
                                <Text fontWeight="bold" color="green.600" fontSize={{ base: "sm", md: "md" }}>${safeToFixed(client.totalRevenue)}</Text>
                              </Box>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Price/Hour</Text>
                                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>${safeToFixed(client.pricePerHour)}</Text>
                              </Box>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Total Hours</Text>
                                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>{safeToFixed(client.hours, 1)}h</Text>
                              </Box>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Price/Meeting</Text>
                                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>${safeToFixed(client.pricePerMeeting)}</Text>
                              </Box>
                            </SimpleGrid>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                ) : (
                  <Box overflowX="auto" w="full" maxW="100%">
                    <TableContainer maxW="100%">
                      <Table variant="simple" size={{ base: "sm", md: "md" }}>
                        <Thead>
                          <Tr>
                            <Th fontSize={{ base: "xs", md: "sm" }}>Client</Th>
                            <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Total Meetings</Th>
                            <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Done Meetings</Th>
                            <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Total Revenue</Th>
                            <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Price Per Hour</Th>
                            <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Total Hours</Th>
                            <Th isNumeric fontSize={{ base: "xs", md: "sm" }}>Price Per Meeting</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredClientStats.map((client) => (
                            <Tr
                              key={client.clientId}
                              onClick={() => {
                                setSelectedClientId(client.clientId);
                                setModalOpen(true);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <Td fontWeight="medium" fontSize={{ base: "xs", md: "sm" }}>{client.clientName}</Td>
                              <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>{client.totalMeetings}</Td>
                              <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>{client.doneMeetings}</Td>
                              <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>${safeToFixed(client.totalRevenue)}</Td>
                              <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>${safeToFixed(client.pricePerHour)}</Td>
                              <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>{safeToFixed(client.hours, 1)}h</Td>
                              <Td isNumeric fontSize={{ base: "xs", md: "sm" }}>${safeToFixed(client.pricePerMeeting)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* No results message */}
                {filteredClientStats.length === 0 && clientSearchTerm && (
                  <Box textAlign="center" py={8}>
                    <Text color="gray.500" fontSize={{ base: "sm", md: "md" }}>No clients found matching "{clientSearchTerm}"</Text>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Client Statistics Modal */}
          <ClientStatisticsModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            clientId={selectedClientId || ''}
            startDate={startDate}
            endDate={endDate}
            serviceId={selectedService !== 'all' ? selectedService : undefined}
          />
        </Stack>
      )}
    </ResponsiveContentWrapper>
  );
};

export default Stats;
