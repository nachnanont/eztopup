'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Save, Edit, Eye, EyeOff, Image as ImageIcon, Loader2, ChevronDown, ChevronRight, Star, X, Upload } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGameId, setExpandedGameId] = useState(null);
  
  const [editingGameId, setEditingGameId] = useState(null);
  const [gameForm, setGameForm] = useState({});
  const [uploading, setUploading] = useState(false);

  const [packageChanges, setPackageChanges] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('API Error');
      const apiGames = await res.json();

      const { data: dbGames } = await supabase.from('products').select('*');
      const { data: dbPackages } = await supabase.from('package_settings').select('*');

      const mergedData = apiGames.map(game => {
        const gameSetting = dbGames?.find(s => s.game_id === game.name) || {};
        
        const rawPackages = game.services || game.items || game.products || [];
        const mergedPackages = rawPackages.map((pkg, idx) => {
            const pkgId = pkg.id || pkg.name || `pkg-${idx}`;
            const pkgSetting = dbPackages?.find(s => s.game_id === game.name && s.package_id === pkgId) || {};
            
            return {
                ...pkg,
                id: pkgId,
                name: pkg.name, // ชื่อเดิมจาก API
                cost: Number(pkg.price || pkg.amount || 0),
                is_active: pkgSetting.is_active !== false,
                markup_type: pkgSetting.markup_type || 'fixed',
                markup_value: Number(pkgSetting.markup_value || 0),
                description: pkgSetting.description || '',
                custom_name: pkgSetting.custom_name || '' // ชื่อที่ตั้งเอง
            };
        });

        return {
          ...game,
          original_name: game.name,
          custom_name: gameSetting.custom_name,
          custom_image: gameSetting.custom_image,
          is_active: gameSetting.is_active !== false,
          is_popular: gameSetting.is_popular || false,
          packages: mergedPackages
        };
      });

      setProducts(mergedData);

    } catch (error) {
      console.error(error);
      alert("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const toggleGameActive = async (game) => {
    const newState = !game.is_active;
    await supabase.from('products').upsert({ game_id: game.original_name, is_active: newState }, { onConflict: 'game_id' });
    setProducts(products.map(p => p.original_name === game.original_name ? { ...p, is_active: newState } : p));
  };

  const togglePopular = async (game) => {
    const newState = !game.is_popular;
    await supabase.from('products').upsert({ game_id: game.original_name, is_popular: newState }, { onConflict: 'game_id' });
    setProducts(products.map(p => p.original_name === game.original_name ? { ...p, is_popular: newState } : p));
  };

  const saveGameSettings = async (game) => {
    setUploading(true);
    try {
        let finalImageUrl = gameForm.custom_image;
        if (gameForm.file) {
            const file = gameForm.file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
            if (uploadError) throw new Error('อัปโหลดรูปไม่สำเร็จ: ' + uploadError.message);
            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
            finalImageUrl = publicUrl;
        }
        const { error } = await supabase.from('products').upsert({
            game_id: game.original_name,
            custom_name: gameForm.custom_name,
            custom_image: finalImageUrl
        }, { onConflict: 'game_id' });
        if (error) throw error;
        setEditingGameId(null);
        fetchData();
    } catch (error) {
        alert(error.message);
    } finally {
        setUploading(false);
    }
  };

  const handlePackageChange = (gameId, pkgId, field, value) => {
    const key = `${gameId}-${pkgId}`;
    setPackageChanges(prev => ({
        ...prev,
        [key]: { ...prev[key], [field]: value }
    }));
  };

  const savePackage = async (gameId, pkg) => {
    const key = `${gameId}-${pkg.id}`;
    const changes = packageChanges[key] || {};
    
    const payload = {
        game_id: gameId,
        package_id: pkg.id,
        is_active: changes.is_active !== undefined ? changes.is_active : pkg.is_active,
        markup_type: changes.markup_type || pkg.markup_type,
        markup_value: changes.markup_value !== undefined ? Number(changes.markup_value) : pkg.markup_value,
        description: changes.description !== undefined ? changes.description : pkg.description,
        custom_name: changes.custom_name !== undefined ? changes.custom_name : pkg.custom_name // บันทึกชื่อใหม่
    };

    const { error } = await supabase.from('package_settings').upsert(payload, { onConflict: 'game_id, package_id' });

    if (error) alert('บันทึกไม่ได้: ' + error.message);
    else {
        const newChanges = { ...packageChanges };
        delete newChanges[key];
        setPackageChanges(newChanges);
        fetchData();
    }
  };

  const togglePackageActive = async (gameId, pkg) => {
      const newState = !pkg.is_active;
      await supabase.from('package_settings').upsert({
          game_id: gameId,
          package_id: pkg.id,
          is_active: newState
      }, { onConflict: 'game_id, package_id' });
      fetchData();
  };

  const filteredProducts = products.filter(p => 
    (p.custom_name || p.original_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">จัดการสินค้า & ราคา</h1>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อเกม..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin inline mr-2"/> กำลังโหลด...</div>
        ) : filteredProducts.map((game) => (
            <div key={game.original_name} className={`bg-white border rounded-xl overflow-hidden transition-all ${!game.is_active ? 'opacity-70 border-slate-200 bg-slate-50' : 'border-slate-200 shadow-sm'}`}>
                
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <button 
                        onClick={() => setExpandedGameId(expandedGameId === game.original_name ? null : game.original_name)}
                        className="hidden md:block p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        {expandedGameId === game.original_name ? <ChevronDown /> : <ChevronRight />}
                    </button>

                    <div className="w-16 h-16 md:w-12 md:h-12 rounded-lg bg-slate-100 relative overflow-hidden border border-slate-200 shrink-0 mx-auto md:mx-0">
                        {editingGameId === game.original_name && gameForm.previewUrl ? (
                             <img src={gameForm.previewUrl} alt="preview" className="w-full h-full object-cover" />
                        ) : (game.custom_image || game.image) ? (
                            <img src={game.custom_image || game.image} alt="icon" className="w-full h-full object-cover" />
                        ) : <ImageIcon className="absolute inset-0 m-auto text-slate-300" />}
                    </div>

                    <div className="flex-1 min-w-0 text-center md:text-left">
                        {editingGameId === game.original_name ? (
                            <div className="flex flex-col gap-2">
                                <input 
                                    className="border rounded px-2 py-1.5 text-sm font-bold w-full md:w-64" 
                                    defaultValue={game.custom_name || game.original_name}
                                    onChange={e => setGameForm({...gameForm, custom_name: e.target.value})}
                                    placeholder="ชื่อเกม"
                                />
                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200 transition-colors">
                                        <Upload size={14} />
                                        {gameForm.file ? 'เลือกใหม่' : 'เปลี่ยนรูป'}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if(file) {
                                                    setGameForm({
                                                        ...gameForm, 
                                                        file: file,
                                                        previewUrl: URL.createObjectURL(file)
                                                    });
                                                }
                                            }}
                                        />
                                    </label>
                                    <span className="text-xs text-slate-400 truncate max-w-[150px]">
                                        {gameForm.file ? gameForm.file.name : 'ยังไม่เลือกไฟล์'}
                                    </span>
                                </div>
                                <div className="flex gap-2 mt-1 justify-center md:justify-start">
                                    <button 
                                        onClick={() => saveGameSettings(game)} 
                                        disabled={uploading}
                                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" size={12}/> : <Save size={14}/>} บันทึก
                                    </button>
                                    <button onClick={() => setEditingGameId(null)} className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300">ยกเลิก</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <h3 className="font-bold text-slate-800 truncate text-lg md:text-base">{game.custom_name || game.original_name}</h3>
                                {!game.is_active && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full whitespace-nowrap">ปิดใช้งาน</span>}
                                {game.is_popular && <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1"><Star size={10} fill="currentColor"/> ยอดฮิต</span>}
                                <button 
                                    onClick={() => {
                                        setEditingGameId(game.original_name);
                                        setGameForm({ 
                                            custom_name: game.custom_name || game.original_name, 
                                            custom_image: game.custom_image || game.image 
                                        });
                                    }}
                                    className="text-slate-300 hover:text-blue-500 p-1"
                                >
                                    <Edit size={16} />
                                </button>
                            </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1 md:mt-0.5">{game.packages.length} แพคเกจ</div>
                    </div>

                    <div className="flex gap-2 mt-2 md:mt-0 justify-center">
                        <button onClick={() => togglePopular(game)} className={`p-2 rounded-full transition-colors ${game.is_popular ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-100'}`} title={game.is_popular ? 'ยกเลิกยอดฮิต' : 'ตั้งเป็นยอดฮิต'}><Star size={20} fill={game.is_popular ? "currentColor" : "none"} /></button>
                        <button onClick={() => toggleGameActive(game)} className={`p-2 rounded-lg transition-colors ${game.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`} title={game.is_active ? 'ซ่อนทั้งเกม' : 'แสดงเกม'}>{game.is_active ? <Eye size={20} /> : <EyeOff size={20} />}</button>
                    </div>
                    
                    <button onClick={() => setExpandedGameId(expandedGameId === game.original_name ? null : game.original_name)} className="md:hidden w-full mt-2 py-2 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center gap-2 text-sm">
                        {expandedGameId === game.original_name ? 'ซ่อนรายการแพคเกจ' : 'ดูรายการแพคเกจ'} 
                        {expandedGameId === game.original_name ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>
                </div>

                {/* --- Packages Dropdown --- */}
                {expandedGameId === game.original_name && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead>
                                <tr className="text-slate-500 text-left">
                                    <th className="pb-2 pl-2 w-1/4">ชื่อแพคเกจ (API) / <span className="text-blue-600">ชื่อแสดงผล</span></th>
                                    <th className="pb-2 w-1/4">รายละเอียด</th>
                                    <th className="pb-2">ราคาทุน</th>
                                    <th className="pb-2">บวกกำไร</th>
                                    <th className="pb-2">ราคาขาย</th>
                                    <th className="pb-2 text-center">สถานะ</th>
                                    <th className="pb-2 text-right">บันทึก</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50">
                                {game.packages.map((pkg) => {
                                    const key = `${game.original_name}-${pkg.id}`;
                                    const changes = packageChanges[key] || {};
                                    
                                    const currentMarkupType = changes.markup_type || pkg.markup_type;
                                    const currentMarkupValue = changes.markup_value !== undefined ? changes.markup_value : pkg.markup_value;
                                    
                                    let sellingPrice = pkg.cost;
                                    if(currentMarkupType === 'percent') sellingPrice += (pkg.cost * currentMarkupValue / 100);
                                    else sellingPrice += Number(currentMarkupValue);
                                    sellingPrice = Math.ceil(sellingPrice);

                                    const isModified = packageChanges[key] !== undefined;

                                    return (
                                        <tr key={pkg.id} className={`${!pkg.is_active ? 'opacity-50' : ''}`}>
                                            {/* ช่องกรอกชื่อแพคเกจ */}
                                            <td className="py-3 pl-2 align-top">
                                                <div className="text-[10px] text-slate-400 mb-1 truncate max-w-[150px]" title={pkg.name}>{pkg.name}</div>
                                                <input 
                                                    type="text" 
                                                    className="w-full border rounded px-2 py-1 text-sm font-bold text-blue-700 bg-white"
                                                    placeholder="ตั้งชื่อแพคเกจ..."
                                                    value={changes.custom_name !== undefined ? changes.custom_name : (pkg.custom_name || '')}
                                                    onChange={(e) => handlePackageChange(game.original_name, pkg.id, 'custom_name', e.target.value)}
                                                />
                                            </td>
                                            
                                            {/* ช่องกรอกรายละเอียด */}
                                            <td className="py-3 pr-2 align-top">
                                                <textarea 
                                                    className="w-full border rounded px-2 py-1 text-xs text-slate-600 bg-white min-h-[40px] resize-y"
                                                    placeholder="รายละเอียด (เช่น ใช้ ID+Pass)"
                                                    value={changes.description !== undefined ? changes.description : (pkg.description || '')}
                                                    onChange={(e) => handlePackageChange(game.original_name, pkg.id, 'description', e.target.value)}
                                                />
                                            </td>

                                            <td className="py-3 text-slate-500 align-top">฿{pkg.cost.toLocaleString()}</td>
                                            
                                            <td className="py-3 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-green-600 text-xs">+</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-16 border rounded px-1 py-1 text-center bg-white"
                                                        value={currentMarkupValue}
                                                        onChange={(e) => handlePackageChange(game.original_name, pkg.id, 'markup_value', e.target.value)}
                                                    />
                                                    <select 
                                                        className="border rounded px-1 py-1 text-xs bg-white"
                                                        value={currentMarkupType}
                                                        onChange={(e) => handlePackageChange(game.original_name, pkg.id, 'markup_type', e.target.value)}
                                                    >
                                                        <option value="fixed">บาท</option>
                                                        <option value="percent">%</option>
                                                    </select>
                                                </div>
                                            </td>

                                            <td className="py-3 font-bold text-blue-600 align-top">฿{sellingPrice.toLocaleString()}</td>
                                            
                                            <td className="py-3 text-center align-top">
                                                <button 
                                                    onClick={() => togglePackageActive(game.original_name, pkg)}
                                                    className={`p-1 rounded transition-colors ${pkg.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-200'}`}
                                                >
                                                    {pkg.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                            </td>

                                            <td className="py-3 text-right align-top">
                                                {isModified && (
                                                    <button onClick={() => savePackage(game.original_name, pkg)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded shadow-sm hover:bg-blue-700 transition-colors">
                                                        บันทึก
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
}