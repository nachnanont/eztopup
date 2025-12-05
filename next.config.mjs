/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // อนุญาต Supabase ทุกโปรเจกต์
      },
      {
        protocol: 'https',
        hostname: 'ttxvgxebknibhtvakczf.supabase.co', // ระบุโปรเจกต์คุณโดยเฉพาะ (เพื่อความชัวร์)
      },
      {
        protocol: 'https',
        hostname: 'middle-pay.com', // อนุญาตรูปจาก API เกม
      }
    ],
  },
};

export default nextConfig;