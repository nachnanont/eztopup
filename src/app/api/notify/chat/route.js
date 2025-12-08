import { NextResponse } from 'next/server';
import { sendAdminNotify } from '@/lib/notify';

export async function POST(request) {
  try {
    const { message, sender } = await request.json();
    
    await sendAdminNotify(`
<b>💬 ข้อความใหม่จากลูกค้า!</b>
<b>จาก:</b> ${sender}
<b>ข้อความ:</b> ${message}
    `.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}