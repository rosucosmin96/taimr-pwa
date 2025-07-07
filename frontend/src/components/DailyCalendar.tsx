import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, Flex, VStack, Button, Icon } from '@chakra-ui/react';
import { Meeting } from '../lib/api';
import MeetingModal from './MeetingModal';
import MeetingViewModal from './MeetingViewModal';

interface DailyCalendarProps {
  meetings: Meeting[];
}

interface TimeSlot {
  hour: number;
  minute: number;
}

const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 23;
const FULL_DAY_START = 0;
const FULL_DAY_END = 23;
const SLOT_HEIGHT = 40; // px
const VISIBLE_HOURS = 8;
const VISIBLE_HEIGHT = SLOT_HEIGHT * 2 * VISIBLE_HOURS; // 2 slots per hour

const DailyCalendar: React.FC<DailyCalendarProps> = ({ meetings }) => {
  const [showFullDay, setShowFullDay] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);
  const LEFT_MARGIN = 80;
  const COLUMN_GAP = 8;
  const [containerWidth, setContainerWidth] = useState(600);
  const calendarRef = useRef<HTMLDivElement>(null);

  const startHour = showFullDay ? FULL_DAY_START : DEFAULT_START_HOUR;
  const endHour = showFullDay ? FULL_DAY_END : DEFAULT_END_HOUR;

  const timeSlots: TimeSlot[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots.push({ hour, minute });
    }
  }

  // Find the index of the current time slot
  const getCurrentTimeSlotIndex = () => {
    const now = new Date();
    for (let i = 0; i < timeSlots.length; i++) {
      if (
        timeSlots[i].hour === now.getHours() &&
        Math.floor(now.getMinutes() / 30) * 30 === timeSlots[i].minute
      ) {
        return i;
      }
    }
    return 0;
  };

  useEffect(() => {
    // Scroll to the current time slot on mount or when interval changes
    if (scrollRef.current && currentTimeSlotRef.current) {
      const container = scrollRef.current;
      const slot = currentTimeSlotRef.current;
      // Center the slot in the visible area
      const offset = slot.offsetTop - VISIBLE_HEIGHT / 2 + SLOT_HEIGHT;
      container.scrollTop = Math.max(offset, 0);
    }
  }, [showFullDay]);

  useEffect(() => {
    if (calendarRef.current) {
      setContainerWidth(calendarRef.current.offsetWidth);
    }
  }, [showFullDay]);

  const getMeetingColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'yellow.400';
      case 'done':
        return 'green.400';
      case 'canceled':
        return 'red.400';
      default:
        return 'gray.400';
    }
  };

  const formatTime = (hour: number, minute: number) => {
    const time = new Date();
    time.setHours(hour, minute, 0, 0);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // The full height of the scrollable content (all slots)
  const contentHeight = timeSlots.length * SLOT_HEIGHT;
  const intervalMinutes = (endHour - startHour + 1) * 60;

  // Get the Y position (in px) for the current time line
  const getCurrentTimeY = () => {
    const now = new Date();
    const minutesSinceStart = (now.getHours() - startHour) * 60 + now.getMinutes();
    // Clamp to visible interval
    const clamped = Math.max(0, Math.min(minutesSinceStart, intervalMinutes));
    return (clamped / intervalMinutes) * contentHeight;
  };

  // Helper: convert time to minutes since start of day, handling midnight correctly
  function timeToMinutes(date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // If hours is 0, it's midnight (next day), so treat as 24:00
    return hours === 0 ? 24 * 60 + minutes : hours * 60 + minutes;
  }

  // Filter meetings to only those that overlap with the visible interval
  const filteredMeetings = meetings.filter((meeting) => {
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);
    const meetingStart = timeToMinutes(startTime);
    const meetingEnd = timeToMinutes(endTime);
    const intervalStart = startHour * 60;
    const intervalEnd = (endHour + 1) * 60; // exclusive
    // Show if any part of the meeting is within the visible interval
    return meetingEnd > intervalStart && meetingStart < intervalEnd;
  });

  // Helper: get clipped start/end for visible interval (in minutes)
  function getClippedMeetingPositionPx(meeting: Meeting) {
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);
    let startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);
    const intervalStart = startHour * 60;
    const intervalEnd = (endHour + 1) * 60; // exclusive
    // Clip to visible interval
    startMinutes = Math.max(intervalStart, startMinutes);
    endMinutes = Math.min(intervalEnd, endMinutes);
    // Convert to offset within visible interval
    const top = ((startMinutes - intervalStart) / (intervalEnd - intervalStart)) * contentHeight;
    const height = Math.max(10, ((endMinutes - startMinutes) / (intervalEnd - intervalStart)) * contentHeight);
    return { top, height };
  }

  const isCurrentTimeInSlot = (hour: number, minute: number) => {
    const now = new Date();
    return now.getHours() === hour && Math.floor(now.getMinutes() / 30) * 30 === minute;
  };

  const currentSlotIndex = getCurrentTimeSlotIndex();

  // Helper: for each meeting, determine its column index and max overlaps during its visible interval
  function getMeetingColumnsDynamicPrecise(meetings: Meeting[]) {
    // Sort by start time for stability
    const sorted = [...meetings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const meetingToColumn: Record<string, { col: number; colCount: number }> = {};
    // For each meeting, find all meetings that overlap with it at its visible start
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      const mStart = new Date(m.start_time).getTime();
      const mEnd = new Date(m.end_time).getTime();
      // Find all meetings that overlap with m at its visible start
      const overlapsAtStart = sorted.filter((n, j) => {
        if (i === j) return false;
        const nStart = new Date(n.start_time).getTime();
        const nEnd = new Date(n.end_time).getTime();
        return nStart <= mStart && nEnd > mStart;
      });
      // Include self
      const group = [...overlapsAtStart, m];
      // Sort group by start time, then by id for stability
      group.sort((a, b) => {
        const sa = new Date(a.start_time).getTime();
        const sb = new Date(b.start_time).getTime();
        if (sa !== sb) return sa - sb;
        return a.id.localeCompare(b.id);
      });
      // Assign column index within group
      const col = group.findIndex(x => x.id === m.id);
      // For width: find max number of overlaps at any point during m's visible interval
      let maxCols = group.length;
      for (let t = mStart + 1; t < mEnd; t += 5 * 60 * 1000) { // every 5 minutes
        const overlaps = sorted.filter(n => {
          if (n.id === m.id) return false;
          const nStart = new Date(n.start_time).getTime();
          const nEnd = new Date(n.end_time).getTime();
          return nStart < t && nEnd > t;
        });
        maxCols = Math.max(maxCols, overlaps.length + 1);
      }
      meetingToColumn[m.id] = { col, colCount: maxCols };
    }
    return meetingToColumn;
  }

  const meetingColumns = getMeetingColumnsDynamicPrecise(filteredMeetings);

  return (
    <Box bg="white" rounded="xl" shadow="md" p={6}>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontWeight="semibold" fontSize="lg">Today's Schedule</Text>
        <Button leftIcon={<Icon viewBox="0 0 20 20" boxSize={4}><path fill="currentColor" d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z"/></Icon>} size="sm" colorScheme="purple" variant="solid" onClick={() => setIsModalOpen(true)}>
          New Meeting
        </Button>
      </Flex>
      <Box
        ref={calendarRef}
        position="relative"
        height={VISIBLE_HEIGHT + 'px'}
        overflowY="auto"
        bg="gray.50"
        rounded="lg"
      >
        {/* Current time indicator */}
        <Box
          position="absolute"
          left="0"
          right="0"
          top={getCurrentTimeY() + 'px'}
          height="2px"
          bg="red.500"
          zIndex={10}
        />
        {/* Time slots */}
        <VStack spacing={0} align="stretch" height={contentHeight + 'px'} position="relative">
          {timeSlots.map((slot, index) => (
            <Box
              key={index}
              height={SLOT_HEIGHT + 'px'}
              borderBottom="1px solid"
              borderColor="gray.200"
              position="relative"
              bg={isCurrentTimeInSlot(slot.hour, slot.minute) ? "red.50" : "transparent"}
              ref={index === currentSlotIndex ? currentTimeSlotRef : undefined}
            >
              {slot.minute === 0 && (
                <Text
                  position="absolute"
                  left="8px"
                  top="2px"
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="medium"
                >
                  {formatTime(slot.hour, slot.minute)}
                </Text>
              )}
            </Box>
          ))}
        </VStack>
        {/* Meeting blocks */}
        {filteredMeetings.map((meeting) => {
          const { top, height } = getClippedMeetingPositionPx(meeting);
          const startTime = new Date(meeting.start_time);
          const endTime = new Date(meeting.end_time);
          const colInfo = meetingColumns[meeting.id] || { col: 0, colCount: 1 };
          const availableWidth = Math.max(0, containerWidth - LEFT_MARGIN);
          const colWidth = colInfo.colCount > 0 ? (availableWidth - (colInfo.colCount - 1) * COLUMN_GAP) / colInfo.colCount : availableWidth;
          const leftOffset = LEFT_MARGIN + colInfo.col * (colWidth + COLUMN_GAP);
          return (
            <Box
              key={meeting.id}
              position="absolute"
              left={leftOffset + 'px'}
              width={colWidth + 'px'}
              top={top + 'px'}
              height={height + 'px'}
              bg={getMeetingColor(meeting.status)}
              rounded="md"
              p={2}
              boxShadow="sm"
              zIndex={5}
              minHeight={SLOT_HEIGHT + 'px'}
              cursor="pointer"
              _hover={{ opacity: 0.8, transform: 'scale(1.02)' }}
              transition="all 0.2s"
              onClick={() => {
                setSelectedMeeting(meeting);
                setIsViewModalOpen(true);
              }}
            >
              <VStack spacing={1} align="start">
                <Text fontSize="xs" fontWeight="semibold" color="white">
                  {meeting.title || 'Meeting'}
                </Text>
                <Text fontSize="xs" color="white" opacity={0.9}>
                  {startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })} - {endTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
                <Text fontSize="xs" color="white" opacity={0.8}>
                  ${meeting.price_total.toFixed(2)}
                </Text>
              </VStack>
            </Box>
          );
        })}
      </Box>
      <Flex justify="center" mt={2}>
        <Button variant="link" size="sm" colorScheme="blue" onClick={() => setShowFullDay(v => !v)}>
          {showFullDay ? 'show less' : 'display full day'}
        </Button>
      </Flex>
      <MeetingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => window.location.reload()} />
      <MeetingViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedMeeting(null);
        }}
        onSuccess={() => window.location.reload()}
        meeting={selectedMeeting}
      />
    </Box>
  );
};

export default DailyCalendar;
