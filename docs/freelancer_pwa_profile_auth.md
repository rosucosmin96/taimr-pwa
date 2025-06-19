# Profile & Authentication Handling

## Overview
Authentication and user profile management are handled via Supabase's built-in services. This ensures secure, scalable login with minimal custom infrastructure.

---

## Authentication

### Social Login
- Supported providers: Google, GitHub, Apple (others can be enabled via Supabase settings)
- **Flow**:
  1. User clicks "Login with Provider"
  2. Redirects to provider auth
  3. Supabase returns JWT and user profile
  4. Token is stored in localStorage and context

### Token Handling
- Tokens are stored securely in browser storage
- Automatically refreshed using Supabase SDK
- Sent in `Authorization: Bearer <token>` header for all API requests

### Auth State Management
- `AuthContext` provides user session across the app
- Supabase listener updates context on login/logout/token change

---

## Profile Management

### Fields
- `name` (string)
- `email` (read-only, from auth provider)
- `profile_picture_url` (optional, stored via Supabase Storage)

### Endpoints
- `GET /api/v1/profile/` → Returns current user profile
- `PUT /api/v1/profile/` → Updates `name` or `profile_picture_url`
- Password changes handled via Supabase password reset flow

### Profile Picture Upload
- Uses Supabase Storage Bucket (e.g., `avatars`)
- Upload process:
  1. User selects file
  2. Frontend uploads image to Supabase Storage
  3. URL is saved to user profile record

---

## Security
- RLS (Row-Level Security) ensures users can only access their own records
- Supabase JWTs are validated on all API endpoints
- Optional: Email verification enforced at sign-up

---

## UI Integration
- Profile page includes:
  - Name edit field
  - Profile picture uploader
  - Logout button
  - Link to trigger password reset (for email users)

---
This concludes the full-stack MVP documentation. Let me know if you’d like a deployment guide or visual diagrams next.
