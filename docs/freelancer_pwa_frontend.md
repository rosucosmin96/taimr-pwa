# Frontend Architecture & Routing

## Overview

This React-based PWA is structured for scalability and maintainability, using modern React practices including hooks, context for global state, and lazy loading for performance. The design accommodates both mobile and desktop experiences.

## Tech Stack

- **React** (Functional Components + Hooks)
- **React Router** (routing)
- **React Query** or **SWR** (data fetching)
- **TailwindCSS** (UI styling)
- **Day.js** or **date-fns** (datetime handling)
- **Recharts** (for stats visualization)
- **Supabase JS SDK** (auth, DB queries)

---

## Folder Structure

```
/src
 ├── components/       # Reusable UI components
 ├── pages/            # Page-level views
 ├── services/         # API wrappers
 ├── hooks/            # Custom hooks
 ├── context/          # Global state (auth, calendar)
 ├── utils/            # Utility functions
 └── App.tsx           # Root component
```

---

## Routing Structure

Handled by **React Router**:

```
/
├── /dashboard
├── /meetings
├── /clients
├── /services
├── /calendar
├── /stats
├── /profile
```

- Authenticated layout wraps all routes (private routes)
- Popups/modals (e.g. add/edit meeting) are rendered as modal routes or portals

---

## State Management

- **Auth**: Stored in context from Supabase session
- **Meetings/Clients/Services**: Fetched via hooks (e.g., `useMeetings`, `useClients`) with React Query caching
- **Calendar**: Local state for current week/day, timezone conversion

---

## Key Components

- **MeetingFormModal**: Form for creating/editing meetings
- **ClientFormModal**: Add/edit client with service-based defaults
- **ServiceFormModal**: CRUD for services
- **StatsCard**: Small KPI cards (revenue, clients today, etc.)
- **CalendarView**: Week/day toggle, half-hour slots, drag-to-add feature
- **StatsTable**: Breakdown by client with filters

---

## UX Patterns

- All date pickers & time inputs use user-local timezone
- Default meeting start = next rounded hour
- Recurrence checkbox triggers frequency & end date options
- Conditional modals for recurrence edit/delete logic
- Instant UI feedback via optimistic updates

---

## PWA Features

- Service Worker for offline shell (via Vite or Create React App PWA plugin)
- Mobile responsiveness and installable via browser

---
