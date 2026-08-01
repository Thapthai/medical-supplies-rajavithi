# Smart Cabinet CU App — Backend

Backend ของแอป **Smart Cabinet CU** สร้างด้วย NestJS 11 + Prisma (MySQL) ให้ API สำหรับจัดการตู้ Cabinet, เวชภัณฑ์, การเบิก–คืน และรายงาน

---

## สารบัญ

- [ภาพรวม](#ภาพรวม)
- [โมดูลหลัก](#โมดูลหลัก)
- [โครงสร้าง](#โครงสร้าง)
- [การติดตั้งและรัน](#การติดตั้งและรัน)
- [API Base Path](#api-base-path)
- [ตัวแปรสภาพแวดล้อม](#ตัวแปรสภาพแวดล้อม)
- [Database & Prisma](#database--prisma)
- [สคริปต์](#สคริปต์)
- [Docker & K8s](#docker--k8s)

---

## ภาพรวม

- **Framework:** NestJS 11 (TypeScript)
- **ORM:** Prisma
- **Database:** MySQL
- **API prefix:** `/smart-cabinet-cu/api/v1`
- **Port:** 3000 (หรือตาม `PORT` ใน `.env`)

รองรับ Authentication (JWT, Firebase, Client Credential, 2FA), การจัดการแผนก/ตู้ Cabinet, รายการอุปกรณ์, เวชภัณฑ์ (เบิก/คืน/ใช้กับคนไข้), และรายงาน PDF/Excel

---

## โมดูลหลัก

| โมดูล | Path | คำอธิบาย |
|--------|------|----------|
| **Auth** | `src/auth/` | ล็อกอิน (JWT, Firebase, Client Credential), 2FA, Staff User/Role/Permission, API Key, Refresh Token |
| **Category** | `src/category/` | หมวดหมู่ (CRUD, tree, slug, children) |
| **Department** | `src/department/` | แผนก และ Cabinet (CRUD) |
| **Item** | `src/item/` | รายการอุปกรณ์, สต๊อกในตู้, min/max, อัปโหลด |
| **Medical Supplies** | `src/medical-supplies/` | เวชภัณฑ์, เบิกจากตู้, คืนเข้าตู้, คืนอุปกรณ์, บันทึกใช้กับคนไข้, ยกเลิก Bill ฯลฯ |
| **Report** | `src/report/` | รายงาน PDF/Excel (comparison, equipment usage/disbursement, cabinet stock, return, return-to-cabinet, vending mapping, cancel bill, dispensed items ฯลฯ) |
| **Email** | `src/email/` | ส่งอีเมล (Nodemailer) |
| **Prisma** | `src/prisma/` | Prisma module (DB connection) |
| **Utils** | `src/utils/` | Date-time และ helper อื่นๆ |

---

## โครงสร้าง

```
backend/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── main.ts
│   ├── auth/
│   ├── category/
│   ├── department/
│   ├── item/
│   ├── medical-supplies/
│   ├── report/           # report-service.service, report.controller, services/*.ts
│   ├── email/
│   ├── prisma/
│   └── utils/
├── prisma/
│   └── schema.prisma
├── docker/               # Docker / docker-compose (ตามที่โปรเจกต์ใช้)
├── k8s/                  # K8s manifests
├── package.json
├── tsconfig.json
└── .env.example
```

---

## การติดตั้งและรัน

### ข้อกำหนด

- Node.js 20+
- MySQL

### ขั้นตอน

```bash
# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.example .env
# แก้ไข .env (DATABASE_URL, JWT_SECRET ฯลฯ)

# Generate Prisma client
npx prisma generate

# รัน migration
npx prisma migrate dev

# รัน Backend
npm run start:dev
```

- **URL หลัก:** http://localhost:3000 (หรือตาม `PORT`)
- **Health:** http://localhost:3000/smart-cabinet-cu/api/v1/health

---

## API Base Path

ทุก route อยู่ภายใต้:

```
/smart-cabinet-cu/api/v1
```

ตัวอย่าง:

- `GET  /smart-cabinet-cu/api/v1/health`
- `POST /smart-cabinet-cu/api/v1/auth/login`
- `GET  /smart-cabinet-cu/api/v1/category`
- `GET  /smart-cabinet-cu/api/v1/department`
- `GET  /smart-cabinet-cu/api/v1/item`
- `POST /smart-cabinet-cu/api/v1/medical-supplies/...`
- `POST /smart-cabinet-cu/api/v1/reports/...`

รายละเอียด endpoint ดูจาก controller ใน `src/`.

---

## ตัวแปรสภาพแวดล้อม

ดูจาก `.env.example` โดยประมาณ:

```bash
# Database
DATABASE_URL="mysql://user:password@host:port/database_name"
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=database_name
DATABASE_HOST=localhost
DATABASE_PORT=3306

# Server
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
```

ถ้ามี Firebase, SMTP ฯลฯ ให้เพิ่มใน `.env` ตามที่ใช้ในโปรเจกต์

---

## Database & Prisma

- **Schema:** `prisma/schema.prisma`
- **Generate client:** `npx prisma generate`
- **Migration (dev):** `npx prisma migrate dev --name <name>`
- **Migration (deploy):** `npx prisma migrate deploy`
- **Studio (optional):** `npx prisma studio`

---

## สคริปต์

| สคริปต์ | คำอธิบาย |
|--------|----------|
| `npm run start` | รันแบบ production |
| `npm run start:dev` | รันแบบ watch (development) |
| `npm run start:debug` | รันแบบ debug |
| `npm run start:prod` | รันจาก `dist/` (หลัง build) |
| `npm run build` | Build โปรเจกต์ |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run test:cov` | Test coverage |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Docker & K8s

- **Docker:** โฟลเดอร์ [docker/](docker/) — Dockerfile (NestJS multi-stage), docker-compose สำหรับ production และ development  
  รัน: `docker compose -f docker/docker-compose.yml up -d --build` (จากโฟลเดอร์ backend)
- **Kubernetes:** โฟลเดอร์ [k8s/](k8s/) — Deployment + Service สำหรับ Backend (port 3000, NodePort 30080), สคริปต์ `update-service.sh` สำหรับ build แล้ว rollout restart  
  รายละเอียด: [docker/README.md](docker/README.md), [k8s/README.md](k8s/README.md)

---

## ลิงก์ที่เกี่ยวข้อง

- [README หลักของโปรเจกต์](../README.md) — ภาพรวมทั้งแอป (Frontend + Backend)
- [Frontend README](../frontend/README.md)
- [Frontend Deployment](../frontend/DEPLOYMENT-GUIDE.md)

---

## License

ตามที่กำหนดในโปรเจกต์ (MIT หรือตามสัญญาอนุญาตของโปรเจกต์)
