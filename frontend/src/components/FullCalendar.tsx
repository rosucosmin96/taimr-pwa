import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, Flex, VStack, Button, HStack, Popover, PopoverTrigger, PopoverContent, PopoverBody, SimpleGrid, IconButton, useBreakpointValue, Select } from '@chakra-ui/react';
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

  // Responsive breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isWeekView = useBreakpointValue({ base: false, md: true });

  const startHour = showFullDay ? FULL_DAY_START : DEFAULT_START_HOUR;
  const endHour = showFullDay ? FULL_DAY_END : DEFAULT_END_HOUR;

  const timeSlots: TimeSlot[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      timeSlots.push({ hour, minute });
    }
  }

  // Get days for week view or single day for mobile
  const getDays = (date: Date): DayInfo[] => {
    if (isWeekView) {
      // Week view for desktop
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
    } else {
      // Single day view for mobile
      const today = new Date();
      return [{
        date: date,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: date.toDateString() === today.toDateString()
      }];
    }
  };

  const days = getDays(currentDate);

  // Navigation functions - updated for responsive behavior
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (isWeekView) {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (isWeekView) {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
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

  // --- Overlap detection and column assignment ---
  // Given a list of meetings for a day, assign each a column index and total columns
  function assignMeetingColumns(dayMeetings: Meeting[]) {
    // Sort by start time
    const sorted = [...dayMeetings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    // Each item: { meeting, columns: number, col: number }
    const result: Array<{ meeting: Meeting; col: number; columns: number }> = [];
    const active: Array<{ meeting: Meeting; col: number }> = [];

    for (const meeting of sorted) {
      const start = new Date(meeting.start_time).getTime();
      const end = new Date(meeting.end_time).getTime();
      // Remove finished meetings from active
      for (let i = active.length - 1; i >= 0; i--) {
        const aEnd = new Date(active[i].meeting.end_time).getTime();
        if (aEnd <= start) active.splice(i, 1);
      }
      // Find available columns
      const usedCols = new Set(active.map(a => a.col));
      let col = 0;
      while (usedCols.has(col)) col++;
      active.push({ meeting, col });
      // The number of columns is max(active.length, ...)
      result.push({ meeting, col, columns: active.length });
    }
    // After assignment, for each meeting, find the max columns it overlaps with
    // (so all meetings in the same overlap group have the same columns value)
    for (let i = 0; i < result.length; i++) {
      const m = result[i];
      const mStart = new Date(m.meeting.start_time).getTime();
      const mEnd = new Date(m.meeting.end_time).getTime();
      let maxCols = m.columns;
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const n = result[j];
        const nStart = new Date(n.meeting.start_time).getTime();
        const nEnd = new Date(n.meeting.end_time).getTime();
        // If overlap
        if (nStart < mEnd && nEnd > mStart) {
          maxCols = Math.max(maxCols, n.columns);
        }
      }
      m.columns = maxCols;
    }
    return result;
  }

  // Filter meetings for the current view
  const getFilteredMeetings = () => {
    if (isWeekView) {
      // Week view filtering
      const startOfWeek = new Date(days[0].date);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(days[6].date);
      endOfWeek.setHours(23, 59, 59, 999);

      return meetings.filter(meeting => {
        const meetingDate = new Date(meeting.start_time);
        return meetingDate >= startOfWeek && meetingDate <= endOfWeek;
      });
    } else {
      // Single day filtering for mobile
      const startOfDay = new Date(days[0].date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(days[0].date);
      endOfDay.setHours(23, 59, 59, 999);

      return meetings.filter(meeting => {
        const meetingDate = new Date(meeting.start_time);
        return meetingDate >= startOfDay && meetingDate <= endOfDay;
      });
    }
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

  // For date picker state
  const [pickerMonth, setPickerMonth] = useState(currentDate.getMonth());
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  useEffect(() => {
    setPickerMonth(currentDate.getMonth());
    setPickerYear(currentDate.getFullYear());
  }, [isDatePickerOpen, currentDate]);

  return (
    <Box bg="white" rounded="xl" shadow="md" p={{ base: 3, md: 6 }} minW={0} maxW="100%" className="responsive-container">
      {/* Responsive Header with navigation */}
      <VStack spacing={4} mb={4} align="stretch">
        {/* New Meeting button always on top, full width */}
        <Button
          size={{ base: "sm", md: "sm" }}
          colorScheme="purple"
          leftIcon={<PlusIcon style={{ width: 16, height: 16 }} />}
          onClick={onAddMeeting}
          width="100%"
          className="responsive-text"
        >
          New Meeting
        </Button>
        {/* Navigation buttons - always below New Meeting, centered */}
        <Flex width="100%" justify="center" className="responsive-container">
          <HStack spacing={{ base: 1, md: 2 }} flexWrap="wrap" justify="center">
            <Button
              size={{ base: "xs", md: "sm" }}
              variant="outline"
              onClick={goToPrevious}
              leftIcon={<ChevronLeftIcon style={{ width: 14, height: 14 }} />}
              className="responsive-text"
            >
              {isWeekView ? 'Previous Week' : 'Previous Day'}
            </Button>
            <Button
              size={{ base: "xs", md: "sm" }}
              variant="outline"
              onClick={goToNext}
              rightIcon={<ChevronRightIcon style={{ width: 14, height: 14 }} />}
              className="responsive-text"
            >
              {isWeekView ? 'Next Week' : 'Next Day'}
            </Button>
            <Button
              size={{ base: "xs", md: "sm" }}
              variant="outline"
              onClick={resetToToday}
              leftIcon={<CalendarIcon style={{ width: 14, height: 14 }} />}
              className="responsive-text"
            >
              {isWeekView ? 'This Week' : 'Today'}
            </Button>
          </HStack>
        </Flex>
        {/* Month, Year, and Day Display - Centered for day view, month/year for week view */}
        <Flex justify="center">
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
                  {isWeekView
                    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </Button>
            </PopoverTrigger>
            <PopoverContent width="340px">
              <PopoverBody p={4}>
                <VStack spacing={4} align="stretch">
                  {/* Month and Year Dropdowns */}
                  <Flex gap={2} align="center" mb={2}>
                    <Select
                      value={pickerMonth}
                      onChange={e => setPickerMonth(Number(e.target.value))}
                      size="sm"
                      width="auto"
                    >
                      {months.map((month, idx) => (
                        <option key={month} value={idx}>{month}</option>
                      ))}
                    </Select>
                    <Select
                      value={pickerYear}
                      onChange={e => setPickerYear(Number(e.target.value))}
                      size="sm"
                      width="auto"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Select>
                  </Flex>
                  {/* Standard calendar grid for day selection */}
                  <Box>
                    <SimpleGrid columns={7} spacing={1}>
                      {/* Day of week headers */}
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                        <Text key={d} fontSize="xs" fontWeight="bold" textAlign="center">{d}</Text>
                      ))}
                      {/* Days of month */}
                      {(() => {
                        const firstDay = new Date(pickerYear, pickerMonth, 1);
                        const lastDay = new Date(pickerYear, pickerMonth + 1, 0);
                        const daysInMonth = lastDay.getDate();
                        const startWeekDay = firstDay.getDay();
                        const grid: React.ReactNode[] = [];
                        // Empty cells before first day
                        for (let i = 0; i < startWeekDay; i++) {
                          grid.push(<Box key={"empty-" + i} />);
                        }
                        // Days
                        for (let d = 1; d <= daysInMonth; d++) {
                          const isSelected =
                            pickerYear === currentDate.getFullYear() &&
                            pickerMonth === currentDate.getMonth() &&
                            d === currentDate.getDate();
                          grid.push(
                            <Button
                              key={"day-" + d}
                              size="sm"
                              variant={isSelected ? "solid" : "ghost"}
                              colorScheme={isSelected ? "purple" : undefined}
                              onClick={() => {
                                const newDate = new Date(pickerYear, pickerMonth, d);
                                setCurrentDate(newDate);
                                setIsDatePickerOpen(false);
                              }}
                            >
                              {d}
                            </Button>
                          );
                        }
                        return grid;
                      })()}
                    </SimpleGrid>
                  </Box>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Flex>
      </VStack>
      {/* Day headers - only for week view */}
      {isWeekView && (
        <Flex mb={2} className="responsive-container">
          <Box width={{ base: "60px", md: "80px" }} flexShrink={0} />
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
              minW={0}
            >
              <Text fontSize={{ base: "2xs", md: "xs" }} fontWeight="medium" className="responsive-text">{day.label}</Text>
              <Text fontSize={{ base: "sm", md: "lg" }} fontWeight="bold" className="responsive-text">{day.date.getDate()}</Text>
            </Box>
          ))}
        </Flex>
      )}

      {/* Calendar grid */}
      <Box
        ref={scrollRef}
        position="relative"
        height={VISIBLE_HEIGHT + 'px'}
        overflowY="auto"
        overflowX="hidden"
        bg="gray.50"
        rounded="lg"
        className="calendar-container"
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
          <VStack spacing={0} align="stretch" height={contentHeight + 'px'} position="relative" width={{ base: "60px", md: "80px" }} flexShrink={0}>
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
                    left={{ base: "4px", md: "8px" }}
                    top="2px"
                    fontSize={{ base: "2xs", md: "xs" }}
                    color="gray.500"
                    fontWeight="medium"
                    className="responsive-text"
                  >
                    {formatTime(slot.hour, slot.minute)}
                  </Text>
                )}
              </Box>
            ))}
          </VStack>
          {/* Day columns */}
          {days.map((day, dayIndex) => {
            // Assign columns for this day's meetings
            const dayMeetings = filteredMeetings.filter(meeting => isSameLocalDay(new Date(meeting.start_time), day.date));
            const meetingColumns = assignMeetingColumns(dayMeetings);
            return (
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
                {meetingColumns.map(({ meeting, col, columns }) => {
                  const { top, height } = getMeetingPosition(meeting);
                  const meetingDate = new Date(meeting.start_time);
                  const meetingEndDate = new Date(meeting.end_time);
                  // Side-by-side width and offset
                  const widthPercent = 100 / columns;
                  const leftPercent = col * widthPercent;
                  return (
                    <Box
                      key={meeting.id}
                      position="absolute"
                      left={`calc(8px + ${leftPercent}%)`}
                      width={`calc(${widthPercent}% - 16px/${columns})`}
                      right={undefined}
                      top={top + 'px'}
                      height={height + 'px'}
                      bg={getMeetingColor(meeting.status)}
                      rounded="md"
                      p={{ base: 1, md: 2 }}
                      boxShadow="sm"
                      zIndex={5}
                      minHeight={SLOT_HEIGHT + 'px'}
                      cursor="pointer"
                      _hover={{ opacity: 0.8, transform: 'scale(1.02)' }}
                      transition="all 0.2s"
                      onClick={() => onViewMeeting?.(meeting)}
                      overflow="hidden"
                      className="meeting-block"
                    >
                      <VStack spacing={{ base: 0.5, md: 1 }} align="start" h="full" justify="start">
                        <Text
                          fontSize={{ base: "2xs", md: "xs" }}
                          fontWeight="semibold"
                          color="white"
                          noOfLines={1}
                          overflow="hidden"
                          textOverflow="ellipsis"
                          className="responsive-text"
                        >
                          {meeting.title || 'Meeting'}
                        </Text>
                        <Text
                          fontSize={{ base: "2xs", md: "xs" }}
                          color="white"
                          opacity={0.9}
                          noOfLines={1}
                          overflow="hidden"
                          textOverflow="ellipsis"
                          className="responsive-text"
                        >
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
                        <Text
                          fontSize={{ base: "2xs", md: "xs" }}
                          color="white"
                          opacity={0.8}
                          noOfLines={1}
                          overflow="hidden"
                          textOverflow="ellipsis"
                          className="responsive-text"
                        >
                          ${meeting.price_total.toFixed(2)}
                        </Text>
                      </VStack>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
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
