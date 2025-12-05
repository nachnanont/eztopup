'use client';

import { useState, useEffect } from 'react';
import { Search, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';
import ProductModal from './ProductModal';
import { supabase } from '@/lib/supabase';

export default function GameList({ products: initialProducts }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [products, setProducts] = useState(initialProducts || []);

  useEffect(() => {
    const syncSettings = async () => {
        const { data: gameSettings } = await supabase.from('products').select('*');
        const { data: pkgSettings } = await supabase.from('package_settings').select('*');

        if (gameSettings) {
            const merged = initialProducts.map(game => {
                const gSet = gameSettings.find(s => s.game_id === game.name) || {};
                
                const rawPackages = game.services || game.items || game.products || [];
                
                if (!rawPackages || rawPackages.length === 0) {
                    return {
                        ...game,
                        ...gSet,
                        is_active: gSet.is_active !== false,
                        image: gSet.custom_image || game.image || getGameImage(game.name)
                    };
                }

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

                return {
                    ...game,
                    ...gSet,
                    is_active: gSet.is_active !== false,
                    image: gSet.custom_image || game.image || getGameImage(game.name),
                    services: game.services ? mergedPackages.filter(p => p.is_active) : undefined,
                    items: game.items ? mergedPackages.filter(p => p.is_active) : undefined,
                    products: game.products ? mergedPackages.filter(p => p.is_active) : undefined
                };
            });
            setProducts(merged.filter(p => p.is_active));
        }
    };
    syncSettings();
  }, [initialProducts]);

  // --- แยกเกมยอดฮิต ---
  const popularGames = products.filter(p => p.is_popular).slice(0, 8);

  // --- กรองเกมทั้งหมด (Search) ---
  const filteredGames = products.filter((p) => {
    const name = p.custom_name || p.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full">
      
      {/* --- ส่วนแสดงเกมยอดฮิต (ย้ายมาไว้ตรงนี้ เพื่อให้กดแล้วเด้ง Popup) --- */}
      {popularGames.length > 0 && !searchTerm && (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-slate-800">เกมยอดฮิต</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {popularGames.map((game, idx) => (
                    <div 
                        key={idx}
                        // จุดสำคัญ: สั่งให้เปิด Modal เหมือนกันเป๊ะ
                        onClick={() => setSelectedGame(game)}
                        className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 cursor-pointer"
                    >
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                            {game.image ? (
                                <Image src={game.image} alt={game.name} fill className="object-cover" />
                            ) : null}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                                {game.custom_name || game.name}
                            </h3>
                            <p className="text-xs text-slate-400 truncate"></p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* ส่วนหัวข้อรายการปกติ */}
      <div className="flex items-center gap-3 mb-6">
           <div className="w-1.5 h-8 mt-10 bg-blue-600 rounded-full"></div>
           <h1 className="text-2xl font-bold text-slate-800">บริการเติมเกมออนไลน์</h1>
      </div>

      {/* Search Filter */}
      <div className="relative mb-8 max-w-md mx-auto">
        <input
          type="text"
          placeholder="ค้นหาเกม..."
          className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      </div>

      {/* Grid แสดงผลเกมทั้งหมด */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {filteredGames.map((game, index) => {
          const displayName = game.custom_name || game.name;
          const imageUrl = game.image || getGameImage(game.name);

          return (
            <div 
              key={index}
              onClick={() => setSelectedGame(game)}
              className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-24 h-24 mb-4 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-slate-50">
                {imageUrl ? (
                  <Image src={imageUrl} alt={displayName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageOff size={24} />
                  </div>
                )}
              </div>
              <h3 className="font-medium text-slate-700 text-sm md:text-base text-center line-clamp-2 px-2">
                {displayName}
              </h3>
            </div>
          )})}
      </div>

      {/* Modal ตัวเดิมตัวเดียว ใช้ร่วมกันหมด */}
      {selectedGame && (
        <ProductModal 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
        />
      )}

    </div>
  );
}