# Supabase Project Setup (INFRA-001)

## Overview
This document provides step-by-step instructions for creating the Supabase project and obtaining the necessary API keys for the Freelancer PWA.

## Prerequisites
- Supabase account (create at https://supabase.com)
- Access to Supabase dashboard

## Step 1: Create Supabase Project

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in with your account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Fill in project details:
     - **Name**: `freelancer-pwa` (or your preferred name)
     - **Database Password**: Generate a strong password (save this securely)
     - **Region**: Choose closest to your target users
   - Click "Create new project"

3. **Wait for Setup**
   - Project creation takes 2-3 minutes
   - You'll receive an email when ready

## Step 2: Get API Keys

1. **Navigate to API Settings**
   - In your project dashboard, go to Settings → API
   - You'll see two key sections:
     - **Project API keys**
     - **Project URL**

2. **Copy Required Values**
   - **Project URL**: `https://[project-id].supabase.co`
   - **anon public key**: Used by frontend
   - **service_role secret key**: Used by backend (keep secure!)

## Step 3: Configure Environment Variables

1. **Backend Configuration**
   - Copy `backend/.env.example` to `backend/.env`
   - Replace placeholder values with your actual keys:
     ```
     SUPABASE_URL=https://[your-project-id].supabase.co
     SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
     ```

2. **Frontend Configuration**
   - Copy `frontend/.env.example` to `frontend/.env`
   - Replace placeholder values:
     ```
     VITE_SUPABASE_URL=https://[your-project-id].supabase.co
     VITE_SUPABASE_ANON_KEY=[your-anon-key]
     ```

## Step 4: Verify Setup

1. **Test Connection**
   - The backend will test the connection when you run the development server
   - Check the Supabase dashboard for any connection errors

2. **Next Steps**
   - INFRA-002: Configure authentication providers
   - INFRA-003: Set up storage bucket
   - INFRA-007: Configure Supabase client

## Security Notes

- **Never commit `.env` files** to version control
- **Keep service_role key secure** - it has admin privileges
- **Use anon key for frontend** - it has limited permissions
- **Enable Row-Level Security (RLS)** when implementing data access

## Troubleshooting

- **Project not found**: Ensure you're in the correct organization
- **Connection errors**: Verify URL and keys are correct
- **Permission errors**: Check that RLS policies are properly configured

## Related Tasks

- **INFRA-002**: Configure OAuth providers (Google, GitHub, Apple)
- **INFRA-003**: Create storage bucket for avatars
- **INFRA-007**: Set up Supabase client configuration
- **DATA-006**: Create database migration scripts

# Supabase Setup Guide

This guide covers the manual setup tasks required for Epic-2 implementation.

## 1. Authentication Providers Setup

### Enable Social Login Providers

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable the following providers:

#### Google OAuth
- Click **Google** provider
- Enable the provider
- Add your Google OAuth credentials:
  - Client ID
  - Client Secret
- Set authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

#### GitHub OAuth
- Click **GitHub** provider
- Enable the provider
- Add your GitHub OAuth credentials:
  - Client ID
  - Client Secret
- Set authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

#### Apple OAuth
- Click **Apple** provider
- Enable the provider
- Add your Apple OAuth credentials:
  - Client ID
  - Client Secret
- Set authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

## 2. Storage Bucket Setup

### Create Avatar Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Enable
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/*`

### Set Up Storage Policies

Create the following RLS policies for the `avatars` bucket:

#### Policy: Users can upload their own avatar
```sql
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy: Users can view all avatars
```sql
CREATE POLICY "Users can view all avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

#### Policy: Users can update their own avatar
```sql
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy: Users can delete their own avatar
```sql
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 3. Database Schema Setup

### Create Tables

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE public.services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    default_duration_minutes INTEGER NOT NULL,
    default_price_per_hour DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    custom_duration_minutes INTEGER,
    custom_price_per_hour DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurrences table
CREATE TABLE public.recurrences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings table
CREATE TABLE public.meetings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    recurrence_id UUID REFERENCES public.recurrences(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    price_total DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('upcoming', 'done', 'canceled')) DEFAULT 'upcoming',
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Set Up Row Level Security (RLS)

Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
```

### Create RLS Policies

#### Users table policies
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);
```

#### Services table policies
```sql
-- Users can view their own services
CREATE POLICY "Users can view own services" ON public.services
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own services
CREATE POLICY "Users can insert own services" ON public.services
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own services
CREATE POLICY "Users can update own services" ON public.services
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own services
CREATE POLICY "Users can delete own services" ON public.services
FOR DELETE USING (auth.uid() = user_id);
```

#### Clients table policies
```sql
-- Users can view their own clients
CREATE POLICY "Users can view own clients" ON public.clients
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own clients
CREATE POLICY "Users can insert own clients" ON public.clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own clients
CREATE POLICY "Users can update own clients" ON public.clients
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own clients
CREATE POLICY "Users can delete own clients" ON public.clients
FOR DELETE USING (auth.uid() = user_id);
```

#### Recurrences table policies
```sql
-- Users can view their own recurrences
CREATE POLICY "Users can view own recurrences" ON public.recurrences
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own recurrences
CREATE POLICY "Users can insert own recurrences" ON public.recurrences
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recurrences
CREATE POLICY "Users can update own recurrences" ON public.recurrences
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own recurrences
CREATE POLICY "Users can delete own recurrences" ON public.recurrences
FOR DELETE USING (auth.uid() = user_id);
```

#### Meetings table policies
```sql
-- Users can view their own meetings
CREATE POLICY "Users can view own meetings" ON public.meetings
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own meetings
CREATE POLICY "Users can insert own meetings" ON public.meetings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own meetings
CREATE POLICY "Users can update own meetings" ON public.meetings
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own meetings
CREATE POLICY "Users can delete own meetings" ON public.meetings
FOR DELETE USING (auth.uid() = user_id);
```

## 4. Create Indexes

```sql
-- Performance indexes
CREATE INDEX idx_services_user_id ON public.services(user_id);
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_service_id ON public.clients(service_id);
CREATE INDEX idx_recurrences_user_id ON public.recurrences(user_id);
CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_user_start_time ON public.meetings(user_id, start_time);
```

## 5. Environment Variables

Make sure your `.env` files are properly configured:

### Backend (.env)
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SECRET_KEY=your-secret-key-here
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 6. Testing the Setup

### Test Authentication
1. Start the backend server
2. Start the frontend development server
3. Try to sign in with one of the configured providers
4. Verify that the user is created in the `users` table

### Test Storage
1. Try uploading an avatar image
2. Verify it's stored in the `avatars` bucket
3. Verify the URL is accessible

### Test API
1. Make an authenticated request to `/api/v1/health`
2. Verify JWT validation works correctly
