import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Meetings from './pages/Meetings';
import Clients from './pages/Clients';
import Memberships from './pages/Memberships';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallback from './components/AuthCallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChakraProvider, Box, Flex, IconButton, Text, useBreakpointValue, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerBody, VStack, Button } from '@chakra-ui/react';
import { apiClient, Profile as UserProfile } from './lib/api';

const navItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Meetings', path: '/meetings' },
  { name: 'Clients', path: '/clients' },
  { name: 'Services', path: '/services' },
  { name: 'Memberships', path: '/memberships' },
  { name: 'Statistics', path: '/stats' },
  { name: 'Calendar', path: '/calendar' },
  { name: 'Notifications', path: '/notifications' },
];

function Sidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user?: UserProfile }) {
  const location = useLocation();
  const { signOut } = useAuth();
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
      <VStack spacing={3}>
        <Flex
          as={Link}
          to="/profile"
          align="center"
          bg={location.pathname === '/profile' ? 'purple.100' : 'gray.100'}
          color={location.pathname === '/profile' ? 'purple.700' : 'gray.700'}
          borderRadius="lg"
          p={2}
          w="full"
          _hover={{ bg: 'purple.50', color: 'purple.700' }}
          transition="background 0.2s"
          onClick={onClose}
        >
          <Box boxSize={8} mr={3}>
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt={user?.name || 'User'}
                style={{ borderRadius: '9999px', width: '100%', height: '100%' }}
              />
            ) : (
              <div
                style={{
                  background: 'purple',
                  color: 'white',
                  borderRadius: '9999px',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.2em',
                  textTransform: 'uppercase',
                }}
              >
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                  : ''}
              </div>
            )}
          </Box>
          <Text fontWeight="medium">{user?.name || 'User'}</Text>
        </Flex>

        <Button
          onClick={signOut}
          variant="outline"
          colorScheme="red"
          size="sm"
          w="full"
        >
          Sign Out
        </Button>
      </VStack>
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
      <DrawerContent maxH="100vh" overflow="hidden">
        <DrawerCloseButton />
        <Flex
          direction="column"
          h="100%"
          maxH="100vh"
          overflow="hidden"
        >
          {/* Scrollable content area */}
          <Box
            flex="1"
            overflowY="auto"
            overflowX="hidden"
            p={4}
            pb={2}
          >
            <Text fontWeight="bold" fontSize="xl" mb={6} pl={2}>
              taimr
            </Text>
            {navLinks}
          </Box>

          {/* Fixed profile section at bottom */}
          <Box
            p={4}
            pt={2}
            borderTop="1px solid"
            borderColor="gray.200"
            bg="white"
            flexShrink={0}
          >
            {profileButton}
          </Box>
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
        {/* Top nav for mobile - Sticky Header */}
        <Flex
          as="header"
          display={{ base: 'flex', md: 'none' }}
          align="center"
          px={4}
          py={3}
          bg="white"
          boxShadow="sm"
          position="sticky"
          top={0}
          zIndex={1000}
          className="sticky-header"
        >
          <IconButton
            aria-label="Open menu"
            icon={<Bars3Icon style={{ width: 24, height: 24 }} />}
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
          />
          <Text ml={4} fontWeight="bold" fontSize={{ base: "lg", sm: "xl" }} className="responsive-heading">
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

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/auth/callback" element={<AuthCallback />} />

    {/* Protected routes */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/services" element={
      <ProtectedRoute>
        <AppLayout>
          <Services />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/meetings" element={
      <ProtectedRoute>
        <AppLayout>
          <Meetings />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/clients" element={
      <ProtectedRoute>
        <AppLayout>
          <Clients />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/memberships" element={
      <ProtectedRoute>
        <AppLayout>
          <Memberships />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/stats" element={
      <ProtectedRoute>
        <AppLayout>
          <Stats />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/calendar" element={
      <ProtectedRoute>
        <AppLayout>
          <Calendar />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/notifications" element={
      <ProtectedRoute>
        <AppLayout>
          <Notifications />
        </AppLayout>
      </ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute>
        <AppLayout>
          <Profile />
        </AppLayout>
      </ProtectedRoute>
    } />

    {/* Default redirect */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <ChakraProvider>
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  </ChakraProvider>
);

export default App;
