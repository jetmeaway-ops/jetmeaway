/**
 * 2026 FIFA World Cup host-city dataset for the temporary /world-cup-2026
 * campaign page. Curated NICHE / boutique hotels per city (not generic chains),
 * the stadium FIFA + commercial names, IATA codes, the blog hotel-guide slug,
 * and a verified Unsplash hero image (same IDs used by the per-city blog posts).
 *
 * England's confirmed Group L route is flagged via `englandMatch`:
 *   Dallas 17 Jun -> Boston 23 Jun -> New York/NJ 27 Jun.
 *
 * Hotel photos are resolved at render by <HotelPhoto hotelName city /> (Google
 * Places + Unsplash fallback), so only the name + city are needed here.
 */

export type NicheHotel = {
  name: string;
  neighbourhood: string;
  hook: string;
};

export type EnglandMatch = {
  label: string; // e.g. 'England vs Croatia'
  date: string; // human, e.g. '17 Jun 2026'
  iso: string; // '2026-06-17'
};

export type WorldCupCity = {
  slug: string; // 'new-york'
  name: string; // 'New York / New Jersey'
  shortName: string; // 'New York'
  country: 'USA' | 'Canada' | 'Mexico';
  flag: string;
  iata: string[]; // first entry is the default for flight links
  stadiumFifa: string;
  stadiumCommercial: string;
  blogSlug: string; // best-hotels-<slug>-2026
  heroImage: string;
  englandMatch?: EnglandMatch;
  note?: string; // optional extra context (final, opening match, etc.)
  hotels: NicheHotel[];
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=1200&h=600&fit=crop`;

export const WC_CITIES: WorldCupCity[] = [
  // ── England's Group L cities first ──────────────────────────────────────
  {
    slug: 'dallas',
    name: 'Dallas',
    shortName: 'Dallas',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['DFW'],
    stadiumFifa: 'Dallas Stadium',
    stadiumCommercial: 'AT&T Stadium, Arlington',
    blogSlug: 'best-hotels-dallas-2026',
    heroImage: unsplash('1621904878414-d4ca4756bd7e'),
    englandMatch: { label: 'England vs Croatia', date: '17 Jun 2026', iso: '2026-06-17' },
    note: "England's opening match",
    hotels: [
      { name: 'Hotel Saint Germain', neighbourhood: 'Uptown', hook: 'A seven-suite antebellum mansion — the most romantic address in Texas.' },
      { name: 'The Joule', neighbourhood: 'Downtown', hook: 'An Art Deco bank turned design hotel with a cantilevered glass sky-pool.' },
      { name: 'The Adolphus, Autograph Collection', neighbourhood: 'Downtown', hook: 'A 1912 beaux-arts grande dame built by the Busch beer family.' },
    ],
  },
  {
    slug: 'boston',
    name: 'Boston',
    shortName: 'Boston',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['BOS'],
    stadiumFifa: 'Boston Stadium',
    stadiumCommercial: 'Gillette Stadium, Foxborough',
    blogSlug: 'best-hotels-boston-2026',
    heroImage: unsplash('1565127803082-69dd82351360'),
    englandMatch: { label: 'England vs Ghana', date: '23 Jun 2026', iso: '2026-06-23' },
    hotels: [
      { name: 'The Verb Hotel', neighbourhood: 'Fenway', hook: 'A vinyl-and-rock-memorabilia motor lodge a long ball from Fenway Park.' },
      { name: 'The Liberty, a Luxury Collection Hotel', neighbourhood: 'Beacon Hill', hook: 'A converted 1851 jail — the old cells are now a buzzing bar.' },
      { name: 'The Newbury Boston', neighbourhood: 'Back Bay', hook: 'The restored original Ritz, overlooking the Public Garden.' },
    ],
  },
  {
    slug: 'new-york',
    name: 'New York / New Jersey',
    shortName: 'New York',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['EWR', 'JFK'],
    stadiumFifa: 'New York New Jersey Stadium',
    stadiumCommercial: 'MetLife Stadium',
    blogSlug: 'best-hotels-new-york-2026',
    heroImage: unsplash('1496588152823-86ff7695e68f'),
    englandMatch: { label: 'England vs Panama', date: '27 Jun 2026', iso: '2026-06-27' },
    note: 'Hosts the Final on 19 July',
    hotels: [
      { name: 'The Greenwich Hotel', neighbourhood: 'Tribeca', hook: "Robert De Niro's hushed brick hideaway with the lantern-lit Shibui Spa pool." },
      { name: 'The Bowery Hotel', neighbourhood: 'East Village', hook: "A velvet-and-Persian-rug lobby — downtown's living room." },
      { name: 'The Ludlow Hotel', neighbourhood: 'Lower East Side', hook: 'Louche boho-luxe rooms with arched factory windows over Manhattan.' },
      { name: 'The Beekman, a Thompson Hotel', neighbourhood: 'Financial District', hook: 'A restored 1883 atrium under a nine-storey Victorian pyramid skylight.' },
    ],
  },
  // ── Other USA host cities ───────────────────────────────────────────────
  {
    slug: 'los-angeles',
    name: 'Los Angeles',
    shortName: 'Los Angeles',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['LAX'],
    stadiumFifa: 'Los Angeles Stadium',
    stadiumCommercial: 'SoFi Stadium, Inglewood',
    blogSlug: 'best-hotels-los-angeles-2026',
    heroImage: unsplash('1597982087634-9884f03198ce'),
    hotels: [
      { name: 'Chateau Marmont', neighbourhood: 'Sunset Strip', hook: 'The famously discreet 1929 castle of Hollywood legend.' },
      { name: 'The Hoxton, Downtown LA', neighbourhood: 'Downtown', hook: 'A Euro cool-kid hotel with a Pizzette rooftop and pool.' },
      { name: 'Petit Ermitage', neighbourhood: 'West Hollywood', hook: 'A bohemian members-ish rooftop with tortoises and a saltwater pool.' },
      { name: 'Hotel Figueroa', neighbourhood: 'Downtown', hook: 'A 1926 Spanish-colonial, originally women-run, by the stadium-bound Metro.' },
    ],
  },
  {
    slug: 'miami',
    name: 'Miami',
    shortName: 'Miami',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['MIA'],
    stadiumFifa: 'Miami Stadium',
    stadiumCommercial: 'Hard Rock Stadium, Miami Gardens',
    blogSlug: 'best-hotels-miami-2026',
    heroImage: unsplash('1558951412-8845d2b0f2fc'),
    hotels: [
      { name: 'The Standard Spa, Miami Beach', neighbourhood: 'Belle Isle', hook: 'An adults-leaning bayfront spa with a hammam and infinity hot tub.' },
      { name: 'Faena Hotel Miami Beach', neighbourhood: 'Mid-Beach', hook: "A gilded mammoth with Damien Hirst's gold mammoth skeleton in the lobby." },
      { name: 'The Betsy Hotel', neighbourhood: 'South Beach', hook: 'A literary-themed colonial right on Art Deco Ocean Drive.' },
    ],
  },
  {
    slug: 'atlanta',
    name: 'Atlanta',
    shortName: 'Atlanta',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['ATL'],
    stadiumFifa: 'Atlanta Stadium',
    stadiumCommercial: 'Mercedes-Benz Stadium',
    blogSlug: 'best-hotels-atlanta-2026',
    heroImage: unsplash('1663601460253-aba72eea6edf'),
    hotels: [
      { name: 'Hotel Clermont', neighbourhood: 'Poncey-Highland', hook: "A restored 1920s landmark above Atlanta's most infamous dive lounge." },
      { name: 'The Candler Hotel, Curio Collection', neighbourhood: 'Downtown', hook: 'A 1906 neo-Gothic bank tower dressed in marble and gold leaf.' },
      { name: 'Bellyard, West Midtown', neighbourhood: 'West Midtown', hook: 'A design-forward boutique right on the Atlanta BeltLine.' },
    ],
  },
  {
    slug: 'seattle',
    name: 'Seattle',
    shortName: 'Seattle',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['SEA'],
    stadiumFifa: 'Seattle Stadium',
    stadiumCommercial: 'Lumen Field',
    blogSlug: 'best-hotels-seattle-2026',
    heroImage: unsplash('1542223616-9de9adb5e3e8'),
    hotels: [
      { name: 'The Edgewater Hotel', neighbourhood: 'Waterfront, Pier 67', hook: 'The over-the-water lodge where The Beatles once fished from their window.' },
      { name: 'Ace Hotel Seattle', neighbourhood: 'Belltown', hook: 'The original minimalist Ace — shared-bath rooms and serious cool.' },
      { name: 'The Sound Hotel, Belltown', neighbourhood: 'Belltown', hook: 'A locally minded modern boutique a few blocks from the Space Needle.' },
    ],
  },
  {
    slug: 'san-francisco',
    name: 'San Francisco',
    shortName: 'San Francisco',
    country: 'USA',
    flag: '🇺🇸',
    iata: ['SFO'],
    stadiumFifa: 'San Francisco Bay Area Stadium',
    stadiumCommercial: "Levi's Stadium, Santa Clara",
    blogSlug: 'best-hotels-san-francisco-2026',
    heroImage: unsplash('1521747116042-5a810fda9664'),
    hotels: [
      { name: 'The Phoenix Hotel', neighbourhood: 'Lower Nob Hill', hook: "A palm-fringed rock-'n'-roll motor lodge — the touring-band classic." },
      { name: 'Hotel Zeppelin', neighbourhood: 'Union Square', hook: 'A psychedelic, Summer-of-Love-themed design hotel.' },
      { name: 'The Inn at the Presidio', neighbourhood: 'The Presidio', hook: '1903 officers’ quarters turned cosy inn inside the national park.' },
    ],
  },
  // ── Canada ──────────────────────────────────────────────────────────────
  {
    slug: 'toronto',
    name: 'Toronto',
    shortName: 'Toronto',
    country: 'Canada',
    flag: '🇨🇦',
    iata: ['YYZ'],
    stadiumFifa: 'Toronto Stadium',
    stadiumCommercial: 'BMO Field',
    blogSlug: 'best-hotels-toronto-2026',
    heroImage: unsplash('1543962226-818f4301073f'),
    hotels: [
      { name: 'The Drake Hotel', neighbourhood: 'West Queen West', hook: "The original art-and-music boutique anchoring Toronto's hippest strip." },
      { name: 'The Broadview Hotel', neighbourhood: 'Riverside', hook: 'A restored 1891 Romanesque red-brick with a glass rooftop bar.' },
      { name: 'Gladstone House', neighbourhood: 'Queen Street West', hook: "Toronto's oldest hotel — every room designed by a different artist." },
    ],
  },
  {
    slug: 'vancouver',
    name: 'Vancouver',
    shortName: 'Vancouver',
    country: 'Canada',
    flag: '🇨🇦',
    iata: ['YVR'],
    stadiumFifa: 'Vancouver Stadium',
    stadiumCommercial: 'BC Place',
    blogSlug: 'best-hotels-vancouver-2026',
    heroImage: unsplash('1730661906876-18bfc6e95f2f'),
    hotels: [
      { name: 'The Burrard', neighbourhood: 'Downtown', hook: 'A neon-sign 1956 motor hotel reborn as a mid-century courtyard boutique.' },
      { name: 'Opus Hotel Vancouver', neighbourhood: 'Yaletown', hook: "A colour-drenched design hotel in the city's nightlife quarter." },
      { name: 'The Loden Vancouver', neighbourhood: 'Coal Harbour', hook: 'A sleek independent near the seawall and Stanley Park.' },
    ],
  },
  // ── Mexico ──────────────────────────────────────────────────────────────
  {
    slug: 'mexico-city',
    name: 'Mexico City',
    shortName: 'Mexico City',
    country: 'Mexico',
    flag: '🇲🇽',
    iata: ['MEX'],
    stadiumFifa: 'Mexico City Stadium',
    stadiumCommercial: 'Estadio Azteca',
    blogSlug: 'best-hotels-mexico-city-2026',
    heroImage: unsplash('1585464231875-d9ef1f5ad396'),
    note: 'Hosts the Opening Match on 11 June',
    hotels: [
      { name: 'Hotel Carlota', neighbourhood: 'Cuauhtémoc', hook: 'A pared-back design hotel built around a glass-walled courtyard pool.' },
      { name: 'Condesa DF', neighbourhood: 'La Condesa', hook: 'A 1928 French-neoclassical triangle with a leafy rooftop, in the hippest barrio.' },
      { name: 'Brick Hotel Mexico City', neighbourhood: 'Roma Norte', hook: 'An early-20th-century mansion turned intimate luxury bolthole.' },
      { name: 'Círculo Mexicano', neighbourhood: 'Centro Histórico', hook: 'Shaker-spare rooms and a rooftop pool looking over the Zócalo.' },
    ],
  },
];
