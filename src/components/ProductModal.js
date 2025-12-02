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

  // ตรวจสอบว่าเป็นแอปพรีเมียมหรือไม่
  const isPremium = game.category === 'premium';

  useEffect(() => {
    setMounted(true);
    fetchUserData();
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
        
        // ถ้าเป็นแอปพรีเมียม และลูกค้ามีอีเมลอยู่แล้ว ให้ดึงมาใส่ให้เลยเพื่อความสะดวก
        if (isPremium && profile?.email) {
            setTargetId(profile.email);
        }
    }
  };

  if (!mounted || !game) return null;

  // Mock Packages
  const rawPackages = game.services || game.items || [
    { id: 1, name: 'แพคเกจเริ่มต้น', price: 35 },
    { id: 2, name: 'แพคเกจสุดคุ้ม', price: 100 },
    { id: 3, name: 'แพคเกจจัดหนัก', price: 350 },
  ];

  const packages = Array.isArray(rawPackages) ? rawPackages.map((pkg, index) => ({
    ...pkg,
    id: pkg.id || `pkg-${index}`,
    name: pkg.name || `แพคเกจ ${index + 1}`,
    price: pkg.price || pkg.amount || 0 
  })) : [];

  const price = selectedPackage?.price || 0;
  const isBalanceEnough = walletBalance >= price;
  const deductFromWallet = isBalanceEnough ? price : walletBalance;
  const missingAmount = price - deductFromWallet; 

  const handleNextStep = () => {
      if (!selectedPackage) return alert("กรุณาเลือกแพคเกจ");
      
      const label = isPremium ? "Email ของคุณ" : "UID";
      if (!targetId) return alert(`กรุณากรอก ${label}`);

      if (isBalanceEnough) {
          if(confirm(`ยืนยันชำระเงิน ${price.toLocaleString()} บาท?\n\n${label}: ${targetId}\nแพคเกจ: ${selectedPackage.name}`)) {
              processPayment();
          }
      } else {
          setShowQrStep(true);
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

      if (isBalanceEnough) {
          alert(`✅ สั่งซื้อสำเร็จ! \nยอดเงินคงเหลือ: ${data.newBalance} บาท`);
      } else {
          alert(`✅ แจ้งชำระเงินเรียบร้อย!\n\nระบบกำลังตรวจสอบยอดเงิน...\nหากเครดิตไม่เข้าหรือติดปัญหา\nกรุณาติดต่อ Line: @eztopcard`);
      }
      
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 transition-all min-h-[500px] flex">
        
        {/* ================= หน้า QR Code (Popup ที่ 2) ================= */}
        {showQrStep ? (
            <div className="w-full h-full bg-white flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0">
                    <button onClick={() => setShowQrStep(false)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
                        <ArrowLeft size={20} /> กลับไปเลือกแพคเกจ
                    </button>
                    <h3 className="font-bold text-slate-700">ชำระเงินส่วนต่าง</h3>
                    <div className="w-8"></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
                    
                    <div className="w-full max-w-xs bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 space-y-2 text-sm">
                        <h4 className="font-bold text-slate-800 text-center mb-2 text-base">{selectedPackage?.name}</h4>
                        
                        <div className="flex justify-between text-slate-500">
                            <span>ราคารวม</span>
                            <span>฿{price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-blue-600">
                            <span className="flex items-center gap-1"><Wallet size={12}/> ตัด Wallet</span>
                            <span>- ฿{deductFromWallet.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-slate-300 my-1"></div>
                        <div className="flex justify-between items-center text-base">
                            <span className="font-bold text-slate-800">ยอดโอนสุทธิ</span>
                            <span className="font-bold text-red-600 text-lg">฿{missingAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                        <div className="relative w-72 h-72 mx-auto bg-white p-2 rounded-xl shadow-lg border border-slate-200">
                             <img src="/qrcode.jpg" alt="QR Code" className="w-full h-full object-cover rounded-lg" />
                        </div>
                        <p className="text-slate-500 text-sm">สแกนเพื่อชำระยอด <b className="text-red-500 text-lg">{missingAmount.toLocaleString()}</b> บาท</p>
                    </div>
                </div>

                <div className="p-4 border-t bg-white shrink-0">
                    <button 
                        onClick={processPayment}
                        disabled={isLoading}
                        className="w-full max-w-md mx-auto py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                        {isLoading ? 'กำลังส่งข้อมูล...' : 'ชำระเงินเรียบร้อย'}
                    </button>
                </div>
            </div>
        ) : (
            // ================= หน้าเลือกของ (ปกติ) =================
            <div className="flex flex-col md:flex-row w-full h-full">
                {/* Left Side */}
                <div className="w-full md:w-1/3 bg-slate-50 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-slate-100 relative overflow-y-auto">
                    <button onClick={onClose} className="absolute top-4 left-4 md:hidden p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-600 z-20">
                        <X size={20} />
                    </button>
                    <div className="relative w-32 h-32 mb-4 rounded-2xl overflow-hidden shadow-lg mt-8 md:mt-0 bg-white shrink-0">
                        {imageUrl ? (
                            <Image src={imageUrl} alt={game.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-200" />
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 text-center mb-2">{game.name}</h2>
                    
                    {/* --- ส่วนกรอกข้อมูล (เปลี่ยนตามประเภทสินค้า) --- */}
                    <div className="w-full space-y-2 mt-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                            {isPremium ? "Email ของคุณ (เพื่อรับข้อมูล)" : "UID / Player ID"}
                            {isPremium && <Mail size={14} className="text-blue-500"/>}
                        </label>
                        
                        {isPremium ? (
                            // ช่องกรอก Email
                            <input 
                                type="email"
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="ระบุ Email ของคุณ..."
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            />
                        ) : (
                            // ช่องกรอก UID
                            <input 
                                type="text" 
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="ระบุ UID..." 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        )}
                        
                        {/* คำแนะนำสำหรับ Premium */}
                        {isPremium && (
                            <div className="bg-blue-50 p-3 rounded-lg mt-2 border border-blue-100 flex gap-2 items-start">
                                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    <span className="font-bold">หมายเหตุ:</span> ระบบจะทำการส่งรายละเอียดบัญชีให้ทาง Email นี้ หากเป็นบริการที่ใช้ Email ของลูกค้า โปรดรอ Email ยืนยันเพื่อเริ่มใช้งาน
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 w-full bg-blue-50 p-3 rounded-xl flex justify-between items-center text-blue-800 text-sm font-medium">
                        <span className="flex items-center gap-2"><Wallet size={16}/> เงินในกระเป๋า</span>
                        <span className="font-bold text-lg">฿{walletBalance.toLocaleString()}</span>
                    </div>
                </div>

                {/* Right Side */}
<div className="w-full md:w-2/3 flex flex-col h-full bg-white relative"> {/* เพิ่ม relative */}
    
    {/* 1. Header (อยู่นิ่งๆ) */}
    <div className="flex justify-between items-center p-6 pb-2 shrink-0"> {/* เพิ่ม shrink-0 */}
        <h3 className="font-bold text-lg text-slate-700">เลือกแพคเกจ</h3>
        <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500">
            <X size={24} />
        </button>
    </div>

    {/* 2. Package List (เลื่อนได้) */}
    {/* สำคัญ: ใช้ flex-1 overflow-y-auto เพื่อให้ส่วนนี้ยืดเต็มที่และเลื่อนได้ถ้าเกิน */}
    <div className="flex-1 overflow-y-auto p-6 pt-2"> 
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* ... (loop packages เหมือนเดิม) ... */}
        </div>
    </div>

    {/* 3. Footer Button (อยู่นิ่งๆ ด้านล่าง) */}
    <div className="p-4 border-t border-slate-100 mt-auto bg-white shrink-0 z-10"> {/* เพิ่ม bg-white, shrink-0 */}
        <button
            // ... (ปุ่มเหมือนเดิม) ...
        >
            {/* ... content ปุ่ม ... */}
        </button>
    </div>
</div>
            </div>
        )}

      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}