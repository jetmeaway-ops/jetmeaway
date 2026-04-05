'use client';

import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi, I'm Scout 👋 Ask me anything about travel — destinations, packing, weather, visas, culture. For prices, head to our search pages.",
};

export default function ScoutChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      // Strip the greeting before sending (it's UI-only, not a real turn)
      const history = next.filter((m, i) => !(i === 0 && m === GREETING));
      const res = await fetch('/api/scout-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scout error');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err?.message || "Sorry, I couldn't reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating Scout avatar */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Scout' : 'Open Scout'}
        className="fixed bottom-5 right-5 z-[300] group flex items-center gap-2.5 transition-all"
      >
        {/* Name tag — visible when closed, hides on open */}
        {!open && (
          <span className="hidden sm:flex items-center bg-white text-[#1A1D2B] font-[Poppins] font-extrabold text-[.72rem] px-3 py-1.5 rounded-full shadow-[0_6px_18px_rgba(0,0,0,0.1)] border border-[#E8ECF4]">
            Ask Scout
          </span>
        )}
        {/* Avatar circle */}
        <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#0066FF] to-[#4F46E5] shadow-[0_10px_28px_rgba(0,102,255,0.45)] flex items-center justify-center text-white text-[1.55rem] ring-4 ring-white group-hover:scale-105 transition-transform">
          {open ? (
            <i className="fa-solid fa-xmark"></i>
          ) : (
            <i className="fa-solid fa-person-hiking"></i>
          )}
          {/* Online pulse dot */}
          {!open && (
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
            </span>
          )}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[299] w-[calc(100vw-40px)] max-w-[380px] h-[520px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.25)] border border-[#E8ECF4] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0066FF] to-[#4F46E5] text-white px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
              <i className="fa-solid fa-compass"></i>
            </div>
            <div>
              <p className="font-[Poppins] font-extrabold text-[.95rem] leading-tight">Scout</p>
              <p className="text-[.7rem] text-white/80 leading-tight">Your travel assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F8FAFC]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[.82rem] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#0066FF] text-white rounded-br-sm'
                      : 'bg-white text-[#1A1D2B] border border-[#E8ECF4] rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E8ECF4] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E95A9] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E95A9] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E95A9] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#E8ECF4] bg-white p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask Scout anything..."
                rows={1}
                maxLength={500}
                className="flex-1 resize-none bg-[#F8FAFC] border border-[#E8ECF4] rounded-2xl px-3.5 py-2.5 text-[.82rem] text-[#1A1D2B] placeholder:text-[#8E95A9] focus:outline-none focus:border-[#0066FF] max-h-24"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-[#0066FF] text-white flex items-center justify-center hover:bg-[#0052cc] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <i className="fa-solid fa-paper-plane text-sm"></i>
              </button>
            </div>
            <p className="text-[.62rem] text-[#8E95A9] text-center mt-1.5">
              Scout gives general travel tips, not bookings.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
