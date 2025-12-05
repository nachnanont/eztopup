'use client';

import { useState, useEffect } from 'react';
import { Search, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';
import ProductModal from './ProductModal';
import { supabase } from '@/lib/supabase';

export default function GameList({ products: initialProducts, category }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [products, setProducts] = useState(initialProducts || []);

  // ดึงข้อมูลการตั้งค่าจาก Supabase มาผสมกับข้อมูลจาก API
  useEffect(() => {
    const syncSettings = async () => {
        const { data: gameSettings } = await supabase.from('products').select('*');
        const { data: pkgSettings } = await supabase.from('package_settings').select('*');

        if (gameSettings) {
            const merged = initialProducts.map(game => {
                const gSet = gameSettings.find(s => s.game_id === game.name) || {};
                
                const rawPackages = game.services || game.items || game.products || [];
                
                // ถ้าไม่มีแพคเกจ คืนค่าเดิม (ป้องกันข้อมูลหาย)
                if (!rawPackages || rawPackages.length === 0) {
                    return {
                        ...game,
                        ...gSet,
                        is_active: gSet.is_active !== false,
                        image: gSet.custom_image || game.image || getGameImage(game.name)
                    };
                }

                // ผสมข้อมูลแพคเกจ (ราคา + รายละเอียด)
                const mergedPackages = rawPackages.map((pkg, idx) => {
                    const pkgId = pkg.id || pkg.name || `pkg-${idx}`;
                    const pSet = pkgSettings?.find(s => s.game_id === game.name && s.package_id === pkgId) || {};
                    
                    const cost = Number(pkg.price || pkg.amount || 0);
                    const markupValue = Number(pSet.markup_value || 0);
                    const markupType = pSet.markup_type || 'fixed';
                    
                    let finalPrice = cost;
                    if (markupType === 'percent') finalPrice += (cost * markupValue / 100);
                    else finalPrice += markupValue;
                    
                    return {
                        ...pkg,
                        id: pkgId,
                        price: Math.ceil(finalPrice),
                        is_active: pSet.is_active !== false,
                        description: pSet.description
                    };
                });

                const activePackages = mergedPackages.filter(p => p.is_active);

                return {
                    ...game,
                    ...gSet,
                    is_active: gSet.is_active !== false,
                    image: gSet.custom_image || game.image || getGameImage(game.name),
                    services: game.services ? activePackages : undefined,
                    items: game.items ? activePackages : undefined,
                    products: game.products ? activePackages : undefined
                };
            });
            setProducts(merged.filter(p => p.is_active));
        }
    };
    syncSettings();
  }, [initialProducts]);

  const isPremiumMode = category === 'premium';

  // Logic แยกเกมยอดฮิต
  const popularGames = products.filter(p => 
    p.is_popular && 
    (isPremiumMode ? p.category === 'premium' : p.category !== 'premium')
  ).slice(0, 8);

  // Logic กรองเกมทั้งหมด (ค้นหา + หมวดหมู่)
  const filteredGames = products.filter((p) => {
    const name = p.custom_name || p.name || '';
    
    let catMatch = true;
    if (isPremiumMode) catMatch = p.category === 'premium';
    else catMatch = p.category !== 'premium';

    return name.toLowerCase().includes(searchTerm.toLowerCase()) && catMatch;
  });

  // Component ย่อยสำหรับการ์ดเกม (เพื่อให้แก้ดีไซน์ที่เดียวแล้วเปลี่ยนหมด)
  const GameCard = ({ game, onClick }) => {
      const displayName = game.custom_name || game.name;
      const imageUrl = game.image;

      return (
        <div 
            onClick={onClick}
            className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center relative overflow-hidden h-full"
        >
            {/* แถบสีด้านบนแบ่งแยกหมวดหมู่ */}
            {/* <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity 
                ${game.category === 'premium' ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}>
            </div> */}

            {/* รูปภาพ (ปรับขนาดใหญ่ w-40) */}
            <div className="relative w-40 h-40 mb-4 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-slate-50">
                {imageUrl ? (
                    <Image src={imageUrl} alt={displayName} fill className="object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageOff size={32} />
                    </div>
                )}
            </div>
            
            {/* ชื่อเกม */}
            <h3 className="font-medium text-slate-700 text-base text-center line-clamp-2 px-1 group-hover:text-blue-600 transition-colors mt-auto">
                {displayName}
            </h3>
        </div>
      );
  };

  return (
    <div className="w-full pb-20">
      
      {/* --- ส่วนที่ 1: โซนเกมยอดฮิต --- */}
      {popularGames.length > 0 && !searchTerm && (
        <div className="mb-16"> {/* เว้นระยะห่างด้านล่างเยอะหน่อย (64px) */}
            <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-slate-800">
                    {isPremiumMode ? 'แอปยอดฮิต' : 'Hot !!!'}
                </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {popularGames.map((game, idx) => (
                    <GameCard key={idx} game={game} onClick={() => setSelectedGame(game)} />
                ))}
            </div>
        </div>
      )}

      {/* --- ส่วนที่ 2: ช่องค้นหา (Filter) --- */}
      <div className="relative mb-12 max-w-lg mx-auto"> {/* เว้นระยะห่าง 48px */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={20} />
        </div>
        <input
          type="text"
          placeholder={isPremiumMode ? "ค้นหาแอปที่ต้องการ..." : "ค้นหาเกมที่ต้องการ..."}
          className="w-full pl-12 pr-4 py-3.5 rounded-full border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all text-slate-600 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- ส่วนที่ 3: รายการทั้งหมด --- */}
      <div>
        <div className="flex items-center gap-2 mb-6">
           <div className={`w-1.5 h-7 rounded-full ${isPremiumMode ? 'bg-pink-500' : 'bg-blue-600'}`}></div>
           <h2 className="text-lg font-bold text-slate-700">
             {isPremiumMode ? 'รายการแอปทั้งหมด' : 'รายการเกมทั้งหมด'}
           </h2>
        </div>

        {/* Grid 4 คอลัมน์ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
            {filteredGames.map((game, index) => (
                <GameCard key={index} game={game} onClick={() => setSelectedGame(game)} />
            ))}
        </div>

        {filteredGames.length === 0 && (
            <div className="text-center py-20 bg-purple-100 rounded-3xl border border-dashed border-slate-200">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-sm">
                    <Search size={24} />
                </div>
                <p className="text-slate-500 font-medium">ไม่พบ{isPremiumMode ? 'แอป' : 'เกม'}ที่คุณค้นหา</p>
                <p className="text-xs text-slate-400 mt-1">ลองค้นหาด้วยคำอื่นดูนะครับ</p>
            </div>
        )}
      </div>

      {/* Popup Modal */}
      {selectedGame && (
        <ProductModal 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
        />
      )}

    </div>
  );
}