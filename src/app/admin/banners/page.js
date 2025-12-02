'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Eye, EyeOff, Upload, Plus, Link as LinkIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // State สำหรับฟอร์มเพิ่มแบนเนอร์
  const [newBanner, setNewBanner] = useState({ title: '', link_url: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    // ดึงข้อมูลทั้งหมด (รวมที่ปิดอยู่ด้วย เพื่อให้แอดมินเห็น)
    // แต่เราต้องใช้ select * โดยไม่ผ่าน RLS ของ public (ที่กรอง is_active)
    // ในที่นี้เราเป็น admin ผ่าน policy แล้ว น่าจะเห็นหมด
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setBanners(data);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("กรุณาเลือกรูปภาพ");
    setUploading(true);

    try {
      // 1. Upload รูปไปที่ Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 2. ขอ URL รูป
      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(filePath);

      // 3. บันทึกลง Database
      const { error: dbError } = await supabase
        .from('banners')
        .insert([{
            title: newBanner.title || 'ไม่มีชื่อ',
            link_url: newBanner.link_url,
            image_url: publicUrl,
            is_active: true
        }]);

      if (dbError) throw dbError;

      // รีเซ็ตฟอร์ม
      alert("✅ เพิ่มแบนเนอร์สำเร็จ");
      setSelectedFile(null);
      setNewBanner({ title: '', link_url: '' });
      if(fileInputRef.current) fileInputRef.current.value = '';
      fetchBanners();

    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, imageUrl) => {
    if (!confirm("ยืนยันลบแบนเนอร์นี้?")) return;

    // ลบจาก Database
    await supabase.from('banners').delete().eq('id', id);
    
    // (Optional) ลบรูปจริงออกจาก Storage ด้วยก็ได้ แต่เพื่อความง่ายข้ามไปก่อน
    // setBanners(banners.filter(b => b.id !== id)); // ลบออกจากหน้าจอ
    fetchBanners();
  };

  const toggleActive = async (banner) => {
    await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id);
    fetchBanners();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">จัดการแบนเนอร์</h1>

      {/* Upload Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Plus size={20} className="text-blue-600"/> เพิ่มแบนเนอร์ใหม่
        </h3>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* ช่องเลือกรูป */}
            <div 
                className="w-full md:w-1/3 aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden"
                onClick={() => fileInputRef.current.click()}
            >
                {selectedFile ? (
                    <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                    <div className="text-center text-slate-400">
                        <Upload size={32} className="mx-auto mb-2" />
                        <span className="text-sm">คลิกเพื่อเลือกรูป</span>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                />
            </div>

            {/* ช่องกรอกข้อมูล */}
            <div className="flex-1 w-full space-y-4">
                <div>
                    <label className="text-sm font-medium text-slate-600 block mb-1">ชื่อแบนเนอร์ (กันลืม)</label>
                    <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="เช่น โปรโมชั่นปีใหม่..."
                        value={newBanner.title}
                        onChange={(e) => setNewBanner({...newBanner, title: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-600 block mb-1">ลิงก์ปลายทาง (ถ้ามี)</label>
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://..."
                            value={newBanner.link_url}
                            onChange={(e) => setNewBanner({...newBanner, link_url: e.target.value})}
                        />
                    </div>
                </div>
                
                <button 
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                    {uploading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin"/> กำลังอัปโหลด...</span> : 'บันทึกแบนเนอร์'}
                </button>
            </div>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner) => (
            <div key={banner.id} className={`bg-white rounded-xl border overflow-hidden transition-all ${!banner.is_active ? 'opacity-60 grayscale' : 'shadow-sm border-slate-200'}`}>
                <div className="relative aspect-video w-full bg-slate-100">
                    <Image src={banner.image_url} alt={banner.title} fill className="object-cover" />
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800">{banner.title}</h4>
                        {banner.link_url && (
                            <a href={banner.link_url} target="_blank" className="text-xs text-blue-500 hover:underline truncate max-w-[200px] block">
                                {banner.link_url}
                            </a>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => toggleActive(banner)}
                            className={`p-2 rounded-lg ${banner.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                            {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button 
                            onClick={() => handleDelete(banner.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}