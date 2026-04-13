import Link from 'next/link';
import DealAlertForm from './DealAlertForm';

export default function Footer() {
  return (
    <footer className="bg-[#0F1119] pt-14 pb-7 px-5 mt-12">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-9 mb-10">
          <div>
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-7 w-auto brightness-0 invert mb-2.5" loading="lazy" width={109} height={28} />
            <p className="text-[.75rem] text-white/60 leading-relaxed font-semibold">Your AI-powered travel scout. Compare flights, hotels, packages &amp; more from 15+ trusted providers.</p>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Compare</h2>
            <Link href="/flights" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">✈ Flights</Link>
            <Link href="/hotels" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">🏨 Hotels</Link>
            <Link href="/packages" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">📦 Packages</Link>
            <Link href="/cars" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">🚗 Car Hire</Link>
            <Link href="/insurance" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">🛡 Insurance</Link>
            <Link href="/esim" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">📱 eSIM Plans</Link>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Company</h2>
            <Link href="/about" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">About</Link>
            <Link href="/blog" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Blog</Link>
            <Link href="/privacy" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Terms of Service</Link>
            <Link href="/refund" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Refund Policy</Link>
            <Link href="/affiliate" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Affiliate Disclosure</Link>
            <Link href="/financial-protection" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Financial Protection</Link>
            <Link href="/contact" className="block text-[.75rem] text-white/60 font-semibold mb-2.5 transition-colors hover:text-white">Contact Us</Link>
          </div>
          <div>
            <h2 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Deal Alerts</h2>
            <DealAlertForm />
          </div>
        </div>
        <div className="h-px bg-white/[.06] mb-7"></div>
        <div className="max-w-[800px] mb-7">
          <p className="text-[.72rem] text-white/50 leading-relaxed font-semibold">We may earn commissions when you book through our links at no extra cost to you. <Link href="/affiliate" className="text-white/70 hover:text-white underline">Read our Affiliate Disclosure</Link>.</p>
        </div>
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/50 mb-1.5">Booking Support</div>
          <a href="tel:+441174630606" className="inline-block font-poppins font-bold text-[.75rem] text-[#FFD700] hover:text-white transition-colors mb-1.5">
            +44 117 463 0606
          </a>
          <p className="text-[.72rem] text-white/50 leading-relaxed font-semibold">24/7 for active bookings. Email <a href="mailto:contact@jetmeaway.co.uk" className="text-white/70 hover:text-white underline">contact@jetmeaway.co.uk</a> for other enquiries.</p>
        </div>
        <div className="max-w-[800px] mb-7">
          <p className="text-[.72rem] text-white/50 leading-relaxed font-semibold">Flight-inclusive packages are ATOL protected via Expedia (5788) &amp; Trip.com (11572). <Link href="/financial-protection" className="text-white/70 hover:text-white underline">Read our Financial Protection Notice</Link>.</p>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <p className="text-[.6rem] text-white/40">© 2026 JETMEAWAY LTD (Company No: 17140522). 66 Paul Street, EC2A 4NA, London. All rights reserved.</p>
          <div className="flex gap-4 opacity-40 hover:opacity-60 transition-opacity">
            {['Expedia','Trip.com','Aviasales','GetYourGuide','Klook','Airalo'].map(p => (
              <span key={p} className="font-poppins font-extrabold text-[.65rem] text-white uppercase tracking-wider">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
