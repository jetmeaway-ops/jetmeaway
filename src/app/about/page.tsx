export const runtime = 'edge';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function About() {
  return (
    <>
      <Header />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-[Poppins] text-[2.4rem] font-black tracking-tight mb-2.5">About <span className="text-[#0066FF]">Jetmeaway</span></h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">We&apos;re on a mission to help every traveller find the best deal — without searching dozens of sites.</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16 space-y-4">
        <Card title="✈️ Who We Are">
          <p>Jetmeaway is a UK-based travel comparison platform that brings together prices from 20+ trusted travel providers in one place. Whether you&apos;re looking for flights, hotels, packages, car hire, activities, transfers, eSIM data or travel insurance — we help you compare and find the best value.</p>
          <p>We believe everyone deserves a great trip at a fair price. That&apos;s why we built Jetmeaway — to take the stress out of travel planning.</p>
        </Card>
        <Card title="🔍 How It Works">
          <p>Tell us where you want to go. Jetmeaway scouts across 20+ providers — including Expedia, Booking.com, Trip.com, GetYourGuide, Airalo, Klook, and many more — to help you find the best prices.</p>
          <p>When you find a deal, we take you directly to the provider&apos;s website. We don&apos;t add fees or markups — the price you see is the price you pay.</p>
        </Card>
        <Card title="💷 How We Make Money">
          <p>Jetmeaway is completely free. We earn a small commission from our travel partners when you book through our links. This never affects the price you pay.</p>
          <p>Our interests are aligned with yours: we only succeed when we help you find a great deal.</p>
        </Card>
        <Card title="⭐ Our Values">
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Value icon="🔍" name="Transparency" desc="No hidden costs. Ever." />
            <Value icon="💰" name="Best Value" desc="20+ providers compared." />
            <Value icon="🛡️" name="Trust" desc="Only verified partners." />
            <Value icon="❤️" name="For Everyone" desc="Budget to luxury." />
          </div>
        </Card>
        <Card title="📩 Get In Touch">
          <p>Visit our <a href="/contact" className="text-[#0066FF] font-bold">contact page</a> or email <a href="mailto:waqar@jetmeaway.co.uk" className="text-[#0066FF] font-bold">waqar@jetmeaway.co.uk</a>.</p>
        </Card>
      </div>
      <Footer />
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#F1F3F7] rounded-3xl p-8">
      <h2 className="font-[Poppins] text-[1.05rem] font-bold text-[#0066FF] mb-2.5 flex items-center gap-2">{title}</h2>
      <div className="text-[.88rem] text-[#5C6378] leading-relaxed space-y-2.5">{children}</div>
    </div>
  );
}

function Value({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="text-center p-5 bg-[#F8FAFC] border border-[#F1F3F7] rounded-xl">
      <div className="text-[1.8rem] mb-2">{icon}</div>
      <div className="font-[Poppins] font-bold text-[.82rem] text-[#1A1D2B] mb-1">{name}</div>
      <div className="text-[.72rem] text-[#8E95A9] leading-snug">{desc}</div>
    </div>
  );
}
