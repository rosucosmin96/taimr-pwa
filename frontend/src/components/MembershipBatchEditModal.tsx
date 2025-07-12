import React, { useState } from 'react';
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
  Select,
  Checkbox,
  useToast,
  Stack,
  Text,
} from '@chakra-ui/react';
import { apiClient, Membership } from '../lib/api';

interface MembershipBatchEditModalProps {
  membershipIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MembershipBatchEditModal: React.FC<MembershipBatchEditModalProps> = ({ membershipIds, isOpen, onClose, onSuccess }) => {
  const [paid, setPaid] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Promise.all(
        membershipIds.map(id =>
          apiClient.updateMembership(id, {
            ...(paid !== null ? { paid } : {}),
            ...(status ? { status: status as Membership['status'] } : {}),
          })
        )
      );
      toast({ title: 'Memberships updated', status: 'success' });
      onSuccess();
    } catch (err) {
      toast({ title: 'Failed to update memberships', status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Batch Edit Memberships</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Text mb={4}>Edit the following fields for <b>{membershipIds.length}</b> selected memberships:</Text>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select placeholder="No change" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="canceled">Canceled</option>
                </Select>
              </FormControl>
              <FormControl>
                <Checkbox isChecked={paid === true} isIndeterminate={paid === null} onChange={e => setPaid(e.target.checked ? true : (paid === false ? null : false))}>
                  Paid
                </Checkbox>
                <Button size="xs" variant="link" ml={2} onClick={() => setPaid(null)}>No change</Button>
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

export default MembershipBatchEditModal;
