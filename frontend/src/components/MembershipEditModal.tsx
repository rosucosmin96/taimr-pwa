import React, { useState, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Checkbox,
  useToast,
  Stack,
  Text,
} from '@chakra-ui/react';
import { apiClient, Membership } from '../lib/api';

interface MembershipEditModalProps {
  membership: Membership;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Membership) => void;
}

const MembershipEditModal: React.FC<MembershipEditModalProps> = ({ membership, isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState(membership.name);
  const [paid, setPaid] = useState(membership.paid);
  const [status, setStatus] = useState(membership.status);
  const [totalMeetings, setTotalMeetings] = useState(membership.total_meetings);
  const [availability, setAvailability] = useState(membership.availability_days);
  const [totalPrice, setTotalPrice] = useState(Number(membership.price_per_membership));
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const pricePerMeeting = useMemo(() => {
    if (totalMeetings > 0) {
      return (totalPrice / totalMeetings).toFixed(2);
    }
    return '0.00';
  }, [totalPrice, totalMeetings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await apiClient.updateMembership(membership.id, {
        name,
        paid,
        status,
        total_meetings: totalMeetings,
        availability_days: availability,
        price_per_membership: totalPrice,
      });
      toast({ title: 'Membership updated', status: 'success' });
      onSuccess(updated);
    } catch (err) {
      toast({ title: 'Failed to update membership', status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Membership</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={status} onChange={e => setStatus(e.target.value as Membership['status'])}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="canceled">Canceled</option>
                </Select>
              </FormControl>
              <FormControl>
                <Checkbox isChecked={paid} onChange={e => setPaid(e.target.checked)}>
                  Paid
                </Checkbox>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Total Meetings</FormLabel>
                <NumberInput min={1} value={totalMeetings} onChange={(_, n) => setTotalMeetings(Number(n))}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Availability (days)</FormLabel>
                <NumberInput min={1} value={availability} onChange={(_, n) => setAvailability(Number(n))}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Total Price ($)</FormLabel>
                <NumberInput min={0} precision={2} value={totalPrice} onChange={(_, n) => setTotalPrice(Number(n))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Price per Meeting</FormLabel>
                <Input value={`$${pricePerMeeting}`} isReadOnly bg="gray.50" />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} mr={2} variant="ghost">Cancel</Button>
            <Button type="submit" colorScheme="purple" isLoading={submitting}>Save</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default MembershipEditModal;
