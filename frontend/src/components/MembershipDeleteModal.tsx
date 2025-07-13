import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  useToast,
} from '@chakra-ui/react';
import { apiClient, Membership } from '../lib/api';

interface MembershipDeleteModalProps {
  membership: Membership;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MembershipDeleteModal: React.FC<MembershipDeleteModalProps> = ({ membership, isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await apiClient.deleteMembership(membership.id);
      toast({ title: 'Membership deleted', status: 'success' });
      onSuccess();
    } catch (err) {
      toast({ title: 'Failed to delete membership', status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete Membership</ModalHeader>
        <ModalBody>
          <Text>Are you sure you want to delete the membership <b>{membership.name}</b>? This action cannot be undone.</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={2} variant="ghost">Cancel</Button>
          <Button colorScheme="red" onClick={handleDelete} isLoading={submitting}>Delete</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MembershipDeleteModal;
