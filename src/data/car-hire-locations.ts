/**
 * Car hire landing-page data — one entry per airport.
 *
 * WHY THIS EXISTS
 * Competitor gap analysis (Aug 2026, vs Travelsupermarket) found "car hire"
 * and "car hire [airport]" to be a large high-intent search cluster where we
 * ranked for nothing — despite already holding the EconomyBookings and
 * Trip.com affiliate contracts. These pages capture that demand and monetise
 * from day one.
 *
 * DATA RULES (non-negotiable — same standard as the blog):
 *  - `plc` MUST be a verified EconomyBookings mergedLocationId copied from the
 *    LOCATIONS table in `src/app/cars/page.tsx`. Never guess one: a wrong plc
 *    lands the user on an empty results page and fails affiliate review.
 *  - Prices are TYPICAL RANGES ONLY, never invented exact quotes. Every page
 *    pushes the reader to a live search for their real dates.
 *  - Supplier names, desk locations and driving rules are web-verified and
 *    adversarially fact-checked before they land here.
 */

export type CarHireFaq = { q: string; a: string };

export type CarHireSection = {
  h2: string;
  /** Rendered as paragraphs; keep each one a complete thought. */
  body: string[];
};

export type CarHireLocation = {
  slug: string;
  /** Airport name as travellers say it. */
  airport: string;
  iata: string;
  /** Verified EconomyBookings mergedLocationId. */
  plc: number;
  /** The place people mean when they search — "Alicante", not "Alicante Airport". */
  place: string;
  region: string;
  country: string;

  seoTitle: string;
  metaDescription: string;
  h1: string;
  /** Answer-first opening. 2-3 sentences. */
  intro: string;

  /** Typical per-day range, framed as a range, e.g. "£12–£25 a day". */
  typicalPrice: string;
  cheapestMonths: string;
  priciestMonths: string;

  /** Suppliers verified as operating at this airport. */
  suppliers: string[];
  /** Where the desks actually are — the real-world pain point. */
  desks: string;

  sections: CarHireSection[];
  faqs: CarHireFaq[];

  /** The thing a pushy affiliate site wouldn't tell you. */
  honestTake: string;

  /** Internal links — slugs of our own related content. */
  relatedHotelPost?: string;
  relatedFlightPost?: string;
};

