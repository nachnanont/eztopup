import { Kanit } from "next/font/google";
import "../globals.css"; // <-- แก้ path ตรงนี้ให้ถอยกลับไป 2 ชั้น
import ChatWidget from "@/components/ChatWidget";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-kanit",
  display: 'swap',
});

export const metadata = {
  title: "EZ Topup - บริการเติมเกมออนไลน์ 24 ชม.",
  description: "เติมเกมราคาถูก สะดวก รวดเร็ว ปลอดภัย",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default async function RootLayout({ children, params }) {
  // รอรับค่า locale จาก URL (Next.js 15+)
  const { locale } = await params;
  
  // ดึงข้อความแปลทั้งหมดมาเตรียมไว้
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${kanit.variable} font-sans bg-main text-slate-800 antialiased min-h-screen relative`}>
        {/* หุ้มด้วย Provider เพื่อให้ Client Component (เช่น Navbar) ใช้คำแปลได้ */}
        <NextIntlClientProvider messages={messages}>
          {children}
          <ChatWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}