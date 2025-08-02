# Freelancer PWA Backend API

A FastAPI-based backend for managing freelancer services, clients, and meetings. Built with Python and designed to work with Supabase for authentication and database management.

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- pip or uv package manager
- Supabase account (for production)

### Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   # Using uv (recommended)
   uv pip install -r requirements.txt

   # Or using pip
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

4. **Start the development server:**
   ```bash
   # Using Makefile
   make dev

   # Or directly with uvicorn
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000`

## 📚 API Documentation

Once the server is running, you can access:
- **Interactive API docs**: http://localhost:8000/docs
- **ReDoc documentation**: http://localhost:8000/redoc

## 🔐 Authentication

All endpoints require authentication using JWT tokens from Supabase. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Note**: For development/testing, you can use `test-token` or any token starting with `mock-` to bypass authentication.

## 📋 API Endpoints

### Health Check

#### GET /health
Check if the API is running.

**Headers:** None required

**Response:**
```json
{
  "status": "healthy"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:8000/health
```

### Services

Manage your freelancer services.

#### GET /services
Get all services for the current user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Web Development",
    "default_duration_minutes": 60,
    "default_price_per_hour": 50.0,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET http://localhost:8000/services \
  -H "Authorization: Bearer test-token"
```

#### POST /services
Create a new service.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Web Development",
  "default_duration_minutes": 60,
  "default_price_per_hour": 50.0
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/services \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Development",
    "default_duration_minutes": 60,
    "default_price_per_hour": 50.0
  }'
```

#### PUT /services/{service_id}
Update an existing service.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Service Name",
  "default_duration_minutes": 90,
  "default_price_per_hour": 75.0
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:8000/services/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Service Name",
    "default_duration_minutes": 90,
    "default_price_per_hour": 75.0
  }'
```

#### DELETE /services/{service_id}
Delete a service.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:8000/services/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token"
```

### Clients

Manage your clients.

#### GET /clients
Get all clients for the current user, optionally filtered by service.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `service_id` (optional): Filter clients by service ID

**cURL Example:**
```bash
# Get all clients
curl -X GET http://localhost:8000/clients \
  -H "Authorization: Bearer test-token"

# Get clients for specific service
curl -X GET "http://localhost:8000/clients?service_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer test-token"
```

#### POST /clients
Create a new client.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "service_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "custom_duration_minutes": 60,
  "custom_price_per_hour": 45.0
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/clients \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "custom_duration_minutes": 60,
    "custom_price_per_hour": 45.0
  }'
```

#### PUT /clients/{client_id}
Update an existing client.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Client Name",
  "email": "updated@example.com",
  "phone": "+0987654321",
  "custom_duration_minutes": 90,
  "custom_price_per_hour": 60.0
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:8000/clients/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Client Name",
    "email": "updated@example.com",
    "phone": "+0987654321",
    "custom_duration_minutes": 90,
    "custom_price_per_hour": 60.0
  }'
```

#### DELETE /clients/{client_id}
Delete a client.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:8000/clients/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token"
```

### Meetings

Manage your meetings and appointments.

#### GET /meetings
Get all meetings for the current user, optionally filtered by status.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`upcoming`, `completed`, `cancelled`)

**cURL Example:**
```bash
# Get all meetings
curl -X GET http://localhost:8000/meetings \
  -H "Authorization: Bearer test-token"

# Get upcoming meetings only
curl -X GET "http://localhost:8000/meetings?status=upcoming" \
  -H "Authorization: Bearer test-token"
```

#### POST /meetings
Create a new meeting.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "service_id": "uuid",
  "client_id": "uuid",
  "recurrence_id": null,
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T11:00:00Z",
  "price_per_hour": 50.0,
  "status": "upcoming",
  "paid": false
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/meetings \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "123e4567-e89b-12d3-a456-426614174000",
    "client_id": "987fcdeb-51a2-43d1-b456-426614174000",
    "recurrence_id": null,
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "price_per_hour": 50.0,
    "status": "upcoming",
    "paid": false
  }'
```

#### PUT /meetings/{meeting_id}
Update an existing meeting.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "start_time": "2024-01-15T14:00:00Z",
  "end_time": "2024-01-15T15:00:00Z",
  "status": "completed",
  "paid": true
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:8000/meetings/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2024-01-15T14:00:00Z",
    "end_time": "2024-01-15T15:00:00Z",
    "status": "completed",
    "paid": true
  }'
