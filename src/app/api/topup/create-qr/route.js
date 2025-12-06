import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic'; // บังคับให้ไม่ Cache

export async function POST(request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  try {
    // 1. เช็คว่า Config ครบไหม (กันลืมใส่ใน Vercel)
    if (!process.env.TMWEASY_API_URL || !process.env.TMWEASY_USER) {
        throw new Error("Server Config Missing: TMWEASY variables not found.");
    }

    const body = await request.json();
    const { amount } = body;
    
    if (!amount) throw new Error("Invalid Amount");

    // 2. เช็ค User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🚀 Starting Topup for User: ${user.id}, Amount: ${amount}`);

    // 3. สร้างรายการใน Database เราก่อน (สถานะ pending)
    const { data: topup, error: dbError } = await supabase
      .from('topups')
      .insert([{
        user_id: user.id,
        amount: amount,
        status: 'pending',
      }])
      .select()
      .single();

    if (dbError) throw new Error('Database Insert Error: ' + dbError.message);

    // 4. ยิง Step 1: สร้าง ID Pay
    const step1Url = `${process.env.TMWEASY_API_URL}?username=${process.env.TMWEASY_USER}&password=${process.env.TMWEASY_PASS}&amount=${amount}&ref1=${user.id}&con_id=${process.env.TMWEASY_CON_ID}&method=create_pay&ip=127.0.0.1`;
    
    console.log("📡 Calling TMW Step 1...");
    const res1 = await axios.get(step1Url);
    
    if (!res1.data || res1.data.status !== 1) {
        console.error("❌ TMW Step 1 Failed:", res1.data);
        return NextResponse.json({ error: res1.data?.msg || 'Create Pay Failed (External API)' }, { status: 400 });
    }

    const id_pay = res1.data.id_pay;
    console.log("✅ Got ID Pay:", id_pay);

    // 5. ยิง Step 2: ขอ QR Code
    const step2Url = `${process.env.TMWEASY_API_URL}?username=${process.env.TMWEASY_USER}&password=${process.env.TMWEASY_PASS}&con_id=${process.env.TMWEASY_CON_ID}&id_pay=${id_pay}&type=01&promptpay_id=${process.env.TMWEASY_PROMPTPAY_ID}&method=detail_pay`;
    
    console.log("📡 Calling TMW Step 2...");
    const res2 = await axios.get(step2Url);

    if (!res2.data || res2.data.status !== 1) {
        console.error("❌ TMW Step 2 Failed:", res2.data);
        return NextResponse.json({ error: res2.data?.msg || 'Get QR Failed (External API)' }, { status: 400 });
    }

    // 6. อัปเดตข้อมูลกลับลง Database
    const amountCheck = Number(res2.data.amount_check) / 100;
    
    await supabase
      .from('topups')
      .update({ 
        external_id: id_pay,
        amount_check: amountCheck 
      })
      .eq('id', topup.id);

    console.log("✅ Topup Created Successfully");

    // 7. ส่งข้อมูลกลับ
    return NextResponse.json({
        success: true,
        qr_image: `data:image/png;base64,${res2.data.qr_image_base64}`,
        amount_check: amountCheck,
        time_out: res2.data.time_out
    });

  } catch (error) {
    console.error("🔥 API Crash:", error);
    // ส่ง JSON Error กลับไปเสมอ (ห้ามส่งค่าว่าง)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}