import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  VStack,
  HStack,
  Divider,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Checkbox,
  IconButton,
} from '@chakra-ui/react';
import { MagnifyingGlassIcon, FunnelIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import { apiClient, Membership, Service, Client } from '../lib/api';
import MembershipViewModal from '../components/MembershipViewModal';
import MembershipModal from '../components/MembershipModal';
import MembershipBatchEditModal from '../components/MembershipBatchEditModal';
import MembershipBatchDeleteModal from '../components/MembershipBatchDeleteModal';

const Memberships: React.FC = () => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [filteredMemberships, setFilteredMemberships] = useState<Membership[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = filteredMemberships.length > 0 && filteredMemberships.every(m => selectedIds.includes(m.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : filteredMemberships.map(m => m.id));
  const toggleOne = (id: string) => setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getMemberships(),
      apiClient.getServices(),
      apiClient.getClients(),
    ])
      .then(([membershipsData, servicesData, clientsData]) => {
        setMemberships(membershipsData);
        setServices(servicesData);
        setClients(clientsData);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load memberships');
        setLoading(false);
      });
  }, []);

  // Filtering logic
  useEffect(() => {
    let filtered = memberships;
    if (search) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        getClientName(m.client_id).toLowerCase().includes(search.toLowerCase()) ||
        getServiceName(m.service_id).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }
    if (paymentFilter !== 'all') {
      filtered = filtered.filter((m) => (paymentFilter === 'paid' ? m.paid : !m.paid));
    }
    if (serviceFilter !== 'all') {
      filtered = filtered.filter((m) => m.service_id === serviceFilter);
    }
    setFilteredMemberships(filtered);
  }, [memberships, search, statusFilter, paymentFilter, serviceFilter]);

  const getServiceName = useCallback(
    (serviceId: string) => services.find((s) => s.id === serviceId)?.name || '',
    [services]
  );
  const getClientName = useCallback(
    (clientId: string) => clients.find((c) => c.id === clientId)?.name || '',
    [clients]
  );

  // Filter modal handlers
  const openFilterModal = () => setFilterModalOpen(true);
  const closeFilterModal = () => setFilterModalOpen(false);
  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setServiceFilter('all');
  };

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    // Refresh memberships after adding
    setLoading(true);
    apiClient.getMemberships().then((membershipsData) => {
      setMemberships(membershipsData);
      setLoading(false);
    });
  };

  // Row click handler
  const handleRowClick = (membership: Membership) => {
    setSelectedMembership(membership);
    // open MembershipViewModal here
  };

  return (
    <Box p={8} bg="gray.50" minH="100vh">
      <Flex mb={6} justify="space-between" align="center">
        <Heading size="xl">Memberships</Heading>
      </Flex>
      <Flex mb={4} align="center" gap={2}>
        <InputGroup maxW="320px">
          <InputLeftElement pointerEvents="none">
            <MagnifyingGlassIcon width={18} />
          </InputLeftElement>
          <Input
            placeholder="Search memberships..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Button leftIcon={<FunnelIcon width={18} />} onClick={openFilterModal} variant="outline">
          Filters
        </Button>
        <Button variant="link" ml={2} onClick={clearFilters} colorScheme="gray">
          Clear Filters
        </Button>
      </Flex>
      <Box bg="white" borderRadius="xl" boxShadow="sm" p={0} mt={4}>
        {/* Batch Actions Bar */}
        {selectedIds.length > 0 && (
          <Flex px={6} py={3} align="center" gap={2} bg="gray.50" borderBottom="1px solid #F1F1F1">
            <Text fontWeight="medium">{selectedIds.length} selected</Text>
            <Button size="sm" leftIcon={<PencilIcon width={16} />} colorScheme="blue" onClick={() => setBatchEditOpen(true)}>
              Batch Edit
            </Button>
            <Button size="sm" leftIcon={<TrashIcon width={16} />} colorScheme="red" onClick={() => setBatchDeleteOpen(true)}>
              Batch Delete
            </Button>
          </Flex>
        )}
        <Flex px={6} py={4} align="center" justify="space-between" borderBottom="1px solid #F1F1F1">
          <Flex align="center" gap={2}>
            <Checkbox isChecked={allSelected} onChange={toggleAll} mr={4} />
            <Text fontWeight="bold" color="gray.700">Your Memberships</Text>
          </Flex>
          <Button colorScheme="purple" leftIcon={<UserIcon width={18} />} onClick={() => setAddModalOpen(true)}>
            Add Membership
          </Button>
        </Flex>
        <Box>
          {filteredMemberships.length === 0 ? (
            <Box textAlign="center" py={8} color="gray.400">No memberships found</Box>
          ) : (
            filteredMemberships.map((membership) => (
              <Flex
                key={membership.id}
                align="center"
                px={6}
                py={4}
                borderBottom="1px solid #F1F1F1"
                bg={selectedIds.includes(membership.id) ? 'gray.50' : 'white'}
                _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                onClick={() => handleRowClick(membership)}
              >
                <Box
                  onClick={e => { e.stopPropagation(); }}
                  mr={4}
                  p={1}
                  borderRadius="md"
                  _hover={{ bg: 'gray.100' }}
                  cursor="pointer"
                >
                  <Checkbox
                    isChecked={selectedIds.includes(membership.id)}
                    onChange={() => toggleOne(membership.id)}
                  />
                </Box>
                <Flex align="center" justify="center" w={10} h={10} bg="purple.100" borderRadius="full" mr={4} fontWeight="bold" color="purple.700">
                  {membership.name.charAt(0).toUpperCase()}
                </Flex>
                <Box flex={1} minW={0}>
                  <Text fontWeight="semibold" color="gray.800" isTruncated>{membership.name}</Text>
                  <Text fontSize="sm" color="gray.500" isTruncated>
                    {getClientName(membership.client_id)} • {getServiceName(membership.service_id)}
                  </Text>
                </Box>
                <Flex gap={2} ml={4}>
                  <Badge colorScheme={membership.status === 'active' ? 'green' : membership.status === 'expired' ? 'red' : 'gray'}>
                    {membership.status.toUpperCase()}
                  </Badge>
                  <Badge colorScheme={membership.paid ? 'green' : 'orange'}>
                    {membership.paid ? 'PAID' : 'UNPAID'}
                  </Badge>
                </Flex>
              </Flex>
            ))
          )}
        </Box>
      </Box>
      {/* Filter Modal */}
      <Modal isOpen={filterModalOpen} onClose={closeFilterModal} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Filter Memberships</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="canceled">Canceled</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Payment</FormLabel>
                <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Service</FormLabel>
                <Select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
                  <option value="all">All</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeFilterModal} mr={2}>Close</Button>
            <Button onClick={clearFilters} variant="ghost">Clear</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MembershipViewModal */}
      {selectedMembership && (
        <MembershipViewModal
          membership={selectedMembership}
          onClose={() => setSelectedMembership(null)}
        />
      )}

      <MembershipModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
      {/* Batch Edit Modal */}
      <MembershipBatchEditModal
        membershipIds={selectedIds}
        isOpen={batchEditOpen}
        onClose={() => setBatchEditOpen(false)}
        onSuccess={() => {
          setBatchEditOpen(false);
          setSelectedIds([]);
          setLoading(true);
          apiClient.getMemberships().then((membershipsData) => {
            setMemberships(membershipsData);
            setLoading(false);
          });
        }}
      />
      {/* Batch Delete Modal */}
      <MembershipBatchDeleteModal
        membershipIds={selectedIds}
        isOpen={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onSuccess={() => {
          setBatchDeleteOpen(false);
          setSelectedIds([]);
          setLoading(true);
          apiClient.getMemberships().then((membershipsData) => {
            setMemberships(membershipsData);
            setLoading(false);
          });
        }}
      />
    </Box>
  );
};

export default Memberships;
