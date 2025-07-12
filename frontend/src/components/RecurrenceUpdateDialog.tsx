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
} from '@chakra-ui/react';

interface RecurrenceUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'this_meeting_only' | 'this_and_future' | 'all_meetings') => void;
  meetingTitle: string;
}

const RecurrenceUpdateDialog: React.FC<RecurrenceUpdateDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  meetingTitle,
}) => {
  const [updateScope, setUpdateScope] = React.useState<'this_meeting_only' | 'this_and_future' | 'all_meetings'>('this_meeting_only');
  const toast = useToast();

  const handleConfirm = () => {
    onConfirm(updateScope);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Update Recurring Meeting</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="start">
            <Text>
              You're updating "{meetingTitle}" which is part of a recurring series.
              How would you like to apply this change?
            </Text>

            <RadioGroup value={updateScope} onChange={(value) => setUpdateScope(value as any)}>
              <VStack spacing={3} align="start">
                <Radio value="this_meeting_only">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">This meeting only</Text>
                    <Text fontSize="sm" color="gray.600">
                      Update only this specific meeting. Other meetings in the series remain unchanged.
                    </Text>
                  </VStack>
                </Radio>

                <Radio value="this_and_future">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">This and future meetings</Text>
                    <Text fontSize="sm" color="gray.600">
                      Update this meeting and all upcoming meetings in the series.
                      Past meetings remain unchanged.
                    </Text>
                  </VStack>
                </Radio>

                <Radio value="all_meetings">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">All meetings in the series</Text>
                    <Text fontSize="sm" color="gray.600">
                      Update all meetings in the series, including past meetings.
                    </Text>
                  </VStack>
                </Radio>
              </VStack>
            </RadioGroup>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={3} variant="ghost">
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={handleConfirm}>
            Update Meeting
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RecurrenceUpdateDialog;
