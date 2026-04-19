/**
 * Per-page FAQs that feed FAQPage JSON-LD.
 *
 * These are tuned for AI-assistant citation (Perplexity, ChatGPT, Gemini)
 * rather than Google rich results — Google deprecated FAQ rich snippets
 * for most sites in 2023. Modern LLMs still prefer structured Q&A blocks
 * over free-text prose when citing a source.
 */
import type { Faq } from './page-schema';

export const FLIGHTS_FAQS: Faq[] = [
  { q: 'How many airlines and providers does JetMeAway compare for flights?', a: 'We compare live flight prices from 5 providers including Aviasales, Trip.com and Expedia, across 250+ airports worldwide. Results appear in seconds.' },
  { q: 'Does JetMeAway charge booking fees on flights?', a: 'No. JetMeAway earns a referral commission from the airline or partner when you book — the price you pay is the same as on the provider\'s own website, with no JetMeAway mark-up.' },
  { q: 'Can I book a flight directly on JetMeAway?', a: 'For standalone flights we redirect you to the airline or partner (Expedia, Trip.com, Aviasales) to complete the booking. For selected routes we are also adding direct agent-model bookings.' },
  { q: 'Which UK airports does JetMeAway search from?', a: 'All major UK departure airports including London (LHR, LGW, STN, LTN, LCY, SEN), Manchester, Birmingham, Edinburgh, Glasgow, Bristol, Belfast and 10+ more.' },
];

export const HOTELS_FAQS: Faq[] = [
  { q: 'How many hotel providers does JetMeAway compare?', a: 'We compare hotel prices across 6 providers: Booking.com, Expedia, Trip.com, Hotels.com, Agoda and Trivago, so you always see the cheapest rate side-by-side.' },
  { q: 'Are hotel prices on JetMeAway live?', a: 'Yes — hotel prices are fetched in real time when you search. Prices are shown in GBP where available and refresh on every new search.' },
  { q: 'Do I pay JetMeAway or the hotel provider?', a: 'For most hotels, you book through the provider (Booking.com, Expedia etc.) and pay them directly. For selected inventory JetMeAway will act as booking agent — this is made clear at checkout.' },
  { q: 'Can I cancel a hotel booking?', a: 'Cancellation depends on the rate you chose. Refundable rates can be cancelled free up to the deadline shown; non-refundable rates cannot. The provider handles refunds.' },
];

export const CARS_FAQS: Faq[] = [
  { q: 'Which car hire companies does JetMeAway compare?', a: 'We compare 7 providers: EconomyBookings, QEEQ, LocalRent, GetRentaCar, Klook, Expedia and Trip.com. Suppliers include Hertz, Europcar, Avis, Sixt, Enterprise and more.' },
  { q: 'Can I hire a car in a different country from where I return it?', a: 'Yes. Tick "Return to a different location" on the search form and choose any of our verified airports as the drop-off point. A one-way fee may apply.' },
  { q: 'What driver age can rent a car through JetMeAway?', a: 'Most suppliers accept drivers 21–75. Drivers under 25 may pay a young-driver surcharge, disclosed by the supplier at checkout.' },
  { q: 'Is insurance included in the car rental price?', a: 'Basic third-party cover is included by law. CDW and theft protection vary by supplier and destination — check each listing\'s inclusions before booking.' },
];

export const PACKAGES_FAQS: Faq[] = [
  { q: 'Are JetMeAway holiday packages ATOL protected?', a: 'Flight-inclusive packages shown on JetMeAway are fulfilled by ATOL-licensed partners including Expedia (ATOL 5788) and Trip.com (ATOL 11572). The ATOL Certificate is issued by the fulfilling partner.' },
  { q: 'How much can I save booking a package vs. flight and hotel separately?', a: 'Package rates typically save 10–25% vs. booking flight and hotel separately, because partners bundle cabin and room inventory at bulk-contract rates.' },
  { q: 'Can I choose my own flights and hotel in a package?', a: 'Yes. Packages let you mix and match outbound flight, return flight, hotel and room type — the provider re-prices the bundle as you swap components.' },
];

