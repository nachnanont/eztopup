/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // อนุญาตทุกโดเมนของ Supabase
      },
    ],
  },
};

export default nextConfig;
// update deploy.