'use client';

import { useState } from 'react';
import DemoClient from '../admin/kyte-ryanair-demo/DemoClient';

/* Carrier certification console. Pick a carrier and run the full sandbox
   lifecycle. Ryanair uses the OTA iframe flow (DemoClient); every other
   carrier runs Shop → OfferDetails → Book → Payment → Retrieve via the
   /api/flights/kyte/cert-run endpoint and shows a step-by-step log. */

type Flow = 'ota' | 'standard';
type Carrier = { code: string; name: string; from: string; to: string; flow: Flow };

// Sandbox routes proven (or expected) to return offers. from/to are editable
// per run so Kyte can adjust if a sandbox route changes.
const CARRIERS: Carrier[] = [
  { code: 'FR', name: 'Ryanair', from: 'BUD', to: 'DUB', flow: 'ota' },
  { code: 'U2', name: 'easyJet', from: 'LGW', to: 'AMS', flow: 'standard' },
  { code: 'LS', name: 'Jet2', from: 'MAN', to: 'PMI', flow: 'standard' },
  { code: 'W6', name: 'Wizz Air', from: 'LTN', to: 'BUD', flow: 'standard' },
  { code: '6E', name: 'IndiGo', from: 'DEL', to: 'BOM', flow: 'standard' },
  { code: 'V7', name: 'Volotea', from: 'LUX', to: 'NCE', flow: 'standard' },
  { code: 'HV', name: 'Transavia', from: 'AMS', to: 'AGP', flow: 'standard' },
  { code: 'VF', name: 'Ajet', from: 'LGW', to: 'IST', flow: 'standard' },
];

type Step = { name: string; ok: boolean; ms: number; note: string };
type RunResult = {
  ok: boolean;
  carrier: string;
  route: string;
  departure: string;
  bookingRef?: string | null;
  pnr?: string | null;
  paymentStatus?: string | null;
  steps: Step[];
  error?: string;
};

export default function KyteCertConsole({ certToken }: { certToken: string }) {
  const [code, setCode] = useState('FR');
  const carrier = CARRIERS.find((c) => c.code === code) || CARRIERS[0];

  return (
    <div className="mt-6">
      <label className="text-xs font-bold text-[#5C6378] uppercase tracking-wide">Carrier</label>
      <div className="flex flex-wrap gap-2 mt-2">
        {CARRIERS.map((c) => (
          <button
            key={c.code}
            onClick={() => setCode(c.code)}
            className={`px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
              c.code === code
                ? 'bg-[#0066FF] text-white border-[#0066FF]'
                : 'bg-white text-[#1A1D2B] border-[#E8ECF4] hover:border-[#0066FF]'
            }`}
          >
            {c.name} <span className="opacity-60">{c.code}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[#E8ECF4] bg-white p-5">
        {carrier.flow === 'ota' ? (
          <>
            <p className="text-sm text-[#5C6378] mb-2">
              <strong>{carrier.name}</strong> uses the Ryanair OTA flow (search → book → commit →
              official Ryanair confirmation iframe). T&amp;C acknowledgement required mid-flow.
            </p>
            <DemoClient certToken={certToken} />
          </>
        ) : (
          <StandardRunner key={carrier.code} carrier={carrier} certToken={certToken} />
        )}
      </div>
    </div>
  );
}

function defaultDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().slice(0, 10);
}

function StandardRunner({ carrier, certToken }: { carrier: Carrier; certToken: string }) {
  const [from, setFrom] = useState(carrier.from);
  const [to, setTo] = useState(carrier.to);
  const [departure, setDeparture] = useState(defaultDate());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/flights/kyte/cert-run', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-kyte-cert': certToken },
        body: JSON.stringify({ carrier: carrier.code, from, to, departure }),
      });
      const data = (await res.json()) as RunResult;
      setResult(res.ok ? data : { ...data, error: data.error || `HTTP ${res.status}` } as RunResult);
    } catch (e) {
      setResult({
        ok: false,
        carrier: carrier.code,
        route: `${from}-${to}`,
        departure: '',
        steps: [],
        error: (e as Error).message,
      });
    } finally {
      setRunning(false);
    }
  }

  const inputCls =
    'w-20 px-2 py-1.5 rounded-lg border border-[#E8ECF4] text-sm font-bold text-center uppercase';

  return (
    <div>
      <p className="text-sm text-[#5C6378] mb-3">
        <strong>{carrier.name}</strong> — full sandbox lifecycle: Shop → OfferDetails → Book →
        Payment (sandbox test card) → Retrieve (PNR). No real money.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} maxLength={3} aria-label="From" />
        <span className="text-[#8E95A9]">→</span>
        <input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} maxLength={3} aria-label="To" />
        <input
          type="date"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-[#E8ECF4] text-sm font-bold"
          aria-label="Departure date"
        />
        <button
          onClick={run}
          disabled={running}
          className="ml-2 px-4 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-bold disabled:opacity-50"
        >
          {running ? 'Running…' : `Run ${carrier.name} flow`}
        </button>
      </div>

      {result && (
        <div className="mt-4">
          <div
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${
              result.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {result.ok ? '✓ Full flow completed' : '⚠ Stopped — see steps'}
            {result.pnr ? ` · PNR ${result.pnr}` : ''}
            {result.paymentStatus ? ` · payment ${result.paymentStatus}` : ''}
          </div>
          {result.error && <p className="text-sm text-red-600 mb-2">{result.error}</p>}
          <ol className="space-y-1">
            {result.steps.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className={s.ok ? 'text-green-600' : 'text-red-600'}>{s.ok ? '✓' : '✗'}</span>
                <span className="font-semibold text-[#1A1D2B]">{s.name}</span>
                {s.ms ? <span className="text-[#8E95A9]">{s.ms}ms</span> : null}
                {s.note ? <span className="text-[#5C6378]">— {s.note}</span> : null}
              </li>
            ))}
          </ol>
          {result.bookingRef && (
            <p className="text-xs text-[#8E95A9] mt-2 font-mono">booking {result.bookingRef}</p>
          )}
        </div>
      )}
    </div>
  );
}
