import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSchema } from '@/lib/page-schema';

export const metadata = {
  title: '£5 Cashback on 2nd App Booking — Terms | JetMeAway',
  description:
    'Promotion terms for the £5 cashback offer on your 2nd hotel booking made via the JetMeAway iOS or Android app. Eligibility, exclusions and how the cashback is paid.',
  alternates: {
    canonical: 'https://jetmeaway.co.uk/terms/promo-second-booking',
  },
};

export default function PromoSecondBookingTerms() {
  return (
    <>
      <PageSchema
        crumbs={[
          { name: 'Terms', path: '/terms' },
          { name: '£5 Cashback Promo', path: '/terms/promo-second-booking' },
        ]}
      />
      <Header />

      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">
          🎉 <span className="text-[#0066FF]">£5 Cashback</span> Promo Terms
        </h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[560px] mx-auto">
          Plain-English terms for the £5 cashback offer on your 2nd hotel
          booking made via the JetMeAway iOS or Android app.
        </p>
        <p className="text-[.72rem] text-[#8E95A9] mt-2">Last updated: May 2026</p>
      </section>

      <div className="max-w-[760px] mx-auto px-5 pb-16">
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8 text-[.85rem] text-[#5C6378] leading-relaxed space-y-1">

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-0">
            1. The offer
          </h2>
          <p>
            We&rsquo;ll send you <strong>£5 cashback</strong> after your 2nd
            hotel booking with JetMeAway, when that booking is made through
            our <strong>iOS or Android app</strong>. The cashback is paid back
            to the same card you used for the booking, within{' '}
            <strong>7 working days</strong> of the booking being confirmed.
            One cashback per customer, ever.
          </p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">
            2. Who&rsquo;s eligible
          </h2>
          <p>You qualify when all of the following are true:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>You are signed in to your JetMeAway account when you book.</li>
            <li>
              You have at least one previous JetMeAway hotel booking that
              reached <strong>confirmed</strong> status (not cancelled,
              not failed).
            </li>
            <li>
              You make this booking inside the <strong>JetMeAway iOS or
              Android app</strong>. Bookings made via a regular web browser
              don&rsquo;t qualify.
            </li>
            <li>
              The booking total is <strong>£50 or more</strong> (excluding
              taxes payable at the property).
            </li>
            <li>
              You haven&rsquo;t already redeemed this promo on a previous
              booking.
            </li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">
            3. What&rsquo;s not covered
          </h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              <strong>Flights, packages, car hire, activities, eSIMs and
              travel insurance</strong> — the promo is hotel-only.
            </li>
            <li>
              <strong>Some hotel inventory.</strong> A small subset of hotel
              rooms is fulfilled by suppliers whose payment system doesn&rsquo;t
              support the cashback flow today; if your booking happens to land
              on one of those, the cashback line won&rsquo;t appear at checkout
              and the promo won&rsquo;t apply. We&rsquo;re working on extending
              coverage.
            </li>
            <li>
              <strong>Combined offers.</strong> The cashback can&rsquo;t be
              combined with any other JetMeAway promotion or partner discount
              code.
            </li>
            <li>
              <strong>Bookings made by third parties on your behalf</strong>{' '}
              (e.g. a travel agent, a corporate booker) — the cashback goes
              to the cardholder of the original payment.
            </li>
          </ul>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">
            4. How the cashback is paid
          </h2>
          <p>
            We send the £5 back to the card you used for the booking, by
            partial refund through the same payment processor that took your
            payment. Most banks reflect the refund on your statement within
            5&ndash;10 business days. We&rsquo;ll confirm the refund by email
            once it&rsquo;s been issued. We don&rsquo;t need your bank
            details &mdash; the refund routes back automatically.
          </p>
          <p>
            If your card has been cancelled or replaced between the booking
            and the refund, your bank usually still routes the refund to your
            new card or your account. If they can&rsquo;t, contact us at{' '}
            <a
              href="mailto:contact@jetmeaway.co.uk"
              className="text-[#0066FF] font-bold"
            >
              contact@jetmeaway.co.uk
            </a>{' '}
            with your booking reference and we&rsquo;ll sort an alternative
            payout.
          </p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">
            5. If you cancel the discounted booking
          </h2>
          <p>
            If you cancel the 2nd booking before the cashback has been issued
            (within the supplier&rsquo;s free-cancel window where applicable),
            the cashback is <strong>not</strong> sent — you&rsquo;re still
            eligible to redeem it on a future qualifying booking, since the
            offer wasn&rsquo;t actually consumed.
          </p>
          <p>
            If you cancel after the cashback has already been issued, the
            cashback isn&rsquo;t reclaimed. Any refund of the original booking
            follows the supplier&rsquo;s own cancellation rules and our{' '}
            <a href="/refund" className="text-[#0066FF] font-bold">
              Refund Policy
            </a>
            .
          </p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">
            6. Fraud, abuse and rule-changes
          </h2>
          <p>
            We reserve the right to refuse the cashback, claw it back, or
            close the related account if we reasonably suspect fraud, abuse,
            multiple-account stacking, or behaviour designed to circumvent
            these rules. We can amend or withdraw the offer at any time
            without notice; existing eligible bookings made before any
            withdrawal will still be honoured.
          </p>

          <h2 className="font-poppins text-[.95rem] font-bold text-[#0066FF] mt-5">
            7. The fine print
          </h2>
          <p>
            This promotion is run by <strong>JETMEAWAY LTD</strong>, registered
            in England and Wales (company number <strong>17140522</strong>),
            66 Paul Street, London. Our main{' '}
            <a href="/terms" className="text-[#0066FF] font-bold">
              Terms &amp; Conditions
            </a>{' '}
            apply to anything not covered here, including the booking itself
            and any underlying travel-provider conditions.
          </p>
          <p>
            Promo code reference: <code>APP_2ND_5OFF</code>.
          </p>

        </div>
      </div>

      <Footer />
    </>
  );
}
