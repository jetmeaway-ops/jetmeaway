const TRUSTPILOT_URL = 'https://uk.trustpilot.com/review/jetmeaway.co.uk';
const SCORE = 3.8;
const REVIEW_COUNT = 3;

const REAL_REVIEW = {
  quote: "Usually, after I search for a flight, I get followed by ads for weeks. JetMeAway was different — super quick results and I didn't feel like my data was being sold the second I clicked \u201csearch.\u201d The neighborhood info is a huge bonus too.",
  name: 'Matty Smith',
  title: 'Super fast',
  date: 'April 4, 2026',
  stars: 5,
};

function Stars({ value, size = '.95rem' }: { value: number; size?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(s => (
        <i
          key={s}
          className={`fa-solid fa-star ${s <= Math.round(value) ? 'text-[#00B67A]' : 'text-white/20'}`}
          style={{ fontSize: size }}
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-16 px-6 bg-[#0a1628]">
      <div className="max-w-[780px] mx-auto text-center">
        <p className="text-[.65rem] font-black uppercase tracking-[3px] text-[#00B67A] mb-2 font-[var(--font-dm-sans)]">
          Verified on Trustpilot
        </p>
        <h2 className="font-[var(--font-playfair)] text-[2rem] md:text-[2.4rem] font-black text-white mb-3">
          What Travellers Say
        </h2>

        <a
          href={TRUSTPILOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-5 py-2.5 mb-10 transition-colors"
        >
          <i className="fa-solid fa-star text-[#00B67A] text-[1rem]" />
          <span className="font-poppins font-bold text-white text-[.9rem]">Trustpilot</span>
          <span className="font-poppins text-white/70 text-[.85rem]">
            {SCORE.toFixed(1)} / 5 &middot; {REVIEW_COUNT} reviews
          </span>
        </a>

        <figure className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 text-left">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <Stars value={REAL_REVIEW.stars} />
            <span className="font-[var(--font-dm-sans)] text-white/50 text-[.75rem]">{REAL_REVIEW.date}</span>
          </div>
          <p className="font-poppins font-bold text-white text-[1rem] mb-3">{REAL_REVIEW.title}</p>
          <blockquote className="font-[var(--font-playfair)] italic text-white/90 text-[1.1rem] md:text-[1.25rem] leading-relaxed mb-6">
            &ldquo;{REAL_REVIEW.quote}&rdquo;
          </blockquote>
          <figcaption className="font-poppins text-white/70 text-[.85rem]">
            &mdash; {REAL_REVIEW.name}
          </figcaption>
        </figure>

        <a
          href={TRUSTPILOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-8 font-poppins font-bold text-white text-[.9rem] hover:text-[#00B67A] transition-colors"
        >
          Read all reviews on Trustpilot
          <i className="fa-solid fa-arrow-right text-[.8rem]" />
        </a>
      </div>
    </section>
  );
}
