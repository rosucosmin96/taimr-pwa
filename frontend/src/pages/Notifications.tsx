import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BellIcon, PencilSquareIcon, CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon, FunnelIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  Avatar
} from '@chakra-ui/react';
import { apiClient, Notification } from '../lib/api';

// Filter types
interface Filters {
  search: string;
  status: 'all' | 'read' | 'unread';
  type: 'all' | 'membership_expiring' | 'membership_expired' | 'meeting_reminder' | 'payment_due';
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<string[]>([]);

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    type: 'all'
  });

  const { isOpen: isFilterOpen, onToggle: onFilterToggle, onClose: onFilterClose } = useDisclosure();
  const toast = useToast();

  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const openBatchDelete = () => setIsBatchDeleteOpen(true);
  const closeBatchDelete = () => setIsBatchDeleteOpen(false);

  const handleBatchDelete = async () => {
    setBatchLoading(true);
    try {
      await Promise.all(selectedNotificationIds.map(id => apiClient.deleteNotification(id)));
      toast({ title: 'Notifications deleted', status: 'success', duration: 2000, isClosable: true });
      setSelectedNotificationIds([]);
      setIsBatchDeleteOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: 'Batch delete failed', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await apiClient.markNotificationsRead(notificationIds);
      toast({ title: 'Notifications marked as read', status: 'success', duration: 2000, isClosable: true });
      fetchData();
    } catch (err) {
      toast({ title: 'Failed to mark as read', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Notifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const title = notification.title.toLowerCase();
        const message = notification.message.toLowerCase();
        const searchMatch = title.includes(searchLower) || message.includes(searchLower);
        if (!searchMatch) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        if (filters.status === 'read' && !notification.read) return false;
        if (filters.status === 'unread' && notification.read) return false;
      }

      // Type filter
      if (filters.type !== 'all') {
        if (notification.type !== filters.type) return false;
      }

      return true;
    });
  }, [notifications, filters]);

  const isAllSelected = filteredNotifications.length > 0 && filteredNotifications.every(n => selectedNotificationIds.includes(n.id));
  const isIndeterminate = selectedNotificationIds.length > 0 && !isAllSelected;

  const handleSelectNotification = (id: string) => {
    setSelectedNotificationIds(prev => prev.includes(id) ? prev.filter(nid => nid !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedNotificationIds([]);
    } else {
      setSelectedNotificationIds(filteredNotifications.map(n => n.id));
    }
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
      type: 'all'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'membership_expiring':
        return '⚠️';
      case 'membership_expired':
        return '❌';
      case 'meeting_reminder':
        return '📅';
      case 'payment_due':
        return '💰';
      default:
        return '🔔';
    }
  };

  const hasActiveFilters = filters.search ||
                          filters.status !== 'all' ||
                          filters.type !== 'all';

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Notifications</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
        <Heading as="h1" size="lg" mb={4}>Notifications</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4}>
      <Heading as="h1" size="lg" mb={4}>Notifications</Heading>

      {/* Search and Filter Bar */}
      <Flex gap={4} align="center" flexWrap="wrap">
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: '#718096' }} />
          </InputLeftElement>
          <Input
            placeholder="Search notifications..."
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
                    <option value="all">All Notifications</option>
                    <option value="unread">Unread Only</option>
                    <option value="read">Read Only</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Type</Text>
                  <Select
                    size="sm"
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="membership_expiring">Membership Expiring</option>
                    <option value="membership_expired">Membership Expired</option>
                    <option value="meeting_reminder">Meeting Reminder</option>
                    <option value="payment_due">Payment Due</option>
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

      {/* Batch action bar above the notification list */}
      {selectedNotificationIds.length > 0 && (
        <Flex mb={4} gap={2} align="center">
          <Text fontWeight="medium">{selectedNotificationIds.length} selected</Text>
          <Button
            size="sm"
            colorScheme="green"
            onClick={() => handleMarkAsRead(selectedNotificationIds)}
            isLoading={batchLoading}
          >
            Mark as Read
          </Button>
          <Button size="sm" colorScheme="red" onClick={openBatchDelete} isLoading={batchLoading}>
            <TrashIcon style={{ width: 16, height: 16 }} />
            Delete
          </Button>
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
              Your Notifications
              {filteredNotifications.length !== notifications.length && (
                <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                  ({filteredNotifications.length} of {notifications.length})
                </Text>
              )}
            </Text>
          </HStack>
          <HStack>
            <Avatar size="sm" icon={<BellIcon style={{ width: 20, height: 20 }} />} bg="purple.500" />
          </HStack>
        </Flex>
        <Stack divider={<Box borderBottomWidth={1} borderColor="gray.100" />}>
          {filteredNotifications.map((notification) => (
            <Flex
              key={notification.id}
              align="center"
              justify="space-between"
              py={4}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              transition="background-color 0.2s"
              bg={notification.read ? 'transparent' : 'blue.50'}
            >
              <HStack>
                <Box onClick={e => e.stopPropagation()}>
                  <Checkbox
                    isChecked={selectedNotificationIds.includes(notification.id)}
                    onChange={e => {
                      e.stopPropagation();
                      handleSelectNotification(notification.id);
                    }}
                    mr={4}
                  />
                </Box>
                <Avatar size="sm" bg="purple.100" color="purple.600">
                  <Text fontSize="sm">{getNotificationIcon(notification.type)}</Text>
                </Avatar>
                <Box flex="1">
                  <Text fontWeight="medium" color="gray.900" fontSize="sm">
                    {notification.title}
                  </Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {formatDate(notification.created_at)}
                  </Text>
                </Box>
              </HStack>
              <Flex align="center" gap={2}>
                {!notification.read && (
                  <Badge colorScheme="blue" size="sm">New</Badge>
                )}
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Mark as read"
                  icon={notification.read ? <CheckCircleIcon style={{ width: 16, height: 16 }} /> : <XCircleIcon style={{ width: 16, height: 16 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead([notification.id]);
                  }}
                />
              </Flex>
            </Flex>
          ))}
          {filteredNotifications.length === 0 && (
            <Text color="gray.500" textAlign="center" py={8}>
              {notifications.length === 0
                ? 'No notifications found. You\'re all caught up!'
                : 'No notifications match your current filters. Try adjusting your search or filters.'
              }
            </Text>
          )}
        </Stack>
      </Box>

      {/* Batch Delete Modal */}
      <Modal isOpen={isBatchDeleteOpen} onClose={closeBatchDelete} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete {selectedNotificationIds.length} Notifications?</ModalHeader>
          <ModalBody>
            <Text>Are you sure you want to delete the selected notifications? This action cannot be undone.</Text>
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

export default Notifications;
