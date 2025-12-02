import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // สร้าง Response รอไว้
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // --- ส่วนดักฟัง (Debug) ---
  // เช็คเฉพาะตอนยิง API เพื่อไม่ให้ Log รก
  if (request.nextUrl.pathname.startsWith('/api/')) {
      console.log("------------------------------------------------")
      console.log("🔍 Middleware: กำลังตรวจสอบเส้นทาง ->", request.nextUrl.pathname)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
          console.log("✅ Middleware: พบ User แล้ว ->", user.email)
      } else {
          console.log("❌ Middleware: ไม่พบ User (Cookie อาจจะหาย)")
      }
      console.log("------------------------------------------------")
  } else {
      // หน้าปกติ ก็ให้ Refresh Session ไปเงียบๆ
      await supabase.auth.getUser()
  }
  // -------------------------

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}