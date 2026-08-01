# Backend Docker (NestJS Monolith)

โฟลเดอร์นี้ใช้สำหรับ build และรัน **Backend Smart Cabinet CU** (NestJS เดี่ยว) ด้วย Docker

---

## โครงสร้าง

```
docker/
├── README.md           # ไฟล์นี้
├── Dockerfile          # Multi-stage สำหรับ NestJS (deps → builder → production)
├── docker-compose.yml  # Production
└── docker-compose.dev.yml  # Development (mount src + prisma, start:dev)
```

---

## ข้อกำหนด

- ต้องมีไฟล์ `.env` ในโฟลเดอร์ `backend/` (ไม่ใช่ใน docker/)
- อย่างน้อย: `DATABASE_URL`, `JWT_SECRET`
- รันจากโฟลเดอร์ **backend**: `docker compose -f docker/docker-compose.yml up -d`

---

## Production

```bash
# จาก backend/
docker compose -f docker/docker-compose.yml up -d --build
```

- Image: `backend-smart-cabinet:latest`
- Container: `smart-cabinet-backend`
- Port: **3000**
- Health: `http://localhost:3000/smart-cabinet-cu/api/v1/health`

---

## Development

```bash
# จาก backend/
docker compose -f docker/docker-compose.dev.yml up --build
```

- Mount โฟลเดอร์ `src/` และ `prisma/` จาก host
- รัน `prisma generate` แล้ว `npm run start:dev` (watch mode)
- Port: **3000**

---

## Build อย่างเดียว (สำหรับนำไปใช้กับ K8s)

```bash
# จาก backend/
docker build -f docker/Dockerfile -t backend-smart-cabinet:latest .
```

จากนั้น import เข้า K3s (ถ้าใช้):

```bash
docker save backend-smart-cabinet:latest | sudo k3s ctr images import -
```

---

## หมายเหตุ

- Backend ไม่รวม MySQL ใน compose นี้ — ใช้ `DATABASE_URL` ชี้ไปที่ MySQL ที่มีอยู่แล้ว หรือเพิ่ม service `mysql` ใน compose เอง
- ตัวแปร env อื่น (เช่น JWT_REFRESH_SECRET, SMTP) ใส่ใน `.env` แล้วจะถูกส่งเข้า container ผ่าน `environment` ใน compose
