'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ล็อกอินด้วย Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // ถ้าผ่าน ให้เด้งไปหน้าแรก
      alert("เข้าสู่ระบบสำเร็จ!");
      router.push('/'); 
      router.refresh(); // รีเฟรชเพื่อให้ Navbar รู้ว่าล็อกอินแล้ว

    } catch (error) {
      alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">เข้าสู่ระบบ</h1>
          <p className="text-slate-500">ยินดีต้อนรับกลับสู่ EZTopCard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              name="email"
              type="email"
              placeholder="อีเมล"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              name="password"
              type="password"
              placeholder="รหัสผ่าน"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" /> กำลังตรวจสอบ...
                </>
            ) : (
                <>
                    เข้าสู่ระบบ <LogIn size={20} />
                </>
            )}
          </button>

        </form>

        <div className="text-center mt-6 text-slate-500 text-sm">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="text-blue-600 font-bold hover:underline">
            สมัครสมาชิกฟรี
          </Link>
        </div>
      </div>
    </div>
  );
}