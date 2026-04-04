import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const RESEND_KEY = process.env.RESEND_API_KEY || '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!RESEND_KEY) return NextResponse.json({ error: 'No Resend key' }, { status: 503 });

  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { 'Authorization': `Bearer ${RESEND_KEY}` },
  });
  const body = await res.json();
  return NextResponse.json({ status: res.status, ...body });
}
