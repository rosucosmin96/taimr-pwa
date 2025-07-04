import React, { useState, useEffect } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { Box, Flex, Stack, Heading, Text, Button, Avatar, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { apiClient, Profile as UserProfile } from '../lib/api';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getProfile();
        setProfile(data);
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4} maxW="xl" mx="auto">
        <Heading as="h1" size="lg" mb={4}>Profile</Heading>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" color="purple.500" />
        </Flex>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={8} px={{ base: 2, md: 8 }} py={4} maxW="xl" mx="auto">
        <Heading as="h1" size="lg" mb={4}>Profile</Heading>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={8} px={{ base: 2, md: 8 }} py={4} maxW="xl" mx="auto">
      <Heading as="h1" size="lg" mb={4}>Profile</Heading>
      <Box bg="white" rounded="xl" shadow="md" p={6} display="flex" flexDirection="column" alignItems="center">
        <Avatar
          src={profile?.profile_picture_url}
          name={profile?.name}
          size="2xl"
          borderWidth={4}
          borderColor="purple.100"
          boxShadow="md"
          mb={4}
          bg="purple.500"
        />
        <Text fontSize="2xl" fontWeight="semibold" mb={1}>{profile?.name}</Text>
        <Text color="gray.500" mb={4}>{profile?.email}</Text>
        <Button leftIcon={<PencilSquareIcon style={{ width: 20, height: 20 }} />} colorScheme="purple" borderRadius="lg" mb={2}>
          Edit Profile
        </Button>
        <Button colorScheme="gray" borderRadius="lg" variant="outline" textColor="gray.700" fontSize="sm">
          Reset Password
        </Button>
      </Box>
    </Stack>
  );
};

export default Profile;
