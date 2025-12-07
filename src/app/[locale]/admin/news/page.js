'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // เรียกใช้ Supabase โดยตรง
import { Edit, Trash2, Plus, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function AdminNews() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    is_published: true
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูลตรงๆ จากตาราง posts
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      // ไม่ต้อง alert กวนใจถ้าแค่โหลดไม่ขึ้น
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    // สร้าง Slug อัตโนมัติ (เฉพาะภาษาอังกฤษ)
    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    setFormData({ ...formData, title, slug: formData.id ? formData.slug : slug });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
        const fileName = `${Date.now()}_${file.name}`;
        // อัปโหลดลง bucket 'blog' (ต้องสร้าง bucket นี้ใน Supabase Storage ด้วยนะครับ)
        const { error: uploadError } = await supabase.storage.from('blog').upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('blog').getPublicUrl(fileName);
        setFormData({ ...formData, image_url: data.publicUrl });
    } catch (error) {
        alert('อัปโหลดรูปไม่ผ่าน: ' + error.message);
    } finally {
        setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) return alert("กรุณากรอกหัวข้อและลิงก์ (Slug)");

    const payload = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt,
        content: formData.content,
        image_url: formData.image_url,
        is_published: formData.is_published,
        updated_at: new Date()
    };

    let error;
    if (formData.id) {
        const { error: updateError } = await supabase.from('posts').update(payload).eq('id', formData.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('posts').insert([payload]);
        error = insertError;
    }

    if (error) alert('บันทึกไม่สำเร็จ: ' + error.message);
    else {
        alert('บันทึกเรียบร้อย');
        setIsEditing(false);
        fetchPosts();
    }
  };

  const handleDelete = async (id) => {
      if(!confirm("ยืนยันลบข่าวนี้?")) return;
      await supabase.from('posts').delete().eq('id', id);
      fetchPosts();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการบทความ / ข่าวสาร</h1>
        {!isEditing && (
            <button onClick={() => {
                setFormData({ id: null, title: '', slug: '', excerpt: '', content: '', image_url: '', is_published: true });
                setIsEditing(true);
            }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus size={20} /> เขียนบทความใหม่
            </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-4xl">
            <div className="flex justify-between mb-4">
                <h3 className="font-bold text-lg">{formData.id ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}</h3>
                <button onClick={() => setIsEditing(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อข่าว</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={formData.title} onChange={handleTitleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                        <input type="text" className="w-full border rounded-lg p-2 bg-slate-50 font-mono text-sm" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} placeholder="ex. how-to-topup" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">คำโปรย (Excerpt)</label>
                    <textarea className="w-full border rounded-lg p-2 h-20" value={formData.excerpt} onChange={(e) => setFormData({...formData, excerpt: e.target.value})} placeholder="สรุปสั้นๆ..." />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">รูปปก</label>
                    <div className="flex items-center gap-4">
                        <div className="relative w-32 h-20 bg-slate-100 rounded-lg overflow-hidden border">
                            {formData.image_url ? (
                                <Image src={formData.image_url} alt="cover" fill className="object-cover" />
                            ) : <ImageIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400"/>}
                        </div>
                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เนื้อหาบทความ</label>
                    <textarea className="w-full border rounded-lg p-4 h-64 font-mono text-sm" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="เขียนเนื้อหาที่นี่..." />
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" id="publish" checked={formData.is_published} onChange={(e) => setFormData({...formData, is_published: e.target.checked})} className="w-4 h-4 text-blue-600"/>
                    <label htmlFor="publish" className="text-sm text-slate-700">เผยแพร่ทันที</label>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                    <button onClick={handleSave} disabled={uploading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        {uploading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} บันทึก
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="p-4 w-16">รูป</th>
                        <th className="p-4">หัวข้อ</th>
                        <th className="p-4">สถานะ</th>
                        <th className="p-4">วันที่</th>
                        <th className="p-4 text-right">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {posts.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">ยังไม่มีบทความ</td></tr>
                    ) : (
                        posts.map(post => (
                            <tr key={post.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="w-12 h-8 bg-slate-200 rounded overflow-hidden relative">
                                        {post.image_url && <Image src={post.image_url} alt="cover" fill className="object-cover" />}
                                    </div>
                                </td>
                                <td className="p-4 font-medium text-slate-700">
                                    {post.title}
                                    <div className="text-xs text-slate-400">/{post.slug}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {post.is_published ? 'เผยแพร่' : 'ซ่อน'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-500">{new Date(post.created_at).toLocaleDateString('th-TH')}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setFormData(post); setIsEditing(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(post.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}