import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Radio,
  RadioGroup,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';

interface RecurrenceDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'this_meeting_only' | 'this_and_future' | 'all_meetings') => void;
  meetingTitle: string;
  isRecurring: boolean;
}

const RecurrenceDeleteDialog: React.FC<RecurrenceDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  meetingTitle,
  isRecurring,
}) => {
  const [deleteScope, setDeleteScope] = React.useState<'this_meeting_only' | 'this_and_future' | 'all_meetings'>('this_meeting_only');
  const toast = useToast();

  const handleConfirm = () => {
    onConfirm(deleteScope);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete Meeting</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="start">
            <Alert status="warning">
              <AlertIcon />
              <AlertTitle>Delete Confirmation</AlertTitle>
              <AlertDescription>
                Are you sure you want to delete "{meetingTitle}"?
              </AlertDescription>
            </Alert>

            {isRecurring && (
              <>
                <Text>
                  This meeting is part of a recurring series. How would you like to handle the deletion?
                </Text>

                <RadioGroup value={deleteScope} onChange={(value) => setDeleteScope(value as any)}>
                  <VStack spacing={3} align="start">
                    <Radio value="this_meeting_only">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">Delete this meeting only</Text>
                        <Text fontSize="sm" color="gray.600">
                          Remove only this specific meeting. Other meetings in the series remain unchanged.
                        </Text>
                      </VStack>
                    </Radio>

                    <Radio value="this_and_future">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">Delete this and future meetings</Text>
                        <Text fontSize="sm" color="gray.600">
                          Remove this meeting and all upcoming meetings in the series.
                          Past meetings remain unchanged.
                        </Text>
                      </VStack>
                    </Radio>

                    <Radio value="all_meetings">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">Delete all meetings in the series</Text>
                        <Text fontSize="sm" color="gray.600">
                          Remove all meetings in the series, including past meetings.
                        </Text>
                      </VStack>
                    </Radio>
                  </VStack>
                </RadioGroup>
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={3} variant="ghost">
            Cancel
          </Button>
          <Button colorScheme="red" onClick={handleConfirm}>
            Delete Meeting
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RecurrenceDeleteDialog;
