import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/twilio';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  if (!to) return NextResponse.json({ error: 'missing ?to= param' }, { status: 400 });

  const result = await sendSms(to, 'JetMeAway test: SMS is working! Your booking confirmations will arrive via text from now on.');
  return NextResponse.json(result);
}
