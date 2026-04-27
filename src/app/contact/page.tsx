'use client';
export const runtime = 'edge';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PageSchema } from '@/lib/page-schema';

export default function Contact() {
  const [sent, setSent] = useState(false);

  const [sending, setSending] = useState(false);

  async function sendForm() {
    const name = (document.getElementById('cf-name') as HTMLInputElement)?.value?.trim();
    const email = (document.getElementById('cf-email') as HTMLInputElement)?.value?.trim();
    const msg = (document.getElementById('cf-msg') as HTMLTextAreaElement)?.value?.trim();
    const subject = (document.getElementById('cf-subject') as HTMLSelectElement)?.value;
    if (!name || !email || !msg) { alert('Please fill in all required fields.'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message: msg }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSent(true);
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // FAQPage JSON-LD — mirrors the Q&As rendered below. Both
  // Google (rich-result accordions) and Perplexity/ChatGPT (direct
  // citation) prefer structured FAQ data over free-text prose.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is JetMeAway free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. JetMeAway is 100% free for travellers. We earn a commission from our partner providers when you book, but this never affects the price you pay.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I book a flight or hotel directly on JetMeAway?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For most inventory we are a comparison engine — we redirect you to the trusted partner (Expedia, Trip.com, Aviasales and others) to complete your booking securely on their site. Hotel direct bookings via LiteAPI and flight direct bookings via Duffel happen on our own site.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is JetMeAway a registered UK company?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. JetMeAway is registered in England & Wales with Companies House number 17140522. We are a UK travel comparison site operating under UK consumer law.',
        },
      },
      {
        '@type': 'Question',
        name: 'Who do I contact if I have a problem with my booking?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Because your booking contract is with the travel provider, please contact them first for cancellations, changes, refunds or complaints. If the provider is unresponsive, email us at contact@jetmeaway.co.uk and we will help you escalate.',
        },
      },
      {
        '@type': 'Question',
        name: 'How quickly does JetMeAway reply to messages?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Monday to Friday we aim to reply within 24 hours. Weekend messages are answered within 48 hours. For urgent booking issues we recommend contacting the provider directly for the fastest response.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does JetMeAway sell my personal data?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. We never sell user data. We only share the minimum details required to complete a search or booking with the partner you choose. See our Privacy Policy for full details.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does JetMeAway make money?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We receive a referral commission from travel providers when a traveller books through a link on our site. This keeps JetMeAway free to use and does not change the price you pay the provider.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which UK airports and cities does JetMeAway cover?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We cover 20+ UK departure airports including London (Heathrow, Gatwick, Stansted, Luton, City, Southend), Manchester, Birmingham, Edinburgh, Glasgow, Bristol, Newcastle, Liverpool, Leeds-Bradford and Belfast. Our destination coverage is 250+ airports and 160+ hotel cities worldwide.',
        },
      },
    ],
  };

  return (
    <>
      <PageSchema crumbs={[{ name: 'Contact', path: '/contact' }]} />
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section className="pt-36 pb-10 px-5 text-center">
        <h1 className="font-poppins text-[2.4rem] font-black tracking-tight mb-2.5">📩 <span className="text-[#0066FF]">Contact</span> Us</h1>
        <p className="text-[.95rem] text-[#8E95A9] max-w-[500px] mx-auto">Got a question, feedback, or need help? We&apos;d love to hear from you.</p>
      </section>

      <div className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Info */}
          <div className="bg-white border border-[#F1F3F7] rounded-3xl p-7 space-y-5">
            <InfoItem icon="fa-envelope" title="Email Us" desc={<>
              <a href="mailto:contact@jetmeaway.co.uk" className="text-[.82rem] text-[#0066FF] font-bold hover:underline block mb-1">contact@jetmeaway.co.uk</a>
              <span className="text-[.78rem] text-[#8E95A9]">Or use the contact form and we&apos;ll get back to you within 24 hours.</span>
            </>} />
            <InfoItem icon="fa-clock" title="Response Time" desc={<><span className="text-[.78rem] text-[#8E95A9]">Mon–Fri: Within 24 hours<br/>Weekends: Within 48 hours</span></>} />
            <InfoItem icon="fa-shield-halved" title="Booking Queries" desc={<span className="text-[.78rem] text-[#8E95A9]">Jetmeaway is a comparison site. For booking issues, contact the travel provider directly.</span>} />
          </div>

          {/* Form */}
          <div className="bg-white border border-[#F1F3F7] rounded-3xl p-7">
            {!sent ? (
              <>
                <h3 className="font-poppins font-bold text-[1rem] text-[#0066FF] mb-4">Send a Message</h3>
                <div className="space-y-3">
                  <div><label className="block text-[.58rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9] mb-1">Your Name</label><input id="cf-name" type="text" placeholder="John Smith" className="w-full p-3 bg-[#F8FAFC] border border-[#E4E8F0] rounded-lg text-[.88rem] text-[#1A1D2B] outline-none focus:border-[#0066FF]" /></div>
                  <div><label className="block text-[.58rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9] mb-1">Email</label><input id="cf-email" type="email" placeholder="your@email.com" className="w-full p-3 bg-[#F8FAFC] border border-[#E4E8F0] rounded-lg text-[.88rem] text-[#1A1D2B] outline-none focus:border-[#0066FF]" /></div>
                  <div><label className="block text-[.58rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9] mb-1">Subject</label><select id="cf-subject" className="w-full p-3 bg-[#F8FAFC] border border-[#E4E8F0] rounded-lg text-[.88rem] text-[#1A1D2B] outline-none"><option>General Enquiry</option><option>Feedback</option><option>Report a Problem</option><option>Partnership</option></select></div>
                  <div><label className="block text-[.58rem] font-bold uppercase tracking-[1.5px] text-[#8E95A9] mb-1">Message</label><textarea id="cf-msg" placeholder="How can we help?" className="w-full p-3 bg-[#F8FAFC] border border-[#E4E8F0] rounded-lg text-[.88rem] text-[#1A1D2B] outline-none focus:border-[#0066FF] min-h-[120px] resize-y" /></div>
                  <button onClick={sendForm} disabled={sending} className="w-full py-3.5 bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-60 text-white font-poppins font-bold text-[.92rem] rounded-xl transition-all">{sending ? 'Sending...' : 'Send Message'}</button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-[2.5rem] mb-2">✅</div>
                <h3 className="font-poppins font-bold text-[1rem] text-[#0066FF] mb-1.5">Message Sent!</h3>
                <p className="text-[.82rem] text-[#8E95A9]">Thank you. We&apos;ll get back to you soon.</p>
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white border border-[#F1F3F7] rounded-3xl p-7 mt-4">
          <h2 className="font-poppins font-bold text-[1rem] text-[#0066FF] mb-4">❓ FAQ</h2>
          <div className="space-y-3.5">
            <FAQ q="Is JetMeAway free to use?" a="Yes. JetMeAway is 100% free for travellers. We earn a commission from our partner providers when you book, but this never affects the price you pay." />
            <FAQ q="Can I book a flight or hotel directly on JetMeAway?" a="For most inventory we are a comparison engine — we redirect you to the trusted partner (Expedia, Trip.com, Aviasales and others) to complete your booking securely on their site. Hotel direct bookings via LiteAPI and flight direct bookings via Duffel happen on our own site." />
            <FAQ q="Is JetMeAway a registered UK company?" a="Yes. JetMeAway is registered in England & Wales with Companies House number 17140522. We are a UK travel comparison site operating under UK consumer law." />
            <FAQ q="Who do I contact if I have a problem with my booking?" a="Because your booking contract is with the travel provider, please contact them first for cancellations, changes, refunds or complaints. If the provider is unresponsive, email us at contact@jetmeaway.co.uk and we will help you escalate." />
            <FAQ q="How quickly does JetMeAway reply to messages?" a="Monday to Friday we aim to reply within 24 hours. Weekend messages are answered within 48 hours. For urgent booking issues we recommend contacting the provider directly for the fastest response." />
            <FAQ q="Does JetMeAway sell my personal data?" a="No. We never sell user data. We only share the minimum details required to complete a search or booking with the partner you choose. See our Privacy Policy for full details." />
            <FAQ q="How does JetMeAway make money?" a="We receive a referral commission from travel providers when a traveller books through a link on our site. This keeps JetMeAway free to use and does not change the price you pay the provider." />
            <FAQ q="Which UK airports and cities does JetMeAway cover?" a="We cover 20+ UK departure airports including London (Heathrow, Gatwick, Stansted, Luton, City, Southend), Manchester, Birmingham, Edinburgh, Glasgow, Bristol, Newcastle, Liverpool, Leeds-Bradford and Belfast. Our destination coverage is 250+ airports and 160+ hotel cities worldwide." />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function InfoItem({ icon, title, desc }: { icon: string; title: string; desc: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 bg-[#0066FF]/[.06] border border-[#0066FF]/10 rounded-xl flex items-center justify-center text-[#0066FF] flex-shrink-0">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div><h3 className="font-bold text-[.88rem] text-[#1A1D2B] mb-0.5">{title}</h3><div>{desc}</div></div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="pb-3.5 border-b border-[#F1F3F7] last:border-0 last:pb-0">
      <div className="font-bold text-[.88rem] text-[#1A1D2B] mb-1">{q}</div>
      <div className="text-[.8rem] text-[#8E95A9] leading-relaxed">{a}</div>
    </div>
  );
}
