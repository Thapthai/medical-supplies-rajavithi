'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  session?: any;
}

export default function SessionProvider({ children, session }: Props) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  // NextAuth ต้องการ basePath ที่เป็น path เท่านั้น (ไม่ใช่ full URL)
  // basePath จะถูกใช้เพื่อสร้าง API routes เช่น /medical-supplies/api/auth
  const authBasePath = basePath ? `${basePath}/api/auth` : '/api/auth';

  return (
    <NextAuthSessionProvider
      session={session}
      basePath={authBasePath}
    >
      {children}
    </NextAuthSessionProvider>
  );
}

