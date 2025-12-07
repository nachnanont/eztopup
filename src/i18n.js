import { getRequestConfig } from 'next-intl/server';

// กำหนดภาษาที่รองรับ
const locales = ['en', 'th'];

export default getRequestConfig(async ({ requestLocale }) => {
  // รับค่า locale ที่ส่งมาจาก Middleware (ต้อง await)
  let locale = await requestLocale;

  // ถ้าไม่มีค่า หรือค่าไม่ตรงกับที่กำหนดไว้ ให้ใช้ 'th' เป็นค่าเริ่มต้น
  if (!locale || !locales.includes(locale)) {
    locale = 'th';
  }

  return {
    locale, // <--- **สำคัญมาก! ต้องเพิ่มบรรทัดนี้ครับ**
    messages: (await import(`../messages/${locale}.json`)).default
  };
});