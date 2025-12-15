'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Wallet, QrCode, Check, Loader2, ArrowLeft, RefreshCw, Clock } from 'lucide-react';

export default function TopupPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1=กรอกเงิน, 2=สแกนจ่าย
  const [loading, setLoading] = useState(false);

  // QR & Countdown States
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 นาที

  // รายการยอดเงินแนะนำ
  const presetAmounts = [100, 300, 500, 1000, 2000, 5000];

  // ✅ 1. ตั้งเวลาเริ่มต้นเมื่อเข้าหน้า QR
  useEffect(() => {
    if (step === 2) setTimeLeft(900);
  }, [step]);

  // ✅ 2. ตัวนับเวลาถอยหลัง
  useEffect(() => {
    if (step !== 2 || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // ✅ 3. ระบบ Realtime ดักฟังยอดเงิน
  useEffect(() => {
    let channel;
    if (step === 2 && qrData?.transaction_id) {
        console.log("🎧 เริ่มดักฟังสถานะบิล:", qrData.transaction_id);

        channel = supabase
            .channel('wait-for-topup-page')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'topups',
                    filter: `transaction_id=eq.${qrData.transaction_id}`
                },
                (payload) => {
                    if (payload.new.status === 'success') {
                        handleSuccess(payload.new.amount);
                    }
                }
            )
            .subscribe();
    }
    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, [step, qrData]);

  const handleCreateQr = async () => {
    const topupAmount = Number(amount);
    if (!topupAmount || topupAmount < 10) return alert("กรุณาระบุยอดเงินขั้นต่ำ 10 บาท");

    setLoading(true);
    try {
      // ดึง Token เพื่อส่งให้ API (แก้ปัญหา Unauthorized บน Vercel)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         alert("กรุณาเข้าสู่ระบบ");
         router.push('/login');
         return;
      }

      // ยิง API สร้าง QR
      const res = await fetch('/api/topup/create-qr', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ amount: topupAmount })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้าง QR Code ไม่สำเร็จ');

      setQrData(data);
      setStep(2); // ไปหน้าสแกน

    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (receivedAmount) => {
      alert(`✅ เติมเงินสำเร็จ ${Number(receivedAmount).toLocaleString()} บาท`);
      router.push('/profile'); // เด้งไปหน้า Profile เพื่อดูยอดเงิน
      router.refresh();
  };

  const manualCheckPayment = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
            .from('topups')
            .select('status, amount')
            .eq('transaction_id', qrData.transaction_id)
            .single();

        if (data && data.status === 'success') {
            handleSuccess(data.amount);
        } else {
            alert("⚠️ ยังไม่พบยอดเงินเข้าระบบ\n(หากโอนแล้ว กรุณารอสักครู่ ระบบกำลังดำเนินการ)");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
                <p className="text-blue-100 text-sm">ระบบเติมเงินอัตโนมัติ (Auto)</p>
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
                                    placeholder="ขั้นต่ำ 10 บาท"
                                    className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                    min="10"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">*รองรับทุกธนาคารและ TrueMoney Wallet (ผ่านพร้อมเพย์)</p>
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
                            onClick={handleCreateQr}
                            disabled={loading || !amount || Number(amount) < 10}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2
                                ${loading || !amount || Number(amount) < 10 ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <QrCode size={20} />}
                            {loading ? 'กำลังสร้าง QR...' : 'สร้าง QR Code'}
                        </button>
                    </div>
                ) : (
                    // Step 2: สแกนจ่าย (QR Code Auto)
                    <div className="space-y-6 text-center animate-in slide-in-from-right">
                        <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mx-auto">
                            <ArrowLeft size={16} /> เปลี่ยนยอดเงิน
                        </button>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="text-slate-500 text-sm mb-1">ยอดเงินที่ต้องโอน (รวมเศษสตางค์)</div>
                            <div className="text-4xl font-bold text-blue-600">฿{qrData?.amount_check.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-red-500 mt-1 font-bold animate-pulse">*กรุณาโอนยอดนี้ให้ตรงเป๊ะๆ ห้ามปัดเศษ*</div>
                        </div>

                        <div className="relative w-64 h-64 mx-auto bg-white p-2 rounded-xl shadow-md border border-slate-200">
                             {/* แสดงรูป QR ที่ได้จาก API */}
                             <img src={qrData?.qr_image} alt="QR Code" className="w-full h-full object-cover rounded-lg" />
                             {loading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
                        </div>

                        <div className="flex items-center justify-center gap-2 text-slate-500">
                             <Clock size={18} />
                             <span>ชำระภายใน: </span>
                             <span className={`font-mono font-bold text-xl ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                                {formatTime(timeLeft)}
                             </span>
                             <span>นาที</span>
                        </div>

                        <p className="text-slate-400 text-xs">
                            ระบบจะตรวจสอบยอดเงินอัตโนมัติเมื่อท่านโอนเสร็จ
                        </p>

                        <button 
                            onClick={manualCheckPayment}
                            disabled={loading}
                            className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                            ตรวจสอบยอดเงิน / รีเฟรช
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}