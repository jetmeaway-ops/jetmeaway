import BookingClient from './BookingClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════════════════════════
   /flights/kyte/[offerId]?tx=...

   Customer-facing booking flow for Kyte direct-bookable LCC offers.
   Reached when a user clicks a Kyte row on /flights — the client-side
   click handler in flights-client.tsx stashes the FlightResult in
   sessionStorage under `kyte-offer-{offerId}` for retrieval here.

   Server shell intentionally minimal — all UX state lives in the
   client component (passenger form, address, ancillaries, T&Cs gate,
   Ryanair iframe). Card capture is gated on PCI strategy (email out to
   Raquel 2026-05-12, awaiting reply) and shows a "payment finalisation"
   placeholder until then.
   ═══════════════════════════════════════════════════════════════════════════ */

type Params = { offerId: string };
type Search = { tx?: string };

export default async function KyteOfferPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { offerId } = await params;
  const { tx } = await searchParams;
  return <BookingClient offerId={offerId} transactionId={tx || ''} />;
}
