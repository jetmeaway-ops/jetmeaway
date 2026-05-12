'use client';

import { useState } from 'react';
import RyanairConfirmIframe, {
  type RyanairTelemetryPayload,
} from '@/components/RyanairConfirmIframe';
import RyanairTermsCheckbox from '@/components/RyanairTermsCheckbox';

type LogEntry = { at: string; level: 'info' | 'ok' | 'warn' | 'err'; msg: string };

type BookResult = {
  transactionId: string;
  bookingId: string;
  totalAmount: number;
};

type CommitResult = {
  transactionId: string;
  bookingId: string;
  sessionToken: string;
  totalAmount: number;
};

const FORM_DEFAULTS = {
  from: 'BUD',
  to: 'DUB',
  market: 'gb/en',
};

export default function DemoClient() {
  const [from, setFrom] = useState(FORM_DEFAULTS.from);
  const [to, setTo] = useState(FORM_DEFAULTS.to);
  const [market, setMarket] = useState(FORM_DEFAULTS.market);
  const [running, setRunning] = useState(false);
  const [booked, setBooked] = useState<BookResult | null>(null);
  const [committed, setCommitted] = useState<CommitResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  function pushLog(level: LogEntry['level'], msg: string) {
    setLogs((prev) => [...prev, { at: new Date().toLocaleTimeString('en-GB'), level, msg }]);
  }

  function reset() {
    setBooked(null);
    setCommitted(null);
    setLogs([]);
  }

  /** Phase 1: Search + Book. STOPS before Commit so the user can view T&Cs. */
  async function runBook() {
    setRunning(true);
    reset();

    try {
      const departureDate = (() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 45);
        return d.toISOString().slice(0, 10);
      })();
      pushLog('info', `Step 1/3: /api/flights/kyte/search (FR ${from}-${to} ${departureDate})`);

      const search = await postJson('/api/flights/kyte/search', {
        origin: from,
        destination: to,
        departure: departureDate,
        adults: 1,
        airlines: 'FR',
      });
      const offerIds = search.offers ? Object.keys(search.offers) : [];
      if (!offerIds.length) {
        pushLog('err', 'No offers returned — try a different sandbox-friendly FR route.');
        return;
      }
      const offerId = offerIds[0];
      const transactionId = search.transactionId as string;
      pushLog('ok', `Got ${offerIds.length} offer(s). Using tx=${transactionId.slice(0, 8)}…`);

      pushLog('info', 'Step 2/3: /api/flights/kyte/book (with traveller address)');
      const book = await postJson('/api/flights/kyte/book', {
        transactionId,
        offerId,
        passengers: [
          {
            firstName: 'Ryanair',
            lastName: 'Tester',
            gender: 'male',
            title: 'mr',
            dateOfBirth: '1988-05-12',
            email: 'sandbox-test@jetmeaway.co.uk',
            phone: { countryCode: '+44', number: '7700900000' },
          },
        ],
        address: {
          addressLines: ['66 Paul Street'],
          city: 'London',
          postalCode: 'EC2A 4NA',
          countryCode: 'GB',
        },
      });
      const bookingId = book.bookingId as string;
      const totalAmount = (book.currentBalance as number) || 0;
      pushLog(
        'ok',
        `Booking created — ${bookingId.slice(0, 16)}… balance ${formatPrice(totalAmount, book.currency)}`,
      );

      pushLog(
        'info',
        'Pausing for Ryanair T&C acknowledgement. Tick the box below to continue to Commit + iframe.',
      );
      setBooked({ transactionId, bookingId, totalAmount });
    } catch (err) {
      pushLog('err', (err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  /** Phase 2: Commit (only callable once T&Cs are accepted). Renders iframe on success. */
  async function runCommit() {
    if (!booked) return;
    setRunning(true);
    try {
      pushLog(
        'info',
        'Step 3/3: /api/flights/kyte/commit (will return x-session-token for the iframe)',
      );
      const commit = await postJson('/api/flights/kyte/commit', {
        transactionId: booked.transactionId,
        bookingId: booked.bookingId,
      });
      const sessionToken = commit.sessionToken as string;
      if (!sessionToken) {
        pushLog('err', 'commit returned no sessionToken — cannot continue to iframe.');
        return;
      }
      pushLog(
        'ok',
        `Session token captured: ${sessionToken.slice(0, 18)}… (ticketStatus=${commit.ticketStatus})`,
      );
      pushLog('info', 'Rendering Ryanair iframe below ⬇');
      setCommitted({
        transactionId: booked.transactionId,
        bookingId: booked.bookingId,
        sessionToken,
        totalAmount: booked.totalAmount,
      });
    } catch (err) {
      pushLog('err', (err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function onIframeConfirmed(t: RyanairTelemetryPayload) {
    pushLog('ok', `iframe REDIRECT,200 → ready to call Payment. session=${t.session.slice(0, 8)}…`);
  }
  function onIframeError(t: RyanairTelemetryPayload) {
    pushLog('err', `iframe SESSION_ERROR: ${t.error || 'invalid session'}`);
  }
  function onIframeTimeout(t: RyanairTelemetryPayload) {
    pushLog('warn', `iframe TIMEOUT (sessionTTL=${t.sessionTTL ?? '?'}s)`);
  }
  function onIframeClosed(t: RyanairTelemetryPayload) {
    pushLog('warn', `iframe UNLOADED — user closed before confirming.`);
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Form + run button */}
      <section className="bg-white rounded-2xl border border-[#E8ECF4] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1A1D2B] mb-4">Run sandbox flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="block text-[#5C6378] mb-1">From (IATA)</span>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value.toUpperCase())}
              className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
              maxLength={3}
            />
          </label>
          <label className="text-sm">
            <span className="block text-[#5C6378] mb-1">To (IATA)</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value.toUpperCase())}
              className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
              maxLength={3}
            />
          </label>
          <label className="text-sm">
            <span className="block text-[#5C6378] mb-1">Ryanair market</span>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            >
              <option value="gb/en">gb/en (UK · English)</option>
              <option value="ie/en">ie/en (Ireland · English)</option>
              <option value="fr/fr">fr/fr (France · French)</option>
              <option value="de/de">de/de (Germany · German)</option>
              <option value="es/es">es/es (Spain · Spanish)</option>
              <option value="it/it">it/it (Italy · Italian)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={runBook}
              disabled={running || !from || !to}
              className="w-full bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm"
            >
              {running && !booked
                ? 'Running…'
                : committed
                  ? 'Run again'
                  : booked
                    ? 'Re-book'
                    : 'Search & book'}
            </button>
          </div>
        </div>
        <p className="text-xs text-[#8E95A9] mt-3">
          Sandbox-friendly FR routes: BUD-DUB, ARN-STN. Each run creates a real sandbox booking via
          Kyte (no real money, but appears in /admin/bookings). Flow pauses after Book so the
          customer can review Ryanair&apos;s T&amp;Cs (mandatory before Commit per OTA spec).
        </p>
      </section>

      {/* T&Cs gate — appears after Book, gates Commit */}
      {booked && !committed && (
        <RyanairTermsCheckbox
          continueLabel="Continue to flight confirmation"
          onContinue={runCommit}
          busy={running}
        />
      )}

      {/* Iframe — appears after commit */}
      {committed && (
        <section className="bg-white rounded-2xl border border-[#E8ECF4] p-6 shadow-sm">
          <RyanairConfirmIframe
            sessionToken={committed.sessionToken}
            market={market}
            partnerId="KOTA"
            hostBase="https://fr.sandbox.gokyte.com"
            onConfirmed={onIframeConfirmed}
            onSessionError={onIframeError}
            onTimeout={onIframeTimeout}
            onClosed={onIframeClosed}
          />
        </section>
      )}

      {/* Event log */}
      <section className="bg-white rounded-2xl border border-[#E8ECF4] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1A1D2B] mb-4">Event log</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-[#8E95A9]">Run the flow to see live events here.</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {logs.map((l, i) => (
              <li key={i} className={levelClass(l.level)}>
                <span className="text-[#8E95A9] mr-2">{l.at}</span>
                <span className="mr-2">{levelIcon(l.level)}</span>
                {l.msg}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    const reason =
      typeof payload?.error === 'string' ? payload.error : `${url} returned ${res.status}`;
    throw new Error(reason);
  }
  return payload;
}

function formatPrice(minorUnits: number, currency: unknown): string {
  const code =
    currency && typeof currency === 'object' && 'code' in currency
      ? String((currency as { code: string }).code)
      : 'GBP';
  return `${(minorUnits / 100).toFixed(2)} ${code}`;
}

function levelIcon(l: LogEntry['level']): string {
  return { info: '•', ok: '✓', warn: '⚠', err: '✗' }[l];
}
function levelClass(l: LogEntry['level']): string {
  return {
    info: 'text-[#5C6378]',
    ok: 'text-emerald-700',
    warn: 'text-amber-700',
    err: 'text-red-700',
  }[l];
}
