'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Wallet, QrCode, Check, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TopupPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1=กรอกเงิน, 2=สแกนจ่าย
  const [loading, setLoading] = useState(false);

  // รายการยอดเงินแนะนำ
  const presetAmounts = [100, 300, 500, 1000, 2000, 5000];

  const handleNext = () => {
    if (!amount || Number(amount) <= 0) return alert("กรุณาระบุยอดเงิน");
    setStep(2);
  };

  const handleConfirmTopup = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         alert("กรุณาเข้าสู่ระบบ");
         router.push('/login');
         return;
      }

      // สร้างรายการเติมเงินใน Database
      const { error } = await supabase
        .from('topups')
        .insert([{
            user_id: user.id,
            amount: Number(amount),
            status: 'pending' // รอแอดมินอนุมัติ
        }]);

      if (error) throw error;

      alert("✅ แจ้งเติมเงินเรียบร้อย!\nกรุณารอแอดมินตรวจสอบและอนุมัติยอดเงินครับ");
      router.push('/'); // กลับหน้าแรก

    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="bg-blue-600 p-6 text-white text-center">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-80" />
                <h1 className="text-2xl font-bold">เติมเงินเข้ากระเป๋า</h1>
                <p className="text-blue-100 text-sm">Top-up Wallet</p>
            </div>

            <div className="p-6">
                {step === 1 ? (
                    // Step 1: กรอกยอดเงิน
                    <div className="space-y-6 animate-in slide-in-from-left">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ระบุยอดเงินที่ต้องการเติม</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Preset Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                            {presetAmounts.map((val) => (
                                <button 
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
                                >
                                    {val.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={handleNext}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all"
                        >
                            ถัดไป
                        </button>
                    </div>
                ) : (
                    // Step 2: สแกนจ่าย
                    <div className="space-y-6 text-center animate-in slide-in-from-right">
                        <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm">
                            <ArrowLeft size={16} /> แก้ไขยอดเงิน
                        </button>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="text-slate-500 text-sm mb-1">ยอดเงินที่ต้องโอน</div>
                            <div className="text-3xl font-bold text-blue-600">฿{Number(amount).toLocaleString()}</div>
                        </div>

                        <div className="relative w-64 h-64 mx-auto bg-white p-2 rounded-xl shadow-md border border-slate-200">
                             {/* ใส่รูป QR Code ใน public/qrcode.jpg */}
                             <img src="/qrcode.jpg" alt="QR Code" className="w-full h-full object-cover rounded-lg" />
                        </div>

                        <p className="text-slate-500 text-sm">
                            เมื่อโอนเงินเสร็จแล้ว กรุณากดปุ่มแจ้งเติมเงินด้านล่าง
                        </p>

                        <button 
                            onClick={handleConfirmTopup}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                            {loading ? 'กำลังส่งข้อมูล...' : 'แจ้งโอนเงินเรียบร้อย'}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}