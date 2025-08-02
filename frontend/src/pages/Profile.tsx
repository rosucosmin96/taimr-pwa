import React, { useState, useEffect } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { Box, Flex, Stack, Heading, Text, Button, Avatar, Spinner, Alert, AlertIcon, useToast } from '@chakra-ui/react';
import { apiClient, Profile as UserProfile } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import EditProfileModal from '../components/EditProfileModal';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { resetPassword } = useAuth();
  const toast = useToast();

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

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const handleResetPassword = async () => {
    if (!profile?.email) {
      toast({
        title: 'Error',
        description: 'No email found for password reset',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const { error } = await resetPassword(profile.email);
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send password reset email',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Password Reset Email Sent',
          description: 'Check your email for password reset instructions',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send password reset email',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

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
    <>
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
          <Button
            leftIcon={<PencilSquareIcon style={{ width: 20, height: 20 }} />}
            colorScheme="purple"
            borderRadius="lg"
            mb={2}
            onClick={handleEditProfile}
          >
            Edit Profile
          </Button>
          <Button
            colorScheme="gray"
            borderRadius="lg"
            variant="outline"
            textColor="gray.700"
            fontSize="sm"
            onClick={handleResetPassword}
          >
            Reset Password
          </Button>
        </Box>
      </Stack>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onProfileUpdated={handleProfileUpdated}
      />
    </>
  );
};

export default Profile;
