'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, LogOut, User as UserIcon, Wallet, FileClock, History } from 'lucide-react'; 
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative w-8 h-8 md:w-10 md:h-10">
                <Image src="/logo.png" alt="EZ Topup" fill className="object-contain" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-blue-600 tracking-tight">
                EZ Topup
            </span>
          </Link>
        </div>

        {/* Spacer (ดันเมนูขวาไปสุดขอบ) */}
        <div className="flex-1"></div>

        {/* Right Side: User Menu */}
        <div className="flex items-center justify-end gap-3">
          {loading ? (
            <div className="w-24 h-8 bg-slate-100 rounded-full animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center gap-2 md:gap-4">
                
                {/* 1. ปุ่ม Wallet (โชว์ยอดเงิน + กดเติมได้) */}
                <Link 
                    href="/profile" 
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"
                    title="เติมเครดิต"
                >
                    <Wallet size={18} />
                    <span className="font-bold text-sm md:text-base">฿{(user.wallet_balance || 0).toLocaleString()}</span>
                </Link>

                {/* 2. ปุ่มประวัติการเติมเงิน */}
                <Link 
                    href="/history"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all relative group"
                    title="ประวัติการสั่งซื้อ"
                >
                    <History size={22} />
                    {/* Tooltip */}
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        ประวัติ
                    </span>
                </Link>

                {/* 3. ปุ่ม Profile */}
                <Link 
                    href="/profile"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all relative group"
                    title="ข้อมูลส่วนตัว"
                >
                    <UserIcon size={22} />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        โปรไฟล์
                    </span>
                </Link>

                {/* เส้นคั่น */}
                <div className="w-px h-6 bg-slate-200"></div>

                {/* 4. ปุ่ม Logout */}
                <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all relative group"
                    title="ออกจากระบบ"
                >
                    <LogOut size={22} />
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">เข้าสู่ระบบ</Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-md shadow-blue-200 transition-all">สมัครสมาชิก</Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}