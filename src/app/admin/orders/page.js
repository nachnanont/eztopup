'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Search, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, success, cancelled
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    // ดึงข้อมูล orders พร้อมข้อมูล user (username)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id (username, full_name, email)
      `)
      .order('created_at', { ascending: false }); // ใหม่สุดขึ้นก่อน

    if (data) setOrders(data);
    setLoading(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!confirm(`ยืนยันเปลี่ยนสถานะเป็น "${newStatus}" ?`)) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      // อัปเดตข้อมูลในหน้าเว็บทันทีโดยไม่ต้องโหลดใหม่
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  // กรองข้อมูลตาม Tab และ Search
  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = 
      order.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.target_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการคำสั่งซื้อ</h1>
        
        <button 
          onClick={fetchOrders} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={18} /> รีเฟรชข้อมูล
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 justify-between">
        
        {/* Filter Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-lg self-start">
          {['all', 'pending', 'success', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize
                ${filter === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'all' ? 'ทั้งหมด' : tab}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาเลข Transaction, ชื่อลูกค้า..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-medium">วันที่ / เวลา</th>
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">ลูกค้า</th>
                <th className="p-4 font-medium">สินค้า</th>
                <th className="p-4 font-medium">ราคา</th>
                <th className="p-4 font-medium text-center">สถานะ</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">ไม่พบรายการสั่งซื้อ</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors text-sm">
                    <td className="p-4 text-slate-500">
                      {new Date(order.created_at).toLocaleString('th-TH', { 
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' 
                      })}
                    </td>
                    <td className="p-4 font-mono text-slate-600 select-all">{order.transaction_id}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{order.profiles?.username || 'Unknown'}</div>
                      <div className="text-xs text-slate-400">UID: {order.target_id}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 font-medium">{order.package_name?.split('-')[0]}</div>
                      <div className="text-xs text-slate-500">{order.package_name?.split('-')[1]}</div>
                      {/* ถ้ามี Note การจ่ายแบบ Hybrid */}
                      {order.admin_note && (
                        <div className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1 w-fit">
                            {order.admin_note}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-700">฿{order.amount?.toLocaleString()}</td>
                    
                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                        ${order.status === 'success' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {order.status === 'success' && <CheckCircle size={12} />}
                        {order.status === 'cancelled' && <XCircle size={12} />}
                        {order.status === 'pending' && <Clock size={12} />}
                        
                        {order.status === 'pending' ? 'รอตรวจสอบ' : 
                         order.status === 'success' ? 'สำเร็จ' : 'ยกเลิก'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-4 text-right">
                      {order.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'success')}
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="อนุมัติ"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="ยกเลิก"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}