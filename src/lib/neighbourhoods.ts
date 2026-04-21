/**
 * Curated neighbourhoods for major cities — surfaced in the hotels
 * autocomplete whenever the user types the parent city (e.g. "London"
 * alone, where LiteAPI /data/places otherwise only returns the country
 * record) or any substring of a neighbourhood name.
 *
 * Each entry is keyed to a parent city and carries lat/lng so the future
 * map view can re-centre on a chosen area.  The display string is what
 * we pass back to LiteAPI hotel search (`"Paddington, London, UK"`) —
 * LiteAPI's text search handles the geocoding for us so we don't need
 * a special place-id.
 */

export interface Neighbourhood {
  /** Short display name, e.g. "Paddington" */
  name: string;
  /** Parent city, e.g. "London" */
  parent: string;
  /** Country for query disambiguation */
  country: string;
  /** Centre latitude */
  lat: number;
  /** Centre longitude */
  lng: number;
  /** Optional one-liner shown under the name in the dropdown */
  blurb?: string;
}

/* ───────────────────────────────────────────────────────────────────────── */
/*  UK — the three we care most about for British users                      */
/* ───────────────────────────────────────────────────────────────────────── */

const LONDON: Neighbourhood[] = [
  { name: 'Westminster',    parent: 'London', country: 'UK', lat: 51.4975, lng: -0.1357, blurb: 'Big Ben, parliament, riverside' },
  { name: 'Victoria',       parent: 'London', country: 'UK', lat: 51.4952, lng: -0.1441, blurb: 'Station, West End gateway' },
  { name: 'Paddington',     parent: 'London', country: 'UK', lat: 51.5154, lng: -0.1755, blurb: 'Heathrow Express, Hyde Park' },
  { name: 'Hammersmith',    parent: 'London', country: 'UK', lat: 51.4927, lng: -0.2339, blurb: 'Riverside West London' },
  { name: 'Kensington',     parent: 'London', country: 'UK', lat: 51.4990, lng: -0.1745, blurb: 'Museums, Hyde Park' },
  { name: 'Chelsea',        parent: 'London', country: 'UK', lat: 51.4875, lng: -0.1687, blurb: 'Kings Road, riverside' },
  { name: 'Mayfair',        parent: 'London', country: 'UK', lat: 51.5094, lng: -0.1474, blurb: 'Luxury shopping, 5-star hotels' },
  { name: 'Soho',           parent: 'London', country: 'UK', lat: 51.5142, lng: -0.1364, blurb: 'West End, theatres, nightlife' },
  { name: 'Covent Garden',  parent: 'London', country: 'UK', lat: 51.5117, lng: -0.1240, blurb: 'Markets, Royal Opera House' },
  { name: 'Shoreditch',     parent: 'London', country: 'UK', lat: 51.5264, lng: -0.0785, blurb: 'East End, tech scene, nightlife' },
  { name: 'The City',       parent: 'London', country: 'UK', lat: 51.5155, lng: -0.0922, blurb: 'Financial district, St Paul\u2019s' },
  { name: 'Camden',         parent: 'London', country: 'UK', lat: 51.5390, lng: -0.1426, blurb: 'Markets, music venues' },
  { name: 'Greenwich',      parent: 'London', country: 'UK', lat: 51.4826, lng: -0.0077, blurb: 'Royal park, meridian line' },
  { name: 'Canary Wharf',   parent: 'London', country: 'UK', lat: 51.5055, lng: -0.0235, blurb: 'Docklands, modern business district' },
  { name: 'King\u2019s Cross', parent: 'London', country: 'UK', lat: 51.5308, lng: -0.1238, blurb: 'Eurostar, St Pancras' },
  { name: 'Notting Hill',   parent: 'London', country: 'UK', lat: 51.5094, lng: -0.1968, blurb: 'Portobello Road, colourful houses' },
  { name: 'Bloomsbury',     parent: 'London', country: 'UK', lat: 51.5228, lng: -0.1274, blurb: 'British Museum, Georgian squares' },
  { name: 'Marylebone',     parent: 'London', country: 'UK', lat: 51.5179, lng: -0.1495, blurb: 'Regent\u2019s Park, boutique shopping' },
];

