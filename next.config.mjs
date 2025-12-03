/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // อนุญาตทุกโดเมนของ Supabase
      },
      {
        protocol: 'https',
        hostname: 'middle-pay.com', // เผื่อรูปมาจาก API
      }
    ],
  },
};

export default nextConfig;