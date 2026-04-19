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
    // return_available_services=true → Duffel includes the `available_services`
    // array on the offer, which is how we source extra-bag / seat / meal
    // ancillaries for the "Add extras" step of checkout.
    const res = await fetch(
      `https://api.duffel.com/air/offers/${id}?return_available_services=true`,
      {
        headers: {
          'Authorization': `Bearer ${DUFFEL_KEY}`,
          'Duffel-Version': 'v2',
          'Accept': 'application/json',
        },
      },
    );

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

    /* ─── Baggage aggregation ───────────────────────────────────────────────
       Duffel shape per segment:
         segments[].passengers[].baggages = [{ type: 'carry_on'|'checked', quantity: N }, ...]
       Weight details live on segments[].passengers[].baggage_allowance OR
       in slice-level conditions; Duffel is inconsistent. We normalise both.

       Aggregation rules:
       - Within a slice, we take the MIN quantity across segments (worst-case,
         so the passenger never gets surprised at the gate).
       - We look up the FIRST adult passenger's baggages (all pax on a single
         offer share the same fare class, so this is safe).
       - Weight is expressed as "23kg" / "50lb" — preformatted for the UI.
    ─────────────────────────────────────────────────────────────────────── */

    const formatWeight = (amount: unknown, unit: unknown): string | null => {
      if (amount == null) return null;
      const n = typeof amount === 'string' ? parseFloat(amount) : (amount as number);
      if (!Number.isFinite(n) || n <= 0) return null;
      const u = String(unit || '').toLowerCase();
      if (u.startsWith('kilo') || u === 'kg') return `${Math.round(n)}kg`;
      if (u.startsWith('pound') || u === 'lb') return `${Math.round(n)}lb`;
      return `${Math.round(n)}${u || 'kg'}`;
    };

    type BagSummary = { quantity: number; weight: string | null };
    type SliceSummary = {
      direction: 'outbound' | 'return';
      fareBrand: string | null;
      cabinClass: string;
      baggage: { carryOn: BagSummary; checked: BagSummary };
    };

    const summariseSlice = (slice: any, direction: 'outbound' | 'return'): SliceSummary => {
      const segs = slice?.segments || [];
      // Per-segment bag counts for the first adult (or first passenger overall)
      const perSegCounts = segs.map((seg: any) => {
        const paxEntry =
          seg.passengers?.find((p: any) => {
            const match = offer.passengers?.find((op: any) => op.id === p.passenger_id);
            return match?.type === 'adult';
          }) || seg.passengers?.[0];
        const bags = paxEntry?.baggages || [];
        let carry = 0, checked = 0;
        let carryWeight: string | null = null, checkedWeight: string | null = null;
        for (const b of bags) {
          const w = formatWeight(
            b?.maximum_weight_kg ?? b?.maximum_weight ?? b?.weight?.amount ?? b?.allowance?.weight,
            b?.weight_unit ?? b?.weight?.unit ?? b?.allowance?.unit ?? 'kg',
          );
          if (b?.type === 'carry_on') {
            carry += Number(b?.quantity || 0);
            if (w && !carryWeight) carryWeight = w;
          } else if (b?.type === 'checked') {
            checked += Number(b?.quantity || 0);
            if (w && !checkedWeight) checkedWeight = w;
          }
        }
        return { carry, checked, carryWeight, checkedWeight };
      });

      // Worst-case (min) across segments — if any leg gives 0 checked bags,
      // the whole slice gives 0 checked bags end-to-end.
      const minCarry = perSegCounts.length
        ? Math.min(...perSegCounts.map((x: any) => x.carry))
        : 0;
      const minChecked = perSegCounts.length
        ? Math.min(...perSegCounts.map((x: any) => x.checked))
        : 0;
      const carryWeight = perSegCounts.find((x: any) => x.carryWeight)?.carryWeight || null;
      const checkedWeight = perSegCounts.find((x: any) => x.checkedWeight)?.checkedWeight || null;

      const firstSegOfSlice = segs[0];
      const paxOnSeg = firstSegOfSlice?.passengers?.[0];
      const cabinClass =
        paxOnSeg?.cabin_class_marketing_name ||
        paxOnSeg?.cabin_class ||
        'Economy';
      const fareBrand =
        paxOnSeg?.fare_basis_code
          ? (slice?.fare_brand_name || paxOnSeg?.cabin_class_marketing_name || null)
          : (slice?.fare_brand_name || null);

      return {
        direction,
        fareBrand,
        cabinClass,
        baggage: {
          carryOn: { quantity: minCarry, weight: carryWeight },
          checked: { quantity: minChecked, weight: checkedWeight },
        },
      };
    };

    const sliceSummaries: SliceSummary[] = [summariseSlice(outSlice, 'outbound')];
    if (retSlice) sliceSummaries.push(summariseSlice(retSlice, 'return'));

    /* ─── Available services (Phase 2a: baggage only) ───────────────────────
       Duffel returns `available_services` when we pass
       ?return_available_services=true. Each service has:
         - id                    service ID to pass to POST /air/orders
         - type                  'baggage' | 'seat' | 'meal' | 'cancel_for_any_reason'
         - total_amount          string price for ONE unit of this service
         - total_currency
         - maximum_quantity      upper bound for how many of this service
         - passenger_ids[]       which passengers this applies to
         - segment_ids[]         which segments this applies to
         - metadata              type-specific (e.g. maximum_weight_kg)

       We collapse each raw service into a human row: one passenger, one
       scope (outbound / return / full trip), one kind (carry_on / checked),
       one price. The UI groups by (kind, scope) under "Essential".
    ─────────────────────────────────────────────────────────────────────── */

    type BaggageService = {
      id: string;
      kind: 'carry_on' | 'checked';
      weight: string | null;
      priceAmount: number;
      priceCurrency: string;
      priceDisplay: string;  // "£25.00"
      maxQuantity: number;
      scope: 'outbound' | 'return' | 'full_trip';
      scopeLabel: string;    // "Outbound" | "Return" | "Full trip"
      passengerIds: string[];
      segmentIds: string[];
      // Max length hint when Duffel gives it, for premium transparency
      maxLengthCm: number | null;
    };

    const outSegIds = new Set<string>((outSlice?.segments || []).map((s: any) => s.id));
    const retSegIds = new Set<string>(((retSlice?.segments || []) as any[]).map((s: any) => s.id));

    const deriveScope = (segmentIds: string[]): { scope: BaggageService['scope']; scopeLabel: string } => {
      const allOutbound = segmentIds.every((id) => outSegIds.has(id));
      const allReturn = segmentIds.every((id) => retSegIds.has(id));
      const spansBoth = segmentIds.some((id) => outSegIds.has(id)) && segmentIds.some((id) => retSegIds.has(id));

      if (retSlice && spansBoth) return { scope: 'full_trip', scopeLabel: 'Full trip' };
      if (allOutbound) return { scope: 'outbound', scopeLabel: 'Outbound' };
      if (allReturn) return { scope: 'return', scopeLabel: 'Return' };
      // Fallback when segments can't be classified (defensive; shouldn't happen)
      return { scope: 'full_trip', scopeLabel: 'Full trip' };
    };

    const formatPrice = (amount: string | number, currency: string): string => {
      const n = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (!Number.isFinite(n)) return `${currency} 0.00`;
      const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : `${currency} `;
      return `${symbol}${n.toFixed(2)}`;
    };

    const rawServices: any[] = offer.available_services || [];
    const baggageServices: BaggageService[] = rawServices
      .filter((svc) => svc?.type === 'baggage' && svc?.id)
      .map((svc): BaggageService | null => {
        const metaType = svc?.metadata?.type;
        const kind: 'carry_on' | 'checked' | null =
          metaType === 'carry_on' || metaType === 'checked' ? metaType : null;
        if (!kind) return null;

        const segmentIds: string[] = Array.isArray(svc.segment_ids) ? svc.segment_ids : [];
        const passengerIds: string[] = Array.isArray(svc.passenger_ids) ? svc.passenger_ids : [];
        const { scope, scopeLabel } = deriveScope(segmentIds);

        const priceAmount = parseFloat(svc.total_amount || '0');
        const priceCurrency = svc.total_currency || offer.currency || 'GBP';

        const weight = formatWeight(
          svc?.metadata?.maximum_weight_kg,
          'kg',
        );

        const maxLen = svc?.metadata?.maximum_length_cm;
        const maxLengthCm =
          typeof maxLen === 'number' && Number.isFinite(maxLen) && maxLen > 0 ? maxLen : null;

        return {
          id: String(svc.id),
          kind,
          weight,
          priceAmount,
          priceCurrency,
          priceDisplay: formatPrice(priceAmount, priceCurrency),
          maxQuantity: Number(svc.maximum_quantity ?? 1) || 1,
          scope,
          scopeLabel,
          passengerIds,
          segmentIds,
          maxLengthCm,
        };
      })
      .filter((x): x is BaggageService => x !== null)
      // Sort: checked before carry_on (more valuable upsell), outbound before return,
      // cheapest first within group.
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'checked' ? -1 : 1;
        const scopeRank = { outbound: 0, return: 1, full_trip: 2 } as const;
        if (scopeRank[a.scope] !== scopeRank[b.scope]) return scopeRank[a.scope] - scopeRank[b.scope];
        return a.priceAmount - b.priceAmount;
      });

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
      // Cabin class (top-level, retained for backward compat with older
      // callers — mixed-cabin itineraries should read slices[].cabinClass)
      cabinClass: firstSeg?.passengers?.[0]?.cabin_class_marketing_name || 'Economy',
      // Per-slice fare brand + baggage summary (Phase 1 "What's included")
      slices: sliceSummaries,
      // Phase 2a — ancillaries from Duffel `available_services`, baggage only.
      // Passed through at cost (no markup on ancillaries — CMA drip-pricing
      // guidance + brand-trust trade-off; revenue is from base-fare margin).
      availableServices: {
        baggage: baggageServices,
      },
      // Expiry
      expiresAt: offer.expires_at || null,
      // Payment requirements — exposes whether this offer can be held and paid later.
      // Most real carriers return requires_instant_payment=true, so we just track it
      // in logs for now; no UI is built against it yet. See Duffel "Holding Orders" guide.
      paymentRequirements: {
        requiresInstantPayment: offer.payment_requirements?.requires_instant_payment ?? true,
        paymentRequiredBy: offer.payment_requirements?.payment_required_by || null,
        priceGuaranteeExpiresAt: offer.payment_requirements?.price_guarantee_expires_at || null,
      },
    };

    // Log whenever a hold-capable offer shows up so we know when it's worth building the UI
    if (offer.payment_requirements?.requires_instant_payment === false) {
      console.log(
        `[hold-capable offer] ${airlineCode} ${result.origin}->${result.destination} ` +
        `offer=${offer.id} pay_by=${offer.payment_requirements?.payment_required_by}`,
      );
    }

    return NextResponse.json({ success: true, offer: result });
  } catch (err: any) {
    console.error('Offer fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch offer details' }, { status: 500 });
  }
}
