import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * AirGateway offer-pricing endpoint — placeholder.
 * In NDC flows, the offer is re-priced just before booking to confirm
 * availability and final fare. Wire-up TBC post-onboarding.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offerId = searchParams.get('id');

  if (!offerId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  return NextResponse.json({
    ready: false,
    message: 'AirGateway offer pricing not yet connected',
    offerId,
  });
}
