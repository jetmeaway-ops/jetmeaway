import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * AirGateway health check. Mirrors /api/duffel-status so we can confirm
 * credentials and connectivity post-onboarding.
 */
export async function GET() {
  const AG_KEY = process.env.AIRGATEWAY_API_KEY || '';
  const AG_BASE = process.env.AIRGATEWAY_BASE_URL || 'https://api.airgateway.com';

  if (!AG_KEY) {
    return NextResponse.json({
      configured: false,
      message: 'AIRGATEWAY_API_KEY not set — awaiting credentials from AirGateway',
    });
  }

  return NextResponse.json({
    configured: true,
    base: AG_BASE,
    tokenPrefix: AG_KEY.slice(0, 8) + '...',
  });
}
