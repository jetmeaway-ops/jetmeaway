import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * AirGateway order creation endpoint — placeholder.
 * Final booking step: create the NDC order, issue ticket, return PNR.
 * Wire-up TBC post-onboarding.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ready: false,
      message: 'AirGateway booking not yet connected',
      received: Object.keys(body),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
