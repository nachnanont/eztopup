import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  );

  try {
    const { amount } = await request.json(); // รับยอดเงินจำนวนเต็มจากหน้าบ้าน

    // 1. เช็ค User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. สร้างรายการใน Database เราก่อน (สถานะ pending)
    const { data: topup, error: dbError } = await supabase
      .from('topups')
      .insert([{
        user_id: user.id,
        amount: amount,
        status: 'pending',
        // ใช้ user.id หรือ topup.id เป็น ref1 ก็ได้ (ในที่นี้ใช้ user.id เพื่อความง่ายในการตรวจสอบ)
      }])
      .select()
      .single();

    if (dbError) throw new Error('Database Error');

    // 3. ยิง Step 1: สร้าง ID Pay
    // ref1: เราจะส่ง ID ของ User ไป เพื่อให้รู้ว่าเป็นของใคร
    const step1Url = `${process.env.TMWEASY_API_URL}?username=${process.env.TMWEASY_USER}&password=${process.env.TMWEASY_PASS}&amount=${amount}&ref1=${user.id}&con_id=${process.env.TMWEASY_CON_ID}&method=create_pay&ip=127.0.0.1`;
    
    const res1 = await axios.get(step1Url);
    
    if (res1.data.status !== 1) {
        // ถ้าสร้างไม่ผ่าน ให้ลบรายการใน DB ทิ้ง หรือแจ้ง error
        return NextResponse.json({ error: res1.data.msg || 'Create Pay Failed' }, { status: 400 });
    }

    const id_pay = res1.data.id_pay;

    // 4. ยิง Step 2: ขอ QR Code
    const step2Url = `${process.env.TMWEASY_API_URL}?username=${process.env.TMWEASY_USER}&password=${process.env.TMWEASY_PASS}&con_id=${process.env.TMWEASY_CON_ID}&id_pay=${id_pay}&type=01&promptpay_id=${process.env.TMWEASY_PROMPTPAY_ID}&method=detail_pay`;
    
    const res2 = await axios.get(step2Url);

    if (res2.data.status !== 1) {
        return NextResponse.json({ error: res2.data.msg || 'Get QR Failed' }, { status: 400 });
    }

    // 5. อัปเดตข้อมูลกลับลง Database (เก็บ id_pay และยอดสตางค์)
    const amountCheck = Number(res2.data.amount_check) / 100; // แปลงสตางค์เป็นบาท
    
    await supabase
      .from('topups')
      .update({ 
        external_id: id_pay,
        amount_check: amountCheck 
      })
      .eq('id', topup.id);

    // 6. ส่งรูป QR (Base64) กลับไปให้หน้าบ้าน
    return NextResponse.json({
        success: true,
        qr_image: `data:image/png;base64,${res2.data.qr_image_base64}`, // ต้องเติม prefix ให้รูป
        amount_check: amountCheck,
        time_out: res2.data.time_out
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}