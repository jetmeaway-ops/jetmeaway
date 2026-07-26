import { notFound } from 'next/navigation';
import DemoClient from '../admin/kyte-ryanair-demo/DemoClient';

// Node runtime — DemoClient drives the Kyte sandbox routes, which run on Node
// (Fixie proxy). force-dynamic so the token is checked per request, never cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Private Kyte certification page.
 *
 * Reachable ONLY with the exact cert token in the URL:
 *   /kyte-cert?token=<KYTE_DEMO_TOKEN>
 * Any other request 404s, so this is invisible to customers and search
 * engines. The token is threaded into DemoClient, which sends it as the
 * `x-kyte-cert` header on its Kyte API calls — that (and only that) unlocks
 * real sandbox offers from /api/flights/kyte/search. The public /flights
 * search carries no token, so customers still get zero Kyte rows.
 *
 * Built for Kyte to certify the integration end-to-end before issuing a live
 * key. Runs against the Kyte SANDBOX (KYTE_SANDBOX_BASE_URL) — no real money,
 * documented sandbox test card.
 */
export default async function KyteCertPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  const token = (raw || '').trim();
  const expected = process.env.KYTE_DEMO_TOKEN || '';

  // No token configured, or wrong/missing token → behave as if the page does
  // not exist. Constant-ish comparison; token is high-entropy.
  if (!expected || token !== expected) notFound();

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 px-4">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-2xl font-bold text-[#1A1D2B]">
          Kyte · Ryanair sandbox certification
        </h1>
        <p className="text-sm text-[#5C6378] mt-2">
          Private certification harness for Kyte. Runs the full Ryanair sandbox OTA flow against the
          Kyte sandbox via our API routes (search &rarr; book &rarr; ancillaries &rarr; commit), then
          renders the official Ryanair flight-confirmation iframe. Uses the documented Ryanair sandbox
          test card — no real payment is taken. This page is not linked anywhere and is not visible to
          customers; the public flight search shows no Kyte results.
        </p>
        <DemoClient certToken={token} />
      </div>
    </main>
  );
}
