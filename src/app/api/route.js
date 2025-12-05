import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto'; // ใช้สร้าง MD5

// ใช้ Service Role เพื่อข้าม RLS (เพราะ Webhook ไม่มี User Session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // **ต้องไปเอา Service Role Key จาก Supabase Dashboard มาใส่ใน .env.local เพิ่มนะครับ**
);

export async function POST(request) {
  try {
    // รับข้อมูลจาก TMW (มาเป็น Form Data หรือ JSON)
    const formData = await request.formData();
    const dataJsonString = formData.get('data'); // ข้อมูล JSON ที่ส่งมาเป็น String
    const signature = formData.get('signature');

    if (!dataJsonString || !signature) {
        return NextResponse.json({ status: 0, msg: 'Missing data' });
    }

    // 1. ตรวจสอบ Signature (ความปลอดภัย)
    const myApiKey = process.env.TMWEASY_API_KEY;
    const textToHash = `${dataJsonString}:${myApiKey}`;
    const mySignature = crypto.createHash('md5').update(textToHash).digest('hex');

    if (mySignature !== signature) {
        console.error("Webhook Signature Mismatch!");
        return NextResponse.json({ status: 0, msg: 'Invalid Signature' });
    }

    // 2. แปลงข้อมูลเป็น Object
    const data = JSON.parse(dataJsonString);
    // ตัวอย่าง data: {"id_pay":"754349","ref1":"user_uuid","amount_check":"1901","amount":"19.00","date_pay":"..."}

    const id_pay = data.id_pay;
    const userId = data.ref1; // เราส่ง user.id ไปเป็น ref1 ในขั้นตอนแรก
    const amount = Number(data.amount); // ยอดเงินจริงที่โอนเข้ามา

    // 3. ค้นหา Transaction ใน Database
    const { data: topup } = await supabase
        .from('topups')
        .select('*')
        .eq('external_id', id_pay)
        .eq('status', 'pending') // เอาเฉพาะที่ยังรออยู่
        .single();

    if (!topup) {
        // อาจจะซ้ำ หรือไม่มีรายการนี้
        return NextResponse.json({ status: 1, msg: 'Transaction not found or already processed' });
    }

    // 4. อัปเดตสถานะ Topup เป็น Success
    await supabase.from('topups').update({ status: 'success' }).eq('id', topup.id);

    // 5. เติมเงินเข้า Wallet + ให้แต้ม
    const { data: profile } = await supabase.from('profiles').select('wallet_balance, points').eq('id', userId).single();
    
    const newBalance = (Number(profile.wallet_balance) || 0) + amount;
    const pointsToAdd = Math.floor(amount * 0.01); // แต้ม 1%
    const newPoints = (Number(profile.points) || 0) + pointsToAdd;

    await supabase.from('profiles').update({ 
        wallet_balance: newBalance,
        points: newPoints
    }).eq('id', userId);

    console.log(`✅ เติมเงินสำเร็จ User: ${userId}, ยอด: ${amount}`);

    // ตอบกลับ TMW ว่าสำเร็จ
    return NextResponse.json({ status: 1 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ status: 0, msg: error.message });
  }
}