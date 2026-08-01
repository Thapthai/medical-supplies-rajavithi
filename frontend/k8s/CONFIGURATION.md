# ⚙️ Frontend Configuration Guide

คู่มือการตั้งค่า Frontend สำหรับ K8s Deployment

---

## 📋 Environment Variables

### 1. Build-time Variables (ใน Dockerfile)

```dockerfile
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

**ใช้เมื่อ:** Build Docker image  
**ผลกระทบ:** Next.js จะ embed ค่านี้ใน JavaScript bundle

### 2. Runtime Variables (ใน K8s Deployment)

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://10.11.9.84:3000/api/v1"
  - name: NEXTAUTH_URL
    value: "http://10.11.9.84:30100"
  - name: NEXTAUTH_SECRET
    value: "fKwpUMTYNf8bJZ8hJqDwy6KeXfJgkBce9H9gm48VzvU="
```

**ใช้เมื่อ:** Container รัน  
**ผลกระทบ:** Override ค่าที่ build ไว้

---

## 🔧 การแก้ไข Configuration

### วิธีที่ 1: แก้ใน Deployment Scripts (แนะนำ)

**ไฟล์:** `k8s/deploy-first-time.sh` และ `k8s/update-service.sh`

```bash
# แก้บรรทัดนี้
API_URL="http://10.11.9.84:3000/api/v1"
```

**ข้อดี:**
- ✅ แก้ที่เดียว ใช้ได้ทั้ง build และ deploy
- ✅ ไม่ต้องจำคำสั่งยาวๆ
- ✅ สะดวกสำหรับ CI/CD

### วิธีที่ 2: แก้ใน Deployment YAML

**ไฟล์:** `k8s/frontend-deployment.yaml`

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://YOUR_IP:3000/api/v1"  # แก้ตรงนี้
  - name: NEXTAUTH_URL
    value: "http://YOUR_IP:30100"  # แก้ตรงนี้
```

**ข้อดี:**
- ✅ Override ค่าที่ build ไว้
- ✅ ไม่ต้อง rebuild image

**ข้อเสีย:**
- ❌ ต้อง restart deployment ทุกครั้ง

### วิธีที่ 3: แก้ใน Dockerfile

**ไฟล์:** `docker/Dockerfile`

```dockerfile
ARG NEXT_PUBLIC_API_URL=http://YOUR_IP:3000/api/v1
```

**ข้อดี:**
- ✅ เป็น default value

**ข้อเสีย:**
- ❌ ต้อง rebuild ทุกครั้ง

---

## 🎯 Environment Variables ที่สำคัญ

### NEXT_PUBLIC_API_URL

**ค่า:** `http://10.11.9.84:3000/api/v1`

**คำอธิบาย:**
- URL ของ Backend Gateway API
- ใช้สำหรับเรียก REST API
- **ต้องเป็น IP ของ server** (ไม่ใช่ localhost)

**ตัวอย่าง:**
```
Development:  http://localhost:3000/api/v1
Production:   http://10.11.9.84:3000/api/v1
Domain:       https://api.yourdomain.com/api/v1
```

### NEXTAUTH_URL

**ค่า:** `http://10.11.9.84:30100`

**คำอธิบาย:**
- URL ของ Frontend (ที่ user เข้าถึง)
- ใช้สำหรับ NextAuth callback
- **ต้องเป็น IP ของ server** (ไม่ใช่ localhost)

**ตัวอย่าง:**
```
Development:  http://localhost:3001
Production:   http://10.11.9.84:30100
Domain:       https://yourdomain.com
```

### NEXTAUTH_SECRET

**ค่า:** `fKwpUMTYNf8bJZ8hJqDwy6KeXfJgkBce9H9gm48VzvU=`

**คำอธิบาย:**
- Secret key สำหรับ encrypt JWT tokens
- **ห้าม share หรือ commit ใน git**
- ควรเปลี่ยนใน production

**สร้าง secret ใหม่:**
```bash
openssl rand -base64 32
```

---

## 🚀 Quick Reference

### เปลี่ยน API URL

```bash
# 1. แก้ไขใน script
nano k8s/deploy-first-time.sh
nano k8s/update-service.sh

# เปลี่ยนบรรทัด:
API_URL="http://NEW_IP:3000/api/v1"

# 2. รัน update
cd k8s
./update-service.sh
```

### เปลี่ยน Frontend URL

```bash
# 1. แก้ไขใน deployment
nano k8s/frontend-deployment.yaml

# เปลี่ยน:
- name: NEXTAUTH_URL
  value: "http://NEW_IP:30100"

# 2. Apply
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout restart deployment/frontend -n pose-microservices
```

### ตรวจสอบ Environment Variables

```bash
# ดู env ใน pod
kubectl get pods -n pose-microservices | grep frontend
kubectl exec -n pose-microservices POD_NAME -- env | grep -E "NEXT_PUBLIC|NEXTAUTH"
```

---

## ⚠️ ข้อควรระวัง

### 1. ใช้ localhost
❌ **ห้าม:** `http://localhost:3000/api/v1`  
✅ **ใช้:** `http://10.11.9.84:3000/api/v1`

**เหตุผล:** localhost ใน K8s pod หมายถึง pod เอง ไม่ใช่ server

### 2. ลืม /api/v1
❌ **ห้าม:** `http://10.11.9.84:3000`  
✅ **ใช้:** `http://10.11.9.84:3000/api/v1`

**เหตุผล:** Gateway API ใช้ prefix `/api/v1`

### 3. ใช้ port ผิด
❌ **ห้าม:** `http://10.11.9.84:3100` (Frontend port)  
✅ **ใช้:** `http://10.11.9.84:3000` (Gateway port)

### 4. ลืม rebuild หลังแก้ Dockerfile
❌ **ห้าม:** แก้ Dockerfile แล้วไม่ rebuild  
✅ **ใช้:** รัน `./update-service.sh` ทุกครั้ง

---

## 📊 Port Mapping

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Frontend | 3100 | 30100 | `http://10.11.9.84:30100` |
| Gateway | 3000 | 3000 | `http://10.11.9.84:3000` |
| Gateway API | - | - | `http://10.11.9.84:3000/api/v1` |

---

## 🔍 Troubleshooting

### ปัญหา: Cannot POST /api/auth/login

**สาเหตุ:** `NEXT_PUBLIC_API_URL` ไม่ถูกต้อง

**แก้ไข:**
```bash
# ตรวจสอบ env
kubectl exec -n pose-microservices deployment/frontend -- env | grep NEXT_PUBLIC_API_URL

# ถ้าไม่ถูกต้อง rebuild
cd k8s
./update-service.sh
```

### ปัญหา: 401 Unauthorized

**สาเหตุ:** Backend Gateway ไม่ทำงาน หรือ CORS

**แก้ไข:**
```bash
# ตรวจสอบ Gateway
kubectl get pods -n pose-microservices | grep gateway
kubectl logs -n pose-microservices -l app=gateway-api --tail=50
```

### ปัญหา: NextAuth redirect ผิด

**สาเหตุ:** `NEXTAUTH_URL` ไม่ถูกต้อง

**แก้ไข:**
```bash
# ตรวจสอบ
kubectl exec -n pose-microservices deployment/frontend -- env | grep NEXTAUTH_URL

# แก้ไขใน deployment.yaml แล้ว restart
kubectl rollout restart deployment/frontend -n pose-microservices
```

---

**อัพเดทล่าสุด:** 2025-01-21  
**Version:** 1.0.0

