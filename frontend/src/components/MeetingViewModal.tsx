import React, { useEffect, useState } from 'react';
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

  // Form state
  const [serviceId, setServiceId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'done' | 'canceled'>('upcoming');
  const [paid, setPaid] = useState(false);

  // For duration logic
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [clientDuration, setClientDuration] = useState<number | null>(null);
  const [servicePrice, setServicePrice] = useState<number | null>(null);
  const [clientPrice, setClientPrice] = useState<number | null>(null);

  // Load meeting data when modal opens
  useEffect(() => {
    if (!isOpen || !meeting) return;
    setLoading(true);
    setIsEditing(false);

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
      setStartTime(new Date(meeting.start_time).toISOString().slice(0, 16));
      setEndTime(new Date(meeting.end_time).toISOString().slice(0, 16));
      setPricePerHour(meeting.price_per_hour.toString());
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
    setSubmitting(true);
    try {
      await apiClient.updateMeeting(meeting.id, {
        service_id: serviceId,
        client_id: clientId,
        title,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        price_per_hour: parseFloat(pricePerHour),
        status,
        paid,
      });
      toast({ title: 'Meeting updated', status: 'success', duration: 2000, isClosable: true });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to update meeting', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;
    setDeleting(true);
    try {
      await apiClient.deleteMeeting(meeting.id);
      toast({ title: 'Meeting deleted', status: 'success', duration: 2000, isClosable: true });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: 'Failed to delete meeting', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setDeleting(false);
    }
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
                  <Input type="number" value={pricePerHour} onChange={e => setPricePerHour(e.target.value)} min={0} step={0.01} />
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
                  <Text fontWeight="semibold">Total Price:</Text>
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
  );
};

export default MeetingViewModal;
