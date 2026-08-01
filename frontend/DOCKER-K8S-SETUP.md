# 🚀 Frontend Docker & K8s Setup Summary

Quick reference guide for deploying POSE Frontend.

---

## 📦 What's Included

```
frontend/
├── docker/
│   ├── Dockerfile                 # Multi-stage production Dockerfile
│   ├── docker-compose.yml         # Production compose
│   ├── docker-compose.dev.yml     # Development compose
│   └── README.md                  # Docker documentation
│
├── k8s/
│   ├── frontend-deployment.yaml   # K8s deployment & service
│   └── README.md                  # K8s deployment guide
│
├── Makefile                       # Automation commands
├── DEPLOYMENT-GUIDE.md            # Complete deployment guide
├── .dockerignore                  # Docker build exclusions
├── .env.example                   # Environment template
└── next.config.js                 # ✅ Configured for standalone
```

---

## ⚡ Quick Commands

### **Local Development**
```bash
npm run dev
# or
make dev
```

### **Docker Production**
```bash
make prod
```

### **K3s Full Deployment**
```bash
make full-deploy
```

---

## 🎯 Three Deployment Methods

### **1️⃣ Local Development**
```bash
# Setup
npm install
cp .env.example .env.local

# Start
npm run dev
# Access: http://localhost:3001
```

### **2️⃣ Docker Compose**
```bash
# Production
docker-compose -f docker/docker-compose.yml up -d --build
# Access: http://localhost:3100

# Development
docker-compose -f docker/docker-compose.dev.yml up -d --build
# Access: http://localhost:3001
```

### **3️⃣ K3s/K8s**
```bash
# Build image
docker build -f docker/Dockerfile -t frontend-pose:latest .

# Import to K3s
docker save frontend-pose:latest | sudo k3s ctr images import -

# Deploy
kubectl apply -f k8s/frontend-deployment.yaml

#ลบ pod แล้วให้มันสร้างใหม่
kubectl delete pod -n pose-microservices --all

# Access: http://<SERVER_IP>:30100
```

---

## 🔧 Configuration

### **Environment Variables**

**Local (`.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**K3s (`k8s/frontend-deployment.yaml`):**
```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://10.11.9.84:3000/api"  # ⚠️ Update this!
```

---

## 📊 Resource Requirements

| Environment | RAM | CPU | Disk |
|-------------|-----|-----|------|
| Development | 512MB | 1 core | 500MB |
| Production (Docker) | 256MB | 0.5 core | 200MB |
| Production (K3s) | 128-512MB | 0.1-0.5 core | 200MB |

---

## 🔍 Monitoring

```bash
# Docker
docker logs pose-frontend -f
make logs ENV=prod

# K3s
kubectl logs -n pose-microservices -l app=frontend -f
make k8s-logs

# Health check
make health
```

---

## 🐛 Troubleshooting

### **Build Issues**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### **API Issues**
```bash
# Check API URL
echo $NEXT_PUBLIC_API_URL  # Local
kubectl exec -n pose-microservices -l app=frontend -- env | grep NEXT_PUBLIC  # K3s
```

### **K3s Pod Issues**
```bash
# Check status
kubectl get pods -n pose-microservices -l app=frontend

# View logs
kubectl logs -n pose-microservices -l app=frontend

# Restart
kubectl delete pod -n pose-microservices -l app=frontend
```

---

## 📚 Documentation

- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Complete deployment guide
- **[docker/README.md](docker/README.md)** - Docker configuration details
- **[k8s/README.md](k8s/README.md)** - K8s deployment guide

---

## ✅ Production Checklist

- [ ] Update `NEXT_PUBLIC_API_URL` to production Gateway
- [ ] Build image successfully
- [ ] Import to K3s (if using K3s)
- [ ] Deploy to K3s
- [ ] Pod running (1/1 Ready)
- [ ] Service accessible
- [ ] API calls work (check browser console)
- [ ] No errors in logs

---

## 🎉 Quick Start

### **For Docker:**
```bash
cd frontend
make prod
```

### **For K3s:**
```bash
cd frontend
make full-deploy
```

**That's it!** 🚀

---

## 🆘 Need Help?

1. Check logs: `make k8s-logs` or `make logs`
2. Review pod status: `kubectl get pods -n pose-microservices`
3. Check documentation in `DEPLOYMENT-GUIDE.md`
4. Verify backend is running first

---

**Happy Deploying! 🎯**

