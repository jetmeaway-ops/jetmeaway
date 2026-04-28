import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSchema } from '@/lib/page-schema';

export const metadata = {
  title: 'Privacy Policy | JetMeAway',
  description: 'How JetMeAway collects, uses, shares and protects your personal data. UK GDPR and Data Protection Act 2018 compliant.',
};

export default function Privacy() {
  return (
    <>
      <PageSchema crumbs={[{ name: 'Privacy', path: '/privacy' }]} />
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">🔒 <span className="text-[#0066FF]">Privacy</span> Policy</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">Your privacy matters. This policy explains what data we collect, how we use it, who we share it with, and what rights you have.</p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: April 2026</p>
      </section>

      <div className="max-w-[760px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">1. Who We Are &amp; Our Role</h2>
          <p><strong>JETMEAWAY LTD</strong> (Company No: 17140522, ICO Reg: ZC125217), registered at 66 Paul Street, London, United Kingdom (&ldquo;<strong>Jetmeaway</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;) is the <strong>data controller</strong> for personal data processed through <strong>jetmeaway.co.uk</strong> and the JetMeAway mobile application (together, the &ldquo;<strong>Platform</strong>&rdquo;). You can contact us at <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a> or <a href="tel:+448006526699" className="text-[#0066FF] font-bold">0800 652 6699</a>. For data-protection enquiries specifically, please write &ldquo;Data Protection&rdquo; in the subject line.</p>
          <p>For bookings you complete on a third-party site after clicking through from the Platform (&ldquo;<strong>Referral Bookings</strong>&rdquo;), that third party is the controller of the data you give them. For bookings you complete inside our checkout (&ldquo;<strong>Direct Bookings</strong>&rdquo;), we share the data needed to fulfil the booking with the Travel Provider or Wholesaler, and each of them is an independent controller of the data they receive.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">2. What Personal Data We Collect</h2>

          <p className="font-bold text-[#1A1D2B] mt-3">a. Browsing &amp; enquiries (everyone who visits)</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Usage data</strong> — pages visited, searches run, links clicked, referral source.</li>
            <li><strong>Device &amp; technical data</strong> — IP address, browser type, operating system, device type, screen resolution, language, approximate location derived from IP.</li>
            <li><strong>Cookies &amp; similar technologies</strong> — see section 10.</li>
          </ul>

          <p className="font-bold text-[#1A1D2B] mt-3">b. Account &amp; enquiries</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Email address, name, phone</strong> — if you sign up for price alerts, the newsletter, or contact us.</li>
            <li><strong>Communication content</strong> — messages you send us by email, contact form, SMS or on social media.</li>
          </ul>

          <p className="font-bold text-[#1A1D2B] mt-3">c. Direct Bookings (flights &amp; hotels booked through our checkout)</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Passenger &amp; lead-guest details</strong> — title, full name, date of birth, gender where required, nationality, passport or travel-document number and expiry, frequent-flyer number, contact email and phone. Where a Travel Provider requires additional information (e.g. redress number, known-traveller number, meal preference) we collect that too.</li>
            <li><strong>Payment data</strong> — your card details are entered directly into a secure payment field hosted by <strong>Stripe Payments Europe, Ltd.</strong>, our PCI-DSS Level 1 certified payment processor. Jetmeaway <em>never sees, stores or transmits</em> your full card number or CVC. We retain only the Stripe PaymentIntent reference, billing name, billing email, the last four digits and brand of the card, and the amount and currency charged. This is the minimum we need to identify the transaction, process refunds, and respond to chargebacks.</li>
            <li><strong>Booking record</strong> — booking reference, itinerary, dates, room type / fare class, price paid, supplier confirmation code, booking status.</li>
            <li><strong>Special requirements</strong> — if you tell us about a dietary need, mobility requirement or medical condition relevant to your travel, this constitutes <em>special-category data</em> under UK GDPR and we will process it only with your explicit consent for the purpose of arranging the booking.</li>
          </ul>

          <p className="font-bold text-[#1A1D2B] mt-3">d. User-generated content</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Any reviews, photos, ratings or comments you voluntarily submit to the Platform.</li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">3. How We Use Your Personal Data (Purposes)</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>To operate, maintain and improve the Platform and the comparison service.</li>
            <li>To take and fulfil bookings — including passing your details to the Travel Provider, Wholesaler and payment processor needed to issue and honour the booking.</li>
            <li>To process payments, issue refunds, and manage chargebacks and fraud prevention.</li>
            <li>To send transactional messages (booking confirmations, itinerary changes, cancellation and refund notifications, check-in reminders).</li>
            <li>To send marketing and price-alert messages where you have opted in, and to personalise content based on your previous searches. You can opt out at any time.</li>
            <li>To respond to enquiries, complaints and customer-service requests.</li>
            <li>To meet our legal and regulatory obligations (accounting, tax, anti-money-laundering, sanctions screening, law-enforcement requests).</li>
            <li>To detect, investigate and prevent fraudulent or unlawful activity and to secure our systems.</li>
            <li>To analyse usage of the Platform (aggregated and anonymised where possible) so we can improve it.</li>
            <li>To manage business reorganisations, mergers, acquisitions and similar corporate events.</li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">4. Lawful Bases for Processing</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Performance of a contract</strong> — to take and fulfil your booking, take payment, and issue refunds.</li>
            <li><strong>Legitimate interests</strong> — to operate and improve the Platform, prevent fraud, secure our systems, and analyse usage. We have assessed that these interests are not overridden by your rights.</li>
            <li><strong>Legal obligation</strong> — to meet accounting, tax, regulatory and law-enforcement requirements.</li>
            <li><strong>Consent</strong> — for marketing communications, non-essential cookies, and the processing of special-category data (e.g. a disclosed medical condition). You may withdraw consent at any time without affecting processing that has already taken place.</li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">5. Who We Share Your Data With</h2>
          <p>We share personal data only with the categories of recipient listed below, and only to the extent needed.</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Travel Providers</strong> — airlines, hotels, car-hire companies, tour operators, activity operators, insurers, eSIM providers. They receive the traveller information needed to deliver the booked service and become independent controllers of that data.</li>
            <li><strong>Wholesalers &amp; aggregators</strong> — including LiteAPI/Nuitee, DOTW (Webbeds FZ-LLC), Duffel, Travelpayouts, RateHawk, Hotellook, and similar partners whose APIs source or fulfil the inventory.</li>
            <li><strong>Payment processor</strong> — <strong>Stripe Payments Europe, Ltd.</strong> for card processing, refunds and chargebacks.</li>
            <li><strong>Hosting &amp; infrastructure</strong> — <strong>Vercel Inc.</strong> (hosting and edge compute) and <strong>Vercel KV / Upstash Redis</strong> (short-term booking state, subscriber lists). <strong>Google Cloud / Anthropic</strong> where AI-assistant features are used.</li>
            <li><strong>Email, SMS &amp; voice providers</strong> — including <strong>Twilio</strong> for SMS and voice, and our transactional-email provider for booking notifications and alerts.</li>
            <li><strong>Analytics &amp; performance</strong> — privacy-respecting analytics and error-reporting tools used to understand and improve the Platform.</li>
            <li><strong>Professional advisers</strong> — accountants, auditors, lawyers and insurers where reasonably necessary.</li>
            <li><strong>Law enforcement and regulators</strong> — where we are required by law or a valid legal request.</li>
            <li><strong>Successors in interest</strong> — in the event of a merger, acquisition, restructuring or sale of part of our business, personal data may be transferred to the buyer.</li>
          </ul>
          <p className="mt-2"><strong>We do not sell your personal data.</strong> We do not sell, rent or trade your search history, booking intent or contact details to hotels, advertising networks or data brokers.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">6. International Transfers</h2>
          <p>Some of our Travel Providers, Wholesalers and service providers are based outside the United Kingdom and the European Economic Area (for example DOTW/Webbeds is based in the UAE, and US-based hotels and aggregators operate from the United States). When we transfer personal data outside the UK we rely on one of the following safeguards:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>An &ldquo;adequacy decision&rdquo; issued by the UK government or the European Commission.</li>
            <li>The UK International Data Transfer Agreement (IDTA) or the EU Standard Contractual Clauses with the UK addendum.</li>
            <li>Where the transfer is necessary to perform the contract with you (for example transferring your passport details to the airline so you can fly), the specific derogation under UK GDPR Article 49(1)(b).</li>
          </ul>
          <p className="mt-2">You can request a copy of the safeguards we rely on by contacting us at <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">7. How Long We Keep Your Data (Retention)</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Booking and payment records</strong> — up to <strong>seven years</strong> after the booking date, to meet HMRC, tax, accounting and anti-fraud record-keeping obligations.</li>
            <li><strong>Account data</strong> — for as long as your account is active, plus up to two years after deletion for dispute-resolution and audit purposes.</li>
            <li><strong>Marketing-subscriber data</strong> — until you unsubscribe, plus a short suppression record so we can honour your opt-out.</li>
            <li><strong>Support correspondence</strong> — up to three years from the last contact.</li>
            <li><strong>Analytics and browsing data</strong> — typically up to 26 months in identifiable form, after which it is aggregated or deleted.</li>
            <li><strong>Cookies</strong> — see section 10.</li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">8. Data Security</h2>
          <p>We use appropriate technical and organisational measures to protect your data, including TLS encryption in transit, encryption at rest for booking records, strict role-based access controls, secrets management, regular patching, and PCI-DSS Level 1 certified payment processing via Stripe. We review our security posture regularly. No online service is completely secure; please use a strong, unique password and tell us immediately if you suspect unauthorised access.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">9. Your Rights Under UK GDPR and the Data Protection Act 2018</h2>
          <p>You have the right to:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li><strong>Access</strong> the personal data we hold about you.</li>
            <li><strong>Rectification</strong> — ask us to correct inaccurate or incomplete data.</li>
            <li><strong>Erasure</strong> — ask us to delete your data where one of the grounds in Article 17 applies. Note that we may be legally required to retain booking and payment records for up to seven years.</li>
            <li><strong>Restriction</strong> of processing in certain circumstances.</li>
            <li><strong>Data portability</strong> — receive your data in a structured, machine-readable format and transfer it to another controller.</li>
            <li><strong>Object</strong> to processing based on legitimate interests or for direct marketing.</li>
            <li><strong>Withdraw consent</strong> at any time where processing is based on consent.</li>
            <li><strong>Not be subject to fully automated decisions</strong> that produce legal or similarly significant effects on you (we do not currently make any such decisions).</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, email <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>. We will respond within one calendar month and may ask you to verify your identity. There is normally no charge.</p>
          <p>If you believe we have not complied with your rights, you may complain to the UK Information Commissioner&apos;s Office at <strong>ico.org.uk</strong> or 0303 123 1113. Our ICO registration reference is <strong>ZC125217</strong>. We would prefer the chance to resolve your concern first.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">10. Cookies &amp; Similar Technologies</h2>
          <p>We use cookies and similar technologies to make the Platform work, to remember your search preferences, to measure performance, and for affiliate tracking when you click through to a partner. Essential cookies do not require consent. Non-essential analytics, personalisation and affiliate-tracking cookies are placed only with your consent, which you give or withdraw through the cookie banner.</p>
          <p>Affiliate cookies are set by partners including Expedia (Partnerize), Travelpayouts, Trip.com and others when you click a partner link. They allow us to be credited for the referral; they do not increase the price you pay.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">11. Marketing Communications</h2>
          <p>We only send marketing emails, SMS or push notifications where you have opted in, or where you have previously booked a similar service and have not opted out (&ldquo;soft opt-in&rdquo; under PECR). Every marketing message includes a one-click unsubscribe link, and you can opt out at any time by emailing <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">12. Automated Decision-Making &amp; Profiling</h2>
          <p>We use automated systems for price-alert matching, fraud scoring, and to rank search results. None of these produce legal or similarly significant effects on you within the meaning of Article 22 UK GDPR. You can ask for a human to review any automated decision that affects you materially by contacting us.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">13. Children</h2>
          <p>The Platform is not directed at children. We do not knowingly collect personal data from anyone under 16 as the primary user. Adults making bookings that include child travellers may provide the child&apos;s name and date of birth; this is processed under the lawful basis of contract performance to ticket the child.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">14. Third-Party Sites</h2>
          <p>The Platform links to Travel Providers and affiliate partners. Those sites have their own privacy policies, and we are not responsible for how they handle data you give them. Please review their policy before you transact with them.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">15. Changes to This Policy</h2>
          <p>We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top shows when it was last changed. Material changes will be highlighted on the Platform or by email if we have your address and consent.</p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">16. Contact</h2>
          <p>For any privacy question or to exercise any right under this policy, email <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">contact@jetmeaway.co.uk</a>, call <a href="tel:+448006526699" className="text-[#0066FF] font-bold">0800 652 6699</a>, or write to: JETMEAWAY LTD, 66 Paul Street, London, United Kingdom.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
