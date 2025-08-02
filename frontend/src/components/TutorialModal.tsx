import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  Flex,
  Icon,
  Progress,
  VStack,
  HStack,
} from '@chakra-ui/react';
import {
  WrenchScrewdriverIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TutorialSlide {
  title: string;
  description: string;
  icon: React.ReactElement;
  color: string;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: TutorialSlide[] = [
    {
      title: 'Services',
      description: 'Start by creating your services. Define your offerings, duration, and hourly rates. This is the foundation of your business.',
      icon: <WrenchScrewdriverIcon style={{ width: 48, height: 48 }} />,
      color: 'purple.500',
    },
    {
      title: 'Clients',
      description: 'Add clients to your services. Each client can have custom pricing and duration preferences. Organize your client base efficiently.',
      icon: <UserGroupIcon style={{ width: 48, height: 48 }} />,
      color: 'blue.500',
    },
    {
      title: 'Meetings',
      description: 'Schedule meetings between your services and clients. Track status, payments, and manage recurring appointments.',
      icon: <CalendarDaysIcon style={{ width: 48, height: 48 }} />,
      color: 'green.500',
    },
    {
      title: 'Memberships',
      description: 'Create membership packages for clients who need regular services. Offer bulk pricing and recurring meeting schedules.',
      icon: <CreditCardIcon style={{ width: 48, height: 48 }} />,
      color: 'orange.500',
    },
    {
      title: 'Statistics',
      description: 'Track your business performance with detailed analytics. Monitor revenue, client activity, and meeting statistics to grow your business.',
      icon: <ChartBarIcon style={{ width: 48, height: 48 }} />,
      color: 'teal.500',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const currentSlideData = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">
          Welcome to Your Freelancer PWA!
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6}>
            {/* Progress bar */}
            <Progress value={progress} colorScheme="purple" size="sm" width="100%" />

            {/* Slide content */}
            <Box textAlign="center" py={4}>
              <Flex justify="center" mb={4}>
                <Box
                  p={4}
                  rounded="full"
                  bg={`${currentSlideData.color}20`}
                  color={currentSlideData.color}
                >
                  {currentSlideData.icon}
                </Box>
              </Flex>
              <Text fontSize="xl" fontWeight="bold" mb={3}>
                {currentSlideData.title}
              </Text>
              <Text color="gray.600" lineHeight="tall">
                {currentSlideData.description}
              </Text>
            </Box>

            {/* Slide indicators */}
            <HStack spacing={2} justify="center">
              {slides.map((_, index) => (
                <Box
                  key={index}
                  w={2}
                  h={2}
                  rounded="full"
                  bg={index === currentSlide ? 'purple.500' : 'gray.300'}
                />
              ))}
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleSkip} mr={3}>
            Skip
          </Button>
          <Button
            variant="outline"
            onClick={handlePrevious}
            isDisabled={currentSlide === 0}
            mr={3}
          >
            Previous
          </Button>
          <Button colorScheme="purple" onClick={handleNext}>
            {currentSlide === slides.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TutorialModal;
