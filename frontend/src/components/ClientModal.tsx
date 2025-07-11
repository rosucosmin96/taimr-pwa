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
} from '@chakra-ui/react';
import { apiClient, Service } from '../lib/api';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch services on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiClient.getServices().then((servicesData) => {
      setServices(servicesData);
      setLoading(false);
    });
  }, [isOpen]);

  // Update service defaults when service changes
  useEffect(() => {
    if (!serviceId) {
      setServiceDuration(null);
      setServicePrice(null);
      return;
    }
    const service = services.find(s => s.id === serviceId);
    setServiceDuration(service?.default_duration_minutes || null);
    setServicePrice(service?.default_price_per_hour || null);
  }, [serviceId, services]);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setServiceId('');
    setName('');
    setEmail('');
    setPhone('');
    setCustomDurationMinutes('');
    setCustomPricePerHour('');
    setHasCustomDuration(false);
    setHasCustomPrice(false);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !name || !email || !phone) {
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
      const clientData: any = {
        service_id: serviceId,
        name,
        email,
        phone,
      };

      if (hasCustomDuration && customDurationMinutes) {
        clientData.custom_duration_minutes = parseInt(customDurationMinutes);
      }

      if (hasCustomPrice && customPricePerHour) {
        clientData.custom_price_per_hour = parseFloat(customPricePerHour);
      }

      await apiClient.createClient(clientData);

      toast({
        title: 'Client created successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating client:', err);
      toast({
        title: 'Failed to create client',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add New Client</ModalHeader>
        <ModalCloseButton />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            {loading ? (
              <Flex justify="center" align="center" minH="200px">
                <Spinner size="lg" color="purple.500" />
              </Flex>
            ) : (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Service</FormLabel>
                  <Select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    placeholder="Select a service"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({formatDuration(service.default_duration_minutes)} • ${service.default_price_per_hour}/h)
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter client name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter client email"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter client phone number"
                  />
                </FormControl>

                <FormControl>
                  <Checkbox
                    isChecked={hasCustomDuration}
                    onChange={(e) => setHasCustomDuration(e.target.checked)}
                  >
                    Custom Duration
                  </Checkbox>
                  {hasCustomDuration && (
                    <Input
                      mt={2}
                      type="number"
                      value={customDurationMinutes}
                      onChange={(e) => setCustomDurationMinutes(e.target.value)}
                      placeholder={`Default: ${serviceDuration || 60} minutes`}
                      min="15"
                      step="15"
                    />
                  )}
                </FormControl>

                <FormControl>
                  <Checkbox
                    isChecked={hasCustomPrice}
                    onChange={(e) => setHasCustomPrice(e.target.checked)}
                  >
                    Custom Price per Hour
                  </Checkbox>
                  {hasCustomPrice && (
                    <Input
                      mt={2}
                      type="number"
                      value={customPricePerHour}
                      onChange={(e) => setCustomPricePerHour(e.target.value)}
                      placeholder={`Default: $${servicePrice || 50}/h`}
                      min="0"
                      step="0.01"
                    />
                  )}
                </FormControl>

                {serviceId && (
                  <Box p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" fontWeight="medium" mb={2}>Service Defaults:</Text>
                    <Text fontSize="sm" color="gray.600">
                      Duration: {formatDuration(serviceDuration || 60)} • Price: ${servicePrice || 50}/h
                    </Text>
                  </Box>
                )}
              </Stack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              type="submit"
              isLoading={submitting}
              loadingText="Creating..."
            >
              Create Client
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ClientModal;
