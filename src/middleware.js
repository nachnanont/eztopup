import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// 1. สร้าง Middleware จัดการภาษา
const intlMiddleware = createMiddleware({
  // รายการภาษาที่มี
  locales: ['en', 'th'],
  // ภาษาเริ่มต้น
  defaultLocale: 'th'
});

export async function middleware(request) {
  // 2. ให้ระบบภาษาทำงานก่อน (เพื่อจัดการ URL เช่น /th, /en)
  const response = intlMiddleware(request);

  // 3. แทรกการทำงานของ Supabase เข้าไปใน Response เดิม
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // อัปเดตคุกกี้ทั้งใน Request และ Response
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh Session เพื่อให้ User ไม่หลุด
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Matcher นี้จะครอบคลุม URL ที่มีภาษาและไม่มีภาษา (ยกเว้น api และไฟล์ static)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/', '/(th|en)/:path*']
};