```

#### DELETE /meetings/{meeting_id}
Delete a meeting.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:8000/meetings/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token"
```

### Recurrences

Manage recurring meetings.

#### POST /recurrences
Create a new recurrence pattern.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "service_id": "uuid",
  "client_id": "uuid",
  "frequency": "weekly",
  "start_date": "2024-01-15T10:00:00Z",
  "end_date": "2024-03-15T10:00:00Z"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/recurrences \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "123e4567-e89b-12d3-a456-426614174000",
    "client_id": "987fcdeb-51a2-43d1-b456-426614174000",
    "frequency": "weekly",
    "start_date": "2024-01-15T10:00:00Z",
    "end_date": "2024-03-15T10:00:00Z"
  }'
```

#### PUT /recurrences/{recurrence_id}
Update a recurrence pattern (applies to all future meetings).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "frequency": "biweekly",
  "end_date": "2024-04-15T10:00:00Z"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:8000/recurrences/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "frequency": "biweekly",
    "end_date": "2024-04-15T10:00:00Z"
  }'
```

#### DELETE /recurrences/{recurrence_id}
Delete a recurrence pattern.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:8000/recurrences/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token"
```

### Stats

Get analytics and statistics.

#### GET /stats/overview
Get overview statistics.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `period` (optional): Time period (`last7days`, `last30days`, `last90days`)
- `service_id` (optional): Filter by specific service

**Response:**
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

**cURL Example:**
```bash
# Get all stats
curl -X GET http://localhost:8000/stats/overview \
  -H "Authorization: Bearer test-token"

# Get stats for last 7 days
curl -X GET "http://localhost:8000/stats/overview?period=last7days" \
  -H "Authorization: Bearer test-token"

# Get stats for specific service
curl -X GET "http://localhost:8000/stats/overview?service_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer test-token"
```

#### GET /stats/client/{client_id}
Get statistics for a specific client.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**cURL Example:**
```bash
curl -X GET http://localhost:8000/stats/client/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer test-token"
```

### Profile

Manage user profile information.

#### GET /profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**cURL Example:**
```bash
curl -X GET http://localhost:8000/profile \
  -H "Authorization: Bearer test-token"
```

#### PUT /profile
Update user profile.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Freelancer",
  "profile_picture_url": "https://example.com/profile.jpg"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:8000/profile \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Freelancer",
    "profile_picture_url": "https://example.com/profile.jpg"
  }'
```

## 🛠️ Development

### Available Commands

```bash
# Install dependencies
make install

# Start development server
make dev

# Run tests
make test

# Run linting
make lint

# Format code
make format

# Clean artifacts
make clean
```

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Environment Configuration
ENVIRONMENT=dev  # Set to "prod" for production

# Database Configuration
LOCAL_ENVIRONMENT=false

# Application Configuration
APP_NAME=Freelancer PWA API
APP_VERSION=1.0.0
DEBUG=true

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Test Data Setup

For development, you can automatically create test data on startup:

1. **Enable test data creation:**
   ```bash
   # In your .env file
   ENVIRONMENT=dev
   ```

2. **Start the server:**
   ```bash
   make dev
   ```

The server will automatically create:
- 1 test user (ID: `00000000-0000-0000-0000-000000000000`)
- 3 test services (Web Development, Graphic Design, Consulting)
- 3 test clients with different pricing configurations
- 3 test meetings (past, today, and future)

**Important Notes:**
- Test data is only created in development environment (`ENVIRONMENT=dev`)
- Test data creation is idempotent - safe to run multiple times
- You can also manually create test data using: `python init_test_data.py`

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- UUIDs are used for all IDs
- The API uses FastAPI's automatic request/response validation
- CORS is configured to allow all origins in development
- Authentication is currently mocked for development - replace with proper Supabase JWT validation for production

## 🔗 Related Documentation

- [API Specification](../docs/freelancer_pwa_api.md)
- [Database Schema](../docs/freelancer_pwa_schema.md)
- [Deployment Guide](../docs/freelancer_pwa_deployment.md)
