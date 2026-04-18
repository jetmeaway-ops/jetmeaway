const TRUSTPILOT_URL = 'https://uk.trustpilot.com/review/jetmeaway.co.uk';
const SCORE = 4.0;
const REVIEW_COUNT = 3;

const REVIEWS = [
  {
    quote:
      "Usually, after I search for a flight, I get followed by ads for weeks. JetMeAway was different \u2014 super quick results and I didn't feel like my data was being sold the second I clicked \u201csearch.\u201d The neighborhood info is a huge bonus too.",
    name: 'Matty Smith',
    title: 'Super fast',
    date: 'April 4, 2026',
    stars: 5,
  },
  {
    quote:
      "I recently booked a holiday through your website and had a great experience overall. The booking process was smooth and easy to follow, and I found the pricing very competitive. One thing I particularly liked was how clearly the package details were presented, which made it easy to compare options. Overall, I\u2019m very satisfied with your service and would happily use your platform again.",
    name: 'Hamza Hassan',
    title: 'A great experience overall',
    date: 'April 13, 2026',
    stars: 5,
  },
  {
    quote: 'Amazing website that helped navigating holidays become easier.',
    name: 'Rosalind',
    title: 'Quick and efficient website',
    date: 'April 10, 2026',
    stars: 5,
  },
];

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
      <div className="max-w-[1120px] mx-auto text-center">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          {REVIEWS.map(r => (
            <figure
              key={r.name}
              className="bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col"
            >
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <Stars value={r.stars} />
                <span className="font-[var(--font-dm-sans)] text-white/50 text-[.72rem]">{r.date}</span>
              </div>
              <p className="font-poppins font-bold text-white text-[.95rem] mb-3">{r.title}</p>
              <blockquote className="font-[var(--font-playfair)] italic text-white/90 text-[1rem] leading-relaxed mb-5 flex-1">
                &ldquo;{r.quote}&rdquo;
              </blockquote>
              <figcaption className="font-poppins text-white/70 text-[.8rem]">
                &mdash; {r.name}
              </figcaption>
            </figure>
          ))}
        </div>

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
