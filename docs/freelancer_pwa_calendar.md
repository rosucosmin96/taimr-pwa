# Calendar & Recurrence Logic Design

## Overview
This document defines how calendar views and recurring meetings are handled in the freelancer PWA. The logic ensures user-friendly scheduling, default values from services/clients, and robust recurrence management.

---

## Calendar UI

### Views
- **Day View**: Column for one day, half-hour breakdown.
- **Week View** *(default)*: 7 columns (Mon–Sun), half-hour breakdown.

### Features
- **Click on slot**: Opens "Add Meeting" modal, pre-fills start time to slot time.
- **Swipe/Arrow Navigation**: Navigate weeks/days forward and backward.
- **Meeting Cards**: Visual blocks sized by duration, color-coded by status.
- **Filter by Service/Client** (optional future enhancement)

---

## Meeting Creation Defaults
- **Start Time**: Next rounded hour (e.g., if it's 16:25 → 17:00)
- **Duration/Price**:
  - Defaults to client-level values (if exist)
  - Fallback to service-level defaults

---

## Recurrence Support

### Recurrence Options
- **Frequencies**:
  - Weekly
  - Biweekly
  - Monthly
- **Fields**:
  - `start_date` (for first meeting)
  - `end_date` (recurrence ends)

### Creation Flow
1. User creates a meeting and enables recurrence
2. Recurrence record is created
3. Individual meeting entries are generated from `start_date` to `end_date` at selected frequency

### Storage
- Meetings are stored as separate entries, each linked to a `recurrence_id`
- Only future meetings are updated or deleted during recurrence operations

---

## Editing Recurrences
- **Edit Single Meeting**: Only that meeting is changed
- **Edit Entire Recurrence**:
  - Updates recurrence metadata
  - Re-generates future meetings from the edited point forward
  - Keeps past meetings unchanged

### Deletion
- **Delete Meeting**:
  - Deletes only the selected meeting by default
  - If "delete recurrence" is checked:
    - Deletes all future meetings with same `recurrence_id` and later `start_time`
    - Deletes recurrence record if no future meetings remain

---

## Recurrence Integrity
- UI disables deletion of recurrence while meetings are active
- Backend ensures transactional consistency (create recurrence + meetings atomically)
- Optional: log original recurrence_id in meeting history for audit

---
Next: Stats & analytics model
