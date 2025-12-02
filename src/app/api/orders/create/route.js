import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { 
           try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} 
        },
      },
    }
  )

  try {
    const body = await request.json();
    const { game_name, package_name, price, uid, product_id, pay_method, wallet_deduct } = body;

    // 1. เช็ค User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = user.id;

    // 2. ดึงเงินล่าสุด
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('wallet_balance').eq('id', userId).single();

    if (profileError) return NextResponse.json({ error: 'User Error' }, { status: 404 });

    const currentBalance = Number(profile.wallet_balance) || 0;
    const packagePrice = Number(price);
    
    // 3. Logic ตัดเงิน
    let newBalance = currentBalance;
    let deductAmount = 0;

    if (pay_method === 'wallet') {
        // จ่ายเต็มด้วยกระเป๋า
        if (currentBalance < packagePrice) return NextResponse.json({ error: 'ยอดเงินไม่พอ' }, { status: 400 });
        deductAmount = packagePrice;
    } 
    else if (pay_method === 'hybrid') {
        // จ่ายผสม (ตัดเท่าที่มี)
        // รับยอดที่จะตัดมาจากหน้าบ้าน (wallet_deduct) หรือจะคำนวณใหม่ก็ได้เพื่อความชัวร์
        deductAmount = Math.min(currentBalance, packagePrice); 
    }

    // 4. ทำการตัดเงิน (ถ้ามียอดให้ตัด)
    if (deductAmount > 0) {
        newBalance = currentBalance - deductAmount;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', userId);
            
        if (updateError) return NextResponse.json({ error: 'ตัดเงินไม่สำเร็จ' }, { status: 500 });
    }

    // 5. สร้าง Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          transaction_id: `ORD-${Date.now()}`,
          target_id: uid,
          package_name: `${game_name} - ${package_name}`,
          amount: packagePrice, // ยอดสินค้ารวม
          price: packagePrice,
          status: 'pending', // สถานะรอตรวจสอบ
          product_id: product_id || 'api_product',
          admin_note: `จ่ายแบบ ${pay_method}: ตัด Wallet ${deductAmount} บ. / โอนเพิ่ม ${packagePrice - deductAmount} บ.`
        }
      ])
      .select().single();

    if (orderError) return NextResponse.json({ error: 'สร้าง Order ไม่ได้' }, { status: 500 });

    return NextResponse.json({ success: true, order, newBalance });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}