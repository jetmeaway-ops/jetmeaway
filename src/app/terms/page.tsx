import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms & Conditions | JetMeAway',
  description: 'Terms of service, booking terms, payment terms, and affiliate disclosure for the JetMeAway travel comparison and booking platform.',
};

export default function Terms() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">📋 <span className="text-[#0066FF]">Terms</span> &amp; Conditions</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">Please read these terms carefully before using Jetmeaway. By using our website or app you agree to them.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: April 2026</p>
      </section>

      <div className="max-w-[760px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. Introduction &amp; Company Information</h2>
          <p>These terms and conditions (&ldquo;<strong>Terms</strong>&rdquo;) govern your access to and use of <strong>jetmeaway.co.uk</strong>, the JetMeAway mobile application, and any related services (collectively, the &ldquo;<strong>Platform</strong>&rdquo;). The Platform is operated by <strong>JETMEAWAY LTD</strong>, a company incorporated in England and Wales under company number <strong>17140522</strong>, with its registered office at 66 Paul Street, London, United Kingdom (&ldquo;<strong>Jetmeaway</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo; or &ldquo;<strong>our</strong>&rdquo;). You can contact us at <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a> or <a href="tel:+441174630606" className="text-[#0066FF] font-bold">0117 463 0606</a>.</p>
          <p>By accessing, browsing or placing a booking through the Platform you confirm that you have read, understood and agreed to these Terms, together with our <a href="/privacy" className="text-[#0066FF] font-bold">Privacy Policy</a>, <a href="/refund" className="text-[#0066FF] font-bold">Refund Policy</a>, and <a href="/financial-protection" className="text-[#0066FF] font-bold">Financial Protection</a> information. If you do not agree, please do not use the Platform.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. Definitions</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>&ldquo;Travel Provider&rdquo;</strong> means the airline, hotel, accommodation owner, car-hire supplier, tour operator, insurer, eSIM provider, activity operator or other third party that actually provides the travel service.</li>
            <li><strong>&ldquo;Wholesaler&rdquo;</strong> means a bed-bank, flight consolidator or API aggregator that contracts with Travel Providers on our behalf, including LiteAPI/Nuitee, DOTW (part of Webbeds FZ-LLC), Duffel, Travelpayouts, RateHawk and similar platforms.</li>
            <li><strong>&ldquo;Referral Booking&rdquo;</strong> means a booking you complete on a Travel Provider&apos;s or affiliate partner&apos;s own website after clicking through from the Platform.</li>
            <li><strong>&ldquo;Direct Booking&rdquo;</strong> means a booking you complete inside our checkout flow where Jetmeaway takes payment and issues the booking confirmation.</li>
            <li><strong>&ldquo;Booking Confirmation&rdquo;</strong> means the email or in-app confirmation issued after a booking is accepted by the Travel Provider.</li>
            <li><strong>&ldquo;Lead Passenger&rdquo;</strong> means the person who makes the booking and accepts these Terms on behalf of all travellers named in it.</li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. What Jetmeaway Does</h2>
          <p>Jetmeaway operates in two distinct ways, and the mode that applies is clearly shown at checkout:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Comparison &amp; Referral.</strong> For most flights, packages, car hire, activities, transfers, travel insurance and eSIM listings we display prices aggregated from Travel Providers and affiliate partners, and redirect you to their website to complete the booking. For Referral Bookings, the entire customer contract — including payment, confirmation, cancellation and refund — is between you and the third-party seller, and Jetmeaway is not a party to that contract.</li>
            <li><strong>Direct Bookings (Agent &amp; Merchant of Record).</strong> For selected flight and hotel inventory accessed through our Wholesalers (including LiteAPI/Nuitee, DOTW/Webbeds and Duffel), Jetmeaway acts as a <em>disclosed booking agent</em> for the underlying Travel Provider, and as the <em>merchant of record</em> for your payment. Payment is taken by Jetmeaway via our payment processor, booking confirmations are issued by Jetmeaway, and refunds (where due) are processed by Jetmeaway back to your original payment method.</li>
          </ul>
          <p className="mt-2">In both modes, the underlying travel service (the flight seat, hotel room, car hire, activity, eSIM data, insurance policy) is supplied by the Travel Provider, not by Jetmeaway. Jetmeaway does not own or operate any aircraft, hotel, vehicle, telecoms network or insurance underwriter.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. Eligibility &amp; Account</h2>
          <p>You must be at least <strong>18 years old</strong> and have the legal capacity to enter into binding contracts to use the Platform. When you make a booking you confirm that (a) you are authorised to make it on behalf of every person named in it, (b) all information you give us is accurate and complete, and (c) you are responsible for passing on booking details, requirements and updates to the other travellers.</p>
          <p>If you create an account you are responsible for keeping your login credentials confidential and for any activity under your account. You must tell us immediately if you suspect unauthorised use.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">5. Search Results, Availability &amp; Obvious Pricing Errors</h2>
          <p>Prices, availability and descriptions on the Platform are provided by Travel Providers and Wholesalers and change continuously. We take reasonable care but do not warrant that any specific price, image, description, star rating, review, map location, cancellation policy, board basis or amenity is complete, current or error-free. Reviews and ratings may be aggregated from third-party sources.</p>
          <p>If a price is clearly incorrect — for example, a price that a reasonable person would recognise as a mis-pricing — we reserve the right to refuse or cancel the booking and refund any amount paid, even after a Booking Confirmation has been issued.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">6. Bookings &amp; Formation of Contract</h2>
          <p>Your selection at checkout is an offer to book. The contract is formed only when we (for Direct Bookings) or the Travel Provider (for Referral Bookings) issue a Booking Confirmation. Until confirmation is issued, inventory and price may be withdrawn. For certain Wholesaler-sourced rates, inventory is held for a short rate-lock window (typically 3 minutes for DOTW, longer for LiteAPI); if the rate drifts materially or availability is lost during that window we will either re-price the booking with your consent or refund you in full. Our internal price-drift tolerance is £2; any larger movement triggers automatic refund.</p>
          <p>The travel contract — your right to fly, stay, drive, etc. — is always between you and the Travel Provider and is governed additionally by the Travel Provider&apos;s own conditions of carriage / hotel terms / rental conditions. Those conditions are accepted by you at the moment of booking. We recommend you read them.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">7. Payment, Currency &amp; Card Processing</h2>
          <p>For Direct Bookings, payment is taken by Jetmeaway at checkout through <strong>Stripe Payments Europe, Ltd.</strong>, a PCI-DSS Level 1 certified payment processor. Your card details are entered directly into Stripe&apos;s secure payment field — Jetmeaway never sees, processes or stores your full card number or CVC. We retain only a Stripe transaction reference (PaymentIntent ID), your billing name, email, and the last four digits and brand of your card so we can identify the payment, issue refunds, and handle chargebacks.</p>
          <p>All prices are displayed in <strong>Pounds Sterling (GBP)</strong> unless explicitly marked otherwise. If the Travel Provider&apos;s own price is in another currency, the displayed GBP price is an indicative conversion which may fluctuate between search and checkout. Your card issuer may apply foreign-transaction, FX, or cross-border fees outside of our control.</p>
          <p>For Referral Bookings, Jetmeaway does not take payment — you pay the third-party seller directly on their own site.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">8. Cancellations, Changes &amp; Refunds</h2>
          <p>Your right to cancel, change or obtain a refund is determined by the <em>fare rules</em> or <em>rate conditions</em> of the specific booking (e.g. &ldquo;Refundable&rdquo;, &ldquo;Non-refundable&rdquo;, &ldquo;Flexible&rdquo;, &ldquo;Basic&rdquo;). These rules are disclosed before you pay and are set by the Travel Provider. Jetmeaway cannot override a Travel Provider&apos;s fare rules.</p>
          <p>For Direct Bookings, cancellations and change requests are submitted through Jetmeaway: we contact the Travel Provider on your behalf and return any refund due to your original payment method, less any non-refundable supplier charges and, where permitted, a Jetmeaway administration fee (currently <strong>£25 per passenger</strong> for voluntary flight changes/cancellations, as set out in our <a href="/refund" className="text-[#0066FF] font-bold">Refund Policy</a>). Hotel cancellations follow the rate&apos;s stated cancellation policy; where a rate is marked free cancellation, no admin fee is charged.</p>
          <p>For involuntary cancellations or schedule changes made by a Travel Provider (for example an airline cancelling a flight under UK261/EU261 or a hotel closing a property), your statutory rights remain unaffected and Jetmeaway will assist you in obtaining the refund, re-routing or replacement accommodation to which you are entitled.</p>
          <p>For Referral Bookings, all cancellations and refunds are handled by the third-party seller under their own policy.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">9. No-Shows &amp; Unused Services</h2>
          <p>If you fail to check in, fail to board, or fail to use a booked service, you will generally not be entitled to a refund of any unused portion of the booking. Airline conditions of carriage often invalidate subsequent segments if an earlier segment is not flown; it is your responsibility to review the airline&apos;s rules.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">10. Travel Documents, Visas &amp; Health</h2>
          <p>It is <strong>your responsibility</strong> to ensure that you and every traveller in your booking hold a valid passport, all required visas, ESTAs or electronic travel authorisations, and any health documentation (vaccinations, health insurance, proof of entry requirements) for every country on your itinerary, including transit countries. Jetmeaway does not provide visa or immigration advice. Consult <strong>gov.uk/foreign-travel-advice</strong> and the embassy of each destination before you travel.</p>
          <p>Passport details provided at booking must match the travel document used at check-in exactly. Airlines routinely deny boarding for name mismatches, and Jetmeaway cannot obtain a refund from an airline where a passenger has been denied boarding for this reason.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">11. Travel Insurance</h2>
          <p>Comprehensive travel insurance is <strong>strongly recommended</strong> for every trip and is essential for international travel. Jetmeaway displays travel-insurance options from third-party insurers on a referral basis; any policy you buy is a contract between you and the insurer.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">12. Special Requests, Accessibility &amp; Additional Needs</h2>
          <p>Special requests (cots, adjoining rooms, dietary preferences, early check-in, wheelchair assistance, etc.) are passed to the Travel Provider but are not guaranteed unless expressly confirmed in writing. If you or any traveller has a disability, reduced mobility or other additional need, please contact us before booking so we can help identify suitable options. Airlines must be notified of assistance requirements at least 48 hours before departure under UK and EU regulations.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">13. User-Generated Content, Reviews &amp; Conduct</h2>
          <p>Where the Platform allows you to submit reviews, photos, comments or any other content, you grant Jetmeaway a worldwide, royalty-free, non-exclusive, sub-licensable licence to display, reproduce, translate and moderate that content. You warrant it is your own, lawful, accurate, and not defamatory, obscene, infringing or otherwise unlawful. We may remove any content at our sole discretion.</p>
          <p>You must not use the Platform to (a) breach any law or third-party right; (b) scrape, copy, reverse-engineer, data-mine or systematically extract any content; (c) introduce malware or attempt to gain unauthorised access; (d) impersonate another person; (e) make speculative, fraudulent or duplicate bookings; or (f) use the Platform for any commercial purpose other than a bona fide booking.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">14. Intellectual Property</h2>
          <p>All trademarks, logos, content, software, design elements, and compilations on the Platform are owned by Jetmeaway or its licensors and are protected by UK and international intellectual-property law. You may use the Platform for personal, non-commercial purposes only. You may not reproduce, adapt, publish, transmit or commercially exploit any part of the Platform without our prior written consent.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">15. Third-Party Links &amp; Affiliate Disclosure</h2>
          <p>The Platform contains links to Travel Providers and affiliate partners. For Referral Bookings, we earn an affiliate commission from partners including (but not limited to) Expedia (Partnerize), Travelpayouts, Trip.com, GetYourGuide, Viator, Klook, Airalo, Yesim, Ekta Traveling, Economy Bookings, Localrent, Qeeq, GetRentaCar, KiwiTaxi, Welcome Pickups, GetTransfer and Aviasales. Affiliate commissions are paid by the partner and do not increase the price you pay. We are not responsible for the content, privacy practices or terms of any third-party site.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">16. Financial Protection &amp; Package Travel</h2>
          <p>Separate travel services booked through Jetmeaway are not sold as a &ldquo;Package Holiday&rdquo; or &ldquo;Linked Travel Arrangement&rdquo; under the Package Travel and Linked Travel Arrangements Regulations 2018 unless expressly described as such at the point of booking. Flight-inclusive packages shown on the Platform are fulfilled by ATOL-licensed partners, including <strong>Expedia (ATOL 5788)</strong> and <strong>Trip.com (ATOL 11572)</strong>; the ATOL Certificate for any such package is issued by the fulfilling partner, not by Jetmeaway. See our <a href="/financial-protection" className="text-[#0066FF] font-bold">Financial Protection</a> page for the full position.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">17. Force Majeure</h2>
          <p>Jetmeaway is not liable for any failure or delay in performing our obligations caused by events outside our reasonable control, including but not limited to: war, civil unrest, terrorism, industrial action, extreme weather, natural disaster, fire, flood, epidemic or pandemic, government action, airspace or border closures, supplier insolvency, telecommunications or payment-processor failures, or any other event beyond our reasonable control.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">18. Limitation of Liability</h2>
          <p>Nothing in these Terms limits or excludes our liability for (a) death or personal injury caused by our negligence, (b) fraud or fraudulent misrepresentation, or (c) any other liability that cannot be limited or excluded under English law, including under the Consumer Rights Act 2015.</p>
          <p>Subject to the paragraph above and to the fullest extent permitted by law: (i) we exclude all implied terms, conditions and warranties; (ii) we are not liable for the acts or omissions of any Travel Provider, Wholesaler or payment processor; (iii) we are not liable for indirect, consequential or special losses, loss of enjoyment, loss of profit, loss of data, or pure economic loss; and (iv) our total aggregate liability arising out of or in connection with any booking is limited to the amount you paid to Jetmeaway for that booking.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">19. Indemnity</h2>
          <p>You agree to indemnify and hold Jetmeaway harmless from any claim, loss, liability or expense (including reasonable legal fees) arising from your breach of these Terms, your misuse of the Platform, or any inaccurate information you provide at booking.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">20. Complaints &amp; Dispute Resolution</h2>
          <p>We want every trip to go smoothly. If something goes wrong during travel, please raise it with the Travel Provider on the spot so they have the chance to fix it — this is usually a contractual requirement of any later claim.</p>
          <p>If you remain dissatisfied, please email <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a> within <strong>28 days</strong> of your return, setting out the issue. We aim to acknowledge within 3 working days and provide a substantive response within 28 days.</p>
          <p>If we cannot resolve your complaint you have the right, as a UK consumer, to refer the dispute to an approved Alternative Dispute Resolution provider. For data-protection complaints you may also contact the Information Commissioner&apos;s Office (<strong>ico.org.uk</strong>). Nothing in this clause affects your right to bring court proceedings.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">21. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. The version in force at the time of each booking is the version that applies to that booking. Material changes will be highlighted on the Platform. Continued use of the Platform after a change is published means you accept the revised Terms.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">22. Severability, Assignment &amp; Entire Agreement</h2>
          <p>If any part of these Terms is found to be unenforceable, the rest remain in full force. We may assign our rights and obligations to a successor entity in connection with any reorganisation, merger or sale of all or part of our business. These Terms, together with the Privacy Policy, Refund Policy and Financial Protection statement, constitute the entire agreement between you and Jetmeaway regarding the Platform, and supersede any prior agreement on the same subject.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">23. Governing Law &amp; Jurisdiction</h2>
          <p>These Terms are governed by the laws of <strong>England and Wales</strong>. Any dispute will be subject to the exclusive jurisdiction of the courts of England and Wales, save that if you are resident in Scotland or Northern Ireland you may bring proceedings in your local courts. Nothing in this clause affects your statutory rights as a consumer.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">24. Contact</h2>
          <p>Questions about these Terms? Email <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>, call <a href="tel:+441174630606" className="text-[#0066FF] font-bold">0117 463 0606</a>, or visit our <a href="/contact" className="text-[#0066FF] font-bold">contact page</a>.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
