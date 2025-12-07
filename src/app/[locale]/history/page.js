'use client';

// เพิ่มบรรทัดนี้เพื่อแก้ปัญหา Build Error ครับ
export const dynamic = 'force-dynamic'; 

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Clock, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        router.push('/login');
        return;
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle size={14} /> สำเร็จ</span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold"><XCircle size={14} /> ยกเลิก</span>;
      default:
        return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold"><Clock size={14} /> รอตรวจสอบ</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" /> ประวัติการสั่งซื้อ
        </h1>

        <div className="space-y-4">
            {loading ? (
                <div className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล...</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <ShoppingBag size={32} />
                    </div>
                    <p className="text-slate-500">คุณยังไม่มีประวัติการสั่งซื้อ</p>
                    <button onClick={() => router.push('/')} className="mt-4 text-blue-600 hover:underline text-sm font-medium">
                        ไปเลือกซื้อสินค้าเลย
                    </button>
                </div>
            ) : (
                orders.map((item) => (
                    <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg">{item.package_name}</h4>
                                <p className="text-xs text-slate-400 font-mono mt-1">Transaction ID: {item.transaction_id}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-blue-600">฿{item.amount.toLocaleString()}</div>
                                <div className="mt-1">{getStatusBadge(item.status)}</div>
                            </div>
                        </div>
                        
                        <div className="border-t border-slate-100 my-3"></div>
                        
                        <div className="flex justify-between items-center text-sm text-slate-500">
                            <div>
                                <span className="mr-2">UID/Account:</span>
                                <span className="font-medium text-slate-700">{item.target_id}</span>
                            </div>
                            <div>
                                {new Date(item.created_at).toLocaleString('th-TH', { 
                                    day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit' 
                                })}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}