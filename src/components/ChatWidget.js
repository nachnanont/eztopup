'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // เพิ่มตัวแปรเช็คสถานะการโหลด (แก้ปัญหาปุ่มหาย)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // บอกว่าโหลดหน้าเว็บเสร็จแล้ว
    setMounted(true);
    
    // 1. เช็ค User ครั้งแรก
    checkUser();

    // 2. ฟังเหตุการณ์ Login/Logout (สำคัญมากสำหรับแท็บใหม่)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // ถ้ามีการเปลี่ยนแปลงสถานะ ให้เช็ค User ใหม่ทันที
        checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) fetchRoom(user.id);
  };

  const fetchRoom = async (userId) => {
    const { data: rooms } = await supabase.from('chat_rooms').select('id').eq('user_id', userId).limit(1);
    let currentRoomId = rooms?.[0]?.id;

    if (!currentRoomId) {
      const { data: newRoom } = await supabase.from('chat_rooms').insert([{ user_id: userId }]).select().single();
      currentRoomId = newRoom?.id;
    }
    setRoomId(currentRoomId);
    if (currentRoomId) subscribeToMessages(currentRoomId);
  };

  const subscribeToMessages = async (rId) => {
    const { data: oldMsgs } = await supabase
      .from('messages').select('*').eq('room_id', rId).order('created_at', { ascending: true });
    if (oldMsgs) setMessages(oldMsgs);

    const channel = supabase.channel(`room-${rId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${rId}` }, 
      (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId) return;
    const text = newMessage;
    setNewMessage('');
    await supabase.from('messages').insert([{ room_id: roomId, sender_role: 'user', content: text }]);
  };

  // --- LOGIC การแสดงผล ---

  // 1. ถ้ายังโหลดไม่เสร็จ (Server Side) ไม่ต้องแสดงอะไรเลย (กัน Error Hydration)
  if (!mounted) return null;

  // 2. ถ้าเป็นหน้า Admin หรือ Login ให้ซ่อน
  if (pathname?.startsWith('/admin') || pathname === '/login' || pathname === '/register') {
    return null;
  }

  // 3. แสดงผลปุ่มแชท
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      
      {/* หน้าต่างแชท */}
      {isOpen && (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
            <h3 className="font-bold flex items-center gap-2"><MessageCircle size={20} /> ติดต่อทีมงาน</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded"><X size={18} /></button>
          </div>

          {user ? (
            <>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                    {messages.length === 0 && <div className="text-center mt-10 text-slate-400 text-sm">ทักทายแอดมินได้เลยครับ 😊</div>}
                    {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender_role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                        {msg.content}
                        </div>
                    </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                    <input type="text" placeholder="พิมพ์ข้อความ..." className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700" disabled={!roomId}><Send size={18} /></button>
                </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><LogIn size={32} /></div>
                <div><h4 className="font-bold text-slate-700">กรุณาเข้าสู่ระบบ</h4><p className="text-sm text-slate-500 mt-1">คุณต้องเข้าสู่ระบบสมาชิกก่อน<br/>เพื่อเริ่มแชทกับทีมงาน</p></div>
                <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 w-full">เข้าสู่ระบบ</Link>
            </div>
          )}
        </div>
      )}

      {/* ปุ่มเปิด/ปิด */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}