const MANCHESTER: Neighbourhood[] = [
  { name: 'Northern Quarter', parent: 'Manchester', country: 'UK', lat: 53.4850, lng: -2.2350, blurb: 'Bars, indie shops, street art' },
  { name: 'Deansgate',        parent: 'Manchester', country: 'UK', lat: 53.4776, lng: -2.2507, blurb: 'Castlefield, canal-side hotels' },
  { name: 'Spinningfields',   parent: 'Manchester', country: 'UK', lat: 53.4810, lng: -2.2525, blurb: 'Business district, fine dining' },
  { name: 'Salford Quays',    parent: 'Manchester', country: 'UK', lat: 53.4722, lng: -2.2935, blurb: 'MediaCityUK, Lowry theatre' },
  { name: 'Piccadilly',       parent: 'Manchester', country: 'UK', lat: 53.4775, lng: -2.2310, blurb: 'Station, shopping' },
];

const EDINBURGH: Neighbourhood[] = [
  { name: 'Old Town',    parent: 'Edinburgh', country: 'UK', lat: 55.9500, lng: -3.1883, blurb: 'Royal Mile, castle' },
  { name: 'New Town',    parent: 'Edinburgh', country: 'UK', lat: 55.9554, lng: -3.1937, blurb: 'Georgian architecture, Princes St' },
  { name: 'Leith',       parent: 'Edinburgh', country: 'UK', lat: 55.9752, lng: -3.1690, blurb: 'Waterfront, restaurants' },
  { name: 'Haymarket',   parent: 'Edinburgh', country: 'UK', lat: 55.9458, lng: -3.2186, blurb: 'Station, tram to airport' },
  { name: 'Grassmarket', parent: 'Edinburgh', country: 'UK', lat: 55.9472, lng: -3.1947, blurb: 'Pubs, views of the castle' },
];

const BIRMINGHAM: Neighbourhood[] = [
  { name: 'Jewellery Quarter', parent: 'Birmingham', country: 'UK', lat: 52.4870, lng: -1.9070, blurb: 'Historic, indie dining' },
  { name: 'Digbeth',           parent: 'Birmingham', country: 'UK', lat: 52.4748, lng: -1.8893, blurb: 'Creative scene, street food' },
  { name: 'City Centre',       parent: 'Birmingham', country: 'UK', lat: 52.4800, lng: -1.9030, blurb: 'Bullring, New Street station' },
];

const GLASGOW: Neighbourhood[] = [
  { name: 'Merchant City', parent: 'Glasgow', country: 'UK', lat: 55.8586, lng: -4.2455, blurb: 'Restaurants, boutique hotels' },
  { name: 'West End',      parent: 'Glasgow', country: 'UK', lat: 55.8738, lng: -4.2910, blurb: 'University, Kelvingrove museum' },
  { name: 'City Centre',   parent: 'Glasgow', country: 'UK', lat: 55.8609, lng: -4.2514, blurb: 'George Square, Buchanan St' },
];

/* ───────────────────────────────────────────────────────────────────────── */
/*  Europe — cities people actually ask for                                  */
/* ───────────────────────────────────────────────────────────────────────── */

const PARIS: Neighbourhood[] = [
  { name: 'Le Marais',          parent: 'Paris', country: 'France', lat: 48.8575, lng: 2.3585, blurb: 'Historic, boutique-lined streets' },
  { name: 'Montmartre',         parent: 'Paris', country: 'France', lat: 48.8867, lng: 2.3431, blurb: 'Sacré-Cœur, hillside cafés' },
  { name: 'Champs-\u00c9lys\u00e9es', parent: 'Paris', country: 'France', lat: 48.8698, lng: 2.3079, blurb: 'Shopping, Arc de Triomphe' },
  { name: 'Saint-Germain',      parent: 'Paris', country: 'France', lat: 48.8535, lng: 2.3347, blurb: 'Left Bank, literary cafés' },
  { name: 'Latin Quarter',      parent: 'Paris', country: 'France', lat: 48.8499, lng: 2.3471, blurb: 'Sorbonne, historic alleys' },
  { name: 'Opera',              parent: 'Paris', country: 'France', lat: 48.8713, lng: 2.3323, blurb: 'Palais Garnier, grands magasins' },
];

