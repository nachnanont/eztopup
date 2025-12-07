import Navbar from "@/components/Navbar";
import GameList from "@/components/GameList";
import BannerSlider from "@/components/BannerSlider";
import { supabase } from '@/lib/supabase';
import { getProducts } from '@/lib/middlepay';
import Link from 'next/link';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';
import { ChevronRight, Newspaper } from 'lucide-react'; // นำเข้าไอคอนสำหรับส่วนข่าว

export const revalidate = 60;

export default async function Home({ searchParams }) {
  const params = await searchParams;
  // ค่าเริ่มต้นถ้าไม่มี category ให้เป็น 'game'
  const selectedCategory = params?.category === 'premium' ? 'premium' : 'game';

  // 1. ดึงข้อมูลสินค้าจาก API
  const allProducts = await getProducts();

  // 2. ดึงการตั้งค่าสินค้าจาก DB
  const { data: productSettings } = await supabase.from('products').select('*');
  
  // 3. ผสมข้อมูล (Merge Data)
  const processedProducts = allProducts.map(p => {
      const setting = productSettings?.find(s => s.game_id === p.name) || {};
      return { 
          ...p, 
          ...setting, 
          is_active: setting.is_active !== false,
          image: setting.custom_image || p.image || getGameImage(p.name)
      };
  }).filter(p => p.is_active);

  // 4. แยกข้อมูลสำหรับโซนต่างๆ
  // - รายการที่จะโชว์ในลิสต์หลัก (ตามหมวดหมู่ที่เลือก)
  const displayList = processedProducts.filter(p => {
      if (selectedCategory === 'premium') return p.category === 'premium';
      return p.category !== 'premium';
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

  // 6. ดึงข่าวสารล่าสุด 3 รายการ (NEW)
  const { data: latestNews } = await supabase
    .from('posts')
    .select('title, slug, image_url, excerpt, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      
      {/* --- Banner Section --- */}
      <div className="container mx-auto px-4 py-8">
        {banners && banners.length > 0 ? (
            <BannerSlider banners={banners} />
        ) : (
            <div className="w-full h-64 bg-slate-200 rounded-3xl animate-pulse"></div>
        )}
      </div>

      {/* --- โซนเกมยอดฮิต --- */}
      {popularList.length > 0 && (
        <div className="container mx-auto px-4 mb-10">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-slate-800">เกมยอดฮิต</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {popularList.map((game, idx) => (
                    <Link href={`/?category=${game.category}&search=${game.custom_name || game.name}`} key={idx} className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                            {game.image ? (
                                <Image src={game.image} alt={game.name} fill className="object-cover" />
                            ) : null}
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

      {/* --- รายการสินค้าหลัก (GameList) --- */}
      <div className="container mx-auto px-4 py-4" id="main-content">
        <div className="flex items-center gap-3 mb-6">
           <div className={`w-1.5 h-8 rounded-full ${selectedCategory === 'premium' ? 'bg-purple-500' : 'bg-blue-600'}`}></div>
           <h1 className="text-2xl font-bold text-slate-800">
             {selectedCategory === 'premium' ? 'บริการแอปพรีเมียม' : 'เติมเกมออนไลน์'}
           </h1>
        </div>
        
        <GameList products={displayList} category={selectedCategory} />
        
      </div>

      {/* --- ส่วนข่าวสารและบทความ (อยู่ล่างสุด) --- */}
      {latestNews && latestNews.length > 0 && (
        <div className="container mx-auto px-4 py-8 mt-8 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Newspaper className="text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-800">ข่าวสารและโปรโมชั่น</h2>
                </div>
                <Link href="/blog" className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1">
                    ดูทั้งหมด <ChevronRight size={16}/>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {latestNews.map((news) => (
                    <Link key={news.slug} href={`/blog/${news.slug}`} className="flex gap-4 group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-200">
                            {news.image_url ? (
                                <Image src={news.image_url} alt={news.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                            )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                            <h3 className="font-bold text-slate-800 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors mb-1">
                                {news.title}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">{news.excerpt}</p>
                            <p className="text-[10px] text-slate-400 mt-auto">
                                {new Date(news.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
      )}

    </main>
  );
}