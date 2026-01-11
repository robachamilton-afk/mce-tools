# MCE Tools - Deployment Guide

## Overview

This guide covers deploying the MCE Tools suite to various environments, from self-hosted development to production cloud deployments.

## Deployment Options

### 1. Self-Hosted (Local/Desktop)
- **Best for:** Development, internal testing, small teams
- **Requirements:** Desktop PC with Docker
- **Cost:** Free (hardware you already own)

### 2. Self-Hosted (VPS/Dedicated Server)
- **Best for:** Small to medium production deployments
- **Requirements:** Linux server with Docker
- **Cost:** $10-50/month (DigitalOcean, Linode, etc.)

### 3. Cloud-Hosted (Managed Services)
- **Best for:** Large-scale production, high availability
- **Requirements:** AWS, GCP, or Azure account
- **Cost:** Variable based on usage

## Self-Hosted Deployment (Docker Compose)

### Prerequisites

- Linux server (Ubuntu 22.04 LTS recommended)
- Docker 20.10+ and Docker Compose 2.0+
- Domain name (optional, for HTTPS)
- 4GB+ RAM, 50GB+ storage

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/mce-tools
cd /opt/mce-tools

# Clone repository
git clone https://github.com/robachamilton-afk/mce-tools.git .

# Set permissions
sudo chown -R $USER:$USER /opt/mce-tools
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Production `.env` configuration:**

```env
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=mce_tools
POSTGRES_USER=mce_user
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE_CHANGE_THIS

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD_HERE

# JWT Authentication
JWT_SECRET_KEY=GENERATE_STRONG_SECRET_KEY_MIN_32_CHARS
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Application
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Celery
CELERY_BROKER_URL=redis://:STRONG_REDIS_PASSWORD_HERE@redis:6379/0
CELERY_RESULT_BACKEND=redis://:STRONG_REDIS_PASSWORD_HERE@redis:6379/0

# File Storage
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE_MB=100

# SSL/TLS
SSL_ENABLED=True
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Generate secure secrets:**

```bash
# Generate JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate Redis password
python3 -c "import secrets; print(secrets.token_urlsafe(16))"

# Generate PostgreSQL password
python3 -c "import secrets; print(secrets.token_urlsafe(16))"
```

### Step 4: Set Up SSL/TLS (Optional but Recommended)

**Using Let's Encrypt (free):**

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in /etc/letsencrypt/live/yourdomain.com/
```

**Update Docker Compose for SSL:**

```yaml
# docker/docker-compose.prod.yml
services:
  nginx:
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Step 5: Build and Start Services

```bash
# Build Docker images
docker compose -f docker/docker-compose.prod.yml build

# Start services
docker compose -f docker/docker-compose.prod.yml up -d

# Check status
docker compose -f docker/docker-compose.prod.yml ps
```

### Step 6: Initialize Database

```bash
# Run migrations
docker compose -f docker/docker-compose.prod.yml exec backend alembic upgrade head

# Create admin user
docker compose -f docker/docker-compose.prod.yml exec backend python scripts/create_admin.py
```

### Step 7: Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Step 8: Set Up Automatic Backups

```bash
# Create backup script
sudo nano /opt/mce-tools/scripts/backup.sh
```

```bash
#!/bin/bash
# Backup script for MCE Tools

BACKUP_DIR="/opt/mce-tools/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose -f /opt/mce-tools/docker/docker-compose.prod.yml exec -T postgres \
  pg_dump -U mce_user mce_tools | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/mce-tools/uploads

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /opt/mce-tools/scripts/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
```

Add line:
```
0 2 * * * /opt/mce-tools/scripts/backup.sh >> /var/log/mce-backup.log 2>&1
```

### Step 9: Set Up Auto-Renewal for SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up auto-renewal via systemd timer
# Verify:
sudo systemctl status certbot.timer
```

### Step 10: Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/mce-tools
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend applications
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # File uploads
    client_max_body_size 100M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mce-tools /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Cloud Deployment (AWS Example)

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Application Load Balancer          │
│                    (HTTPS/SSL)                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              ECS Fargate / EKS Cluster              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Backend    │  │   Frontend   │  │  Celery   │ │
│  │  (FastAPI)   │  │   (React)    │  │  Worker   │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              RDS PostgreSQL + ElastiCache           │
└─────────────────────────────────────────────────────┘
```

### Step 1: Set Up RDS PostgreSQL

```bash
# Using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier mce-tools-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version 15.3 \
    --master-username mce_admin \
    --master-user-password STRONG_PASSWORD \
    --allocated-storage 50 \
    --storage-type gp3 \
    --vpc-security-group-ids sg-xxxxx \
    --backup-retention-period 7 \
    --multi-az
```

### Step 2: Set Up ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
    --cache-cluster-id mce-tools-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1 \
    --security-group-ids sg-xxxxx
```

### Step 3: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL

# Build images
docker build -f docker/Dockerfile.backend -t mce-tools-backend .
docker build -f docker/Dockerfile.frontend -t mce-tools-frontend .

# Tag images
docker tag mce-tools-backend:latest YOUR_ECR_URL/mce-tools-backend:latest
docker tag mce-tools-frontend:latest YOUR_ECR_URL/mce-tools-frontend:latest

# Push images
docker push YOUR_ECR_URL/mce-tools-backend:latest
docker push YOUR_ECR_URL/mce-tools-frontend:latest
```

### Step 4: Deploy to ECS

Create ECS task definition and service (see AWS documentation for detailed steps).

## Monitoring & Maintenance

### Health Checks

```bash
# Check service status
docker compose ps

# Check logs
docker compose logs -f backend
docker compose logs -f celery-worker

# Check resource usage
docker stats
```

### Database Maintenance

```bash
# Vacuum database
docker compose exec postgres psql -U mce_user -d mce_tools -c "VACUUM ANALYZE;"

# Check database size
docker compose exec postgres psql -U mce_user -d mce_tools -c "SELECT pg_size_pretty(pg_database_size('mce_tools'));"
```

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose -f docker/docker-compose.prod.yml build

# Restart services (zero-downtime)
docker compose -f docker/docker-compose.prod.yml up -d --no-deps --build backend
```

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL/TLS enabled (HTTPS)
- [ ] Firewall configured (only necessary ports open)
- [ ] Regular backups automated
- [ ] Database backups encrypted
- [ ] Environment variables secured (not in code)
- [ ] JWT secret key is strong and unique
- [ ] PostgreSQL not exposed to public internet
- [ ] Redis password protected
- [ ] Regular security updates applied
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check memory
free -h
```

### Database connection issues

```bash
# Test connection
docker compose exec backend python -c "from shared.database import engine; engine.connect()"

# Check PostgreSQL logs
docker compose logs postgres
```

### Performance issues

```bash
# Check resource usage
docker stats

# Check slow queries
docker compose exec postgres psql -U mce_user -d mce_tools -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team
