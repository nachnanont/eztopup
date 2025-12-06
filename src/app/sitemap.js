import { getProducts } from '@/lib/middlepay';

export default async function sitemap() {
  const baseUrl = 'https://eztopcard-web.vercel.app'; // ⚠️ เปลี่ยนเป็นโดเมนจริงของคุณ

  // 1. หน้าหลักๆ ของเว็บ
  const routes = [
    '',
    '/login',
    '/register',
    '/history',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  }));

  // 2. (ขั้นสูง) ถ้าในอนาคตมีหน้าแยกของแต่ละเกม เช่น /game/rov 
  // เราสามารถดึง Database มาวนลูปสร้าง Link ตรงนี้ได้เลย
  
  return [...routes];
}