import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms & Conditions | JetMeAway',
  description: 'Terms of service and affiliate disclosure for JetMeAway travel comparison platform.',
};

export default function Terms() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">📋 <span className="text-[#0066FF]">Terms</span> &amp; Conditions</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">Please read these terms before using Jetmeaway.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: March 2026</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">
          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. Introduction</h2>
          <p>These terms govern your use of JETMEAWAY LTD (Company No: 17140522, jetmeaway.co.uk), registered at 66 Paul Street, London. By using our website, you accept these terms.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. What Jetmeaway Does</h2>
          <p>Jetmeaway is a travel comparison website. We display prices from third-party providers. We are not a travel agent, tour operator, or booking provider. When you click a deal, you are redirected to the provider&apos;s website.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. Affiliate Disclosure</h2>
          <p>We participate in affiliate programmes with Expedia (Partnerize), Travelpayouts, Trip.com, GetYourGuide, Viator, Klook, Tiqets, Airalo, Yesim, Ekta Traveling, Economy Bookings, Localrent, Qeeq, GetRentaCar, KiwiTaxi, Welcome Pickups, GetTransfer, AirHelp, Compensair, WeGoTrip, and Aviasales. We earn commission at no extra cost to you.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. Accuracy</h2>
          <p>Prices change rapidly and we cannot guarantee accuracy. The final price is always determined by the provider.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">5. Bookings &amp; Contracts</h2>
          <p>Any booking is a contract between you and the travel provider — not JETMEAWAY LTD. Contact the provider directly for any issues.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">6. Limitation of Liability</h2>
          <p>Jetmeaway is provided &quot;as is.&quot; We exclude all liability for loss or damage to the fullest extent permitted by law.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">7. Governing Law</h2>
          <p>These terms are governed by the laws of England and Wales.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">8. Contact</h2>
          <p>Questions? Email <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a> or visit our <a href="/contact" className="text-[#0066FF] font-bold">contact page</a>.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
