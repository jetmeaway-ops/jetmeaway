import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'About Us | JetMeAway',
  description:
    'JetMeAway is a UK-based travel technology platform. We cut out the middleman on hotels, pass savings directly to you, and never sell your data to hotel marketing lists.',
};

export default function About() {
  return (
    <>
      <Header />

      {/* Hero — the founder's blurb, front-loaded */}
      <section className="pt-36 pb-10 px-5 text-center bg-[radial-gradient(ellipse_at_top,#EBF3FF_0%,#fff_55%,#F8FAFC_100%)]">
        <div className="max-w-[760px] mx-auto">
          <span className="inline-block bg-blue-50 text-[#0066FF] text-[.65rem] font-black uppercase tracking-[2.5px] px-3.5 py-1.5 rounded-full mb-4">
            🛩 About JetMeAway
          </span>
          <h1 className="font-poppins text-[2.4rem] md:text-[3.2rem] font-black tracking-tight mb-5 text-[#1A1D2B] leading-[1.1]">
            Travel search,{' '}
            <em className="italic bg-gradient-to-br from-[#0066FF] to-[#0052CC] bg-clip-text text-transparent">
              done differently
            </em>
          </h1>
          <p className="text-[1.05rem] text-[#5C6378] font-semibold leading-relaxed max-w-[620px] mx-auto">
            JetMeAway was founded in London with a single mission: to make travel search cleaner, faster, and more
            private. By integrating directly with global hotel wholesalers, we bypass the bloated commissions of big
            travel sites — passing those savings, and that privacy, directly to you.
          </p>
        </div>
      </section>

      <div className="max-w-[760px] mx-auto px-5 pb-16 space-y-4">
        <Card title="✈️ Who We Are">
          <p>
            <strong className="text-[#1A1D2B]">JETMEAWAY LTD</strong> (Company No: 17140522) is a UK-based travel
            technology platform registered at 66 Paul Street, London. We&apos;re not a travel agent — we&apos;re an
            engineering-first comparison engine that brings together live prices from 15+ trusted providers in one
            place.
          </p>
          <p>
            Whether you&apos;re searching for hotels, flights, packages, car hire, activities, transfers, eSIM data, or
            travel insurance, we help you compare and book directly — without the retargeting emails and inflated
            commissions that define most travel sites in 2026.
          </p>
        </Card>

        {/* Trust Closer #1: The Direct Advantage */}
        <Card title="⚡ The Direct Advantage">
          <p>
            For hotels and eSIM data, JetMeAway books you directly through{' '}
            <strong className="text-[#1A1D2B]">Nuitee</strong>, our global wholesaler partner. Nuitee connects directly
            to over two million hotels worldwide — cutting out the layer of middlemen that inflates prices on every
            major comparison site.
          </p>
          <p>What this means for you:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong className="text-[#1A1D2B]">Lower prices</strong> — we pass wholesale rates straight through with
              no commission markup.
            </li>
            <li>
              <strong className="text-[#1A1D2B]">Instant digital vouchers</strong> — your confirmation lands in your
              inbox in under 90 seconds.
            </li>
            <li>
              <strong className="text-[#1A1D2B]">Guaranteed check-in</strong> — your booking is confirmed at the hotel
              before you pay, not after.
            </li>
            <li>
              <strong className="text-[#1A1D2B]">One merchant of record</strong> — you pay JetMeAway, not a chain of
              third parties.
            </li>
          </ul>
        </Card>

        {/* Trust Closer #2: Privacy First */}
        <Card title="🛡️ Privacy First">
          <p>
            Most travel comparison sites make their real money selling your &ldquo;intent data&rdquo; — the fact that
            you searched for Bali in September, or priced up a honeymoon in the Maldives — to hotels, ad networks, and
            data brokers. That&apos;s why you get five retargeting emails from every hotel you clicked on.
          </p>
          <p>
            <strong className="text-[#1A1D2B]">We don&apos;t do that.</strong> Your searches stay on JetMeAway. Your
            email address is never sold to hotel marketing lists. Hotels only receive your details at the moment of
            check-in, not the moment of search. You can browse freely, compare confidently, and spend the rest of the
            month unhassled.
          </p>
        </Card>

        {/* Trust Closer #3: The Scout Philosophy */}
        <Card title="🧭 The Scout Philosophy">
          <p className="italic text-[#0066FF] font-bold text-[.95rem] mb-2">
            &ldquo;Life, not just lodging.&rdquo;
          </p>
          <p>
            Every hotel listing on JetMeAway is backed by our Scout layer — an intelligence engine that surfaces what
            actually matters about a stay, not just the room photos.
          </p>
          <p>
            We care about wellness programmes, morning rituals, serious gyms, quiet pools, the neighbourhood around the
            hotel, and whether a property actually delivers on its promise at 7am, not just 7pm. When the Scout engine
            launches fully in 2026, every booking you make will come with neighbourhood intelligence built in — from
            the nearest CrossFit gym to the best sunrise café.
          </p>
          <p>
            Because a great trip is about how you live, not just where you sleep.
          </p>
        </Card>

        <Card title="🔍 How It Works">
          <p>
            Tell us where you want to go. JetMeAway scouts across 15+ providers — including Expedia, Trip.com, Nuitee,
            Aviasales, Airalo, Klook, and many more — to help you find the best prices.
          </p>
          <p>
            For hotels and eSIMs, you book directly with us. For flights and packages, we route you to our
            ATOL-licensed partners so your booking is fully financially protected.
          </p>
        </Card>

        <Card title="💷 How We Make Money">
          <p>
            JetMeAway is completely free to use. On hotel and eSIM bookings, we earn a small margin built into the
            wholesale rate — the price you see is still lower than booking direct on the hotel&apos;s site. On flights
            and packages, we earn a referral commission from our partners when you click through and book.
          </p>
          <p>
            Our interests are aligned with yours: we only succeed when we actually help you find a great deal. No
            hidden fees, no upsells, no &ldquo;surprise&rdquo; charges at checkout.
          </p>
        </Card>

        <Card title="🛡️ Global Protection for Every Trip">
          <div className="space-y-4">
            <div>
              <div className="font-poppins font-bold text-[.92rem] text-[#1A1D2B] mb-1">
                Direct Hotel & eSIM Bookings
              </div>
              <p>
                All standalone accommodation and data services are booked directly through our secure global
                infrastructure. We provide instant digital vouchers and guaranteed check-in for a &ldquo;Super
                Fast&rdquo; experience you can rely on.
              </p>
            </div>
            <div>
              <div className="font-poppins font-bold text-[.92rem] text-[#1A1D2B] mb-1">
                Flight-Inclusive Packages
              </div>
              <p>
                If you&apos;re looking for a full holiday, we connect you to our ATOL-licensed partners — including{' '}
                <strong>Expedia (ATOL 5788)</strong> and <strong>Trip.com (ATOL 11572)</strong>. Any flight-inclusive
                package booked through these links is covered by ATOL financial protection. This means your money is
                safe even in the event of supplier insolvency. You&apos;ll receive your official ATOL Certificate
                directly from the provider at the time of booking.
              </p>
            </div>
            <div>
              <div className="font-poppins font-bold text-[.92rem] text-[#1A1D2B] mb-1">Flight Search</div>
              <p>
                We help you find the best routes via our flight search partners. For standalone flights, your contract
                is directly with the airline. For flight-inclusive holidays, your booking is protected by the ATOL
                licence held by our fulfillment partner, ensuring your air travel meets the safety and financial
                standards of the UK Civil Aviation Authority (CAA).
              </p>
            </div>
          </div>
        </Card>

        <Card title="⭐ Our Values">
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Value icon="🔍" name="Transparency" desc="No hidden costs. Ever." />
            <Value icon="💰" name="Best Value" desc="15+ providers compared." />
            <Value icon="🛡️" name="Privacy First" desc="Your data is yours." />
            <Value icon="❤️" name="For Everyone" desc="Budget to luxury." />
          </div>
        </Card>

        <Card title="📩 Get In Touch">
          <p>
            Visit our{' '}
            <a href="/contact" className="text-[#0066FF] font-bold">
              contact page
            </a>{' '}
            or email{' '}
            <a href="mailto:contact@jetmeaway.co.uk" className="text-[#0066FF] font-bold">
              contact@jetmeaway.co.uk
            </a>
            .
          </p>
        </Card>
      </div>

      <Footer />
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8">
      <h2 className="font-poppins text-[1.05rem] font-bold text-[#0066FF] mb-2.5 flex items-center gap-2">{title}</h2>
      <div className="text-[.88rem] text-[#5C6378] leading-relaxed space-y-2.5">{children}</div>
    </div>
  );
}

function Value({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="text-center p-5 bg-[#F8FAFC] border border-[#F1F3F7] rounded-xl">
      <div className="text-[1.8rem] mb-2">{icon}</div>
      <div className="font-poppins font-bold text-[.82rem] text-[#1A1D2B] mb-1">{name}</div>
      <div className="text-[.72rem] text-[#8E95A9] leading-snug">{desc}</div>
    </div>
  );
}
