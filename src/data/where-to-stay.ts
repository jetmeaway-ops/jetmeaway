/**
 * "Where to stay in <city>" — neighbourhood comparison data.
 *
 * Built 2026-08-18 from the one keyword set that survived review of the
 * external SEO audit: the "best area to stay in X" / "best neighbourhoods in X"
 * family. Those terms are low-difficulty and bottom-of-funnel — the searcher has
 * already chosen the city and is choosing a postcode — which is the opposite of
 * the head terms ("cheapest hotel booking site", "best hotels in Paris") we
 * cannot rank for at our current authority.
 *
 * Rules this file follows, deliberately:
 *  - `citySlug` MUST match a slug in src/data/destinations.ts. The page pulls
 *    hero image, IATA, average nightly price and flight time from there, so the
 *    two pages can never drift apart.
 *  - NO invented per-area prices. Areas carry a relative band only
 *    (Premium / Mid-range / Value); the only £ figure on the page is the city
 *    average that already ships in destinations.ts.
 *  - Every `watchOut` is a real downside. A guide where all five areas are
 *    wonderful helps nobody choose, and choosing is the entire search intent.
 */

export type PriceBand = 'Premium' | 'Mid-range' | 'Value';

export interface StayArea {
  name: string;
  /** anchor id — kebab-case, unique within the city */
  slug: string;
  band: PriceBand;
  /** one short phrase: who this area is for */
  bestFor: string;
  /** 2–3 sentences on what the area actually is */
  summary: string;
  /** what you can reach on foot from here */
  walk: string;
  /** the honest reason NOT to book here */
  watchOut: string;
}

export interface WhereToStayCity {
  /** must match a slug in DESTINATIONS */
  citySlug: string;
  /** the trade-off this city forces on you, in 2–3 sentences */
  intro: string;
  /** the short answer, shown above the fold */
  verdict: {
    firstTime: string;
    value: string;
    families: string;
    nightlife: string;
    couples: string;
  };
  /** airport → centre, in one sentence */
  airport: string;
  areas: StayArea[];
  faqs: { q: string; a: string }[];
}

