import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserIcon, EnvelopeIcon, PhoneIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Button,
  Avatar,
  Badge,
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
import { apiClient, Client, Service } from '../lib/api';
import ClientModal from '../components/ClientModal';
import ClientViewModal from '../components/ClientViewModal';
import { useCurrency } from '../lib/currency';
import { CurrencyLoadingWrapper } from '../components/CurrencyLoadingWrapper';

// Filter types
interface Filters {
  search: string;
  serviceId: string;
  priceRange: 'all' | 'low' | 'medium' | 'high';
  hasCustomPrice: 'all' | 'yes' | 'no';
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { format } = useCurrency();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Debug modal state
  useEffect(() => {
    console.log('Modal state changed:', { isViewModalOpen, selectedClient });
  }, [isViewModalOpen, selectedClient]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    search: '',
    serviceId: '',
    priceRange: 'all',
    hasCustomPrice: 'all'
  });

  const { isOpen: isFilterOpen, onToggle: onFilterToggle, onClose: onFilterClose } = useDisclosure();
  const toast = useToast();

  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchEditServiceId, setBatchEditServiceId] = useState('');
  const [batchEditCustomPrice, setBatchEditCustomPrice] = useState(50);
  const [batchLoading, setBatchLoading] = useState(false);

  const openBatchEdit = () => {
    setBatchEditServiceId('');
    setBatchEditCustomPrice(50);
    setIsBatchEditOpen(true);
  };
  const closeBatchEdit = () => setIsBatchEditOpen(false);
  const openBatchDelete = () => setIsBatchDeleteOpen(true);
  const closeBatchDelete = () => setIsBatchDeleteOpen(false);

  const handleBatchEdit = async () => {
    setBatchLoading(true);
    try {
      const updateData: any = {};
      if (batchEditServiceId) {
        updateData.service_id = batchEditServiceId;
      }
      if (batchEditCustomPrice > 0) {
        updateData.custom_price_per_hour = batchEditCustomPrice;
      }

      await Promise.all(selectedClientIds.map(id =>
        apiClient.updateClient(id, updateData)
      ));
      toast({ title: 'Clients updated', status: 'success', duration: 2000, isClosable: true });
      setSelectedClientIds([]);
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
      await Promise.all(selectedClientIds.map(id => apiClient.deleteClient(id)));
      toast({ title: 'Clients deleted', status: 'success', duration: 2000, isClosable: true });
      setSelectedClientIds([]);
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
      const [clientsData, servicesData] = await Promise.all([
        apiClient.getClients(),
        apiClient.getServices()
      ]);
      setClients(clientsData);
      setServices(servicesData);
    } catch (err) {
      setError('Failed to load clients');
      console.error('Clients fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions for filtering
  const getServiceName = useCallback((serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  }, [services]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Filter clients based on current filters
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const name = client.name.toLowerCase();
        const email = client.email.toLowerCase();
        const phone = client.phone.toLowerCase();
        const serviceName = getServiceName(client.service_id).toLowerCase();

        const searchMatch = name.includes(searchLower) ||
                           email.includes(searchLower) ||
                           phone.includes(searchLower) ||
                           serviceName.includes(searchLower);

        if (!searchMatch) return false;
      }

      // Service filter
      if (filters.serviceId && client.service_id !== filters.serviceId) {
        return false;
      }

      // Price range filter
      if (filters.priceRange !== 'all') {
        const price = client.custom_price_per_hour || 0;
        switch (filters.priceRange) {
          case 'low':
            if (price >= 50) return false;
            break;
          case 'medium':
            if (price < 50 || price >= 100) return false;
            break;
          case 'high':
            if (price < 100) return false;
            break;
        }
      }

      // Custom price filter
      if (filters.hasCustomPrice !== 'all') {
        const hasCustomPrice = !!client.custom_price_per_hour;
        if (filters.hasCustomPrice === 'yes' && !hasCustomPrice) return false;
        if (filters.hasCustomPrice === 'no' && hasCustomPrice) return false;
      }

      return true;
    });
  }, [clients, filters, getServiceName]);

  const isAllSelected = filteredClients.length > 0 && filteredClients.every(c => selectedClientIds.includes(c.id));
  const isIndeterminate = selectedClientIds.length > 0 && !isAllSelected;

  const handleSelectClient = (id: string) => {
    setSelectedClientIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map(c => c.id));
    }
  };

  const handleAddClient = () => {
    setIsAddModalOpen(true);
  };

  const handleClientClick = (client: Client) => {
    console.log('Client clicked:', client.name); // Debug log
    setSelectedClient(client);
    setIsViewModalOpen(true);
    console.log('Modal should open, selectedClient:', client, 'isViewModalOpen:', true);
  };

  const handleModalSuccess = () => {
    fetchData(); // Refresh data after successful operation
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleViewModalClose = () => {
    setIsViewModalOpen(false);
    setSelectedClient(null);
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
      serviceId: '',
      priceRange: 'all',
      hasCustomPrice: 'all'
    });
  };

  const hasActiveFilters = filters.search ||
                          filters.serviceId ||
                          filters.priceRange !== 'all' ||
                          filters.hasCustomPrice !== 'all';

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Clients</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Clients</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <CurrencyLoadingWrapper>
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4} className="container-responsive">
      <Heading as="h1" size="lg" mb={4} className="responsive-heading">Clients</Heading>

      {/* Search and Filter Bar */}
      <Flex gap={4} align="center" flexWrap="wrap" className="mobile-spacing">
        <InputGroup maxW={{ base: "100%", sm: "400px" }} minW={{ base: "200px", sm: "auto" }}>
          <InputLeftElement pointerEvents="none">
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#718096' }} />
          </InputLeftElement>
          <Input
            placeholder="Search clients..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
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

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Price Range</Text>
                  <Select
                    size="sm"
                    value={filters.priceRange}
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  >
                    <option value="all">All Prices</option>
                    <option value="low">Under {format(50)}/h</option>
                    <option value="medium">{format(50)}-{format(100)}/h</option>
                    <option value="high">Over {format(100)}/h</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Custom Price</Text>
                  <Select
                    size="sm"
                    value={filters.hasCustomPrice}
                    onChange={(e) => handleFilterChange('hasCustomPrice', e.target.value)}
                  >
                    <option value="all">All Clients</option>
                    <option value="yes">Has Custom Price</option>
                    <option value="no">No Custom Price</option>
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

      {/* Batch action bar above the client list */}
      {selectedClientIds.length > 0 && (
        <Flex mb={4} gap={2} align="center">
          <Text fontWeight="medium">{selectedClientIds.length} selected</Text>
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
              Your Clients
              {filteredClients.length !== clients.length && (
                <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                  ({filteredClients.length} of {clients.length})
                </Text>
              )}
            </Text>
          </HStack>
          <Button
            leftIcon={<UserIcon style={{ width: 20, height: 20 }} />}
            colorScheme="purple"
            borderRadius="lg"
            onClick={handleAddClient}
          >
            Add Client
          </Button>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {filteredClients.map((client) => (
            <Box
              key={client.id}
              as="button"
              w="full"
              textAlign="left"
              bg="transparent"
              border="none"
              p={0}
              m={0}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              _active={{ bg: 'gray.100' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClientClick(client);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClientClick(client);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClientClick(client);
                }
              }}
              transition="background-color 0.2s"
              className="client-row-touch touchable"
            >
              <Flex
                align="center"
                justify="space-between"
                py={4}
                px={2}
                minH="60px"
                borderRadius="md"
                w="full"
              >
              <HStack flex={1} minW={0}>
                <Box onClick={e => e.stopPropagation()} flexShrink={0}>
                  <Checkbox
                    isChecked={selectedClientIds.includes(client.id)}
                    onChange={e => {
                      e.stopPropagation();
                      handleSelectClient(client.id);
                    }}
                    mr={4}
                    size="lg"
                  />
                </Box>
                <Avatar name={client.name} size="md" bg="purple.500" flexShrink={0} />
                <Box flex={1} minW={0}>
                  <Text fontWeight="medium" color="gray.900" fontSize={{ base: "sm", md: "md" }} className="responsive-text">
                    {client.name}
                  </Text>
                  <Flex align="center" color="gray.500" fontSize={{ base: "xs", md: "sm" }} gap={2} flexWrap="wrap" mt={1}>
                    <Flex align="center" gap={1} minW={0}>
                      <EnvelopeIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <Text noOfLines={1} overflow="hidden" textOverflow="ellipsis" className="responsive-text">
                        {client.email}
                      </Text>
                    </Flex>
                    <Flex align="center" gap={1} minW={0}>
                      <PhoneIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <Text noOfLines={1} overflow="hidden" textOverflow="ellipsis" className="responsive-text">
                        {client.phone}
                      </Text>
                    </Flex>
                  </Flex>
                  <Flex gap={2} mt={2} flexWrap="wrap">
                    <Badge px={2} py={0.5} borderRadius="full" bg="purple.100" color="purple.700" fontSize="xs" fontWeight="medium" className="responsive-label">
                      {getServiceName(client.service_id)}
                    </Badge>
                    {client.custom_price_per_hour && (
                      <Badge px={2} py={0.5} borderRadius="full" bg="green.100" color="green.700" fontSize="xs" fontWeight="medium" className="responsive-label">
                        {format(client.custom_price_per_hour)}/h
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </HStack>
              </Flex>
            </Box>
          ))}
          {filteredClients.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              {clients.length === 0
                ? 'No clients found. Add your first client to get started.'
                : 'No clients match your current filters. Try adjusting your search or filters.'
              }
            </Text>
          )}
        </Stack>
      </Box>

      {/* Batch Edit Modal */}
      <Modal isOpen={isBatchEditOpen} onClose={closeBatchEdit} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Batch Edit Clients</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Service</FormLabel>
                <Select
                  value={batchEditServiceId}
                  onChange={e => setBatchEditServiceId(e.target.value)}
                  placeholder="Select service (optional)"
                >
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Custom Price per Hour ($)</FormLabel>
                <Input
                  type="number"
                  value={batchEditCustomPrice}
                  onChange={e => setBatchEditCustomPrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="Leave empty to remove custom price"
                />
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
          <ModalHeader>Delete {selectedClientIds.length} Clients?</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete the selected clients? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeBatchDelete} mr={3} variant="ghost">Cancel</Button>
            <Button colorScheme="red" onClick={handleBatchDelete} isLoading={batchLoading}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Client Modal */}
      <ClientModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* View/Edit Client Modal */}
      <ClientViewModal
        isOpen={isViewModalOpen}
        onClose={handleViewModalClose}
        onSuccess={handleModalSuccess}
        client={selectedClient}
      />
    </Stack>
    </CurrencyLoadingWrapper>
  );
};

export default Clients;
