# Frontend Docker — Smart Cabinet CU

ใช้ build และรัน **Frontend Smart Cabinet CU** (Next.js) ด้วย Docker  
ตัวแปร environment **อ้างอิงจาก [frontend/.env.example](../.env.example)**

---

## โครงสร้าง

```
docker/
├── README.md              # ไฟล์นี้
├── Dockerfile              # Multi-stage (deps → builder → production)
├── docker-compose.yml     # Production
└── docker-compose.dev.yml  # Development (mount src, npm run dev)
```

---

## ตัวแปรจาก .env.example

คัดลอกเป็น `.env` หรือ `.env.local` ในโฟลเดอร์ frontend:

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|--------|----------|----------|
| `NEXTAUTH_SECRET` | Secret สำหรับ NextAuth | (ค่าจาก .env.example) |
| `NEXTAUTH_URL` | URL หน้าแอปที่ใช้เข้าถึง (รวม basePath) | `http://localhost:4100/smart-cabinet-cu` |
| `NEXT_PUBLIC_BASE_PATH` | basePath ของ Next.js | `/smart-cabinet-cu` |
| `NEXT_PUBLIC_API_URL` | URL ของ Backend API | `http://localhost:3000/smart-cabinet-cu/api/v1` |
| `NEXT_PUBLIC_FIREBASE_*` | (ถ้าใช้ Firebase) | ดูใน .env.example |

---

## Production

```bash
# จาก frontend/
cp .env.example .env
# แก้ .env ให้ตรงกับสภาพแวดล้อม

docker compose -f docker/docker-compose.yml up -d --build
```

- Image: `frontend-smart-cabinet:latest`
- Container: `smart-cabinet-frontend`
- Port: **4100**
- เข้าใช้: **http://localhost:4100/smart-cabinet-cu**
- Health: `
`

Build args (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_PATH`) ใช้ค่าจาก `.env` หรือ default ใน compose

---

## Development

```bash
# จาก frontend/
docker compose -f docker/docker-compose.dev.yml up --build
```

- Mount โฟลเดอร์ `src/`, `public/`, `.next/`
- รัน `npm run dev` (port 3100)
- ตัวแปร env ใช้จาก `.env` / `.env.local` หรือ default

---

## Build อย่างเดียว (สำหรับ K8s)

```bash
# จาก frontend/
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://<BACKEND_URL>/smart-cabinet-cu/api/v1 \
  --build-arg NEXT_PUBLIC_BASE_PATH=/smart-cabinet-cu \
  -f docker/Dockerfile \
  -t frontend-smart-cabinet:latest .
```

จากนั้น import เข้า K3s (ถ้าใช้):

```bash
docker save frontend-smart-cabinet:latest | sudo k3s ctr images import -
```

หรือใช้สคริปต์ [k8s/update-service.sh](../k8s/update-service.sh) (อ่านค่าจาก `.env` / `.env.local`)

---

## K8s

- Deploy: `kubectl apply -f k8s/frontend-deployment.yaml`
- ตัวแปรใน deployment ควรตรงกับ .env.example (แก้ `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL` ตามสภาพแวดล้อม)
- อัปเดตโค้ด: จาก frontend รัน `./k8s/update-service.sh`

ดูเพิ่ม: [frontend/k8s/README.md](../k8s/README.md)
