import { Kanit } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget"; // <-- 1. นำเข้า

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-kanit",
  display: 'swap',
});

export const metadata = {
  title: "EZTopCard - เติมเกมและแอปพรีเมียม",
  description: "บริการเติมเกมออนไลน์และแอปพรีเมียม รวดเร็ว ปลอดภัย",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${kanit.variable} font-sans bg-slate-50 text-slate-800 antialiased min-h-screen relative`}>
        {children}
        <ChatWidget /> {/* <-- 2. วางปุ่มไว้ตรงนี้ (ก่อนปิด body) */}
      </body>
    </html>
  );
}