export const INSURANCE_FAQS: Faq[] = [
  { q: 'Do I need travel insurance for my trip?', a: 'Travel insurance is strongly recommended for every international trip and essential for the USA, Caribbean and long-haul destinations where medical bills can run into thousands.' },
  { q: 'What should a good travel insurance policy cover?', a: 'Emergency medical treatment and repatriation, trip cancellation, delayed or missed flights, baggage loss or theft, personal liability and 24/7 assistance.' },
  { q: 'How much does travel insurance cost?', a: 'Basic single-trip cover starts from around £3/day for Europe. Worldwide including USA is typically £6–£12/day depending on age, duration and pre-existing conditions.' },
  { q: 'Can I buy travel insurance after I\'ve booked my trip?', a: 'Yes, but cancellation cover only applies from the day the policy is purchased — so buy as soon as you book to be covered for cancellation from that date.' },
];

export const ESIM_FAQS: Faq[] = [
  { q: 'What is an eSIM and how does it work?', a: 'An eSIM is a digital SIM card installed on your phone via QR code — no physical card required. You buy a data plan online, scan the QR code, and your phone connects to local networks instantly.' },
  { q: 'Is my phone eSIM-compatible?', a: 'iPhone XS (2018) and newer, Samsung Galaxy S20+, Google Pixel 3a+, and most 2020+ flagship Androids support eSIM. Check Settings > General > About > "Digital SIM" to confirm.' },
  { q: 'How much does an eSIM cost for international travel?', a: 'Prices start from around $4.50 for 1GB of data. A typical 7-day trip with 3GB costs $8–$12 via Airalo or Yesim — far cheaper than roaming.' },
  { q: 'Can I keep my UK number active while using an eSIM abroad?', a: 'Yes. Your physical SIM (or main eSIM) stays active for calls and texts to your UK number; the travel eSIM handles data only. This is called Dual SIM.' },
];

export const EXPLORE_FAQS: Faq[] = [
  { q: 'Which activity providers does JetMeAway compare?', a: 'We compare tours and experiences from 3 trusted providers: GetYourGuide, Viator and Klook — covering attractions, day trips, food tours and transfers worldwide.' },
  { q: 'Can I cancel an activity booking?', a: 'Most activities offer free cancellation up to 24 hours before the start time. Individual cancellation policies are shown on the provider\'s booking page before you pay.' },
  { q: 'Are tickets on JetMeAway the same price as the attraction\'s own site?', a: 'Yes — prices match the provider\'s site. JetMeAway earns a referral commission from the provider, not a mark-up paid by you.' },
];

export const CONTACT_FAQS: Faq[] = [
  { q: 'Is JetMeAway free to use?', a: 'Yes. JetMeAway is 100% free for travellers. We earn a commission from our partner providers when you book, but this never affects the price you pay.' },
  { q: 'Can I book a flight or hotel directly on JetMeAway?', a: 'For most inventory we are a comparison engine — we redirect you to the trusted partner (Booking.com, Expedia, Trip.com and others) to complete your booking securely on their site.' },
  { q: 'Is JetMeAway a registered UK company?', a: 'Yes. JetMeAway is registered in England & Wales with Companies House number 17140522. We are a UK travel comparison site operating under UK consumer law.' },
  { q: 'Who do I contact if I have a problem with my booking?', a: 'Because your booking contract is with the travel provider, please contact them first for cancellations, changes, refunds or complaints. If the provider is unresponsive, email us at contact@jetmeaway.co.uk and we will help you escalate.' },
  { q: 'How quickly does JetMeAway reply to messages?', a: 'Monday to Friday we aim to reply within 24 hours. Weekend messages are answered within 48 hours. For urgent booking issues we recommend contacting the provider directly for the fastest response.' },
  { q: 'Does JetMeAway sell my personal data?', a: 'No. We never sell user data. We only share the minimum details required to complete a search or booking with the partner you choose. See our Privacy Policy for full details.' },
  { q: 'How does JetMeAway make money?', a: 'We receive a referral commission from travel providers when a traveller books through a link on our site. This keeps JetMeAway free to use and does not change the price you pay the provider.' },
];
