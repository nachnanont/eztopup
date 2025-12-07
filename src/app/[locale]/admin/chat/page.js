'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Send, User, MessageSquare, Clock } from 'lucide-react';

export default function AdminChat() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({}); // เก็บจำนวนข้อความที่ไม่อ่าน { roomId: count }
  const messagesEndRef = useRef(null);

  // 1. โหลดรายชื่อห้อง + นับจำนวนที่ไม่อ่าน
  useEffect(() => {
    fetchRoomsAndUnread();

    // ฟัง Realtime: ห้องแชทมีการเปลี่ยนแปลง (ข้อความใหม่เข้า)
    const channel = supabase.channel('room-list-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
            fetchRoomsAndUnread();
        })
        // ฟังข้อความใหม่ทุกห้อง เพื่ออัปเดตตัวเลขแจ้งเตือนทันที
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            // ถ้าเป็นข้อความจากลูกค้า และเราไม่ได้เปิดห้องนั้นอยู่ -> บวกเลขแจ้งเตือน
            if (newMsg.sender_role === 'user') {
                setUnreadCounts(prev => ({
                    ...prev,
                    [newMsg.room_id]: (prev[newMsg.room_id] || 0) + 1
                }));
                // รีโหลดรายการห้องเพื่อให้ห้องที่มีข้อความใหม่เด้งไปบนสุด
                fetchRoomsAndUnread(); 
            }
        })
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 2. โหลดข้อความเมื่อเลือกห้อง + เคลียร์แจ้งเตือน
  useEffect(() => {
    if (!selectedRoom) return;

    // โหลดข้อความ
    fetchMessages(selectedRoom.id);
    
    // เคลียร์แจ้งเตือนในหน้าจอ (Client)
    setUnreadCounts(prev => ({ ...prev, [selectedRoom.id]: 0 }));

    // เคลียร์แจ้งเตือนใน Database (Server)
    markAsRead(selectedRoom.id);

    // ฟัง Realtime เฉพาะห้องที่เปิด
    const channel = supabase.channel(`admin-chat-${selectedRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${selectedRoom.id}` }, 
        (payload) => {
            setMessages((prev) => [...prev, payload.new]);
            // ถ้าเปิดห้องนี้ค้างไว้แล้วมีข้อความใหม่เข้ามา ให้ถือว่าอ่านแล้วทันที
            markAsRead(selectedRoom.id);
        })
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedRoom]);

  // Scroll ลงล่างสุดเสมอ
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRoomsAndUnread = async () => {
    // 1. ดึงห้อง
    const { data: roomsData } = await supabase
        .from('chat_rooms')
        .select('*, profiles:user_id (username, email)')
        .order('updated_at', { ascending: false });
    
    if (roomsData) setRooms(roomsData);

    // 2. ดึงจำนวนข้อความที่ยังไม่อ่าน (เฉพาะฝั่ง user)
    const { data: unreadData } = await supabase
        .from('messages')
        .select('room_id')
        .eq('is_read', false)
        .eq('sender_role', 'user'); // นับเฉพาะที่ลูกค้าส่งมา

    // รวมยอดตาม Room ID
    const counts = {};
    unreadData?.forEach(item => {
        counts[item.room_id] = (counts[item.room_id] || 0) + 1;
    });
    setUnreadCounts(counts);
  };

  const fetchMessages = async (roomId) => {
    const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // ฟังก์ชันตีตราว่า "อ่านแล้ว"
  const markAsRead = async (roomId) => {
    await supabase.from('messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .eq('sender_role', 'user') // แก้เฉพาะของลูกค้า
        .eq('is_read', false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    const text = newMessage;
    setNewMessage('');

    const { error } = await supabase.from('messages').insert([{
        room_id: selectedRoom.id,
        sender_role: 'admin',
        content: text
    }]);

    if (!error) {
        await supabase.from('chat_rooms')
            .update({ updated_at: new Date() })
            .eq('id', selectedRoom.id);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* --- LEFT: Room List --- */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-100 bg-white">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-600"/> แชทลูกค้า
            </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm">ยังไม่มีลูกค้าทักมา</div>
            ) : (
                rooms.map((room) => {
                    const unread = unreadCounts[room.id] || 0;
                    return (
                        <div 
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-blue-50 relative
                                ${selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                        <User size={20} />
                                    </div>
                                    {/* จุดแดงแจ้งเตือน (Badge) */}
                                    {unread > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                                            {unread > 9 ? '9+' : unread}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h4 className={`truncate ${unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                            {room.profiles?.username || 'Unknown'}
                                        </h4>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                                            {new Date(room.updated_at).toLocaleString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate ${unread > 0 ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
                                        {unread > 0 ? 'มีข้อความใหม่...' : room.profiles?.email}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* --- RIGHT: Chat Area (เหมือนเดิม) --- */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedRoom ? (
            <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                            {selectedRoom.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{selectedRoom.profiles?.username}</h3>
                            <span className="text-xs text-green-500 flex items-center gap-1">● กำลังสนทนา</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    {messages.map((msg) => {
                        const isAdmin = msg.sender_role === 'admin';
                        return (
                            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-sm ${
                                    isAdmin 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="พิมพ์ข้อความตอบกลับ..."
                            className="flex-1 px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button 
                            type="submit"
                            disabled={!newMessage.trim()} 
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={40} className="opacity-50" />
                </div>
                <p>เลือกแชทจากรายการทางซ้าย</p>
                <p className="text-sm">เพื่อเริ่มสนทนากับลูกค้า</p>
            </div>
        )}
      </div>

    </div>
  );
}