export const WHERE_TO_STAY: WhereToStayCity[] = [
  {
    citySlug: 'paris',
    intro:
      'Paris is numbered, not named — the 20 arrondissements spiral clockwise from the Louvre, and the number tells you most of what you need to know about price and pace. Single digits are central, expensive and quiet at night; double digits are cheaper, livelier and further out. The Seine is the other axis: Right Bank for shopping, museums and nightlife, Left Bank for cafés, gardens and the older student city.',
    verdict: {
      firstTime: 'Le Marais',
      value: 'Canal Saint-Martin',
      families: 'Saint-Germain-des-Prés',
      nightlife: 'Le Marais',
      couples: 'Montmartre',
    },
    airport:
      'From Charles de Gaulle (CDG) the RER B reaches Châtelet–Les Halles in about 35 minutes; from Orly (ORY) the Orlyval plus RER B takes roughly 40. Taxis from CDG are a fixed fare — €56 to the Right Bank, €65 to the Left — so refuse any driver who quotes their own price.',
    areas: [
      {
        name: 'Le Marais',
        slug: 'le-marais',
        band: 'Mid-range',
        bestFor: 'A first trip to Paris',
        summary:
          'The 3rd and 4th arrondissements, and the part of central Paris that Haussmann never flattened — so the streets still bend. It holds the Place des Vosges, the Picasso Museum, the old Jewish quarter along Rue des Rosiers and most of the city’s LGBTQ+ nightlife inside one walkable square.',
        walk: 'Notre-Dame, the Pompidou Centre, Île Saint-Louis and the Seine are all within 20 minutes on foot.',
        watchOut:
          'Saturday is shoulder-to-shoulder on Rue des Francs-Bourgeois, and the medieval street plan means small rooms and, often, no lift. Many Jewish-quarter shops close Saturday and open Sunday, which catches people out.',
      },
      {
        name: 'Saint-Germain-des-Prés',
        slug: 'saint-germain-des-pres',
        band: 'Premium',
        bestFor: 'Families and calm evenings',
        summary:
          'The 6th, on the Left Bank — the literary Paris of Café de Flore and Les Deux Magots, now mostly galleries, design shops and quiet money. It is the most reliably calm central district after dark, which is exactly why it suits families and light sleepers.',
        walk: 'The Louvre over the Pont du Carrousel, the Musée d’Orsay, the Luxembourg Gardens and Île de la Cité.',
        watchOut:
          'The highest room rates per square metre in the city, and it goes quiet early — a drink past midnight means walking or taking the Metro somewhere else.',
      },
      {
        name: 'Montmartre',
        slug: 'montmartre',
        band: 'Mid-range',
        bestFor: 'Couples and a view',
        summary:
          'The 18th, on the only real hill in Paris, crowned by Sacré-Cœur. Step away from the square of portrait painters and it is still a village of steep lanes, small squares and the last working vineyard inside the city.',
        walk: 'Sacré-Cœur, Place du Tertre, the Moulin Rouge and the Abbesses cafés.',
        watchOut:
          'It is a hill, and you will climb it several times a day with luggage — much of it has no step-free route. Pigalle at the foot is loud and seedy at night, and the streets directly below Sacré-Cœur have a persistent scam problem.',
      },
      {
        name: 'Canal Saint-Martin',
        slug: 'canal-saint-martin',
        band: 'Value',
        bestFor: 'The best value near the centre',
        summary:
          'The 10th, strung along an iron-footbridge canal that Parisians picnic beside on summer evenings. It is the clearest value gap in inner Paris: two Metro stops from République, a fraction of the 6th on price, and full of independent coffee and natural-wine places rather than tourist menus.',
        walk: 'République, the canal locks, and the Marais in about 20 minutes.',
        watchOut:
          'Not a monument district — you commute to the sights every day. The blocks nearest Gare du Nord and Stalingrad are rough after dark, so pick your street, not just the area.',
      },
      {
        name: 'Latin Quarter',
        slug: 'latin-quarter',
        band: 'Mid-range',
        bestFor: 'Walkers on a budget',
        summary:
          'The 5th, the student city since the 12th century, wrapped around the Sorbonne and the Panthéon. It has the highest density of small, older, cheaper hotels of any central arrondissement, plus the Jardin des Plantes and the Rue Mouffetard market street.',
        walk: 'Notre-Dame, the Panthéon, the Luxembourg Gardens and Shakespeare and Company.',
        watchOut:
          'The restaurant strips right behind Notre-Dame — Rue de la Huchette and around — are tourist traps with touts outside. Walk five minutes further in for the real thing.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Paris for a first visit?',
        a: 'Le Marais. It is central enough to walk to Notre-Dame, the Seine and the Pompidou, it has its own restaurants and nightlife so you are not commuting for dinner, and it survived Haussmann so it looks like the Paris people picture. If quiet evenings matter more than nightlife, cross the river to Saint-Germain-des-Prés instead.',
      },
      {
        q: 'Which arrondissement should I avoid staying in?',
        a: 'No district is genuinely off-limits to a visitor, but the streets immediately around Gare du Nord and Barbès (10th and 18th) are the ones UK visitors most often regret booking — cheap rates, tired hotels and an uncomfortable walk back at night. The far outer arrondissements (19th, 20th) are fine and cheap but add a long Metro ride to everything.',
      },
      {
        q: 'Is it cheaper to stay outside central Paris?',
        a: 'Yes, but by less than you would expect, and Metro fares plus lost time eat the difference on a short break. The better move is a cheaper central-adjacent district — Canal Saint-Martin in the 10th, or the 11th around Oberkampf — which cuts the rate meaningfully while keeping you a short walk or two stops from the centre.',
      },
      {
        q: 'Left Bank or Right Bank?',
        a: 'Right Bank for museums, shopping, the Marais and most nightlife; Left Bank for cafés, gardens, bookshops and quieter nights. On a first trip the Right Bank puts more of the famous list within walking distance; on a second trip the Left Bank is the more pleasant place to actually sleep.',
      },
      {
        q: 'How many nights do you need in Paris?',
        a: 'Three nights covers the headline sights without rushing — one for the Louvre and the Right Bank, one for the Left Bank and a park, one loose. Four or five lets you add Versailles or a day with no plan, which is when the neighbourhood you like sitting in matters more than proximity to the Eiffel Tower.',
      },
    ],
  },
  {
    citySlug: 'london',
    intro:
      'London is not one city centre but several, and the real choice is which side of it you want to wake up in. West (Kensington, Marylebone) is grand, calm and expensive; central (Soho, Covent Garden) walks to almost everything and is loud; east (Shoreditch) is cheaper, younger and better for food; south of the river is the value play with the best views back across it.',
    verdict: {
      firstTime: 'Covent Garden & Soho',
      value: 'Southwark & Bankside',
      families: 'South Kensington',
      nightlife: 'Shoreditch & Hoxton',
      couples: 'Marylebone & Fitzrovia',
    },
    airport:
      'Heathrow (LHR) is the Piccadilly line in about 50 minutes or the Elizabeth line to Paddington in 30; Gatwick (LGW) is the Gatwick Express to Victoria in 30; Stansted (STN) and Luton (LTN) are 45–60 minutes by train and further out than they look on a map.',
    areas: [
      {
        name: 'Covent Garden & Soho',
        slug: 'covent-garden-soho',
        band: 'Premium',
        bestFor: 'A first trip and the theatre',
        summary:
          'The genuine middle of London — every West End theatre, the Piazza, Chinatown and Seven Dials inside a fifteen-minute walk. If your trip is a list of famous things plus a show, staying here removes the transport question entirely.',
        walk: 'Trafalgar Square, the National Gallery, the British Museum, and the South Bank over Waterloo Bridge.',
        watchOut:
          'The noisiest central district by a distance — Friday and Saturday in Soho run to 3am under the windows. Rooms are small for the money and almost nothing here has parking.',
      },
      {
        name: 'South Kensington',
        slug: 'south-kensington',
        band: 'Premium',
        bestFor: 'Families with children',
        summary:
          'Museum London: the Natural History, Science and V&A museums sit in a row, all free to enter, all a few minutes apart. Add Hyde Park at the top of the road and it is the one central district built for a rainy week with children.',
        walk: 'All three museums, Hyde Park, Kensington Gardens and the Royal Albert Hall.',
        watchOut:
          'Very quiet at night and priced like the postcode it is. The grand white terraces mean narrow stairs and basement rooms in the cheaper hotels.',
      },
      {
        name: 'Shoreditch & Hoxton',
        slug: 'shoreditch-hoxton',
        band: 'Mid-range',
        bestFor: 'Food and nightlife',
        summary:
          'East London’s old furniture district, now the densest run of bars, street food and street art in the city, with Brick Lane and Spitalfields Market on its southern edge. Better value than the West End and a far better dinner.',
        walk: 'Brick Lane, Spitalfields, Columbia Road flower market on Sundays, and the City skyline.',
        watchOut:
          'Weekend nights are genuinely loud and the crowd is young — the wrong choice with small children or an early flight. It is also a 20–30 minute walk or a Tube ride from the classic sights.',
      },
      {
        name: 'Southwark & Bankside',
        slug: 'southwark-bankside',
        band: 'Mid-range',
        bestFor: 'The best value still walkable to the sights',
        summary:
          'The south bank of the Thames between Tower Bridge and Waterloo, with Borough Market, Tate Modern, Shakespeare’s Globe and the Shard on the doorstep. Rates run below the equivalent room across the river, for a walk of ten minutes over a bridge.',
        walk: 'Tate Modern, Borough Market, the Globe, Tower Bridge, and St Paul’s over the Millennium Bridge.',
        watchOut:
          'It is a business and commuter district, so some streets are dead on a Sunday evening — and Borough Market itself closes Sundays and shuts early most days.',
      },
      {
        name: 'Marylebone & Fitzrovia',
        slug: 'marylebone-fitzrovia',
        band: 'Premium',
        bestFor: 'Couples who want quiet and central',
        summary:
          'The best compromise in the city: a village high street of independent shops, Regent’s Park at the top and Oxford Street at the bottom, but residential enough to sleep in. Fitzrovia next door has the restaurants without Soho’s volume.',
        walk: 'Regent’s Park, Oxford Street, the Wallace Collection, the British Museum and Soho.',
        watchOut:
          'Priced accordingly, and the Baker Street end fills with queues for the waxworks. Very little budget stock — the cheap rooms here are small chain hotels on the busy roads.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in London for first-time visitors?',
        a: 'Covent Garden or the edge of Soho. Nearly every headline sight is walkable, the theatres are on your street, and you avoid spending the trip underground. If the budget will not stretch, Southwark on the south bank gives you most of the same walking radius for less.',
      },
      {
        q: 'Which are the cheapest areas to stay in central London?',
        a: 'Southwark, Elephant & Castle, Whitechapel, King’s Cross and Paddington consistently price below the West End while staying inside Zone 1. Zone 2 — Hammersmith, Stratford, Greenwich — saves more again, but budget 30–40 minutes each way plus the cost of daily travel.',
      },
      {
        q: 'Is it worth staying near a Tube station?',
        a: 'Yes, and it matters more than the district. A five-minute walk to a station on a line that serves your plans beats a fashionable postcode you have to bus out of. Check which line, not just the distance — the Elizabeth, Victoria and Jubilee lines cross the city fastest.',
      },
      {
        q: 'Where should families stay in London?',
        a: 'South Kensington, for the three free museums and Hyde Park in one place. Bloomsbury is the runner-up — quieter streets, garden squares, the British Museum and better value than Kensington. Both let you get back to the room mid-afternoon, which is the thing that saves a family trip.',
      },
      {
        q: 'Is staying outside London and travelling in a good idea?',
        a: 'Only for a longer trip with a car, or if you are visiting someone. Peak-time returns from the commuter belt for a family, plus the time cost, usually wipe out the saving against a Zone 2 hotel — and you lose the evenings.',
      },
    ],
  },
  {
    citySlug: 'amsterdam',
    intro:
      'Amsterdam is small — most of the centre is a 30-minute walk end to end — so you are not choosing for distance, you are choosing for noise. The canal ring inside the Singelgracht is beautiful and busy; the districts just outside it are where the city actually lives, cost less, and are still ten minutes away by tram or bike.',
    verdict: {
      firstTime: 'Canal Ring (Grachtengordel)',
      value: 'De Pijp',
      families: 'Oud-Zuid & Museum Quarter',
      nightlife: 'De Pijp',
      couples: 'Jordaan',
    },
    airport:
      'Schiphol (AMS) to Amsterdam Centraal is a direct train every ten minutes, 15–20 minutes door to door, running through the night. A taxi is roughly €45–55 and is usually slower in traffic.',
    areas: [
      {
        name: 'Jordaan',
        slug: 'jordaan',
        band: 'Premium',
        bestFor: 'Couples and slow mornings',
        summary:
          'The old working-class quarter west of the Prinsengracht, now the prettiest and quietest part of central Amsterdam. Narrow canals, courtyard almshouses, brown cafés and the Saturday Noordermarkt — it is the district people picture when they say they liked Amsterdam.',
        walk: 'The Anne Frank House, the Nine Streets shopping lanes, Westerpark and the main canal ring.',
        watchOut:
          'Very little hotel stock — the Jordaan is mostly homes, so rooms are few, small and priced for scarcity. The canal-house stairs are famously near-vertical.',
      },
      {
        name: 'Canal Ring (Grachtengordel)',
        slug: 'canal-ring',
        band: 'Premium',
        bestFor: 'A first visit, everything on foot',
        summary:
          'The UNESCO-listed horseshoe of 17th-century canals — Herengracht, Keizersgracht, Prinsengracht — that is the reason most people come. Staying inside it means the postcard is your walk to breakfast.',
        walk: 'The Anne Frank House, the Nine Streets, Dam Square, Rembrandtplein and the flower market.',
        watchOut:
          'The eastern edge shades into the Red Light District and Rembrandtplein, which are loud and messy every night of the week. Check exactly which canal, and which end of it, before booking.',
      },
      {
        name: 'De Pijp',
        slug: 'de-pijp',
        band: 'Mid-range',
        bestFor: 'The best value and the best eating',
        summary:
          'Just south of the ring, built as workers’ housing and now the city’s best food district, anchored by the Albert Cuyp street market. Cheaper than the canals, full of bars that are busy on a Tuesday, and a ten-minute tram from Centraal.',
        walk: 'Albert Cuyp Market, Sarphatipark, the Heineken Experience and the Museum Quarter.',
        watchOut:
          'You are outside the postcard, so every canal photo is a walk away, and the main strips get loud on summer evenings.',
      },
      {
        name: 'Oud-Zuid & Museum Quarter',
        slug: 'oud-zuid-museum-quarter',
        band: 'Premium',
        bestFor: 'Families and museums',
        summary:
          'Wide streets, big apartments, and the Rijksmuseum, Van Gogh Museum and Stedelijk around one green square with the Vondelpark alongside. The calmest central-ish option and the easiest with a pushchair.',
        walk: 'All three major museums, the Vondelpark, and the designer stretch of P.C. Hooftstraat.',
        watchOut:
          'Quiet to the point of dull in the evening, and priced as the city’s smartest residential district. The museum square itself is a building site of queues in summer.',
      },
      {
        name: 'Amsterdam-Noord',
        slug: 'amsterdam-noord',
        band: 'Value',
        bestFor: 'The cheapest beds with a real link in',
        summary:
          'Across the IJ, reached by a free passenger ferry that runs around the clock from behind Centraal station. Former shipyards turned into film museums, food halls and festival grounds — genuinely cheaper rooms, and the crossing takes two minutes.',
        walk: 'The EYE Filmmuseum, the A’DAM Lookout, and the NDSM yard by a second ferry.',
        watchOut:
          'Industrial and spread out — pleasant by day, empty at night, and you need the ferry or a bike for everything. Not the choice if you want to walk home from dinner.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Amsterdam for first-timers?',
        a: 'The Canal Ring, on the western side towards the Jordaan. You are inside the UNESCO canals, walking distance from the Anne Frank House and the Nine Streets, and away from the noise of Rembrandtplein and the Red Light District on the eastern edge.',
      },
      {
        q: 'Which Amsterdam neighbourhoods are best value?',
        a: 'De Pijp for the balance of price, food and a short tram ride in; Amsterdam-Noord for the lowest rates, with a free 24-hour ferry doing the commuting; and Oost around the Oosterpark for quiet residential streets well below canal prices.',
      },
      {
        q: 'Should I avoid staying near the Red Light District?',
        a: 'Avoid it if you want to sleep. It is safe and heavily policed, but the streets around De Wallen are loud, crowded and messy every night, and the hotel stock is the city’s tiredest for the price. One canal further west is a completely different trip.',
      },
      {
        q: 'Do I need to stay in the centre of Amsterdam?',
        a: 'No — the city is small and the tram and bike network is excellent, so De Pijp, Oost or Noord costs less and adds ten or fifteen minutes. The centre is worth paying for only if walking home along a canal is the point of the trip.',
      },
      {
        q: 'Is Amsterdam walkable between neighbourhoods?',
        a: 'Yes. Centraal station to the Museum Quarter is about 35 minutes on foot and passes most of what you came for. Trams cover the same ground in ten, and hiring a bike costs less than a day of tram tickets — though the centre is not the place to learn.',
      },
    ],
  },
  {
    citySlug: 'rome',
    intro:
      'Rome packs its sights into a small historic core, but that core is expensive and, in high summer, relentless. The real decision is whether you pay for the postcode and walk everywhere, or cross the river to Trastevere or Prati for a calmer evening and a shorter bill.',
    verdict: {
      firstTime: 'Centro Storico',
      value: 'Monti',
      families: 'Prati',
      nightlife: 'Trastevere',
      couples: 'Trastevere',
    },
    airport:
      'Fiumicino (FCO) runs the Leonardo Express to Termini in 32 minutes, with a fixed €55 taxi fare to anywhere inside the Aurelian Walls. Ciampino (CIA) is bus-only, about 40 minutes to Termini, with a fixed €40 taxi fare.',
    areas: [
      {
        name: 'Centro Storico',
        slug: 'centro-storico',
        band: 'Premium',
        bestFor: 'A first trip, everything on foot',
        summary:
          'The bend of the Tiber holding the Pantheon, Piazza Navona, the Trevi Fountain and the Spanish Steps. There is no Metro inside it, which is rather the point — you walk, and the walk is the trip.',
        walk: 'The Pantheon, Piazza Navona, Trevi, Campo de’ Fiori and the Spanish Steps.',
        watchOut:
          'The highest prices in Rome, and no Metro station — arriving and leaving with luggage over cobbles is awkward. The streets around Trevi are close to impassable by mid-morning.',
      },
      {
        name: 'Trastevere',
        slug: 'trastevere',
        band: 'Mid-range',
        bestFor: 'Couples and dinner',
        summary:
          'Across the Tiber, the old working village of Rome — ivy, cobbles, and the densest run of family trattorias inside the walls. The best evening district in the city, and cheaper than the Centro Storico for a walk of fifteen minutes.',
        walk: 'Santa Maria in Trastevere, the Ponte Sisto into the centre, and the Gianicolo viewpoint uphill.',
        watchOut:
          'North of Viale di Trastevere is loud until 2am Thursday to Saturday; south of it is residential and quiet. Pick your side of that road deliberately.',
      },
      {
        name: 'Monti',
        slug: 'monti',
        band: 'Mid-range',
        bestFor: 'The best value inside the walls',
        summary:
          'The wedge between the Colosseum and Termini — Rome’s oldest inhabited quarter and now its most likeable, full of vintage shops, small wine bars and a piazza where people actually sit. Close to a Metro, cheaper than the centre, ten minutes from the Forum.',
        walk: 'The Colosseum, the Roman Forum, Santa Maria Maggiore and the Cavour Metro.',
        watchOut:
          'The blocks nearest Termini station are noticeably scruffier — check the map before booking. Monti’s own streets are steep and cobbled.',
      },
      {
        name: 'Prati',
        slug: 'prati',
        band: 'Mid-range',
        bestFor: 'Families and quiet nights',
        summary:
          'North of the Vatican, a planned 19th-century grid of wide pavements, real supermarkets and the city’s best everyday shopping street. Roman families live here, and it is the easiest district in Rome with a pushchair.',
        walk: 'St Peter’s Basilica, the Vatican Museums, Castel Sant’Angelo and the Piazza del Popolo over the bridge.',
        watchOut:
          'Calm to the point of quiet after 10pm, and the least Roman-looking part of Rome — no cobbles, no ruins, just handsome apartment blocks.',
      },
      {
        name: 'Aventino & Testaccio',
        slug: 'aventino-testaccio',
        band: 'Value',
        bestFor: 'Food, and getting away from the crowds',
        summary:
          'South of the Circus Maximus: the Aventine hill is orange groves, monasteries and the famous keyhole view of St Peter’s; Testaccio below it is the old slaughterhouse district and the best food neighbourhood in Rome.',
        walk: 'The Circus Maximus, the Testaccio market, the Pyramid and the Protestant Cemetery.',
        watchOut:
          'A genuine 25–35 minutes on foot from the Pantheon, so it is a Metro-and-tram trip rather than a stroll. Thin hotel stock — most beds here are apartments and small B&Bs.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Rome for sightseeing?',
        a: 'Centro Storico, if the budget allows — the Pantheon, Navona, Trevi and the Spanish Steps are all a walk away and you never touch public transport. Monti is the value alternative: slightly further out, on a Metro stop, and ten minutes from the Colosseum.',
      },
      {
        q: 'Is Trastevere a good place to stay in Rome?',
        a: 'Yes, especially on a second trip or as a couple — the best dinner scene in the city, and cheaper than the historic centre. The one thing that decides whether you enjoy it is which side of Viale di Trastevere your room is on: north is nightlife, south is sleep.',
      },
      {
        q: 'Should I stay near Termini station?',
        a: 'Only for a very early train or a tight budget. It is the cheapest central-ish area and well connected, but the immediate streets are the least pleasant in tourist Rome. Monti is a ten-minute walk away and a completely different neighbourhood.',
      },
      {
        q: 'Where should families stay in Rome?',
        a: 'Prati. Wide flat pavements, proper supermarkets, quiet evenings, and the Vatican within walking distance — without the cobbles and steps that make the historic centre hard work with a pushchair.',
      },
      {
        q: 'Is it better to stay near the Colosseum or the Vatican?',
        a: 'Near the Colosseum. The Monti and Celio side puts you within walking reach of the Forum, the Pantheon and the Centro Storico. The Vatican sits at the western edge of the city, so staying beside it means crossing Rome every morning.',
      },
    ],
  },
  {
    citySlug: 'barcelona',
    intro:
      'Barcelona runs uphill from the sea, and the further from the water you go the more it becomes a working Catalan city rather than a holiday one. The old town is dense, medieval and loud; the Eixample above it is a calm grid of Modernista apartment blocks; the beach districts are convenient but the least interesting place to spend an evening.',
    verdict: {
      firstTime: 'Eixample',
      value: 'Gràcia',
      families: 'Eixample',
      nightlife: 'El Born & Gothic Quarter',
      couples: 'Gràcia',
    },
    airport:
      'El Prat (BCN) is the Aerobús to Plaça Catalunya in about 35 minutes, or the L9 Sud metro with one change. A taxi from the rank runs roughly €35–40 to the centre and takes 25 minutes without traffic.',
    areas: [
      {
        name: 'Eixample',
        slug: 'eixample',
        band: 'Mid-range',
        bestFor: 'A first trip, and families',
        summary:
          'The 19th-century grid above the old town, with chamfered corners, wide pavements and the Sagrada Família, Casa Batlló and La Pedrera among its apartment blocks. Central without being medieval — flat, quiet at night, and easy with luggage or a pushchair.',
        walk: 'The Sagrada Família, Passeig de Gràcia, Casa Batlló, and the top of Las Ramblas.',
        watchOut:
          'Large and slightly anonymous — get the wrong block and it is offices and traffic. The Dreta side near Passeig de Gràcia is the pleasant half; the Esquerra side is cheaper and plainer.',
      },
      {
        name: 'El Born & Gothic Quarter',
        slug: 'el-born-gothic-quarter',
        band: 'Mid-range',
        bestFor: 'Nightlife and atmosphere',
        summary:
          'The medieval city: stone lanes barely wide enough for two, the cathedral, the Picasso Museum and Santa Maria del Mar. El Born is the smarter, better-fed half; the Gothic Quarter is older, denser and busier.',
        walk: 'The cathedral, the Picasso Museum, Santa Maria del Mar, Las Ramblas and the marina.',
        watchOut:
          'Noise bounces off stone until the early hours, and this is the epicentre of Barcelona’s pickpocketing. Rooms are small and dark by the nature of the buildings.',
      },
      {
        name: 'Gràcia',
        slug: 'gracia',
        band: 'Value',
        bestFor: 'Best value and a local evening',
        summary:
          'A separate village until 1897 and it still behaves like one — small squares full of tables, independent shops, and almost no coach tours. Prices sit well below the old town and Park Güell is a walk uphill.',
        walk: 'Park Güell, Plaça del Sol, Plaça de la Vila de Gràcia, and Passeig de Gràcia downhill.',
        watchOut:
          'A 25–30 minute walk or two metro stops from the Gothic Quarter, and further still from the beach. The squares are lively late on summer nights, which is charming until it is your window.',
      },
      {
        name: 'Barceloneta & Port Olímpic',
        slug: 'barceloneta-port-olimpic',
        band: 'Mid-range',
        bestFor: 'The beach on your doorstep',
        summary:
          'The old fishermen’s triangle beside the city beach, all narrow blocks and seafood restaurants, running east into the Olympic marina. The only part of Barcelona where you can swim before breakfast.',
        walk: 'The city beaches, the marina, the Barceloneta market and El Born in fifteen minutes.',
        watchOut:
          'Packed and noisy all summer, and the beachfront restaurants are among the worst value in the city. The blocks themselves are cramped, with little shade.',
      },
      {
        name: 'Sant Antoni & Poble-sec',
        slug: 'sant-antoni-poble-sec',
        band: 'Value',
        bestFor: 'Eating well for less',
        summary:
          'The strip between the Eixample and Montjuïc — a restored market hall, the tapas run along Carrer de Blai, and rents that keep the bars local. It has quietly become the best-value food area within walking distance of the centre.',
        walk: 'The Sant Antoni market, Carrer de Blai, Las Ramblas, and the Montjuïc cable car.',
        watchOut:
          'Poble-sec is built on a slope, so some streets are a climb. The area immediately around Paral·lel is a wide, traffic-heavy road rather than a stroll.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Barcelona for the first time?',
        a: 'The Eixample, specifically the Dreta half around Passeig de Gràcia. It is central, flat, quiet at night, walking distance to both the old town and the Sagrada Família, and the streets are wide enough that a room actually gets light.',
      },
      {
        q: 'Is it better to stay near the beach or in the centre of Barcelona?',
        a: 'The centre, for almost every trip. The beach is fifteen minutes on foot or five on the metro from most of the old town, so staying in Barceloneta buys you an early swim at the cost of the restaurants, the architecture and the evening.',
      },
      {
        q: 'Which areas of Barcelona are cheapest?',
        a: 'Gràcia, Sant Antoni, Poble-sec and Sants price consistently below the old town and the Eixample while staying inside a 20–30 minute walk or a couple of metro stops. Going further out to Sant Andreu or Poblenou saves more but adds a real commute.',
      },
      {
        q: 'Is Las Ramblas a good place to stay?',
        a: 'No. It is the most crowded, most pickpocketed and worst-value street in the city, and the noise runs all night. Stay two or three streets either side — in El Born, or up in the Eixample — and walk down it when you want to.',
      },
      {
        q: 'Where should families stay in Barcelona?',
        a: 'The Eixample. Flat wide pavements, larger rooms and apartments than the old town can offer, supermarkets on every block, and metro stations close together. Gràcia is the quieter alternative if you do not mind the extra ten minutes.',
      },
    ],
  },
  {
    citySlug: 'lisbon',
    intro:
      'Lisbon is built on hills, and that single fact should drive your choice more than any list of sights. A room 400 metres from dinner can be a 60-metre climb, and the old tram-and-tile districts that look best in photographs are the steepest and the loudest. Decide first whether you want to be in the picture or above it.',
    verdict: {
      firstTime: 'Baixa & Chiado',
      value: 'Príncipe Real',
      families: 'Belém',
      nightlife: 'Bairro Alto & Príncipe Real',
      couples: 'Alfama',
    },
    airport:
      'Humberto Delgado (LIS) sits inside the city — the red metro line reaches the centre in about 20 minutes with one change, and a taxi or rideshare is roughly €12–18 and 15 minutes. It is one of the shortest airport transfers in Europe.',
    areas: [
      {
        name: 'Baixa & Chiado',
        slug: 'baixa-chiado',
        band: 'Mid-range',
        bestFor: 'A first trip, everything flat',
        summary:
          'The grid rebuilt after the 1755 earthquake, running from the river up to Rossio, with the smarter Chiado shopping streets above it. The only genuinely flat part of central Lisbon and the natural base for a first visit.',
        walk: 'Praça do Comércio, Rossio, the Santa Justa lift, Cais do Sodré and the foot of Alfama.',
        watchOut:
          'The most touristed and most pickpocketed part of the city, and the main squares can feel like a thoroughfare rather than a neighbourhood. Rooms on the through-streets get tram noise from early.',
      },
      {
        name: 'Alfama',
        slug: 'alfama',
        band: 'Mid-range',
        bestFor: 'Couples and atmosphere',
        summary:
          'The Moorish quarter that survived the earthquake — a tangle of stairs, washing lines, fado houses and viewpoints under the castle. It is the most beautiful place to sleep in Lisbon and the most awkward to arrive at.',
        walk: 'São Jorge Castle, the Sé cathedral, the Miradouro de Santa Luzia and the 28 tram route.',
        watchOut:
          'Steep steps everywhere, no vehicle access to many doors, and the 28 tram grinds past from early morning. Genuinely hard work with heavy luggage or limited mobility.',
      },
      {
        name: 'Príncipe Real',
        slug: 'principe-real',
        band: 'Premium',
        bestFor: 'Best value at the top end',
        summary:
          'Above Bairro Alto: a leafy garden square, restored townhouses turned into concept shops, and the best cluster of restaurants in the city. Quieter than the nightlife streets below it while being a five-minute walk down into them.',
        walk: 'The Príncipe Real garden, Bairro Alto, the Miradouro de São Pedro de Alcântara and Chiado.',
        watchOut:
          'You are at the top of a hill, so every return is a climb, and it is the priciest non-riverside district. The Bairro Alto edge gets weekend noise carried uphill.',
      },
      {
        name: 'Bairro Alto',
        slug: 'bairro-alto',
        band: 'Value',
        bestFor: 'Nightlife',
        summary:
          'A grid of narrow 16th-century streets that is residential by day and the city’s drinking quarter by night, when the bars open their doors and everybody stands outside them.',
        walk: 'Chiado, Praça Luís de Camões, the Bica funicular and the São Pedro de Alcântara viewpoint.',
        watchOut:
          'Unambiguously loud from Thursday to Saturday until around 3am — this is the wrong choice unless the noise is why you came. Deliveries and street cleaning start not long after it stops.',
      },
      {
        name: 'Belém',
        slug: 'belem',
        band: 'Value',
        bestFor: 'Families and space',
        summary:
          'Six kilometres west along the river, where the monastery, the tower, the modern art museum and the original pastéis de nata bakery sit along a flat riverside stretch of parks and gardens.',
        walk: 'Jerónimos Monastery, Belém Tower, the Padrão dos Descobrimentos and the riverside cycle path.',
        watchOut:
          'It is a separate district, not the city centre — a 20-minute tram or train each way, and it empties in the evening. Good for a calm family base, wrong for a two-night city break.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Lisbon for first-time visitors?',
        a: 'Baixa or Chiado. They sit between the river and the hills, they are flat, and almost everything else — Alfama, Bairro Alto, Cais do Sodré — is a walk or one funicular away. It is the easiest base if you have not seen the city before.',
      },
      {
        q: 'Is Alfama a good place to stay in Lisbon?',
        a: 'It is the most atmospheric district in the city and the hardest to live in for a few days. Stairs instead of streets, no car access to many doors, and the 28 tram passing early. Choose it for a romantic trip with light luggage, not for a family or anyone with mobility issues.',
      },
      {
        q: 'How steep is Lisbon really?',
        a: 'Steep enough that it changes plans. The city runs up seven hills, and the funiculars and the Santa Justa lift exist because walking up is genuinely hard. When comparing hotels, look at the contour, not just the map distance — 400 flat metres and 400 vertical metres are different trips.',
      },
      {
        q: 'Which areas of Lisbon are best value?',
        a: 'Graça and Anjos above Alfama, Estrela and Campo de Ourique to the west, and Belém along the river all price below Baixa and Chiado. Graça in particular gives you the same viewpoints as Alfama for less, at the cost of a longer walk down.',
      },
      {
        q: 'Where should I stay in Lisbon to avoid noise?',
        a: 'Príncipe Real, Estrela, Campo de Ourique or Belém. Avoid Bairro Alto entirely if you want to sleep, avoid Cais do Sodré’s Pink Street, and check whether a Baixa or Alfama room faces the tram route before booking.',
      },
    ],
  },
  {
    citySlug: 'porto',
    intro:
      'Porto is two cities facing each other across the Douro: the old town climbing steeply from the river on the north bank, and Vila Nova de Gaia with the port lodges on the south. Almost everything worth seeing sits within a 25-minute walk of the Dom Luís I bridge, so the choice is about how steep a walk you want it to be.',
    verdict: {
      firstTime: 'Baixa & Aliados',
      value: 'Cedofeita & Bombarda',
      families: 'Foz do Douro',
      nightlife: 'Cedofeita & Bombarda',
      couples: 'Ribeira',
    },
    airport:
      'Francisco Sá Carneiro (OPO) connects by metro line E to the centre in about 30 minutes for a couple of euros, running from early morning to past midnight. A taxi is roughly €25–30 and takes 20 minutes.',
    areas: [
      {
        name: 'Baixa & Aliados',
        slug: 'baixa-aliados',
        band: 'Mid-range',
        bestFor: 'A first trip, best connected',
        summary:
          'The commercial heart around the Avenida dos Aliados, São Bento station and Clérigos tower. It is the flattest central ground in Porto, has the metro on the doorstep, and puts the river a downhill walk away.',
        walk: 'São Bento’s tiled hall, Clérigos tower, Livraria Lello, the Bolhão market and the Ribeira downhill.',
        watchOut:
          'Busy and commercial rather than pretty, and the queues for Livraria Lello wrap around the block. Coming back up from the river at the end of the night is a proper climb.',
      },
      {
        name: 'Ribeira',
        slug: 'ribeira',
        band: 'Premium',
        bestFor: 'Couples and the view',
        summary:
          'The UNESCO-listed riverfront terrace of stacked, painted houses beneath the bridge — the image that sells Porto. Staying here means stepping out of the door into the postcard.',
        walk: 'The Dom Luís I bridge, the Palácio da Bolsa, the port lodges over the water, and river cruises.',
        watchOut:
          'The most expensive and most crowded strip in the city, the restaurants on the quay are aimed squarely at visitors, and every route out is uphill. Rooms in the old houses are small and often damp-smelling.',
      },
      {
        name: 'Cedofeita & Bombarda',
        slug: 'cedofeita-bombarda',
        band: 'Value',
        bestFor: 'Best value and the local evening',
        summary:
          'West of Aliados: the gallery street on Rua Miguel Bombarda, independent shops, and the student bars of Galerias de Paris nearby. Cheaper than the river, flatter than most of the city, and full of places that are open on a Tuesday.',
        walk: 'The Galerias de Paris bar strip, the Soares dos Reis museum, Clérigos and the Crystal Palace gardens.',
        watchOut:
          'A 15–20 minute walk from the Ribeira, and the Galerias streets are loud on weekend nights. Fewer classic river views — this is a working part of town.',
      },
      {
        name: 'Vila Nova de Gaia',
        slug: 'vila-nova-de-gaia',
        band: 'Value',
        bestFor: 'Port lodges and the best view back',
        summary:
          'The south bank, where every port house from Sandeman to Taylor’s has its cellars, and where you get the view of Porto rather than being in it. Often cheaper than the equivalent room across the water.',
        walk: 'The port lodges, the Gaia cable car, the Serra do Pilar viewpoint and Porto over the bridge.',
        watchOut:
          'It is technically a different city and it feels it — quieter, with less to do once the lodges close. Crossing the bridge is a pleasure once and a chore by the fourth time.',
      },
      {
        name: 'Foz do Douro',
        slug: 'foz-do-douro',
        band: 'Premium',
        bestFor: 'Families and sea air',
        summary:
          'Where the river meets the Atlantic — a smart seaside suburb of promenades, gardens, beaches and the city’s best ice cream, reached by a tram that runs along the water from the centre.',
        walk: 'The Atlantic beaches, the Pergola da Foz promenade and the Castelo do Queijo.',
        watchOut:
          'A 25–30 minute tram or bus from the old town, so it is a base rather than a doorstep. Windy and cool even in summer, and the Atlantic here is cold enough to shorten a swim.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Porto for first-timers?',
        a: 'Baixa and Aliados. It is flat by Porto standards, sits on the metro, and puts São Bento, Clérigos and the Bolhão market on your street with the Ribeira a downhill walk away. You get the whole city without paying riverfront prices.',
      },
      {
        q: 'Is it better to stay in Porto or Gaia?',
        a: 'Porto, unless the port lodges are the whole point of the trip. Gaia is often cheaper and has the better view back across the river, but it empties in the evening and everything else means crossing the bridge.',
      },
      {
        q: 'Is the Ribeira worth staying in?',
        a: 'For a short romantic trip, yes — the setting is genuinely special. For anything longer it is expensive, crowded, aimed at visitors, and every walk home is a climb. Staying one or two streets uphill costs less and solves most of it.',
      },
      {
        q: 'How walkable is Porto?',
        a: 'Very walkable in distance and demanding in gradient. The old town to the river is fifteen minutes down and rather more back up, on granite setts that are slippery in rain. The metro and the funicular exist for good reason.',
      },
      {
        q: 'Where should families stay in Porto?',
        a: 'Foz do Douro for beaches, space and calm, with a tram into town; or Baixa if you want to be in the middle of things with a lift in the hotel. The Ribeira’s stairs and crowds make it the hardest option with young children.',
      },
    ],
  },
  {
    citySlug: 'berlin',
    intro:
      'Berlin is enormous and low-rise, so nothing is a short walk from everything — you pick a district and use the U-Bahn. The old East (Mitte, Prenzlauer Berg, Friedrichshain) holds most of the history and most of the visitors; the old West (Charlottenburg, Schöneberg) is calmer, cheaper and often overlooked.',
    verdict: {
      firstTime: 'Mitte',
      value: 'Kreuzberg',
      families: 'Prenzlauer Berg',
      nightlife: 'Friedrichshain',
      couples: 'Prenzlauer Berg',
    },
    airport:
      'Brandenburg (BER) is 25–30 minutes to the centre on the FEX or regional trains, running roughly every 15 minutes. A taxi runs about €50–60 and is rarely faster.',
    areas: [
      {
        name: 'Mitte',
        slug: 'mitte',
        band: 'Mid-range',
        bestFor: 'A first trip and the history',
        summary:
          'The historic centre and the old East’s showpiece: the Brandenburg Gate, Museum Island, Unter den Linden, the Holocaust Memorial and what remains of Checkpoint Charlie, all within a walk of each other.',
        walk: 'The Brandenburg Gate, Museum Island, the Reichstag, Alexanderplatz and the Holocaust Memorial.',
        watchOut:
          'The most visited and most corporate part of the city — large stretches are government buildings and chain hotels, and it is quiet in a dull way at night. Prices sit above the districts around it.',
      },
      {
        name: 'Prenzlauer Berg',
        slug: 'prenzlauer-berg',
        band: 'Mid-range',
        bestFor: 'Families and couples',
        summary:
          'The best-preserved 19th-century district in Berlin, largely spared the bombing — cobbled streets, restored tenements, playgrounds, and the Mauerpark flea market on Sundays. It is where Berlin families live, and it shows.',
        walk: 'Mauerpark, Kollwitzplatz and its farmers’ market, and the Berlin Wall Memorial on Bernauer Straße.',
        watchOut:
          'Residential and rather well-behaved — no nightlife to speak of, and the reputation for prams outnumbering people is earned. A 10–15 minute U-Bahn ride from the central sights.',
      },
      {
        name: 'Kreuzberg',
        slug: 'kreuzberg',
        band: 'Value',
        bestFor: 'Best value and the best food',
        summary:
          'The old West Berlin edge against the Wall, now the city’s most mixed and most interesting district: Turkish markets along the Landwehr canal, Bergmannkiez cafés, and the East Side Gallery on its border.',
        walk: 'The Landwehr canal, the Maybachufer market, Görlitzer Park and the East Side Gallery.',
        watchOut:
          'Big and uneven — the Bergmannkiez end is gentle, the Kottbusser Tor end is gritty and has a visible drug scene. Görlitzer Park is best avoided at night.',
      },
      {
        name: 'Friedrichshain',
        slug: 'friedrichshain',
        band: 'Value',
        bestFor: 'Nightlife',
        summary:
          'East of the river, the club district — Boxhagener Platz, the Simon-Dach-Straße bar strip, RAW-Gelände, and the East Side Gallery along the Spree. The cheapest central-ish beds in the city, and the youngest crowd.',
        walk: 'The East Side Gallery, Boxhagener Platz, the RAW grounds and Karl-Marx-Allee.',
        watchOut:
          'Loud from Thursday to Sunday and scruffy year-round — graffiti on everything, and the club streets are not a quiet walk home. Little to see by daylight.',
      },
      {
        name: 'Charlottenburg',
        slug: 'charlottenburg',
        band: 'Mid-range',
        bestFor: 'Quiet, and the old West',
        summary:
          'The centre of West Berlin before reunification: the Kurfürstendamm shopping boulevard, the KaDeWe department store, Charlottenburg Palace and the leafy streets around Savignyplatz. Calm, grown-up and consistently under-booked.',
        walk: 'The Kurfürstendamm, KaDeWe, Savignyplatz, the Zoo and the Kaiser Wilhelm Memorial Church.',
        watchOut:
          'A 20–25 minute U-Bahn ride from Mitte and the eastern districts where most visitors spend their time. It feels like a different, more conventional European city — which for some people is the appeal and for others is the problem.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Berlin for a first visit?',
        a: 'Mitte, if the history is why you are coming — the Brandenburg Gate, Museum Island and the Reichstag are walkable and the transport links out are the best in the city. If you would rather sleep somewhere with more character, Prenzlauer Berg is one U-Bahn stop away.',
      },
      {
        q: 'Which Berlin neighbourhood is best value?',
        a: 'Kreuzberg and Friedrichshain price well below Mitte and have better food and nightlife, at the cost of a rougher edge and a short U-Bahn ride. Neukölln next door is cheaper again and changing fast.',
      },
      {
        q: 'Is Berlin walkable?',
        a: 'Within a district, yes; between districts, no. Berlin covers nearly nine times the area of Paris, so plan on the U-Bahn and S-Bahn for anything across town. A day travel pass is inexpensive and worth buying on arrival.',
      },
      {
        q: 'Where should families stay in Berlin?',
        a: 'Prenzlauer Berg. It is the most child-oriented district in the city — playgrounds in every square, wide pavements, calm streets, and a direct tram or U-Bahn into the centre. Charlottenburg is the quieter West-side equivalent with the zoo nearby.',
      },
      {
        q: 'Is it worth staying in East or West Berlin?',
        a: 'The old East holds most of what visitors come for and most of the visitors. The old West — Charlottenburg, Schöneberg — is calmer, often cheaper for the same standard, and about 20 minutes away on the U-Bahn. On a first trip stay east; on a second, try west.',
      },
    ],
  },
  {
    citySlug: 'budapest',
    intro:
      'Budapest is two halves with different jobs. Pest, on the flat east bank, holds the restaurants, the ruin bars, the parliament and nearly all the hotels; Buda, on the hilly west bank, holds the castle, the old town and the quiet. Almost everyone should sleep in Pest and cross the river to look at Buda.',
    verdict: {
      firstTime: 'District V (Belváros & Lipótváros)',
      value: 'District VII (Jewish Quarter)',
      families: 'District XIII (Újlipótváros)',
      nightlife: 'District VII (Jewish Quarter)',
      couples: 'District I (Castle District)',
    },
    airport:
      'Ferenc Liszt (BUD) has the 100E direct airport bus to Deák Ferenc tér in about 40 minutes, on its own ticket. A taxi through the regulated Főtaxi rank runs roughly 9,000–12,000 HUF and takes 30–40 minutes.',
    areas: [
      {
        name: 'District V (Belváros & Lipótváros)',
        slug: 'district-v-belvaros',
        band: 'Mid-range',
        bestFor: 'A first trip, everything on foot',
        summary:
          'The formal centre of Pest: the Parliament, St Stephen’s Basilica, the Danube promenade and the Váci utca shopping street. Flat, safe, well lit and within walking distance of both bridges.',
        walk: 'The Parliament, St Stephen’s Basilica, the Chain Bridge, the Danube promenade and the Central Market Hall.',
        watchOut:
          'The most expensive district in the city and the most touristed — Váci utca in particular is where the overpriced restaurants and the drink-scam bars cluster.',
      },
      {
        name: 'District VII (Jewish Quarter)',
        slug: 'district-vii-jewish-quarter',
        band: 'Value',
        bestFor: 'Nightlife and best value',
        summary:
          'The old Jewish quarter, home to the Dohány Street Synagogue and to the ruin bars — Szimpla Kert and its imitators — built inside derelict courtyard blocks. It is the cheapest genuinely central district and the liveliest.',
        walk: 'The Dohány Street Synagogue, Szimpla Kert, Gozsdu Courtyard and the Basilica.',
        watchOut:
          'Loud every night, not just weekends, and the ruin-bar streets are messy by closing time. Some of the housing stock is genuinely run-down behind a smart façade — read recent reviews, not the photos.',
      },
      {
        name: 'District VI (Terézváros & Andrássy)',
        slug: 'district-vi-terezvaros',
        band: 'Mid-range',
        bestFor: 'A quieter central base',
        summary:
          'Strung along Andrássy út, the UNESCO-listed boulevard that runs from the Basilica to Heroes’ Square, with the Opera House halfway. Grand apartment buildings, the city’s first metro line underneath, and a calmer night than District VII next door.',
        walk: 'The Opera House, Andrássy út, the Basilica, Heroes’ Square and the City Park by metro.',
        watchOut:
          'The blocks nearest the Oktogon and Nyugati station are noisy and traffic-heavy, and the western edge bleeds into District VII’s nightlife.',
      },
      {
        name: 'District I (Castle District)',
        slug: 'district-i-castle',
        band: 'Premium',
        bestFor: 'Couples and the view',
        summary:
          'On the Buda hill: the castle, Matthias Church, the Fisherman’s Bastion and cobbled lanes that empty completely once the day trippers leave. The best views in Budapest are from here, looking back at Pest.',
        walk: 'Buda Castle, Matthias Church, the Fisherman’s Bastion and the funicular down to the Chain Bridge.',
        watchOut:
          'Almost no restaurants that locals use, very little open in the evening, and you are on a hill separated from the city by a river. Beautiful, and impractical for more than two nights.',
      },
      {
        name: 'District XIII (Újlipótváros)',
        slug: 'district-xiii-ujlipotvaros',
        band: 'Value',
        bestFor: 'Families and quiet',
        summary:
          'Just north of the Parliament along the river — a 1930s residential grid of tree-lined streets, cafés and the Margaret Island park bridge. Locals live here, prices are lower, and District V starts at the end of the road.',
        walk: 'Margaret Island, the Parliament, the Danube embankment and the Nyugati station area.',
        watchOut:
          'Almost no sights of its own and quiet in the evening. The far northern end is a long walk from the centre — stay south of Szent István park.',
      },
    ],
    faqs: [
      {
        q: 'Should I stay in Buda or Pest?',
        a: 'Pest, for almost every trip. It is flat, it has the restaurants, the bars, the baths at Széchenyi and nearly all the hotels, and the Buda castle is a 20-minute walk or a short funicular ride across the river. Stay in Buda only if quiet views are the point.',
      },
      {
        q: 'What is the best area to stay in Budapest for first-timers?',
        a: 'District V. The Parliament, the Basilica, the Chain Bridge and the Danube promenade are all a walk away, it is well lit and safe at night, and both the ruin bars and the castle are fifteen minutes on foot in opposite directions.',
      },
      {
        q: 'Is the Jewish Quarter a good place to stay?',
        a: 'It is the best value and the most fun, and the loudest. Szimpla Kert and the Gozsdu Courtyard run late every night of the week, so pick a courtyard-facing room or a street a block or two back if you intend to sleep.',
      },
      {
        q: 'Is Budapest cheap for UK visitors?',
        a: 'It remains one of the better-value European city breaks — food, transport and the thermal baths all cost meaningfully less than in Western Europe. Hotel rates in District V have caught up somewhat; Districts VII, VI and XIII still price well below them.',
      },
      {
        q: 'How do I avoid the taxi and drink scams in Budapest?',
        a: 'Use the regulated Főtaxi rank or a ride app rather than hailing on the street, and never accept an invitation into a bar from someone on Váci utca or around the Basilica — that is the setup for the inflated-bill scam. Ordinary bars and ruin bars are fine.',
      },
    ],
  },
  {
    citySlug: 'athens',
    intro:
      'Athens is compact where it matters: the Acropolis, the Agora and the old town sit inside one walkable ring, and everything else is a metro ride. The real choice is between the pretty tourist villages under the rock, which are lovely and busy, and the working city a few streets north, which is cheaper and more interesting after dark.',
    verdict: {
      firstTime: 'Plaka',
      value: 'Koukaki',
      families: 'Koukaki',
      nightlife: 'Psyrri & Monastiraki',
      couples: 'Plaka',
    },
    airport:
      'Eleftherios Venizelos (ATH) runs metro line 3 straight to Syntagma in about 40 minutes, or the X95 bus for less. A taxi to the centre is a fixed fare — €40 by day, €55 at night — so agree it before setting off.',
    areas: [
      {
        name: 'Plaka',
        slug: 'plaka',
        band: 'Mid-range',
        bestFor: 'A first trip and the setting',
        summary:
          'The old town wrapped around the north-east foot of the Acropolis — whitewashed lanes, bougainvillea, and the Anafiotika steps that look like an island village dropped into the capital. You walk to the rock in ten minutes.',
        walk: 'The Acropolis, the Ancient Agora, the Roman Agora, Syntagma and the Acropolis Museum.',
        watchOut:
          'Priced and pitched at visitors, with restaurant touts on the main lanes and few locals. Rooms are small, and the pedestrian streets mean a walk with luggage from wherever the taxi stops.',
      },
      {
        name: 'Koukaki',
        slug: 'koukaki',
        band: 'Value',
        bestFor: 'Best value and families',
        summary:
          'South of the Acropolis behind the museum: a genuine residential neighbourhood of 1960s apartment blocks, tavernas and coffee bars that has quietly become the best-value base in the city. Ten minutes to the rock, and a fraction of Plaka.',
        walk: 'The Acropolis Museum, the Acropolis south slope, Filopappou Hill and the Syngrou-Fix metro.',
        watchOut:
          'Nothing to look at architecturally — it is flats and traffic, and the appeal is entirely in the price and the people. Quiet late at night.',
      },
      {
        name: 'Psyrri & Monastiraki',
        slug: 'psyrri-monastiraki',
        band: 'Value',
        bestFor: 'Nightlife and eating',
        summary:
          'North of the Agora: the flea market, the souvlaki row on Mitropoleos, and a warren of former workshops now full of bars and live-music tavernas. The most energetic part of central Athens.',
        walk: 'The Ancient Agora, Monastiraki flea market, Hadrian’s Library and Plaka in ten minutes.',
        watchOut:
          'Loud until very late, scruffy in daylight, and the streets towards Omonia get uncomfortable at night. Stay on the Agora side of Psyrri rather than the northern edge.',
      },
      {
        name: 'Syntagma & Kolonaki',
        slug: 'syntagma-kolonaki',
        band: 'Premium',
        bestFor: 'Comfort and shopping',
        summary:
          'The formal centre around Parliament and the National Garden, rising into Kolonaki — the smart district of designer shops, galleries and the funicular up Lycabettus Hill. The best hotel stock in the city and the best transport links.',
        walk: 'Parliament and the changing of the guard, the National Garden, Ermou shopping street and Plaka.',
        watchOut:
          'The most expensive part of Athens, Syntagma Square itself is a traffic hub and the usual site of demonstrations, and Kolonaki is a stiff climb from everything below it.',
      },
      {
        name: 'Thissio & Petralona',
        slug: 'thissio-petralona',
        band: 'Value',
        bestFor: 'Quiet, with the best Acropolis view',
        summary:
          'West of the Agora along the pedestrianised Apostolou Pavlou promenade, which has the finest view of the Acropolis in the city from its café terraces, running down into old working-class Petralona.',
        walk: 'The Ancient Agora, the Thissio promenade, Filopappou Hill and the Kerameikos.',
        watchOut:
          'Thin hotel stock — mostly apartments — and Petralona is a 20-minute walk or a metro stop out from the sights.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Athens for first-time visitors?',
        a: 'Plaka, for the setting and the ten-minute walk to the Acropolis, or Koukaki just behind the Acropolis Museum if you would rather spend the difference on dinner. Both put the ancient sites within walking distance without needing the metro.',
      },
      {
        q: 'Which areas of Athens should I avoid staying in?',
        a: 'Omonia and the streets immediately around it, and the western end of Psyrri towards it. The area is being cleaned up but it remains the least pleasant part of central Athens after dark, and the cheap hotel rates there reflect it.',
      },
      {
        q: 'Is Koukaki a good area to stay in Athens?',
        a: 'Yes — it is the best-value central base in the city. A residential neighbourhood directly behind the Acropolis Museum, ten minutes on foot from the rock, with real tavernas and rates well under Plaka. It is plain to look at, which is the entire trade.',
      },
      {
        q: 'How many days do you need in Athens?',
        a: 'Two full days covers the Acropolis, the museum, the Agora and the old town at a reasonable pace. A third day adds Cape Sounion or a day trip, and is the point at which staying somewhere you enjoy in the evening starts to matter.',
      },
      {
        q: 'Is Athens walkable?',
        a: 'The historic core is — a pedestrianised route runs from the Kerameikos around the Acropolis to Plaka, connecting nearly all the ancient sites without touching a main road. Beyond that ring, use the metro, which is clean, cheap and fast.',
      },
    ],
  },
  {
    citySlug: 'istanbul',
    intro:
      'Istanbul spans two continents and the decision that matters is which side of the Golden Horn you sleep on. Sultanahmet on the historic peninsula puts the monuments outside your door and empties at night; Beyoğlu across the water is where the city eats, drinks and lives, ten minutes away by tram. Asia, across the Bosphorus, is the local answer.',
    verdict: {
      firstTime: 'Sultanahmet',
      value: 'Kadıköy',
      families: 'Sultanahmet',
      nightlife: 'Beyoğlu & Karaköy',
      couples: 'Beyoğlu & Karaköy',
    },
    airport:
      'Istanbul Airport (IST) is far out on the European side — the M11 metro plus a change, or the HAVAIST bus, takes 60–90 minutes to the centre. Sabiha Gökçen (SAW) is on the Asian side and takes about the same to reach Sultanahmet. Budget the transfer properly; it is not a short hop.',
    areas: [
      {
        name: 'Sultanahmet',
        slug: 'sultanahmet',
        band: 'Mid-range',
        bestFor: 'A first trip and the monuments',
        summary:
          'The historic peninsula: Hagia Sophia, the Blue Mosque, Topkapı Palace, the Basilica Cistern and the Grand Bazaar all inside one walkable district. On a short first visit there is no serious alternative.',
        walk: 'Hagia Sophia, the Blue Mosque, Topkapı Palace, the Basilica Cistern and the Grand Bazaar.',
        watchOut:
          'It empties after dark — the restaurants are aimed at visitors and locals do not come here to eat. Carpet-shop touting is persistent, and the hills are steeper than the map suggests.',
      },
      {
        name: 'Beyoğlu & Karaköy',
        slug: 'beyoglu-karakoy',
        band: 'Mid-range',
        bestFor: 'Eating, drinking and the modern city',
        summary:
          'Across the Galata Bridge: the Galata Tower, the İstiklal Caddesi promenade, and the restored warehouse district of Karaköy underneath, which holds the best restaurant and coffee scene in the city.',
        walk: 'The Galata Tower, İstiklal Caddesi, Karaköy’s waterfront, and Sultanahmet over the bridge or one tram stop.',
        watchOut:
          'Steep — Karaköy to Galata is a serious climb, though the Tünel funicular helps. İstiklal is crowded at all hours, and the side streets off it vary a great deal in quality street by street.',
      },
      {
        name: 'Beşiktaş & Ortaköy',
        slug: 'besiktas-ortakoy',
        band: 'Premium',
        bestFor: 'The Bosphorus and the palaces',
        summary:
          'North along the European shore, where Dolmabahçe Palace, the ferry piers and the waterfront restaurants of Ortaköy sit under the first Bosphorus bridge. This is where the luxury hotels with water views are.',
        walk: 'Dolmabahçe Palace, the Ortaköy mosque and waterfront, and the Beşiktaş ferry piers.',
        watchOut:
          'A 20–30 minute tram or ferry from the historic sights, so the monuments become a daily trip. The waterfront restaurants are priced for the view.',
      },
      {
        name: 'Kadıköy (Asian side)',
        slug: 'kadikoy',
        band: 'Value',
        bestFor: 'Best value and the local city',
        summary:
          'Across the Bosphorus in Asia: a food market, hundreds of bars along Kadife Sokak, bookshops and almost no coach tours. Ferries to Eminönü and Karaköy run constantly and cost the price of a bus fare.',
        walk: 'The Kadıköy market, Moda’s seafront promenade, and the ferry piers for Europe.',
        watchOut:
          'You are on another continent from the monuments — every sightseeing day starts with a 20-minute ferry, which is a pleasure the first three times. Very little English on menus compared with Beyoğlu.',
      },
      {
        name: 'Fatih & Fener-Balat',
        slug: 'fatih-fener-balat',
        band: 'Value',
        bestFor: 'Cheapest beds and old Istanbul',
        summary:
          'West along the Golden Horn from Sultanahmet: the conservative Fatih district and, on the water, the painted houses, antique shops and Greek and Jewish heritage of Fener and Balat.',
        walk: 'The Chora Church, the Fener Greek Orthodox College, Balat’s coloured streets and the Golden Horn.',
        watchOut:
          'Conservative and largely dry — alcohol is hard to find in Fatih, and dress expectations are stricter. Transport is bus and tram rather than the main lines, and it is a long walk to the headline sights.',
      },
    ],
    faqs: [
      {
        q: 'Should I stay in Sultanahmet or Beyoğlu?',
        a: 'Sultanahmet for a first, short trip — the monuments are outside the door. Beyoğlu for a second visit or a longer stay, because it is where the city actually eats and drinks, and the tram puts Sultanahmet ten minutes away. Many people split the trip between both.',
      },
      {
        q: 'Is the Asian side worth staying on?',
        a: 'For value and for a real sense of the city, yes. Kadıköy has the best market, the best bar street and the lowest prices, and the ferry across is one of the great commutes. It is the wrong choice if your trip is two days of monuments.',
      },
      {
        q: 'How long does it take to get from Istanbul Airport to the centre?',
        a: 'Allow 60–90 minutes from IST, whether by metro with a change or by the HAVAIST coach — the airport is a long way west of the city. Sabiha Gökçen on the Asian side is a similar journey to Sultanahmet. Do not plan a tight first evening around it.',
      },
      {
        q: 'Is Istanbul safe for tourists at night?',
        a: 'Broadly yes, with normal big-city caution. The specific things to watch are the shoeshine and carpet-shop approaches around Sultanahmet, and the invitation-to-a-bar scam aimed at solo men in Beyoğlu. Use official taxis or a ride app and insist on the meter.',
      },
      {
        q: 'Which area of Istanbul is cheapest to stay in?',
        a: 'Fatih, Fener-Balat and Kadıköy on the Asian side all price well below Sultanahmet and Beyoğlu. Kadıköy is the one that gives you a genuinely better neighbourhood as well as a lower rate — at the cost of a ferry each time you go sightseeing.',
      },
    ],
  },
  {
    citySlug: 'dubai',
    intro:
      'Dubai is a long thin city strung along one road, and the metro follows it. The beach is west, the old city is east, and Downtown sits in the middle around the Burj Khalifa. Nothing is walkable between districts, so choose whether you want the tower, the sand or the souks outside your door — and expect a taxi or a metro ride to the other two.',
    verdict: {
      firstTime: 'Downtown Dubai',
      value: 'Deira & Bur Dubai',
      families: 'JBR & Dubai Marina',
      nightlife: 'Dubai Marina',
      couples: 'Palm Jumeirah',
    },
    airport:
      'DXB is unusually close in — the red metro line serves Terminals 1 and 3 and reaches Downtown in about 20 minutes, and a taxi to Downtown or Deira runs roughly AED 50–80. Al Maktoum (DWC) is far south and needs 45–60 minutes by road.',
    areas: [
      {
        name: 'Downtown Dubai',
        slug: 'downtown-dubai',
        band: 'Premium',
        bestFor: 'A first trip and the headline sights',
        summary:
          'The Burj Khalifa, the Dubai Mall, the fountain and the Dubai Opera around one landscaped block, with the old-town-styled Souk Al Bahar alongside. The one district in the city where you can genuinely walk to what you came for.',
        walk: 'The Burj Khalifa, Dubai Mall, the fountain show, Dubai Opera and Souk Al Bahar.',
        watchOut:
          'No beach — it is a 20-minute drive to the sea. Prices are the highest in the city and the mall crowds at weekends are considerable.',
      },
      {
        name: 'JBR & Dubai Marina',
        slug: 'jbr-dubai-marina',
        band: 'Premium',
        bestFor: 'Families and the beach',
        summary:
          'A dense cluster of towers around a yacht marina, with The Walk and The Beach at JBR giving you sand, a promenade and restaurants in one strip. The most self-contained part of Dubai — you can spend a week without a taxi.',
        walk: 'JBR beach, The Walk promenade, the Marina Walk, and Bluewaters and Ain Dubai over the bridge.',
        watchOut:
          'Far south of the old city — Deira and the souks are a 30–40 minute drive. The marina towers are dense enough that a "sea view" is often a view of the next tower.',
      },
      {
        name: 'Palm Jumeirah',
        slug: 'palm-jumeirah',
        band: 'Premium',
        bestFor: 'Couples and resort days',
        summary:
          'The man-made island of beach resorts, with Atlantis at the crown and a monorail down the trunk. This is where you stay if the hotel itself is the holiday and you have no intention of leaving it.',
        walk: 'Your resort’s private beach, and The Pointe or Nakheel Mall if you are near them.',
        watchOut:
          'Nothing is walkable — the Palm is enormous and you will take a taxi for everything, including dinner. Off-island trips are slow because there is one road in.',
      },
      {
        name: 'Deira & Bur Dubai',
        slug: 'deira-bur-dubai',
        band: 'Value',
        bestFor: 'Best value and the old city',
        summary:
          'The original Dubai on either side of the Creek: the gold and spice souks, the Al Fahidi heritage quarter, the textile market, and abra boats crossing the water for a dirham. Rooms cost a fraction of the beach districts.',
        walk: 'The gold and spice souks, Al Fahidi, the Dubai Museum area and the abra crossings.',
        watchOut:
          'Crowded, hot and hectic, with the city’s oldest hotel stock — read recent reviews carefully. No beach, and the licensed bars here are mostly hotel basements.',
      },
      {
        name: 'Business Bay',
        slug: 'business-bay',
        band: 'Mid-range',
        bestFor: 'A cheaper base beside Downtown',
        summary:
          'The tower district immediately south of Downtown along the canal, built for offices and serviced apartments. Rates run below Downtown for a walk of fifteen minutes or one metro stop, which makes it the sensible compromise.',
        walk: 'The Dubai Canal promenade, and Downtown and the Dubai Mall in 15–20 minutes on foot.',
        watchOut:
          'Functional rather than attractive, with building work still going on in places and few restaurants at street level. Crossing the main roads on foot is not always straightforward.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Dubai for first-time visitors?',
        a: 'Downtown Dubai. The Burj Khalifa, the Dubai Mall and the fountain are on your doorstep, the metro connects you to the rest of the city, and it is the only district where walking to the main attraction is realistic. Business Bay next door does the same job for less.',
      },
      {
        q: 'Where should I stay in Dubai for the beach?',
        a: 'JBR or Dubai Marina for a beach plus restaurants, shops and a promenade you can walk; Palm Jumeirah if you want a resort with a private stretch of sand and do not plan to leave it. JBR is far better value and far less isolated.',
      },
      {
        q: 'Which is cheaper, Deira or Downtown Dubai?',
        a: 'Deira, substantially. The old city around the Creek has the lowest rates in Dubai and the most character, at the cost of an older hotel stock, no beach, and a 20–30 minute journey to the modern attractions. The metro connects both.',
      },
      {
        q: 'Do I need a car in Dubai?',
        a: 'No. The red metro line runs the length of the city and covers the airport, Deira, Downtown and the Marina, and taxis are cheap and metered. A car helps only if you plan day trips to Abu Dhabi, Hatta or the desert.',
      },
      {
        q: 'When is the cheapest time to stay in Dubai?',
        a: 'June to September, when daytime temperatures make outdoor time genuinely difficult and rates fall accordingly. The trade-off is real — this is an indoor holiday. November to March is the comfortable season and priced for it.',
      },
    ],
  },
  {
    citySlug: 'marrakech',
    intro:
      'Marrakech gives you a genuine either/or. Inside the medina walls you sleep in a riad — a courtyard house on a lane no car can reach — with the souks and the Jemaa el-Fnaa outside the door. Outside them, Gueliz and Hivernage are a modern city of boulevards, pavement cafés and hotels with lifts and car parks. Neither is wrong; they are different holidays.',
    verdict: {
      firstTime: 'The Medina',
      value: 'Gueliz (Ville Nouvelle)',
      families: 'Hivernage',
      nightlife: 'Gueliz (Ville Nouvelle)',
      couples: 'The Medina',
    },
    airport:
      'Menara (RAK) is barely 15 minutes from the medina by taxi — agree the fare before getting in, or use a ride app. If your riad is deep inside the medina the taxi stops at the nearest gate and someone meets you to walk the last stretch with your bags.',
    areas: [
      {
        name: 'The Medina',
        slug: 'the-medina',
        band: 'Mid-range',
        bestFor: 'A first trip and the riad experience',
        summary:
          'The walled old city: souks, the Jemaa el-Fnaa square, the Koutoubia minaret, the Bahia Palace, and hundreds of riads hidden behind unmarked doors on lanes too narrow for cars. Staying here is the reason most people come.',
        walk: 'The Jemaa el-Fnaa, the souks, the Bahia Palace, the Saadian Tombs and the Koutoubia.',
        watchOut:
          'No vehicle access to most riads, so arriving means a walk with luggage through lanes that all look alike. It is hot, crowded and persistent with sellers, and the call to prayer is loud before dawn.',
      },
      {
        name: 'Gueliz (Ville Nouvelle)',
        slug: 'gueliz',
        band: 'Value',
        bestFor: 'Best value and modern comfort',
        summary:
          'The French-built new town: wide boulevards, galleries, proper supermarkets, pavement cafés and licensed bars. Hotels here have lifts, parking and reliable air conditioning, and rates are lower than an equivalent riad.',
        walk: 'The Majorelle Garden, the Yves Saint Laurent museum, and the medina in about 25 minutes or a short taxi.',
        watchOut:
          'It is not the Marrakech of the photographs — it could be a mid-sized French city with better weather. You will take a taxi into the medina most days.',
      },
      {
        name: 'Hivernage',
        slug: 'hivernage',
        band: 'Premium',
        bestFor: 'Families and pools',
        summary:
          'The garden district between Gueliz and the medina walls, built around large hotels with real pools and grounds. It is the quietest central option and the easiest with children or a car.',
        walk: 'The Menara gardens, the Koutoubia and the medina walls in around 15–20 minutes.',
        watchOut:
          'Largely a hotel district with little street life of its own, and priced at the top of the market. Everything interesting is a walk or a taxi away.',
      },
      {
        name: 'Palmeraie',
        slug: 'palmeraie',
        band: 'Premium',
        bestFor: 'Resort stays and total quiet',
        summary:
          'The palm grove north-east of the city, where large resorts and villas sit among the trees with big pools and desert views. This is where you stay if the hotel is the holiday.',
        walk: 'Nothing — the Palmeraie is spread out and designed around cars and hotel shuttles.',
        watchOut:
          'A 20–30 minute drive from the medina, so every trip into town is a planned journey and a fare each way. Isolated in the evening unless your resort has the restaurants you want.',
      },
      {
        name: 'Kasbah & Mellah',
        slug: 'kasbah-mellah',
        band: 'Value',
        bestFor: 'The medina, one step calmer',
        summary:
          'The southern quarter of the walled city, holding the Saadian Tombs, the El Badi Palace ruins and the old Jewish Mellah with its spice market. Riad rates run below the central souk area and the lanes are noticeably calmer.',
        walk: 'The Saadian Tombs, El Badi Palace, the Mellah spice market and the Bahia Palace.',
        watchOut:
          'A 15–20 minute walk through the medina to the Jemaa el-Fnaa, which is tiring in the heat. Fewer restaurants than the centre once it gets dark.',
      },
    ],
    faqs: [
      {
        q: 'Should I stay in a riad in the medina or a hotel in Gueliz?',
        a: 'A riad in the medina for a first trip — the courtyard house, the rooftop and the souks at the door are the experience. Gueliz if you want a lift, a car park, a pool that is not the size of a bath, licensed bars and a lower bill. Many people do two nights of each.',
      },
      {
        q: 'Is the medina difficult to stay in?',
        a: 'It takes adjusting to. Cars cannot reach most riads, the lanes are unsigned and look identical, it is hot and crowded, and sellers are persistent. Riads almost always arrange someone to meet you at the nearest gate — accept the offer, especially for a night arrival.',
      },
      {
        q: 'Where should families stay in Marrakech?',
        a: 'Hivernage or the Palmeraie, for hotels with real pools, grounds, lifts and car access. The medina is hard work with a pushchair and small children in the heat, though a riad with its own plunge pool works well for older children.',
      },
      {
        q: 'Is Marrakech cheap for UK visitors?',
        a: 'Food, taxis and markets are inexpensive; hotels vary enormously because a riad is a small business rather than a chain. Gueliz consistently offers the lowest rates for a comfortable modern room, while medina riads range from very cheap to very expensive on the same lane.',
      },
      {
        q: 'How far is Marrakech airport from the medina?',
        a: 'About 15 minutes by road — it is one of the closest airports to a city centre you will use. Agree the taxi fare before setting off or use a ride app, as the airport rank is known for quoting high.',
      },
    ],
  },
  {
    citySlug: 'malaga',
    intro:
      'Málaga stopped being only an airport a decade ago, and the old centre is now the reason to come rather than the thing you drive past. The choice is between the pedestrianised historic centre, the city beaches a walk to the east, and the marina and Soho district to the west — all within about half an hour on foot of each other.',
    verdict: {
      firstTime: 'Centro Histórico',
      value: 'Soho & Ensanche Centro',
      families: 'Pedregalejo & El Palo',
      nightlife: 'Centro Histórico',
      couples: 'La Malagueta',
    },
    airport:
      'Málaga (AGP) is 15 minutes from the centre on the C1 Cercanías train to María Zambrano station, running every 20 minutes. A taxi runs roughly €20–25. The same train continues to Torremolinos and Fuengirola.',
    areas: [
      {
        name: 'Centro Histórico',
        slug: 'centro-historico',
        band: 'Mid-range',
        bestFor: 'A first trip, everything on foot',
        summary:
          'The pedestrianised old town around Calle Larios, the cathedral, the Roman theatre and the Alcazaba fortress on the hill above it, with the Picasso Museum a few streets away. Compact, flat and full of tapas bars.',
        walk: 'The cathedral, the Alcazaba, the Roman theatre, the Picasso Museum and the port promenade.',
        watchOut:
          'The tapas streets are loud until late, especially in summer and during Feria in August. Marble paving that has been polished by footfall is slippery in rain.',
      },
      {
        name: 'La Malagueta',
        slug: 'la-malagueta',
        band: 'Premium',
        bestFor: 'Couples and a beach walk',
        summary:
          'The city beach immediately east of the port, backed by a promenade of seafood terraces and a short walk from the old town. It is the only place in Málaga where you can have both the beach and the centre on foot.',
        walk: 'La Malagueta beach, the Muelle Uno marina, the Pompidou Centre and the old town in ten minutes.',
        watchOut:
          'A city beach rather than a resort one — the sand is imported and the promenade is busy. The apartment blocks behind it are unremarkable and priced for the location.',
      },
      {
        name: 'Soho & Ensanche Centro',
        slug: 'soho-ensanche-centro',
        band: 'Value',
        bestFor: 'Best value beside the centre',
        summary:
          'The district between the old town and the port, rebranded around a programme of large street murals, with the Contemporary Art Centre at its heart. Rates run below the historic centre for a walk of five minutes.',
        walk: 'The old town, the port and Muelle Uno, the CAC art centre and La Malagueta beach.',
        watchOut:
          'A work in progress — smart new blocks sit next to tired ones, and the streets nearest the main road are traffic-heavy and unappealing.',
      },
      {
        name: 'Pedregalejo & El Palo',
        slug: 'pedregalejo-el-palo',
        band: 'Value',
        bestFor: 'Families and the real beach',
        summary:
          'The old fishing villages a few kilometres east, where the chiringuito beach restaurants grill sardines on boats full of sand and families have summered for generations. Calmer water, calmer streets and far lower prices.',
        walk: 'The Pedregalejo beach promenade, the chiringuitos and the small coves along the front.',
        watchOut:
          'A 20–30 minute bus ride from the centre, so sightseeing becomes a trip. Accommodation is mostly apartments rather than hotels, and it is quiet outside summer.',
      },
      {
        name: 'Muelle Uno & Port',
        slug: 'muelle-uno-port',
        band: 'Premium',
        bestFor: 'Modern comfort by the water',
        summary:
          'The redeveloped port between the old town and the beach, with a waterfront promenade of shops and restaurants, the Pompidou Centre’s glass cube and the lighthouse at the end.',
        walk: 'The old town, La Malagueta beach, the Pompidou Centre and the cruise terminal.',
        watchOut:
          'New, polished and slightly generic — the restaurants are aimed at cruise arrivals and priced accordingly. Very exposed in wind and full sun.',
      },
    ],
    faqs: [
      {
        q: 'Is Málaga worth staying in, or should I go to the Costa del Sol resorts?',
        a: 'Stay in Málaga if you want a real city — old town, museums, tapas and a beach you can walk to. Choose Torremolinos, Benalmádena or Fuengirola if you want a resort holiday with a long sandy beach and a hotel pool. The Cercanías train links them all in under 40 minutes.',
      },
      {
        q: 'What is the best area to stay in Málaga for first-time visitors?',
        a: 'The Centro Histórico. It is pedestrianised, flat, and puts the cathedral, the Alcazaba, the Picasso Museum and the tapas streets on your doorstep, with La Malagueta beach a ten-minute walk away.',
      },
      {
        q: 'Can you walk to the beach from the centre of Málaga?',
        a: 'Yes — La Malagueta is about ten minutes on foot from the cathedral, past the port and the Muelle Uno promenade. It is one of the few Spanish cities where the historic centre and a usable beach are that close together.',
      },
      {
        q: 'Which area of Málaga is cheapest to stay in?',
        a: 'Soho and the Ensanche Centro just west of the old town, and Pedregalejo and El Palo to the east. Soho keeps you within a five-minute walk of the centre; Pedregalejo is much cheaper again but a bus ride out.',
      },
      {
        q: 'Is Málaga good for families?',
        a: 'Yes. Pedregalejo and El Palo have calmer beaches and lower prices; the centre works well for older children who can walk; and the airport train makes arrival easy. Note that August brings the Feria, which is loud and packed across the whole city.',
      },
    ],
  },
  {
    citySlug: 'palma',
    intro:
      'Palma is a proper Mediterranean city that happens to have beaches nearby, not a resort strip. The old town around the cathedral is the reason to come; Santa Catalina next door is where you eat; and the coast either side runs from the yacht harbours of the west to the long sandy stretch of Playa de Palma in the east, which is a different holiday entirely.',
    verdict: {
      firstTime: 'Old Town (La Seu & Casco Antiguo)',
      value: 'Santa Catalina',
      families: 'Portixol & Molinar',
      nightlife: 'Santa Catalina',
      couples: 'Old Town (La Seu & Casco Antiguo)',
    },
    airport:
      'Palma (PMI) is 20 minutes from the centre — the A1 airport bus runs to Plaça d’Espanya every 15 minutes for a few euros, and a taxi is roughly €25–30. In summer the taxi queue can be long, so the bus is often quicker.',
    areas: [
      {
        name: 'Old Town (La Seu & Casco Antiguo)',
        slug: 'old-town-la-seu',
        band: 'Premium',
        bestFor: 'A first trip and the setting',
        summary:
          'The medieval core beneath the enormous sandstone cathedral: courtyards, Arab baths, tapas bars in stone alleys and the Almudaina palace along the seafront. Everything worth seeing in Palma is inside this district.',
        walk: 'The cathedral, the Almudaina palace, the Arab baths, Passeig del Born and the seafront.',
        watchOut:
          'The narrow lanes are hot and airless in July and August, parking is effectively impossible, and cruise-ship days fill the cathedral quarter completely.',
      },
      {
        name: 'Santa Catalina',
        slug: 'santa-catalina',
        band: 'Mid-range',
        bestFor: 'Best value and the best eating',
        summary:
          'The old fishermen’s quarter just west of the centre, built around a covered produce market that has become the island’s best food hall, ringed by low-rise streets of bars and restaurants.',
        walk: 'The Santa Catalina market, the old town in fifteen minutes, and the Paseo Marítimo waterfront.',
        watchOut:
          'The bar streets are loud on summer nights, and the district has gentrified fast enough that prices no longer undercut the old town by much.',
      },
      {
        name: 'Portixol & Molinar',
        slug: 'portixol-molinar',
        band: 'Mid-range',
        bestFor: 'Families and a swim before breakfast',
        summary:
          'A small fishing harbour and a run of low-key seafront east of the centre, linked to the city by a flat promenade you can walk or cycle in about 25 minutes. Calm water, good breakfast places and local families.',
        walk: 'The Portixol harbour, the seafront promenade into Palma, and the small city beaches.',
        watchOut:
          'A walk or a short bus from the old town, so it is a base rather than a doorstep. Limited hotel stock — mostly apartments and a few boutique places.',
      },
      {
        name: 'Paseo Marítimo & Porto Pi',
        slug: 'paseo-maritimo-porto-pi',
        band: 'Premium',
        bestFor: 'Marina views and larger hotels',
        summary:
          'The waterfront road west of the old town, lined with marinas, the larger city hotels and the late-night bars, running out towards the Porto Pi shopping centre and the Bellver castle above.',
        walk: 'The marinas, the old town in 15–20 minutes along the front, and Bellver Castle uphill.',
        watchOut:
          'A busy dual carriageway runs between the hotels and the water for much of it, and the strip is the centre of Palma’s late-night bar scene.',
      },
      {
        name: 'Playa de Palma & Can Pastilla',
        slug: 'playa-de-palma-can-pastilla',
        band: 'Value',
        bestFor: 'The long sandy beach on a budget',
        summary:
          'Six kilometres of sand east of the airport, backed by the island’s densest run of resort hotels and the Balneario beach bars. This is the beach-holiday Mallorca, and it prices well below the city.',
        walk: 'The full length of Playa de Palma, the beach bars and the Can Pastilla marina.',
        watchOut:
          'A 20–30 minute bus from Palma’s old town, and stretches of it — particularly around the German and British bar strips — are loud, crowded and not what you want if you came for the cathedral.',
      },
    ],
    faqs: [
      {
        q: 'Is Palma a good base for a Mallorca holiday?',
        a: 'Yes, if you want a city with beaches nearby rather than a resort. Palma has the cathedral, the old town, the food scene and the island’s best transport links — buses and trains to the north and west leave from the centre, so you can day-trip to Sóller, Valldemossa or Alcúdia without a car.',
      },
      {
        q: 'What is the best area to stay in Palma?',
        a: 'The old town around the cathedral for a first visit, or Santa Catalina next door if eating well matters more than the view from the window. Both are walkable to everything in the city.',
      },
      {
        q: 'Should I stay in Palma or Playa de Palma?',
        a: 'Palma for the city, the old town and the food; Playa de Palma for six kilometres of sand and lower prices. They are 20–30 minutes apart by bus, so it comes down to whether you want a beach outside the door or a cathedral.',
      },
      {
        q: 'Do I need a car in Palma?',
        a: 'Not in the city — the old town is pedestrian-heavy and parking is difficult and expensive. Hire a car only for the days you leave Palma, or use the bus and the Sóller train, both of which are good.',
      },
      {
        q: 'Which part of Palma is quietest?',
        a: 'Portixol and Molinar to the east, and the residential streets north of the old town around Plaça Major once the shops close. Avoid the Paseo Marítimo and the Santa Catalina bar streets if you are a light sleeper in summer.',
      },
    ],
  },
  {
    citySlug: 'tenerife',
    intro:
      'Tenerife is really two islands in one. The south — Costa Adeje, Los Cristianos, Playa de las Américas — is reliably hot, dry and built for beach holidays. The north — Santa Cruz, La Laguna, Puerto de la Cruz — is greener, cooler, cloudier and much more Spanish. Pick your half before you pick your hotel; they are two hours apart and the weather genuinely differs.',
    verdict: {
      firstTime: 'Costa Adeje',
      value: 'Los Cristianos',
      families: 'Costa Adeje',
      nightlife: 'Playa de las Américas',
      couples: 'Puerto de la Cruz',
    },
    airport:
      'Tenerife South (TFS) serves the southern resorts and is 20–30 minutes from Costa Adeje by taxi or shuttle. Tenerife North (TFN) is the one for Santa Cruz, La Laguna and Puerto de la Cruz. Getting from TFS to the north takes well over an hour — check which airport your flight uses before booking a hotel.',
    areas: [
      {
        name: 'Costa Adeje',
        slug: 'costa-adeje',
        band: 'Premium',
        bestFor: 'Families and the best beaches',
        summary:
          'The smartest of the southern resorts — landscaped promenades, the sheltered sand of Playa del Duque and Fañabé, and the island’s highest concentration of large four- and five-star hotels with real pools.',
        walk: 'Playa del Duque, Playa Fañabé, the seafront promenade and the Siam Park entrance nearby.',
        watchOut:
          'It is a purpose-built resort, so there is little that is Canarian about it, and prices sit above the neighbouring resorts. The promenade blends into Las Américas, which is a very different crowd.',
      },
      {
        name: 'Los Cristianos',
        slug: 'los-cristianos',
        band: 'Value',
        bestFor: 'Best value in the south',
        summary:
          'The original southern town before tourism arrived, and it kept a working harbour, a proper high street and a Sunday market. Cheaper than Costa Adeje, flatter than most of the island, and the ferry port for La Gomera.',
        walk: 'Los Cristianos beach, the harbour, the ferry terminal and the promenade into Las Américas.',
        watchOut:
          'Busier and plainer than Costa Adeje, with a much older hotel stock in places. The town beach is small for the number of people using it in season.',
      },
      {
        name: 'Playa de las Américas',
        slug: 'playa-de-las-americas',
        band: 'Mid-range',
        bestFor: 'Nightlife',
        summary:
          'The middle resort of the three, and the loud one — Veronicas and the surrounding strips are the island’s nightlife centre, with a long beach and a promenade linking it to the quieter towns on either side.',
        walk: 'The beaches, the promenade to Los Cristianos or Costa Adeje, and the bar strips.',
        watchOut:
          'The nightlife strips are exactly as advertised and audible from a long way off. Choose the Costa Adeje end if you want the location without the volume.',
      },
      {
        name: 'Puerto de la Cruz',
        slug: 'puerto-de-la-cruz',
        band: 'Value',
        bestFor: 'Couples and the green north',
        summary:
          'The north coast’s old resort town beneath Mount Teide — black-sand beaches, the Lago Martiánez sea pools, a botanical garden and an old quarter that is genuinely Canarian. Far cheaper than the south.',
        walk: 'The old harbour, Lago Martiánez, Playa Jardín and the botanical garden.',
        watchOut:
          'The north is cloudier and cooler — the trade winds bring grey mornings the south rarely sees, and the Atlantic here is rougher. It is served by Tenerife North, not South.',
      },
      {
        name: 'Santa Cruz & La Laguna',
        slug: 'santa-cruz-la-laguna',
        band: 'Value',
        bestFor: 'A city break rather than a beach one',
        summary:
          'The capital and the UNESCO-listed university town above it: shops, tapas, the Auditorio, a carnival second only to Rio, and the golden imported sand of Las Teresitas beach just outside town.',
        walk: 'The Santa Cruz shopping streets, the Auditorio, the market, and La Laguna’s old quarter by tram.',
        watchOut:
          'Not a resort — hotels are business-oriented and the beach is a bus ride away at Las Teresitas. La Laguna sits high enough to be noticeably cool and damp in the evening.',
      },
    ],
    faqs: [
      {
        q: 'Should I stay in the north or south of Tenerife?',
        a: 'South for reliable sun, big resort hotels and warm sea — Costa Adeje, Los Cristianos, Las Américas. North for green landscapes, real Canarian towns and much lower prices, accepting cloudier mornings and a rougher Atlantic. They are around two hours apart.',
      },
      {
        q: 'What is the best area in Tenerife for families?',
        a: 'Costa Adeje. Sheltered sandy beaches, a flat promenade, the largest hotels with proper kids’ pools, and Siam Park nearby. Los Cristianos is the cheaper alternative with a calmer town beach.',
      },
      {
        q: 'Which Tenerife resort is quietest?',
        a: 'Costa Adeje’s northern end around Playa del Duque, or the north coast towns — Puerto de la Cruz, Garachico, La Orotava. Avoid the Veronicas end of Playa de las Américas entirely if you want quiet nights.',
      },
      {
        q: 'Do I need a car in Tenerife?',
        a: 'Not if you are staying in one southern resort and using the promenade and the beach. Hire one if you want Teide, Masca, Anaga or the north — the island is large and mountainous, and the bus network, while good, takes a long time between regions.',
      },
      {
        q: 'Which airport should I fly into for Tenerife?',
        a: 'Tenerife South (TFS) for Costa Adeje, Los Cristianos and Las Américas. Tenerife North (TFN) for Santa Cruz, La Laguna and Puerto de la Cruz. Landing at the wrong one adds well over an hour of transfer each way.',
      },
    ],
  },
  {
    citySlug: 'bangkok',
    intro:
      'Bangkok’s traffic is the thing that decides where you should stay. The city is enormous and the roads are slow, so the practical rule is to sleep within a short walk of a BTS Skytrain or MRT station and let the elevated railway do the work. The old royal quarter, where most of the temples are, is the one area with no train — which is the trade-off at the heart of the choice.',
    verdict: {
      firstTime: 'Riverside & Old City (Rattanakosin)',
      value: 'Old City & Banglamphu',
      families: 'Sukhumvit',
      nightlife: 'Sukhumvit',
      couples: 'Riverside',
    },
    airport:
      'Suvarnabhumi (BKK) has the Airport Rail Link to Phaya Thai in about 30 minutes, connecting to the BTS. Don Mueang (DMK) is served by bus and train and is slower into town. A metered taxi runs 300–500 THB plus tolls, and can take well over an hour in traffic.',
    areas: [
      {
        name: 'Sukhumvit',
        slug: 'sukhumvit',
        band: 'Mid-range',
        bestFor: 'Best all-round base',
        summary:
          'The long boulevard east of the centre, with the BTS running above it and hotels, malls, restaurants and rooftop bars clustered around each station — Asok, Phrom Phong and Thong Lo in particular. The most convenient part of the city.',
        walk: 'Terminal 21 and EmQuartier malls, Benjasiri Park, and the whole BTS and MRT network from Asok.',
        watchOut:
          'A long way from the temples — the Grand Palace is 45 minutes or more by road. Some stretches, particularly Nana and lower Sukhumvit, are dominated by the go-go bar scene.',
      },
      {
        name: 'Riverside',
        slug: 'riverside',
        band: 'Premium',
        bestFor: 'Couples and the best hotels',
        summary:
          'The Chao Phraya riverbank around Saphan Taksin, where the grand old hotels sit beside the water and the river boats become your transport. It links the modern city to the old one without touching the traffic.',
        walk: 'The riverboat piers, ICONSIAM and Asiatique by shuttle boat, and Chinatown a short boat ride upriver.',
        watchOut:
          'The riverside strip itself is narrow — step back from the water and you are on a busy road. Only one BTS station serves it, so hotel location relative to Saphan Taksin matters a great deal.',
      },
      {
        name: 'Old City & Banglamphu (Rattanakosin)',
        slug: 'old-city-rattanakosin',
        band: 'Value',
        bestFor: 'Temples and the cheapest beds',
        summary:
          'The royal island: the Grand Palace, Wat Pho, Wat Arun across the water, and the Khao San Road backpacker quarter just north of them. The cheapest accommodation in the city and the only district where the temples are a walk away.',
        walk: 'The Grand Palace, Wat Pho, the Temple of the Emerald Buddha, Khao San Road and the river piers.',
        watchOut:
          'No BTS or MRT station in the old quarter, so you rely on river boats, buses and taxis in heavy traffic. Khao San is loud all night, and the tuk-tuk scams around the Grand Palace are relentless.',
      },
      {
        name: 'Silom & Sathorn',
        slug: 'silom-sathorn',
        band: 'Mid-range',
        bestFor: 'Business, and a quieter centre',
        summary:
          'The financial district between Sukhumvit and the river, on both the BTS and MRT, with Lumphini Park at one end and the Patpong night market at the other. Busy by day, calmer than Sukhumvit by night.',
        walk: 'Lumphini Park, the Patpong market, and the BTS and MRT interchange at Sala Daeng.',
        watchOut:
          'Office-district quiet at weekends, when parts of it shut down. Patpong itself is a tourist night market wrapped around an adult entertainment strip.',
      },
      {
        name: 'Ari & Phaya Thai',
        slug: 'ari-phaya-thai',
        band: 'Value',
        bestFor: 'Best value with a station',
        summary:
          'North along the BTS: Ari is a leafy residential district of independent cafés and local restaurants that has become the city’s quiet favourite, and Phaya Thai is where the Airport Rail Link meets the Skytrain.',
        walk: 'Ari’s café streets and local markets, and the BTS for everywhere else.',
        watchOut:
          'Few sights of its own and little nightlife — you ride the BTS in for everything. Ari has limited hotel stock compared with Sukhumvit.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Bangkok for first-time visitors?',
        a: 'Sukhumvit around Asok or Phrom Phong for convenience, or the Riverside if you want the river boats and a view. Both keep you off the roads. Stay in the Old City only if temples are the whole point of a short trip and you accept the lack of a train.',
      },
      {
        q: 'Should I stay near a BTS Skytrain station?',
        a: 'Yes — this is the single most useful rule in Bangkok. Traffic can turn a three-kilometre journey into 45 minutes, while the Skytrain does it in eight. A hotel five minutes from a station beats a nicer one twenty minutes away.',
      },
      {
        q: 'Is Khao San Road a good place to stay?',
        a: 'It is the cheapest area and closest to the temples, and it is loud until the early hours with no train station. It suits backpackers and short-stay travellers; for most other visitors, Banglamphu’s quieter streets nearby give the same location without the noise.',
      },
      {
        q: 'Where should families stay in Bangkok?',
        a: 'Sukhumvit around Phrom Phong or Thong Lo — malls with play areas and food halls, parks nearby, large family rooms, hotel pools, and the BTS on the doorstep for getting around without a car seat in traffic.',
      },
      {
        q: 'How far is Bangkok airport from the city?',
        a: 'Suvarnabhumi is about 30 minutes on the Airport Rail Link to Phaya Thai, and anywhere from 45 minutes to well over an hour by taxi depending on traffic. Don Mueang is closer geographically but has poorer rail links.',
      },
    ],
  },
  {
    citySlug: 'delhi',
    intro:
      'Delhi is two cities that were built to different plans. Old Delhi is Mughal, dense and chaotic, and it is where the food and the Red Fort are. New Delhi is the wide colonial grid of roundabouts and bungalows, and it is where you will actually want to sleep. South Delhi, further out, is where the city’s money, restaurants and quiet streets have moved.',
    verdict: {
      firstTime: 'Connaught Place & Central Delhi',
      value: 'Karol Bagh',
      families: 'South Delhi (Hauz Khas & Saket)',
      nightlife: 'South Delhi (Hauz Khas & Saket)',
      couples: 'Lutyens’ Delhi & Khan Market',
    },
    airport:
      'Indira Gandhi (DEL) connects by the Airport Express metro to New Delhi station in about 20 minutes. Use the prepaid taxi counter or a ride app rather than accepting an approach in the arrivals hall — the "your hotel is closed" diversion scam is a genuine and long-standing problem here.',
    areas: [
      {
        name: 'Connaught Place & Central Delhi',
        slug: 'connaught-place',
        band: 'Mid-range',
        bestFor: 'A first trip and the best connections',
        summary:
          'The white colonnaded circles at the centre of New Delhi, sitting on the junction of the metro’s main lines with the Airport Express a stop away. It is the most practical base in the city — central to both halves, and never far from a train.',
        walk: 'Jantar Mantar, the Connaught Place restaurants and shops, and Rajiv Chowk metro for everywhere else.',
        watchOut:
          'Touts around the outer circle and near New Delhi station are persistent, and the "tourist office" scam operates openly there. Book only through your hotel or an official counter.',
      },
      {
        name: 'Lutyens’ Delhi & Khan Market',
        slug: 'lutyens-khan-market',
        band: 'Premium',
        bestFor: 'Couples, calm and comfort',
        summary:
          'The imperial capital of wide avenues, roundabouts and enormous trees, holding India Gate, the government buildings and the Khan Market shopping enclave. The quietest and greenest central district, and where the grand hotels are.',
        walk: 'India Gate, Khan Market, the Lodhi Gardens and the Humayun’s Tomb approach.',
        watchOut:
          'The most expensive part of Delhi and deliberately low-density, so there is little street life — it is a district of embassies and bungalows rather than shops.',
      },
      {
        name: 'South Delhi (Hauz Khas & Saket)',
        slug: 'south-delhi-hauz-khas',
        band: 'Mid-range',
        bestFor: 'Restaurants and nightlife',
        summary:
          'Where contemporary Delhi lives: the Hauz Khas village bars overlooking a 13th-century reservoir and ruined madrasa, the Saket malls, and the best restaurant scene in the city. Well served by the metro’s yellow and magenta lines.',
        walk: 'The Hauz Khas complex and lake, the village bars, and the Deer Park.',
        watchOut:
          'A 30–45 minute metro ride from Old Delhi and the Red Fort, so the historic sights become a planned trip. Hauz Khas village itself is cramped and loud at night.',
      },
      {
        name: 'Karol Bagh',
        slug: 'karol-bagh',
        band: 'Value',
        bestFor: 'Best value with a metro station',
        summary:
          'A dense shopping and market district west of Connaught Place, on the blue line, with a very large supply of mid-range and budget hotels and one of the city’s best street-food streets.',
        walk: 'The Ajmal Khan Road market, the Karol Bagh metro, and the street-food stalls.',
        watchOut:
          'Crowded, noisy and heavy with traffic — this is a working market district, not a pleasant stroll. Hotel quality varies enormously on the same street, so read recent reviews.',
      },
      {
        name: 'Aerocity',
        slug: 'aerocity',
        band: 'Premium',
        bestFor: 'Early flights and short stopovers',
        summary:
          'A purpose-built cluster of international hotels minutes from the airport terminals, on the Airport Express line, with its own restaurant and bar complex.',
        walk: 'The hotel complex and its restaurants — and nothing else.',
        watchOut:
          'It is not Delhi in any meaningful sense: a hotel island beside a motorway. Fine for a stopover, wrong for a sightseeing trip.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Delhi for tourists?',
        a: 'Connaught Place and central New Delhi. It sits on the metro interchange, the Airport Express is one stop away, and both Old Delhi and the southern sights are a straightforward train ride. Lutyens’ Delhi around Khan Market is the quieter, more expensive alternative.',
      },
      {
        q: 'Should I stay in Old Delhi?',
        a: 'Visit it, but sleep elsewhere. Old Delhi has the Red Fort, the Jama Masjid and the best street food in India, and it also has the densest traffic, the narrowest lanes and the weakest hotel stock. It is 15 minutes by metro from Connaught Place.',
      },
      {
        q: 'Is Paharganj a good area to stay in Delhi?',
        a: 'It is the cheapest area, opposite New Delhi railway station, and it is the centre of the city’s tout and commission scene. Budget travellers use it and it works, but Karol Bagh a little further west offers comparable prices with considerably less hassle.',
      },
      {
        q: 'How do I avoid the Delhi airport taxi scam?',
        a: 'Use the Airport Express metro, the official prepaid taxi counter inside the terminal, or a ride app booked from the app itself. Ignore anyone who approaches you, and never accept that your hotel is "closed" or "overbooked" — that is the setup for being taken to a commission hotel.',
      },
      {
        q: 'Is South Delhi a good place to stay?',
        a: 'Yes, for restaurants, bars, malls and quieter tree-lined streets — Hauz Khas, Saket and Greater Kailash are where Delhi actually goes out. The trade-off is a 30–45 minute metro ride to the Old Delhi monuments.',
      },
    ],
  },
  {
    citySlug: 'mumbai',
    intro:
      'Mumbai is built on a narrow peninsula, so the city runs north to south and so does every journey. South Mumbai holds the colonial architecture, the Gateway of India and the museums; Bandra and the western suburbs hold the restaurants, the bars and the film industry; and the distance between them, in traffic, is the single biggest factor in where you should stay.',
    verdict: {
      firstTime: 'Colaba & South Mumbai',
      value: 'Andheri East',
      families: 'Juhu',
      nightlife: 'Bandra West',
      couples: 'Bandra West',
    },
    airport:
      'Chhatrapati Shivaji Maharaj (BOM) sits in the middle of the city at Andheri. Bandra is 20–30 minutes away, Juhu about the same, and South Mumbai anywhere from 45 minutes to well over an hour depending on traffic. Use the prepaid taxi counter or a ride app.',
    areas: [
      {
        name: 'Colaba & South Mumbai',
        slug: 'colaba-south-mumbai',
        band: 'Premium',
        bestFor: 'A first trip and the sights',
        summary:
          'The southern tip: the Gateway of India, the Taj Mahal Palace hotel, the Prince of Wales Museum, Marine Drive and the Victorian Gothic of Fort. Everything a visitor comes to see in Mumbai is inside a walk of here.',
        walk: 'The Gateway of India, Marine Drive, the Colaba Causeway market, the museum and Fort.',
        watchOut:
          'The furthest point from the airport — allow well over an hour for a morning flight. Hotel rates are the city’s highest and the Causeway hawking is persistent.',
      },
      {
        name: 'Bandra West',
        slug: 'bandra-west',
        band: 'Mid-range',
        bestFor: 'Restaurants and nightlife',
        summary:
          'The suburb that sets Mumbai’s tone: Bollywood homes on Carter Road, the sea-facing promenade at Bandstand, Portuguese-era villas in Ranwar, and the densest run of good restaurants and bars in the city.',
        walk: 'The Bandstand and Carter Road promenades, Ranwar village, Hill Road and Linking Road shopping.',
        watchOut:
          'A 45–75 minute drive from the southern sights depending on the hour. It is a residential suburb, so hotel stock is thinner and less grand than downtown.',
      },
      {
        name: 'Juhu',
        slug: 'juhu',
        band: 'Mid-range',
        bestFor: 'Families and the beach',
        summary:
          'A long city beach north of Bandra, backed by large hotels, film-industry homes and the famous evening chaat stalls. The most relaxed base in Mumbai and close to the airport.',
        walk: 'Juhu beach, the evening food stalls and the seafront hotels.',
        watchOut:
          'The beach is for walking and eating, not swimming — the water is not clean. It is a long way from South Mumbai, and the area is quiet in a suburban way.',
      },
      {
        name: 'Lower Parel & Worli',
        slug: 'lower-parel-worli',
        band: 'Premium',
        bestFor: 'A midpoint between north and south',
        summary:
          'The old mill district rebuilt as towers, malls and restaurants, with the Sea Link bridge running out from Worli. Roughly halfway between the airport and the southern sights, which makes it the practical compromise.',
        walk: 'The Phoenix and Palladium malls, the mill-district restaurants and the Worli seafront.',
        watchOut:
          'Corporate and high-rise, with little of Mumbai’s character at street level. Traffic through the district is heavy at both rush hours.',
      },
      {
        name: 'Andheri East',
        slug: 'andheri-east',
        band: 'Value',
        bestFor: 'Best value and airport access',
        summary:
          'The business district beside the airport, full of mid-range and budget hotels serving domestic travellers, on the metro and the western suburban rail line.',
        walk: 'The airport terminals, and the surrounding office and hotel complexes.',
        watchOut:
          'Nothing to see and nowhere pleasant to walk — it is a functional district. Choose it for price and an early flight, not for a holiday.',
      },
    ],
    faqs: [
      {
        q: 'What is the best area to stay in Mumbai for tourists?',
        a: 'Colaba and South Mumbai. The Gateway of India, Marine Drive, the museums and the colonial architecture are all walkable, which is rare in this city. The cost is distance from the airport and the highest room rates in Mumbai.',
      },
      {
        q: 'Is Bandra a good place to stay in Mumbai?',
        a: 'Yes, if you care more about eating and going out than about monuments. Bandra has the best restaurants, the sea-facing promenades and a genuine neighbourhood feel, and it is far closer to the airport. Expect a long drive to the southern sights.',
      },
      {
        q: 'How bad is Mumbai traffic for getting around?',
        a: 'Bad enough to plan around. South Mumbai to Bandra can take 45 minutes or two hours depending on the time of day. The suburban trains and the metro are far faster than the roads, and the trains are extremely crowded at peak hours.',
      },
      {
        q: 'Where should I stay in Mumbai for an early flight?',
        a: 'Andheri East or the hotels immediately around the airport. South Mumbai is a genuine risk for a dawn departure — allow well over an hour, and more in the monsoon.',
      },
      {
        q: 'Is Juhu beach worth staying at?',
        a: 'For a relaxed family base near the airport, yes — a long promenade, the evening food stalls and large hotels. Do not plan on swimming; the water quality is poor, and this is a beach for walking rather than bathing.',
      },
    ],
  },
  {
    citySlug: 'goa',
    intro:
      'Goa is a coastline, not a city, and the choice is essentially north versus south. North Goa is busy, cheap and social, with the markets, the beach shacks and the nightlife. South Goa is quiet, greener and more expensive, with long empty sands and resorts rather than strips. Panjim in the middle is the actual town, and the only place that feels Portuguese.',
    verdict: {
      firstTime: 'North Goa (Calangute, Baga & Anjuna)',
      value: 'North Goa (Calangute, Baga & Anjuna)',
      families: 'South Goa (Palolem & Colva)',
      nightlife: 'North Goa (Calangute, Baga & Anjuna)',
      couples: 'Assagao & Siolim',
    },
    airport:
      'Dabolim (GOI) sits in the middle of the state — about 45 minutes to Calangute in the north and 40 minutes to Colva in the south. The newer Mopa airport (GOX) in the far north is closer to the northern beaches and further from everything else. Use the prepaid taxi counter or a ride app.',
    areas: [
      {
        name: 'North Goa (Calangute, Baga & Anjuna)',
        slug: 'north-goa-calangute-baga',
        band: 'Value',
        bestFor: 'A first trip, and best value',
        summary:
          'The busy stretch: Calangute and Baga’s beach shacks and water sports, the Anjuna Wednesday flea market, and the Saturday night market at Arpora. The widest range of cheap rooms in the state and everything within a scooter ride.',
        walk: 'The Calangute–Baga beach strip, the shacks, and the markets by a short taxi or scooter.',
        watchOut:
          'Crowded and commercial in season, with the strip behind the beach given over to bars and souvenir shops. Baga in particular is loud at night, and the beaches are busy.',
      },
      {
        name: 'Assagao & Siolim',
        slug: 'assagao-siolim',
        band: 'Premium',
        bestFor: 'Couples and boutique stays',
        summary:
          'Inland from the northern beaches: villages of Portuguese houses, rice paddies and mango trees, now holding the state’s best boutique hotels and restaurants. Ten minutes from the sand and a world away from the strip.',
        walk: 'The village lanes, the restaurants and design shops — the beaches need a scooter or taxi.',
        watchOut:
          'Not on the beach, so you drive or ride to it every day. The most expensive area in Goa, and it can feel more like a design magazine than an Indian village.',
      },
      {
        name: 'South Goa (Palolem & Colva)',
        slug: 'south-goa-palolem-colva',
        band: 'Mid-range',
        bestFor: 'Families and quiet sand',
        summary:
          'Long, wide, comparatively empty beaches backed by palms and resorts rather than bars — Palolem’s crescent bay in the far south, Colva and Benaulim in the middle. Calmer water and far fewer people.',
        walk: 'The beach in front of you, and the nearest village strip of restaurants.',
        watchOut:
          'Quiet in the evening and spread out, so you need transport for anything beyond your own beach. Many of the smaller places close entirely during the monsoon.',
      },
      {
        name: 'Panjim & Fontainhas',
        slug: 'panjim-fontainhas',
        band: 'Value',
        bestFor: 'Portuguese Goa and a real town',
        summary:
          'The state capital on the Mandovi river, with the Latin Quarter of Fontainhas — narrow lanes of ochre, blue and green houses with tiled roofs, the closest thing in India to a Portuguese town.',
        walk: 'The Fontainhas lanes, the church of Our Lady of the Immaculate Conception, the riverfront and the market.',
        watchOut:
          'It is a working town, not a beach — the nearest sand at Miramar is a short drive and is not the best in the state. Hotel stock is small and mostly heritage guesthouses.',
      },
      {
        name: 'Arambol & Mandrem',
        slug: 'arambol-mandrem',
        band: 'Value',
        bestFor: 'Long stays and a slower north',
        summary:
          'The far north beyond the main strip: wide beaches, yoga and music culture, beach huts and a long-stay crowd that arrives in November and leaves in March.',
        walk: 'The beach, the sweetwater lake at Arambol, and the village restaurants along the sand.',
        watchOut:
          'A long way from the airport and from Panjim, and rooms are simple by design — beach huts rather than hotels. Almost everything closes for the monsoon.',
      },
    ],
    faqs: [
      {
        q: 'Should I stay in North or South Goa?',
        a: 'North for markets, nightlife, beach shacks and the lowest prices; South for long quiet beaches, resorts and space. If it is your first trip and you want to see what Goa is about, stay north. If you want to read a book on empty sand, go south.',
      },
      {
        q: 'Which is the best beach area in Goa for families?',
        a: 'South Goa — Palolem, Colva and Benaulim have wider, calmer, less crowded beaches and resort hotels with pools. In the north, Candolim is the gentler alternative to Baga and Calangute.',
      },
      {
        q: 'When should I avoid Goa?',
        a: 'June to September, the monsoon — much of the beach infrastructure is dismantled, many shacks and small hotels close, and swimming is unsafe. November to February is the peak season; March to May is hot but much cheaper.',
      },
      {
        q: 'Do I need a scooter or car in Goa?',
        a: 'Something, yes. The beaches are spread along a long coastline and taxi fares add up quickly. Scooters are the local answer and are widely rented; hire a car with a driver if you are not confident on Indian roads.',
      },
      {
        q: 'Which Goa airport should I fly into?',
        a: 'Dabolim (GOI) is central and suits both north and south. Mopa (GOX) in the far north is closer to Arambol, Mandrem and the northern beaches, and noticeably further from the south. Check which one your flight uses before booking a hotel.',
      },
    ],
  },
];
