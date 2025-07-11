import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Cog6ToothIcon, PencilSquareIcon, CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import {
  Box,
  Flex,
  Stack,
  Heading,
  Text,
  Button,
  Badge,
  IconButton,
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
import { apiClient, Service } from '../lib/api';
import ServiceModal from '../components/ServiceModal';
import ServiceViewModal from '../components/ServiceViewModal';

// Filter types
interface Filters {
  search: string;
  priceRange: 'all' | 'low' | 'medium' | 'high';
  durationRange: 'all' | 'short' | 'medium' | 'long';
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    search: '',
    priceRange: 'all',
    durationRange: 'all'
  });

  const { isOpen: isFilterOpen, onToggle: onFilterToggle, onClose: onFilterClose } = useDisclosure();
  const toast = useToast();

  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchEditPrice, setBatchEditPrice] = useState(50);
  const [batchEditDuration, setBatchEditDuration] = useState(60);
  const [batchLoading, setBatchLoading] = useState(false);

  const openBatchEdit = () => {
    setBatchEditPrice(50);
    setBatchEditDuration(60);
    setIsBatchEditOpen(true);
  };
  const closeBatchEdit = () => setIsBatchEditOpen(false);
  const openBatchDelete = () => setIsBatchDeleteOpen(true);
  const closeBatchDelete = () => setIsBatchDeleteOpen(false);

  const handleBatchEdit = async () => {
    setBatchLoading(true);
    try {
      await Promise.all(selectedServiceIds.map(id =>
        apiClient.updateService(id, {
          default_price_per_hour: batchEditPrice,
          default_duration_minutes: batchEditDuration
        })
      ));
      toast({ title: 'Services updated', status: 'success', duration: 2000, isClosable: true });
      setSelectedServiceIds([]);
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
      await Promise.all(selectedServiceIds.map(id => apiClient.deleteService(id)));
      toast({ title: 'Services deleted', status: 'success', duration: 2000, isClosable: true });
      setSelectedServiceIds([]);
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
      const data = await apiClient.getServices();
      setServices(data);
    } catch (err) {
      setError('Failed to load services');
      console.error('Services fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter services based on current filters
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const name = service.name.toLowerCase();
        const searchMatch = name.includes(searchLower);
        if (!searchMatch) return false;
      }

      // Price range filter
      if (filters.priceRange !== 'all') {
        const price = service.default_price_per_hour;
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

      // Duration range filter
      if (filters.durationRange !== 'all') {
        const duration = service.default_duration_minutes;
        switch (filters.durationRange) {
          case 'short':
            if (duration >= 60) return false;
            break;
          case 'medium':
            if (duration < 60 || duration >= 120) return false;
            break;
          case 'long':
            if (duration < 120) return false;
            break;
        }
      }

      return true;
    });
  }, [services, filters]);

  const isAllSelected = filteredServices.length > 0 && filteredServices.every(s => selectedServiceIds.includes(s.id));
  const isIndeterminate = selectedServiceIds.length > 0 && !isAllSelected;

  const handleSelectService = (id: string) => {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(filteredServices.map(s => s.id));
    }
  };

  const handleAddService = () => {
    setIsAddModalOpen(true);
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
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
    setSelectedService(null);
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
      priceRange: 'all',
      durationRange: 'all'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const hasActiveFilters = filters.search ||
                          filters.priceRange !== 'all' ||
                          filters.durationRange !== 'all';

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Services</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Services</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Services</Heading>

      {/* Search and Filter Bar */}
      <Flex gap={4} align="center" flexWrap="wrap">
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#718096' }} />
          </InputLeftElement>
          <Input
            placeholder="Search services..."
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
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Price Range</Text>
                  <Select
                    size="sm"
                    value={filters.priceRange}
                    onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  >
                    <option value="all">All Prices</option>
                    <option value="low">Under $50/h</option>
                    <option value="medium">$50-$100/h</option>
                    <option value="high">Over $100/h</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Duration Range</Text>
                  <Select
                    size="sm"
                    value={filters.durationRange}
                    onChange={(e) => handleFilterChange('durationRange', e.target.value)}
                  >
                    <option value="all">All Durations</option>
                    <option value="short">Under 1 hour</option>
                    <option value="medium">1-2 hours</option>
                    <option value="long">Over 2 hours</option>
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

      {/* Batch action bar above the service list */}
      {selectedServiceIds.length > 0 && (
        <Flex mb={4} gap={2} align="center">
          <Text fontWeight="medium">{selectedServiceIds.length} selected</Text>
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
              Your Services
              {filteredServices.length !== services.length && (
                <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                  ({filteredServices.length} of {services.length})
                </Text>
              )}
            </Text>
          </HStack>
          <Button
            leftIcon={<Cog6ToothIcon style={{ width: 20, height: 20 }} />}
            colorScheme="purple"
            borderRadius="lg"
            onClick={handleAddService}
          >
            Add Service
          </Button>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {filteredServices.map((service) => (
            <Flex
              key={service.id}
              align="center"
              justify="space-between"
              py={4}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onClick={() => handleServiceClick(service)}
              transition="background-color 0.2s"
            >
              <HStack>
                <Box onClick={e => e.stopPropagation()}>
                  <Checkbox
                    isChecked={selectedServiceIds.includes(service.id)}
                    onChange={e => {
                      e.stopPropagation();
                      handleSelectService(service.id);
                    }}
                    mr={4}
                  />
                </Box>
                <Box>
                  <Text fontWeight="medium" color="gray.900">{service.name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {formatDuration(service.default_duration_minutes)} &bull; ${service.default_price_per_hour}/h
                  </Text>
                </Box>
              </HStack>
              <Flex align="center" gap={4}>
                {/* Removed the 'Active' badge, as there is no real status field */}
              </Flex>
            </Flex>
          ))}
          {filteredServices.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              {services.length === 0
                ? 'No services found. Create your first service to get started.'
                : 'No services match your current filters. Try adjusting your search or filters.'
              }
            </Text>
          )}
        </Stack>
      </Box>

      {/* Batch Edit Modal */}
      <Modal isOpen={isBatchEditOpen} onClose={closeBatchEdit} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Batch Edit Services</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Default Price per Hour ($)</FormLabel>
                <Input
                  type="number"
                  value={batchEditPrice}
                  onChange={e => setBatchEditPrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Default Duration (minutes)</FormLabel>
                <Input
                  type="number"
                  value={batchEditDuration}
                  onChange={e => setBatchEditDuration(Number(e.target.value))}
                  min="15"
                  step="15"
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
          <ModalHeader>Delete {selectedServiceIds.length} Services?</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete the selected services? This action cannot be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeBatchDelete} mr={3} variant="ghost">Cancel</Button>
            <Button colorScheme="red" onClick={handleBatchDelete} isLoading={batchLoading}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Service Modal */}
      <ServiceModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* View/Edit Service Modal */}
      <ServiceViewModal
        isOpen={isViewModalOpen}
        onClose={handleViewModalClose}
        onSuccess={handleModalSuccess}
        service={selectedService}
      />
    </Stack>
  );
};

export default Services;
