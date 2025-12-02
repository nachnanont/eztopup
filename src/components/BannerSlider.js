'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BannerSlider({ banners }) {
  const [current, setCurrent] = useState(0);

  // ถ้าไม่มีแบนเนอร์ หรือมีแค่ 0 ให้ไม่แสดงอะไร
  if (!banners || banners.length === 0) return null;

  // ฟังก์ชันเลื่อนภาพ
  const nextSlide = () => {
    setCurrent((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  // Auto Play: เลื่อนเองทุก 5 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]); // reset timer ถ้าจำนวนแบนเนอร์เปลี่ยน

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl group aspect-[21/9] bg-slate-900">
      
      {/* 1. ส่วนแสดงรูปภาพ */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <Link 
             href={banner.link_url || '#'} 
             target={banner.link_url ? "_blank" : "_self"}
             className={`block w-full h-full relative ${!banner.link_url && 'cursor-default'}`}
          >
             <Image
                src={banner.image_url}
                alt={banner.title || 'Banner'}
                fill
                priority={index === 0} // โหลดรูปแรกก่อนเสมอ
                className="object-cover"
             />
             {/* Gradient เงาด้านล่างเพื่อให้ตัวหนังสือ (ถ้ามี) อ่านง่ายขึ้น */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </Link>
        </div>
      ))}

      {/* 2. ปุ่มลูกศร ซ้าย-ขวา (แสดงเฉพาะเมื่อมีมากกว่า 1 รูป) */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={24} />
          </button>

          {/* 3. จุดไข่ปลา (Dots Indicators) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === current 
                    ? 'bg-white w-6' // จุดที่เลือกจะยาวขึ้น
                    : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}