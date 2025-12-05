'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // นำเข้า Image
import { useRouter } from 'next/navigation';
import { Search, LogOut, User as UserIcon, Wallet, FileClock } from 'lucide-react'; 
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') checkUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setUser(profile || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo & Name */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* ใส่รูป Logo ตรงนี้ (ต้องมีไฟล์ public/logo.png) */}
            <div className="relative w-16 h-16 md:w-16 md:h-16">
                <Image src="/logo.png" alt="EZ Topup" fill className="object-contain" />
            </div>
            
          </Link>
        </div>

        {/* Menu (เหลือแค่เติมเกม) */}
        

        {/* Right Side */}
        <div className="flex items-center justify-end gap-4">
          {loading ? (
            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 pr-3 shadow-sm gap-2">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon size={14} />
                    </div>
                    <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-blue-600">
                        <Wallet size={12} strokeWidth={2.5} />
                        <span>฿{(user.wallet_balance || 0).toLocaleString()}</span>
                    </div>
                </div>
                <Link href="/history" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full">
                    <FileClock size={20} />
                </Link>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                    <LogOut size={20} />
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600">เข้าสู่ระบบ</Link>
              <Link href="/register" className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-sm">สมัครสมาชิก</Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}