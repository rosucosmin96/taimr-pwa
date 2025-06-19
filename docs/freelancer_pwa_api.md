# Backend API Specification

## Overview

The backend API uses RESTful principles and is built with Python (FastAPI preferred for async support). Supabase handles authentication and database access, using JWTs for secure requests.

All endpoints are prefixed with `/api/v1/`. Authentication is required for all endpoints (except `/auth/*`).

---

## 1. Authentication (Handled by Supabase)

- **Endpoint**: `/auth/*`
- **Methods**: Supabase SDK manages sign-up, login, social logins, password reset.
- **Notes**: JWT tokens required for API access, validated on each request.

---

## 2. Services

- `GET /api/v1/services/`
- `POST /api/v1/services/`
- `PUT /api/v1/services/{id}`
- `DELETE /api/v1/services/{id}`

**Payload (POST/PUT)**:

```json
{
  "name": "string",
  "default_duration_minutes": 60,
  "default_price_per_hour": 50.0
}
```

---

## 3. Clients

- `GET /api/v1/clients/?service_id={id}`
- `POST /api/v1/clients/`
- `PUT /api/v1/clients/{id}`
- `DELETE /api/v1/clients/{id}`

**Payload (POST/PUT)**:

```json
{
  "service_id": "UUID",
  "name": "string",
  "email": "string",
  "phone": "string",
  "custom_duration_minutes": 60,
  "custom_price_per_hour": 45.0
}
```

---

## 4. Meetings

- `GET /api/v1/meetings/?status=upcoming`
- `POST /api/v1/meetings/`
- `PUT /api/v1/meetings/{id}`
- `DELETE /api/v1/meetings/{id}`

**Payload (POST/PUT)**:

```json
{
  "service_id": "UUID",
  "client_id": "UUID",
  "recurrence_id": "UUID|null",
  "start_time": "ISO 8601 timestamp",
  "end_time": "ISO 8601 timestamp",
  "price_per_hour": 50.0,
  "status": "upcoming",
  "paid": false
}
```

---

## 5. Recurrences

- `POST /api/v1/recurrences/`
- `PUT /api/v1/recurrences/{id}` (applies changes to all future meetings)
- `DELETE /api/v1/recurrences/{id}`

**Payload (POST)**:

```json
{
  "service_id": "UUID",
  "client_id": "UUID",
  "frequency": "weekly|biweekly|monthly",
  "start_date": "ISO 8601",
  "end_date": "ISO 8601"
}
```

---

## 6. Stats

- `GET /api/v1/stats/overview?period=last7days&service_id=...`
- `GET /api/v1/stats/client/{client_id}`

**Response** (overview):

```json
{
  "total_meetings": 10,
  "done_meetings": 8,
  "canceled_meetings": 2,
  "total_clients": 5,
  "total_revenue": 400.0,
  "total_hours": 12
}
```

---

## 7. Profile

- `GET /api/v1/profile/`
- `PUT /api/v1/profile/`

**Payload (PUT)**:

```json
{
  "name": "string",
  "profile_picture_url": "string"
}
```

---

## Security

- JWT from Supabase must be passed in Authorization header: `Bearer <token>`
- RLS in Supabase restricts access to rows based on user\_id

---
