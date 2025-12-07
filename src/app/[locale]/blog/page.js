import Navbar from "@/components/Navbar";
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 60; // อัปเดตทุก 1 นาที

export const metadata = {
  title: 'บทความและข่าวสาร | EZ Topup',
  description: 'รวมเทคนิคการเติมเกม โปรโมชั่น และข่าวสารวงการเกมล่าสุด',
};

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">บทความและข่าวสาร</h1>
        <p className="text-slate-500 mb-8">อัปเดตเรื่องราววงการเกมและโปรโมชั่นสุดคุ้ม</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts?.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all">
              <div className="relative w-full aspect-video bg-slate-200">
                {post.image_url && <Image src={post.image_url} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />}
              </div>
              <div className="p-5">
                <div className="text-xs text-blue-600 font-bold mb-2">NEWS</div>
                <h2 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{post.title}</h2>
                <p className="text-sm text-slate-500 line-clamp-3">{post.excerpt}</p>
                <div className="mt-4 text-xs text-slate-400">
                  {new Date(post.created_at).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}