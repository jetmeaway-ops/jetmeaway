import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * WebBeds hotel details / room re-pricing endpoint — placeholder.
 * Called before booking to confirm room availability and final rate.
 * Wire-up TBC post-onboarding.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('id');

  if (!hotelId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  return NextResponse.json({
    ready: false,
    message: 'WebBeds hotel details not yet connected',
    hotelId,
  });
}
