# Freelancer Management PWA (taimr)

A Progressive Web Application to help freelancers manage services, clients, meetings, and analytics.

## Project Overview

This is a monorepo containing both frontend and backend code for a freelancer management system. The application allows freelancers to:

- Manage their services and pricing
- Organize client relationships
- Schedule and track meetings
- View analytics and performance metrics

## Architecture

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI + Python
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Render

## Project Structure

```
taimr-pwa/
├── frontend/          # React application
│   └── Makefile      # Frontend-specific commands
├── backend/           # FastAPI application
│   └── Makefile      # Backend-specific commands
├── docs/             # Project documentation
├── .gitignore        # Git ignore rules
├── Makefile          # Root orchestrator commands
└── README.md         # This file
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ and UV
- Make (usually pre-installed on Unix systems)

### Quick Start

1. **Install all dependencies:**
   ```bash
   make install
   ```

2. **Start development servers:**
   ```bash
   make dev
   ```

3. **View available commands:**
   ```bash
   make help
   ```

### Available Commands

#### Root Level (from project root)
- `make install` - Install all dependencies
- `make dev` - Start both development servers
- `make build` - Build both frontend and backend
- `make test` - Run all tests
- `make lint` - Run linting on both frontend and backend
- `make format` - Format code in both frontend and backend
- `make clean` - Clean build artifacts

#### Frontend Commands (from `frontend/` directory)
- `make install` - Install frontend dependencies
- `make dev` - Start frontend development server
- `make build` - Build frontend for production
- `make test` - Run frontend tests
- `make lint` - Run frontend linting
- `make format` - Format frontend code
- `make clean` - Clean frontend build artifacts

#### Backend Commands (from `backend/` directory)
- `make install` - Install backend dependencies
- `make dev` - Start backend development server
- `make build` - Build backend (compile check)
- `make test` - Run backend tests
- `make lint` - Run backend linting
- `make format` - Format backend code
- `make clean` - Clean backend artifacts

### Manual Setup (Alternative)

If you prefer to run commands manually:

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```

4. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Configuration

Both frontend and backend require environment variables to be configured. Copy the example files and update with your values:

- `backend/.env.example` → `backend/.env`
- `frontend/.env.example` → `frontend/.env`

## Development Workflow

- Backend API runs on `http://localhost:8000`
- Frontend dev server runs on `http://localhost:5173`
- API documentation available at `http://localhost:8000/docs`

## Contributing

1. Follow the established code style (ESLint + Prettier for frontend, Black + Flake8 for backend)
2. Run pre-commit hooks before committing
3. Use Make commands for consistent development workflow
4. Update documentation as needed

## License

[Add your license here]
