'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Gamepad2, 
  Image as ImageIcon, 
  LogOut, 
  Loader2,
  Menu,
  X,
  Wallet,
  MessageSquare,
  User
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // เพิ่ม State เก็บข้อมูลคนล็อกอิน (เผื่อเอาไปใช้แสดงผล)
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // 1. เช็คว่าล็อกอินไหม
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // 2. เช็ค Role ใน Database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', user.id)
        .single();

      if (error || !profile) throw new Error('Profile not found');

      // 3. กฎเหล็ก: ถ้าไม่ใช่ admin หรือ owner -> ดีดออกไปหน้าแรก
      if (profile.role !== 'admin' && profile.role !== 'owner') {
        router.replace('/'); // ใช้ replace เพื่อไม่ให้กด Back กลับมาได้
        return;
      }

      // ถ้าผ่านด่านมาได้ ให้เก็บข้อมูลไว้และหยุดโหลด
      setCurrentUser(profile);
      fetchUnreadCount();
      
      // ฟัง Realtime Chat Badge
      const channel = supabase.channel('admin-sidebar-badge')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnreadCount())
        .subscribe();

      setLoading(false);

    } catch (error) {
      console.error("Access Denied:", error.message);
      router.replace('/login'); // ดีดไปหน้า Login
    }
  };

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('sender_role', 'user');
    setUnreadChatCount(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ถ้ากำลังโหลด หรือยังเช็คสิทธิ์ไม่ผ่าน ให้โชว์หน้าโหลดค้างไว้ (ห้ามโชว์เนื้อหาหลุด)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="animate-spin w-10 h-10 mb-4 text-blue-600" />
        <p>กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
      </div>
    );
  }

  const menuItems = [
    { name: 'ภาพรวม', icon: LayoutDashboard, path: '/admin' },
    { name: 'จัดการสมาชิก', icon: User, path: '/admin/users' },
    { name: 'ตอบแชทลูกค้า', icon: MessageSquare, path: '/admin/chat', badge: unreadChatCount }, 
    { name: 'จัดการคำสั่งซื้อ', icon: ShoppingBag, path: '/admin/orders' },
    { name: 'รายการเติมเงิน', icon: Wallet, path: '/admin/topups' },
    { name: 'จัดการสินค้า', icon: Gamepad2, path: '/admin/products' },
    { name: 'จัดการแบนเนอร์', icon: ImageIcon, path: '/admin/banners' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <span className="text-xl font-bold text-blue-600">EZAdmin</span>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={20} /></button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="px-4 py-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                ผู้ใช้งาน: <span className={currentUser?.role === 'owner' ? 'text-red-500' : 'text-blue-500'}>{currentUser?.username} ({currentUser?.role})</span>
            </div>
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link key={item.path} href={item.path} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium group ${isActive ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <div className="flex items-center gap-3"><item.icon size={20} />{item.name}</div>
                  {item.badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">{item.badge > 99 ? '99+' : item.badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><LogOut size={20} />ออกจากระบบ</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600"><Menu size={24} /></button>
          <span className="ml-4 font-bold text-slate-700">Dashboard</span>
        </header>
        <div className="flex-1 overflow-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}