'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ShoppingCart, Loader2, QrCode, ArrowLeft, Wallet, Info, Server, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ฟังก์ชันช่วยดึงรูปเกม (ถ้าไม่มีรูปให้ใช้รูป Placeholder หรือรูป Default)
// ถ้าคุณมีไฟล์ imageMap.js ให้ import มาใช้ ถ้าไม่มีให้คอมเมนต์บรรทัดนี้ออกแล้วใช้รูปตรงๆ
// import { getGameImage } from '@/lib/imageMap'; 

export default function ProductModal({ game, onClose }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Input States
  const [targetId, setTargetId] = useState('');
  const [serverId, setServerId] = useState(''); // เก็บค่าช่องที่ 2
  
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // QR & Countdown States
  const [showQrStep, setShowQrStep] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const isPremium = game?.category === 'premium';

  // ดึง Config ช่องกรอก (ถ้ามี) หรือใช้ Default
  const label1 = game?.input_1_label || (isPremium ? "Email / บัญชี" : "UID / Player ID");
  const placeholder1 = game?.input_1_placeholder || (isPremium ? "example@email.com" : "ระบุ UID...");
  
  const label2 = game?.input_2_label || null; // ถ้าเป็น null คือไม่มีช่อง 2
  const placeholder2 = game?.input_2_placeholder || "ระบุข้อมูล...";
  const options2 = game?.input_2_options || []; // ตัวเลือก Dropdown (ถ้ามี)

  useEffect(() => {
    setMounted(true);
    fetchUserData();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; }
  }, []);

  // 1. ตั้งเวลาเริ่มต้นเมื่อได้ QR
  useEffect(() => {
    if (showQrStep && qrData?.time_out) {
        setTimeLeft(qrData.time_out);
    }
  }, [showQrStep, qrData]);

  // 2. นับถอยหลังทุก 1 วินาที
  useEffect(() => {
    if (!showQrStep || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showQrStep, timeLeft]);

  // 3. ระบบ Realtime ดักฟังการจ่ายเงิน
  useEffect(() => {
    let channel;
    if (showQrStep && qrData?.transaction_id) {
        console.log("🎧 รอฟังผลการชำระเงินบิล:", qrData.transaction_id);

        channel = supabase
            .channel('wait-for-payment')
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
                        handlePaymentSuccess(payload.new.amount);
                    }
                }
            )
            .subscribe();
    }
    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, [showQrStep, qrData]);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUser(profile);
        setWalletBalance(profile?.wallet_balance || 0);
        if (isPremium && profile?.email) setTargetId(profile.email);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePaymentSuccess = (amount) => {
      // 1. ปิดหน้า QR
      setShowQrStep(false);
      // 2. อัปเดตยอดเงินในกระเป๋า UI ทันที
      const addedAmount = Number(amount);
      setWalletBalance(prev => prev + addedAmount);
      
      alert(`✅ ได้รับยอดเงิน ${addedAmount.toLocaleString()} บาทเรียบร้อยแล้ว!\nระบบกำลังดำเนินการสั่งซื้อ...`);
      
      // 3. สั่งซื้อสินค้าต่อทันที (ถ้าต้องการ) หรือให้ลูกค้ากดเอง
      // ในที่นี้เราจะให้ลูกค้ากดปุ่ม "ชำระเงิน" เองอีกครั้งเพื่อความชัวร์ หรือจะเรียก processPayment() เลยก็ได้
      // processPayment(true); // <--- ถ้าจะให้ซื้อออโต้เลยให้เปิดบรรทัดนี้แล้วแก้ function processPayment ให้รับ parameter
  };

  if (!mounted || !game) return null;

  const rawPackages = game.services || game.items || game.products || [];
  const packages = Array.isArray(rawPackages) ? rawPackages.map((pkg, index) => ({
    ...pkg,
    id: pkg.id || `pkg-${index}`,
    name: pkg.name || `Package ${index + 1}`,
    price: Number(pkg.price || pkg.amount || 0),
    description: pkg.description 
  })) : [];

  const price = selectedPackage?.price || 0;
  const isBalanceEnough = walletBalance >= price;
  const deductFromWallet = isBalanceEnough ? price : walletBalance;
  const missingAmount = price - deductFromWallet; 

  const handleNextStep = async () => {
      if (!selectedPackage) return alert("กรุณาเลือกแพคเกจ");
      if (!targetId) return alert(`กรุณากรอก ${label1}`);
      if (label2 && !serverId) return alert(`กรุณากรอก ${label2}`);

      if (isBalanceEnough) {
          if(confirm(`ยืนยันชำระเงิน ${price.toLocaleString()} บาท?`)) processPayment();
      } else {
          setIsLoading(true);
          try {
              // ดึง Token เพื่อส่งไป Header (แก้เรื่อง Unauthorized ใน Localhost)
              const { data: { session } } = await supabase.auth.getSession();
              const accessToken = session?.access_token;
              
              if (!accessToken) {
                  alert("กรุณาเข้าสู่ระบบใหม่");
                  window.location.href = '/login';
                  return;
              }

              const res = await fetch('/api/topup/create-qr', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                  },
                  body: JSON.stringify({ amount: missingAmount })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'สร้าง QR Code ไม่สำเร็จ');

              setQrData(data);
              setShowQrStep(true);
          } catch (error) {
              alert(error.message);
          } finally {
              setIsLoading(false);
          }
      }
  }

  const processPayment = async () => {
    setIsLoading(true);
    // รวมข้อมูล 2 ช่อง (Format: "UID | Server: 1234")
    const finalTargetId = label2 ? `${targetId} | ${label2}: ${serverId}` : targetId;

    try {
      // ดึง Token
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          game_name: game.name,
          product_id: game.id || game.product_id,
          package_name: selectedPackage.name,
          price: selectedPackage.price,
          uid: finalTargetId, 
          slip_image: null,
          pay_method: isBalanceEnough ? 'wallet' : 'hybrid', 
          wallet_deduct: deductFromWallet 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ทำรายการไม่สำเร็จ');

      alert(`✅ สั่งซื้อสำเร็จ! \nยอดเงินคงเหลือ: ${data.newBalance || (walletBalance - price).toLocaleString()} บาท`);
      router.refresh();
      onClose();
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ใช้รูป Custom ถ้ามี หรือใช้รูปจาก Object
  const imageUrl = game.custom_image || game.image || "/images/placeholder.png"; 

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] md:h-[600px] overflow-hidden relative z-10 transition-all flex flex-col md:flex-row">
        
        {/* ================= QR Code Screen ================= */}
        {showQrStep && qrData && (
            <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <button onClick={() => setShowQrStep(false)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold"><ArrowLeft size={20} /> ย้อนกลับ</button>
                    <h3 className="font-bold text-slate-700">ชำระเงินส่วนต่าง</h3><div className="w-8"></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                    <div className="w-full max-w-xs bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 space-y-3 text-center">
                        <h4 className="font-bold text-slate-800 text-lg">{selectedPackage?.name}</h4>
                        <div className="border-t border-slate-200"></div>
                        <div className="flex justify-between text-slate-600 text-sm"><span>ราคาทั้งหมด</span><span>฿{price.toLocaleString()}</span></div>
                        <div className="flex justify-between text-blue-600 text-sm"><span>ตัดจาก Wallet</span><span>- ฿{deductFromWallet.toLocaleString()}</span></div>
                        <div className="bg-white border border-blue-100 p-2 rounded-lg mt-2 shadow-sm">
                            <div className="text-xs text-slate-500 mb-1">ยอดที่ต้องโอน (กรุณาโอนให้ตรงเศษสตางค์)</div>
                            <div className="text-3xl font-bold text-blue-600">฿{qrData.amount_check.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 relative">
                        {/* แสดง QR Code */}
                        <img src={qrData.qr_image} alt="QR Code" className="w-48 h-48 object-cover rounded-lg" />
                        
                        {/* โหลดดิ้งซ้อน QR (ถ้ามี) */}
                        {isLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
                    </div>

                    {/* ⏳ เวลานับถอยหลัง */}
                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide font-semibold">Time Remaining</p>
                        <div className={`text-3xl font-mono font-bold tabular-nums tracking-wider ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">ระบบจะตรวจสอบยอดเงินอัตโนมัติ</p>
                    </div>

                </div>
                {/* ปุ่ม Manual Check (เผื่อ Realtime ไม่ทำงาน) */}
                <div className="p-4 border-t bg-white shrink-0">
                    <button onClick={() => window.location.reload()} className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors text-sm">
                        หากหน้านี้ไม่เปลี่ยนอัตโนมัติ กดที่นี่เพื่อรีเฟรช
                    </button>
                </div>
            </div>
        )}

        {/* ================= Selection Screen ================= */}
        
        {/* Left Side: รูป + ช่องกรอก */}
        <div className="w-full md:w-1/3 bg-slate-50 p-4 md:p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 relative shrink-0 h-[45%] md:h-full overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 left-4 md:hidden p-2 bg-white rounded-full shadow-sm text-slate-400 z-10"><X size={20} /></button>
            
            <div className="relative w-24 h-24 md:w-32 md:h-32 mb-3 rounded-2xl overflow-hidden shadow-lg bg-white shrink-0 mt-2 md:mt-6 border border-slate-200">
                <Image src={imageUrl} alt={game.name} fill className="object-cover" />
            </div>
            
            <h2 className="text-lg md:text-xl font-bold text-slate-800 text-center mb-4 px-2">{game.custom_name || game.name}</h2>
            
            <div className="w-full space-y-3">
                {/* --- ช่องกรอกที่ 1 --- */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                        {label1}
                    </label>
                    <input type="text" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder={placeholder1} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all hover:border-blue-300" />
                </div>

                {/* --- ช่องกรอกที่ 2 (แสดงเฉพาะเมื่อตั้งค่าไว้) --- */}
                {label2 && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 flex items-center gap-1">
                            {label2} <Server size={12}/>
                        </label>
                        
                        {/* ถ้ามี Options ให้แสดง Dropdown, ถ้าไม่มีให้แสดง Text Input */}
                        {options2.length > 0 ? (
                            <div className="relative">
                                <select value={serverId} onChange={(e) => setServerId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white cursor-pointer hover:border-blue-300 transition-all">
                                    <option value="">-- กรุณาเลือก --</option>
                                    {options2.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            </div>
                        ) : (
                            <input type="text" value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder={placeholder2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all hover:border-blue-300" />
                        )}
                    </div>
                )}
                
                {isPremium && (
                    <div className="bg-blue-100/50 p-2 rounded-lg border border-blue-100 flex gap-2">
                        <Info size={16} className="text-blue-600 shrink-0" />
                        <p className="text-[10px] text-blue-800 leading-tight">ระบบจะจัดส่งข้อมูลบัญชีไปให้ทาง Email นี้</p>
                    </div>
                )}
            </div>

            <div className="mt-auto w-full pt-4 hidden md:block">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <span className="flex items-center gap-2 text-slate-500 text-sm font-medium"><Wallet size={16} className="text-slate-400"/> คงเหลือ</span>
                    <span className="font-bold text-blue-600 text-lg">฿{walletBalance.toLocaleString()}</span>
                </div>
            </div>
        </div>

        {/* Right Side */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-lg text-slate-700">เลือกแพคเกจ</h3>
                <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                <div className="md:hidden flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100"><Wallet size={12}/> ฿{walletBalance.toLocaleString()}</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                {packages.length === 0 ? (
                    <div className="text-center text-slate-400 mt-10">ไม่พบแพคเกจสำหรับเกมนี้</div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-20 md:pb-4">
                        {packages.map((pkg) => {
                            const isSelected = selectedPackage?.id === pkg.id;
                            return (
                                <button key={pkg.id} onClick={() => setSelectedPackage(pkg)} className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-start gap-1 text-left group ${isSelected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-md' : 'border-slate-100 hover:border-blue-300 bg-white shadow-sm hover:shadow-md'}`}>
                                    {isSelected && <div className="absolute top-2 right-2 text-blue-600 bg-white rounded-full p-0.5 shadow-sm"><Check size={14} strokeWidth={4} /></div>}
                                    <span className={`font-bold text-sm line-clamp-2 w-[85%] ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{pkg.name}</span>
                                    {pkg.description && <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded line-clamp-1 group-hover:bg-blue-100/50 transition-colors">{pkg.description}</span>}
                                    <span className="text-lg font-bold text-blue-600 mt-auto pt-2">฿{pkg.price.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
                <button disabled={!selectedPackage || !targetId || (label2 && !serverId) || isLoading} onClick={handleNextStep} className={`w-full py-3 md:py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${isLoading || !selectedPackage || !targetId || (label2 && !serverId) ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5'}`}>
                    {isBalanceEnough ? <ShoppingCart size={22} /> : <QrCode size={22} />}
                    {isLoading ? 'กำลังประมวลผล...' : (!selectedPackage ? 'เลือกแพคเกจ' : (isBalanceEnough ? `ชำระเงิน ${price.toLocaleString()} บาท` : `สแกนจ่าย (${missingAmount.toLocaleString()} บ.)`))}
                </button>
            </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}