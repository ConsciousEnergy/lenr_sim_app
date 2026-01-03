# LENR Simulation App - Deployment Guide

## Overview

This guide walks you through deploying the LENR Simulation App as a subdirectory on `conscious.energy/lenr-sim-app`.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    conscious.energy (Main Site)                  │
│                         Nginx Server                             │
├─────────────────────────────────────────────────────────────────┤
│  /                    → Main website content                     │
│  /lenr-sim-app/*      → Docker Container (port 8080)             │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container Network                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Nginx      │───▶│   Frontend   │    │   Backend    │       │
│  │  (port 8080) │    │   (React)    │    │  (FastAPI)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                                       ▲                │
│         └───────────────────────────────────────┘                │
│                    /lenr-sim-app/api/*                           │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker and Docker Compose installed on your server
- Access to the conscious.energy server nginx configuration
- Domain DNS already configured (conscious.energy)
- SSL certificate for conscious.energy (Let's Encrypt or similar)

## Deployment Steps

### Step 1: Clone the Repository

```bash
ssh your-user@your-server
cd /opt
git clone https://github.com/your-repo/LENR_SIM_APP.git
cd LENR_SIM_APP
```

### Step 2: Configure Environment Variables

```bash
# Copy the production environment template
cp deploy/.env.production deploy/.env

# Edit the environment file with your settings
nano deploy/.env
```

**Important settings to update:**
- `LENR_JWT_SECRET_KEY`: Generate a secure random string
- `LENR_CORS_ORIGINS`: Ensure your domain is listed
- API URLs if using a different domain

Generate a secure JWT secret:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 3: Build and Start the Application

```bash
cd deploy

# Build the Docker images
docker compose build

# Start the containers in detached mode
docker compose up -d

# Verify containers are running
docker compose ps

# Check logs
docker compose logs -f
```

### Step 4: Configure Main Site Nginx

Add the LENR app proxy configuration to your main site's nginx. 

**Option A: Include the provided configuration**

```bash
# Copy the integration config
sudo cp nginx/main-site-integration.conf /etc/nginx/conf.d/lenr-sim-app.conf

# Or include it in your main site config
```

**Option B: Manually add to your existing server block**

Edit your main nginx configuration (e.g., `/etc/nginx/sites-available/conscious.energy`):

```nginx
# Add upstream definition (outside server block)
upstream lenr_app {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name conscious.energy www.conscious.energy;

    # Your existing SSL and site configuration...

    # Add this location block for LENR Sim App
    location /lenr-sim-app {
        proxy_pass http://lenr_app;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts for physics calculations
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### Step 5: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 6: Verify Deployment

1. **Frontend**: Visit `https://conscious.energy/lenr-sim-app/`
2. **API Health**: Visit `https://conscious.energy/lenr-sim-app/api/health`
3. **API Docs**: Visit `https://conscious.energy/lenr-sim-app/api/docs`

## Management Commands

### View Logs
```bash
cd /opt/LENR_SIM_APP/deploy

# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Update Application
```bash
cd /opt/LENR_SIM_APP

# Pull latest code
git pull origin main

# Rebuild and restart
cd deploy
docker compose build
docker compose up -d
```

### Stop Application
```bash
docker compose down
```

### Stop and Remove Volumes
```bash
# Warning: This removes logs and cached data
docker compose down -v
```

## Troubleshooting

### Application Not Loading

1. Check container status:
   ```bash
   docker compose ps
   ```

2. Check container logs:
   ```bash
   docker compose logs backend
   docker compose logs frontend
   ```

3. Verify nginx proxy:
   ```bash
   curl -I http://localhost:8080/lenr-sim-app/
   ```

### API Errors

1. Check CORS configuration:
   - Verify `LENR_CORS_ORIGINS` includes your domain
   
2. Check backend health:
   ```bash
   curl http://localhost:8080/lenr-sim-app/api/health
   ```

3. Review backend logs:
   ```bash
   docker compose logs -f backend
   ```

### WebSocket Connection Issues

1. Ensure nginx WebSocket headers are configured
2. Check browser console for WebSocket errors
3. Verify the WebSocket URL matches your deployment

### Memory Issues

1. Check memory usage:
   ```bash
   docker stats
   ```

2. Adjust memory limits in `docker-compose.yml`:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 2G
   ```

## Security Checklist

- [ ] SSL certificate configured and valid
- [ ] Strong `LENR_JWT_SECRET_KEY` generated
- [ ] Rate limiting enabled (`LENR_ENABLE_RATE_LIMITING=true`)
- [ ] Secure headers enabled (`LENR_ENABLE_SECURE_HEADERS=true`)
- [ ] HSTS enabled for HTTPS (`LENR_ENABLE_HSTS=true`)
- [ ] Debug mode disabled (`LENR_DEBUG=false`)
- [ ] Container running as non-root user

## Performance Optimization

### Enable Caching
The nginx configuration includes caching for static assets. Verify it's working:
```bash
curl -I https://conscious.energy/lenr-sim-app/static/js/main.js
# Should show Cache-Control header
```

### Increase Workers
Edit `deploy/Dockerfile.backend` to adjust gunicorn workers:
```dockerfile
CMD ["gunicorn", "app.main:app", "--workers", "8", ...]
```

### Monitor Performance
```bash
# View real-time stats
docker stats

# Check API response times
curl -w "@curl-format.txt" https://conscious.energy/lenr-sim-app/api/health
```

## Backup and Recovery

### Backup Logs and Data
```bash
# Backup volumes
docker run --rm -v lenr_backend-logs:/data -v $(pwd):/backup alpine tar czf /backup/logs-backup.tar.gz -C /data .
```

### Restore from Backup
```bash
docker run --rm -v lenr_backend-logs:/data -v $(pwd):/backup alpine tar xzf /backup/logs-backup.tar.gz -C /data
```

## Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/your-repo/LENR_SIM_APP/issues)
2. Review the API documentation at `/lenr-sim-app/api/docs`
3. Contact the development team

---

*Last updated: January 2026*
