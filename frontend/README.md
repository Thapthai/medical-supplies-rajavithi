# ระบบจัดการเวชภัณฑ์ - Frontend

Frontend สำหรับระบบจัดการเวชภัณฑ์ สร้างด้วย Next.js, TypeScript, Tailwind CSS และ shadcn/ui

## 🚀 เทคโนโลยีที่ใช้

- **Next.js 14** - React framework พร้อม App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework  
- **shadcn/ui** - Beautiful and accessible UI components
- **React Hook Form** - Performant forms with easy validation
- **Zod** - TypeScript-first schema validation
- **Axios** - HTTP client สำหรับการเชื่อมต่อ API
- **Lucide React** - Beautiful icons

## 🏗️ โครงสร้างโปรเจค

```
src/
├── app/                    # App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── items/            # Item management pages
│   └── layout.tsx        # Root layout
├── components/           # Reusable components
│   ├── ui/              # shadcn/ui components
│   ├── Navbar.tsx       # Navigation component
│   └── ProtectedRoute.tsx # Route protection
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── lib/                 # Utility libraries
│   ├── api.ts          # API client
│   ├── utils.ts        # Utility functions
│   └── validations.ts  # Form validation schemas
└── types/              # TypeScript type definitions
    └── api.ts          # API response types
```

## 🎯 ฟีเจอร์หลัก

### 🔐 ระบบการยืนยันตัวตน
- สมัครสมาชิก/เข้าสู่ระบบ
- JWT Token authentication
- Protected routes
- Auto token refresh

### 📊 แดชบอร์ด
- ภาพรวมสถิติสินค้า
- สินค้าล่าสุด
- การ์ดแสดงข้อมูลสำคัญ

### 📦 จัดการสินค้า
- เพิ่ม/แก้ไข/ลบสินค้า
- ค้นหาและกรองสินค้า
- จัดการสถานะสินค้า
- คำนวณมูลค่ารวม

### 🎨 UI/UX
- Responsive design
- Modern และสวยงาม
- Thai language support
- Loading states
- Toast notifications

## 🛠️ การติดตั้งและรัน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า environment variables

สร้างไฟล์ `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 3. รันโปรเจค

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

เว็บไซต์จะรันที่ `http://localhost:3001`

## 🔗 การเชื่อมต่อกับ Backend

Frontend จะเชื่อมต่อกับ Backend API ผ่าน:

- **Gateway API**: `http://localhost:3000/api`
- **Endpoints**:
  - `POST /auth/register` - สมัครสมาชิก
  - `POST /auth/login` - เข้าสู่ระบบ
  - `GET /auth/profile` - ข้อมูลผู้ใช้
  - `GET /items` - รายการสินค้า
  - `POST /items` - เพิ่มสินค้า
  - `PUT /items/:id` - แก้ไขสินค้า
  - `DELETE /items/:id` - ลบสินค้า

## 📱 หน้าเว็บ

### 🏠 หน้าแรก (`/`)
- Landing page พร้อมฟีเจอร์หลัก
- Call-to-action สำหรับสมัครสมาชิก

### 🔐 การยืนยันตัวตน
- `/auth/login` - เข้าสู่ระบบ
- `/auth/register` - สมัครสมาชิก

### 📊 แดชบอร์ด (`/admin/dashboard`)
- ภาพรวมธุรกิจ
- สถิติสินค้า
- สินค้าล่าสุด

### 📦 จัดการสินค้า
- `/items` - รายการสินค้าทั้งหมด
- `/items/new` - เพิ่มสินค้าใหม่
- `/items/[id]/edit` - แก้ไขสินค้า

## 🎯 การใช้งาน

1. **สมัครสมาชิก** หรือ **เข้าสู่ระบบ**
2. ดูภาพรวมใน **แดชบอร์ด**
3. **เพิ่มเวชภัณฑ์** และอุปกรณ์ทางการแพทย์
4. **จัดการสินค้า** - แก้ไข, ลบ, เปิด/ปิดใช้งาน
5. **ค้นหาและกรอง** สินค้าตามต้องการ

## 🔧 Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint

# Type check
npm run type-check
```

## 🎨 การปรับแต่ง UI

โปรเจคใช้ **shadcn/ui** components ที่สามารถปรับแต่งได้ผ่าน:

- `tailwind.config.js` - Tailwind configuration
- `src/app/globals.css` - Global styles
- `components.json` - shadcn/ui configuration

## 📚 เอกสารเพิ่มเติม

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Hook Form Documentation](https://react-hook-form.com)