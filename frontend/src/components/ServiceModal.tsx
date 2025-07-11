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
} from '@chakra-ui/react';
import { apiClient } from '../lib/api';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState('');
  const [defaultPricePerHour, setDefaultPricePerHour] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDefaultDurationMinutes('');
    setDefaultPricePerHour('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !defaultDurationMinutes || !defaultPricePerHour) {
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
      await apiClient.createService({
        name,
        default_duration_minutes: parseInt(defaultDurationMinutes),
        default_price_per_hour: parseFloat(defaultPricePerHour),
      });

      toast({
        title: 'Service created successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating service:', err);
      toast({
        title: 'Failed to create service',
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
        <ModalHeader>Add New Service</ModalHeader>
        <ModalCloseButton />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Service Name</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter service name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Default Duration (minutes)</FormLabel>
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
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Default Price per Hour ($)</FormLabel>
                <Input
                  type="number"
                  value={defaultPricePerHour}
                  onChange={(e) => setDefaultPricePerHour(e.target.value)}
                  placeholder="e.g., 50.00"
                  min="0"
                  step="0.01"
                />
              </FormControl>

              {defaultDurationMinutes && defaultPricePerHour && (
                <Box p={3} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Service Summary:</Text>
                  <Text fontSize="sm" color="gray.600">
                    {name || 'Service Name'}: {formatDuration(parseInt(defaultDurationMinutes) || 0)} • ${parseFloat(defaultPricePerHour) || 0}/h
                  </Text>
                </Box>
              )}
            </Stack>
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
              Create Service
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default ServiceModal;
