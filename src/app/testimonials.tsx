'use client';

import { useState, useEffect } from 'react';

const TESTIMONIALS = [
  { quote: 'Saved over 200 on our family trip to Dubai. The price comparison made it so easy to find the best deal.', name: 'Sarah M.', location: 'Manchester' },
  { quote: 'I love that there are no booking fees. Found a 4-star hotel in Barcelona for half the price I expected.', name: 'James R.', location: 'London' },
  { quote: 'The AI assistant helped me plan our honeymoon to the Maldives. Everything was perfectly organised.', name: 'Emma T.', location: 'Bristol' },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-16 px-6 bg-[#0a1628]">
      <div className="max-w-[750px] mx-auto text-center">
        <p className="text-[.65rem] font-black uppercase tracking-[3px] text-orange-400 mb-2 font-[var(--font-dm-sans)]">Testimonials</p>
        <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.4rem] font-black text-white mb-10">What Travellers Say</h2>

        <div className="relative min-h-[200px]">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={`absolute inset-0 transition-all duration-500 ${i === active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <div className="flex justify-center gap-1 mb-5">
                {[1,2,3,4,5].map(s => (
                  <i key={s} className="fa-solid fa-star text-orange-400 text-[.9rem]" />
                ))}
              </div>
              <p className="font-[var(--font-playfair)] italic text-white/90 text-[1.25rem] md:text-[1.4rem] leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-poppins font-bold text-white text-[.9rem]">{t.name}</p>
              <p className="font-[var(--font-dm-sans)] text-white/50 text-[.78rem]">{t.location}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 ${i === active ? 'bg-orange-500 w-8 h-3' : 'bg-white/25 hover:bg-white/50 w-3 h-3'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
