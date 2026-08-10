import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import { ASSETS, getAssetPath } from "@/lib/assets";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "ระบบจัดการเวชภัณฑ์",
  description: "ระบบจัดการเวชภัณฑ์และอุปกรณ์ทางการแพทย์",
  applicationName: "POSE เวชภัณฑ์",
  appleWebApp: {
    capable: true,
    title: "POSE เวชภัณฑ์",
    statusBarStyle: "default",
  },

  // ไอคอนแท็บเบราว์เซอร์ — ใช้เดิม (tappic)
  // ไอคอน Install as app ใช้ manifest → public/icons/pwa-*.png (โลโก้ POSE)
  icons: {
    icon: ASSETS.BackgroundLogo,
    apple: [{ url: getAssetPath('icons/apple-touch-180.png'), type: 'image/png', sizes: '180x180' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning className={kanit.variable}>
      <body className={kanit.className} suppressHydrationWarning>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
