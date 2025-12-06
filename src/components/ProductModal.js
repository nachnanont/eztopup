'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ShoppingCart, Loader2, QrCode, ArrowLeft, Wallet, Info, Mail } from 'lucide-react';
import Image from 'next/image';
import { getGameImage } from '@/lib/imageMap';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProductModal({ game, onClose }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const [targetId, setTargetId] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showQrStep, setShowQrStep] = useState(false);
  const [qrData, setQrData] = useState(null);

  const isPremium = game.category === 'premium';

  useEffect(() => {
    setMounted(true);
    fetchUserData();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; }
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        setUser(profile);
        setWalletBalance(profile?.wallet_balance || 0);
        
        if (isPremium && profile?.email) {
            setTargetId(profile.email);
        }
    }
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
      const label = isPremium ? "Email ของคุณ" : "UID";
      if (!targetId) return alert(`กรุณากรอก ${label}`);

      if (isBalanceEnough) {
          if(confirm(`ยืนยันชำระเงิน ${price.toLocaleString()} บาท?`)) {
              processPayment();
          }
      } else {
          setIsLoading(true);
          try {
              const res = await fetch('/api/topup/create-qr', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
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
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_name: game.name,
          product_id: game.id || game.product_id,
          package_name: selectedPackage.name,
          price: selectedPackage.price,
          uid: targetId,
          slip_image: null,
          pay_method: isBalanceEnough ? 'wallet' : 'hybrid', 
          wallet_deduct: deductFromWallet 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ทำรายการไม่สำเร็จ');

      if (isBalanceEnough) alert(`✅ สั่งซื้อสำเร็จ! \nยอดเงินคงเหลือ: ${data.newBalance} บาท`);
      else alert(`✅ แจ้งชำระเงินเรียบร้อย!\n\nระบบจะตรวจสอบยอดเงินและดำเนินการสั่งซื้อให้ทันที`);
      
      router.refresh();
      onClose();
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const imageUrl = getGameImage(game.name, game.image);

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] md:h-[600px] overflow-hidden relative z-10 transition-all flex flex-col md:flex-row">
        
        {/* ================= หน้า QR Code (แก้ไขขนาดตรงนี้) ================= */}
        {showQrStep && qrData && (
            <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <button onClick={() => setShowQrStep(false)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold">
                        <ArrowLeft size={20} /> ย้อนกลับ
                    </button>
                    <h3 className="font-bold text-slate-700">ชำระเงินส่วนต่าง</h3>
                    <div className="w-8"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                    <div className="w-full max-w-xs bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 space-y-3 text-center">
                        <h4 className="font-bold text-slate-800 text-lg">{selectedPackage?.name}</h4>
                        <div className="border-t border-slate-200"></div>
                        <div className="flex justify-between text-slate-600 text-sm">
                            <span>ราคาทั้งหมด</span><span>฿{price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-blue-600 text-sm">
                            <span>ตัดจาก Wallet</span><span>- ฿{deductFromWallet.toLocaleString()}</span>
                        </div>
                        <div className="bg-white border border-blue-100 p-2 rounded-lg mt-2">
                            <div className="text-xs text-slate-500">ยอดที่ต้องโอน (รวมเศษสตางค์)</div>
                            <div className="text-2xl font-bold text-red-600">฿{qrData.amount_check.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                    
                    {/* แก้ไขขนาดรูปตรงนี้: ใช้ w-full max-w-sm เพื่อให้ใหญ่เต็มที่แต่ไม่ล้นจอ */}
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 relative w-full max-w-sm aspect-square flex items-center justify-center">
                        <img 
                            src={qrData.qr_image} 
                            alt="QR Code" 
                            className="w-full h-full object-contain rounded-lg" 
                        />
                        
                        {isLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
                    </div>
                    <p className="text-slate-500 text-sm mt-4">กรุณาสแกน QR Code เพื่อชำระเงิน</p>
                </div>

                <div className="p-4 border-t bg-white shrink-0">
                    <button onClick={processPayment} disabled={isLoading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700">
                        {isLoading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                        {isLoading ? 'กำลังส่งข้อมูล...' : 'ชำระเงินเรียบร้อย'}
                    </button>
                </div>
            </div>
        )}

        {/* ================= Selection Screen (ส่วนเลือกแพคเกจ เหมือนเดิม) ================= */}
        <div className="w-full md:w-1/3 bg-slate-50 p-4 md:p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 relative shrink-0 h-[35%] md:h-full overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 left-4 md:hidden p-2 bg-white rounded-full shadow-sm text-slate-400 z-10"><X size={20} /></button>
            <div className="relative w-24 h-24 md:w-32 md:h-32 mb-3 rounded-2xl overflow-hidden shadow-lg bg-white shrink-0 mt-2 md:mt-6">
                {imageUrl ? <Image src={imageUrl} alt={game.name} fill className="object-cover" /> : <div className="w-full h-full bg-slate-200" />}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 text-center mb-4 px-2">{game.name}</h2>
            <div className="w-full space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">{isPremium ? "Email / บัญชี" : "UID / Player ID"}</label>
                {isPremium ? (
                    <input type="email" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="example@email.com" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-medium" />
                ) : (
                    <input type="text" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="ระบุ UID..." className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm" />
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
                    <span className="flex items-center gap-2 text-slate-500 text-sm"><Wallet size={16}/> คงเหลือ</span>
                    <span className="font-bold text-blue-600">฿{walletBalance.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-lg text-slate-700">เลือกแพคเกจ</h3>
                <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
                <div className="md:hidden flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                    <Wallet size={12}/> ฿{walletBalance.toLocaleString()}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                {packages.length === 0 ? (
                    <div className="text-center text-slate-400 mt-10">ไม่พบแพคเกจสำหรับเกมนี้</div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-20 md:pb-4">
                        {packages.map((pkg) => {
                            const isSelected = selectedPackage?.id === pkg.id;
                            return (
                                <button key={pkg.id} onClick={() => setSelectedPackage(pkg)} className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-start gap-1 text-left ${isSelected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-100 hover:border-blue-200 bg-white shadow-sm'}`}>
                                    {isSelected && <div className="absolute top-2 right-2 text-blue-600"><Check size={16} strokeWidth={3} /></div>}
                                    <span className="font-bold text-sm text-slate-700 line-clamp-2 w-[90%]">{pkg.name}</span>
                                    {pkg.description && <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded line-clamp-1">{pkg.description}</span>}
                                    <span className="text-lg font-bold text-blue-600 mt-auto">฿{pkg.price.toLocaleString()}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 z-10 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
                <button disabled={!selectedPackage || !targetId || isLoading} onClick={handleNextStep} className={`w-full py-3 md:py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading || !selectedPackage || !targetId ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:-translate-y-0.5'}`}>
                    {isBalanceEnough ? <ShoppingCart size={20} /> : <QrCode size={20} />}
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