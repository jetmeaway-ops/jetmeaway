import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { applyMarkup, saveBookingIntent, MARKUP_GBP } from '@/lib/travel-logic';

export const runtime = 'edge';

const DUFFEL_KEY = process.env.DUFFEL_ACCESS_TOKEN || process.env.DUFFEL_API_KEY || '';
const RESEND_KEY = process.env.RESEND_API_KEY || '';

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function fmtTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDuration(mins: number): string {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD CONFIRMATION EMAIL HTML
   ═══════════════════════════════════════════════════════════════════════════ */

function buildEmailHtml(order: any, passengers: any[], totalPerPerson: number, totalAll: number): string {
  const outSlice = order.slices?.[0];
  const retSlice = order.slices?.[1] || null;
  const firstSeg = outSlice?.segments?.[0];
  const lastOutSeg = outSlice?.segments?.[outSlice?.segments?.length - 1];
  const airlineName = firstSeg?.marketing_carrier?.name || '';
  const origin = outSlice?.origin?.iata_code || '';
  const originCity = outSlice?.origin?.city_name || outSlice?.origin?.name || origin;
  const dest = outSlice?.destination?.iata_code || '';
  const destCity = outSlice?.destination?.city_name || outSlice?.destination?.name || dest;

  const parseDuration = (iso: string | null): number => {
    if (!iso) return 0;
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
  };

  const outStops = (outSlice?.segments?.length || 1) - 1;
  const stopsLabel = outStops === 0 ? 'Direct' : outStops === 1 ? '1 stop' : `${outStops} stops`;

  const passengerRows = passengers.map((p: any, i: number) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #F1F3F7;font-size:14px;color:#1A1D2B;">${i + 1}. ${p.given_name} ${p.family_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #F1F3F7;font-size:14px;color:#5C6378;">${p.born_on || ''}</td>
    </tr>`
  ).join('');

  const returnSection = retSlice ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #E8ECF4;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Return Flight</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:18px;font-weight:800;color:#1A1D2B;">${fmtTime(retSlice.segments?.[0]?.departing_at)} ${dest}</td>
          <td style="text-align:center;font-size:12px;color:#8E95A9;">${fmtDuration(parseDuration(retSlice.duration))}</td>
          <td style="text-align:right;font-size:18px;font-weight:800;color:#1A1D2B;">${fmtTime(retSlice.segments?.[retSlice.segments.length - 1]?.arriving_at)} ${origin}</td>
        </tr>
      </table>
      <p style="font-size:12px;color:#8E95A9;margin:4px 0 0;">${fmtDate(retSlice.segments?.[0]?.departing_at)}</p>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#0066FF;margin:0;">✈ JetMeAway</h1>
      <p style="font-size:13px;color:#8E95A9;margin:4px 0 0;">Your travel scout</p>
    </div>

    <!-- Confirmation Banner -->
    <div style="background:linear-gradient(135deg,#059669,#10B981);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="font-size:28px;margin:0 0 8px;">✓</p>
      <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 4px;">Booking Confirmed!</h2>
      <p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;">Your e-ticket will be sent separately by ${airlineName}</p>
    </div>

    <!-- Booking Reference -->
    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Booking Reference</p>
      <p style="font-size:22px;font-weight:800;color:#1A1D2B;margin:0;letter-spacing:1px;">${order.booking_reference || order.id}</p>
    </div>

    <!-- Flight Details -->
    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Outbound Flight</p>
      <p style="font-size:14px;font-weight:700;color:#5C6378;margin:0 0 8px;">${airlineName} · ${stopsLabel}</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:22px;font-weight:800;color:#1A1D2B;">${fmtTime(firstSeg?.departing_at)} ${origin}</td>
          <td style="text-align:center;font-size:12px;color:#8E95A9;">→ ${fmtDuration(parseDuration(outSlice?.duration))}</td>
          <td style="text-align:right;font-size:22px;font-weight:800;color:#1A1D2B;">${fmtTime(lastOutSeg?.arriving_at)} ${dest}</td>
        </tr>
      </table>
      <p style="font-size:13px;color:#5C6378;margin:8px 0 0;">${originCity} → ${destCity}</p>
      <p style="font-size:12px;color:#8E95A9;margin:4px 0 0;">${fmtDate(firstSeg?.departing_at)}</p>
      ${returnSection}
    </div>

    <!-- Passengers -->
    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:16px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Passengers</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;color:#8E95A9;border-bottom:2px solid #E8ECF4;">Name</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;color:#8E95A9;border-bottom:2px solid #E8ECF4;">DOB</th>
        </tr>
        ${passengerRows}
      </table>
    </div>

    <!-- Price Summary -->
    <div style="background:#fff;border:1px solid #E8ECF4;border-radius:16px;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;color:#8E95A9;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Price Summary</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#5C6378;">Flight (per person)</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1A1D2B;text-align:right;">£${(totalPerPerson - MARKUP_GBP).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#5C6378;">JetMeAway fee</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1A1D2B;text-align:right;">£${MARKUP_GBP.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#5C6378;">Per person total</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1A1D2B;text-align:right;">£${totalPerPerson.toFixed(2)}</td>
        </tr>
        ${passengers.length > 1 ? `
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#5C6378;">× ${passengers.length} passengers</td>
          <td style="padding:6px 0;font-size:14px;font-weight:700;color:#1A1D2B;text-align:right;">£${totalAll.toFixed(2)}</td>
        </tr>` : ''}
        <tr>
          <td colspan="2" style="border-top:2px solid #E8ECF4;padding:12px 0 0;"></td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:800;color:#1A1D2B;">Total Paid</td>
          <td style="font-size:20px;font-weight:800;color:#059669;text-align:right;">£${totalAll.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid #E8ECF4;">
      <p style="font-size:12px;color:#8E95A9;margin:0 0 4px;">Questions? Contact us at <a href="mailto:waqar@jetmeaway.co.uk" style="color:#0066FF;">waqar@jetmeaway.co.uk</a></p>
      <p style="font-size:11px;color:#B0B8CC;margin:0;">JetMeAway · jetmeaway.co.uk · Your AI-powered travel scout</p>
    </div>

  </div>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HANDLER — POST /api/book
   ═══════════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { offerId, passengers, sessionId } = body;

    // passengers: [{ given_name, family_name, born_on, gender, email?, phone? }]
    if (!offerId || !passengers?.length) {
      return NextResponse.json({ error: 'Missing offer ID or passenger details' }, { status: 400 });
    }

    if (!DUFFEL_KEY) {
      return NextResponse.json({ error: 'Booking service unavailable' }, { status: 503 });
    }

    /* ── Step 1: Create Duffel order ────────────────────────────────── */

    const duffelPassengers = passengers.map((p: any, i: number) => ({
      id: p.id, // Duffel passenger ID from the offer
      given_name: p.given_name,
      family_name: p.family_name,
      born_on: p.born_on,
      gender: p.gender,
      title: p.gender === 'male' ? 'mr' : 'ms',
      ...(i === 0 ? {
        email: p.email,
        phone_number: p.phone?.replace(/\s+/g, ''),
      } : {}),
    }));

    const orderRes = await fetch('https://api.duffel.com/air/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'instant',
          selected_offers: [offerId],
          passengers: duffelPassengers,
          payments: [{
            type: 'balance',
            amount: body.totalAmount,
            currency: 'GBP',
          }],
        },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('Duffel order error:', orderRes.status, errText);

      let message = 'Booking failed. Please try again.';
      try {
        const errJson = JSON.parse(errText);
        message = errJson.errors?.[0]?.message || message;
      } catch {}

      return NextResponse.json({ error: message }, { status: orderRes.status });
    }

    const orderJson = await orderRes.json();
    const order = orderJson.data;

    /* ── Step 2: Fetch documents (PDF ticket) ───────────────────────── */

    let documentsUrl: string | null = null;
    try {
      const docsRes = await fetch(`https://api.duffel.com/air/orders/${order.id}/documents`, {
        headers: {
          'Authorization': `Bearer ${DUFFEL_KEY}`,
          'Duffel-Version': 'v2',
          'Accept': 'application/json',
        },
      });

      if (docsRes.ok) {
        const docsJson = await docsRes.json();
        // Find the e-ticket or itinerary PDF
        const docs = docsJson.data || [];
        const ticket = docs.find((d: any) => d.type === 'electronic_ticket' || d.type === 'itinerary');
        documentsUrl = ticket?.url || docs[0]?.url || null;
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      // Non-critical — booking still succeeded
    }

    /* ── Step 3: Calculate pricing ──────────────────────────────────── */

    const totalAmount = parseFloat(order.total_amount || '0');
    const passengerCount = order.passengers?.length || 1;
    const basePerPerson = totalAmount / passengerCount;
    const totalPerPerson = applyMarkup(basePerPerson);
    const totalAll = totalPerPerson * passengerCount;

    /* ── Step 4: Send confirmation email via Resend ──────────────────── */

    const leadPassenger = passengers[0];
    let emailSent = false;

    if (RESEND_KEY && leadPassenger?.email) {
      try {
        const resend = new Resend(RESEND_KEY);
        const emailHtml = buildEmailHtml(order, duffelPassengers, totalPerPerson, totalAll);

        const outSlice = order.slices?.[0];
        const origin = outSlice?.origin?.iata_code || '';
        const dest = outSlice?.destination?.iata_code || '';

        await resend.emails.send({
          from: 'JetMeAway <bookings@jetmeaway.co.uk>',
          to: leadPassenger.email,
          subject: `✈ Booking Confirmed — ${origin} → ${dest} | JetMeAway`,
          html: emailHtml,
        });

        emailSent = true;
      } catch (err) {
        console.error('Failed to send confirmation email:', err);
        // Non-critical — booking still succeeded
      }
    }

    /* ── Step 5: Save booking intent to KV ───────────────────────────── */

    if (sessionId) {
      try {
        const outSlice = order.slices?.[0];
        const firstSeg = outSlice?.segments?.[0];

        await saveBookingIntent(sessionId, {
          offerId,
          email: leadPassenger?.email || '',
          origin: outSlice?.origin?.iata_code || '',
          destination: outSlice?.destination?.iata_code || '',
          departure: firstSeg?.departing_at?.slice(0, 10) || '',
          returnDate: order.slices?.[1]?.segments?.[0]?.departing_at?.slice(0, 10) || null,
          passengers: passengerCount,
          totalPrice: totalAll,
          airline: firstSeg?.marketing_carrier?.name || '',
          createdAt: new Date().toISOString(),
        });
      } catch {}
    }

    /* ── Step 6: Return success ──────────────────────────────────────── */

    return NextResponse.json({
      success: true,
      bookingReference: order.booking_reference || order.id,
      orderId: order.id,
      documentsUrl,
      emailSent,
      totalPerPerson,
      totalAll,
    });

  } catch (err: any) {
    console.error('Booking error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
