# Freelancer PWA – System Overview

## Purpose
This application is a Progressive Web App (PWA) designed to help personal service freelancers manage clients, services, and appointments, track business performance, and maintain control over recurring meetings. The platform aims to be lightweight, cost-efficient, and user-friendly, accessible on both desktop and mobile.

---

## MVP Features & Capabilities

### Core Functionalities
- **User Authentication**: Social login via Google, GitHub, Apple (via Supabase)
- **Dashboard**: Daily overview with meeting stats, revenue, and calendar preview
- **Meetings Management**:
  - Create, update, delete meetings
  - Set meeting status: upcoming, done, canceled
  - Mark meetings as paid/unpaid
  - Recurring meeting support: weekly, biweekly, monthly
  - Price calculation by duration × hourly rate
- **Clients Management**:
  - Add, update, remove clients per service
  - Store contact info and client-specific defaults
- **Services Management**:
  - Add/update services with default duration and rate
- **Calendar View**:
  - Week and day views with 30-minute slots
  - Tap-to-schedule functionality with auto-filled defaults
- **Statistics & Analytics**:
  - Total meetings, revenue, hours, client count
  - Filter by period and service
  - Client breakdown: revenue, hours, meeting status
- **User Profile**:
  - Update name, upload profile picture
  - Password reset (via Supabase)

---

## System Architecture

### High-Level Components
- **Frontend**: React PWA (served statically)
- **Backend**: Python (FastAPI recommended)
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage)
- **Hosting**: Render (two-service deployment: one for frontend, one for backend)

### Component Interaction
1. **User visits frontend** → React app loads (from Render static hosting)
2. **User signs in** → Supabase Auth returns a JWT
3. **User requests data** (meetings, stats, etc.) → React calls backend API with JWT
4. **Backend processes request** → Validates user via Supabase, fetches/modifies data
5. **Supabase** executes queries via SQL or RPC, enforces Row-Level Security (RLS)
6. **Data returned to frontend** → Displayed through UI components

---

## Technologies Used
- **Languages**: JavaScript/TypeScript (Frontend), Python (Backend), SQL (Supabase)
- **Libraries**:
  - Frontend: React, React Router, TailwindCSS, React Query/SWR, Recharts, date-fns
  - Backend: FastAPI (or Flask), Supabase Python client
  - Auth/Storage/DB: Supabase
- **Deployment**: Render.com

---

## Key Modules
- **Authentication**: Social login via Supabase (Google, GitHub, Apple)
- **Clients**: Manage contact info and service preferences
- **Services**: Define pricing and duration defaults
- **Meetings**: Schedule appointments with recurrence and payment tracking
- **Calendar**: Visual weekly/day view with drag-to-schedule
- **Dashboard**: Daily stats + quick action shortcuts
- **Stats**: Advanced filters, KPI cards, and client breakdown tables
- **Profile**: Update name, avatar, and initiate password reset

---

## User Flows

### Onboarding Flow
1. User logs in using a social provider
2. System initializes user profile
3. User creates a service
4. User adds a client under that service
5. User schedules a meeting using defaults

### Scheduling Flow
1. User opens calendar or meeting page
2. Clicks empty slot or “Add Meeting”
3. Selects service → client list filters automatically
4. Default fields populate from client → user adjusts
5. Enables recurrence if needed
6. Saves meeting → backend stores it, recurrence logic generates future entries

### Stats Flow
1. User navigates to “Stats” page
2. Selects period and service filters
3. KPI summary + client breakdown rendered
4. Can open modal for individual client stats

---

## Summary
The Freelancer PWA is a modular, secure, and cost-effective application built with a modern tech stack. It supports all core functions of a freelance service business, from scheduling to performance analytics, with a fully responsive UI and robust recurrence management.
