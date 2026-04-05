import { NextRequest, NextResponse } from 'next/server';
import { priceBreakdown } from '@/lib/travel-logic';

export const runtime = 'edge';

const DUFFEL_KEY = process.env.DUFFEL_TEST_TOKEN || process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_KEY || '';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !DUFFEL_KEY) {
    return NextResponse.json({ error: 'Invalid offer or missing API key' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.duffel.com/air/offers/${id}`, {
      headers: {
        'Authorization': `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': 'v2',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Duffel offer fetch error:', res.status, errBody);

      if (res.status === 404 || res.status === 410) {
        return NextResponse.json(
          { error: 'This offer has expired. Please search again for updated prices.' },
          { status: 410 },
        );
      }

      return NextResponse.json({ error: 'Failed to fetch offer' }, { status: res.status });
    }

    const json = await res.json();
    const offer = json.data;

    // Extract key details
    const outSlice = offer.slices?.[0];
    const retSlice = offer.slices?.[1] || null;
    const firstSeg = outSlice?.segments?.[0];
    const lastOutSeg = outSlice?.segments?.[outSlice.segments.length - 1];

    const airlineCode = firstSeg?.marketing_carrier?.iata_code || '';
    const airlineName = firstSeg?.marketing_carrier?.name || airlineCode;

    const passengerCount = offer.passengers?.length || 1;
    const totalAmount = parseFloat(offer.total_amount || '0');
    const perPerson = totalAmount / passengerCount;
    const pricing = priceBreakdown(perPerson);

    // Parse duration
    const parseDuration = (iso: string | null): number => {
      if (!iso) return 0;
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return 0;
      return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
    };

    const outStops = (outSlice?.segments?.length || 1) - 1;

    const result = {
      id: offer.id,
      airline: airlineName,
      airlineCode,
      // Outbound
      origin: outSlice?.origin?.iata_code || '',
      originCity: outSlice?.origin?.city_name || outSlice?.origin?.name || '',
      destination: outSlice?.destination?.iata_code || '',
      destinationCity: outSlice?.destination?.city_name || outSlice?.destination?.name || '',
      departureAt: firstSeg?.departing_at || null,
      arrivalAt: lastOutSeg?.arriving_at || null,
      durationOut: parseDuration(outSlice?.duration),
      stopsOut: outStops,
      // Return
      hasReturn: !!retSlice,
      returnDepartureAt: retSlice?.segments?.[0]?.departing_at || null,
      returnArrivalAt: retSlice?.segments?.[retSlice?.segments?.length - 1]?.arriving_at || null,
      durationBack: retSlice ? parseDuration(retSlice.duration) : 0,
      stopsBack: retSlice ? (retSlice.segments?.length || 1) - 1 : 0,
      // Passengers
      passengerCount,
      passengers: offer.passengers?.map((p: any) => ({
        id: p.id,
        type: p.type, // 'adult', 'child', 'infant_without_seat'
        age: p.age ?? null, // Duffel echoes back the age we sent for under-18s
      })) || [],
      // Pricing
      currency: offer.currency || 'GBP',
      basePerPerson: perPerson,
      pricing, // { airline, markup, total, display }
      totalForAll: pricing.total * passengerCount,
      // Conditions
      refundable: offer.conditions?.refund_before_departure?.allowed || false,
      changeable: offer.conditions?.change_before_departure?.allowed || false,
      // Cabin class
      cabinClass: firstSeg?.passengers?.[0]?.cabin_class_marketing_name || 'Economy',
      // Expiry
      expiresAt: offer.expires_at || null,
    };

    return NextResponse.json({ success: true, offer: result });
  } catch (err: any) {
    console.error('Offer fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch offer details' }, { status: 500 });
  }
}
