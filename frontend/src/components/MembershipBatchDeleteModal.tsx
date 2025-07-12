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
import { apiClient } from '../lib/api';

interface MembershipBatchDeleteModalProps {
  membershipIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MembershipBatchDeleteModal: React.FC<MembershipBatchDeleteModalProps> = ({ membershipIds, isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await Promise.all(membershipIds.map(id => apiClient.deleteMembership(id)));
      toast({ title: 'Memberships deleted', status: 'success' });
      onSuccess();
    } catch (err) {
      toast({ title: 'Failed to delete memberships', status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Batch Delete Memberships</ModalHeader>
        <ModalBody>
          <Text>Are you sure you want to delete <b>{membershipIds.length}</b> selected memberships? This action cannot be undone.</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={2} variant="ghost">Cancel</Button>
          <Button colorScheme="red" onClick={handleDelete} isLoading={submitting}>Delete</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MembershipBatchDeleteModal;
