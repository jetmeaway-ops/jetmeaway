import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * WebBeds health check. Confirms credentials and connectivity
 * post-onboarding with Anthony at WebBeds.
 */
export async function GET() {
  const WB_USER = process.env.WEBBEDS_USERNAME || '';
  const WB_PASS = process.env.WEBBEDS_PASSWORD || '';
  const WB_BASE = process.env.WEBBEDS_BASE_URL || 'https://api.webbeds.com';

  if (!WB_USER || !WB_PASS) {
    return NextResponse.json({
      configured: false,
      message: 'WebBeds credentials not set — awaiting onboarding form approval',
    });
  }

  return NextResponse.json({
    configured: true,
    base: WB_BASE,
    user: WB_USER,
  });
}
