from enum import Enum


class RecurrenceUpdateScope(str, Enum):
    THIS_MEETING_ONLY = "this_meeting_only"
    THIS_AND_FUTURE = "this_and_future"
    ALL_MEETINGS = "all_meetings"

    @classmethod
    def from_str(cls, scope_str: str) -> "RecurrenceUpdateScope":
        """Get RecurrenceUpdateScope from a string (case-insensitive). Raises ValueError if not found."""
        for scope in cls:
            if scope.value.lower() == scope_str.lower():
                return scope
        raise ValueError(f"Invalid RecurrenceUpdateScope: {scope_str}")
