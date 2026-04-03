'use client';
import { useState } from 'react';

export default function DealAlertForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function handleJoin() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    // Open mailto so the submission reaches the site owner
    window.location.href = `mailto:waqar@jetmeaway.co.uk?subject=Deal Alert Signup&body=New signup: ${encodeURIComponent(trimmed)}`;
    setDone(true);
  }

  if (done) {
    return <p className="text-[.75rem] text-green-400 font-semibold py-2">✅ You&apos;re signed up! Deal alerts coming soon.</p>;
  }

  return (
    <>
      <div className="flex rounded-md overflow-hidden">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="Your email"
          className="flex-1 bg-white/[.06] border-none py-3 px-3.5 font-[Nunito] text-[.78rem] text-white outline-none placeholder:text-white/30"
        />
        <button
          onClick={handleJoin}
          className="bg-[#0066FF] hover:bg-[#0052CC] text-white border-none py-3 px-4 font-[Poppins] text-[.7rem] font-bold cursor-pointer transition-colors">
          Join
        </button>
      </div>
      {error && <p className="text-[.65rem] text-red-400 mt-1">{error}</p>}
      <p className="text-[.68rem] mt-2 text-white/20">Get deal alerts and flash sales to your inbox.</p>
    </>
  );
}
