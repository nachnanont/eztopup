'use client';

import { useState, useEffect } from 'react';
import { Search, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';
import ProductModal from './ProductModal';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation'; // นำเข้าเพิ่ม

export default function GameList({ products: initialProducts, category }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [products, setProducts] = useState(initialProducts || []);

  const searchParams = useSearchParams();
  const autoOpenGame = searchParams.get('open'); // ดึงค่า ?open=... จาก URL

  useEffect(() => {
    const syncSettings = async () => {
        const { data: gameSettings } = await supabase.from('products').select('*');
        const { data: pkgSettings } = await supabase.from('package_settings').select('*');

        if (gameSettings) {
            const merged = initialProducts.map(game => {
                // ... (Logic เดิม ยาวๆ) ...
                const gSet = gameSettings.find(s => s.game_id === game.name) || {};
                const rawPackages = game.services || game.items || game.products || [];
                
                if (!rawPackages || rawPackages.length === 0) {
                    return {
                        ...game, ...gSet, is_active: gSet.is_active !== false,
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
                    if (markupType === 'percent') finalPrice += (cost * markupValue / 100); else finalPrice += markupValue;
                    
                    return {
                        ...pkg, id: pkgId, price: Math.ceil(finalPrice), is_active: pSet.is_active !== false, description: pSet.description
                    };
                });

                return {
                    ...game, ...gSet, is_active: gSet.is_active !== false,
                    image: gSet.custom_image || game.image || getGameImage(game.name),
                    services: game.services ? mergedPackages.filter(p => p.is_active) : undefined,
                    items: game.items ? mergedPackages.filter(p => p.is_active) : undefined,
                    products: game.products ? mergedPackages.filter(p => p.is_active) : undefined
                };
            });
            
            const finalProducts = merged.filter(p => p.is_active);
            setProducts(finalProducts);

            // --- ✨ LOGIC เปิด Popup อัตโนมัติ (เพิ่มตรงนี้) ---
            if (autoOpenGame) {
                // หาเกมที่ชื่อตรงกับใน URL (รองรับทั้งชื่อจริงและชื่อ Custom)
                const targetGame = finalProducts.find(p => 
                    p.name === autoOpenGame || 
                    (p.custom_name && p.custom_name === autoOpenGame)
                );
                
                if (targetGame) {
                    setSelectedGame(targetGame);
                    // (Optional) ลบ query param ออกเพื่อให้ URL สวยงาม
                    // window.history.replaceState(null, '', '/');
                }
            }
            // ---------------------------------------------
        }
    };
    syncSettings();
  }, [initialProducts, autoOpenGame]); // เพิ่ม dependency autoOpenGame

  // ... (ส่วนที่เหลือเหมือนเดิมทั้งหมด) ...
  const isPremiumMode = category === 'premium';
  const popularGames = products.filter(p => p.is_popular && (isPremiumMode ? p.category === 'premium' : p.category !== 'premium')).slice(0, 8);
  const filteredGames = products.filter((p) => {
    const name = p.custom_name || p.name || '';
    let catMatch = true;
    if (isPremiumMode) catMatch = p.category === 'premium'; else catMatch = p.category !== 'premium';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) && catMatch;
  });

  const GameCard = ({ game, onClick }) => {
      const displayName = game.custom_name || game.name;
      const imageUrl = game.image;
      return (
        <div onClick={onClick} className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center relative overflow-hidden h-full">
            <div className={`absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity ${game.category === 'premium' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}></div>
            <div className="relative w-40 h-40 mb-4 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-slate-50">
                {imageUrl ? <Image src={imageUrl} alt={displayName} fill className="object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-400"><ImageOff size={32} /></div>}
            </div>
            <h3 className="font-medium text-slate-700 text-sm md:text-base text-center line-clamp-2 px-1 group-hover:text-blue-600 transition-colors mt-auto">{displayName}</h3>
        </div>
      );
  };

  return (
    <div className="w-full pb-20">
      {popularGames.length > 0 && !searchTerm && (
        <div className="mb-16">
            <div className="flex items-center gap-2 mb-6"><span className="text-2xl">🔥</span><h2 className="text-xl font-bold text-slate-800">{isPremiumMode ? 'แอปยอดฮิต' : 'เกมยอดฮิต'}</h2></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {popularGames.map((game, idx) => (<GameCard key={idx} game={game} onClick={() => setSelectedGame(game)} />))}
            </div>
        </div>
      )}
      <div className="relative mb-12 max-w-lg mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="text-slate-400" size={20} /></div>
        <input type="text" placeholder={isPremiumMode ? "ค้นหาแอปที่ต้องการ..." : "ค้นหาเกมที่ต้องการ..."} className="w-full pl-12 pr-4 py-3.5 rounded-full border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all text-slate-600 font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-6"><div className={`w-1 h-6 rounded-full ${isPremiumMode ? 'bg-pink-500' : 'bg-blue-600'}`}></div><h2 className="text-lg font-bold text-slate-700">{isPremiumMode ? 'รายการแอปทั้งหมด' : 'รายการเกมทั้งหมด'}</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
            {filteredGames.map((game, index) => (<GameCard key={index} game={game} onClick={() => setSelectedGame(game)} />))}
        </div>
        {filteredGames.length === 0 && <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200"><div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-sm"><Search size={24} /></div><p className="text-slate-500 font-medium">ไม่พบ{isPremiumMode ? 'แอป' : 'เกม'}ที่คุณค้นหา</p></div>}
      </div>
      {selectedGame && <ProductModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}