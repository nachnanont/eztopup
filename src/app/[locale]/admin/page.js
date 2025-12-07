'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, DollarSign, Clock, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayIncome: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // 1. ดึงข้อมูลออเดอร์ทั้งหมด
    const { data: orders } = await supabase
      .from('orders')
      .select('amount, status, created_at');

    if (orders) {
      const today = new Date().toISOString().split('T')[0];
      
      const total = orders.length;
      const pending = orders.filter(o => o.status === 'pending').length;
      
      // คำนวณยอดเงินวันนี้ (เฉพาะที่ success)
      const income = orders
        .filter(o => o.status === 'success' && o.created_at.startsWith(today))
        .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

      setStats({ totalOrders: total, pendingOrders: pending, todayIncome: income });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">ภาพรวมระบบ</h1>

      {/* Cards Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card 1: รอตรวจสอบ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">รอตรวจสอบ</p>
            <h3 className="text-3xl font-bold text-blue-600 mt-1">{stats.pendingOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 2: ยอดขายวันนี้ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">ยอดขายวันนี้</p>
            <h3 className="text-3xl font-bold text-green-600 mt-1">฿{stats.todayIncome.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Card 3: ออเดอร์ทั้งหมด */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">คำสั่งซื้อทั้งหมด</p>
            <h3 className="text-3xl font-bold text-slate-700 mt-1">{stats.totalOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
        </div>

      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800 text-sm">
        💡 <b>Tips:</b> กดที่เมนู <b>"จัดการคำสั่งซื้อ"</b> ด้านซ้าย เพื่อเข้าไปกดอนุมัติออเดอร์ครับ
      </div>
    </div>
  );
}