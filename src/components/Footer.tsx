import Link from 'next/link';
import DealAlertForm from './DealAlertForm';

export default function Footer() {
  return (
    <footer className="bg-[#0F1119] pt-14 pb-7 px-5 mt-12">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-9 mb-10">
          <div>
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-7 brightness-0 invert mb-2.5" loading="lazy" />
            <p className="text-[.75rem] text-white/25 leading-relaxed font-semibold">Your AI-powered travel scout. Compare flights, hotels, packages &amp; more from 15+ trusted providers.</p>
          </div>
          <div>
            <h4 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Compare</h4>
            <Link href="/flights" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">✈ Flights</Link>
            <Link href="/hotels" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">🏨 Hotels</Link>
            <Link href="/packages" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">📦 Packages</Link>
            <Link href="/cars" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">🚗 Car Hire</Link>
            <Link href="/insurance" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">🛡 Insurance</Link>
            <Link href="/esim" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">📱 eSIM Plans</Link>
          </div>
          <div>
            <h4 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Company</h4>
            <Link href="/about" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">About</Link>
            <Link href="/privacy" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">Contact Us</Link>
          </div>
          <div>
            <h4 className="font-poppins text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Deal Alerts</h4>
            <DealAlertForm />
          </div>
        </div>
        <div className="h-px bg-white/[.06] mb-7"></div>
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/20 mb-1.5">Affiliate Disclosure</div>
          <p className="text-[.68rem] text-white/[.12] leading-relaxed font-semibold">Jetmeaway participates in the Expedia Affiliate Program (Partnerize) and Travelpayouts Network, uses Nuitee for hotel inventory, and works with GetYourGuide, Viator, Klook, Tiqets, Airalo, Yesim, Ekta Traveling, Economy Bookings, Localrent, Qeeq, GetRentaCar, KiwiTaxi, Welcome Pickups, GetTransfer, AirHelp, Compensair, WeGoTrip, Aviasales, and Trip.com. We may receive compensation when you book through our links at no additional cost to you.</p>
        </div>
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/20 mb-1.5">Financial Protection Notice</div>
          <p className="text-[.68rem] text-white/[.12] leading-relaxed font-semibold mb-2">JETMEAWAY LTD acts as a technology platform and an agent for various travel providers.</p>
          <p className="text-[.68rem] text-white/[.12] leading-relaxed font-semibold mb-2"><span className="text-white/25">Hotels &amp; eSIMs:</span> Standalone accommodation and eSIM services are provided directly by JETMEAWAY LTD and are not subject to ATOL protection.</p>
          <p className="text-[.68rem] text-white/[.12] leading-relaxed font-semibold"><span className="text-white/25">Flights &amp; Packages:</span> Flight-inclusive packages discovered on this website are fulfilled by our ATOL-protected partners, including Expedia (ATOL 5788) and Trip.com (ATOL 11572). JETMEAWAY LTD does not create its own packages; we provide a &ldquo;Personal Scout&rdquo; service that connects you to fully licensed and bonded ATOL holders. Your air travel and package holidays are financially protected under the ATOL scheme administered by the UK Civil Aviation Authority. Bookings for separate travel services on this website do not constitute a &ldquo;Package Holiday&rdquo; or a &ldquo;Linked Travel Arrangement&rdquo; under the UK Package Travel Regulations 2018 unless explicitly stated.</p>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <p className="text-[.6rem] text-white/10">© 2026 JETMEAWAY LTD (Company No: 17140522). 66 Paul Street, London. All rights reserved.</p>
          <div className="flex gap-4 opacity-[.12] hover:opacity-30 transition-opacity">
            {['Expedia','Trip.com','Aviasales','GetYourGuide','Klook','Airalo'].map(p => (
              <span key={p} className="font-poppins font-extrabold text-[.65rem] text-white uppercase tracking-wider">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