const BARCELONA: Neighbourhood[] = [
  { name: 'Gothic Quarter', parent: 'Barcelona', country: 'Spain', lat: 41.3833, lng: 2.1770, blurb: 'Medieval streets, cathedral' },
  { name: 'Eixample',       parent: 'Barcelona', country: 'Spain', lat: 41.3918, lng: 2.1649, blurb: 'Gaudí, grid layout' },
  { name: 'El Born',        parent: 'Barcelona', country: 'Spain', lat: 41.3840, lng: 2.1830, blurb: 'Picasso Museum, tapas bars' },
  { name: 'Barceloneta',    parent: 'Barcelona', country: 'Spain', lat: 41.3809, lng: 2.1895, blurb: 'Beachfront, seafood' },
  { name: 'Gràcia',         parent: 'Barcelona', country: 'Spain', lat: 41.4023, lng: 2.1563, blurb: 'Bohemian, indie cafés' },
];

const ROME: Neighbourhood[] = [
  { name: 'Centro Storico', parent: 'Rome', country: 'Italy', lat: 41.8986, lng: 12.4768, blurb: 'Pantheon, Piazza Navona' },
  { name: 'Trastevere',     parent: 'Rome', country: 'Italy', lat: 41.8896, lng: 12.4695, blurb: 'Cobbles, trattorias' },
  { name: 'Vatican',        parent: 'Rome', country: 'Italy', lat: 41.9022, lng: 12.4534, blurb: 'St Peter\u2019s, museums' },
  { name: 'Termini',        parent: 'Rome', country: 'Italy', lat: 41.9010, lng: 12.5014, blurb: 'Main station, budget hotels' },
];

const DUBLIN: Neighbourhood[] = [
  { name: 'Temple Bar',    parent: 'Dublin', country: 'Ireland', lat: 53.3454, lng: -6.2638, blurb: 'Pubs, live music' },
  { name: 'O\u2019Connell St', parent: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603, blurb: 'Central spine, shopping' },
  { name: 'Docklands',     parent: 'Dublin', country: 'Ireland', lat: 53.3470, lng: -6.2368, blurb: 'Modern quarter, Convention Centre' },
];

/* ───────────────────────────────────────────────────────────────────────── */
/*  Export + helpers                                                         */
/* ───────────────────────────────────────────────────────────────────────── */

const ALL: Neighbourhood[] = [
  ...LONDON, ...MANCHESTER, ...EDINBURGH, ...BIRMINGHAM, ...GLASGOW,
  ...PARIS, ...BARCELONA, ...ROME, ...DUBLIN,
];

export const NEIGHBOURHOODS: Neighbourhood[] = ALL;

/**
 * Return curated neighbourhoods matching a query. Matching rule:
 *   - If the query matches a neighbourhood name (case-insensitive substring), return it.
 *   - If the query matches a parent city name, return all of that city's neighbourhoods.
 *
 * Results are capped at `limit` (default 8) so they don't swamp the dropdown.
 */
export function findNeighbourhoods(query: string, limit = 8): Neighbourhood[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const byName = ALL.filter((n) => n.name.toLowerCase().includes(q));
  const parents = new Set(ALL.filter((n) => n.parent.toLowerCase().includes(q)).map((n) => n.parent));
  const byParent = ALL.filter((n) => parents.has(n.parent));
  // Merge, dedupe by `${parent}|${name}`, keep name-matches first.
  const seen = new Set<string>();
  const out: Neighbourhood[] = [];
  for (const n of [...byName, ...byParent]) {
    const key = `${n.parent}|${n.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}

/** Format a neighbourhood as the text string that LiteAPI hotel search understands. */
export function formatNeighbourhoodQuery(n: Neighbourhood): string {
  return `${n.name}, ${n.parent}, ${n.country}`;
}
