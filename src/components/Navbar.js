'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, LogOut, User as UserIcon, Wallet, FileClock } from 'lucide-react'; 
import { supabase } from '@/lib/supabase';
import { useLocale } from 'next-intl'; // 1. นำเข้า useLocale

function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');
  
  // 2. ดึงภาษาปัจจุบัน
  const locale = useLocale(); 

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
    router.push(`/${locale}/login`); // Redirect ตามภาษาปัจจุบัน
    router.refresh();
  };

  // 3. ฟังก์ชันสลับภาษา
  const toggleLanguage = () => {
    const nextLocale = locale === 'th' ? 'en' : 'th';
    // แทนที่ /th เป็น /en หรือกลับกัน ใน URL ปัจจุบัน
    // เช่น /th/profile -> /en/profile
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    router.push(newPath);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex-shrink-0 w-48">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="relative w-8 h-8 md:w-10 md:h-10">
                <Image src="/logo.png" alt="EZ Topup" fill className="object-contain" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-blue-600 tracking-tight">
                EZ Topup
            </span>
          </Link>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center justify-center flex-1 gap-8 text-sm font-medium">
          <Link 
            href={`/?category=game`} 
            className={`transition-colors px-3 py-2 rounded-full ${
                currentCategory !== 'premium' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            {locale === 'th' ? 'เติมเกม' : 'Top Up'}
          </Link>
          <Link 
            href={`/?category=premium`} 
            className={`transition-colors px-3 py-2 rounded-full ${
                currentCategory === 'premium' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            {locale === 'th' ? 'แอปพรีเมียม' : 'Premium Apps'}
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-end gap-3 w-auto">
          
          {/* User Section */}
          {loading ? (
            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center gap-2">
                <Link href="/profile" className="flex items-center bg-white border border-slate-200 rounded-full p-1 pr-3 shadow-sm gap-2 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon size={14} />
                    </div>
                    <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-blue-600">
                        <Wallet size={12} strokeWidth={2.5} />
                        <span>฿{(user.wallet_balance || 0).toLocaleString()}</span>
                    </div>
                </Link>
                <Link href="/history" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full">
                    <FileClock size={20} />
                </Link>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                    <LogOut size={20} />
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hidden sm:block">
                {locale === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
              </Link>
              <Link href="/register" className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-sm">
                {locale === 'th' ? 'สมัครสมาชิก' : 'Register'}
              </Link>
            </div>
          )}

          {/* 4. ปุ่มเปลี่ยนภาษา (แบบใช้รูปภาพ) */}
          <button 
            onClick={toggleLanguage}
            className="ml-1 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-all shadow-sm border border-slate-200 overflow-hidden"
            title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            {/* Logic: 
                - ถ้าตอนนี้เป็นไทย (th) -> ให้โชว์รูปธงอังกฤษ (เพื่อให้กดเปลี่ยน)
                - ถ้าตอนนี้เป็นอังกฤษ (en) -> ให้โชว์รูปธงไทย
            */}
            <Image 
                src={locale === 'th' ? '/flag-en.png' : '/flag-th.png'} 
                alt="Language" 
                width={38} 
                height={38} 
                className="object-cover"
            />
          </button>

        </div>

      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<nav className="h-16 bg-white/80 border-b border-slate-100"></nav>}>
      <NavbarContent />
    </Suspense>
  );
}