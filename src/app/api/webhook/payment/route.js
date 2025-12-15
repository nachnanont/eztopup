// src/app/api/webhook/payment/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendAdminNotify } from '@/lib/notify';

export const dynamic = 'force-dynamic'; // สำคัญมากสำหรับ Webhook

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.json();
    console.log("🔔 PayNoi Webhook:", JSON.stringify(body));

    // 1. รับข้อมูลจาก PayNoi (อยู่ในตัวแปร data)
    const paymentData = body.data || body; // กันเหนียว เผื่อบางทีส่งมาไม่มี data

    const refNo = paymentData.ref1 || paymentData.trans_id;
    const status = paymentData.payment_status || paymentData.status;
    const amount = Number(paymentData.amount);

    // 2. เช็คสถานะ (PayNoi ใช้ 'completed')
    if (status !== 'completed' && status !== '1') {
        return NextResponse.json({ status: 1 });
    }

    // 3. อัปเดต Database
    const { data: topup } = await supabaseAdmin.from('topups').select('*').eq('transaction_id', refNo).eq('status', 'pending').single();
    
    if (topup) {
        // อัปเดตสถานะบิล
        await supabaseAdmin.from('topups').update({ status: 'success' }).eq('id', topup.id);
        
        // เติมเงินเข้ากระเป๋า
        const { data: profile } = await supabaseAdmin.from('profiles').select('wallet_balance').eq('id', topup.user_id).single();
        const newBalance = (Number(profile?.wallet_balance) || 0) + amount;
        await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', topup.user_id);
        
        // แจ้งเตือน
        sendAdminNotify(`💰 เงินเข้า (Auto): ${amount} บาท \nUser: ${topup.user_id}`);
    }

    return NextResponse.json({ status: 1 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ status: 0 });
  }
}