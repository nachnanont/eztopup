import { Kanit } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-kanit",
  display: 'swap',
});

export const metadata = {
  title: "EZ Topup - บริการเติมเกมออนไลน์ 24 ชม.",
  description: "เติมเกมราคาถูก สะดวก รวดเร็ว ปลอดภัย 24 ชั่วโมง",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${kanit.variable} font-sans bg-main text-slate-800 antialiased min-h-screen relative`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}

export const metadata = {
  metadataBase: new URL('https://eztopup.net'), // 
  title: {
    default: 'EZ Topup - เติมเกมออนไลน์ ราคาถูก เข้าทันที 24 ชม.',
    template: '%s | EZ Topup'
  },
  description: 'บริการเติมเกมออนไลน์ RoV, Free Fire, Valorant ราคาถูกที่สุด สะดวก รวดเร็ว ปลอดภัย ตลอด 24 ชั่วโมง พร้อมระบบแอปพรีเมียม Netflix YouTube',
  keywords: ['เติมเกม', 'เติมเกมราคาถูก', 'ร้านเติมเกม', 'EZ Topup', 'RoV', 'Valorant', 'Free Fire', 'เติมเน็ตฟลิกซ์'],
  
  // เวลาคนแชร์เว็บเราไปใน Facebook/Line จะขึ้นรูปนี้
  openGraph: {
    title: 'EZ Topup - เติมเกมราคาถูก เข้าไว ไม่ต้องรอ',
    description: 'เติมเกมออนไลน์ RoV, Valorant, Free Fire ราคาถูก เติมไว คุ้มสุด',
    url: 'https://eztopup.net',
    siteName: 'EZ Topup',
    images: [
      {
        url: '/og-image.png', // ⚠️ ต้องทำรูปขนาด 1200x630px ชื่อนี้ไปใส่ใน folder public
        width: 1200,
        height: 630,
      },
    ],
    locale: 'th_TH',
    type: 'website',
  },
};