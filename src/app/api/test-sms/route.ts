import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/twilio';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  const msg = req.nextUrl.searchParams.get('msg');
  if (!to || !msg) return NextResponse.json({ error: 'missing ?to= or ?msg= param' }, { status: 400 });

  const result = await sendSms(to, msg);
  return NextResponse.json(result);
}
