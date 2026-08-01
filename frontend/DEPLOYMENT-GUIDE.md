# 🚀 POSE Frontend Deployment Guide

Complete guide for deploying the POSE Frontend using Docker and K3s.

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [K3s/K8s Deployment](#k3sk8s-deployment)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The POSE Frontend is built with:
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

**Deployment Options:**
1. Local Development (npm)
2. Docker Compose
3. K3s/K8s

---

## Prerequisites

### **For Local Development**
- Node.js 20+
- npm or yarn

### **For Docker Deployment**
- Docker
- Docker Compose (optional)

### **For K3s Deployment**
- K3s installed
- kubectl configured
- Backend services running

---

## 🔧 Local Development

### **1. Install Dependencies**
```bash
cd frontend
npm install
```

### **2. Setup Environment**
```bash
# Copy environment template
cp .env.example .env.local

# Edit configuration
nano .env.local
```

**Example `.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
```

### **3. Start Development Server**
```bash
# Using npm
npm run dev

# Using Makefile
make dev
```

**Access:** http://localhost:3001

---

## 🐳 Docker Deployment

### **Option 1: Using Makefile** (Recommended)

```bash
# Setup
make setup

# Production mode
make prod

# Development mode
make up ENV=dev

# View logs
make logs ENV=prod

# Stop
make down ENV=prod
```

### **Option 2: Using Docker Compose**

```bash
# Production
docker-compose -f docker/docker-compose.yml up -d --build

# Development
docker-compose -f docker/docker-compose.dev.yml up -d --build

# Stop
docker-compose -f docker/docker-compose.yml down
```

### **Option 3: Using Docker Directly**

```bash
# Build image
docker build -f docker/Dockerfile -t frontend-pose:latest .

# Run container
docker run -d \
  -p 3100:3100 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3000/api \
  --name pose-frontend \
  frontend-pose:latest

# Stop container
docker stop pose-frontend
docker rm pose-frontend
```

**Access:** http://localhost:3100

---

## ☸️ K3s/K8s Deployment

### **Full Workflow** (Recommended)

```bash
cd frontend

# One command deployment
make full-deploy
```

This will:
1. Build Docker image
2. Import to K3s
3. Deploy to K3s

### **Step-by-Step Process**

#### **1. Build Docker Image**
```bash
docker build -f docker/Dockerfile -t frontend-pose:latest .

# Or
make k8s-build
```

#### **2. Import to K3s**
```bash
docker save frontend-pose:latest | sudo k3s ctr images import -

# Or
make k8s-import

# Verify
sudo k3s ctr images ls | grep frontend-pose
```

#### **3. Configure Deployment**

Edit `k8s/frontend-deployment.yaml`:

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://10.11.9.84:3000/api"  # ⚠️ Update to your Gateway IP
```

#### **4. Deploy to K3s**
```bash
kubectl apply -f k8s/frontend-deployment.yaml

# Or
make k8s-deploy
```

#### **5. Verify Deployment**
```bash
# Check pods
kubectl get pods -n pose-microservices -l app=frontend

# Check service
kubectl get svc -n pose-microservices frontend-service

# Or
make k8s-status
```

#### **6. Access Frontend**

```bash
# Via NodePort
http://<SERVER_IP>:30100

# Via LoadBalancer
http://<LOADBALANCER_IP>

# Or check with
kubectl get svc -n pose-microservices frontend-service
```

---

## 🔄 Update Workflow

### **Local Development**
```bash
git pull origin main
npm install
npm run dev
```

### **Docker**
```bash
git pull origin main
make up-build ENV=prod
```

### **K3s**
```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
make k8s-build
make k8s-import
make k8s-restart

# Or one command
make full-deploy

# Verify
make k8s-status
```

---

## ⚙️ Configuration

### **Environment Variables**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API Gateway URL | `http://localhost:3000/api` | ✅ Yes |
| `NODE_ENV` | Node environment | `production` | No |
| `PORT` | Server port | `3100` | No |

### **Development**
Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### **Production (K3s)**
Edit `k8s/frontend-deployment.yaml`:
```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://10.11.9.84:3000/api"
```

### **Next.js Configuration**

The `next.config.js` is already configured for Docker:
```javascript
module.exports = {
  output: 'standalone',  // For Docker deployment
  images: {
    unoptimized: true,   // For standalone mode
  },
}
```

---

## 📊 Resource Requirements

### **Development**
- RAM: 512MB+
- CPU: 1 core
- Disk: 500MB

### **Production (Docker)**
- RAM: 256MB+
- CPU: 0.5 core
- Disk: 200MB

### **Production (K3s)**
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. Build fails with "Cannot find module"**
```bash
# Clear cache
rm -rf .next node_modules package-lock.json

# Reinstall
npm install

# Rebuild
npm run build
```

#### **2. API calls return 404**
```bash
# Check NEXT_PUBLIC_API_URL
echo $NEXT_PUBLIC_API_URL

# In K3s
kubectl exec -n pose-microservices -l app=frontend -- env | grep NEXT_PUBLIC

# Update if wrong
# Edit k8s/frontend-deployment.yaml or .env.local
```

#### **3. Port 3100 already in use**
```bash
# Check what's using the port
sudo lsof -i :3100

# Kill the process
kill <PID>

# Or change port
PORT=3101 npm start
```

#### **4. Pod stuck in Pending (K3s)**
```bash
# Check events
kubectl describe pod -n pose-microservices -l app=frontend

# Common causes:
# - Insufficient resources
# - Image not found

# Solution: Reduce resource requests
# Edit k8s/frontend-deployment.yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
```

#### **5. Pod in CrashLoopBackOff**
```bash
# Check logs
kubectl logs -n pose-microservices -l app=frontend --tail=100

# Common causes:
# - Application error
# - Missing environment variables

# Fix and restart
kubectl delete pod -n pose-microservices -l app=frontend
```

#### **6. Cannot access frontend in K3s**
```bash
# Check service
kubectl get svc -n pose-microservices frontend-service

# Check if LoadBalancer IP assigned
# If EXTERNAL-IP shows <pending>, use NodePort instead:
http://<SERVER_IP>:30100
```

### **Debug Commands**

```bash
# Check build
npm run build

# Check type errors
npm run type-check

# Check linting
npm run lint

# Docker build test
docker build -f docker/Dockerfile -t test:latest .

# K3s pod shell access
kubectl exec -it -n pose-microservices -l app=frontend -- sh

# View all logs
kubectl logs -n pose-microservices -l app=frontend --all-containers=true
```

---

## 🔍 Monitoring

### **Health Checks**

```bash
# Local
curl http://localhost:3100

# Docker
make health

# K3s
kubectl get pods -n pose-microservices -l app=frontend
```

### **Logs**

```bash
# Docker
docker logs pose-frontend -f
make logs ENV=prod

# K3s
kubectl logs -n pose-microservices -l app=frontend -f
make k8s-logs
```

### **Resource Usage**

```bash
# Docker
docker stats pose-frontend

# K3s
kubectl top pods -n pose-microservices -l app=frontend
```

---

## 🎯 Production Checklist

### **Pre-deployment**
- [ ] Update `NEXT_PUBLIC_API_URL` to production Gateway
- [ ] Test build locally (`npm run build`)
- [ ] Review resource limits
- [ ] Check backend is running

### **Deployment**
- [ ] Build image successfully
- [ ] Import to K3s (if using K3s)
- [ ] Deploy to K3s
- [ ] Pod status: Running
- [ ] Service accessible

### **Post-deployment**
- [ ] Test frontend access
- [ ] Test API calls (open browser console)
- [ ] Check logs for errors
- [ ] Monitor resource usage
- [ ] Test key user flows (login, CRUD)

---

## 📚 Additional Documentation

- **[docker/README.md](docker/README.md)** - Docker configuration details
- **[k8s/README.md](k8s/README.md)** - K3s deployment guide
- **[Next.js Docs](https://nextjs.org/docs)** - Next.js documentation

---

## 🛠️ Makefile Commands

```bash
# Show all commands
make help

# Development
make dev              # Start dev server
make setup            # Setup environment

# Docker
make build            # Build image
make up ENV=prod      # Start production
make down             # Stop
make logs             # View logs
make clean            # Cleanup

# K3s
make k8s-build        # Build image
make k8s-import       # Import to K3s
make k8s-deploy       # Deploy
make k8s-restart      # Restart
make k8s-status       # Show status
make k8s-logs         # View logs
make full-deploy      # Full workflow

# Health
make health           # Check health
```

---

## 🚀 Quick Start Summary

### **Development**
```bash
npm install
cp .env.example .env.local
npm run dev
```

### **Docker**
```bash
make prod
```

### **K3s**
```bash
make full-deploy
```

---

**Happy Deploying! 🎉**

