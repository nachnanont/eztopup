import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  const cookieStore = await cookies();
  
  let supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  try {
    const { amount } = await request.json();

    // 1. ตรวจสอบ User
    let user = null;
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;

    if (!user) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const supabaseJwt = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                { global: { headers: { Authorization: `Bearer ${token}` } } }
            );
            const { data: { user: headerUser } } = await supabaseJwt.auth.getUser();
            user = headerUser;
        }
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const refNo = `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 2. บันทึก DB ครั้งแรก
    await supabase.from('topups').insert([{
        user_id: user.id,
        amount: amount,
        status: 'pending',
        transaction_id: refNo,
        provider: 'PayNoi'
    }]);

    // 3. ยิง API PayNoi
    const payload = {
        method: "create",
        api_key: process.env.PAYMENT_API_KEY,
        amount: amount,
        ref1: refNo,
        key_id: process.env.PAYMENT_KEY_ID,
        account: process.env.PAYMENT_ACCOUNT,
        type: process.env.PAYMENT_ACCOUNT_TYPE
    };

    console.log("🚀 Sending to PayNoi:", payload);
    const res = await axios.post(process.env.PAYMENT_API_URL, payload);
    const responseData = res.data;

    console.log("✅ PayNoi Response:", responseData);

    if (String(responseData.status) !== '1') {
        throw new Error(responseData.msg || 'PayNoi Error');
    }

    // ==========================================
    // 🛡️ โซนปลอดภัย (กันชน Error)
    // ==========================================
    
    // พยายามอัปเดตยอดทศนิยม (ถ้าพัง ก็แค่ Log ไม่ให้แอปล่ม)
    try {
        const finalAmount = Number(responseData.amount);
        const { error: updateError } = await supabase.from('topups').update({ amount: finalAmount }).eq('transaction_id', refNo);
        if (updateError) console.error("⚠️ Update DB Warning:", updateError.message);
    } catch (dbErr) {
        console.error("⚠️ DB Update Failed:", dbErr.message);
    }

    // พยายามคำนวณเวลา (ถ้าพัง ให้ใช้ 900 วิ)
    let remainingSeconds = 900;
    try {
        // แปลง '2025-12-15 21:22:17' ให้เป็น format ที่ JS อ่านง่ายขึ้น (เติม T)
        const safeDateString = responseData.expire_at.replace(' ', 'T'); 
        const expireTime = new Date(safeDateString).getTime();
        const now = new Date().getTime();
        const calcSeconds = Math.floor((expireTime - now) / 1000);
        if (!isNaN(calcSeconds) && calcSeconds > 0) {
            remainingSeconds = calcSeconds;
        }
    } catch (dateErr) {
        console.error("⚠️ Date Parse Failed:", dateErr.message);
    }

    // 4. ส่งรูป QR กลับไป (สำคัญสุด)
    return NextResponse.json({
        qr_image: responseData.qr_image_base64, // ส่งตรงๆ เพราะมี Header มาแล้ว
        amount_check: Number(responseData.amount),
        time_out: remainingSeconds
    });

  } catch (error) {
    console.error("🔥 Critical Error:", error.message);
    // ส่ง Error กลับไปบอกหน้าบ้าน
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด: ' + error.message }, { status: 500 });
  }
}