import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, Flex, VStack, Button, HStack, Popover, PopoverTrigger, PopoverContent, PopoverBody, SimpleGrid, IconButton } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Meeting } from '../lib/api';

interface FullCalendarProps {
  meetings: Meeting[];
  onAddMeeting?: () => void;
  onViewMeeting?: (meeting: Meeting) => void;
}

interface TimeSlot {
  hour: number;
  minute: number;
}

interface DayInfo {
  date: Date;
  label: string;
  isToday: boolean;
}

const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 23;
const FULL_DAY_START = 0;
const FULL_DAY_END = 23;
const SLOT_HEIGHT = 40; // px
const VISIBLE_HEIGHT = SLOT_HEIGHT * 2 * (DEFAULT_END_HOUR - DEFAULT_START_HOUR + 1); // 2 slots per hour

const FullCalendar: React.FC<FullCalendarProps> = ({
  meetings,
  onAddMeeting,
  onViewMeeting
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showFullDay, setShowFullDay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);

  const startHour = showFullDay ? FULL_DAY_START : DEFAULT_START_HOUR;
  const endHour = showFullDay ? FULL_DAY_END : DEFAULT_END_HOUR;

  const timeSlots: TimeSlot[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots.push({ hour, minute });
    }
  }

  // Get days for week view
  const getWeekDays = (date: Date): DayInfo[] => {
    const days: DayInfo[] = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const today = new Date();

      days.push({
        date: dayDate,
        label: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dayDate.toDateString() === today.toDateString()
      });
    }
    return days;
  };

  const days = getWeekDays(currentDate);

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateSelect = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
    setIsDatePickerOpen(false);
  };

  // Get current time slot index
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

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const currentTimeY = getCurrentTimeY();
      const offset = currentTimeY - VISIBLE_HEIGHT / 2;
      container.scrollTop = Math.max(offset, 0);
    }
  }, []);

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

  const contentHeight = timeSlots.length * SLOT_HEIGHT;
  const intervalMinutes = (endHour - startHour + 1) * 60;

  const getCurrentTimeY = () => {
    const now = new Date();
    const minutesSinceStart = (now.getHours() - startHour) * 60 + now.getMinutes();
    const clamped = Math.max(0, Math.min(minutesSinceStart, intervalMinutes));
    return (clamped / intervalMinutes) * contentHeight;
  };

  const isCurrentTimeInSlot = (hour: number, minute: number) => {
    const now = new Date();
    return now.getHours() === hour && Math.floor(now.getMinutes() / 30) * 30 === minute;
  };

  // Utility: compare only local date (year, month, day)
  function isSameLocalDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // Filter meetings for the current week (local date only)
  const getFilteredMeetings = () => {
    const startOfWeek = new Date(days[0].date);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(days[6].date);
    endOfWeek.setHours(23, 59, 59, 999);

    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.start_time);
      // Use only the local date for comparison
      return meetingDate >= startOfWeek && meetingDate <= endOfWeek;
    });
  };

  const filteredMeetings = getFilteredMeetings();

  // Calculate meeting position (for vertical placement only)
  const getMeetingPosition = (meeting: Meeting) => {
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);

    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    const intervalStart = startHour * 60;
    const intervalEnd = (endHour + 1) * 60;

    const top = ((startMinutes - intervalStart) / (intervalEnd - intervalStart)) * contentHeight;
    const height = Math.max(10, ((endMinutes - startMinutes) / (intervalEnd - intervalStart)) * contentHeight);

    return { top, height };
  };

  const currentSlotIndex = getCurrentTimeSlotIndex();

  // Generate month and year options for dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Box bg="white" rounded="xl" shadow="md" p={6}>
      {/* Header with navigation */}
      <Flex align="center" justify="space-between" mb={4}>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            onClick={goToPrevious}
            leftIcon={<ChevronLeftIcon style={{ width: 16, height: 16 }} />}
          >
            Previous Week
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={goToNext}
            rightIcon={<ChevronRightIcon style={{ width: 16, height: 16 }} />}
          >
            Next Week
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={resetToToday}
            leftIcon={<CalendarIcon style={{ width: 16, height: 16 }} />}
          >
            This Week
          </Button>
        </HStack>

        <Button
          size="sm"
          colorScheme="purple"
          leftIcon={<PlusIcon style={{ width: 18, height: 18 }} />}
          onClick={onAddMeeting}
        >
          New Meeting
        </Button>
      </Flex>

      {/* Month and Year Display - Centered */}
      <Flex justify="center" mb={4}>
        <Popover
          isOpen={isDatePickerOpen}
          onOpen={() => setIsDatePickerOpen(true)}
          onClose={() => setIsDatePickerOpen(false)}
        >
          <PopoverTrigger>
            <Button
              variant="ghost"
              size="lg"
              rightIcon={<ChevronDownIcon style={{ width: 16, height: 16 }} />}
              _hover={{ bg: 'gray.100' }}
            >
              <Text fontSize="xl" fontWeight="bold" color="gray.700">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent width="300px">
            <PopoverBody p={4}>
              <VStack spacing={4} align="stretch">
                {/* Year Selection */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Year</Text>
                  <SimpleGrid columns={3} spacing={2}>
                    {years.map((year) => (
                      <Button
                        key={year}
                        size="sm"
                        variant={currentDate.getFullYear() === year ? "solid" : "outline"}
                        colorScheme={currentDate.getFullYear() === year ? "purple" : "gray"}
                        onClick={() => {
                          const newDate = new Date(currentDate);
                          newDate.setFullYear(year);
                          setCurrentDate(newDate);
                        }}
                      >
                        {year}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Box>

                {/* Month Selection */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Month</Text>
                  <SimpleGrid columns={3} spacing={2}>
                    {months.map((month, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={currentDate.getMonth() === index ? "solid" : "outline"}
                        colorScheme={currentDate.getMonth() === index ? "purple" : "gray"}
                        onClick={() => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(index);
                          setCurrentDate(newDate);
                        }}
                      >
                        {month}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Box>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>

      {/* Day headers */}
      <Flex mb={2}>
        <Box width="80px" flexShrink={0} />
        {days.map((day, index) => (
          <Box
            key={index}
            flex={1}
            textAlign="center"
            py={2}
            bg={day.isToday ? 'blue.50' : 'transparent'}
            color={day.isToday ? 'blue.700' : 'gray.700'}
            fontWeight={day.isToday ? 'bold' : 'normal'}
            rounded="md"
            mx={1}
          >
            <Text fontSize="xs" fontWeight="medium">{day.label}</Text>
            <Text fontSize="lg" fontWeight="bold">{day.date.getDate()}</Text>
          </Box>
        ))}
      </Flex>

      {/* Calendar grid */}
      <Box
        ref={scrollRef}
        position="relative"
        height={VISIBLE_HEIGHT + 'px'}
        overflowY="auto"
        bg="gray.50"
        rounded="lg"
      >
        {/* Background grid: horizontal lines for each hour interval */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          height={contentHeight + 'px'}
          zIndex={1}
          pointerEvents="none"
        >
          {timeSlots.map((slot, index) => (
            slot.minute === 0 ? (
              <Box
                key={index}
                position="absolute"
                top={(index * SLOT_HEIGHT) + 'px'}
                left={0}
                right={0}
                height="1px"
                bg="gray.200"
              />
            ) : null
          ))}
        </Box>
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
        {/* Time grid and day columns */}
        <Flex position="relative" height={contentHeight + 'px'} zIndex={2}>
          {/* Time labels */}
          <VStack spacing={0} align="stretch" height={contentHeight + 'px'} position="relative" width="80px" flexShrink={0}>
            {timeSlots.map((slot, index) => (
              <Box
                key={index}
                height={SLOT_HEIGHT + 'px'}
                bg={isCurrentTimeInSlot(slot.hour, slot.minute) ? "red.50" : "transparent"}
                ref={index === currentSlotIndex ? currentTimeSlotRef : undefined}
                position="relative"
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
          {/* Day columns */}
          {days.map((day, dayIndex) => (
            <Box
              key={dayIndex}
              flex={1}
              borderLeft={dayIndex === 0 ? undefined : "1px solid"}
              borderColor="gray.200"
              position="relative"
              height={contentHeight + 'px'}
              bg="transparent"
            >
              {/* Meeting blocks for this day */}
              {filteredMeetings.filter(meeting => isSameLocalDay(new Date(meeting.start_time), day.date)).map(meeting => {
                const { top, height } = getMeetingPosition(meeting);
                const meetingDate = new Date(meeting.start_time);
                const meetingEndDate = new Date(meeting.end_time);
                return (
                  <Box
                    key={meeting.id}
                    position="absolute"
                    left={"8px"}
                    right={"8px"}
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
                    onClick={() => onViewMeeting?.(meeting)}
                  >
                    <VStack spacing={1} align="start">
                      <Text fontSize="xs" fontWeight="semibold" color="white">
                        {meeting.title || 'Meeting'}
                      </Text>
                      <Text fontSize="xs" color="white" opacity={0.9}>
                        {meetingDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} – {meetingEndDate.toLocaleTimeString('en-US', {
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
          ))}
        </Flex>
      </Box>
      {/* Show full day / show less button */}
      <Flex justify="center" mt={2}>
        <Button variant="link" size="sm" colorScheme="blue" onClick={() => setShowFullDay(v => !v)}>
          {showFullDay ? 'show less' : 'display full day'}
        </Button>
      </Flex>
    </Box>
  );
};

export default FullCalendar;
