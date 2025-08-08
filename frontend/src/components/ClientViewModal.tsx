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
  Text,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Badge,
  Avatar,
} from '@chakra-ui/react';
import { apiClient, Service, Client } from '../lib/api';
import { useCurrency } from '../lib/currency';

interface ClientViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: Client | null;
}

const ClientViewModal: React.FC<ClientViewModalProps> = ({ isOpen, onClose, onSuccess, client }) => {
  const toast = useToast();
  const { format } = useCurrency();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customDurationMinutes, setCustomDurationMinutes] = useState('');
  const [customPricePerHour, setCustomPricePerHour] = useState('');
  const [hasCustomDuration, setHasCustomDuration] = useState(false);
  const [hasCustomPrice, setHasCustomPrice] = useState(false);

  // Service defaults
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [servicePrice, setServicePrice] = useState<number | null>(null);

  // Load client data when modal opens
  useEffect(() => {
    if (!isOpen || !client) return;
    setLoading(true);
    setIsEditing(false);

    // Load services
    apiClient.getServices().then((servicesData) => {
      setServices(servicesData);

      // Set form values from client
      setServiceId(client.service_id);
      setName(client.name);
      setEmail(client.email);
      setPhone(client.phone);
      setCustomDurationMinutes(client.custom_duration_minutes?.toString() || '');
      setCustomPricePerHour(client.custom_price_per_hour?.toString() || '');
      setHasCustomDuration(!!client.custom_duration_minutes);
      setHasCustomPrice(!!client.custom_price_per_hour);

      // Get service defaults
      const service = servicesData.find(s => s.id === client.service_id);
      setServiceDuration(service?.default_duration_minutes || null);
      setServicePrice(service?.default_price_per_hour || null);

      setLoading(false);
    });
  }, [isOpen, client]);

  // Update service defaults when service changes (in edit mode)
  useEffect(() => {
    if (!isEditing || !serviceId) return;
    const service = services.find(s => s.id === serviceId);
    setServiceDuration(service?.default_duration_minutes || null);
    setServicePrice(service?.default_price_per_hour || null);
  }, [serviceId, services, isEditing]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !serviceId || !name || !email || !phone) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      const updateData: any = {
        service_id: serviceId,
        name,
        email,
        phone,
      };

      if (hasCustomDuration && customDurationMinutes) {
        updateData.custom_duration_minutes = parseInt(customDurationMinutes);
      } else if (!hasCustomDuration) {
        updateData.custom_duration_minutes = null;
      }

      if (hasCustomPrice && customPricePerHour) {
        updateData.custom_price_per_hour = parseFloat(customPricePerHour);
      } else if (!hasCustomPrice) {
        updateData.custom_price_per_hour = null;
      }

      await apiClient.updateClient(client.id, updateData);

      toast({
        title: 'Client updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onSuccess();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating client:', err);
      toast({
        title: 'Failed to update client',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      await apiClient.deleteClient(client.id);
      toast({
        title: 'Client deleted successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting client:', err);
      toast({
        title: 'Failed to delete client',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (!client) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isEditing ? 'Edit Client' : 'Client Details'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {loading ? (
            <Flex justify="center" align="center" minH="200px">
              <Spinner size="lg" color="purple.500" />
            </Flex>
          ) : (
            <Stack spacing={4}>
              {!isEditing && (
                <HStack spacing={4} mb={4}>
                  <Avatar name={client.name} size="lg" bg="purple.500" />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold">{client.name}</Text>
                    <Text fontSize="sm" color="gray.600">{client.email}</Text>
                    <Text fontSize="sm" color="gray.600">{client.phone}</Text>
                  </Box>
                </HStack>
              )}

              <form onSubmit={handleUpdate}>
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Service</FormLabel>
                    {isEditing ? (
                      <Select
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        placeholder="Select a service"
                      >
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} ({formatDuration(service.default_duration_minutes)} • {format(service.default_price_per_hour)}/h)
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>{getServiceName(client.service_id)}</Text>
                      </Box>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    {isEditing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter client name"
                      />
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>{client.name}</Text>
                      </Box>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter client email"
                      />
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>{client.email}</Text>
                      </Box>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Phone</FormLabel>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter client phone number"
                      />
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>{client.phone}</Text>
                      </Box>
                    )}
                  </FormControl>

                  <FormControl>
                    <FormLabel>Custom Settings</FormLabel>
                    {isEditing ? (
                      <Stack spacing={3}>
                        <Checkbox
                          isChecked={hasCustomDuration}
                          onChange={(e) => setHasCustomDuration(e.target.checked)}
                        >
                          Custom Duration
                        </Checkbox>
                        {hasCustomDuration && (
                          <Input
                            type="number"
                            value={customDurationMinutes}
                            onChange={(e) => setCustomDurationMinutes(e.target.value)}
                            placeholder={`Default: ${serviceDuration || 60} minutes`}
                            min="15"
                            step="15"
                          />
                        )}

                        <Checkbox
                          isChecked={hasCustomPrice}
                          onChange={(e) => setHasCustomPrice(e.target.checked)}
                        >
                          Custom Price per Hour
                        </Checkbox>
                        {hasCustomPrice && (
                          <Input
                            type="number"
                            value={customPricePerHour}
                            onChange={(e) => setCustomPricePerHour(e.target.value)}
                            placeholder={`Default: ${format(servicePrice || 50)}/h`}
                            min="0"
                            step="0.01"
                          />
                        )}
                      </Stack>
                    ) : (
                      <Stack spacing={2}>
                        {client.custom_duration_minutes && (
                          <HStack>
                            <Badge colorScheme="blue">Custom Duration</Badge>
                            <Text fontSize="sm">{formatDuration(client.custom_duration_minutes)}</Text>
                          </HStack>
                        )}
                        {client.custom_price_per_hour && (
                          <HStack>
                            <Badge colorScheme="green">Custom Price</Badge>
                            <Text fontSize="sm">{format(client.custom_price_per_hour)}/h</Text>
                          </HStack>
                        )}
                        {!client.custom_duration_minutes && !client.custom_price_per_hour && (
                          <Text fontSize="sm" color="gray.500">Using service defaults</Text>
                        )}
                      </Stack>
                    )}
                  </FormControl>

                  {serviceId && isEditing && (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="medium" mb={2}>Service Defaults:</Text>
                      <Text fontSize="sm" color="gray.600">
                        Duration: {formatDuration(serviceDuration || 60)} • Price: {format(servicePrice || 50)}/h
                      </Text>
                    </Box>
                  )}

                  {!isEditing && (
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Service Defaults</AlertTitle>
                        <AlertDescription>
                          Duration: {formatDuration(serviceDuration || 60)} • Price: {format(servicePrice || 50)}/h
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </Stack>
              </form>
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

export default ClientViewModal;
