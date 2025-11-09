# Environment Setup Guide

## Overview

This guide helps you set up the environment variables for both backend and frontend.

## Backend Environment Setup

### Step 1: Create Backend .env File

```bash
cd LENR_SIM_APP_v2/backend
```

Create a file named `.env` with the following content:

```env
# LENR Simulation Backend Environment Configuration
# Development Settings

# Application Settings
DEBUG=True
LOG_LEVEL=INFO
APP_NAME="LENR Simulation API"
APP_VERSION="2.0.0"

# Server Configuration
HOST=0.0.0.0
PORT=8001

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Security Settings (CHANGE IN PRODUCTION!)
SECRET_KEY=dev-secret-key-change-in-production-please
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Performance Settings
MAX_WORKERS=4
CACHE_TTL=3600
MAX_CACHE_SIZE=1000

# API Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Logging
LOG_DIR=logs
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5

# Simulation Settings
MAX_SIMULATION_TIME=300
DEFAULT_GRID_RESOLUTION=100

# Feature Flags
ENABLE_CACHING=True
ENABLE_MEMORY_MONITORING=True
ENABLE_PROFILING=False
```

### Quick Command (Windows PowerShell):

```powershell
cd LENR_SIM_APP_v2\backend
@"
DEBUG=True
LOG_LEVEL=INFO
APP_NAME=LENR Simulation API
APP_VERSION=2.0.0
HOST=0.0.0.0
PORT=8001
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SECRET_KEY=dev-secret-key-change-in-production-please
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
MAX_WORKERS=4
CACHE_TTL=3600
MAX_CACHE_SIZE=1000
RATE_LIMIT_PER_MINUTE=60
LOG_DIR=logs
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5
MAX_SIMULATION_TIME=300
DEFAULT_GRID_RESOLUTION=100
ENABLE_CACHING=True
ENABLE_MEMORY_MONITORING=True
ENABLE_PROFILING=False
"@ | Out-File -FilePath .env -Encoding utf8
```

## Frontend Environment Setup

### Step 1: Create Frontend .env File

```bash
cd LENR_SIM_APP_v2/frontend
```

Create a file named `.env` with the following content:

```env
# LENR Simulation Frontend Environment Configuration
# Development Settings

# API Configuration
REACT_APP_API_URL=http://localhost:8001
REACT_APP_API_BASE_URL=http://localhost:8001/api
REACT_APP_WS_URL=ws://localhost:8001/ws

# Application Settings
REACT_APP_NAME="LENR Simulation"
REACT_APP_VERSION="2.0.0"

# Feature Flags
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_3D_VISUALIZATION=true
REACT_APP_ENABLE_REAL_TIME=true

# Performance Settings
REACT_APP_THROTTLE_DELAY=100
REACT_APP_MAX_HISTORY_ITEMS=100

# Visualization Settings
REACT_APP_DEFAULT_PARTICLE_COUNT=1000
REACT_APP_DEFAULT_QUALITY=medium

# Theme Settings
REACT_APP_DEFAULT_THEME=light
```

### Quick Command (Windows PowerShell):

```powershell
cd LENR_SIM_APP_v2\frontend
@"
REACT_APP_API_URL=http://localhost:8001
REACT_APP_API_BASE_URL=http://localhost:8001/api
REACT_APP_WS_URL=ws://localhost:8001/ws
REACT_APP_NAME=LENR Simulation
REACT_APP_VERSION=2.0.0
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_3D_VISUALIZATION=true
REACT_APP_ENABLE_REAL_TIME=true
REACT_APP_THROTTLE_DELAY=100
REACT_APP_MAX_HISTORY_ITEMS=100
REACT_APP_DEFAULT_PARTICLE_COUNT=1000
REACT_APP_DEFAULT_QUALITY=medium
REACT_APP_DEFAULT_THEME=light
"@ | Out-File -FilePath .env -Encoding utf8
```

## Verification

### Verify Backend .env:

```bash
cd LENR_SIM_APP_v2/backend
cat .env  # Linux/Mac
type .env  # Windows
```

### Verify Frontend .env:

```bash
cd LENR_SIM_APP_v2/frontend
cat .env  # Linux/Mac
type .env  # Windows
```

## Important Notes

1. **`.env` files are ignored by git** for security reasons
2. **Never commit .env files** containing real credentials
3. **Change SECRET_KEY** before deploying to production
4. **Update CORS_ORIGINS** with your production domain
5. The ports are:
   - Backend: 8001 (not 8000, to avoid conflicts)
   - Frontend: 3000 (React default)

## Production Settings

For production, update these settings:

### Backend (.env):
- Set `DEBUG=False`
- Generate a secure `SECRET_KEY`
- Update `CORS_ORIGINS` with your domain
- Use a proper database URL
- Enable rate limiting appropriately

### Frontend (.env):
- Set `REACT_APP_ENABLE_DEBUG=false`
- Update API URLs to production endpoints
- Adjust performance settings for production load

## Troubleshooting

### Backend not connecting?
- Check PORT matches in both .env files
- Verify CORS_ORIGINS includes your frontend URL
- Ensure backend is running on the configured port

### Frontend can't reach API?
- Verify REACT_APP_API_URL matches backend PORT
- Check browser console for CORS errors
- Ensure both servers are running

### Environment variables not loading?
- For frontend: Restart the dev server (environment variables are read at build time)
- For backend: Restart the uvicorn server
- Verify .env file names (no .txt extension)

