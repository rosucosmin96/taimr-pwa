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
  useToast,
  Spinner,
  Stack,
  Flex,
  Text,
  VStack,
  HStack,
  Box,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { apiClient, Service, Client } from '../lib/api';

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MembershipModal: React.FC<MembershipModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [serviceId, setServiceId] = useState('');
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [totalMeetings, setTotalMeetings] = useState(1);
  const [pricePerMembership, setPricePerMembership] = useState('');
  const [availabilityDays, setAvailabilityDays] = useState(30);

  // Calculate price per meeting
  const pricePerMeeting = useCallback(() => {
    if (!pricePerMembership || !totalMeetings) return 0;
    return parseFloat(pricePerMembership) / totalMeetings;
  }, [pricePerMembership, totalMeetings]);

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
      return;
    }
    setLoading(true);
    apiClient.getClients(serviceId).then((clientsData) => {
      setClients(clientsData);
      setClientId('');
      setLoading(false);
    });
  }, [serviceId]);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setServiceId('');
    setClientId('');
    setTotalMeetings(1);
    setPricePerMembership('');
    setAvailabilityDays(30);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceId || !clientId || !name || !pricePerMembership) {
      toast({
        title: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.createMembership({
        service_id: serviceId,
        client_id: clientId,
        name,
        total_meetings: totalMeetings,
        price_per_membership: parseFloat(pricePerMembership),
        availability_days: availabilityDays,
      });

      toast({
        title: 'Membership created successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onSuccess();
    } catch (err) {
      toast({
        title: 'Failed to create membership',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Membership creation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Create New Membership</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {loading ? (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            ) : (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Membership Name</FormLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Monthly Package"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Service</FormLabel>
                  <Select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    placeholder="Select a service"
                  >
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Client</FormLabel>
                  <Select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Select a client"
                    isDisabled={!serviceId}
                  >
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <HStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Total Meetings</FormLabel>
                    <NumberInput
                      value={totalMeetings}
                      onChange={(_, value) => setTotalMeetings(value)}
                      min={1}
                      max={100}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Price per Membership ($)</FormLabel>
                    <Input
                      type="number"
                      value={pricePerMembership}
                      onChange={(e) => setPricePerMembership(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </FormControl>
                </HStack>

                <FormControl isRequired>
                  <FormLabel>Availability (days)</FormLabel>
                  <NumberInput
                    value={availabilityDays}
                    onChange={(_, value) => setAvailabilityDays(value)}
                    min={1}
                    max={365}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                {pricePerMembership && totalMeetings > 0 && (
                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Price per Meeting
                    </Text>
                    <Text fontSize="lg" fontWeight="semibold">
                      ${pricePerMeeting().toFixed(2)}
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
              type="submit"
              colorScheme="purple"
              isLoading={submitting}
              loadingText="Creating..."
            >
              Create Membership
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default MembershipModal;
