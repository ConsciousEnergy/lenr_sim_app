# LENR Simulation App - Troubleshooting Guide

**Version:** 0.2.1-beta  
**Last Updated:** January 2026

---

## Common Issues and Solutions

### Infrastructure Issues

#### Terraform Errors

**Error: "Provider not found"**
```bash
# Solution: Reinitialize Terraform
cd infrastructure/terraform
terraform init -upgrade
```

**Error: "API token invalid"**
- Verify Cloudflare/Hostinger API tokens are correct
- Check token permissions match requirements
- Regenerate token if expired

**Error: "VPS provisioning failed"**
- Check Hostinger account has available quota
- Verify VPS plan ID is correct
- Check data center ID is valid

#### Ansible Connection Issues

**Error: "Host unreachable"**
```bash
# Test SSH manually
ssh -i ~/.ssh/lenr-sim-deploy root@VPS_IP

# If fails, check:
# 1. VPS is running (check Hostinger dashboard)
# 2. Firewall allows SSH (port 22)
# 3. SSH key is correct in inventory.yml
```

**Error: "Permission denied"**
- Ensure SSH key has correct permissions: `chmod 600 ~/.ssh/lenr-sim-deploy`
- Verify key is added to VPS (check Terraform output)

---

### Docker Issues

#### Services Not Starting

**Check service status:**
```bash
docker stack services lenr-sim
docker service ps lenr-sim_backend --no-trunc
```

**Common causes:**
1. **Image not found:** Ensure Docker image is pushed to GHCR
2. **Secrets missing:** Verify Docker secrets exist: `docker secret ls`
3. **Network issues:** Check overlay network: `docker network ls`

**View detailed logs:**
```bash
docker service logs lenr-sim_backend --tail 100
docker service logs lenr-sim_traefik --tail 100
```

#### Container Crashes

**Check container logs:**
```bash
docker service logs lenr-sim_backend --tail 50 -f
```

**Common causes:**
- Database connection failed (check DATABASE_URL)
- Missing environment variables
- Port conflicts
- Resource limits exceeded

**Restart service:**
```bash
docker service update --force lenr-sim_backend
```

---

### SSL Certificate Issues

#### Certificate Not Issued

**Symptoms:**
- HTTPS returns connection error
- Traefik logs show ACME errors

**Solutions:**
1. **Wait 2-5 minutes** - Let's Encrypt needs time
2. **Check Traefik logs:**
   ```bash
   docker service logs lenr-sim_traefik | grep -i acme
   ```
3. **Verify DNS:** Ensure `api.conscious.energy` points to VPS IP
4. **Check port 80:** Must be open for HTTP challenge

**Manual certificate check:**
```bash
curl -vI https://api.conscious.energy 2>&1 | grep -i certificate
```

#### Certificate Expired

**Renew manually:**
```bash
# Restart Traefik to trigger renewal
docker service update --force lenr-sim_traefik
```

---

### Database Issues

#### Connection Refused

**Check PostgreSQL is running:**
```bash
docker service ps lenr-sim_postgres
docker service logs lenr-sim_postgres --tail 50
```

**Verify connection string:**
- Check DATABASE_URL in docker-stack.yml.j2
- Ensure postgres_password secret exists
- Verify network connectivity

#### Backup Fails

**Error: "Container not found"**
```bash
# Find container ID
docker ps -q -f name=lenr-sim_postgres

# Manual backup
docker exec <container_id> pg_dump -U lenr_app lenr_sim | gzip > backup.sql.gz
```

---

### Application Issues

#### API Returns 502/503

**Check backend health:**
```bash
curl https://api.conscious.energy/api/health
```

**Possible causes:**
1. Backend service down: `docker service ps lenr-sim_backend`
2. Traefik routing issue: Check service labels
3. Network connectivity: Verify overlay network

#### Frontend Can't Connect to API

**Check CORS configuration:**
- Verify CORS_ORIGINS includes frontend domain
- Check browser console for CORS errors

**Test API directly:**
```bash
curl -H "Origin: https://conscious.energy" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://api.conscious.energy/api/health
```

---

### Performance Issues

#### High Memory Usage

**Check resource usage:**
```bash
docker stats
docker service ps lenr-sim_backend --no-trunc
```

**Solutions:**
- Scale down replicas: `docker service scale lenr-sim_backend=1`
- Increase VPS resources (upgrade plan)
- Optimize application code

#### Slow Response Times

**Check service logs for errors:**
```bash
docker service logs lenr-sim_backend --tail 100 | grep -i error
```

**Monitor Traefik:**
- Access dashboard: `https://traefik.conscious.energy`
- Check request rates and response times

---

## Diagnostic Commands

### System Health Check

```bash
# SSH to server
ssh -i ~/.ssh/lenr-sim-deploy root@VPS_IP

# Check Docker
docker info
docker node ls  # Swarm status

# Check services
docker stack services lenr-sim
docker stack ps lenr-sim

# Check resources
df -h  # Disk space
free -h  # Memory
top  # CPU/Memory usage
```

### Network Diagnostics

```bash
# Check Docker networks
docker network ls
docker network inspect lenr-sim-network

# Test connectivity
docker exec $(docker ps -q -f name=lenr-sim_backend) curl http://postgres:5432
```

### Log Analysis

```bash
# All backend logs
docker service logs lenr-sim_backend --tail 500

# Search for errors
docker service logs lenr-sim_backend 2>&1 | grep -i error

# Real-time monitoring
docker service logs lenr-sim_backend -f
```

---

## Recovery Procedures

### Complete Service Restart

```bash
# Remove stack
docker stack rm lenr-sim

# Wait for cleanup
sleep 30

# Redeploy
cd /opt/lenr-sim
docker stack deploy -c docker-stack.yml lenr-sim
```

### Database Recovery

```bash
# Stop services
docker service scale lenr-sim_backend=0

# Restore from backup
gunzip < backup.sql.gz | docker exec -i $(docker ps -q -f name=postgres) psql -U lenr_app lenr_sim

# Restart services
docker service scale lenr-sim_backend=2
```

### Full Infrastructure Rebuild

```bash
# Destroy infrastructure
cd infrastructure/terraform
terraform destroy

# Recreate
terraform apply
```

---

## Getting Help

1. **Check logs first:** Most issues are visible in service logs
2. **Review documentation:** [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Contact support:** diadon@conscious.energy

---

**Troubleshooting Guide maintained by:** LENR Simulation Platform Development Team
