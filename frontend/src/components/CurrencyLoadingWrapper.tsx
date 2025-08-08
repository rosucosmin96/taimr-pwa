import React from 'react';
import { Box, Spinner, Text, Center } from '@chakra-ui/react';
import { useProfile } from '../contexts/ProfileContext';

interface CurrencyLoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}

export const CurrencyLoadingWrapper: React.FC<CurrencyLoadingWrapperProps> = ({
  children,
  fallback,
  showError = true
}) => {
  const { profile, loading, error } = useProfile();

  if (loading) {
    return fallback || (
      <Center minH="200px">
        <Box textAlign="center">
          <Spinner size="lg" color="purple.500" mb={4} />
          <Text color="gray.600">Loading profile...</Text>
        </Box>
      </Center>
    );
  }

  if (error && showError) {
    return (
      <Center minH="200px">
        <Box textAlign="center">
          <Text color="red.500" mb={2}>Failed to load profile</Text>
          <Text color="gray.600" fontSize="sm">
            Please refresh the page to try again
          </Text>
        </Box>
      </Center>
    );
  }

  if (!profile) {
    return (
      <Center minH="200px">
        <Box textAlign="center">
          <Text color="gray.500">No profile data available</Text>
        </Box>
      </Center>
    );
  }

  return <>{children}</>;
};
