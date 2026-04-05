import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Debug route — full search → prebook → book cycle against sandbox,
 * trying multiple payment methods to discover which one the sandbox accepts.
 */
export async function GET(_req: NextRequest) {
  const KEY = process.env.LITE_API_KEY;
  if (!KEY) return NextResponse.json({ error: 'LITE_API_KEY not set' }, { status: 500 });
  const BASE = (process.env.LITE_API_BASE || 'https://api.liteapi.travel/v3.0').replace(/\/$/, '');

  const h = {
    'X-API-Key': KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // 1. list hotels
  const listRes = await fetch(`${BASE}/data/hotels?cityName=Barcelona&countryCode=ES&limit=5`, { method: 'GET', headers: h, cache: 'no-store' });
  const list = await listRes.json();
  const hotelIds = (list.data || []).map((x: any) => x.id).slice(0, 5);

  // 2. rates
  const ratesRes = await fetch(`${BASE}/hotels/rates`, {
    method: 'POST', headers: h, cache: 'no-store',
    body: JSON.stringify({
      hotelIds,
      checkin: '2026-06-10',
      checkout: '2026-06-14',
      currency: 'GBP',
      guestNationality: 'GB',
      occupancies: [{ adults: 2, children: [] }],
    }),
  });
  const rates = await ratesRes.json();
  const rt0 = rates.data?.[0]?.roomTypes?.[0];
  const offerId = rt0?.offerId;
  if (!offerId) return NextResponse.json({ step: 'rates', keys: Object.keys(rt0 || {}) });

  // 3. prebook
  const preRes = await fetch(`${BASE}/rates/prebook`, {
    method: 'POST', headers: h, cache: 'no-store',
    body: JSON.stringify({ offerId, usePaymentSdk: false }),
  });
  const pre = await preRes.json();
  if (!preRes.ok) return NextResponse.json({ step: 'prebook', status: preRes.status, body: pre });
  const prebookId = pre.data?.prebookId;

  // 4. book — try several payment shapes until one works
  const baseBody = {
    prebookId,
    holder: { firstName: 'Test', lastName: 'Booker', email: 'test+sandbox@jetmeaway.co.uk' },
    guests: [{ occupancyNumber: 1, firstName: 'Test', lastName: 'Booker', email: 'test+sandbox@jetmeaway.co.uk', nationality: 'GB' }],
  };

  const paymentAttempts: any[] = [
    { label: 'WALLET', payment: { method: 'WALLET' } },
    { label: 'ACC_CREDIT_CARD', payment: { method: 'ACC_CREDIT_CARD' } },
    { label: 'STRIPE_TOKEN-tok_visa', payment: { method: 'STRIPE_TOKEN', token: 'tok_visa' } },
    { label: 'TRANSACTION_ID-test', payment: { method: 'TRANSACTION_ID', transactionId: 'test_123' } },
    { label: 'CREDIT_CARD-sandbox', payment: {
      method: 'CREDIT_CARD',
      number: '4111111111111111',
      expireDate: '12/2027',
      cvc: '123',
      holderName: 'Test Booker',
    } },
    { label: 'no-payment', payment: undefined },
  ];

  const results: any[] = [];
  for (const a of paymentAttempts) {
    const body = a.payment ? { ...baseBody, payment: a.payment } : baseBody;
    const r = await fetch(`${BASE}/rates/book`, {
      method: 'POST', headers: h, cache: 'no-store',
      body: JSON.stringify(body),
    });
    const text = await r.text();
    results.push({ label: a.label, status: r.status, body: text.slice(0, 400) });
    if (r.ok) break;
  }

  return NextResponse.json({
    prebookId,
    prebookPrice: pre.data?.price,
    prebookCurrency: pre.data?.currency,
    bookAttempts: results,
  });
}
