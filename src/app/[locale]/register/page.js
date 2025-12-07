'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // เรียกตัวเชื่อมที่เราทำไว้
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Phone, UserCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกันครับ");
      setLoading(false);
      return;
    }

    try {
      // 2. สมัครสมาชิกกับ Supabase Auth (สร้าง User)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData?.user) {
        // 3. บันทึกข้อมูลส่วนตัวลงตาราง profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id, // ใช้ ID เดียวกับ Auth
              username: formData.username,
              full_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              wallet_balance: 0,
              points: 0,
              role: 'user'
            }
          ]);

        if (profileError) {
            // ถ้าบันทึก Profile ไม่ผ่าน (เช่น Username ซ้ำ) อาจจะต้องแจ้งเตือน
            console.error("Error creating profile:", profileError);
            alert("สมัครสมาชิกสำเร็จ แต่บันทึกข้อมูลส่วนตัวไม่ผ่าน: " + profileError.message);
        } else {
            alert("สมัครสมาชิกเรียบร้อย! ยินดีต้อนรับครับ");
            router.push('/login'); // เด้งไปหน้า Login
        }
      }

    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">สมัครสมาชิก</h1>
          <p className="text-slate-500">กรอกข้อมูลเพื่อเริ่มต้นใช้งาน EZTopCard</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Username */}
          <div className="relative">
            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              name="username"
              type="text"
              placeholder="Username (ชื่อผู้ใช้)"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>

          {/* ชื่อ-นามสกุล */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              name="fullName"
              type="text"
              placeholder="ชื่อ - นามสกุล"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>

          {/* เบอร์โทร */}
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              name="phone"
              type="tel"
              placeholder="เบอร์โทรศัพท์"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>

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

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              name="confirmPassword"
              type="password"
              placeholder="ยืนยันรหัสผ่านอีกครั้ง"
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
                    <Loader2 className="animate-spin" /> กำลังสมัคร...
                </>
            ) : (
                <>
                    สมัครสมาชิก <ArrowRight size={20} />
                </>
            )}
          </button>

        </form>

        <div className="text-center mt-6 text-slate-500 text-sm">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}