/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-kanit)', 'sans-serif'],
      },
      colors: {
        // พื้นหลังหลัก (ครีมเทา)
        main: '#F0F2E9', 
        
        // สีหลัก (Primary) -> เปลี่ยนจากฟ้า เป็น "ม่วงเกมเมอร์"
        primary: {
          DEFAULT: '#7C3AED', // Violet-600
          hover: '#6D28D9',   // Violet-700 (ตอนเอาเมาส์ชี้)
        },

        // สีรอง/สีตัด (Secondary/Accent) -> "เหลืองอำพัน/ส้ม" (เพิ่มพลังงาน)
        accent: {
          DEFAULT: '#F59E0B', // Amber-500
          hover: '#D97706',   // Amber-600
        },
        
        // สียืนยัน/สำเร็จ (ใช้สีเขียวสดใสหน่อย)
        success: '#10B981', // Emerald-500
      },
    },
  },
  plugins: [],
};