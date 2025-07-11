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
} from '@chakra-ui/react';
import { apiClient, Service } from '../lib/api';

interface ServiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: Service | null;
}

const ServiceViewModal: React.FC<ServiceViewModalProps> = ({ isOpen, onClose, onSuccess, service }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState('');
  const [defaultPricePerHour, setDefaultPricePerHour] = useState('');

  // Load service data when modal opens
  useEffect(() => {
    if (!isOpen || !service) return;
    setLoading(true);
    setIsEditing(false);

    // Set form values from service
    setName(service.name);
    setDefaultDurationMinutes(service.default_duration_minutes.toString());
    setDefaultPricePerHour(service.default_price_per_hour.toString());

    setLoading(false);
  }, [isOpen, service]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !name || !defaultDurationMinutes || !defaultPricePerHour) {
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
      await apiClient.updateService(service.id, {
        name,
        default_duration_minutes: parseInt(defaultDurationMinutes),
        default_price_per_hour: parseFloat(defaultPricePerHour),
      });

      toast({
        title: 'Service updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onSuccess();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating service:', err);
      toast({
        title: 'Failed to update service',
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
    if (!service) return;
    setDeleting(true);
    try {
      await apiClient.deleteService(service.id);
      toast({
        title: 'Service deleted successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting service:', err);
      toast({
        title: 'Failed to delete service',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (!service) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isEditing ? 'Edit Service' : 'Service Details'}
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
                  <Box p={3} bg="purple.100" borderRadius="full">
                    <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                      {service.name.charAt(0).toUpperCase()}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="bold">{service.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {formatDuration(service.default_duration_minutes)} • ${service.default_price_per_hour}/h
                    </Text>
                  </Box>
                </HStack>
              )}

              <form onSubmit={handleUpdate}>
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Service Name</FormLabel>
                    {isEditing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter service name"
                      />
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>{service.name}</Text>
                      </Box>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Default Duration (minutes)</FormLabel>
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          value={defaultDurationMinutes}
                          onChange={(e) => setDefaultDurationMinutes(e.target.value)}
                          placeholder="e.g., 60 for 1 hour"
                          min="15"
                          step="15"
                        />
                        {defaultDurationMinutes && (
                          <Text fontSize="sm" color="gray.600" mt={1}>
                            Duration: {formatDuration(parseInt(defaultDurationMinutes) || 0)}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>{formatDuration(service.default_duration_minutes)}</Text>
                      </Box>
                    )}
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Default Price per Hour ($)</FormLabel>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={defaultPricePerHour}
                        onChange={(e) => setDefaultPricePerHour(e.target.value)}
                        placeholder="e.g., 50.00"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text>${service.default_price_per_hour.toFixed(2)}</Text>
                      </Box>
                    )}
                  </FormControl>

                  {!isEditing && (
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Service Information</AlertTitle>
                        <AlertDescription>
                          Click "Edit" to modify this service or "Delete" to remove it.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {isEditing && defaultDurationMinutes && defaultPricePerHour && (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="medium" mb={2}>Service Summary:</Text>
                      <Text fontSize="sm" color="gray.600">
                        {name || 'Service Name'}: {formatDuration(parseInt(defaultDurationMinutes) || 0)} • ${parseFloat(defaultPricePerHour) || 0}/h
                      </Text>
                    </Box>
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

export default ServiceViewModal;
