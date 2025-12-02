import Navbar from "@/components/Navbar";
import GameList from "@/components/GameList";
import BannerSlider from "@/components/BannerSlider";
import { supabase } from '@/lib/supabase';
import { getProducts } from '@/lib/middlepay';
import Link from 'next/link';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';

export const revalidate = 60;

export default async function Home({ searchParams }) {
  const params = await searchParams;
  // ถ้าไม่มีค่า category ให้ default เป็น 'game' (ตามที่ต้องการให้แยกกันชัดเจน)
  const selectedCategory = params?.category === 'premium' ? 'premium' : 'game';

  // 1. ดึงข้อมูลสินค้าจาก API
  const allProducts = await getProducts();

  // 2. ดึงการตั้งค่าจาก DB (เพื่อดูว่าอันไหน Popular, อันไหน Active)
  const { data: productSettings } = await supabase.from('products').select('*');
  
  // 3. ผสมข้อมูล (Merge)
  const processedProducts = allProducts.map(p => {
      const setting = productSettings?.find(s => s.game_id === p.name) || {};
      return { 
          ...p, 
          ...setting, 
          is_active: setting.is_active !== false,
          image: setting.custom_image || p.image || getGameImage(p.name) // ใช้รูปที่ custom หรือ fallback
      };
  }).filter(p => p.is_active); // เอาเฉพาะที่เปิดใช้งาน

  // 4. แยกข้อมูลสำหรับโซนต่างๆ
  // - รายการที่จะโชว์ในลิสต์หลัก (ตามหมวดหมู่ที่เลือก)
  const displayList = processedProducts.filter(p => {
      if (selectedCategory === 'premium') return p.category === 'premium';
      return p.category !== 'premium'; // ถ้าเป็น game
  });

  // - รายการยอดฮิต (เอาเฉพาะเกม หรือรวมหมดก็ได้ ตามใจชอบ)
  const popularList = processedProducts
      .filter(p => p.is_popular)
      .slice(0, 8); // เอาแค่ 8 อัน

  // 5. ดึงแบนเนอร์
  const { data: banners } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        {banners && banners.length > 0 ? (
            <BannerSlider banners={banners} />
        ) : (
            <div className="w-full h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
        )}
      </div>

      {/* --- โซนเกมยอดฮิต (แสดงเฉพาะหน้าแรก หรือแสดงตลอดก็ได้) --- */}
      {popularList.length > 0 && (
        <div className="container mx-auto px-4 mb-10">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-slate-800">เกมยอดฮิต</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {popularList.map((game, idx) => (
                    <Link href={`/?category=${game.category}&search=${game.custom_name || game.name}`} key={idx} className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                            {game.image ? (
                                <Image src={game.image} alt={game.name} fill className="object-cover" />
                            ) : <div className="w-full h-full bg-slate-200"></div>}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                                {game.custom_name || game.name}
                            </h3>
                            <p className="text-xs text-slate-400 truncate">เติมไว ได้ชัวร์</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
      )}

      {/* --- รายการสินค้าหลัก --- */}
      <div className="container mx-auto px-4 py-4" id="main-content">
        <div className="flex items-center gap-3 mb-6">
           <div className={`w-1.5 h-8 rounded-full ${selectedCategory === 'premium' ? 'bg-purple-500' : 'bg-blue-600'}`}></div>
           <h1 className="text-2xl font-bold text-slate-800">
             {selectedCategory === 'premium' ? 'บริการแอปพรีเมียม' : 'เติมเกมออนไลน์'}
           </h1>
        </div>
        
        {/* ส่ง products ที่กรองแล้วไปให้ GameList แสดงผล */}
        {/* สังเกต: เราส่ง displayList ที่กรองแล้วไปเลย GameList ไม่ต้องกรอง category ซ้ำแล้ว */}
        <GameList products={displayList} />
        
      </div>
    </main>
  );
}