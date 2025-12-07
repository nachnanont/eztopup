'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { User, Wallet, History, Settings, Gift, CreditCard, ShoppingBag, Save, Loader2, X, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [gameHistory, setGameHistory] = useState([]);
  const [topupHistory, setTopupHistory] = useState([]);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '' });
  const [isEditing, setIsEditing] = useState(false);

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(''); 
  const [topupStep, setTopupStep] = useState(1);
  const [topupLoading, setTopupLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  const [redeemPoints, setRedeemPoints] = useState(0);

  const presetAmounts = [50, 100, 300, 500, 1000, 3500];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
        router.push('/login');
        return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setUser(profile);
    setProfileForm({ full_name: profile.full_name || '', phone: profile.phone || '', email: profile.email || '' });
    
    const { data: games } = await supabase.from('orders').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
    setGameHistory(games || []);
    
    const { data: topups } = await supabase.from('topups').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
    setTopupHistory(topups || []);

    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase.from('profiles').update({
        full_name: profileForm.full_name,
        phone: profileForm.phone
    }).eq('id', user.id);

    if (error) alert('แก้ไขไม่สำเร็จ');
    else {
        alert('บันทึกข้อมูลเรียบร้อย');
        setIsEditing(false);
        fetchUserData();
    }
  };

  const handleRedeem = async () => {
    const creditToGet = Math.floor(redeemPoints / 10);
    if (creditToGet <= 0) return;
    if (redeemPoints > user.points) return alert('คะแนนสะสมไม่พอ');

    if (!confirm(`ยืนยันแลก ${redeemPoints} คะแนน เป็น ${creditToGet} เครดิต?`)) return;

    const newPoints = user.points - redeemPoints;
    const newBalance = user.wallet_balance + creditToGet;

    const { error } = await supabase.from('profiles').update({
        points: newPoints,
        wallet_balance: newBalance
    }).eq('id', user.id);

    if (!error) {
        alert('แลกคะแนนสำเร็จ!');
        setRedeemPoints(0);
        fetchUserData();
    }
  };

  const handleStartTopup = async () => {
      const amount = Number(topupAmount);
      if (isNaN(amount) || amount < 50 || amount > 9000) {
          return alert("กรุณาระบุยอดเงินระหว่าง 50 - 9,000 บาท");
      }

      setTopupLoading(true);
      try {
          const res = await fetch('/api/topup/create-qr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: amount })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'สร้างรายการไม่สำเร็จ');

          setQrData(data);
          setTopupStep(2);

      } catch (error) {
          alert('เกิดข้อผิดพลาด: ' + error.message);
      } finally {
          setTopupLoading(false);
      }
  };

  const handleConfirmPayment = () => {
      setTopupStep(3);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
            
            {/* Sidebar */}
            <div className="w-full md:w-64 shrink-0 space-y-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 border border-blue-100">
                        <User size={40} />
                    </div>
                    <h2 className="font-bold text-lg text-slate-800 truncate">{user.full_name || user.username}</h2>
                    <p className="text-sm text-slate-400 mb-4">{user.email}</p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-blue-50 rounded-xl p-2">
                            <div className="text-xs text-blue-400 font-medium mb-1">เครดิต</div>
                            <div className="text-blue-700 font-bold">฿{user.wallet_balance.toLocaleString()}</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-2">
                            <div className="text-xs text-amber-400 font-medium mb-1">คะแนน</div>
                            <div className="text-amber-600 font-bold">{user.points.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <nav className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors border-b border-slate-50 ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <Wallet size={20} /> กระเป๋าเครดิต
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors border-b border-slate-50 ${activeTab === 'history' ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <History size={20} /> ประวัติการใช้งาน
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-l-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <Settings size={20} /> ตั้งค่าบัญชี
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="text-blue-600"/> เติมเครดิต</h3>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                                {presetAmounts.map(amount => (
                                    <button key={amount} onClick={() => setTopupAmount(amount.toString())} className={`py-2 rounded-xl border font-bold transition-all ${Number(topupAmount) === amount ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-200' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}>{amount.toLocaleString()}</button>
                                ))}
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-600 mb-2">หรือระบุจำนวนเงิน (50 - 9,000 บาท)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                    <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="ระบุยอดเงิน..." className="w-full pl-10 pr-4 py-3 text-lg font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <button onClick={() => { setTopupStep(1); setShowTopupModal(true); }} disabled={!topupAmount || Number(topupAmount) < 50 || Number(topupAmount) > 9000} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all">ดำเนินการเติมเงิน</button>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Gift className="text-amber-500"/> แลกคะแนนสะสม</h3>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex justify-between items-center">
                                <div><p className="text-sm text-amber-800">คะแนนของคุณ</p><p className="text-2xl font-bold text-amber-600">{user.points} pts</p></div>
                                <div className="text-right"><p className="text-sm text-amber-800">อัตราแลกเปลี่ยน</p><p className="font-bold text-amber-600">10 คะแนน = 1 เครดิต</p></div>
                            </div>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1"><label className="text-sm font-medium text-slate-600 mb-2 block">จำนวนคะแนนที่ต้องการแลก</label><input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="0" value={redeemPoints > 0 ? redeemPoints : ''} onChange={(e) => setRedeemPoints(Number(e.target.value))} /></div>
                                <button onClick={handleRedeem} disabled={redeemPoints <= 0 || redeemPoints > user.points} className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:bg-slate-300 transition-all shrink-0">แลกเครดิต</button>
                            </div>
                            {redeemPoints > 0 && <p className="text-sm text-green-600 mt-2 font-medium">คุณจะได้รับ {Math.floor(redeemPoints / 10)} เครดิต</p>}
                        </div>
                    </div>
                )}
                {activeTab === 'history' && (
                    <div className="space-y-8">
                        {/* (History code is the same) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><ShoppingBag className="text-blue-600"/> ประวัติการสั่งซื้อสินค้า</h3>
                            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-400 border-b border-slate-100"><th className="pb-2">รายการ</th><th className="pb-2">ราคา</th><th className="pb-2">สถานะ</th><th className="pb-2 text-right">วันที่</th></tr></thead><tbody className="divide-y divide-slate-50">{gameHistory.map(item => (<tr key={item.id}><td className="py-3 font-medium text-slate-700">{item.package_name}</td><td className="py-3 text-blue-600 font-bold">฿{item.amount}</td><td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${item.status === 'success' ? 'bg-green-100 text-green-700' : item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td><td className="py-3 text-right text-slate-400">{new Date(item.created_at).toLocaleDateString('th-TH')}</td></tr>))}</tbody></table></div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="text-green-600"/> ประวัติการเติมเครดิต</h3>
                            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-400 border-b border-slate-100"><th className="pb-2">ยอดเงิน</th><th className="pb-2">สถานะ</th><th className="pb-2 text-right">วันที่</th></tr></thead><tbody className="divide-y divide-slate-50">{topupHistory.map(item => (<tr key={item.id}><td className="py-3 text-green-600 font-bold">+฿{item.amount.toLocaleString()}</td><td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${item.status === 'success' ? 'bg-green-100 text-green-700' : item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td><td className="py-3 text-right text-slate-400">{new Date(item.created_at).toLocaleDateString('th-TH')}</td></tr>))}</tbody></table></div>
                        </div>
                    </div>
                )}
                {activeTab === 'settings' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><Settings className="text-slate-600"/> แก้ไขข้อมูลส่วนตัว</h3>
                        <div className="space-y-4 max-w-md">
                            <div><label className="block text-sm font-medium text-slate-600 mb-1">ชื่อ - นามสกุล</label><input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" value={profileForm.full_name} onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})} disabled={!isEditing} /></div>
                            <div><label className="block text-sm font-medium text-slate-600 mb-1">เบอร์โทรศัพท์</label><input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} disabled={!isEditing} /></div>
                            <div><label className="block text-sm font-medium text-slate-600 mb-1">อีเมล (แก้ไขไม่ได้)</label><input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed" value={profileForm.email} disabled /></div>
                            <div className="pt-4">{isEditing ? (<div className="flex gap-3"><button onClick={handleUpdateProfile} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> บันทึก</button><button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">ยกเลิก</button></div>) : (<button onClick={() => setIsEditing(true)} className="px-6 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">แก้ไขข้อมูล</button>)}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- Topup Modal --- */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700">เติมเครดิต {Number(topupAmount).toLocaleString()} บาท</h3>
                    <button onClick={() => setShowTopupModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                
                <div className="p-6 flex flex-col items-center">
                    {topupStep === 1 && (
                       <div className="text-center w-full">
                           <p className="text-slate-600 mb-6">ยืนยันการสร้างรายการเติมเงิน?</p>
                           <button onClick={handleStartTopup} disabled={topupLoading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                               {topupLoading ? <Loader2 className="animate-spin"/> : 'ยืนยันสร้าง QR Code'}
                           </button>
                       </div>
                    )}
                    
                    {topupStep === 2 && qrData && (
                        <div className="space-y-6 text-center animate-in slide-in-from-right w-full">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="text-slate-500 text-sm mb-1">ยอดที่ต้องโอน (รวมเศษสตางค์)</div>
                                <div className="text-3xl font-bold text-blue-600">฿{qrData.amount_check.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                <div className="text-xs text-red-500 mt-1 font-medium animate-pulse">*กรุณาโอนยอดนี้ให้เป๊ะ เพื่อระบบอัตโนมัติ</div>
                            </div>

                            {/* แก้ไขตรงนี้: ใช้ w-full max-w-sm และ object-contain */}
                            <div className="relative w-full max-w-[280px] aspect-square mx-auto bg-white p-2 rounded-xl shadow-md border border-slate-200 flex items-center justify-center">
                                <img src={qrData.qr_image} alt="QR Code" className="w-full h-full object-contain rounded-lg" />
                            </div>
                            
                            <div className="text-sm text-slate-400">
                                ⏳ กรุณาโอนภายใน: {Math.floor(qrData.time_out / 60)} นาที
                            </div>

                            <button onClick={handleConfirmPayment} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg">
                                ชำระเงินเรียบร้อยแล้ว
                            </button>
                        </div>
                    )}
                    
                    {/* Step 3 code... */}
                    {topupStep === 3 && (
                        <div className="text-center py-8">
                            <CheckCircle size={64} className="text-green-500 mx-auto mb-4 animate-bounce" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">แจ้งชำระเงินเรียบร้อย</h3>
                            <p className="text-slate-500 text-sm mb-6">ระบบกำลังตรวจสอบยอดเงินอัตโนมัติ<br/>เครดิตจะเข้ากระเป๋าภายใน 1-2 นาทีครับ</p>
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 mb-6">
                                ติดปัญหา? ติดต่อ Line: @eztopup
                            </div>
                            <button onClick={() => { setShowTopupModal(false); fetchUserData(); }} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">ปิดหน้าต่าง</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}