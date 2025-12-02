import Navbar from "@/components/Navbar";
import GameList from "@/components/GameList";
import BannerSlider from "@/components/BannerSlider";
import { supabase } from '@/lib/supabase';
import { getProducts } from '@/lib/middlepay';

export const revalidate = 60;

export default async function Home({ searchParams }) {
  // รองรับ Next.js 15+ ที่ searchParams เป็น Promise
  const params = await searchParams;
  const selectedCategory = params?.category || 'all';

  // 1. ดึงข้อมูลสินค้าจาก API
  const allProducts = await getProducts();

  // 2. ดึงแบนเนอร์จาก Database
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
            <div className="w-full h-64 md:h-80 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl shadow-xl flex items-center justify-center text-white relative overflow-hidden">
               <div className="z-10 text-center">
                 <h2 className="text-4xl font-bold mb-2">EZTopCard</h2>
                 <p className="text-blue-100">บริการเติมเกมและแอปพรีเมียม 24 ชม.</p>
               </div>
            </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
           <h1 className="text-2xl font-bold text-slate-800">
             {selectedCategory === 'premium' ? 'แอปพรีเมียม' : 'เติมเกมออนไลน์'}
           </h1>
        </div>
        
        {/* ส่ง Category ที่เลือกไปให้ GameList กรองต่อ */}
        <GameList products={allProducts} category={selectedCategory} />
        
      </div>
    </main>
  );
}