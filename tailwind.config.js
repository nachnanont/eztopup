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
        // สีพื้นหลังหลัก (คงเดิม ตามที่ขอ)
        main: '#F0F2E9', 
        
        // ธีมใหม่: ม่วงอมชมพู
        primary: {
          DEFAULT: '#C026D3', // Fuchsia-600 (ม่วงสด)
          hover: '#A21CAF',   // Fuchsia-700
        },
        secondary: {
          DEFAULT: '#DB2777', // Pink-600 (ชมพูเข้ม)
          hover: '#BE185D',   // Pink-700
        },
      },
    },
  },
  plugins: [],
};