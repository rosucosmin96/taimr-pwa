# Deployment Guide

## Overview
This guide details the deployment strategy for the Freelancer Management PWA using Render for hosting and Supabase for backend services (database, authentication, storage).

---

## 1. Prerequisites
- GitHub repository with monorepo structure:
  - `/frontend/` (React PWA)
  - `/backend/` (Python FastAPI/Flask)
- Supabase project set up
- Render account linked to GitHub

---

## 2. Supabase Setup
1. **Create project** at [supabase.com](https://supabase.com)
2. **Configure database schema** using SQL editor or Supabase CLI:
   - Apply schema from the Database Schema document
3. **Enable RLS** and set policies to restrict access by `user_id`
4. **Enable Authentication**:
   - Turn on social providers (Google, GitHub, Apple)
   - Set redirect URLs to your hosted frontend (e.g., `https://your-app.onrender.com`)
5. **Create storage bucket** `avatars` for profile pictures
6. **Save your keys**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Render Deployment

### A. Backend (Python API)
1. Create new Web Service in Render:
   - Repo path: `/backend`
   - Environment: Python
2. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Other config like `PYTHON_ENV=production`
3. Expose API on a public route (e.g., `/api/`)
4. Use Gunicorn or Uvicorn for serving FastAPI app

### B. Frontend (React PWA)
1. Create another Web Service in Render:
   - Repo path: `/frontend`
   - Build command: `npm install && npm run build`
   - Start command: `serve -s build`
2. Environment variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_API_URL` (pointing to backend)

---

## 4. CI/CD
- Enable auto-deploy from `main` branch
- PR previews optional but useful for staging
- Supabase handles migrations via dashboard or CLI

---

## 5. Domain & HTTPS
- Use Render’s custom domain feature to map your domain
- Render auto-provisions SSL (Let’s Encrypt)

---

## 6. Monitoring & Logging
- Use Render’s built-in logs for debugging
- Supabase Dashboard offers usage metrics and query insights

---

## 7. Cost Optimization
- Use Render’s free tier or lowest paid dynos for MVP
- Supabase free tier supports 500 MB DB, 2 GB storage, 50K monthly users
- Offload static hosting to Netlify/Vercel if needed for frontend

---

## Summary
This guide ensures fast, scalable deployment with minimal ops overhead by combining Render and Supabase. Adjust resource allocations as the app grows.
