# Backend Kubernetes (NestJS Monolith)

ใช้ deploy **Backend Smart Cabinet CU** (NestJS เดี่ยว) บน K3s/Kubernetes

---

## ไฟล์

| ไฟล์ | คำอธิบาย |
|------|----------|
| `backend-deployment.yaml` | Deployment + Service (backend, port 3000, NodePort 30080) |
| `update-service.sh` | สคริปต์ build image ใหม่, import เข้า K3s, rollout restart |
| `README.md` | ไฟล์นี้ |

---

## ขั้นตอน Deploy (ครั้งแรก)

1. **สร้าง namespace** (ถ้ายังไม่มี):

   ```bash
   kubectl create namespace pose-microservices
   ```

2. **Build image** (จากโฟลเดอร์ backend):

   ```bash
   docker build -f docker/Dockerfile -t backend-smart-cabinet:latest .
   ```

3. **Import image เข้า K3s** (กรณีใช้ K3s และ image อยู่ local):

   ```bash
   docker save backend-smart-cabinet:latest | sudo k3s ctr images import -
   ```

4. **แก้ไข env ใน `backend-deployment.yaml`**  
   เปลี่ยนค่า `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` ให้ตรงกับสภาพแวดล้อม (หรือใช้ Secret ดูด้านล่าง)

5. **Apply manifest**:

   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   ```

6. **ตรวจสอบ**:

   ```bash
   kubectl get pods -n pose-microservices -l app=backend
   kubectl get svc -n pose-microservices backend-service
   ```

---

## อัปเดตโค้ด (มี deployment แล้ว)

จากโฟลเดอร์ backend:

```bash
chmod +x k8s/update-service.sh
./k8s/update-service.sh
```

สคริปต์จะ: build image → import เข้า K3s → rollout restart deployment

---

## การเข้าใช้ API

- **ผ่าน Service (ใน cluster):** `http://backend-service.pose-microservices.svc.cluster.local/smart-cabinet-cu/api/v1`
- **ผ่าน NodePort (จากนอก cluster):** `http://<NODE_IP>:30080/smart-cabinet-cu/api/v1`  
  (เช่น health: `http://<NODE_IP>:30080/smart-cabinet-cu/api/v1/health`)

---

## ใช้ Secret แทน env ตายตัว (แนะนำใน production)

1. สร้าง Secret:

   ```bash
   kubectl create secret generic backend-secrets -n pose-microservices \
     --from-literal=database-url='mysql://user:pass@host:3306/db' \
     --from-literal=jwt-secret='your-secret' \
     --from-literal=jwt-refresh-secret='your-refresh-secret'
   ```

2. ใน `backend-deployment.yaml` เปลี่ยน env ของ backend เป็นแบบนี้:

   ```yaml
   env:
     - name: DATABASE_URL
       valueFrom:
         secretKeyRef:
           name: backend-secrets
           key: database-url
     - name: JWT_SECRET
       valueFrom:
         secretKeyRef:
           name: backend-secrets
           key: jwt-secret
     - name: JWT_REFRESH_SECRET
       valueFrom:
         secretKeyRef:
           name: backend-secrets
           key: jwt-refresh-secret
   ```

จากนั้นลบหรือไม่ใช้ `value: "..."` ของสามตัวนี้

---

## Namespace

ใช้ `pose-microservices` ร่วมกับ Frontend ได้ เพื่อให้ Frontend ชี้ `NEXT_PUBLIC_API_URL` ไปที่ Backend (ผ่าน Ingress หรือ NodePort ตามที่ตั้งค่า)
