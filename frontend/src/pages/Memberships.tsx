import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack as ChakraVStack,
  Stack as ChakraStack,
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const onFilterOpen = () => setIsFilterOpen(true);
  const onFilterClose = () => setIsFilterOpen(false);
  const onFilterToggle = () => setIsFilterOpen((v) => !v);
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

  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsWrapped, setControlsWrapped] = useState(false);

  // Responsive controls layout logic
  useEffect(() => {
    function checkWrap() {
      if (!controlsRef.current) return;
      const container = controlsRef.current;
      // Safe margin (e.g., 32px)
      const safeMargin = 32;
      // Compare scrollWidth (total needed) to clientWidth (available)
      setControlsWrapped(container.scrollWidth + safeMargin > container.clientWidth);
    }
    checkWrap();
    window.addEventListener('resize', checkWrap);
    return () => window.removeEventListener('resize', checkWrap);
  }, []);

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
  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setServiceFilter('all');
  };

  // Centralized refresh function
  const refreshMemberships = () => {
    setLoading(true);
    apiClient.getMemberships().then((membershipsData) => {
      setMemberships(membershipsData);
      setLoading(false);
    }).catch((err) => {
      setError('Failed to refresh memberships');
      setLoading(false);
    });
  };

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    refreshMemberships();
  };

  // Row click handler
  const handleRowClick = (membership: Membership) => {
    setSelectedMembership(membership);
    // open MembershipViewModal here
  };

  // Track if any filters are active
  const hasActiveFilters =
    statusFilter !== 'all' || paymentFilter !== 'all' || serviceFilter !== 'all';

  // Status badge styles (similar to Meetings)
  const statusStyles: Record<string, { bg: string; color: string }> = {
    'active': { bg: 'green.100', color: 'green.700' },
    'expired': { bg: 'red.100', color: 'red.700' },
    'canceled': { bg: 'gray.200', color: 'gray.600' },
  };

  return (
    <ChakraStack spacing={8} px={{ base: 2, md: 8 }} py={4} className="container-responsive">
      <Heading as="h1" size="lg" mb={4} className="responsive-heading">Memberships</Heading>
      {/* Search and Filter Bar */}
      <Flex gap={4} align="center" flexWrap="wrap" className="mobile-spacing">
        <InputGroup maxW={{ base: "100%", sm: "400px" }} minW={{ base: "200px", sm: "auto" }}>
          <InputLeftElement pointerEvents="none">
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#718096' }} />
          </InputLeftElement>
          <Input
            placeholder="Search memberships..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            borderRadius="lg"
            className="responsive-text"
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
                  {[statusFilter, paymentFilter, serviceFilter].filter(v => v !== '' && v !== 'all').length}
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
                  <Select size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="canceled">Canceled</option>
                  </Select>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Payment</Text>
                  <Select size="sm" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </Select>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Service</Text>
                  <Select size="sm" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
                    <option value="all">All</option>
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
      {/* Batch action bar above the memberships list */}
      {selectedIds.length > 0 && (
        <Flex mb={4} gap={2} align="center">
          <Text fontWeight="medium">{selectedIds.length} selected</Text>
          <Button size="sm" colorScheme="blue" onClick={() => setBatchEditOpen(true)}>Batch Edit</Button>
          <Button size="sm" colorScheme="red" onClick={() => setBatchDeleteOpen(true)}>Batch Delete</Button>
        </Flex>
      )}
      {/* Memberships List */}
      <Box
        bg="white"
        rounded="xl"
        shadow="md"
        p={6}
        w="100%"
        minWidth={0}
        overflowX="auto"
      >
        <Flex justify="space-between" align="center" mb={4} minWidth={0}>
          <HStack minWidth={0}>
            <Checkbox
              isChecked={allSelected}
              isIndeterminate={selectedIds.length > 0 && !allSelected}
              onChange={toggleAll}
              mr={2}
            />
            <Text fontWeight="semibold" fontSize="lg" isTruncated>
              Your Memberships
              {filteredMemberships.length !== memberships.length && (
                <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                  ({filteredMemberships.length} of {memberships.length})
                </Text>
              )}
            </Text>
          </HStack>
          <Button
            leftIcon={<UserIcon width={18} />}
            colorScheme="purple"
            borderRadius="lg"
            onClick={() => setAddModalOpen(true)}
            ml={3}
          >
            Add Membership
          </Button>
        </Flex>
        <ChakraStack divider={<Box borderBottomWidth={1} borderColor="gray.100" />} minWidth={0}>
          {filteredMemberships.map((membership) => (
            <Flex
              key={membership.id}
              align="flex-start"
              py={4}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onClick={() => handleRowClick(membership)}
              transition="background-color 0.2s"
              gap={2}
              minWidth={0}
            >
              <Box onClick={e => { e.stopPropagation(); }} mt={1}>
                <Checkbox
                  isChecked={selectedIds.includes(membership.id)}
                  onChange={() => toggleOne(membership.id)}
                  mr={0}
                />
              </Box>
              <Avatar name={getClientName(membership.client_id)} size="md" bg="purple.500" mx={2} />
              <Box minW={0} flex={1} flexShrink={1}>
                <Text fontWeight="medium" color="gray.900" isTruncated>{membership.name}</Text>
                <Text fontSize="sm" color="gray.500" isTruncated>
                  {getClientName(membership.client_id)} • {getServiceName(membership.service_id)}
                </Text>
                <Flex gap={2} mt={2} wrap="wrap">
                  <Badge
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    bg={statusStyles[membership.status]?.bg || 'gray.100'}
                    color={statusStyles[membership.status]?.color || 'gray.700'}
                    fontWeight="semibold"
                    whiteSpace="nowrap"
                  >
                    {membership.status}
                  </Badge>
                  <Badge
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    colorScheme={membership.paid ? 'green' : 'orange'}
                    fontWeight="semibold"
                    whiteSpace="nowrap"
                  >
                    {membership.paid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </Flex>
              </Box>
            </Flex>
          ))}
          {filteredMemberships.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              {memberships.length === 0
                ? 'No memberships found. Create your first membership to get started.'
                : 'No memberships match your current filters. Try adjusting your search or filters.'
              }
            </Text>
          )}
        </ChakraStack>
      </Box>
      {/* MembershipViewModal */}
      {selectedMembership && (
        <MembershipViewModal
          membership={selectedMembership}
          onClose={() => setSelectedMembership(null)}
          onRefresh={refreshMemberships}
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
          refreshMemberships();
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
          refreshMemberships();
        }}
      />
    </ChakraStack>
  );
};

export default Memberships;
