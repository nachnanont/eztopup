'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// รวม import ไว้ในบรรทัดเดียว ไม่ซ้ำซ้อน
import { Search, LogOut, User as UserIcon, Wallet, FileClock } from 'lucide-react'; 
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
         checkUser();
       }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

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
        
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold text-blue-600 tracking-tight hover:opacity-80 transition-opacity">
            EZTopCard
          </Link>

          {/* Menu */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/?category=game" className="hover:text-blue-600 transition-colors">
              เติมเกม
            </Link>
            <Link href="/?category=premium" className="hover:text-blue-600 transition-colors">
              แอปพรีเมียม
            </Link>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors hidden sm:block">
            <Search size={20} />
          </button>
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

          {loading ? (
            <div className="w-24 h-8 bg-slate-100 rounded-full animate-pulse"></div>
          ) : user ? (
            // --- User Info ---
            <div className="flex items-center gap-3">
                
                {/* กรอบแคปซูล: รูป | ชื่อ | เงิน */}
                <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 pr-4 shadow-sm hover:shadow-md transition-all cursor-default select-none gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                        <UserIcon size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate hidden md:block">
                        {user.username || "สมาชิก"}
                    </span>
                    <div className="w-px h-4 bg-slate-200 hidden md:block"></div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-blue-600">
                        <Wallet size={16} strokeWidth={2.5} />
                        <span>฿{(user.wallet_balance || 0).toLocaleString()}</span>
                    </div>
                </div>

                {/* ปุ่ม History & Logout */}
                <div className="flex items-center gap-1">
                    <Link
                        href="/history"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title="ประวัติการสั่งซื้อ"
                    >
                        <FileClock size={20} />
                    </Link>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="ออกจากระบบ"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
          ) : (
            // --- Guest Info ---
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600">
                เข้าสู่ระบบ
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-lg">
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}