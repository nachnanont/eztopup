'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Edit, User, Shield, BadgeCheck, X, Save, Lock } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // เก็บข้อมูลคนล็อกอินปัจจุบัน (Me)
  const [myProfile, setMyProfile] = useState(null);

  // Modal Edit User
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchMyProfile();
    fetchUsers();
  }, []);

  const fetchMyProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          setMyProfile(data);
      }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({ 
        wallet_balance: user.wallet_balance, 
        points: user.points,
        full_name: user.full_name || '',
        phone: user.phone || '',
        role: user.role || 'user'
    });
  };

  const handleSaveUser = async () => {
    const { error } = await supabase
        .from('profiles')
        .update({
            wallet_balance: Number(editForm.wallet_balance),
            points: Number(editForm.points),
            full_name: editForm.full_name,
            phone: editForm.phone,
            role: editForm.role // จะอัปเดต role ด้วย
        })
        .eq('id', editingUser.id);

    if (error) alert('บันทึกไม่สำเร็จ: ' + error.message);
    else {
        alert('บันทึกเรียบร้อย');
        setEditingUser(null);
        fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // เช็คว่าเป็น Owner หรือไม่
  const isOwner = myProfile?.role === 'owner';

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">จัดการสมาชิก</h1>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหา Username หรือ Email..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-slate-500 text-sm">
                <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">ระดับ (Role)</th>
                    <th className="p-4">ชื่อ / เบอร์โทร</th>
                    <th className="p-4">เครดิต</th>
                    <th className="p-4">คะแนน</th>
                    <th className="p-4 text-right">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                        <td className="p-4">
                            <div className="font-bold text-slate-800">{user.username}</div>
                            <div className="text-xs text-slate-400">{user.email}</div>
                        </td>
                        <td className="p-4">
                            {user.role === 'admin' || user.role === 'owner' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">
                                    <Shield size={12}/> {user.role}
                                </span>
                            ) : user.role === 'reseller' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-600">
                                    <BadgeCheck size={12}/> ตัวแทน
                                </span>
                            ) : (
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">สมาชิกทั่วไป</span>
                            )}
                        </td>
                        <td className="p-4">
                            <div className="text-sm text-slate-700">{user.full_name || '-'}</div>
                            <div className="text-xs text-slate-400">{user.phone || '-'}</div>
                        </td>
                        <td className="p-4 text-blue-600 font-bold">฿{user.wallet_balance.toLocaleString()}</td>
                        <td className="p-4 text-amber-600 font-medium">{user.points.toLocaleString()} pts</td>
                        <td className="p-4 text-right">
                            <button onClick={() => handleEditClick(user)} className="p-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                                <Edit size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">แก้ไขข้อมูล: {editingUser.username}</h3>
                    <button onClick={() => setEditingUser(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="p-6 space-y-4">
                    
                    {/* --- ส่วนเลือก Role (ล็อคถ้าไม่ใช่ Owner) --- */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                            ระดับสมาชิก (Role) {!isOwner && <Lock size={10} className="text-red-500"/>}
                        </label>
                        <select 
                            className={`w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none
                                ${!isOwner ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                            value={editForm.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                            disabled={!isOwner} // <-- ล็อคตรงนี้
                        >
                            <option value="user">สมาชิกทั่วไป (User)</option>
                            <option value="reseller">ตัวแทนจำหน่าย (Reseller)</option>
                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                            {isOwner && <option value="owner">เจ้าของระบบ (Owner)</option>}
                        </select>
                        {!isOwner && <p className="text-[10px] text-red-500 mt-1">*เฉพาะ Owner เท่านั้นที่เปลี่ยนระดับสมาชิกได้</p>}
                        {isOwner && <p className="text-[10px] text-slate-400 mt-1">*Reseller จะได้ราคาสินค้าพิเศษ</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">เครดิต (Wallet)</label>
                            <input type="number" className="w-full border rounded-lg p-2 font-bold text-blue-600" value={editForm.wallet_balance} onChange={e => setEditForm({...editForm, wallet_balance: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">คะแนน (Points)</label>
                            <input type="number" className="w-full border rounded-lg p-2 font-bold text-amber-600" value={editForm.points} onChange={e => setEditForm({...editForm, points: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อ-นามสกุล</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทร</label>
                        <input type="text" className="w-full border rounded-lg p-2" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
                    <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">ยกเลิก</button>
                    <button onClick={handleSaveUser} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> บันทึก</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}