export const CAR_HIRE_LOCATIONS: CarHireLocation[] = [
  {
    slug: 'alicante-airport',
    airport: 'Alicante Airport',
    iata: 'ALC',
    plc: 3312,
    place: 'Alicante',
    region: 'Costa Blanca',
    country: 'Spain',

    seoTitle: 'Car Hire Alicante Airport 2026: Compare Prices, No Fees | JetMeAway',
    metaDescription: 'Compare Alicante Airport car hire across trusted suppliers. Real 2026 price ranges, which desks are in the terminal, fuel traps. No booking fee.',
    h1: 'Car Hire at Alicante Airport (ALC): The Honest 2026 Guide',
    intro: 'Booked ahead, car hire at Alicante Airport averages somewhere around £10-£22 a day across the year depending on the month, car class and how far ahead you book. January is consistently the cheapest month and December the dearest, which surprises most UK renters who assume August is the peak. JetMeAway compares Alicante car hire across EconomyBookings and Trip.com in one search: we are paid an affiliate commission by the supplier, so we never add a booking fee or a markup to your price.',

    typicalPrice: '£10-£22 a day',
    cheapestMonths: '',
    priciestMonths: '',

    suppliers: [],
    desks: 'Alicante has one terminal. Aena lists eight in-terminal car hire desks, all on Floor 0 (Arrivals): Avis, Centauro, Europcar, Goldcar/InterRent, Hertz/Firefly, OK Mobility, Record Go and Sixt.',

    sections: [
    {
      h2: 'What car hire actually costs at Alicante Airport',
      body: [
        'DiscoverCars\' 2026 monthly averages for ALC, across all car classes, run from about £10 a day in January up to about £22 in December, with a yearly average close to £17-£18 a day.',
        'Counter-intuitive but true from that same data: July and August are NOT the aggregator price peak at Alicante. Both sit around £18-£19 a day. December is the annual high point, driven by the Christmas and New Year fortnight.',
        'Headline rates of \'from £3-£6 a day\' on the big comparison sites are genuine but they are the very cheapest base rate: smallest manual car, off-peak dates, and the full insurance excess left exposed.',
        'The extras move the total more than the daily rate does. Automatic gearboxes cost significantly more and sell out first, additional drivers and child seats are charged per day, and drivers under 25 pay a young-driver surcharge that is often not in the headline price.',
        'Any aggregator \'average\' that looks very high is usually skewed by large, automatic or premium vehicles booked last minute. Treat single numbers with suspicion.',
        'These are ranges, not quotes. Run a live search for your exact dates and car class before you decide anything.',
      ],
    },
    {
      h2: 'Where the desks are, and where the car actually is',
      body: [
        'Alicante has one terminal. Aena lists eight in-terminal car hire desks, all on Floor 0 (Arrivals): Avis, Centauro, Europcar, Goldcar/InterRent, Hertz/Firefly, OK Mobility, Record Go and Sixt.',
        'An in-terminal desk does not mean an in-terminal car. After the paperwork you walk to the six-level P1 multi-storey car park (4,140 spaces, 2.10 m headroom) to collect the vehicle. Budget a few minutes on foot with luggage.',
        'For returns, follow the separately signposted \'Car rental\' entrance at P1 rather than the general car park entrance.',
        'Ignore any guide that sends you to \'Parking Express Llegadas\' for your hire car. Aena describes that as a 23-space kiss-and-fly bay directly in front of the terminal with the first 10 minutes free. It has nothing to do with car hire.',
        'For off-airport suppliers: take the lift or escalator from Arrivals down to Level -2, exit to the transfer bus station and use bus stops 1-5. Some suppliers instead use the Express Parking stops, 45-55. Shuttles run roughly every 15 minutes and the depots are about 5-10 minutes away.',
        'Suppliers move between in-terminal, car park and off-site from year to year, and brokers sometimes reassign you. Your booking voucher states the collection method and it is the authority on the day.',
      ],
    },
    {
      h2: 'Which suppliers operate at ALC',
      body: [
        'In-terminal, Floor 0 Arrivals (per Aena): Avis, Centauro, Europcar, Goldcar/InterRent, Hertz/Firefly, OK Mobility, Record Go, Sixt.',
        'Off-airport, reached by shuttle or meet-and-greet: Enterprise, Alamo, National, Budget, Thrifty, Keddy by Europcar, Wiber, Drivalia, Click&Rent, Sicily by Car, Moovers Mobility Lovers, Victoria Rent a Car and SOLO.',
        'Enterprise, Alamo and National are off-airport at Alicante despite being household names. Their own directions send you to Level -2 and the shuttle stops, so do not assume a big brand means a short walk.',
        'In July 2025 Spain\'s consumer body OCU reported Centauro, Europcar, Goldcar, Hertz and Sixt to the Ministerio de Consumo over lack of online transparency, premium insurance offered by default, poor fuel information, disproportionate deposits with unclear refund terms, and charging for legally required items such as child seats and snow chains. That is a documented sector problem, not a reason to rule out one brand.',
        'For historical context, the UK CMA ran a review of short-term consumer car hire across the EU (CMA case, March 2019) covering Avis-Budget, Enterprise, Europcar, Hertz and Sixt plus Centauro and Record Go. It is useful background but it is six years old.',
        'We only list suppliers we can actually see operating at ALC. If a name is not on this page, we could not verify it.',
      ],
    },
    {
      h2: 'UK driver rules in Spain, 2026',
      body: [
        'A full UK photocard licence is all you need. GOV.UK states plainly that you do not need an International Driving Permit for Spain.',
        'You may need a 1968 IDP if you hold an old-style paper GB licence, or a licence issued in Gibraltar, Guernsey, Jersey or the Isle of Man. IDPs are now issued by PayPoint retail outlets: the Post Office stopped issuing them on 31 March 2024.',
        'Under the 2023 UK-Spain agreement a UK licence is valid for visitors for six months from entry. Provisional licences are not valid for driving in Spain.',
        'V-16 emergency beacon: since 1 January 2026 the DGT-connected V-16 replaces warning triangles on Spanish-registered vehicles. Your hire car has Spanish plates, so check the beacon is physically in the car before you drive off. The fine for not carrying an approved one is €80 and you are the one who gets stopped.',
        'Speed limits: 120 km/h motorway, 90 km/h main rural roads, 50 km/h in towns, 30 km/h on urban streets with one lane per direction, 20 km/h where pavement and roadway are level. Fixed and mobile cameras are common on the N-332 coast road and the A-7.',
        'Drink-drive limit is 0.5 g/l blood (0.25 mg/l breath), dropping to 0.3 g/l for drivers who have held a licence under two years. A proposal to cut the general limit to 0.2 g/l was voted down in the Congress Interior Committee on 18 March 2026, so 0.5 g/l still stands.',
        'Fines: on-the-spot fines are normal, with a 50% discount for paying within 20 days. Spain does pursue UK-registered drivers after you fly home, with over 37,000 DVLA data requests since March 2023 under the UK-Spain bilateral agreement, and your rental firm charges an admin fee for handing over your details.',
        'Tolls: the AP-7 between the French border and Alicante lost its tolls in 2020-21, so Alicante to Valencia is free. The AP-7 Alicante ring road has been toll-free since July 2024 under a rolling exemption, but the last publicly confirmed end date has passed. Check the current status before you travel rather than assuming.',
        'Low emission zones: Alicante\'s ZBE only enforces permanently in Anillo I (the Casco Antiguo), Monday to Friday 07:00-20:00, with a €200 fine reduced to €100 for early payment. Elche\'s ZBE has been in force on paper since 31 December 2025 but with no active restrictions or sanctions. Spanish hire cars carry a DGT environmental sticker on the windscreen, so glance at it when you collect.',
        'Other rules: drive on the right; hands-free earpieces are banned as well as handheld phones; children under 135 cm use an approved seat in the rear; you must wear, not just carry, a reflective jacket if you leave the vehicle on a motorway; glasses wearers must carry a spare pair.',
        'Taking the car into Portugal, or onto a ferry, must be declared and usually carries a daily fee. The amount is not standardised, so ask your supplier. Undeclared cross-border driving can void all cover including third-party liability.',
      ],
    },
    {
      h2: 'The fuel policy trap at Alicante',
      body: [
        'Book full-to-full and nothing else. You collect a full tank, return it full and pay only for what you burn, at pump prices.',
        'The trap is prepaid fuel, sold as full-to-empty or lleno-vacio. You buy a whole tank at the supplier\'s own per-litre rate, usually above pump price, often with a non-refundable refuelling or service charge, and unused fuel is not refunded.',
        'Budget desks at ALC push the prepaid upgrade at the counter even when you booked full-to-full. You can decline. The policy you booked is the policy you agreed.',
        'Poor fuel information was one of the specific complaints OCU took to Spain\'s consumer ministry in July 2025, so this is a documented pattern rather than internet folklore.',
        'Fill up at a station on the N-338 or N-332 a few kilometres out rather than the last forecourt by the terminal, and keep the printed receipt. Some suppliers require proof of a fill within a set distance of the airport, so check your T&Cs for the exact rule.',
        'Leave 15-20 minutes for the fuel stop before you head to P1. The return queue is not the place to discover you are a bar short.',
      ],
    },
    {
      h2: 'Excess, deposits and insurance',
      body: [
        'The advertised price includes basic CDW and theft cover, but with an excess. That amount is pre-authorised (blocked, not charged) on a credit card in the lead driver\'s name and released after return.',
        'Excess and deposit levels vary a lot by supplier and car group, so read the specific T&Cs rather than trusting a typical figure. Centauro is the strictest well-known case at ALC: credit card only, with a deposit block commonly quoted at €1,500.',
        'Record Go and OK Mobility do sell no-deposit or full-cover rates that accept an embossed Visa or Mastercard debit card in the lead driver\'s name. You are paying for the cover to get there, but it is an option if you have no credit card.',
        'The desk will offer super-CDW, \'premium\' or zero-excess cover charged per day. On a cheap booking it can easily cost more than the car itself.',
        'A standalone UK annual excess policy is usually far cheaper, but it works by reimbursement: the supplier still blocks the deposit on your credit card, and you pay any charge first then claim it back with photos, the rental agreement and the damage invoice. Either way you need the credit headroom.',
        'Check your third-party policy covers tyres, glass, underbody, roof, mirrors and lost keys. Standard CDW commonly excludes all of them.',
        'Deposit release times vary by supplier and card issuer. Ask at the desk rather than relying on a figure you read online.',
      ],
    },
    {
      h2: 'Common traps at Alicante Airport',
      body: [
        'Assuming an in-terminal desk means the car is at the door. It is a walk to the P1 multi-storey with your bags, which catches families out constantly.',
        'Not reading the collection method on the voucher. In-terminal, P1 and off-site shuttle are three very different first hours.',
        'Queues at the budget counters in peak weeks and on late-evening UK arrivals. Do not plan a tight onward drive. If you land after 22:00, confirm the desk\'s opening hours and whether after-hours pickup carries a fee.',
        'The debit-card ambush. Most brands want a credit card in the lead driver\'s name. Turn up without one and your realistic options are buying the desk\'s expensive no-deposit product, or losing the booking.',
        'The IDP myth. Several Alicante-airport-branded websites still claim an International Driving Permit is legally required for foreign drivers. For a UK photocard licence that is simply wrong. Do not waste the money.',
        'Prepaid fuel sold at the counter as a convenience upgrade.',
        'Damage disputes on return. Film a slow 360-degree walk-round with the date visible at pick-up and again at drop-off, photograph the roof, alloys, windscreen and underbody lip, and get every mark written onto the handover sheet before you move the car. If you are charged, insist on a written damage report: without one you cannot claim on a third-party excess policy.',
        'Automatics. Scarcer and dearer at ALC than in the UK, and they sell out first for July and August. If you cannot drive a manual, book early.',
        'Child seats charged per day. Nearly all UK airlines carry car seats free, so bring your own.',
        'Summer parking. Altea old town, Calpe by the Penon, Javea port and Benidorm\'s old quarter all fill by mid-morning in August, and underground car parks charge by the hour.',
        'Speeding fines arriving months later at your UK address, plus the supplier\'s admin fee on top.',
        'Old sat-navs and old guides routing you around an AP-7 toll between Alicante and Valencia that no longer exists. Take the AP-7: it is free and much faster than the coast road.',
      ],
    },
    {
      h2: 'Best drives and day trips from Alicante Airport',
      body: [
        'Guadalest, about 1h10 - castle village on a rock above a turquoise reservoir, and the classic reason people hire here. Combine with the Algar Waterfalls for a swim.',
        'Altea, Calpe and Villajoyosa - the scenic coastal run north. Whitewashed old town and blue-domed church, the 332 m Penon de Ifach, and painted fishermen\'s houses.',
        'Elche, about 20 minutes and 21 km, so closer than Alicante city. UNESCO palm grove of roughly 200,000 date palms plus the Basilica de Santa Maria. Usually skipped, genuinely worth it.',
        'Santa Pola, about 15 minutes - park at the port and take the catamaran to Tabarca island, Spain\'s first marine reserve.',
        'Javea (Xabia), Moraira and Denia, roughly 1h to 1h20 - the quieter northern Costa Blanca coves. Granadella beach is the pick.',
        'Torrevieja and the pink Laguna Rosa, about 45 minutes south, best in late-afternoon light.',
        'Murcia and Cartagena, 1h to 1h30 south - cathedral facade and tapas, then the Roman theatre and naval harbour.',
        'Valencia, about 1h45 up the toll-free AP-7 - City of Arts and Sciences, the Central Market, and paella where it was invented. Very doable as a long day.',
        'Sierra de Aitana, Sella and the inland mountain roads behind Benidorm - empty roads and spectacular driving. This is the real argument for a car over the tram.',
        'Villena and Bocairent, roughly 1h to 1h20 inland - castle towns and cave houses, a day completely away from the coast.',
      ],
    },
    {
      h2: 'Do you actually need a car at Alicante?',
      body: [
        'Honest answer: for a lot of UK visitors, no. We would rather say that than sell you a car you leave parked.',
        'Skip the car if you are staying in Benidorm, central Alicante or central Torrevieja. Benidorm is flat and walkable, local buses are around €1.60 a ride (checked June 2026), and the TRAM L1 links Benidorm to Alicante city in roughly 50-65 minutes for about €2.80 with clifftop views.',
        'Airport transfers are cheap. The C-6 bus to Alicante city centre is €4.60 single (€8.10 for a 10-trip bundle) and takes about 30 minutes - note it boards on Level 2, the departures roadway, not the arrivals floor. ALSA coaches run to Benidorm in roughly 45-60 minutes.',
        'Taxis: Alicante to Benidorm is commonly metered at roughly €70-€100 plus a €4.25 airport surcharge, with pre-booked private transfers starting lower. A taxi to Alicante city is usually quoted around €25-€30 - confirm at the rank before you set off.',
        'All-inclusive resort guests in particular: be honest with yourself about how many days you will actually drive.',
        'Hire a car if you are in a villa or hillside urbanisation (Polop, Finestrat, La Nucia, Moraira, the Orihuela Costa golf resorts) where nothing is walkable; if you want the inland villages that public transport barely reaches; if you are four or more people; if you want to beach-hop the northern coves; or if you are visiting in January or November when cars are cheapest and the roads are empty.',
        'The middle path most people miss: take the coach or TRAM to your resort, then hire locally for the two or three days you actually want to explore. You dodge the airport queue, the airport surcharge and six days of paying for a parked car.',
      ],
    },
    {
      h2: 'How to compare Alicante car hire properly',
      body: [
        'Compare on the total, not the daily rate: base rate plus fuel policy plus excess cover plus extras plus any young-driver surcharge.',
        'Filter to full-to-full before you compare anything else. It reorders the results list completely and removes the biggest hidden cost.',
        'Check the collection method on each quote - in-terminal desk, P1 car park or off-site shuttle - and treat the shuttle faff as a real cost if you land late or travel with small children.',
        'Check the card rules before you book: whose name it must be in, credit or debit, and how big the block will be.',
        'Price the desk\'s zero-excess product against a UK standalone annual policy for the same dates. The standalone usually wins, but only if you have the credit limit for the deposit block.',
        'Open two or three comparison sites for the same dates and the same car class. Prices move daily and no single aggregator is cheapest every time.',
        'JetMeAway shows EconomyBookings and Trip.com side by side for Alicante. We take an affiliate commission from the supplier and add no booking fee, so the price you see is the supplier\'s price.',
      ],
    },
    ],

    faqs: [
    { q: 'Do I need an International Driving Permit to hire a car at Alicante Airport?', a: 'No. GOV.UK confirms a full UK photocard licence is enough for Spain. Several Alicante-airport-branded websites claim an IDP is legally required - that is wrong for a UK photocard. You may need a 1968 IDP only if you hold an old-style paper GB licence, or a licence issued in Gibraltar, Guernsey, Jersey or the Isle of Man. IDPs now come from PayPoint outlets, not the Post Office, which stopped issuing them on 31 March 2024.' },
    { q: 'Which car hire desks are actually inside the Alicante Airport terminal?', a: 'Aena lists eight, all on Floor 0 in Arrivals: Avis, Centauro, Europcar, Goldcar/InterRent, Hertz/Firefly, OK Mobility, Record Go and Sixt. Everything else, including Enterprise, Alamo, National, Budget, Thrifty, Keddy, Wiber, Drivalia, Click&Rent, Sicily by Car, Moovers, Victoria Rent a Car and SOLO, is off-airport with a shuttle or meet-and-greet.' },
    { q: 'Where do I actually collect the car at Alicante Airport?', a: 'For the in-terminal brands, from the six-level P1 multi-storey car park (4,140 spaces, 2.10 m headroom), on foot from the arrivals desks. Returns use a separately signposted \'Car rental\' entrance at P1. Allow a few minutes with luggage - the desk being in the terminal does not mean the car is.' },
    { q: 'Is Parking Express Llegadas where I pick up my hire car?', a: 'No, and several guides get this wrong. Aena describes Parking Express Llegadas as a 23-space drop-off bay directly in front of the terminal with the first 10 minutes free - a kiss-and-fly area. Hire cars for in-terminal suppliers are in P1.' },
    { q: 'How do I find the shuttle for off-airport car hire at ALC?', a: 'Take the lift or escalator from Arrivals down to Level -2, exit to the transfer bus station and use bus stops 1-5. Some suppliers use the Express Parking stops, 45-55. Shuttles run roughly every 15 minutes and depots are about 5-10 minutes away. Your voucher names the pickup point.' },
    { q: 'How much does car hire cost at Alicante Airport?', a: 'DiscoverCars\' 2026 monthly averages for ALC across all car classes run from about £10 a day in January to about £22 in December, averaging roughly £17-£18 a day over the year. Headline \'from £3-£6 a day\' rates are real but are the cheapest base rate off-peak with the full excess exposed. These are ranges, not quotes - always price your own dates.' },
    { q: 'When is car hire cheapest at Alicante Airport?', a: 'January, by a clear margin - roughly 39% below the annual average in DiscoverCars\' 2026 data, and about half the December figure. November is close behind. Late January to mid-March is the sweet spot: cheap cars, empty roads and the mountain villages behind Benidorm at their best.' },
    { q: 'Is August really the most expensive month at Alicante?', a: 'Not in the aggregator data. July and August average around £18-£19 a day at ALC, while December is the annual high at around £22, driven by the Christmas and New Year fortnight. Summer is still the busiest period for queues and for automatics selling out, so book ahead - just do not assume it is automatically the dearest.' },
    { q: 'Can I hire a car at Alicante Airport with a debit card?', a: 'Sometimes, but plan for no. Centauro and most international brands want a credit card in the lead driver\'s name, with Centauro\'s deposit block commonly quoted at €1,500. Record Go and OK Mobility do sell no-deposit or full-cover rates that accept an embossed Visa or Mastercard debit card in the lead driver\'s name, but you pay for the cover to get there.' },
    { q: 'Are there tolls when driving from Alicante Airport?', a: 'Mostly no. The AP-7 between the French border and Alicante lost its tolls in 2020-21, so Alicante to Valencia is free. The AP-7 Alicante ring road has been toll-free since July 2024 under a rolling exemption, but the last publicly confirmed end date has passed - check the current status before you travel. Spain has no national vignette.' },
    { q: 'Do I need the V-16 beacon in my hire car in 2026?', a: 'Yes. Since 1 January 2026 the DGT-connected V-16 beacon replaces warning triangles on Spanish-registered vehicles, and your hire car has Spanish plates. Check it is physically in the car before you drive off - the fine for not carrying an approved unit is €80, and it is the driver who gets stopped.' },
    { q: 'What fuel policy should I book at Alicante Airport?', a: 'Full-to-full, every time. Prepaid or \'full-to-empty\' tanks are sold at the supplier\'s own per-litre rate, usually above pump price, often with a non-refundable service charge, and unused fuel is not refunded. Decline the upgrade at the counter, fill up on the N-338 or N-332 a few kilometres out, and keep the receipt.' },
    { q: 'Will I be fined for driving into Alicante or Elche city centre?', a: 'Alicante\'s low emission zone only enforces permanently in Anillo I, the Casco Antiguo, Monday to Friday 07:00-20:00, with a €200 fine reduced to €100 if paid early. Elche\'s ZBE has technically been in force since 31 December 2025 but currently has no active restrictions or sanctions. Spanish hire cars carry a DGT environmental sticker, so check the windscreen at pick-up.' },
    { q: 'Can I take my Alicante hire car to Portugal?', a: 'Only if you declare it. Cross-border use and ferry travel must be authorised in advance and usually carries a daily fee, which is not standardised between suppliers - ask before you book. Driving across undeclared can void all cover, including third-party liability.' },
    { q: 'How far is Elche from Alicante Airport?', a: 'About 21 km, roughly 20 minutes - closer than Alicante city itself. The UNESCO palm grove and the Basilica de Santa Maria make it one of the easiest half-days from the airport, and most visitors drive straight past it.' },
    ],

    honestTake: 'If your trip is a beach week in Benidorm, central Alicante or Torrevieja, do not hire a car. The €4.60 airport bus, the €2.80 TRAM and your feet will cover it, and you will save the fuel, the parking, the excess cover and the deposit block. We earn nothing when you take the tram - we would still rather tell you than sell you seven days of parked car.',

    relatedHotelPost: 'best-hotels-alicante-2026',
    relatedFlightPost: 'flights-to-alicante-from-uk-2026',
  },
  {
    slug: 'malaga-airport',
    airport: 'Malaga Airport',
    iata: 'AGP',
    plc: 3376,
    place: 'Malaga',
    region: 'Costa del Sol',
    country: 'Spain',

    seoTitle: 'Car Hire Malaga Airport 2026: Compare Prices, No Fees | JetMeAway',
    metaDescription: 'Compare Malaga Airport car hire in one search. Honest 2026 price ranges, AP-7 toll costs, ZBE fines, shuttle vs in-terminal desks. No booking fee.',
    h1: 'Car Hire at Malaga Airport (AGP): The Honest 2026 Guide',
    intro: 'Booked ahead, a small car at Malaga Airport typically lands somewhere in the £10-£45 a day range depending on the month, the car class and how early you book - KAYAK UK puts the AGP average around £31 a day across all car types. The two things that decide your real cost are the fuel policy and whether your supplier is in the terminal or on a shuttle, not the headline rate. JetMeAway compares Malaga car hire across EconomyBookings and Trip.com in one search, and we are paid by the supplier, so there is no booking fee and no markup on your side.',

    typicalPrice: '£10-£45 a day',
    cheapestMonths: '',
    priciestMonths: '',

    suppliers: [],
    desks: 'In-terminal, no shuttle: Avis, Budget, Sixt, Europcar, Hertz, Firefly, Goldcar/InterRent and Record Go all hold desks in the linked T2/T3 arrivals complex. Sources disagree on whether OK Mobility counts as in-terminal or sits in the P1 car park - check your voucher rather than trusting either claim.',

    sections: [
    {
      h2: 'What car hire actually costs at Malaga Airport',
      body: [
        'KAYAK UK\'s AGP data puts the average at around £31 a day across all car types and seasons, with January the cheapest month at around £10 a day and July the most expensive at around £17 a day for the classes it tracks.',
        'Skyscanner\'s AGP figures show May at around £31 a day against a yearly average near £41. Note the disagreement honestly: Skyscanner names May as the cheapest month, KAYAK names January. Aggregators do not agree on AGP, which is exactly why you compare two or three.',
        'A real live example: Dollar\'s own site was showing around £35 a day for a seven-day mid-August 2026 rental at AGP. That sits at the top of the plausible band, not the middle.',
        'Peak July and August for a small car realistically sits around £20-£45 a day booked ahead. Larger cars, automatics and 7-seaters go well above that and sell out first.',
        'Low season (mid-January to February, and November outside the Christmas fortnight) is roughly £5-£15 a day. TravelSupermarket\'s \'from £3.52 a day\' headline is genuine, but it is the cheapest off-site supplier with a full-to-empty fuel policy and a large excess.',
        'Then add the cover: the supplier\'s own super-CDW at the desk is typically £15-£30 a day, while a UK standalone excess policy bought before you fly usually works out around £5-£12 a day for a single trip. On a cheap booking the desk product can cost more than the car.',
        'These are ranges to sanity-check a quote, never a price promise. Search live for your dates.',
      ],
    },
    {
      h2: 'Where the desks are, and where the car actually is',
      body: [
        'In-terminal, no shuttle: Avis, Budget, Sixt, Europcar, Hertz, Firefly, Goldcar/InterRent and Record Go all hold desks in the linked T2/T3 arrivals complex. Sources disagree on whether OK Mobility counts as in-terminal or sits in the P1 car park - check your voucher rather than trusting either claim.',
        'Malaga has renumbered this area over the years, so different guides say \'Terminal 3 ground floor\' and others \'Terminal 2 floor -1\'. In practice it is one connected arrivals complex: follow the \'Alquiler de coches / Car hire\' signs.',
        'Even in-terminal brands do not hand you the car at the desk. Reserved pick-up bays are on levels 0 and -1 of car park P2, a short walk from the counters.',
        'Returns are generally directed to levels -1 and -2 of car park P1, where most companies run a key-drop booth so you do not have to walk back to the terminal.',
        'Off-site suppliers cluster on Avenida Garcia Morato (the main airport access road), the Villa Rosa industrial estate just past the N-340, and the San Julian estate. All run a free courtesy shuttle from a signed \'shuttle bus / autobus de cortesia\' stop outside the terminal, generally on the far side near the train station.',
        'The transfer itself is short - Enterprise/Alamo/National publish about a 5-minute ride with buses roughly every 10 minutes, and Centauro runs every 10-15 minutes. Realistically budget about 30 minutes door-to-car including the walk, the wait and the paperwork, and more when several UK flights land together.',
        'Practical rule: if you land late at night, are travelling with small children, or have a tight return flight, pay a little more for an in-terminal desk. If you are price-driven and flexible, off-site is usually cheaper.',
      ],
    },
    {
      h2: 'Which suppliers operate at AGP',
      body: [
        'In-terminal desks: Avis, Budget, Hertz, Firefly, Europcar, Sixt, Goldcar/InterRent, Record Go. OK Mobility is listed as in-terminal by some sources and in P1 by others.',
        'Off-site with a free shuttle: Centauro (behind the Renfe station), Enterprise, Alamo and National (all three share one office at Avenida Comandante Garcia Morato 22 and one shuttle), Delpaso, Flizzr, Keddy by Europcar, Malagacar.com and a large number of smaller local firms including long-established Helle Hollis.',
        'Enterprise is off-site at Malaga, not in the terminal - a common assumption that costs people 30 minutes.',
        'Which?\'s 2026 car hire research found that 46% of people who paid damage charges said the damage was already there at pick-up, and that Goldcar accounted for over a quarter of complaints received with Europcar at around 15%. Both trade heavily at Malaga. That is not a reason to avoid them outright, but it is a reason to photograph everything.',
        'Which? also found nearly one in five renters queued 30 minutes or longer. In busy periods at AGP, 45-90 minutes at the budget desks is a realistic worst case.',
        'We only name suppliers we can verify at AGP. If a brand is not listed here, we could not confirm it.',
      ],
    },
    {
      h2: 'UK driver rules in Spain, 2026',
      body: [
        'A UK photocard driving licence is all you need. GOV.UK\'s country table for Spain says plainly: you do not need an IDP.',
        'If you still hold an old-style paper licence, FCDO advice is to update it to a photocard. If your licence was issued in Gibraltar, Jersey, Guernsey or the Isle of Man, you will need a 1968 International Driving Permit for Spain - treat that as required, not as a supplier quirk.',
        'Bring your passport as well as your licence. Spanish desks routinely ask for both, plus the card the booking was made on.',
        'Minimum age is typically 21 at AGP with a licence held at least 12 months (Avis states 21 at Malaga Airport). Premium, large or automatic categories often require 23 or 25. Under-25s pay a daily young-driver surcharge that is rarely in the headline price - confirm the exact figure before booking, because it can double a cheap rental.',
        'Drive on the right, overtake on the left, give way to the left at roundabouts.',
        'Speed limits: 120 km/h motorways, 90 km/h main roads, 50 km/h built-up areas, 30 km/h on single-lane urban roads. Cameras are heavily used along the A-7 corridor.',
        'Drink-drive limit is 0.05% BAC (0.25 mg/l breath) - lower than England, Wales and Northern Ireland - and 0.03% for drivers with under two years\' experience.',
        'V-16 beacon: since 1 January 2026 the connected V-16 replaces warning triangles in Spain, and Spanish rental fleets are equipping them. If it is missing, the driver carries the €80 liability, not the rental company. Check at pick-up and refuse the car without one.',
        'TOLLS: the AP-7 Costa del Sol (Malaga-Marbella-Estepona-Algeciras) is a genuine toll road and has NOT been de-tolled. Do not confuse it with the AP-7 in Catalonia and Valencia, which went free. Booths take cash, card or Via-T.',
        'Summer tariffs on the AP-7 Costa del Sol run 1 June to 30 September 2026 - not mid-June, which catches people out in the first fortnight of June. Indicative 2026 figures: Malaga-Marbella (Calahonda plaza) about €5.70 normal and €9.25 summer; Marbella-Estepona about €3.85 and €6.25; the full Malaga-Guadiaro/Manilva run about €11.60 normal rising to about €19.55 in summer, a 68% jump.',
        'The free alternative is the A-7 coastal motorway, which parallels the AP-7 the whole way. It costs nothing but is slower, busier and has far more junctions and roundabouts, especially Fuengirola-Marbella and around Estepona.',
        'Malaga city\'s low emission zone covers around 437 hectares of the centre, Soho and port area, monitored by more than 130 cameras and smart traffic lights reading plates in real time. The grace period ended in November 2025 and fines are live at €200, reduced to €100 if paid within 20 days. From 30 November 2026 vehicles with only a B (yellow) label registered outside Malaga become banned, so ask the desk to confirm the car\'s environmental label if you plan to drive into the centre.',
      ],
    },
    {
      h2: 'The fuel policy trap at Malaga',
      body: [
        'Full-to-full is the fair policy and is standard with the mainstream in-terminal brands and the better local firms. You collect a full tank, return it full, and pay pump prices for what you used.',
        'Full-to-empty (lleno-vacio) is the trap, and it is very common on the cheap headline rates. You pay the rental company for a full tank at their own price, typically above pump price, plus a non-refundable refuelling service charge - and you are supposed to bring it back empty. Nobody ever does, so you gift them the leftover fuel.',
        'Watch the detail even at in-terminal brands: Record Go\'s full-to-empty policy applies unless the hire is three days or shorter. In-terminal does not automatically mean safe on fuel.',
        'Goldcar\'s \'Flex Fuel\' variant refunds unused litres but keeps a non-refundable service fee, so it is still worse than full-to-full.',
        'Filter for full-to-full when you book, even if it costs a few pounds more per day, and budget for the refuel.',
        'There are petrol stations on the airport approach road and along the N-340/A-7, so topping up before return is easy. Leave 15 minutes for it and keep the printed ticket - several suppliers want a fuel receipt from a station close to the airport as proof.',
      ],
    },
    {
      h2: 'Excess, deposits and insurance',
      body: [
        'Basic Spanish rentals include CDW and theft cover but with a large excess (franquicia). Published AGP deposit tables typically start around €300 for the smallest car groups and step up to roughly €2,000-€2,200 for the largest.',
        'That amount is pre-authorised - blocked, not charged - on a credit card in the lead driver\'s name at pick-up. You need the credit headroom available.',
        'The desk will push their own super-CDW, \'Premium\' or zero-excess product hard, typically £15-£30 a day. It genuinely does cut the excess to zero and shrink the deposit block, but on a cheap booking it can exceed the cost of the car.',
        'The cheaper route for UK renters is a standalone annual European excess policy bought before you fly, typically around £40-£60 a year or roughly £5-£12 a day for a single trip. The catch: you still let the rental company block the excess, then claim back from your own insurer if you are charged.',
        'Card trap: most AGP suppliers require a real credit card in the main driver\'s name. Cards branded \'debit\', \'Electron\', \'Maestro\' or prepaid are frequently refused. Some suppliers will rent on a Visa or Mastercard debit card but then either take the deposit as an actual charge or force you into their own insurance. If you only have a debit card, book with a supplier that explicitly states debit acceptance and read the deposit terms first.',
        'Damage trap: Which?\'s 2026 research found 46% of people who paid damage charges said the damage was already there at pick-up. Photograph and video the whole car, wheels, windscreen, roof and interior in the P2 car park before you drive off, get every mark noted on the check-out sheet, and at return insist on an inspection and photograph the signed damage report.',
      ],
    },
    {
      h2: 'Common traps at Malaga Airport',
      body: [
        'Booking an off-site supplier without realising it. Look for \'shuttle bus\' or \'meet and greet\' in the terms before you book, and budget about 30 minutes door-to-car, more when several flights land together.',
        'Queues at the budget desks in July and August, and on Friday evenings and weekend mornings, because multiple brokers feed the same handful of counters. 45-90 minutes is a realistic busy-period figure.',
        'Full-to-empty fuel sold as a bargain. The £4 a day car with a full-to-empty tank often ends up dearer than the £12 a day full-to-full one.',
        'Debit card refusal at the desk collapsing a booking that looked confirmed online.',
        'Pre-existing damage not logged. Alloy scuffs, windscreen chips and roof marks are the classics at Malaga. If it is not on the check-out sheet with photos, it becomes yours.',
        'The desk upsell script - claims that the included cover is inadequate, that the block will freeze your card for weeks, or that your third-party excess policy is invalid in Spain. You can decline politely.',
        'Malaga\'s ZBE. Driving into the centre to drop a bag or find a restaurant can trigger a €200 camera fine (€100 if paid within 20 days), passed on by the rental company with an admin fee on top, often months later.',
        'Assuming the AP-7 is free because \'Spain abolished AP-7 tolls\'. That was Catalonia and Valencia. The Costa del Sol AP-7 still charges, and charges substantially more from 1 June to 30 September.',
        'Parking in the resorts. Marbella old town, Nerja and central Malaga are hard and expensive, and many older Costa del Sol apartment blocks have no parking. Confirm your accommodation has a space before you commit to a car.',
        'Taking the car to Gibraltar or Portugal without written authorisation. A daily fee applies and it is not standardised between suppliers, so ask. Ferries to Morocco are typically banned outright, and driving into Gibraltar uninsured voids your cover.',
        'Under-25 surcharges applied at the desk rather than shown in the online headline price.',
        'One-way fees. Returning to a different Spanish city, or leaving the car at a hotel rather than the airport, can add a large charge.',
        'Missing the V-16 beacon. Since January 2026 it is required, and the €80 liability sits with the driver.',
      ],
    },
    {
      h2: 'Best drives and day trips from Malaga Airport',
      body: [
        'Ronda, about 1h30 inland via the A-357 and A-367 - the Puente Nuevo gorge bridge, the old bullring and white-village landscape. The single most popular self-drive day out from the Costa del Sol.',
        'Setenil de las Bodegas, 20 minutes beyond Ronda - houses built into the overhanging rock. Usually paired with Ronda on the same day.',
        'Granada and the Alhambra, around 1h30 via the A-45/A-92. Alhambra tickets must be booked weeks ahead and do sell out. Park in a city car park, not on the street.',
        'Nerja and Frigiliana, under an hour east on the A-7 - the Balcon de Europa, the Nerja Caves, and one of Andalusia\'s prettiest white villages just above.',
        'Caminito del Rey, about an hour north via Ardales - the restored cliff walkway. Timed tickets sell out well in advance and the route is one-way, so plan the shuttle bus back to your car.',
        'Marbella and Puerto Banus, 40-60 minutes west. Faster on the tolled AP-7, free but slower on the A-7.',
        'Mijas Pueblo, around 40 minutes - a hillside white village directly above Fuengirola with coastal views.',
        'Antequera and El Torcal, about 50 minutes north - UNESCO dolmens and a limestone karst landscape.',
        'Cordoba, roughly 2 hours north on the A-45 - doable in a long day for the Mezquita, better as an overnight.',
        'Seville, around 2h to 2h30 on the A-92/A-45. A stretch for a day trip, but many do it.',
        'Gibraltar, about 1h30 west, but only with written cross-border permission from your rental company. Many people park in La Linea on the Spanish side and walk across instead.',
      ],
    },
    {
      h2: 'Do you actually need a car at Malaga?',
      body: [
        'Honest answer: for a lot of Costa del Sol trips, no.',
        'The Cercanias C-1 train runs from a station connected to the terminal into Malaga city centre in about 12 minutes, and the other way along the coast to Torremolinos, Benalmadena and Fuengirola in about 34 minutes end to end, for roughly €1.80-€2.80. It runs every 20 minutes from roughly 07:00 to 21:00 and half-hourly outside those hours, with the last train around 23:30 - worth checking against a late arrival.',
        'If you are staying in Malaga city, Torremolinos, Benalmadena Costa or Fuengirola and mainly want beach, restaurants and a couple of excursions, a car is a liability: you pay for it, you pay to park it, and you cannot drink at lunch. Malaga city is very walkable, has good buses, and a ZBE that actively penalises driving into the centre.',
        'A car IS worth it if you are staying west of Fuengirola (Marbella, Estepona, Sotogrande) or east past Rincon de la Victoria (Torre del Mar, Nerja) where the train does not reach; if you are in an inland villa or rural finca; if you are four or more people, where per-head transfer and tour costs quickly exceed a hire car; or if the trip is built around inland Andalusia - Ronda, Granada, Antequera, El Torcal and the white villages.',
        'The middle path many UK visitors miss: skip the car for the beach half of the trip and hire for just the two or three days you want to go inland. Short rentals are cheap and you avoid a week of parking hassle.',
        'If your resort is walkable and on the train line, do not let anyone talk you into seven days of car hire you will use twice.',
      ],
    },
    {
      h2: 'How to compare Malaga car hire properly',
      body: [
        'Compare the total cost of the trip, not the daily rate: base rate plus fuel policy plus excess cover plus extras plus any under-25 surcharge.',
        'Filter to full-to-full first. It is the single biggest hidden cost at AGP and it reorders the whole results list.',
        'Read whether each quote is in-terminal or shuttle, and price the shuttle time as a real cost if you land late or have small children.',
        'If you plan to drive west, add the AP-7 tolls to your budget and remember the summer tariff runs 1 June to 30 September, or plan on the free A-7 and accept the extra time.',
        'Check the card rules before booking: credit card in the lead driver\'s name, and whether the deposit is a block or an actual charge.',
        'Price the desk\'s zero-excess product against a UK standalone annual policy for your dates. The standalone is usually cheaper and broader, but only works if you have the credit limit for the block.',
        'Open two or three comparison sites for identical dates and car class. KAYAK and Skyscanner do not even agree on which month is cheapest at AGP, so one search is never enough.',
        'JetMeAway shows EconomyBookings and Trip.com side by side for Malaga. We are paid an affiliate commission by the supplier - never a booking fee, never a markup on you.',
      ],
    },
    ],

    faqs: [
    { q: 'Which car hire companies are inside Malaga Airport terminal?', a: 'Avis, Budget, Sixt, Europcar, Hertz, Firefly, Goldcar/InterRent and Record Go hold desks in the linked T2/T3 arrivals complex. Sources conflict on OK Mobility - some list it as in-terminal, others place it in the P1 car park. Centauro, Enterprise, Alamo, National, Delpaso, Flizzr, Keddy, Malagacar.com and Helle Hollis are off-site with a shuttle.' },
    { q: 'Where do I collect and return the car at Malaga Airport?', a: 'In-terminal brands park their cars in reserved bays on levels 0 and -1 of car park P2, a short walk from the desks. Returns are generally directed to levels -1 and -2 of car park P1, where most companies have a key-drop booth so you do not have to walk back to the terminal.' },
    { q: 'Is Enterprise in the terminal at Malaga Airport?', a: 'No. Enterprise, Alamo and National share a single off-site office at Avenida Comandante Garcia Morato 22, served by one shared shuttle. The ride itself is about 5 minutes with buses roughly every 10 minutes, but budget around 30 minutes door-to-car including the walk, the wait and the paperwork.' },
    { q: 'How long will I queue for car hire at Malaga Airport?', a: 'In busy periods, 45-90 minutes at the budget desks is realistic, because several brokers feed the same handful of counters. Which?\'s 2026 survey found nearly one in five renters queued 30 minutes or longer. Friday evenings and weekend mornings in July and August are the worst.' },
    { q: 'How much is car hire at Malaga Airport?', a: 'KAYAK UK puts the AGP average around £31 a day across all car types, with January cheapest at around £10 a day and July around £17 for the classes it tracks. Skyscanner shows a yearly average nearer £41 with May around £31. A small car in peak summer realistically sits around £20-£45 a day booked ahead. Always price your own dates - these are ranges, not quotes.' },
    { q: 'When is car hire cheapest at Malaga Airport?', a: 'The aggregators disagree, which is itself useful to know: KAYAK names January as the cheapest month, Skyscanner names May. Mid-January to February and November are consistently low. Late April to May and late September to October are the best all-round value, with prices well below August and much better weather for inland driving.' },
    { q: 'Do I need an International Driving Permit for Spain on a UK licence?', a: 'No - GOV.UK\'s country table for Spain says you do not need an IDP with a UK photocard licence. If you hold an old-style paper licence, FCDO advice is to update it to a photocard. If your licence was issued in Gibraltar, Jersey, Guernsey or the Isle of Man, you will need a 1968 IDP.' },
    { q: 'Is the AP-7 on the Costa del Sol still a toll road?', a: 'Yes. The AP-7 Costa del Sol between Malaga, Marbella, Estepona and Algeciras still charges - do not confuse it with the AP-7 in Catalonia and Valencia, which went toll-free. Booths take cash, card or Via-T. The free alternative is the parallel A-7 coastal motorway, which is slower and busier.' },
    { q: 'How much are the AP-7 tolls from Malaga in summer 2026?', a: 'Summer tariffs run 1 June to 30 September 2026. Indicative figures: Malaga to Marbella (Calahonda plaza) around €5.70 normal and €9.25 summer; Marbella to Estepona around €3.85 and €6.25; the full Malaga to Guadiaro/Manilva run around €11.60 normal rising to about €19.55 in summer. Note the summer rate starts on 1 June, not mid-June.' },
    { q: 'Will I be fined for driving into central Malaga?', a: 'You can be. Malaga\'s low emission zone covers around 437 hectares of the centre, Soho and port area, monitored by more than 130 cameras and smart traffic lights. Enforcement went live in November 2025 with a €200 fine, reduced to €100 if paid within 20 days. From 30 November 2026, vehicles with only a B (yellow) label registered outside Malaga are banned - ask the desk to confirm the car\'s label.' },
    { q: 'Do I need the V-16 beacon in my Malaga hire car?', a: 'Yes. Since 1 January 2026 the connected V-16 beacon replaced warning triangles in Spain, and Spanish rental fleets are equipping them. If it is missing, the driver carries the €80 liability - so check at pick-up and refuse the car without one.' },
    { q: 'Can I hire a car at Malaga Airport with a debit card?', a: 'Often not. Most AGP suppliers require a real credit card in the main driver\'s name, and cards branded debit, Electron, Maestro or prepaid are frequently refused. Some suppliers do accept a Visa or Mastercard debit card, but then either take the deposit as an actual charge or require you to buy their own insurance. Check the supplier\'s deposit terms before you book.' },
    { q: 'What fuel policy should I book at Malaga Airport?', a: 'Full-to-full. Full-to-empty means you buy a tank at the supplier\'s price plus a non-refundable service charge and get nothing back for unused fuel. Watch the detail even at in-terminal brands - Record Go\'s full-to-empty policy applies unless your hire is three days or shorter, and Goldcar\'s Flex Fuel refunds unused litres but keeps a non-refundable fee.' },
    { q: 'Can I take a Malaga hire car to Gibraltar or Portugal?', a: 'Only with written authorisation from your rental company, and a daily cross-border fee normally applies. The amount is not standardised between suppliers, so ask before booking. Ferries to Morocco are typically banned outright. Many people avoid the issue by parking in La Linea and walking into Gibraltar.' },
    { q: 'Do I need a car if I am staying in Fuengirola or Torremolinos?', a: 'Probably not. The Cercanias C-1 train runs from a station connected to the terminal along the coast to Torremolinos, Benalmadena and Fuengirola in about 34 minutes end to end for roughly €1.80-€2.80, and into Malaga city in about 12 minutes. It runs every 20 minutes from around 07:00 to 21:00 and half-hourly outside those times. A better plan is often to hire for just the two or three days you want to go inland.' },
    ],

    honestTake: 'If you are staying on the train line - Malaga city, Torremolinos, Benalmadena Costa or Fuengirola - a week of car hire is usually the wrong buy, and we will say so even though we earn nothing from the €2.80 train ticket. And if you do drive west, budget the AP-7 tolls properly: the summer tariff starts on 1 June, not mid-June, which is exactly the detail most guides get wrong.',

    relatedHotelPost: 'best-hotels-malaga-2026',
    relatedFlightPost: 'flights-to-malaga-from-uk-2026',
  },
  {
    slug: 'faro-airport',
    airport: 'Faro Airport',
    iata: 'FAO',
    plc: 2971,
    place: 'Faro',
    region: 'the Algarve',
    country: 'Portugal',

    seoTitle: 'Car Hire Faro Airport 2026: Compare Prices, No Fees | JetMeAway',
    metaDescription: 'Compare Faro Airport car hire in one search. 2026 price ranges by month, P4 walk vs shuttle, A22 tolls now free, fuel traps. No booking fee.',
    h1: 'Car Hire at Faro Airport (FAO): The Honest 2026 Guide',
    intro: 'Booked ahead, a small car at Faro Airport typically runs somewhere around £10-£20 a day in winter and £45-£70 a day at the peak of August, with the shoulder months in between - and the single biggest variable after your dates is whether your supplier is a two-minute walk to Car Park 4 or a shuttle ride to an off-airport depot. The good news for 2026: the A22 along the whole Algarve has been toll-free since January 2025, so no transponder is needed for Algarve driving. JetMeAway compares Faro car hire across EconomyBookings and Trip.com in one search, paid by the supplier, with no booking fee and no markup added to your price.',

    typicalPrice: '£10-£20 a day',
    cheapestMonths: '',
    priciestMonths: '',

    suppliers: [],
    desks: 'Faro has one passenger terminal, so the layout is simple - but the split between walk-out and shuttle is the thing UK renters get wrong most often.',

    sections: [
    {
      h2: 'What car hire actually costs at Faro Airport',
      body: [
        'Be upfront about sourcing: we could not verify an authoritative published 2026 price table for FAO. The month-by-month bands below come from one Algarve guide site\'s published euro ranges converted to sterling, so treat them as indicative shape, not fact.',
        'Deep winter (November to February): roughly £10-£20 a day for a small economy hatchback booked ahead.',
        'Spring and autumn (March, May, October): roughly £20-£40 a day, with an Easter spike in April.',
        'June and September: roughly £25-£40 a day. July: roughly £38-£65. August, the peak of peak: roughly £45-£70, and larger cars, automatics or 7-seaters sit well above that.',
        'Headline comparison-site rates of \'from £1.67 a day\' and \'from £9 a day\' are genuine, but they are teaser rates from shuttle-depot budget brands with a large excess and a big card hold. They are not what a typical family pays.',
        'Walking up to a desk in summer without a booking commonly costs two to three times the pre-booked rate, if anything is available at all.',
        'Do not quote any of these as a price. Run a live search for your exact dates and car class.',
      ],
    },
    {
      h2: 'Where the desks are, and where the car actually is',
      body: [
        'Faro has one passenger terminal, so the layout is simple - but the split between walk-out and shuttle is the thing UK renters get wrong most often.',
        'Group one, arrivals-hall desks: Avis, Budget, Hertz, Europcar, Enterprise, Alamo, National, Sixt, InterRent, Firefly, Dollar, Thrifty, Keddy and Guerin have counters in the arrivals hall. You do the paperwork there, then walk to the cars.',
        'The cars are not under the terminal. They sit in Car Park 4 (P4), reached by turning LEFT out of arrivals and walking past the Departures entrance - around 250 m. No shuttle involved.',
        'Group two, P4-based offices: Auto Jardim, AirAuto, Drive on Holidays, Luzcar, AV Rent a Car, Best Deal, Bravacar, Orbita, Zitauto and Yes Car Hire work from offices in the P4 building rather than the arrivals hall. Same 250 m walk - you just need to know to walk out rather than queue in the hall.',
        'Group three, genuine shuttle: Centauro meets you at a signposted MEETING POINT in arrivals, walks you to the shuttle bay on the right-hand side of P4, and buses you to an off-airport office on Rua Francisco Assis, Faro. Green Motion, Klass Wagen and MasterKings are also commonly shuttle or meet-and-greet, though listings conflict on the detail.',
        'Goldcar is the genuinely ambiguous one: some Faro sources list an in-terminal desk, others describe a shuttle to a nearby office. Do not assume either way.',
        'Because brands move tier year to year and brokers sometimes reassign you, treat your booking voucher as the authority - it states the collection method. Airport information desk: +351 289 800 617.',
      ],
    },
    {
      h2: 'Which suppliers operate at FAO',
      body: [
        'Arrivals-hall desks with cars in P4: Avis, Budget, Hertz, Europcar, Enterprise, Alamo, National, Sixt, InterRent, Firefly, Dollar, Thrifty, Keddy by Europcar, Guerin.',
        'Offices inside the P4 car park: Auto Jardim, AirAuto, Drive on Holidays, Luzcar, AV Rent a Car, Best Deal, Bravacar, Orbita, Zitauto, Yes Car Hire.',
        'Shuttle or meet-and-greet to an off-airport depot: Centauro (office on Rua Francisco Assis, Faro), and commonly Green Motion, Klass Wagen and MasterKings.',
        'Sources conflict on Goldcar\'s tier at Faro - some list a terminal desk, some a shuttle. Check the voucher.',
        'Goldcar and InterRent operate together at Faro and carry the heaviest complaint volume on the Faro travel forums, with recurring themes of aggressive excess-waiver selling at the desk, fuel service charges, disputed damage charges appearing later and slow deposit refunds. That is forum anecdote rather than data, but it is consistent enough to go in prepared: photos, credit card, and a firm no.',
        'We only list brands we could actually verify at FAO.',
      ],
    },
    {
      h2: 'UK driver rules in Portugal, 2026',
      body: [
        'A UK photocard driving licence is accepted in Portugal - no International Driving Permit is required. This is confirmed by UK FCDO travel advice. The only exception is an old paper-only licence with no photo: upgrade to a photocard or carry an IDP alongside it.',
        'Carry your passport as well as your licence. Portuguese rental desks routinely ask for a second photo ID.',
        'Most suppliers require the licence to have been held at least 1 year, and some ask 2-3 years for larger cars.',
        'Minimum age is typically 21 at Faro, with some suppliers renting from 19 (Enterprise) and larger or premium categories usually needing 25+. Drivers aged 21-24 pay a young-driver surcharge typically in the €10-€40 per day band, varying widely by supplier - confirm the exact figure and whether it is capped before you book.',
        'A credit card in the MAIN DRIVER\'S OWN NAME is effectively mandatory for the security deposit. Debit cards are frequently refused, or accepted only if you buy the supplier\'s own full-cover package. Visa and Mastercard are the reliably accepted networks.',
        'TOLLS: the A22 \'Via do Infante\', the motorway running the length of the Algarve, has been FREE for cars since 1 January 2025 under Law 37/2024, and remains free in 2026. The gantries still stand but no longer charge. Any guide telling you to rent a toll transponder for Algarve driving is out of date.',
        'If you drive north to Lisbon on the A2, that road still charges - but it is a conventional barrier toll: take a ticket on entry, pay on exit, with cash, contactless card or Via Verde accepted. Lisbon to the Algarve is around €23.80 each way for a normal car from 1 January 2026. No transponder needed.',
        'Drive on the right. Speed limits: 50 km/h in towns, 90 km/h on ordinary roads, 100 km/h on expressways (vias reservadas - dual carriageways that are not motorways), and 120 km/h on motorways. That 100 km/h tier catches UK drivers out because it is missing from most guides.',
        'Drink-drive limit is 0.5 g/l, dropping to 0.2 g/l for drivers who have held a licence under 3 years - well below the 0.08% limit in England and Wales. Enforcement is strict. In practice: do not drink at all if you are driving.',
        'Seatbelts are compulsory front and rear. Children under 12 and under 135 cm must use an appropriate child restraint in the rear.',
        'Roundabouts: traffic already on the roundabout has priority, but lane discipline on multi-lane roundabouts is loose - expect drivers to exit from the inside lane.',
        'Taking the car into Spain (for Seville, say) is usually permitted by the majors but MUST be declared in advance. Expect a cross-border charge commonly in the €60-€150 range, or a per-day structure such as €15 a day capped around €195. Confirm with your supplier - undeclared cross-border travel can void your cover entirely.',
        'The \'UK\' sticker requirement applies to your own British-plated car, not to a Portuguese hire car.',
      ],
    },
    {
      h2: 'The fuel policy trap at Faro',
      body: [
        'Full-to-full is the norm at the in-terminal majors and it is the policy you want: collect a full tank, return it full, pay only for what you actually used.',
        'The trap, pushed hard by budget and shuttle brands at Faro, is full-to-empty, sometimes sold as \'pre-paid fuel\' or \'fuel service\'. You buy a whole tank up front at the supplier\'s own per-litre price - routinely above forecourt price - plus a non-refundable service charge, and any fuel left in the tank when you hand the keys back is simply lost.',
        'Most Algarve holidays do not consume a full tank, so full-to-empty almost always costs you money. Filter for full-to-full at the booking stage rather than arguing about it at the desk.',
        'Second, smaller trap: returning a full-to-full car short of full means paying for the missing litres plus a refuelling service fee. Check the exact fee in your supplier\'s T&Cs before you gamble on it.',
        'The nearest filling station is a Moeve (formerly CEPSA), roughly 1 km out on the main airport approach road, before the main roundabout and P4. It operates a pre-pay system, which makes topping up to exactly full awkward.',
        'Practical fix: fill up properly a few miles out on the N125 or A22, keep the printed receipt, and use the airport station only for a small top-up.',
      ],
    },
    {
      h2: 'Excess, deposits and insurance',
      body: [
        'Standard Portuguese rentals include basic cover but leave an insurance excess, and the card hold placed at the desk reflects it. Excess and deposit levels vary widely by car class, supplier and how much cover you decline - read the specific T&Cs rather than trusting a typical figure.',
        'The desk will offer to reduce that excess to zero. That is the upsell, and it is where Faro\'s complaint volume comes from.',
        'The cheaper route for a UK renter is a standalone excess reimbursement policy bought before you fly: UK single-trip European cover starts from around £3.50 a day, and annual European policies from under £30 with some brokers to around £42 with others.',
        'Which? has consistently found standalone cover both cheaper and broader than desk cover - it typically adds tyres, windscreen, wheels, keys and misfuelling, which basic desk waivers often exclude.',
        'The catch you must plan for: standalone cover is reimbursement, not waiver. The rental company still blocks the full excess on your credit card, and if there is damage you pay them first and claim it back afterwards.',
        'So you need a credit card in the main driver\'s name with real headroom, and you should expect the desk to push back. Some staff will imply your policy is worthless. It isn\'t - but you must be able to absorb the hold.',
        'If you genuinely cannot cover the hold, buying the supplier\'s own product is the pragmatic choice. Book it online in advance with the supplier rather than at the counter, where it is usually dearer.',
      ],
    },
    {
      h2: 'Common traps at Faro Airport',
      body: [
        'Not knowing whether your booking is an arrivals desk, a P4 office or a shuttle depot. Cheap broker bookings very often mean a shuttle. Read the collection method on your voucher before you book, not after you land.',
        'Assuming Centauro is in the terminal. At Faro it is a meet-at-the-meeting-point, walk-to-P4-shuttle-bay, ride-to-Rua-Francisco-Assis operation.',
        'The deposit shock. Turning up with a debit card, or a credit card with a small limit, is the most common way a Faro pickup collapses at the desk.',
        'Full-to-empty fuel. On an Algarve week you rarely burn a full tank, so the unused fuel is a straight gift to the supplier.',
        'Phantom or pre-existing damage. Faro fleets are heavily used and most cars already carry scuffs. Film a slow walk-around video before leaving P4 - all four corners, both bumpers, all alloys, windscreen, roof, plus the fuel gauge and odometer - and do it again at drop-off. Timestamped video is the only thing that reliably wins a dispute.',
        'Paying for a toll transponder you do not need. Desks still sell \'toll device\' add-ons. For Algarve-only driving the A22 is free, so it is dead money. Only take one if you genuinely plan to drive north beyond the Algarve, and even then the A2 booths take cards.',
        'Refuelling at the last minute at the pre-pay Moeve station on the airport approach - you cannot know exactly what the tank will take.',
        'Underestimating the return. Faro\'s departures side gets extremely congested in summer. Allow a full 3 hours before a peak-season flight: fuel stop, P4 return, inspection, then security.',
        'Parking at the other end. In July and August, Albufeira Old Town, Lagos and the popular beach car parks (Praia da Marinha, Benagil) fill by mid-morning. A hire car does not solve the day, it just moves the queue.',
        'Assuming the excess waiver you bought online is accepted at the desk. Third-party UK policies are reimbursement products: the supplier still blocks the full excess on your credit card.',
      ],
    },
    {
      h2: 'Best drives and day trips from Faro Airport',
      body: [
        'Olhao, about 12 km and 15 minutes east - working fishing town, market halls and ferries into the Ria Formosa barrier islands.',
        'Tavira, about 35 km and 30 minutes east - the quiet, less-developed Algarve, Roman bridge and church-filled old town.',
        'Lagos, about an hour west - walled old town and the Ponta da Piedade cliffs. The best all-rounder day out.',
        'Benagil and Carvoeiro, about 50 minutes - the famous sea cave, reachable only by boat or kayak from Benagil or Praia da Marinha.',
        'Sagres and Cape St Vincent, about 1h30 - the south-western tip of Europe, fortress and huge Atlantic cliffs.',
        'Monchique and Foia, about an hour - the Algarve\'s mountain interior, the highest point in the region, cooler air and eucalyptus forest.',
        'Silves, about 45 minutes - red sandstone Moorish castle and cathedral, inland and uncrowded.',
        'Portimao and Alvor, about 50 minutes - Praia da Rocha, boardwalks and seafood on the quayside.',
        'Estoi and the Milreu Roman ruins, about 15 minutes - the easiest half-day, mosaics and a rococo palace just north of the airport.',
        'Vilamoura and Quinta do Lago, about 25 minutes - marina, golf and upmarket restaurants.',
        'Vila Real de Santo Antonio and the Ayamonte ferry, about 50 minutes - cross the Guadiana by boat into Spain for lunch.',
        'Costa Vicentina, Odeceixe and Aljezur, about 1h15 - wild west-coast surf beaches and a completely different Algarve.',
        'Seville, Spain, about 2h to 2h30 via the A22 and Guadiana bridge - very doable as a long day, but you MUST declare cross-border use to the rental company first.',
      ],
    },
    {
      h2: 'Do you actually need a car at Faro?',
      body: [
        'Honest answer: for a lot of Faro trips, no - and we would rather say so than sell you a car you leave in a hotel car park.',
        'If you are staying in Faro city, Lagos, Tavira, Olhao or Portimao, those towns are walkable and sit on the Algarve rail line (Lagos-Faro-Vila Real de Santo Antonio), so you genuinely do not need a car.',
        'For a one-week beach or all-inclusive break in Albufeira or Vilamoura in July or August, a car is usually the wrong buy: peak hire plus fuel plus a parking fight in Albufeira Old Town, versus a pre-booked private transfer priced per vehicle rather than per person.',
        'Bus option: the Aerobus route 56 runs from Faro Airport along the coast - about €11 to Albufeira and about €17 to Lagos, with Portimao in between. Roughly eight departures a day from May to October, dropping to about three in winter.',
        'Train option, honestly: Faro Airport has NO railway station. You must first reach Faro city station about 6 km away by circuit 16 bus (about €2.25), taxi (about €11-€16) or transfer (about €20), then take the regional train (about €3.30) to Albufeira-Ferreiras - which is itself about 7 km by road from Albufeira centre. Door-to-door it is not the bargain it looks.',
        'Uber and Bolt operate across the Algarve, which covers the occasional evening out without a car.',
        'Hire a car when: you are in a villa or somewhere outside a resort centre; you are four or more people, where per-vehicle transfers stop being cheap once you need a second car; you actually want the west - Sagres, Odeceixe, Monchique, Praia da Marinha - which public transport reaches badly or not at all; or you are travelling November to March, when hire drops to roughly £10-£20 a day and the Aerobus thins to about three departures daily.',
        'Two things that genuinely help the case for driving: the A22 along the whole Algarve has been toll-free since January 2025 and remains so, and the roads are easy for a UK driver - short distances, clear signage, nothing intimidating.',
        'Summary: peak-summer resort break, take the transfer. Shoulder or winter, or anything exploratory, hire the car.',
      ],
    },
    {
      h2: 'How to compare Faro car hire properly',
      body: [
        'Compare the total, not the daily rate: base rate plus fuel policy plus excess cover plus extras plus any young-driver surcharge.',
        'Filter to full-to-full before anything else. At Faro this is the single biggest hidden cost.',
        'Check the collection method on every quote - arrivals desk, P4 office, or shuttle depot - and treat shuttle time as a real cost if you land late or travel with small children.',
        'Ignore any quote that bundles a toll transponder for Algarve-only driving. The A22 is free.',
        'Check the card rules before you book: credit card in the main driver\'s name is effectively mandatory, and you need headroom for the excess block.',
        'Price the desk\'s zero-excess product against a UK standalone policy - single-trip cover from around £3.50 a day, annual European policies from under £30 to around £42 depending on broker. Which? finds standalone cover cheaper and broader, but it reimburses rather than waives.',
        'Open two or three comparison sites for identical dates and car class. Faro pricing swings hard with lead time, especially into July and August.',
        'JetMeAway shows EconomyBookings and Trip.com side by side for Faro. We are paid an affiliate commission by the supplier, so there is no booking fee and no markup on your price.',
      ],
    },
    ],

    faqs: [
    { q: 'Where do I pick up my hire car at Faro Airport?', a: 'For the arrivals-hall brands, you do the paperwork in the terminal then walk to Car Park 4 (P4): turn LEFT out of arrivals, past the Departures entrance, roughly 250 m. No shuttle needed. A second group of local brands has offices inside the P4 building itself, so you skip the arrivals hall entirely and walk straight out.' },
    { q: 'Which car hire companies are in the Faro arrivals hall?', a: 'Avis, Budget, Hertz, Europcar, Enterprise, Alamo, National, Sixt, InterRent, Firefly, Dollar, Thrifty, Keddy and Guerin have desks in arrivals with cars in P4. Auto Jardim, AirAuto, Drive on Holidays, Luzcar, AV Rent a Car, Best Deal, Bravacar, Orbita, Zitauto and Yes Car Hire operate from offices in the P4 car park.' },
    { q: 'Is Centauro in the terminal at Faro Airport?', a: 'No. At Faro, Centauro is a shuttle operation: a rep meets you at a signposted meeting point in arrivals, walks you to the shuttle bay on the right-hand side of P4, and buses you to an off-airport office on Rua Francisco Assis in Faro. Budget extra time, especially in July and August.' },
    { q: 'Do I need a toll transponder for driving in the Algarve in 2026?', a: 'No. The A22 Via do Infante, the motorway running the length of the Algarve, has been free for cars since 1 January 2025 under Law 37/2024 and is still free in 2026. The gantries remain but no longer charge. Decline any \'toll device\' add-on at the desk if you are staying in the Algarve.' },
    { q: 'What does it cost to drive from Faro to Lisbon on the A2?', a: 'The A2 north to Lisbon still charges, but it is a conventional barrier toll - take a ticket on entry and pay on exit with cash, contactless card or Via Verde. From 1 January 2026 the Lisbon-Algarve run is around €23.80 each way for a normal car. No transponder required.' },
    { q: 'How much is car hire at Faro Airport?', a: 'Indicatively, roughly £10-£20 a day in deep winter, £20-£40 in spring and autumn, and around £45-£70 a day at the peak of August for a small economy hatchback booked ahead. We could not verify an authoritative 2026 price table for FAO, so treat these as shape rather than fact and always run a live search for your dates.' },
    { q: 'When is car hire cheapest at Faro Airport?', a: 'Mid-November through February is cheapest by a wide margin, with January and February the floor. March and late October to early November are the best value compromise - still cheap, roughly 18-20°C in March and low 20s in late October, and everything is open.' },
    { q: 'Do I need an International Driving Permit for Portugal?', a: 'No. UK FCDO advice confirms a UK photocard licence is accepted in Portugal without an IDP. The only exception is an old paper-only licence with no photo: either upgrade to a photocard or carry an IDP alongside it. Bring your passport too - Portuguese desks routinely ask for a second photo ID.' },
    { q: 'Can I hire a car at Faro Airport with a debit card?', a: 'Usually not. A credit card in the main driver\'s own name is effectively mandatory for the security deposit at Faro. Debit cards are frequently refused, or accepted only if you buy the supplier\'s own full-cover package. Visa and Mastercard are the reliably accepted networks.' },
    { q: 'What is the minimum age to hire a car at Faro Airport?', a: 'Typically 21, though some suppliers rent from 19 (Enterprise) and larger or premium categories usually require 25 or over. Drivers aged 21-24 pay a young-driver surcharge, commonly in the €10-€40 per day band depending on supplier and car class - confirm the exact figure and any cap before booking, because it can transform a cheap rental.' },
    { q: 'Where is the nearest petrol station to Faro Airport?', a: 'A Moeve station (formerly branded CEPSA) sits roughly 1 km out on the main airport approach road, before the main roundabout and P4. It uses a pre-pay system, which makes filling to exactly full awkward. Better to fill up properly on the N125 or A22 a few miles out, keep the receipt, and use the airport station only for a top-up.' },
    { q: 'What fuel policy should I book at Faro Airport?', a: 'Full-to-full. The alternative - full-to-empty, sometimes sold as pre-paid fuel or a fuel service - means buying a tank at the supplier\'s own per-litre price plus a non-refundable service charge, with no refund for what you do not burn. Most Algarve holidays never use a full tank, so it almost always costs you money.' },
    { q: 'Can I drive my Faro hire car to Seville?', a: 'Usually yes with the major suppliers, but it must be declared in advance. Expect a cross-border charge commonly in the €60-€150 range, or a per-day structure such as €15 a day capped around €195. Confirm with your supplier before you book - undeclared cross-border travel can void your cover entirely.' },
    { q: 'Is there a train from Faro Airport to Albufeira?', a: 'Not directly - Faro Airport has no railway station. You first reach Faro city station about 6 km away by circuit 16 bus (about €2.25), taxi (about €11-€16) or transfer (about €20), then take the regional train (about €3.30) to Albufeira-Ferreiras, which is about 7 km by road from Albufeira centre. The Aerobus route 56 at about €11 is usually simpler.' },
    { q: 'Do I need a car for a week in Albufeira?', a: 'Usually not in July or August. Peak hire plus fuel plus the Old Town parking fight is a poor trade against a per-vehicle private transfer, the €11 Aerobus, and Uber or Bolt for evenings. In winter it flips: hire drops to roughly £10-£20 a day and the Aerobus thins to about three departures daily, so a car can cost less than two transfers.' },
    ],

    honestTake: 'Do not pay for a toll transponder at the Faro desk. The A22 along the entire Algarve has been free since January 2025 and remains free in 2026, yet suppliers still sell toll add-ons and plenty of guides still tell you to buy one. That single \'no\' at the counter is worth more to you than any discount we could find - and we earn nothing from it.',

    relatedHotelPost: 'best-hotels-algarve-2026',
  },
];

export function getCarHireLocation(slug: string): CarHireLocation | undefined {
  return CAR_HIRE_LOCATIONS.find(l => l.slug === slug);
}
