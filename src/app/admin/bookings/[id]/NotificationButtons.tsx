'use client';

import { useState } from 'react';

type Props = {
  bookingRef: string;
  hasEmail: boolean;
  hasPhone: boolean;
};

type Channel = 'email' | 'sms' | 'both';

export default function NotificationButtons({ bookingRef, hasEmail, hasPhone }: Props) {
  const [busy, setBusy] = useState<Channel | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function send(channel: Channel) {
    if (busy) return;
    setBusy(channel);
    setResult(null);
    try {
      const res = await fetch('/api/admin/resend-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: bookingRef, channel }),
      });
      const body = await res.json();
      if (body.success) {
        const target =
          channel === 'email'
            ? body.sentTo?.email
            : channel === 'sms'
              ? body.sentTo?.phone
              : `${body.sentTo?.email || '?'} + ${body.sentTo?.phone || '?'}`;
        setResult(`✅ ${body.kind === 'confirmed' ? 'Confirmation' : 'Decline'} ${channel === 'both' ? 'email + SMS' : channel} sent to ${target}`);
      } else {
        setResult(`⚠️ ${body.error || 'Failed'}`);
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send('email')}
          disabled={!hasEmail || !!busy}
          title={hasEmail ? 'Resend via email' : 'No customer email on record'}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#1A1D2B] hover:bg-blue-50 hover:border-[#0066FF] hover:text-[#0066FF] disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:text-[#1A1D2B] transition"
        >
          {busy === 'email' ? 'Sending email…' : 'Resend email'}
        </button>
        <button
          type="button"
          onClick={() => send('sms')}
          disabled={!hasPhone || !!busy}
          title={hasPhone ? 'Resend via SMS' : 'No customer phone on record'}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#1A1D2B] hover:bg-blue-50 hover:border-[#0066FF] hover:text-[#0066FF] disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-gray-300 disabled:hover:text-[#1A1D2B] transition"
        >
          {busy === 'sms' ? 'Sending SMS…' : 'Send SMS'}
        </button>
        <button
          type="button"
          onClick={() => send('both')}
          disabled={(!hasEmail && !hasPhone) || !!busy}
          title="Resend via both email and SMS"
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-[#5C6378] hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {busy === 'both' ? 'Sending…' : 'Send both'}
        </button>
      </div>
      {result && <p className="text-xs text-[#5C6378] max-w-md">{result}</p>}
    </div>
  );
}
