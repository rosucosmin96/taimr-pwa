import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Text,
  Box,
  VStack,
  HStack,
  Spinner,
  Divider,
  Badge,
  List,
  ListItem,
} from '@chakra-ui/react';
import { apiClient, ClientStatsResponse } from '../lib/api';
import { useCurrency } from '../lib/currency';

interface ClientStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
}

const ClientStatisticsModal: React.FC<ClientStatisticsModalProps> = ({
  isOpen,
  onClose,
  clientId,
  startDate,
  endDate,
  serviceId,
}) => {
  const { format } = useCurrency();
  const [data, setData] = useState<ClientStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      setLoading(true);
      setError(null);
      // Convert empty string to undefined for startDate/endDate
      const start = startDate && startDate !== '' ? startDate : undefined;
      const end = endDate && endDate !== '' ? endDate : undefined;
      apiClient
        .getSingleClientStats(clientId, start, end, serviceId)
        .then(setData)
        .catch((err) => setError('Failed to load client stats'))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, clientId, startDate, endDate, serviceId]);

  // Helper to format dates
  const formatDate = (dateStr?: string | null) =>
    dateStr ? new Date(dateStr).toLocaleString() : '-';

  // Compute meeting stats
  const totalMeetings = data?.client_stats.total_meetings || 0;
  const doneMeetings = data?.client_stats.done_meetings || 0;
  const canceledMeetings = data?.client_stats.canceled_meetings || 0;
  const meetingDates = data?.meetings.map((m) => formatDate(m.start_time)) || [];
  const totalPrice = data?.client_stats.total_revenue || 0;
  // Paid info: sum of price_total for meetings where paid=true
  const paid = data?.meetings.filter((m) => m.paid).reduce((sum, m) => sum + (m.price_total || 0), 0) || 0;

  // Membership info: fetch active membership for client (optional, can be extended)
  // For now, just show a placeholder if needed

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Client Statistics</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading ? (
            <HStack justify="center" py={8}>
              <Spinner />
            </HStack>
          ) : error ? (
            <Text color="red.500">{error}</Text>
          ) : data ? (
            <VStack align="stretch" spacing={4}>
              {/* Client Info */}
              <Box>
                <Text fontWeight="bold">Client:</Text>
                <Text>{data.client_stats.client_name}</Text>
              </Box>
              <Divider />
              {/* Membership Info (placeholder) */}
              <Box>
                <Text fontWeight="bold">Membership:</Text>
                <Text>No membership info (extend as needed)</Text>
              </Box>
              <Divider />
              {/* Meeting Stats */}
              <Box>
                <Text fontWeight="bold">Meetings:</Text>
                <Text>Total meetings: {totalMeetings}</Text>
                <Text>Done: {doneMeetings}</Text>
                <Text>Canceled: {canceledMeetings}</Text>
                <Text>Meeting dates:</Text>
                <List spacing={1} pl={4}>
                  {meetingDates.length > 0 ? meetingDates.map((d, i) => (
                    <ListItem key={i}>{d}</ListItem>
                  )) : <ListItem>-</ListItem>}
                </List>
              </Box>
              <Divider />
              {/* Price Info */}
              <Box>
                <Text fontWeight="bold">Price Info:</Text>
                <Text>Total price: {format(totalPrice)}</Text>
                <Text>Paid: {format(paid)}</Text>
              </Box>
            </VStack>
          ) : (
            <Text>No data</Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ClientStatisticsModal;
