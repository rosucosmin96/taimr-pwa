import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Meetings from './pages/Meetings';
import Clients from './pages/Clients';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import { ChakraProvider, Box, Flex, IconButton, Text, useBreakpointValue, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerBody, VStack } from '@chakra-ui/react';
import { apiClient, Profile as UserProfile } from './lib/api';

const navItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Meetings', path: '/meetings' },
  { name: 'Clients', path: '/clients' },
  { name: 'Services', path: '/services' },
  { name: 'Statistics', path: '/stats' },
  { name: 'Calendar', path: '/calendar' },
];

function Sidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user?: UserProfile }) {
  const location = useLocation();
  const isDesktop = useBreakpointValue({ base: false, md: true });
  const navLinks = (
    <VStack align="stretch" spacing={1} mt={4}>
      {navItems.map((item) => (
        <Box
          as={Link}
          to={item.path}
          key={item.path}
          px={6}
          py={3}
          borderRadius="lg"
          fontWeight="medium"
          bg={location.pathname === item.path ? 'purple.100' : 'transparent'}
          color={location.pathname === item.path ? 'purple.700' : 'gray.700'}
          _hover={{ bg: 'gray.100', color: 'purple.700' }}
          transition="background 0.2s"
          onClick={onClose}
        >
          {item.name}
        </Box>
      ))}
    </VStack>
  );

  const profileButton = (
    <Box mt={8} px={4}>
      <Flex
        as={Link}
        to="/profile"
        align="center"
        bg={location.pathname === '/profile' ? 'purple.100' : 'gray.100'}
        color={location.pathname === '/profile' ? 'purple.700' : 'gray.700'}
        borderRadius="lg"
        p={2}
        _hover={{ bg: 'purple.50', color: 'purple.700' }}
        transition="background 0.2s"
        onClick={onClose}
      >
        <Box boxSize={8} mr={3}>
          <img src={user?.profile_picture_url || 'https://randomuser.me/api/portraits/men/32.jpg'} alt={user?.name || 'User'} style={{ borderRadius: '9999px', width: '100%', height: '100%' }} />
        </Box>
        <Text fontWeight="medium">{user?.name || 'User'}</Text>
      </Flex>
    </Box>
  );

  if (isDesktop) {
    return (
      <Flex
        as="nav"
        w="64"
        minH="100vh"
        bg="white"
        boxShadow="lg"
        p={4}
        direction="column"
        justify="space-between"
        display={{ base: 'none', md: 'flex' }}
        position="fixed"
        left={0}
        top={0}
        zIndex={100}
      >
        <Box>
          <Text fontWeight="bold" fontSize="xl" mb={6} pl={2}>
            taimr
          </Text>
          {navLinks}
        </Box>
        {profileButton}
      </Flex>
    );
  }

  return (
    <Drawer isOpen={open} placement="left" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <Flex direction="column" minH="100vh" justify="space-between">
          <Box p={4}>
            <Text fontWeight="bold" fontSize="xl" mb={6} pl={2}>
              taimr
            </Text>
            {navLinks}
          </Box>
          {profileButton}
        </Flex>
      </DrawerContent>
    </Drawer>
  );
}

type AppLayoutProps = React.PropsWithChildren<{}>;

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | undefined>(undefined);
  useEffect(() => {
    apiClient.getProfile().then(setUser).catch(() => setUser(undefined));
  }, []);
  return (
    <Flex minH="100vh" bg="gray.50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <Flex direction="column" flex="1" ml={{ base: 0, md: '64' }}>
        {/* Top nav for mobile */}
        <Flex
          as="header"
          display={{ base: 'flex', md: 'none' }}
          align="center"
          px={4}
          py={3}
          bg="white"
          boxShadow="sm"
        >
          <IconButton
            aria-label="Open menu"
            icon={<Bars3Icon style={{ width: 24, height: 24 }} />}
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
          />
          <Text ml={4} fontWeight="bold" fontSize="lg">
            taimr
          </Text>
        </Flex>
        <Box as="main" flex="1" p={{ base: 4, md: 8 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};

const App: React.FC = () => (
  <ChakraProvider>
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  </ChakraProvider>
);

export default App;
