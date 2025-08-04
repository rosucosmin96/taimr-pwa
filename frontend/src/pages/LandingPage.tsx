import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const LandingPage: React.FC = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box minH="100vh" bg="gray.50" position="relative" overflow="hidden">
      {/* Background pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.03}
        backgroundImage="radial-gradient(circle, #000 1px, transparent 1px)"
        backgroundSize="20px 20px"
        pointerEvents="none"
      />

      {/* Header */}
      <Box
        as="header"
        bg="white"
        boxShadow="sm"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={9999}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Container maxW="7xl" px={4}>
          <Flex justify="space-between" align="center" py={4}>
            {/* Logo */}
            <Flex
              as={Link}
              to="/"
              align="center"
              cursor="pointer"
              _hover={{ opacity: 0.8 }}
              transition="opacity 0.2s"
            >
              <Box
                w={8}
                h={8}
                bg="purple.500"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mr={3}
              >
                <Text color="white" fontWeight="bold" fontSize="sm">
                  T
                </Text>
              </Box>
              <Text fontWeight="bold" fontSize="xl" color="gray.800">
                taimr
              </Text>
            </Flex>



            {/* Action buttons */}
            <HStack spacing={4}>
              <Button
                as={Link}
                to="/login"
                variant="outline"
                colorScheme="purple"
                size="md"
                borderRadius="lg"
              >
                Sign in
              </Button>
              <Button
                as={Link}
                to="/signup"
                colorScheme="purple"
                size="md"
                borderRadius="lg"
                bg="purple.500"
                _hover={{ bg: 'purple.600' }}
              >
                Get started
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Main content */}
      <Container maxW="7xl" px={4} py={16} position="relative" zIndex={5} pt={24}>
        <Flex
          direction={{ base: 'column', lg: 'row' }}
          align="center"
          justify="space-between"
          gap={12}
        >
          {/* Left side - Main content */}
          <Box flex="1" textAlign={{ base: 'center', lg: 'left' }}>
            {/* App icon */}
            <Box
              w={20}
              h={20}
              bg="white"
              borderRadius="2xl"
              boxShadow="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mx={{ base: 'auto', lg: 0 }}
              mb={8}
            >
              <Box
                w={12}
                h={12}
                bg="purple.500"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontWeight="bold" fontSize="lg">
                  T
                </Text>
              </Box>
            </Box>

            {/* Main headline */}
            <Heading
              as="h1"
              size="2xl"
              fontWeight="bold"
              color="gray.900"
              mb={4}
              lineHeight="1.1"
            >
              No more notebooks, track your business the smart way.
            </Heading>

            {/* Subtitle */}
            <Text
              fontSize="lg"
              color="gray.700"
              mb={8}
              maxW="2xl"
              mx={{ base: 'auto', lg: 0 }}
            >
              Efficiently manage your freelance business with client management,
              appointment scheduling, and performance analytics all in one place.
            </Text>

            {/* CTA button */}
            <Button
              as={Link}
              to="/signup"
              size="lg"
              colorScheme="purple"
              bg="purple.500"
              _hover={{ bg: 'purple.600' }}
              borderRadius="lg"
              px={8}
              py={6}
              fontSize="lg"
              fontWeight="semibold"
            >
              Get started free
            </Button>
          </Box>

          {/* Right side - Feature widgets */}
          <Box flex="1" position="relative" minH={{ base: "auto", lg: "600px" }}>
            {/* Mobile layout - stacked cards */}
            <VStack spacing={4} display={{ base: 'flex', lg: 'none' }} w="full">
              {/* Today's Meetings Widget */}
              <Box
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="full"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={CalendarIcon} color="purple.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">Today's Meetings</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box p={3} bg="purple.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium">Client Consultation</Text>
                      <Text fontSize="xs" color="gray.500">14:00</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">John Smith - Web Design</Text>
                  </Box>
                  <Box p={3} bg="green.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium">Strategy Session</Text>
                      <Text fontSize="xs" color="gray.500">16:30</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">Sarah Johnson - Marketing</Text>
                  </Box>
                </VStack>
              </Box>

              {/* Revenue Stats Widget */}
              <Box
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="full"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={CurrencyDollarIcon} color="green.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">This Month</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold" color="green.600">$2,450</Text>
                    <Text fontSize="sm" color="gray.600">Total Revenue</Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="purple.600">12</Text>
                    <Text fontSize="sm" color="gray.600">Completed Meetings</Text>
                  </Box>
                </VStack>
              </Box>

              {/* Client Management Widget */}
              <Box
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="full"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={UserGroupIcon} color="blue.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">Active Clients</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Web Design</Text>
                      <Text fontSize="xs" color="gray.500">8 clients</Text>
                    </HStack>
                  </Box>
                  <Box p={3} bg="purple.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Marketing</Text>
                      <Text fontSize="xs" color="gray.500">5 clients</Text>
                    </HStack>
                  </Box>
                  <Box p={3} bg="green.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Consulting</Text>
                      <Text fontSize="xs" color="gray.500">3 clients</Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>

              {/* Analytics Widget */}
              <Box
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="full"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={ChartBarIcon} color="orange.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">Performance</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="orange.600">85%</Text>
                    <Text fontSize="sm" color="gray.600">Client Satisfaction</Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="purple.600">24h</Text>
                    <Text fontSize="sm" color="gray.600">Avg Response Time</Text>
                  </Box>
                </VStack>
              </Box>
            </VStack>

            {/* Desktop layout - positioned cards */}
            <Box display={{ base: 'none', lg: 'block' }} position="relative" minH="600px">
              {/* Today's Meetings Widget */}
              <Box
                position="absolute"
                top={0}
                right={0}
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="300px"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={CalendarIcon} color="purple.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">Today's Meetings</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box p={3} bg="purple.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium">Client Consultation</Text>
                      <Text fontSize="xs" color="gray.500">14:00</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">John Smith - Web Design</Text>
                  </Box>
                  <Box p={3} bg="green.50" borderRadius="md">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium">Strategy Session</Text>
                      <Text fontSize="xs" color="gray.500">16:30</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.600">Sarah Johnson - Marketing</Text>
                  </Box>
                </VStack>
              </Box>

              {/* Revenue Stats Widget */}
              <Box
                position="absolute"
                top="200px"
                left={0}
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="280px"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={CurrencyDollarIcon} color="green.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">This Month</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold" color="green.600">$2,450</Text>
                    <Text fontSize="sm" color="gray.600">Total Revenue</Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="purple.600">12</Text>
                    <Text fontSize="sm" color="gray.600">Completed Meetings</Text>
                  </Box>
                </VStack>
              </Box>

              {/* Client Management Widget */}
              <Box
                position="absolute"
                bottom="100px"
                left="50px"
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="320px"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={UserGroupIcon} color="blue.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">Active Clients</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Web Design</Text>
                      <Text fontSize="xs" color="gray.500">8 clients</Text>
                    </HStack>
                  </Box>
                  <Box p={3} bg="purple.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Marketing</Text>
                      <Text fontSize="xs" color="gray.500">5 clients</Text>
                    </HStack>
                  </Box>
                  <Box p={3} bg="green.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="medium">Consulting</Text>
                      <Text fontSize="xs" color="gray.500">3 clients</Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>

              {/* Analytics Widget */}
              <Box
                position="absolute"
                bottom={0}
                right={0}
                bg="white"
                borderRadius="xl"
                p={6}
                boxShadow="xl"
                w="300px"
                border="1px solid"
                borderColor="gray.200"
              >
                <HStack mb={4}>
                  <Icon as={ChartBarIcon} color="orange.500" w={5} h={5} />
                  <Text fontWeight="semibold" color="gray.800">Performance</Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="orange.600">85%</Text>
                    <Text fontSize="sm" color="gray.600">Client Satisfaction</Text>
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="purple.600">24h</Text>
                    <Text fontSize="sm" color="gray.600">Avg Response Time</Text>
                  </Box>
                </VStack>
              </Box>
            </Box>
          </Box>
        </Flex>
      </Container>

      {/* Features Section */}
      <Box id="features" py={20} bg="white">
        <Container maxW="7xl" px={4}>
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center" maxW="3xl">
              <Heading size="2xl" color="gray.900" fontWeight="bold">
                Powerful Features for Freelancers
              </Heading>
              <Text fontSize="lg" color="gray.600">
                Everything you need to manage your freelance business efficiently
              </Text>
            </VStack>

            <Box w="full">
              <Flex direction={{ base: 'column', lg: 'row' }} gap={8} wrap="wrap">
                {/* Feature 1 */}
                <Box flex="1" minW="300px" p={8} bg="gray.50" borderRadius="xl">
                  <VStack align="start" spacing={4}>
                    <Box p={3} bg="purple.100" borderRadius="lg">
                      <Icon as={CalendarIcon} color="purple.600" w={6} h={6} />
                    </Box>
                    <Heading size="md" color="gray.900">Smart Scheduling</Heading>
                    <Text color="gray.600">
                      Create and manage meetings with recurring appointments,
                      automatic reminders, and flexible time slots.
                    </Text>
                  </VStack>
                </Box>

                {/* Feature 2 */}
                <Box flex="1" minW="300px" p={8} bg="gray.50" borderRadius="xl">
                  <VStack align="start" spacing={4}>
                    <Box p={3} bg="blue.100" borderRadius="lg">
                      <Icon as={UserGroupIcon} color="blue.600" w={6} h={6} />
                    </Box>
                    <Heading size="md" color="gray.900">Client Management</Heading>
                    <Text color="gray.600">
                      Organize clients by service, store contact information,
                      and track client-specific preferences and history.
                    </Text>
                  </VStack>
                </Box>

                {/* Feature 3 */}
                <Box flex="1" minW="300px" p={8} bg="gray.50" borderRadius="xl">
                  <VStack align="start" spacing={4}>
                    <Box p={3} bg="green.100" borderRadius="lg">
                      <Icon as={CurrencyDollarIcon} color="green.600" w={6} h={6} />
                    </Box>
                    <Heading size="md" color="gray.900">Revenue Tracking</Heading>
                    <Text color="gray.600">
                      Monitor your earnings, track payment status,
                      and analyze revenue patterns across different services.
                    </Text>
                  </VStack>
                </Box>

                {/* Feature 4 */}
                <Box flex="1" minW="300px" p={8} bg="gray.50" borderRadius="xl">
                  <VStack align="start" spacing={4}>
                    <Box p={3} bg="orange.100" borderRadius="lg">
                      <Icon as={ChartBarIcon} color="orange.600" w={6} h={6} />
                    </Box>
                    <Heading size="md" color="gray.900">Analytics & Insights</Heading>
                    <Text color="gray.600">
                      Get detailed reports on your business performance,
                      client satisfaction, and growth trends.
                    </Text>
                  </VStack>
                </Box>

                {/* Feature 5 */}
                <Box flex="1" minW="300px" p={8} bg="gray.50" borderRadius="xl">
                  <VStack align="start" spacing={4}>
                    <Box p={3} bg="teal.100" borderRadius="lg">
                      <Icon as={CalendarIcon} color="teal.600" w={6} h={6} />
                    </Box>
                    <Heading size="md" color="gray.900">Calendar View</Heading>
                    <Text color="gray.600">
                      Visual calendar interface with week and day views,
                      drag-to-schedule functionality, and 30-minute time slots.
                    </Text>
                  </VStack>
                </Box>
              </Flex>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* Solutions Section */}
      <Box id="solutions" py={20} bg="gray.50">
        <Container maxW="7xl" px={4}>
          <VStack spacing={16}>
            <VStack spacing={4} textAlign="center" maxW="3xl">
              <Heading size="2xl" color="gray.900" fontWeight="bold">
                Solutions for Every Freelancer
              </Heading>
              <Text fontSize="lg" color="gray.600">
                Whether you're a consultant, designer, or service provider,
                taimr adapts to your workflow
              </Text>
            </VStack>

            <Box w="full">
              <Flex direction={{ base: 'column', lg: 'row' }} gap={8}>
                {/* Solution 1 */}
                <Box flex="1" p={8} bg="white" borderRadius="xl" boxShadow="lg">
                  <VStack align="start" spacing={4}>
                    <Heading size="lg" color="purple.600">Consultants</Heading>
                    <Text color="gray.600" mb={4}>
                      Manage client relationships, schedule strategy sessions,
                      and track project milestones with ease.
                    </Text>
                    <VStack align="start" spacing={2}>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Client session scheduling</Text></HStack>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Progress tracking</Text></HStack>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Revenue analytics</Text></HStack>
                    </VStack>
                  </VStack>
                </Box>

                {/* Solution 2 */}
                <Box flex="1" p={8} bg="white" borderRadius="xl" boxShadow="lg">
                  <VStack align="start" spacing={4}>
                    <Heading size="lg" color="blue.600">Designers</Heading>
                    <Text color="gray.600" mb={4}>
                      Organize design projects, manage client feedback,
                      and track project timelines efficiently.
                    </Text>
                    <VStack align="start" spacing={2}>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Project milestone tracking</Text></HStack>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Client feedback management</Text></HStack>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Time-based billing</Text></HStack>
                    </VStack>
                  </VStack>
                </Box>

                {/* Solution 3 */}
                <Box flex="1" p={8} bg="white" borderRadius="xl" boxShadow="lg">
                  <VStack align="start" spacing={4}>
                    <Heading size="lg" color="green.600">Service Providers</Heading>
                    <Text color="gray.600" mb={4}>
                      Streamline service delivery, manage appointments,
                      and optimize your business operations.
                    </Text>
                    <VStack align="start" spacing={2}>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Appointment scheduling</Text></HStack>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Service catalog management</Text></HStack>
                      <HStack><Icon as={CheckCircleIcon} color="green.500" w={4} h={4} /><Text fontSize="sm">Performance optimization</Text></HStack>
                    </VStack>
                  </VStack>
                </Box>
              </Flex>
            </Box>
          </VStack>
        </Container>
      </Box>



      {/* CTA Section */}
      <Box py={20} bg="purple.600">
        <Container maxW="4xl" px={4}>
          <VStack spacing={8} textAlign="center">
            <Heading size="2xl" color="white" fontWeight="bold">
              Ready to Transform Your Freelance Business?
            </Heading>
            <Text fontSize="lg" color="purple.100" maxW="2xl">
              Join thousands of freelancers who are already using taimr to
              streamline their business and boost their productivity.
            </Text>
            <Button
              as={Link}
              to="/signup"
              size="lg"
              bg="white"
              color="purple.600"
              _hover={{ bg: 'gray.100' }}
              borderRadius="lg"
              px={8}
              py={6}
              fontSize="lg"
              fontWeight="semibold"
            >
              Start Now
            </Button>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
