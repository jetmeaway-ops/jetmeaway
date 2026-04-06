export const runtime = 'edge';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy | JetMeAway',
  description: 'How JetMeAway handles your data. UK GDPR compliant privacy policy.',
};

export default function Privacy() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">🔒 <span className="text-[#0066FF]">Privacy</span> Policy</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">Your privacy matters. Here&apos;s how we handle your information.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: March 2026</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">
          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. Who We Are</h2>
          <p>Jetmeaway (jetmeaway.co.uk) is a travel comparison website operated from the United Kingdom. Contact: <a href="mailto:waqar@jetmeaway.co.uk" className="text-[#0066FF] font-bold">waqar@jetmeaway.co.uk</a>.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. What We Collect</h2>
          <ul className="list-disc ml-5 space-y-1"><li><strong>Email address</strong> — if you sign up for price alerts or contact us.</li><li><strong>Usage data</strong> — pages visited, searches made, links clicked via cookies.</li><li><strong>Device info</strong> — browser type, OS, screen resolution.</li></ul>
          <p>We do not collect payment information. All bookings are completed on our partners&apos; websites.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. How We Use Your Data</h2>
          <ul className="list-disc ml-5 space-y-1"><li>Provide and improve our comparison service.</li><li>Send price drop alerts (if opted in).</li><li>Respond to enquiries.</li><li>Understand site usage.</li><li>Comply with legal obligations.</li></ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. Cookies &amp; Affiliate Tracking</h2>
          <p>We use cookies for affiliate tracking. Partners include Expedia (Partnerize), Travelpayouts, Trip.com, and others. This never affects your price.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">5. Your Rights (UK GDPR)</h2>
          <ul className="list-disc ml-5 space-y-1"><li>Access your personal data.</li><li>Request correction or deletion.</li><li>Object to or restrict processing.</li><li>Withdraw consent at any time.</li></ul>
          <p>To exercise these rights, email <a href="mailto:waqar@jetmeaway.co.uk" className="text-[#0066FF] font-bold">waqar@jetmeaway.co.uk</a>.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">6. Data Security</h2>
          <p>We take appropriate measures to protect your data. However, no internet transmission is completely secure.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">7. Contact</h2>
          <p>Questions? Email <a href="mailto:waqar@jetmeaway.co.uk" className="text-[#0066FF] font-bold">waqar@jetmeaway.co.uk</a> or visit our <a href="/contact" className="text-[#0066FF] font-bold">contact page</a>.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
