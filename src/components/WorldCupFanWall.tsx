'use client';

import { useEffect, useState } from 'react';

/**
 * Public fan wall + "ask the expert" box for /world-cup-2026. Talks to the
 * KV-backed /api/world-cup/comments route. No PII fields — name + city are
 * optional and free-text; the message is capped. See the route for guards.
 */

type Comment = {
  id: string;
  name: string;
  city: string;
  message: string;
  isQuestion: boolean;
  ts: number;
};

const MESSAGE_MAX = 280;

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function WorldCupFanWall() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/world-cup/comments');
        const data = await res.json();
        if (live) setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        /* leave empty */
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function submit() {
    const trimmed = message.trim();
    if (trimmed.length < 2 || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/world-cup/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city, message: trimmed, isQuestion }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not post — try again.');
        return;
      }
      if (data.comment) setComments((c) => [data.comment, ...c]);
      setMessage('');
      setIsQuestion(false);
    } catch {
      setError('Could not reach the server — try again.');
    } finally {
      setPosting(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-[#E8ECF4] bg-white px-3.5 py-2.5 font-poppins text-[.85rem] font-semibold text-[#1A1D2B] placeholder:text-[#8E95A9] focus:border-[#0066FF] focus:outline-none';

  return (
    <div className="mx-auto max-w-[760px]">
      {/* Composer */}
      <div className="rounded-3xl border border-[#E8ECF4] bg-white p-5 shadow-[0_12px_40px_-16px_rgba(0,102,255,0.16)] md:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={inputCls} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" />
          <input className={inputCls} value={city} maxLength={40} onChange={(e) => setCity(e.target.value)} placeholder="Which city/match? (optional)" />
        </div>
        <textarea
          className={`${inputCls} mt-3 resize-none`}
          rows={3}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isQuestion ? 'Ask the travel expert a question…' : 'Share a tip, find travel buddies, or talk England…'}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[.8rem] font-bold text-[#5C6378]">
            <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} className="h-4 w-4 accent-[#0066FF]" />
            Ask the expert a question
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[.72rem] font-semibold text-[#8E95A9]">{message.length}/{MESSAGE_MAX}</span>
            <button
              type="button"
              onClick={submit}
              disabled={posting || message.trim().length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 font-poppins text-[.82rem] font-black text-white transition-colors hover:bg-[#0052CC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? 'Posting…' : isQuestion ? 'Ask' : 'Post'}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-[.78rem] font-bold text-[#D9281B]">{error}</p>}
        <p className="mt-2 text-[.68rem] font-medium text-[#8E95A9]">Public wall — please keep it friendly and don’t share personal details. Posts aren’t verified or advice.</p>
      </div>

      {/* Wall */}
      <div className="mt-6 space-y-3">
        {loading && <p className="text-center text-[.85rem] font-semibold text-[#8E95A9]">Loading the wall…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-center text-[.85rem] font-semibold text-[#8E95A9]">Be the first to post — share a tip or find travel buddies.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-2xl border border-[#E8ECF4] bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="font-poppins text-[.85rem] font-black text-[#1A1D2B]">{c.name || 'England fan'}</span>
              {c.city && <span className="text-[.74rem] font-semibold text-[#8E95A9]">· {c.city}</span>}
              {c.isQuestion && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[.6rem] font-black uppercase tracking-[1px] text-[#0066FF]">Question</span>
              )}
              <span className="ml-auto text-[.7rem] font-semibold text-[#B6BCCB]">{ago(c.ts)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[.88rem] font-medium leading-snug text-[#5C6378]">{c.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
