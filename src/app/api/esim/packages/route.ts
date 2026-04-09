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
    return NextResponse.json({ packages: [], error: message }, { status: 500 });
  }
}
