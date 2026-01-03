# LENR Simulation App - Deployment

This directory contains all the configuration files needed to deploy the LENR Simulation App at `conscious.energy/lenr-sim-app`.

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.production .env
nano .env  # Update with your settings

# 2. Build and start
./scripts/deploy.sh build
./scripts/deploy.sh start

# 3. Verify
./scripts/deploy.sh health
```

## Directory Structure

```
deploy/
├── Dockerfile.frontend      # Frontend Docker build
├── Dockerfile.backend       # Backend Docker build
├── docker-compose.yml       # Main orchestration file
├── .env.production          # Environment template
├── DEPLOYMENT_GUIDE.md      # Detailed deployment guide
├── README.md                # This file
├── nginx/
│   ├── nginx.conf           # Main nginx config
│   ├── conf.d/
│   │   └── lenr-sim-app.conf    # App server config
│   ├── frontend.conf        # Frontend container nginx
│   └── main-site-integration.conf  # Integration snippet
└── scripts/
    └── deploy.sh            # Deployment helper script
```

## Configuration Files

| File | Purpose |
|------|---------|
| `Dockerfile.frontend` | Builds React app with nginx |
| `Dockerfile.backend` | Builds FastAPI with gunicorn |
| `docker-compose.yml` | Defines all services |
| `.env.production` | Production environment template |
| `nginx/` | Nginx configurations |

## Deployment Commands

```bash
# Using the deploy script
./scripts/deploy.sh build     # Build images
./scripts/deploy.sh start     # Start containers
./scripts/deploy.sh stop      # Stop containers
./scripts/deploy.sh restart   # Restart containers
./scripts/deploy.sh logs      # View logs
./scripts/deploy.sh status    # Check status
./scripts/deploy.sh health    # Health check
./scripts/deploy.sh update    # Pull & redeploy

# Direct Docker Compose commands
docker compose build
docker compose up -d
docker compose down
docker compose logs -f
```

## Environment Variables

Key variables to configure in `.env`:

| Variable | Description |
|----------|-------------|
| `LENR_ENVIRONMENT` | `production` |
| `LENR_CORS_ORIGINS` | Allowed origins |
| `LENR_JWT_SECRET_KEY` | Secure random string |
| `REACT_APP_API_BASE_URL` | Full API URL |

## Integration with Main Site

See `nginx/main-site-integration.conf` for the nginx configuration to add to your main site's server block.

## Ports

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| nginx | 80 | 8080 |
| frontend | 80 | - |
| backend | 8000 | - |

## For Full Documentation

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
