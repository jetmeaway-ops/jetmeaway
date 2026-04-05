import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Debug route — fetches fresh rates for Barcelona sandbox, then tries prebook
 * with the first offerId using several body shapes so we can see which one
 * LiteAPI accepts. Delete once the booking flow is confirmed.
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

  // 1. Search for one hotel in Barcelona
  const listRes = await fetch(`${BASE}/data/hotels?cityName=Barcelona&countryCode=ES&limit=5`, {
    method: 'GET', headers: h, cache: 'no-store',
  });
  const list = await listRes.json();
  const hotelIds = (list.data || []).map((x: any) => x.id).slice(0, 5);
  if (hotelIds.length === 0) {
    return NextResponse.json({ step: 'list', listStatus: listRes.status, listBody: list });
  }

  // 2. Fetch rates
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
  const firstRate = rates.data?.[0]?.roomTypes?.[0]?.rates?.[0];
  if (!firstRate) {
    return NextResponse.json({ step: 'rates', ratesStatus: ratesRes.status, ratesPreview: JSON.stringify(rates).slice(0, 800) });
  }

  const keys = Object.keys(firstRate);
  const offerId = firstRate.offerId || firstRate.rateId || '';

  // 3. Try prebook with three shapes
  const attempts: any[] = [];
  const shapes = [
    { label: 'flat', body: { offerId, usePaymentSdk: false } },
    { label: 'data-wrapped', body: { data: { offerId, usePaymentSdk: false } } },
    { label: 'rateId-flat', body: { rateId: offerId, usePaymentSdk: false } },
  ];
  for (const s of shapes) {
    const r = await fetch(`${BASE}/rates/prebook`, {
      method: 'POST', headers: h, cache: 'no-store',
      body: JSON.stringify(s.body),
    });
    const text = await r.text();
    attempts.push({ label: s.label, status: r.status, body: text.slice(0, 600) });
    if (r.ok) break;
  }

  return NextResponse.json({
    offerIdLen: offerId.length,
    offerIdPreview: offerId.slice(0, 40) + '...',
    rateKeys: keys,
    attempts,
  });
}
