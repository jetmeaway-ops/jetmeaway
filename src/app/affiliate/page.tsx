import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Affiliate Disclosure | JetMeAway',
  description: 'JetMeAway affiliate partnerships and how we earn revenue. Full transparency on our affiliate relationships.',
};

export default function AffiliateDisclosure() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5"><span className="text-[#0066FF]">Affiliate</span> Disclosure</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">How JetMeAway earns revenue and our commitment to transparency.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: April 2026</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. How We Earn Revenue</h2>
          <p>JetMeAway is a free comparison service. We earn affiliate commissions when you click through our links and complete a booking on a partner&apos;s website. This means <strong>you never pay extra</strong> &mdash; the provider pays us a small referral fee from their own margin.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. Our Affiliate Partners</h2>
          <p>JetMeAway participates in the following affiliate programmes and partnerships:</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Travel Aggregators</p>
          <p>Expedia Affiliate Program (via Partnerize), Travelpayouts Network (powering Aviasales and Hotellook integrations), and Trip.com Alliance Partner Programme.</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Hotels</p>
          <p>Nuitee (LiteAPI) for direct hotel inventory, plus comparison links to Booking.com, Expedia, Trip.com, Hotels.com, Agoda, and Trivago.</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Tours &amp; Activities</p>
          <p>GetYourGuide, Viator, and Klook.</p>
          <p className="font-bold text-[#1A1D2B] mt-3">eSIM &amp; Connectivity</p>
          <p>Airalo and Yesim (via Travelpayouts).</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Travel Insurance</p>
          <p>Ekta Traveling (via Travelpayouts).</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Car Hire</p>
          <p>Economy Bookings, Localrent, Qeeq, and GetRentaCar.</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Transfers</p>
          <p>KiwiTaxi, Welcome Pickups, and GetTransfer.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. Editorial Independence</h2>
          <p>Our affiliate relationships do not influence how we rank or display results. Providers are sorted by price, relevance, or user preference &mdash; never by commission rate. We show you the cheapest option first, regardless of which partner it comes from.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. No Booking Fees</h2>
          <p>JetMeAway does not charge booking fees, service fees, or markups of any kind. The price you see is the price you pay on the partner&apos;s website.</p>

          <div className="mt-8 pt-6 border-t border-[#F1F3F7]">
            <p className="text-[.78rem] text-[#8E95A9]">
              Questions about our affiliate programme? Contact us at <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
