import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const token = process.env.TRAVELPAYOUTS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'No token found in env' });
  }

  const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=LHR&destination=DXB&departure_at=2026-06-01&currency=gbp&sorting=price&limit=5&market=gb&token=${token}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    return NextResponse.json({
      tokenPresent: true,
      tokenPrefix: token.slice(0, 6) + '...',
      httpStatus: res.status,
      rawResponse: text.slice(0, 1000),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, tokenPresent: true });
  }
}
