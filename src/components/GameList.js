'use client';

import { useState, useEffect } from 'react';
import { Search, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';
import ProductModal from './ProductModal';
import { supabase } from '@/lib/supabase';

// เพิ่ม prop 'category'
export default function GameList({ products: initialProducts, category }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [products, setProducts] = useState(initialProducts || []);

  useEffect(() => {
    // โหลด Setting เหมือนเดิม
    const syncSettings = async () => {
        const { data: gameSettings } = await supabase.from('products').select('*');
        const { data: pkgSettings } = await supabase.from('package_settings').select('*');

        if (gameSettings || pkgSettings) {
            const merged = initialProducts.map(game => {
                const gSet = gameSettings?.find(s => s.game_id === game.name) || {};
                
                const rawPackages = game.services || game.items || [];
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
                        is_active: pSet.is_active !== false
                    };
                });

                const activePackages = mergedPackages.filter(p => p.is_active);

                return {
                    ...game,
                    ...gSet,
                    is_active: gSet.is_active !== false,
                    services: game.services ? activePackages : undefined,
                    items: game.items ? activePackages : undefined
                };
            });
            setProducts(merged.filter(p => p.is_active));
        }
    };
    syncSettings();
  }, [initialProducts]);

  // --- LOGIC การกรองใหม่ ---
  const filteredGames = products.filter((p) => {
    // 1. กรองตามชื่อ (Search)
    const nameMatch = (p.custom_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. กรองตามหมวดหมู่ (Category)
    // ถ้า category เป็น 'all' หรือค่าว่าง ให้โชว์หมด (หรือเฉพาะเกม ถ้าอยากให้หน้าแรกเป็นเกม)
    // แต่ปกติ Navbar ส่งมาเป็น 'game' หรือ 'premium'
    let catMatch = true;
    if (category === 'game') {
        catMatch = p.category !== 'premium'; // เอาที่ไม่ใช่ premium
    } else if (category === 'premium') {
        catMatch = p.category === 'premium'; // เอาเฉพาะ premium
    }

    return nameMatch && catMatch;
  });

  return (
    <div className="w-full">
      {/* Search Filter */}
      <div className="relative mb-8 max-w-md mx-auto">
        <input
          type="text"
          placeholder={category === 'premium' ? "ค้นหาแอป..." : "ค้นหาเกม..."}
          className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      {/* Grid แสดงผล */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {filteredGames.map((game, index) => {
            const displayName = game.custom_name || game.name;
            const displayImage = game.custom_image || game.image;
            const imageUrl = displayImage ? displayImage : getGameImage(game.name, null);

            return (
            <div 
              key={index}
              onClick={() => setSelectedGame(game)}
              className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity 
                  ${game.category === 'premium' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}>
              </div>

              <div className="relative w-24 h-24 mb-4 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-slate-50">
                {imageUrl ? (
                  <Image 
                    src={imageUrl} 
                    alt={displayName} 
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageOff size={24} className="mb-1 opacity-50" />
                    <span className="text-xs">No Img</span>
                  </div>
                )}
              </div>
              
              <h3 className="font-medium text-slate-700 text-sm md:text-base text-center line-clamp-2 group-hover:text-blue-600 transition-colors px-2">
                {displayName}
              </h3>
            </div>
          )})}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-white/50 rounded-2xl border border-dashed border-slate-200 font-medium">
          <ImageOff size={48} className="mx-auto mb-4 text-slate-300" />
          ไม่พบ{category === 'premium' ? 'แอป' : 'เกม'}ที่คุณค้นหา
        </div>
      )}

      {selectedGame && (
        <ProductModal 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
        />
      )}

    </div>
  );
}