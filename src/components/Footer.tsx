import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0F1119] pt-14 pb-7 px-5 mt-12">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-9 mb-10">
          <div>
            <img src="/jetmeaway-logo.png" alt="Jetmeaway" className="h-7 brightness-0 invert mb-2.5" />
            <p className="text-[.75rem] text-white/25 leading-relaxed font-semibold">Your AI-powered travel scout. Compare flights, hotels, packages &amp; more from 21 trusted providers.</p>
          </div>
          <div>
            <h4 className="font-[Poppins] text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Compare</h4>
            <Link href="/flights" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">✈ Flights</Link>
            <Link href="/hotels" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">🏨 Hotels</Link>
            <Link href="/packages" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">📦 Packages</Link>
            <Link href="/cars" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">🚗 Car Hire</Link>
            <Link href="/insurance" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">🛡 Insurance</Link>
            <Link href="/esim" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">📱 eSIM Plans</Link>
          </div>
          <div>
            <h4 className="font-[Poppins] text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Company</h4>
            <Link href="/about" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">About</Link>
            <Link href="/privacy" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="block text-[.75rem] text-white/25 font-semibold mb-2.5 transition-colors hover:text-white">Contact Us</Link>
          </div>
          <div>
            <h4 className="font-[Poppins] text-[.62rem] font-extrabold uppercase tracking-[2.5px] text-white mb-4">Deal Alerts</h4>
            <div className="flex rounded-md overflow-hidden">
              <input type="email" placeholder="Your email" className="flex-1 bg-white/[.06] border-none py-3 px-3.5 font-[Nunito] text-[.78rem] text-white outline-none placeholder:text-white/15" />
              <button className="bg-[#0066FF] text-white border-none py-3 px-4.5 font-[Poppins] text-[.7rem] font-bold cursor-pointer">Join</button>
            </div>
            <p className="text-[.68rem] mt-2 text-white/15">Get deal alerts and flash sales to your inbox.</p>
          </div>
        </div>
        <div className="h-px bg-white/[.06] mb-7"></div>
        <div className="max-w-[800px] mb-7">
          <div className="text-[.55rem] uppercase tracking-[2.5px] font-extrabold text-white/20 mb-1.5">Affiliate Disclosure</div>
          <p className="text-[.68rem] text-white/[.12] leading-relaxed font-semibold">Jetmeaway participates in the Expedia Affiliate Program (Partnerize), Travelpayouts Network, CJ Affiliate Network, and works with Booking.com, GetYourGuide, Viator, Klook, Tiqets, Airalo, Yesim, Ekta Traveling, Economy Bookings, Localrent, Qeeq, GetRentaCar, KiwiTaxi, Welcome Pickups, GetTransfer, AirHelp, Compensair, WeGoTrip, Aviasales, and Trip.com. We may receive compensation when you book through our links at no additional cost to you.</p>
        </div>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <p className="text-[.6rem] text-white/10">© 2026 Jetmeaway (jetmeaway.co.uk). All rights reserved.</p>
          <div className="flex gap-4 opacity-[.12] hover:opacity-30 transition-opacity">
            {['Expedia','Booking.com','Airalo','Klook','Trip.com','Aviasales'].map(p => (
              <span key={p} className="font-[Poppins] font-extrabold text-[.65rem] text-white uppercase tracking-wider">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
