export const runtime = 'edge';

import FlightSearch from './search';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* 1. PROFESSIONAL NAVIGATION */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">J</div>
            <span className="text-2xl font-black tracking-tight text-slate-900">JetMeAway</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-semibold text-slate-600">
            <a href="#" className="hover:text-blue-600 transition-colors">Flights</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Personal Scout</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION (The Branding) */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-wider text-blue-700 uppercase bg-blue-50 rounded-full">
          Powered by Intelligence
        </div>
        <h1 className="text-6xl font-black text-slate-900 tracking-tight mb-6">
          Your Personal <span className="text-blue-600 italic">Travel Scout</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Cleaner, Faster, and more Private than big travel sites. JetMeAway finds your perfect trip while protecting your data.
        </p>
      </div>

      {/* 3. THE INTERACTIVE ENGINE */}
      <div className="relative z-10">
        <FlightSearch />
      </div>

      {/* 4. VALUE PROPOSITION SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6 text-xl">⚡</div>
          <h3 className="text-lg font-bold mb-2">Super Fast Model</h3>
          <p className="text-slate-500 text-sm">Built on Vercel Edge for near-instant search results word-by-word.</p>
        </div>
        <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6 text-xl">🔒</div>
          <h3 className="text-lg font-bold mb-2">Private Scouting</h3>
          <p className="text-slate-500 text-sm">We don't track you. Your searches are yours, stored securely in your Personal Scout.</p>
        </div>
        <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6 text-xl">🎯</div>
          <h3 className="text-lg font-bold mb-2">Smart History</h3>
          <p className="text-slate-500 text-sm">Automatically remembers your last 3 searches so you can jump back in.</p>
        </div>
      </div>

      {/* 5. FOOTER */}
      <footer className="bg-slate-900 py-20 text-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">J</div>
            <span className="text-lg font-bold">JetMeAway</span>
          </div>
          <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
            Making travel simpler, faster, and more private for the modern traveler.
          </p>
          <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 font-mono uppercase tracking-widest">
            Vercel KV Connected • Edge Runtime Active
          </div>
        </div>
      </footer>
    </main>
  );
}