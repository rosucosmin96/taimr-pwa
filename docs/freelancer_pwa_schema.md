# Database Schema & Data Model

## Overview
This schema is designed to support a personal services freelancer PWA. The structure prioritizes efficient querying, integrity of relationships, and ease of enforcing cascading deletions. All timestamps are stored in UTC and converted to local time on the client side.

## Entities & Relationships

### 1. Users
- `id` (UUID, PK)
- `email` (string, unique)
- `name` (string)
- `profile_picture_url` (string, optional)
- `created_at` (timestamp)

Each user owns services, clients, meetings, and recurrences.

### 2. Services
- `id` (UUID, PK)
- `user_id` (UUID, FK → Users.id, ON DELETE CASCADE)
- `name` (string)
- `default_duration_minutes` (int)
- `default_price_per_hour` (decimal)
- `created_at` (timestamp)

Each service can have multiple clients, meetings, and recurrences.

### 3. Clients
- `id` (UUID, PK)
- `user_id` (UUID, FK → Users.id, ON DELETE CASCADE)
- `service_id` (UUID, FK → Services.id, ON DELETE CASCADE)
- `name` (string)
- `email` (string)
- `phone` (string)
- `custom_duration_minutes` (int, nullable)
- `custom_price_per_hour` (decimal, nullable)
- `created_at` (timestamp)

Each client can have multiple meetings and recurrences.

### 4. Recurrences
- `id` (UUID, PK)
- `user_id` (UUID, FK → Users.id, ON DELETE CASCADE)
- `service_id` (UUID, FK → Services.id, ON DELETE CASCADE)
- `client_id` (UUID, FK → Clients.id, ON DELETE CASCADE)
- `frequency` (enum: weekly, biweekly, monthly)
- `start_date` (timestamp)
- `end_date` (timestamp)
- `created_at` (timestamp)

A recurrence links a series of meetings. Deleting a recurrence deletes all associated future meetings.

### 5. Meetings
- `id` (UUID, PK)
- `user_id` (UUID, FK → Users.id, ON DELETE CASCADE)
- `service_id` (UUID, FK → Services.id, ON DELETE CASCADE)
- `client_id` (UUID, FK → Clients.id, ON DELETE CASCADE)
- `recurrence_id` (UUID, FK → Recurrences.id, nullable, ON DELETE SET NULL)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `price_per_hour` (decimal)
- `price_total` (decimal)
- `status` (enum: upcoming, done, canceled)
- `paid` (boolean)
- `created_at` (timestamp)

Meetings may belong to a recurrence or be standalone. Deleting a meeting will not affect the recurrence unless specified.

## Indexes & Performance
- Indexes on `user_id`, `service_id`, `client_id`, `recurrence_id`, and `status` for fast filtering.
- Composite index on (`user_id`, `start_time`) for calendar views.

## Notes on Defaults & Cascading Behavior
- Service and client defaults are copied into meeting creation.
- Updating a recurrence updates all future meetings.
- Deleting an object cascades deletions to all child entities.
- RLS (Row-Level Security) is enforced to isolate user data in Supabase.
