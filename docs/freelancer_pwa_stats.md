# Stats & Analytics Model

## Overview

This module provides insights into user activity through calculated KPIs, charts, and client-specific breakdowns. All stats are scoped to the authenticated user and use timezone-aware filtering.

---

## Supported Filters

- **Period**:

  - Last 7 days (default)
  - Last 30 days
  - Current month
  - Current year
  - All time
  - Custom date range (start + end)

- **Service**:

  - Dropdown filter by service
  - “All Services” as default

---

## Overview Metrics

- **Total Meetings**: All meetings within filter range
- **Done Meetings**: Status = `done`
- **Canceled Meetings**: Status = `canceled`
- **Total Clients**: Clients with at least one meeting in range
- **Total Revenue**: Sum of `price_total` where status = `done`
- **Total Hours**: Sum of durations (end\_time - start\_time) for `done` meetings

---

## Client Breakdown Table

- **Fields**:

  - Client Name
  - Done Meetings
  - Canceled Meetings
  - Revenue
  - Hours
  - Price per Hour = Revenue / Hours
  - “Stats” button → opens modal for client-specific stats

- **Sorting**: By any column (e.g., most revenue, most hours)

- **Pagination**: Optional (default: show all)

---

## Client Stats Modal

- Includes:
  - List of all meetings for client (with status, duration, revenue)
  - Chart of meeting activity over time
  - Aggregates for client (done, canceled, revenue, hours)

---

## Backend Queries

- Supabase RPC or SQL Views for aggregations
- Indexed `start_time`, `status`, `user_id` to optimize performance

---

## UI Integration

- **Dashboard Page**: Highlights for today’s meetings & revenue
- **Stats Page**: Full analytics with filter controls, charts, and breakdown
- **Calendar Page**: Visual indicator of busy days via badge counts

---
