import type { MetadataRoute } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function asset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return basePath ? `${basePath}${clean}` : clean;
}

/** Manifest สำหรับ Chrome “Install as app” (เปิดเป็นหน้าต่าง ไม่ใช่แท็บ) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ระบบจัดการเวชภัณฑ์ POSE',
    short_name: 'POSE เวชภัณฑ์',
    description: 'ระบบจัดการเวชภัณฑ์และอุปกรณ์ทางการแพทย์',
    start_url: basePath ? `${basePath}/` : '/',
    scope: basePath ? `${basePath}/` : '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: asset('icons/pwa-192.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: asset('icons/pwa-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: asset('icons/pwa-192.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: asset('icons/pwa-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
