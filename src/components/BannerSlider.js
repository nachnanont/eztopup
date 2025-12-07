'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BannerSlider({ banners }) {
  const [current, setCurrent] = useState(0);

  if (!banners || banners.length === 0) return null;

  const nextSlide = () => {
    setCurrent((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl group aspect-[21/9] bg-slate-900">
      
      {banners.map((banner, index) => {
        // เช็คว่าเป็นลิงก์เปิด Popup หรือไม่ (ขึ้นต้นด้วย ?)
        const isInternalLink = banner.link_url?.startsWith('?');
        
        return (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Link 
               href={banner.link_url || '#'} 
               // ถ้าเป็นลิงก์ภายใน (?open=...) ให้เปิดหน้าเดิม (_self)
               // ถ้าเป็นลิงก์ภายนอก (https://...) ให้เปิดแท็บใหม่ (_blank)
               target={isInternalLink ? "_self" : "_blank"}
               
               // ถ้าเป็นลิงก์ภายใน ไม่ต้องเลื่อนหน้าจอ (Scroll)
               scroll={!isInternalLink}
               
               className={`block w-full h-full relative ${!banner.link_url && 'cursor-default'}`}
            >
               <Image
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  fill
                  priority={index === 0}
                  className="object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </Link>
          </div>
        );
      })}

      {banners.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); prevSlide(); }} // ป้องกัน Link ทำงานซ้อน
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); nextSlide(); }} 
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={24} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.preventDefault(); setCurrent(index); }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === current ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}