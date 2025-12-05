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