import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login');
          return;
        }

        if (session) {
          console.log('✅ OAuth callback successful, user authenticated');
          navigate('/dashboard');
        } else {
          console.log('❌ No session found, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Spinner size="xl" color="purple.500" />
        <Text>Processing authentication...</Text>
      </VStack>
    </Box>
  );
};

export default AuthCallback;
