import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Financial Protection | JetMeAway',
  description: 'How your bookings are financially protected when you book through JetMeAway. ATOL protection, payment security, and your rights.',
};

export default function FinancialProtection() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5"><span className="text-[#0066FF]">Financial</span> Protection</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">How your travel bookings are protected when you book through JetMeAway.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: April 2026</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. Our Role</h2>
          <p>JETMEAWAY LTD acts as a technology platform and an agent for various travel providers. We connect you with trusted, licensed providers to find the best deals.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. Hotels &amp; eSIMs</h2>
          <p>Standalone accommodation and eSIM services are provided directly by JETMEAWAY LTD and are not subject to ATOL protection. Hotel bookings are processed through our licensed payment partners with full PCI-DSS compliance.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. Flights &amp; Packages</h2>
          <p>Flight-inclusive packages discovered on this website are fulfilled by our ATOL-protected partners, including <strong>Expedia (ATOL 5788)</strong> and <strong>Trip.com (ATOL 11572)</strong>.</p>
          <p className="mt-3">JETMEAWAY LTD does not create its own packages; we provide a &ldquo;Personal Scout&rdquo; service that connects you to fully licensed and bonded ATOL holders.</p>
          <p className="mt-3">Your air travel and package holidays are financially protected under the <strong>ATOL scheme</strong> administered by the UK Civil Aviation Authority.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. Package Travel Regulations</h2>
          <p>Bookings for separate travel services on this website do not constitute a &ldquo;Package Holiday&rdquo; or a &ldquo;Linked Travel Arrangement&rdquo; under the UK Package Travel Regulations 2018 unless explicitly stated at the time of booking.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">5. Payment Security</h2>
          <p>All payments are processed securely through PCI-DSS Level 1 compliant payment processors. We never store your full card details on our servers.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">6. Booking Support</h2>
          <p>If you have any concerns about your booking or financial protection, our support team is available 24/7 for customers with an active booking.</p>

          <div className="mt-8 pt-6 border-t border-[#F1F3F7]">
            <p className="text-[.78rem] text-[#8E95A9]">
              For booking support, call <a href="tel:+448006526699" className="text-[#0066FF] font-bold">0800 652 6699</a> (free from UK) or email <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
