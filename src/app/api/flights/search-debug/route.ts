import { NextRequest, NextResponse } from 'next/server';
import { md5 } from '@/lib/md5';

export const runtime = 'edge';

/* Temporary diagnostic for the TP v1 signature. Returns the exact
   string we feed into md5() plus the resulting signature, so we can
   eyeball the order and the token concat. Delete once v1 auth works. */

const TP_TOKEN = 'f797fbb7074a15838d5536c10be6f7b5';

function collectSignedValues(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) collectSignedValues(item, out);
    return;
  }
  if (typeof node === 'object') {
    const keys = Object.keys(node as Record<string, unknown>).sort();
    for (const k of keys) collectSignedValues((node as Record<string, unknown>)[k], out);
    return;
  }
  out.push(String(node));
}

export async function GET(req: NextRequest) {
  const gate = req.nextUrl.searchParams.get('k');
  if (gate !== 'scout-debug') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const signedBody = {
    marker: '714449',
    host: req.nextUrl.searchParams.get('host') || 'jetmeaway.co.uk',
    user_ip: req.nextUrl.searchParams.get('ip') || '8.8.8.8',
    locale: 'en',
    trip_class: 'Y',
    passengers: { adults: 1, children: 0, infants: 0 },
    segments: [
      { origin: 'LON', destination: 'ISB', date: '2026-04-23' },
      { origin: 'ISB', destination: 'LON', date: '2026-04-30' },
    ],
  };

  const values: string[] = [];
  collectSignedValues(signedBody, values);
  const source = [TP_TOKEN, ...values].join(':');
  const signature = md5(source);

  // Live-fire the TP call with our computed signature so we can see
  // TP's exact error response body too.
  const tpRes = await fetch('https://api.travelpayouts.com/v1/flight_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...signedBody, signature }),
  });
  const tpBody = await tpRes.text();

  return NextResponse.json({
    signatureSource: source,
    signature,
    tpStatus: tpRes.status,
    tpBody: tpBody.slice(0, 500),
  });
}
