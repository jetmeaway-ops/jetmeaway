/**
 * GET /api/account/bookings/voucher?ref=... — the guest's own voucher, as PDF.
 *
 * Auth mirrors the booking detail page: a session cookie AND the booking must
 * belong to that email. Any miss is the same 404, so a guessed ref confirms
 * nothing. The logo is fetched from our own public/ at request time; if that
 * fetch fails the voucher renders with a text wordmark rather than failing —
 * a guest at a reception desk needs the document, not the artwork.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readSessionEmail } from '@/lib/session';
import { getBooking } from '@/lib/bookings';
import { buildVoucherPdf } from '@/lib/voucher';

export const runtime = 'edge';

const SITE = 'https://jetmeaway.co.uk';

export async function GET(req: NextRequest) {
  const email = await readSessionEmail(req.headers.get('cookie'));
  if (!email) return NextResponse.json({ success: false }, { status: 404 });

  const ref = (req.nextUrl.searchParams.get('ref') || '').slice(0, 40);
  if (!ref) return NextResponse.json({ success: false }, { status: 404 });

  const b = await getBooking(ref).catch(() => null);
  if (!b || b.type !== 'hotel' || (b.customerEmail || '').toLowerCase() !== email) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  let logo: Uint8Array | null = null;
  try {
    const r = await fetch(`${SITE}/jetmeaway-logo.png`);
    if (r.ok) logo = new Uint8Array(await r.arrayBuffer());
  } catch {
    // wordmark fallback inside buildVoucherPdf
  }

  const pdf = await buildVoucherPdf(b, logo);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="jetmeaway-voucher-${b.id}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
