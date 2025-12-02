import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/middlepay';

// API นี้จะทำงานฝั่ง Server ทำให้สามารถอ่าน API Key ได้
export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}