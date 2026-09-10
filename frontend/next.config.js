/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7100/med-supplies-api/api/v1/',
    // ให้ client ใช้ NEXTAUTH_URL ตอน redirect login (เช่น token หมดอายุ)
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  },

  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",


  output: 'standalone',
  // Disable image optimization for standalone mode
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
