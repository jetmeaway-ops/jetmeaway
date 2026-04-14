'use client';

import { useState } from 'react';

export default function PasswordInput() {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E95A9] hover:text-[#0066FF] transition p-1"
      >
        <i className={`fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
      </button>
    </div>
  );
}
