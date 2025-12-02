'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, RefreshCw, Wallet, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function AdminTopups() {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopups();
  }, []);

  const fetchTopups = async () => {
    setLoading(true);
    // ดึงรายการเติมเงิน + ชื่อคนเติม
    const { data } = await supabase
      .from('topups')
      .select('*, profiles:user_id (username, email, wallet_balance)')
      .order('created_at', { ascending: false });
      
    if (data) setTopups(data);
    setLoading(false);
  };

  const handleApprove = async (topup) => {
    if (!confirm(`ยืนยันอนุมัติยอดเงิน ${topup.amount} บาท ให้ ${topup.profiles.username}?`)) return;

    try {
        // 1. อัปเดตสถานะ Topup เป็น success
        const { error: updateTopupError } = await supabase
            .from('topups')
            .update({ status: 'success' })
            .eq('id', topup.id);
            
        if (updateTopupError) throw updateTopupError;

        // 2. บวกเงินให้ User (Logic สำคัญ!)
        // ดึงเงินล่าสุดก่อน
        const { data: userData } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', topup.user_id)
            .single();
            
        const newBalance = (Number(userData.wallet_balance) || 0) + Number(topup.amount);

        // อัปเดตเงิน
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', topup.user_id);

        if (updateProfileError) throw updateProfileError;

        alert("✅ อนุมัติสำเร็จ! เติมเงินให้ลูกค้าเรียบร้อยแล้ว");
        fetchTopups(); // รีโหลดตาราง

    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleReject = async (id) => {
    if (!confirm("ยืนยันปฏิเสธรายการนี้?")) return;
    
    const { error } = await supabase
        .from('topups')
        .update({ status: 'cancelled' })
        .eq('id', id);

    if (!error) fetchTopups();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">รายการแจ้งเติมเงิน</h1>
        <button onClick={fetchTopups} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw size={18} /> รีเฟรช
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
            <tr>
              <th className="p-4">เวลา</th>
              <th className="p-4">ลูกค้า</th>
              <th className="p-4">ยอดเติม</th>
              <th className="p-4 text-center">สถานะ</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topups.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-4 text-sm text-slate-500">
                    {new Date(item.created_at).toLocaleString('th-TH')}
                </td>
                <td className="p-4">
                    <div className="font-bold text-slate-800">{item.profiles?.username}</div>
                    <div className="text-xs text-slate-400">คงเหลือ: ฿{item.profiles?.wallet_balance?.toLocaleString()}</div>
                </td>
                <td className="p-4">
                    <div className="font-bold text-green-600 text-lg">+฿{item.amount.toLocaleString()}</div>
                </td>
                <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                        ${item.status === 'success' ? 'bg-green-100 text-green-700' :
                          item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                        {item.status === 'pending' ? 'รอตรวจสอบ' : item.status}
                    </span>
                </td>
                <td className="p-4 text-right">
                    {item.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleApprove(item)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="อนุมัติ (เติมเงินเข้า)">
                                <Check size={20} />
                            </button>
                            <button onClick={() => handleReject(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="ปฏิเสธ">
                                <X size={20} />
                            </button>
                        </div>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}