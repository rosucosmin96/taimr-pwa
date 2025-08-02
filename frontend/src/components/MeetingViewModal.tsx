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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Text,
  Badge,
  Box,
} from '@chakra-ui/react';
import { apiClient, Service, Client, Meeting } from '../lib/api';
import RecurrenceUpdateDialog from './RecurrenceUpdateDialog';
import RecurrenceDeleteDialog from './RecurrenceDeleteDialog';

interface MeetingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meeting: Meeting | null;
}

const MeetingViewModal: React.FC<MeetingViewModalProps> = ({ isOpen, onClose, onSuccess, meeting }) => {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Recurrence update dialog state
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null);

  // Recurrence delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  // For duration logic
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [clientDuration, setClientDuration] = useState<number | null>(null);
  const [servicePrice, setServicePrice] = useState<number | null>(null);
  const [clientPrice, setClientPrice] = useState<number | null>(null);

  // Track which field user is editing to prevent auto-updates
  const [isEditingPricePerHour, setIsEditingPricePerHour] = useState(false);
  const [isEditingPricePerMeeting, setIsEditingPricePerMeeting] = useState(false);

  // Track if we're loading initial data to prevent auto-updates
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);

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

  // Update prices when duration changes (only if not actively editing and not loading initial data)
  useEffect(() => {
    if (pricePerHour && startTime && endTime && !isEditingPricePerHour && !isEditingPricePerMeeting && !isLoadingInitialData) {
      const hourlyRate = parseFloat(pricePerHour);
      const meetingPrice = calculatePricePerMeeting(hourlyRate);
      setPricePerMeeting(meetingPrice);
    }
  }, [startTime, endTime, pricePerHour, calculatePricePerMeeting, isEditingPricePerHour, isEditingPricePerMeeting, isLoadingInitialData]);

  // Utility to convert ISO string to local datetime-local input value
  function toLocalInputValue(dateString: string) {
    const date = new Date(dateString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISO = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISO;
  }

  // Load meeting data when modal opens
  useEffect(() => {
    if (!isOpen || !meeting) return;
    setLoading(true);
    setIsEditing(false);
    setIsLoadingInitialData(true);

    // Load services and clients
    Promise.all([
      apiClient.getServices(),
      apiClient.getClients(meeting.service_id)
    ]).then(([servicesData, clientsData]) => {
      setServices(servicesData);
      setClients(clientsData);

      // Set form values from meeting
      setServiceId(meeting.service_id);
      setClientId(meeting.client_id);
      setTitle(meeting.title || '');
      setStartTime(toLocalInputValue(meeting.start_time));
      setEndTime(toLocalInputValue(meeting.end_time));
      setPricePerHour(meeting.price_per_hour.toString());
      setPricePerMeeting(meeting.price_total.toString());
      setStatus(meeting.status);
      setPaid(meeting.paid);

      // Get service/client defaults
      const service = servicesData.find(s => s.id === meeting.service_id);
      const client = clientsData.find(c => c.id === meeting.client_id);
      setServiceDuration(service?.default_duration_minutes || null);
      setServicePrice(service?.default_price_per_hour || null);
      setClientDuration(client?.custom_duration_minutes || null);
      setClientPrice(client?.custom_price_per_hour || null);

      setLoading(false);
      // Allow auto-updates after initial data is loaded
      setTimeout(() => setIsLoadingInitialData(false), 100);
    });
  }, [isOpen, meeting]);

  // Fetch clients when service changes (in edit mode)
  useEffect(() => {
    if (!isEditing || !serviceId) return;
    setLoading(true);
    apiClient.getClients(serviceId).then((clientsData) => {
      setClients(clientsData);
      // Get service duration/price
      const service = services.find(s => s.id === serviceId);
      setServiceDuration(service?.default_duration_minutes || null);
      setServicePrice(service?.default_price_per_hour || null);
      setLoading(false);
    });
  }, [serviceId, isEditing]);

  // Update client duration/price when client changes (in edit mode)
  useEffect(() => {
    if (!isEditing || !clientId) return;
    const client = clients.find(c => c.id === clientId);
    setClientDuration(client?.custom_duration_minutes || null);
    setClientPrice(client?.custom_price_per_hour || null);
  }, [clientId, clients, isEditing]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting || !serviceId || !clientId || !title || !startTime || !endTime || !pricePerHour) return;

    const updateData = {
      service_id: serviceId,
      client_id: clientId,
      title,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      price_per_hour: parseFloat(pricePerHour),
      status,
      paid,
    };

    // Check if this is a recurring meeting
    if (meeting.recurrence_id) {
      // Show recurrence update dialog
      setPendingUpdateData(updateData);
      setShowRecurrenceDialog(true);
    } else {
      // Regular meeting update
      await performUpdate(updateData);
    }
  };

  const performUpdate = async (updateData: any, updateScope?: string) => {
    setSubmitting(true);
    try {
      const finalUpdateData = updateScope ? { ...updateData, update_scope: updateScope } : updateData;
      await apiClient.updateMeeting(meeting!.id, finalUpdateData);
      toast({ title: 'Meeting updated', status: 'success', duration: 2000, isClosable: true });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to update meeting', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecurrenceUpdateConfirm = async (scope: 'this_meeting_only' | 'this_and_future' | 'all_meetings') => {
    if (pendingUpdateData) {
      await performUpdate(pendingUpdateData, scope);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;

    // Check if this is a recurring meeting
    if (meeting.recurrence_id) {
      // Show recurrence delete dialog
      setShowDeleteDialog(true);
    } else {
      // Regular meeting deletion
      await performDelete();
    }
  };

  const performDelete = async (deleteScope?: string) => {
    setDeleting(true);
    try {
      await apiClient.deleteMeeting(meeting!.id, deleteScope);
      toast({ title: 'Meeting deleted', status: 'success', duration: 2000, isClosable: true });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to delete meeting', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setDeleting(false);
    }
  };

  const handleRecurrenceDeleteConfirm = async (scope: 'this_meeting_only' | 'this_and_future' | 'all_meetings') => {
    await performDelete(scope);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'yellow';
      case 'done': return 'green';
      case 'canceled': return 'red';
      default: return 'gray';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!meeting) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isEditing ? 'Edit Meeting' : 'Meeting Details'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {loading ? (
              <Flex justify="center" align="center" minH="100px">
                <Spinner />
              </Flex>
            ) : isEditing ? (
              <form onSubmit={handleUpdate}>
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
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Status</FormLabel>
                    <Select value={status} onChange={e => setStatus(e.target.value as any)}>
                      <option value="upcoming">Upcoming</option>
                      <option value="done">Done</option>
                      <option value="canceled">Canceled</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <Checkbox isChecked={paid} onChange={e => setPaid(e.target.checked)}>Paid</Checkbox>
                  </FormControl>
                </Stack>
              </form>
            ) : (
              <Stack spacing={4}>
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Meeting Information</AlertTitle>
                    <AlertDescription>
                      Click "Edit" to modify this meeting or "Delete" to remove it.
                    </AlertDescription>
                  </Box>
                </Alert>

                <Stack spacing={3}>
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Title:</Text>
                    <Text>{meeting.title || 'No title'}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Service:</Text>
                    <Text>{services.find(s => s.id === meeting.service_id)?.name || 'Unknown'}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Client:</Text>
                    <Text>{clients.find(c => c.id === meeting.client_id)?.name || 'Unknown'}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Status:</Text>
                    <Badge colorScheme={getStatusColor(meeting.status)}>
                      {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                    </Badge>
                  </HStack>

                  {meeting.recurrence_id && (
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">Recurring:</Text>
                      <Badge colorScheme="blue">Yes</Badge>
                    </HStack>
                  )}

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Start Time:</Text>
                    <Text>{formatDateTime(meeting.start_time)}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">End Time:</Text>
                    <Text>{formatDateTime(meeting.end_time)}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Price per Hour:</Text>
                    <Text>${meeting.price_per_hour.toFixed(2)}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Price per Meeting:</Text>
                    <Text>${meeting.price_total.toFixed(2)}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Paid:</Text>
                    <Badge colorScheme={meeting.paid ? 'green' : 'red'}>
                      {meeting.paid ? 'Yes' : 'No'}
                    </Badge>
                  </HStack>
                </Stack>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            {isEditing ? (
              <>
                <Button onClick={() => setIsEditing(false)} mr={3} variant="ghost">
                  Cancel
                </Button>
                <Button colorScheme="purple" onClick={handleUpdate} isLoading={submitting} isDisabled={loading || submitting}>
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} mr={3} colorScheme="blue">
                  Edit
                </Button>
                <Button onClick={handleDelete} colorScheme="red" isLoading={deleting} isDisabled={deleting}>
                  Delete
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <RecurrenceUpdateDialog
        isOpen={showRecurrenceDialog}
        onClose={() => setShowRecurrenceDialog(false)}
        onConfirm={handleRecurrenceUpdateConfirm}
        meetingTitle={meeting?.title || 'Meeting'}
      />

      <RecurrenceDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleRecurrenceDeleteConfirm}
        meetingTitle={meeting?.title || 'Meeting'}
        isRecurring={!!meeting?.recurrence_id}
      />
    </>
  );
};

export default MeetingViewModal;
