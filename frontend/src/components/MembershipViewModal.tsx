import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Flex,
  Box,
  Text,
  Heading,
  Badge,
  Spinner,
  VStack,
  HStack,
  Divider,
} from '@chakra-ui/react';
import { apiClient, Membership, Meeting, Service, Client } from '../lib/api';
import { useCurrency } from '../lib/currency';
import MembershipEditModal from './MembershipEditModal';
import MembershipDeleteModal from './MembershipDeleteModal';

interface MembershipViewModalProps {
  membership: Membership;
  onClose: () => void;
}

const MembershipViewModal: React.FC<MembershipViewModalProps> = ({ membership, onClose }) => {
  const { format } = useCurrency();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentMembership, setCurrentMembership] = useState(membership);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getMembershipMeetings(currentMembership.id),
      apiClient.getServices(),
      apiClient.getClients(),
    ])
      .then(([meetingsData, servicesData, clientsData]) => {
        setMeetings(meetingsData);
        setService(servicesData.find((s: Service) => s.id === currentMembership.service_id) || null);
        setClient(clientsData.find((c: Client) => c.id === currentMembership.client_id) || null);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load membership details');
        setLoading(false);
      });
  }, [currentMembership.id, currentMembership.service_id, currentMembership.client_id]);

  return (
    <Modal isOpen onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Membership Details</ModalHeader>
        <ModalBody>
          {loading ? (
            <Spinner />
          ) : error ? (
            <Text color="red.500">{error}</Text>
          ) : (
            <VStack align="stretch" spacing={4}>
              <Box>
                <Heading size="md">{currentMembership.name}</Heading>
                <HStack mt={2}>
                  <Badge colorScheme={currentMembership.status === 'active' ? 'green' : currentMembership.status === 'expired' ? 'red' : 'gray'}>
                    {currentMembership.status.toUpperCase()}
                  </Badge>
                  <Badge colorScheme={currentMembership.paid ? 'green' : 'orange'}>
                    {currentMembership.paid ? 'PAID' : 'UNPAID'}
                  </Badge>
                </HStack>
                <Text color="gray.600" mt={2}>
                  {client?.name || ''} • {service?.name || ''}
                </Text>
              </Box>
              <Divider />
              <Flex gap={8} wrap="wrap">
                <Text fontSize="sm">Total Meetings<br /><b>{meetings.filter((m) => m.status === 'done').length} / {currentMembership.total_meetings}</b></Text>
                <Text fontSize="sm">Price per Meeting<br /><b>{format(currentMembership.price_per_meeting)}</b></Text>
                <Text fontSize="sm">Total Price<br /><b>{format(currentMembership.price_per_membership)}</b></Text>
                <Text fontSize="sm">Availability<br /><b>{currentMembership.availability_days} days</b></Text>
                <Text fontSize="sm">Start Date<br /><b>{currentMembership.start_date ? new Date(currentMembership.start_date).toLocaleDateString() : '-'}</b></Text>
              </Flex>
              <Divider />
              <Box>
                <Heading size="sm" mb={2}>Meetings in this Membership</Heading>
                {meetings.length === 0 ? (
                  <Text color="gray.500">No meetings found for this membership.</Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {meetings.map((meeting) => (
                      <Flex key={meeting.id} justify="space-between" align="center" p={2} borderRadius="md" borderWidth={1} borderColor="gray.100">
                        <Box>
                          <Text fontWeight="semibold">{meeting.title || 'Untitled Meeting'}</Text>
                          <Text fontSize="sm" color="gray.600">{new Date(meeting.start_time).toLocaleString()}</Text>
                        </Box>
                        <HStack>
                          <Badge colorScheme={meeting.status === 'done' ? 'green' : meeting.status === 'upcoming' ? 'blue' : 'gray'}>
                            {meeting.status.toUpperCase()}
                          </Badge>
                          <Badge colorScheme={meeting.paid ? 'green' : 'orange'}>
                            {meeting.paid ? 'PAID' : 'UNPAID'}
                          </Badge>
                        </HStack>
                      </Flex>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setEditOpen(true)} mr={2} colorScheme="purple" variant="outline">Edit</Button>
          <Button onClick={() => setDeleteOpen(true)} mr={2} colorScheme="red" variant="outline">Delete</Button>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
      {/* Edit Modal */}
      <MembershipEditModal
        membership={currentMembership}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={(updated) => {
          setCurrentMembership(updated);
          setEditOpen(false);
        }}
      />
      {/* Delete Modal */}
      <MembershipDeleteModal
        membership={currentMembership}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={() => {
          setDeleteOpen(false);
          onClose();
        }}
      />
    </Modal>
  );
};

export default MembershipViewModal;
