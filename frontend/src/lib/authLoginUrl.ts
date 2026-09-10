/**
 * URL หน้า login = NEXTAUTH_URL + /auth/login
 * ตัวอย่าง: NEXTAUTH_URL=http://localhost:3100/medical-supplies-rajavithi
 *        → http://localhost:3100/medical-supplies-rajavithi/auth/login
 *
 * Hard navigation (window.location) ต้องใส่เอง — ไม่ติด Next.js basePath อัตโนมัติ
 */
export function getAuthLoginHref(): string {
  const nextAuthUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (nextAuthUrl) {
    return `${nextAuthUrl}/auth/login`;
  }

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const path = basePath ? `${basePath}/auth/login` : '/auth/login';

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }

  return path;
}

/** path สำหรับ signOut callbackUrl / NextAuth pages (มี basePath) */
export function getAuthLoginPath(): string {
  const nextAuthUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (nextAuthUrl) {
    try {
      const u = new URL(nextAuthUrl);
      const base = u.pathname.replace(/\/$/, '');
      return base ? `${base}/auth/login` : '/auth/login';
    } catch {
      /* fall through */
    }
  }

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  return basePath ? `${basePath}/auth/login` : '/auth/login';
}
