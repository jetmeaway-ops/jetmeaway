import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Refund Policy | JetMeAway',
  description: 'JetMeAway refund policy for flights, hotels, and eSIMs. Understand your rights and how refunds are processed.',
};

export default function RefundPolicy() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">💷 <span className="text-[#0066FF]">Refund</span> Policy</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">Your rights and how refunds work when you book through JetMeAway.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: April 2026</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. Our Role as a Personal Scout</h2>
          <p>JetMeAway Ltd acts as an intermediary agent. When you book travel services (flights, hotels, eSIMs), your contract is with the Service Provider (e.g., the airline or hotel). We provide the technology and &ldquo;Scout&rdquo; intelligence to facilitate this connection.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. Flight Refunds</h2>
          <p className="font-bold text-[#1A1D2B] mt-3">Involuntary Cancellations</p>
          <p>If an airline cancels your flight, you are entitled to a full refund or re-routing under UK261/EU261 regulations. JetMeAway will assist in processing this refund from the airline to you.</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Voluntary Cancellations</p>
          <p>If you choose to cancel your flight, the refund amount is determined solely by the airline&apos;s fare rules (e.g., &ldquo;Non-Refundable&rdquo; vs &ldquo;Flexible&rdquo;).</p>
          <p className="font-bold text-[#1A1D2B] mt-3">Processing Fee</p>
          <p>JetMeAway may charge a non-refundable administration fee of <strong>£25 per person</strong> to process voluntary cancellation or change requests, in addition to any airline penalties.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. Hotel Refunds</h2>
          <p>Refund eligibility depends on the specific rate selected at the time of booking (e.g., &ldquo;Free Cancellation&rdquo; vs &ldquo;Non-Refundable&rdquo;). This is clearly displayed before you complete your booking.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. eSIM Refunds</h2>
          <p>Due to the nature of digital products, eSIMs are generally non-refundable once the QR code has been generated or the data plan has been activated, unless the service is technically faulty.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">5. Refund Timelines</h2>
          <p>Once an airline or provider approves a refund, it typically takes <strong>7&ndash;14 business days</strong> to appear in your account. Since we use a &ldquo;Guest Direct&rdquo; payment model, the refund is usually issued directly by the provider or through our payment processor back to your original payment method.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">6. Statutory Rights</h2>
          <p>Nothing in this policy affects your statutory rights under the <strong>Consumer Rights Act 2015</strong> or the <strong>Package Travel and Linked Travel Arrangements Regulations 2018</strong> (where applicable).</p>

          <div className="mt-8 pt-6 border-t border-[#F1F3F7]">
            <p className="text-[.78rem] text-[#8E95A9]">
              For refund enquiries, contact us at <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a> or call <a href="tel:+441174630606" className="text-[#0066FF] font-bold">0117 463 0606</a>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
