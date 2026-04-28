import { NextRequest, NextResponse } from 'next/server';
import { getEsimPackages } from '@/lib/liteapi';

export const runtime = 'edge';

/**
 * GET /api/esim/packages?country=ES
 *
 * Fetch live eSimply eSIM packages from LiteAPI for a given ISO-2 country code.
 */
export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')?.trim().toUpperCase() || '';
  if (!country || country.length !== 2) {
    return NextResponse.json({ packages: [], error: 'country param must be an ISO-2 code (e.g. ES, TH, US)' }, { status: 400 });
  }

  try {
    const packages = await getEsimPackages(country);
    return NextResponse.json({ packages, country });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'eSIM packages lookup failed';
    console.error('[esim/packages]', message);
    // Soft-fail: return 200 with empty list + fallback flag so the eSIM page
    // shows direct Airalo / Yesim affiliate CTAs instead of a 500-driven
    // "Could not load live plans" banner. The page still earns commission
    // through tpk.lu shortlinks even when LiteAPI is down or the key is
    // briefly unset (2026-04-28).
    return NextResponse.json({ packages: [], country, error: message, fallback: true }, { status: 200 });
  }
}
