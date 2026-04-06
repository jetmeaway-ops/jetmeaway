'use client';

import { useEffect, useState } from 'react';

export default function PhoneMockup() {
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.008;
      setRotateY(Math.sin(t) * 12);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isHovered]);

  return (
    <div
      className="relative w-[260px] h-[520px] mx-auto"
      style={{ perspective: '1200px' }}
      onMouseEnter={() => { setIsHovered(true); setRotateY(0); }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow behind phone */}
      <div className="absolute inset-0 -z-10 blur-[60px] opacity-40 bg-gradient-to-br from-[#0066FF] to-[#7C3AED] rounded-full scale-75" />

      {/* Phone body */}
      <div
        className="w-full h-full rounded-[40px] bg-[#1A1D2B] p-[6px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)] transition-transform duration-300"
        style={{
          transform: `rotateY(${rotateY}deg) rotateX(2deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Screen bezel */}
        <div className="w-full h-full rounded-[34px] bg-white overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-[#1A1D2B] rounded-b-[14px] z-20" />

          {/* Status bar */}
          <div className="h-[44px] bg-[#F8FAFC] flex items-end justify-between px-6 pb-1 relative z-10">
            <span className="text-[9px] font-bold text-[#1A1D2B]">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-[14px] h-[8px] border border-[#1A1D2B] rounded-[2px] relative">
                <div className="absolute inset-[1px] right-[2px] bg-[#34C759] rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* App content */}
          <div className="px-4 pt-2 pb-4 bg-[#F8FAFC] h-[calc(100%-44px)] overflow-hidden">
            {/* Hero area */}
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-[18px] animate-bounce" style={{ animationDuration: '3s' }}>✈️</span>
                <span className="text-[22px]">🌍</span>
              </div>
              <p className="font-poppins font-black text-[11px] text-[#1A1D2B] leading-tight">
                Travel <em className="text-[#0066FF] italic">Intelligently.</em>
              </p>
              <p className="text-[7px] text-[#8E95A9] mt-0.5">Comparing 20+ providers in real-time</p>
            </div>

            {/* Category grid */}
            <p className="font-poppins font-bold text-[8px] text-[#1A1D2B] mb-1.5">What are you looking for?</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {[
                { icon: '✈️', name: 'Flights', color: '#0066FF' },
                { icon: '🏨', name: 'Hotels', color: '#FF6B00' },
                { icon: '📦', name: 'Packages', color: '#7C3AED' },
                { icon: '🚗', name: 'Car Hire', color: '#059669' },
                { icon: '📱', name: 'eSIM', color: '#DC2626' },
                { icon: '🧭', name: 'Explore', color: '#0891B2' },
              ].map((cat) => (
                <div key={cat.name} className="bg-white rounded-lg p-2 flex flex-col items-center shadow-sm">
                  <div
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center mb-1 text-[11px]"
                    style={{ backgroundColor: cat.color + '15' }}
                  >
                    {cat.icon}
                  </div>
                  <span className="font-poppins font-semibold text-[7px] text-[#1A1D2B]">{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Trust bar */}
            <div className="flex justify-around">
              {[
                { icon: '🛡️', text: 'No hidden fees' },
                { icon: '💰', text: 'Real prices' },
                { icon: '🤝', text: '21+ providers' },
              ].map((t) => (
                <div key={t.text} className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px]">{t.icon}</span>
                  <span className="font-poppins font-semibold text-[6px] text-[#8E95A9]">{t.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tab bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[42px] bg-white border-t border-[#F1F3F7] flex items-center justify-around px-2">
            {[
              { icon: 'fa-house', label: 'Home', active: true },
              { icon: 'fa-plane', label: 'Flights' },
              { icon: 'fa-hotel', label: 'Hotels' },
              { icon: 'fa-cube', label: 'Packages' },
              { icon: 'fa-car', label: 'Cars' },
              { icon: 'fa-ellipsis', label: 'More' },
            ].map((tab) => (
              <div key={tab.label} className="flex flex-col items-center gap-0.5">
                <i className={`fa-solid ${tab.icon} text-[9px] ${tab.active ? 'text-[#0066FF]' : 'text-[#8E95A9]'}`} />
                <span className={`text-[5px] font-semibold ${tab.active ? 'text-[#0066FF]' : 'text-[#8E95A9]'}`}>{tab.label}</span>
              </div>
            ))}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[60px] h-[3px] bg-[#1A1D2B]/20 rounded-full" />
        </div>
      </div>

      {/* Reflection */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-[30px] bg-gradient-to-b from-black/5 to-transparent blur-md rounded-full"
      />
    </div>
  );
}
