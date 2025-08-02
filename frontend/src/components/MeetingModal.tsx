import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Checkbox,
  useToast,
  Spinner,
  Stack,
  Flex,
  Divider,
  Text,
  VStack,
  HStack,
  Box,
  Badge,
} from '@chakra-ui/react';
import { apiClient, Service, Client, Membership } from '../lib/api';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Utility: Convert local datetime string (yyyy-MM-ddTHH:mm) to UTC ISO string
function localDateTimeToUTCISOString(localDateTime: string): string {
  // localDateTime is in 'yyyy-MM-ddTHH:mm' format
  const [datePart, timePart] = localDateTime.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // JS Date: months are 0-based
  const localDate = new Date(year, month - 1, day, hour, minute);
  return localDate.toISOString();
}

const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [serviceId, setServiceId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [pricePerMeeting, setPricePerMeeting] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'done' | 'canceled'>('upcoming');
  const [paid, setPaid] = useState(false);
  const [useMembership, setUseMembership] = useState(false);

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // For duration logic
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [clientDuration, setClientDuration] = useState<number | null>(null);
  const [servicePrice, setServicePrice] = useState<number | null>(null);
  const [clientPrice, setClientPrice] = useState<number | null>(null);

  // Track which field user is editing to prevent auto-updates
  const [isEditingPricePerHour, setIsEditingPricePerHour] = useState(false);
  const [isEditingPricePerMeeting, setIsEditingPricePerMeeting] = useState(false);

  // Calculate meeting duration in hours
  const getMeetingDurationHours = useCallback(() => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
  }, [startTime, endTime]);

  // Calculate price per meeting from price per hour
  const calculatePricePerMeeting = useCallback((hourlyRate: number) => {
    const durationHours = getMeetingDurationHours();
    return (hourlyRate * durationHours).toFixed(2);
  }, [getMeetingDurationHours]);

  // Calculate price per hour from price per meeting
  const calculatePricePerHour = useCallback((meetingPrice: number) => {
    const durationHours = getMeetingDurationHours();
    return durationHours > 0 ? (meetingPrice / durationHours).toFixed(2) : '0';
  }, [getMeetingDurationHours]);

  // Handle price per hour change
  const handlePricePerHourChange = (value: string) => {
    setPricePerHour(value);
    if (!isEditingPricePerMeeting) {
      const hourlyRate = parseFloat(value) || 0;
      const meetingPrice = calculatePricePerMeeting(hourlyRate);
      setPricePerMeeting(meetingPrice);
    }
  };

  // Handle price per meeting change
  const handlePricePerMeetingChange = (value: string) => {
    setPricePerMeeting(value);
    if (!isEditingPricePerHour) {
      const meetingPrice = parseFloat(value) || 0;
      const hourlyRate = calculatePricePerHour(meetingPrice);
      setPricePerHour(hourlyRate);
    }
  };

  // Update prices when duration changes (only if not actively editing)
  useEffect(() => {
    if (pricePerHour && startTime && endTime && !isEditingPricePerHour && !isEditingPricePerMeeting) {
      const hourlyRate = parseFloat(pricePerHour);
      const meetingPrice = calculatePricePerMeeting(hourlyRate);
      setPricePerMeeting(meetingPrice);
    }
  }, [startTime, endTime, pricePerHour, calculatePricePerMeeting, isEditingPricePerHour, isEditingPricePerMeeting]);

  // Update pricing when membership is selected
  useEffect(() => {
    if (useMembership && activeMembership) {
      setPricePerMeeting(activeMembership.price_per_meeting.toString());
      const hourlyRate = calculatePricePerHour(activeMembership.price_per_meeting);
      setPricePerHour(hourlyRate);
    }
  }, [useMembership, activeMembership, calculatePricePerHour]);

  // Fetch services on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      apiClient.getServices(),
    ]).then(([servicesData]) => {
      setServices(servicesData);
      setLoading(false);
    });
  }, [isOpen]);

  // Fetch clients when service changes
  useEffect(() => {
    if (!serviceId) {
      setClients([]);
      setClientId('');
      setServiceDuration(null);
      setServicePrice(null);
      setActiveMembership(null);
      return;
    }
    setLoading(true);
    apiClient.getClients(serviceId).then((clientsData) => {
      setClients(clientsData);
      setClientId('');
      // Get service duration/price
      const service = services.find(s => s.id === serviceId);
      setServiceDuration(service?.default_duration_minutes || null);
      setServicePrice(service?.default_price_per_hour || null);
      setActiveMembership(null);
      setLoading(false);
    });
  }, [serviceId]);

  // Fetch active membership when client changes
  useEffect(() => {
    if (!clientId) {
      setActiveMembership(null);
      setUseMembership(false);
      return;
    }

    apiClient.getActiveMembership(clientId).then((membership) => {
      setActiveMembership(membership);
      setUseMembership(false); // Default to not using membership
    });
  }, [clientId]);

  // Update client duration/price when client changes
  useEffect(() => {
    if (!clientId) {
      setClientDuration(null);
      setClientPrice(null);
      return;
    }
    const client = clients.find(c => c.id === clientId);
    setClientDuration(client?.custom_duration_minutes || null);
    setClientPrice(client?.custom_price_per_hour || null);

    // Generate default title when both service and client are selected
    if (serviceId && client) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        setTitle(`${service.name}-${client.name}`);
      }
    }
  }, [clientId, clients, serviceId, services]);

  // Set default start/end time when modal opens
  useEffect(() => {
    if (!isOpen) return;
    // Start time: today, next rounded hour (local time)
    const now = new Date();
    if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
      now.setHours(now.getHours() + 1);
    }
    now.setMinutes(0, 0, 0);
    // Format as yyyy-MM-ddTHH:mm for local time
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
    setStartTime(startIso);
    // End time: add duration (client > service > 60)
    let duration = clientDuration || serviceDuration || 60;
    const end = new Date(now.getTime() + duration * 60000);
    const endIso = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setEndTime(endIso);
    // Price per hour
    setPricePerHour((clientPrice || servicePrice || 0).toString());
    setStatus('upcoming');
    setPaid(false);

    // Reset recurrence settings
    setIsRecurring(false);
            setRecurrenceFrequency('WEEKLY');
    setRecurrenceEndDate('');
  }, [isOpen, clientDuration, serviceDuration, clientPrice, servicePrice]);

  // Update end time and price when client/service/startTime changes
  useEffect(() => {
    if (!startTime) return;
    let duration = clientDuration || serviceDuration || 60;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const endIso = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setEndTime(endIso);
    setPricePerHour((clientPrice || servicePrice || 0).toString());
  }, [clientId, serviceId, startTime, clientDuration, serviceDuration, clientPrice, servicePrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !clientId || !title || !startTime || !endTime || !pricePerHour) return;

    setSubmitting(true);
    try {
      if (isRecurring && recurrenceEndDate) {
        // Create recurrence
        // Convert local times to UTC for start_date and end_date
        const startDateUTC = localDateTimeToUTCISOString(startTime);
        const endDateUTC = localDateTimeToUTCISOString(recurrenceEndDate + 'T' + new Date(startTime).toTimeString().slice(0, 5));

        // Extract time components in UTC
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        const startTimeOnly = startDate.getUTCHours().toString().padStart(2, '0') + ':' + startDate.getUTCMinutes().toString().padStart(2, '0'); // HH:mm in UTC
        const endTimeOnly = endDate.getUTCHours().toString().padStart(2, '0') + ':' + endDate.getUTCMinutes().toString().padStart(2, '0'); // HH:mm in UTC

        await apiClient.createRecurrence({
          service_id: serviceId,
          client_id: clientId,
          frequency: recurrenceFrequency,
          start_date: startDateUTC,
          end_date: endDateUTC,
          title,
          start_time: startTimeOnly,
          end_time: endTimeOnly,
          price_per_hour: parseFloat(pricePerHour),
        });
        toast({ title: 'Recurring meeting created', status: 'success', duration: 2000, isClosable: true });
      } else {
        // Create single meeting
        const meetingData: any = {
          service_id: serviceId,
          client_id: clientId,
          title,
          start_time: localDateTimeToUTCISOString(startTime),
          end_time: localDateTimeToUTCISOString(endTime),
          price_per_hour: parseFloat(pricePerHour),
          status,
          paid,
        };

        // Add membership_id if using membership
        if (useMembership && activeMembership) {
          meetingData.membership_id = activeMembership.id;
        }

        await apiClient.createMeeting(meetingData);
        toast({ title: 'Meeting created', status: 'success', duration: 2000, isClosable: true });
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to create meeting', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Meeting</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit}>
          <ModalBody>
            {loading ? (
              <Flex justify="center" align="center" minH="100px"><Spinner /></Flex>
            ) : (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Service</FormLabel>
                  <Select value={serviceId} onChange={e => setServiceId(e.target.value)} placeholder="Select service">
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Client</FormLabel>
                  <Select value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Select client" isDisabled={!serviceId}>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </Select>
                </FormControl>

                {/* Active Membership Display */}
                {activeMembership && (
                  <Box p={4} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.200">
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="semibold" color="purple.700">
                        Active Membership Available
                      </Text>
                      <Badge colorScheme="purple">{activeMembership.name}</Badge>
                    </Flex>
                    <Text fontSize="sm" color="purple.600" mb={3}>
                      {activeMembership.total_meetings} meetings • ${activeMembership.price_per_meeting} per meeting
                    </Text>
                    <Checkbox
                      isChecked={useMembership}
                      onChange={e => setUseMembership(e.target.checked)}
                      colorScheme="purple"
                    >
                      Use this membership for this meeting
                    </Checkbox>
                  </Box>
                )}

                <FormControl isRequired>
                  <FormLabel>Title</FormLabel>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Start Time</FormLabel>
                  <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>End Time</FormLabel>
                  <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Price per Hour</FormLabel>
                  <Input
                    type="number"
                    value={pricePerHour}
                    onChange={e => handlePricePerHourChange(e.target.value)}
                    onFocus={() => setIsEditingPricePerHour(true)}
                    onBlur={() => setIsEditingPricePerHour(false)}
                    min={0}
                    step={0.01}
                    isDisabled={useMembership && !!activeMembership}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Price per Meeting</FormLabel>
                  <Input
                    type="number"
                    value={pricePerMeeting}
                    onChange={e => handlePricePerMeetingChange(e.target.value)}
                    onFocus={() => setIsEditingPricePerMeeting(true)}
                    onBlur={() => setIsEditingPricePerMeeting(false)}
                    min={0}
                    step={0.01}
                    isDisabled={useMembership && !!activeMembership}
                  />
                </FormControl>

                <Divider />

                <FormControl>
                  <Checkbox isChecked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}>
                    Make this a recurring meeting
                  </Checkbox>
                </FormControl>

                {isRecurring && (
                  <VStack spacing={4} align="start">
                    <FormControl isRequired={isRecurring}>
                      <FormLabel>Frequency</FormLabel>
                      <Select value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value as any)}>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Bi-weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </Select>
                    </FormControl>

                    <FormControl isRequired={isRecurring}>
                      <FormLabel>End Date</FormLabel>
                      <Input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={e => setRecurrenceEndDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                  </VStack>
                )}

                <FormControl isRequired={!isRecurring}>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    isDisabled={isRecurring}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="done">Done</option>
                    <option value="canceled">Canceled</option>
                  </Select>
                  {isRecurring && (
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      Recurring meetings are automatically set to "Upcoming"
                    </Text>
                  )}
                </FormControl>

                <FormControl>
                  <Checkbox
                    isChecked={paid}
                    onChange={e => setPaid(e.target.checked)}
                    isDisabled={isRecurring}
                  >
                    Paid
                  </Checkbox>
                  {isRecurring && (
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      Recurring meetings are automatically set to "Unpaid"
                    </Text>
                  )}
                </FormControl>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={3} variant="ghost">Cancel</Button>
            <Button colorScheme="purple" type="submit" isLoading={submitting} isDisabled={loading || submitting}>Save</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default MeetingModal;
