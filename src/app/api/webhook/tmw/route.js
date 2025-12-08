import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendAdminNotify } from '@/lib/notify';

export const dynamic = 'force-dynamic'; // บังคับไม่ให้ Cache

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const dataJsonString = formData.get('data'); 
    const signature = formData.get('signature');

    if (!dataJsonString || !signature) {
        return NextResponse.json({ status: 0, msg: 'Missing data' });
    }

    // 1. ตรวจสอบ Signature
    const myApiKey = process.env.TMWEASY_API_KEY;
    if (!myApiKey) {
        console.error("❌ Missing TMWEASY_API_KEY in Env");
        return NextResponse.json({ status: 0, msg: 'Server Config Error' });
    }

    const textToHash = `${dataJsonString}:${myApiKey}`;
    const mySignature = crypto.createHash('md5').update(textToHash).digest('hex');

    if (mySignature !== signature) {
        console.error("❌ Signature Mismatch");
        return NextResponse.json({ status: 0, msg: 'Invalid Signature' });
    }

    const data = JSON.parse(dataJsonString);
    
    // ==========================================
    // 🚨 ส่วนที่เพิ่ม: ดักจับการ Test จากหน้าเว็บ TMW
    // ==========================================
    if (data.ref1 && data.ref1.startsWith('test-')) {
        console.log("🧪 TMW Webhook Test Received (Success)");
        // ตอบกลับทันทีว่าได้รับแล้ว (เพื่อให้ปุ่ม Test ขึ้นสีเขียว)
        return NextResponse.json({ status: 1 });
    }
    // ==========================================

    const id_pay = data.id_pay;
    const userId = data.ref1; 
    const amount = Number(data.amount);

    // 2. ค้นหา Transaction จริง
    const { data: topup, error: findError } = await supabase
        .from('topups')
        .select('*')
        .eq('external_id', id_pay)
        .eq('status', 'pending') 
        .single();

    if (findError || !topup) {
        console.warn("⚠️ Transaction not found or processed:", id_pay);
        // ตอบ 1 ไปเลยเพื่อไม่ให้ TMW ยิงซ้ำ (เพราะถือว่าเรา process แล้วหรือไม่มีรายการนี้)
        return NextResponse.json({ status: 1, msg: 'Transaction not found' });
    }

    // 3. อัปเดตสถานะ Topup
    await supabase.from('topups').update({ status: 'success' }).eq('id', topup.id);

    // 4. เติมเงินเข้า Wallet + แต้ม
    const { data: profile } = await supabase.from('profiles').select('wallet_balance, points').eq('id', userId).single();
    
    if (profile) {
        const newBalance = (Number(profile.wallet_balance) || 0) + amount;
        const pointsToAdd = Math.floor(amount * 0.01);
        const newPoints = (Number(profile.points) || 0) + pointsToAdd;

        await supabase.from('profiles').update({ 
            wallet_balance: newBalance,
            points: newPoints
        }).eq('id', userId);
    }

    console.log(`✅ Topup Success User: ${userId}, Amount: ${amount}`);
    // ... (หลังจาก update profiles เสร็จ) ...

    console.log(`✅ Topup Success User: ${userId}, Amount: ${amount}`);

    // --- 🔔 แจ้งเตือน Telegram ---
    sendAdminNotify(`
<b>💰 เงินเข้า! (TMW)</b>
<b>ยอดเงิน:</b> ${amount} บาท
<b>User ID:</b> <code>${userId}</code>
<b>เวลา:</b> ${new Date().toLocaleString('th-TH')}
    `.trim());
    // ------------------------


    return NextResponse.json({ status: 1 });

  } catch (error) {
    console.error("🔥 Webhook Error:", error);
    // ตอบ 0 เพื่อให้ TMW รู้ว่าระบบเราพัง (เขาอาจจะลองยิงใหม่)
    return NextResponse.json({ status: 0, msg: error.message });
  }
}