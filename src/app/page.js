import Navbar from "@/components/Navbar";
import GameList from "@/components/GameList";
import BannerSlider from "@/components/BannerSlider";
import { supabase } from '@/lib/supabase';
import { getProducts } from '@/lib/middlepay';
import { getGameImage } from '@/lib/imageMap';

export const revalidate = 60;

export default async function Home() {
  // 1. ดึงข้อมูลสินค้าจาก API
  const allProducts = await getProducts();

  // 2. ดึงการตั้งค่าจาก DB
  const { data: productSettings } = await supabase.from('products').select('*');
  
  // 3. ผสมข้อมูล (กรองเอาเฉพาะเกม และที่เปิดใช้งาน)
  const processedProducts = allProducts.map(p => {
      const setting = productSettings?.find(s => s.game_id === p.name) || {};
      return { 
          ...p, 
          ...setting, 
          is_active: setting.is_active !== false,
          image: setting.custom_image || p.image || getGameImage(p.name)
      };
  }).filter(p => p.is_active && p.category !== 'premium');

  // 4. ดึงแบนเนอร์
  const { data: banners } = await supabase
    .from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });

  return (
    <main className="min-h-screen bg-main pb-20">
      <Navbar />
      
      {/* Banner */}
      <div className="container mx-auto px-4 py-8">
        {banners && banners.length > 0 ? (
            <BannerSlider banners={banners} />
        ) : (
            <div className="w-full h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
        )}
      </div>

      {/* ส่งข้อมูลเกมทั้งหมดไปให้ GameList จัดการต่อ (รวมถึงเกมยอดฮิตด้วย) */}
      <div className="container mx-auto px-4 py-4">
        <GameList products={processedProducts} />
      </div>
    </main>
  );
}