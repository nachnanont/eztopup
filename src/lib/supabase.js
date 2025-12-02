import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase Environment Variables')
}

// ใช้ createBrowserClient เพื่อให้ Session ถูกเก็บลง Cookie อัตโนมัติ
// ทำให้ Middleware และ API มองเห็น User ได้
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)