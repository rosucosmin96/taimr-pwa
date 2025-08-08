import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon, ClockIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Button,
  Badge,
  Avatar,
  Spinner,
  Alert,
  AlertIcon,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  HStack,
  Select,
  Checkbox,
  Divider,
  useDisclosure,
  useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel
} from '@chakra-ui/react';
import { apiClient, Meeting, Client, Service, Membership } from '../lib/api';
import MeetingModal from '../components/MeetingModal';
import MeetingViewModal from '../components/MeetingViewModal';
import { useCurrency } from '../lib/currency';

// Filter types
interface Filters {
  search: string;
  status: 'all' | 'upcoming' | 'done' | 'canceled';
  dateRange: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
  paymentStatus: 'all' | 'paid' | 'unpaid';
  serviceId: string;
}

const Meetings: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { format } = useCurrency();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    dateRange: 'all',
    paymentStatus: 'all',
    serviceId: ''
  });

  const { isOpen: isFilterOpen, onToggle: onFilterToggle, onClose: onFilterClose } = useDisclosure();
  const toast = useToast();

  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchEditStatus, setBatchEditStatus] = useState<'upcoming' | 'done' | 'canceled'>('upcoming');
  const [batchEditPaid, setBatchEditPaid] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const openBatchEdit = () => {
    setBatchEditStatus('upcoming');
    setBatchEditPaid(false);
    setIsBatchEditOpen(true);
  };
  const closeBatchEdit = () => setIsBatchEditOpen(false);
  const openBatchDelete = () => setIsBatchDeleteOpen(true);
  const closeBatchDelete = () => setIsBatchDeleteOpen(false);

  const handleBatchEdit = async () => {
    setBatchLoading(true);
    try {
      await Promise.all(selectedMeetingIds.map(id =>
        apiClient.updateMeeting(id, { status: batchEditStatus, paid: batchEditPaid })
      ));
      toast({ title: 'Meetings updated', status: 'success', duration: 2000, isClosable: true });
      setSelectedMeetingIds([]);
      setIsBatchEditOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: 'Batch update failed', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchLoading(true);
    try {
      await Promise.all(selectedMeetingIds.map(id => apiClient.deleteMeeting(id)));
      toast({ title: 'Meetings deleted', status: 'success', duration: 2000, isClosable: true });
      setSelectedMeetingIds([]);
      setIsBatchDeleteOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: 'Batch delete failed', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setBatchLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [meetingsData, clientsData, servicesData, membershipsData] = await Promise.all([
        apiClient.getMeetings(),
        apiClient.getClients(),
        apiClient.getServices(),
        apiClient.getMemberships()
      ]);
      setMeetings(meetingsData);
      setClients(clientsData);
      setServices(servicesData);
      setMemberships(membershipsData);
    } catch (err) {
      setError('Failed to load meetings');
      console.error('Meetings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions for filtering
  const getClientName = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  }, [clients]);

  const getClientEmail = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.email || '';
  }, [clients]);

  const getServiceName = useCallback((serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  }, [services]);

  const getMembershipName = useCallback((membershipId: string) => {
    const membership = memberships.find(m => m.id === membershipId);
    return membership?.name || '';
  }, [memberships]);

  // Filter meetings based on current filters
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const clientName = getClientName(meeting.client_id).toLowerCase();
        const serviceName = getServiceName(meeting.service_id).toLowerCase();
        const title = (meeting.title || '').toLowerCase();
        const clientEmail = getClientEmail(meeting.client_id).toLowerCase();

        const searchMatch = clientName.includes(searchLower) ||
                           serviceName.includes(searchLower) ||
                           title.includes(searchLower) ||
                           clientEmail.includes(searchLower);

        if (!searchMatch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && meeting.status !== filters.status) {
        return false;
      }

      // Payment status filter
      if (filters.paymentStatus !== 'all') {
        const isPaid = meeting.paid;
        if (filters.paymentStatus === 'paid' && !isPaid) return false;
        if (filters.paymentStatus === 'unpaid' && isPaid) return false;
      }

      // Service filter
      if (filters.serviceId && meeting.service_id !== filters.serviceId) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const meetingDate = new Date(meeting.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filters.dateRange) {
          case 'today':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (meetingDate < today || meetingDate >= tomorrow) return false;
            break;
          case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (meetingDate < weekStart || meetingDate >= weekEnd) return false;
            break;
          case 'thisMonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            if (meetingDate < monthStart || meetingDate >= monthEnd) return false;
            break;
        }
      }

      return true;
    });
  }, [meetings, filters, getClientName, getClientEmail, getServiceName]);

  const isAllSelected = filteredMeetings.length > 0 && filteredMeetings.every(m => selectedMeetingIds.includes(m.id));
  const isIndeterminate = selectedMeetingIds.length > 0 && !isAllSelected;

  const handleSelectMeeting = (id: string) => {
    setSelectedMeetingIds(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMeetingIds([]);
    } else {
      setSelectedMeetingIds(filteredMeetings.map(m => m.id));
    }
  };

  const handleAddMeeting = () => {
    setIsAddModalOpen(true);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsViewModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchData(); // Refresh data after successful operation
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleViewModalClose = () => {
    setIsViewModalOpen(false);
    setSelectedMeeting(null);
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dateRange: 'all',
      paymentStatus: 'all',
      serviceId: ''
    });
  };



  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' - ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const statusStyles: Record<string, { bg: string; color: string; icon: React.ReactElement }> = {
    'upcoming': { bg: 'blue.100', color: 'blue.700', icon: <ClockIcon style={{ width: 16, height: 16, marginRight: 4, color: '#3182CE' }} /> },
    'done': { bg: 'green.100', color: 'green.700', icon: <CheckCircleIcon style={{ width: 16, height: 16, marginRight: 4, color: '#38A169' }} /> },
    'canceled': { bg: 'red.100', color: 'red.700', icon: <XCircleIcon style={{ width: 16, height: 16, marginRight: 4, color: '#E53E3E' }} /> },
  };

  const hasActiveFilters = filters.search ||
                          filters.status !== 'all' ||
                          filters.dateRange !== 'all' ||
                          filters.paymentStatus !== 'all' ||
                          filters.serviceId;

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Meetings</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Meetings</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Meetings</Heading>

      {/* Search and Filter Bar */}
      <Flex gap={4} align="center" flexWrap="wrap">
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#718096' }} />
          </InputLeftElement>
          <Input
            placeholder="Search meetings..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            borderRadius="lg"
          />
        </InputGroup>

        <Popover isOpen={isFilterOpen} onClose={onFilterClose}>
          <PopoverTrigger>
            <Button
              leftIcon={<FunnelIcon style={{ width: 20, height: 20 }} />}
              variant={hasActiveFilters ? "solid" : "outline"}
              colorScheme={hasActiveFilters ? "purple" : "gray"}
              borderRadius="lg"
              onClick={onFilterToggle}
            >
              Filters
              {hasActiveFilters && (
                <Badge ml={2} colorScheme="purple" borderRadius="full" fontSize="xs">
                  {Object.values(filters).filter(v => v !== '' && v !== 'all').length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent p={4} w="300px">
            <PopoverBody>
              <VStack spacing={4} align="stretch">
                <Text fontWeight="semibold" fontSize="sm">Filter Options</Text>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Status</Text>
                  <Select
                    size="sm"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="done">Done</option>
                    <option value="canceled">Canceled</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Date Range</Text>
                  <Select
                    size="sm"
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Payment Status</Text>
                  <Select
                    size="sm"
                    value={filters.paymentStatus}
                    onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Service</Text>
                  <Select
                    size="sm"
                    value={filters.serviceId}
                    onChange={(e) => handleFilterChange('serviceId', e.target.value)}
                  >
                    <option value="">All Services</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </Select>
                </Box>

                <Divider />

                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </Button>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>

      {/* Batch action bar above the meeting list */}
      {selectedMeetingIds.length > 0 && (
        <Flex mb={4} gap={2} align="center">
          <Text fontWeight="medium">{selectedMeetingIds.length} selected</Text>
          <Button size="sm" colorScheme="blue" onClick={openBatchEdit} isLoading={batchLoading}>Batch Edit</Button>
          <Button size="sm" colorScheme="red" onClick={openBatchDelete} isLoading={batchLoading}>Batch Delete</Button>
        </Flex>
      )}

      <Box bg="white" rounded="xl" shadow="md" p={6}>
        <Flex justify="space-between" align="center" mb={4}>
          <HStack>
            <Checkbox
              isChecked={isAllSelected}
              isIndeterminate={isIndeterminate}
              onChange={handleSelectAll}
              mr={2}
            />
            <Text fontWeight="semibold" fontSize="lg">
              All Meetings
              {filteredMeetings.length !== meetings.length && (
                <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                  ({filteredMeetings.length} of {meetings.length})
                </Text>
              )}
            </Text>
          </HStack>
          <Button
            leftIcon={<CalendarDaysIcon style={{ width: 20, height: 20 }} />}
            colorScheme="purple"
            borderRadius="lg"
            onClick={handleAddMeeting}
          >
            Add Meeting
          </Button>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {filteredMeetings.map((meeting) => (
            <Flex
              key={meeting.id}
              align="center"
              justify="space-between"
              py={4}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onClick={() => handleMeetingClick(meeting)}
              transition="background-color 0.2s"
            >
              <HStack>
                <Box onClick={e => e.stopPropagation()}>
                  <Checkbox
                    isChecked={selectedMeetingIds.includes(meeting.id)}
                    onChange={e => {
                      e.stopPropagation();
                      handleSelectMeeting(meeting.id);
                    }}
                    mr={4}
                  />
                </Box>
                <Avatar name={getClientName(meeting.client_id)} size="md" bg="purple.500" />
                <Box>
                  <Text fontWeight="medium" color="gray.900">{getClientName(meeting.client_id)}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {getServiceName(meeting.service_id)} &bull; {formatDateTime(meeting.start_time)}
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {format(meeting.price_total)} • {meeting.paid ? 'Paid' : 'Unpaid'}
                  </Text>
                  {meeting.membership_id && (
                    <Badge colorScheme="purple" size="sm" mt={1}>
                      {getMembershipName(meeting.membership_id)}
                    </Badge>
                  )}
                </Box>
              </HStack>
              <Badge px={3} py={1} borderRadius="full" fontSize="xs" bg={statusStyles[meeting.status].bg} color={statusStyles[meeting.status].color} display="flex" alignItems="center">
                {statusStyles[meeting.status].icon}{meeting.status}
              </Badge>
            </Flex>
          ))}
          {filteredMeetings.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              {meetings.length === 0
                ? 'No meetings found. Schedule your first meeting to get started.'
                : 'No meetings match your current filters. Try adjusting your search or filters.'
              }
            </Text>
          )}
        </Stack>
      </Box>

      {/* Add Meeting Modal */}
      <MeetingModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* View/Edit Meeting Modal */}
      <MeetingViewModal
        isOpen={isViewModalOpen}
        onClose={handleViewModalClose}
        onSuccess={handleModalSuccess}
        meeting={selectedMeeting}
      />

      {/* Batch Edit Modal */}
      <Modal isOpen={isBatchEditOpen} onClose={closeBatchEdit} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Batch Edit Meetings</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={batchEditStatus} onChange={e => setBatchEditStatus(e.target.value as any)}>
                  <option value="upcoming">Upcoming</option>
                  <option value="done">Done</option>
                  <option value="canceled">Canceled</option>
                </Select>
              </FormControl>
              <FormControl>
                <Checkbox isChecked={batchEditPaid} onChange={e => setBatchEditPaid(e.target.checked)}>
                  Paid
                </Checkbox>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeBatchEdit} mr={3} variant="ghost">Cancel</Button>
            <Button colorScheme="blue" onClick={handleBatchEdit} isLoading={batchLoading}>Apply</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Batch Delete Modal */}
      <Modal isOpen={isBatchDeleteOpen} onClose={closeBatchDelete} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete {selectedMeetingIds.length} Meetings?</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete the selected meetings? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeBatchDelete} mr={3} variant="ghost">Cancel</Button>
            <Button colorScheme="red" onClick={handleBatchDelete} isLoading={batchLoading}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

export default Meetings;
