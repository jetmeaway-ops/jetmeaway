/**
 * 2026 FIFA World Cup host-city dataset for the temporary /world-cup-2026
 * campaign page. Curated NICHE / boutique hotels per city (not generic chains),
 * the stadium FIFA + commercial names, IATA codes, the blog hotel-guide slug,
 * and a verified Unsplash hero image (same IDs used by the per-city blog posts).
 *
 * England's confirmed Group L route is flagged via `englandMatch`:
 *   Dallas 17 Jun -> Boston 23 Jun -> New York/NJ 27 Jun.
 *
 * Scotland's confirmed Group C route is flagged via `scotlandMatches` (an
 * array, because Boston hosts TWO of Scotland's three group games):
 *   Boston (v Haiti 13 Jun, v Morocco 19 Jun) -> Miami (v Brazil 24 Jun).
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

export type ScotlandMatch = {
  label: string; // e.g. 'Scotland vs Haiti'
  date: string; // human, e.g. '13 Jun 2026'
  iso: string; // '2026-06-13'
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
  scotlandMatches?: ScotlandMatch[]; // array — Boston hosts 2 Scotland group games
  note?: string; // optional extra context (final, opening match, etc.)
  /**
   * ISO dates (sorted) on which this city hosts a 2026 World Cup match.
   * Drives the hotel pre-fill dates (next upcoming match → +2 nights) and the
   * auto-hide: a city disappears from the page once ALL its match dates are in
   * the past. Anchored on confirmed dates (England's games, the 11 Jun opening,
   * the 19 Jul final, plus a few known group fixtures); the rest are
   * representative group-stage dates — confirm against the official FIFA
   * fixture list and edit here as needed.
   */
  matchDates: string[];
  hotels: NicheHotel[];
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=1200&h=600&fit=crop`;

/** Default departure date for non-England featured flight routes (tournament window). */
export const WC_DATES = { flightDep: '2026-06-15' } as const;

/**
 * Stadium WGS84 coords + a hotel-search radius (km) per host city, keyed by
 * slug. Used to deep-link the /hotels search CENTRED ON THE MATCH VENUE — the
 * `lat`/`lng` are forwarded as the geo-filter centroid (autocompleteCentre,
 * which the /api/hotels route prioritises over the city-centre table), so the
 * results are "hotels nearest the stadium", with the match dates pre-filled.
 *
 * Radius is a uniform 50km: LiteAPI's geo-search around several of these
 * centroids returns NOTHING at a tight 15-30km radius (an upstream-inventory
 * quirk — verified: Dallas/Atlanta/Seattle/SF/Vancouver came back empty at
 * 20-30km but healthy at 50km). 50km still keeps the search anchored on the
 * stadium (closest hotels rank up) while guaranteeing live inventory for all
 * 11 venues, including the remote ones (Foxborough, Santa Clara, Arlington).
 */
const WC_RADIUS_KM = 50;
export const STADIUM_COORDS: Record<string, { lat: number; lng: number; radiusKm: number }> = {
  dallas: { lat: 32.7473, lng: -97.0945, radiusKm: WC_RADIUS_KM }, // AT&T Stadium, Arlington
  boston: { lat: 42.0909, lng: -71.2643, radiusKm: WC_RADIUS_KM }, // Gillette Stadium, Foxborough
  'new-york': { lat: 40.8135, lng: -74.0745, radiusKm: WC_RADIUS_KM }, // MetLife Stadium, East Rutherford
  'los-angeles': { lat: 33.9535, lng: -118.3392, radiusKm: WC_RADIUS_KM }, // SoFi Stadium, Inglewood
  miami: { lat: 25.958, lng: -80.2389, radiusKm: WC_RADIUS_KM }, // Hard Rock Stadium, Miami Gardens
  atlanta: { lat: 33.7554, lng: -84.4009, radiusKm: WC_RADIUS_KM }, // Mercedes-Benz Stadium
  seattle: { lat: 47.5952, lng: -122.3316, radiusKm: WC_RADIUS_KM }, // Lumen Field
  'san-francisco': { lat: 37.403, lng: -121.9698, radiusKm: WC_RADIUS_KM }, // Levi's Stadium, Santa Clara
  toronto: { lat: 43.6332, lng: -79.4185, radiusKm: WC_RADIUS_KM }, // BMO Field
  vancouver: { lat: 49.2768, lng: -123.1118, radiusKm: WC_RADIUS_KM }, // BC Place
  'mexico-city': { lat: 19.303, lng: -99.1506, radiusKm: WC_RADIUS_KM }, // Estadio Azteca
};

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
    matchDates: ['2026-06-14', '2026-06-17', '2026-06-20', '2026-06-25', '2026-06-27'],
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
    matchDates: ['2026-06-13', '2026-06-16', '2026-06-19', '2026-06-23', '2026-06-26'],
    englandMatch: { label: 'England vs Ghana', date: '23 Jun 2026', iso: '2026-06-23' },
    scotlandMatches: [
      { label: 'Scotland vs Haiti', date: '13 Jun 2026', iso: '2026-06-13' },
      { label: 'Scotland vs Morocco', date: '19 Jun 2026', iso: '2026-06-19' },
    ],
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
    matchDates: ['2026-06-13', '2026-06-16', '2026-06-22', '2026-06-25', '2026-06-27', '2026-07-19'],
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
    matchDates: ['2026-06-12', '2026-06-15', '2026-06-18', '2026-06-21', '2026-06-25'],
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
    matchDates: ['2026-06-15', '2026-06-21', '2026-06-24', '2026-07-11'],
    scotlandMatches: [
      { label: 'Scotland vs Brazil', date: '24 Jun 2026', iso: '2026-06-24' },
    ],
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
    matchDates: ['2026-06-15', '2026-06-18', '2026-06-21', '2026-06-24'],
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
    matchDates: ['2026-06-15', '2026-06-19', '2026-06-24', '2026-06-26'],
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
    matchDates: ['2026-06-13', '2026-06-16', '2026-06-22', '2026-06-25'],
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
    matchDates: ['2026-06-12', '2026-06-16', '2026-06-20', '2026-06-23'],
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
    matchDates: ['2026-06-13', '2026-06-17', '2026-06-21', '2026-06-24'],
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
    matchDates: ['2026-06-11', '2026-06-14', '2026-06-18', '2026-06-24'],
    note: 'Hosts the Opening Match on 11 June',
    hotels: [
      { name: 'Hotel Carlota', neighbourhood: 'Cuauhtémoc', hook: 'A pared-back design hotel built around a glass-walled courtyard pool.' },
      { name: 'Condesa DF', neighbourhood: 'La Condesa', hook: 'A 1928 French-neoclassical triangle with a leafy rooftop, in the hippest barrio.' },
      { name: 'Brick Hotel Mexico City', neighbourhood: 'Roma Norte', hook: 'An early-20th-century mansion turned intimate luxury bolthole.' },
      { name: 'Círculo Mexicano', neighbourhood: 'Centro Histórico', hook: 'Shaker-spare rooms and a rooftop pool looking over the Zócalo.' },
    ],
  },
];
