import React, { useState, useEffect } from 'react';
import { Stack, Heading, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, Meeting, Client, Service } from '../lib/api';
import FullCalendar from '../components/FullCalendar';
import MeetingModal from '../components/MeetingModal';
import MeetingViewModal from '../components/MeetingViewModal';

const Calendar: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

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
        setError('Failed to load calendar data');
        console.error('Calendar fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddMeeting = () => {
    setIsModalOpen(true);
  };

  const handleViewMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsViewModalOpen(true);
  };

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Calendar</Heading>
        <Stack justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Stack>
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
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4} className="container-responsive">
      <Heading as="h1" size="lg" mb={4} className="responsive-heading">Calendar</Heading>

      <FullCalendar
        meetings={meetings}
        onAddMeeting={handleAddMeeting}
        onViewMeeting={handleViewMeeting}
      />

      <MeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      <MeetingViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedMeeting(null);
        }}
        onSuccess={() => window.location.reload()}
        meeting={selectedMeeting}
      />
    </Stack>
  );
};

export default Calendar;
