import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Avatar,
  Box,
  Text,
  useToast,
} from '@chakra-ui/react';
import { apiClient, Profile as UserProfile } from '../lib/api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(profile?.name || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(profile?.profile_picture_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Update form when profile changes
  React.useEffect(() => {
    setName(profile?.name || '');
    setProfilePictureUrl(profile?.profile_picture_url || '');
  }, [profile]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedProfile = await apiClient.updateProfile({
        name: name.trim(),
        profile_picture_url: profilePictureUrl.trim() || null,
      });

      onProfileUpdated(updatedProfile);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setName(profile?.name || '');
    setProfilePictureUrl(profile?.profile_picture_url || '');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            {/* Profile Picture Preview */}
            <Box textAlign="center">
              <Avatar
                src={profilePictureUrl || undefined}
                name={name}
                size="xl"
                borderWidth={3}
                borderColor="purple.100"
                boxShadow="md"
                bg="purple.500"
                mb={2}
              />
              <Text fontSize="sm" color="gray.500">
                Profile Picture Preview
              </Text>
            </Box>

            {/* Name Field */}
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                size="lg"
              />
            </FormControl>

            {/* Profile Picture URL Field */}
            <FormControl>
              <FormLabel>Profile Picture URL</FormLabel>
              <Input
                value={profilePictureUrl}
                onChange={(e) => setProfilePictureUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                size="lg"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Leave empty to use default avatar
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText="Updating..."
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditProfileModal;
