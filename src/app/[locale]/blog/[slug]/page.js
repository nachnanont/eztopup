import Navbar from "@/components/Navbar";
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Calendar, Eye } from 'lucide-react';

export const revalidate = 60;

// ทำ Dynamic Metadata สำหรับ SEO (ชื่อบทความขึ้น Title Bar)
export async function generateMetadata({ params }) {
  const slug = params.slug;
  const { data: post } = await supabase.from('posts').select('title, excerpt, image_url').eq('slug', slug).single();
  
  if (!post) return { title: 'Not Found' };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.image_url || '/og-image.png'],
    },
  };
}

export default async function BlogPost({ params }) {
  const { slug } = await params;

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!post) notFound();

  // (Optional) เพิ่มยอดวิวตรงนี้ได้ แต่ต้องระวังเรื่อง Revalidate

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-4">ข่าวสาร / บทความ</span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">{post.title}</h1>
            <div className="flex items-center justify-center gap-4 text-slate-500 text-sm">
                <span className="flex items-center gap-1"><Calendar size={16}/> {new Date(post.created_at).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                {/* <span className="flex items-center gap-1"><Eye size={16}/> {post.views} วิว</span> */}
            </div>
        </div>

        {/* Cover Image */}
        {post.image_url && (
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-lg mb-10">
                <Image src={post.image_url} alt={post.title} fill className="object-cover" priority />
            </div>
        )}

        {/* Content */}
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 prose prose-lg max-w-none text-slate-700">
            {/* ใช้วิธีแสดง HTML อย่างง่าย (ถ้าแอดมินพิมพ์ HTML) */}
            {/* หรือจะแสดง text ธรรมดาก็ได้ถ้าไม่ได้ใช้ rich text */}
            <div dangerouslySetInnerHTML={{ __html: post.content?.replace(/\n/g, '<br/>') }} />
        </div>
      </article>
    </div>
  );
}