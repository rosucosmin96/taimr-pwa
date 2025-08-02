import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import DailyCalendar from '../components/DailyCalendar';
import TutorialModal from '../components/TutorialModal';
import { CalendarDaysIcon, UserGroupIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Box, Grid, Heading, Text, Flex, Stack, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, StatsOverview, Meeting, Profile } from '../lib/api';

interface KPI {
  title: string;
  value: string | number;
  weeklyValue: string | number;
  icon: React.ReactElement;
  color: string;
}

const Dashboard: React.FC = () => {
  const [todayStats, setTodayStats] = useState<StatsOverview | null>(null);
  const [weekStats, setWeekStats] = useState<StatsOverview | null>(null);
  const [todayMeetings, setTodayMeetings] = useState<Meeting[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Calculate UTC start and end of today
        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        const todayStartUTC = startOfDayUTC.toISOString();
        const todayEndUTC = endOfDayUTC.toISOString();

        // Calculate week start and end (UTC)
        const weekStartUTCDate = new Date(startOfDayUTC);
        weekStartUTCDate.setUTCDate(now.getUTCDate() - now.getUTCDay());
        const weekEndUTCDate = new Date(weekStartUTCDate);
        weekEndUTCDate.setUTCDate(weekStartUTCDate.getUTCDate() + 6);
        weekEndUTCDate.setUTCHours(23, 59, 59, 999);
        const weekStartUTC = weekStartUTCDate.toISOString();
        const weekEndUTC = weekEndUTCDate.toISOString();

        const [todayStatsData, weekStatsData, meetingsData, profileData] = await Promise.all([
          apiClient.getStatsOverview(todayStartUTC, todayEndUTC), // Today's stats
          apiClient.getStatsOverview(weekStartUTC, weekEndUTC), // This week's stats
          apiClient.getMeetings(undefined, now.toISOString().split('T')[0]),
          apiClient.getProfile()
        ]);
        setTodayStats(todayStatsData);
        setWeekStats(weekStatsData);
        setTodayMeetings(meetingsData);
        setProfile(profileData);

        // Show tutorial if user hasn't completed it
        if (profileData && !profileData.tutorial_checked) {
          setShowTutorial(true);
        }
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

  const handleTutorialComplete = async () => {
    try {
      if (profile) {
        await apiClient.updateProfile({ tutorial_checked: true });
        setProfile({ ...profile, tutorial_checked: true });
      }
    } catch (err) {
      console.error('Failed to update tutorial status:', err);
    } finally {
      setShowTutorial(false);
    }
  };

  const kpis: KPI[] = [
    {
      title: 'Today\'s Revenue',
      value: `$${todayStats?.total_revenue.toFixed(2) || '0.00'}`,
      weeklyValue: `$${weekStats?.total_revenue.toFixed(2) || '0.00'} this week`,
      icon: <CurrencyDollarIcon style={{ width: 28, height: 28 }} color="#38A169" />,
      color: 'green.100'
    },
    {
      title: 'Today\'s Meetings',
      value: todayStats?.total_meetings || 0,
      weeklyValue: `${weekStats?.total_meetings || 0} this week`,
      icon: <CalendarDaysIcon style={{ width: 28, height: 28 }} color="#805AD5" />,
      color: 'purple.100'
    },
    {
      title: 'Today\'s Upcoming',
      value: todayMeetings.filter(m => m.status === 'upcoming').length,
      weeklyValue: `${weekStats?.done_meetings || 0} completed this week`,
      icon: <ClockIcon style={{ width: 28, height: 28 }} color="#D69E2E" />,
      color: 'yellow.100'
    },
    {
      title: 'Total Clients',
      value: todayStats?.total_clients || 0,
      weeklyValue: `${weekStats?.total_clients || 0} this week`,
      icon: <UserGroupIcon style={{ width: 28, height: 28 }} color="#3182CE" />,
      color: 'blue.100'
    },
  ];

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={2}>Dashboard</Heading>
      {profile?.name && (
        <Text fontSize="xl" color="gray.700" mb={2}>
          Congrats for this day, {profile.name}! Make the most of it!
        </Text>
      )}
      {/* KPI Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
        {kpis.map((kpi) => (
          <Box key={kpi.title} bg="white" rounded="xl" shadow="md" p={6}>
            <Flex align="center" justify="space-between" mb={3}>
              <Box p={2} rounded="lg" bg={kpi.color}>
                {kpi.icon}
              </Box>
            </Flex>
            <Text fontSize="2xl" fontWeight="bold" mb={1}>
              {kpi.value}
            </Text>
            <Text fontSize="sm" color="gray.600" mb={2}>
              {kpi.title}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {kpi.weeklyValue}
            </Text>
          </Box>
        ))}
      </Grid>
      {/* Daily Calendar */}
      <DailyCalendar meetings={todayMeetings} />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />
    </Stack>
  );
};

export default Dashboard;
