// language: JavaScript, file: app/api/keys/route.js
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Khởi tạo kết nối Upstash (Dùng biến môi trường mày đã set trên Vercel)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET() {
  try {
    // Lấy toàn bộ key được lưu dưới dạng Hash "u3_keys"
    const data = await redis.hgetall("u3_keys") || {};
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { key, expire } = await req.json();
    await redis.hset("u3_keys", { [key]: expire });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { key } = await req.json();
    await redis.hdel("u3_keys", key);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
