/**
 * Neighbourhood Intelligence — used by the 24-hour reminder.
 * One short paragraph per city: morning rituals + fitness/walks.
 * Falls back to a generic "explore on foot" line when the city isn't covered.
 */

type Intel = {
  morningRitual: string;
  fitness: string;
};

const CITY_INTEL: Record<string, Intel> = {
  barcelona: {
    morningRitual: 'Pick up a coffee + xuixo at Forn Mistral and walk Passeig de Gràcia before 9am — Casa Batlló and La Pedrera with no queues.',
    fitness: 'The Barceloneta seafront promenade runs 4km along the sand — flat, car-free, and beautiful at sunrise.',
  },
  istanbul: {
    morningRitual: 'Cross to Kadikoy on the 7am Eminonu ferry, then balik ekmek (fish sandwich) at the market edge before the European-side queues build.',
    fitness: 'Walk Moda seafront promenade (Asian side) for the cleanest morning air and the Hagia Sophia visible across the water.',
  },
  milan: {
    morningRitual: 'Espresso + cornetto at Marchesi 1824 in the Galleria, then walk to the Duomo before the rooftop opens.',
    fitness: 'Parco Sempione behind Castello Sforzesco — 2km loop popular with locals at 7am.',
  },
  amsterdam: {
    morningRitual: 'Bakery breakfast at Vlaams Broodhuys then a slow loop of the Jordaan canals before the bikes own the streets.',
    fitness: 'Vondelpark is a 3.5km running loop — quiet before 8am, locals only.',
  },
  athens: {
    morningRitual: 'Climb Lycabettus Hill at sunrise for the Acropolis-and-sea panorama, breakfast at Kayak Anafiotika afterwards.',
    fitness: 'The Athens National Garden has shaded running paths — a flat 1.5km loop popular with locals at dawn.',
  },
  dubai: {
    morningRitual: 'Karak chai + paratha at Ravi Restaurant in Satwa, then the Etihad Museum before the heat builds.',
    fitness: 'Kite Beach has a free 14km running track along the sand — best before 8am, before the sun is overhead.',
  },
  marrakech: {
    morningRitual: 'Mint tea + msemen at a riad rooftop, then Jemaa el-Fnaa before the snake-charmers arrive (it\'s a different square at 7am).',
    fitness: 'Walk the Majorelle Garden circuit and around the Menara olive grove for shade and quiet.',
  },
  istanbul_alt: {
    morningRitual: '',
    fitness: '',
  },
  seville: {
    morningRitual: 'Churros + chocolate at Bar El Comercio, then the Plaza de España at 8am while the air is cool.',
    fitness: 'The Guadalquivir riverside path is flat for 5km — locals run it before the heat.',
  },
  granada: {
    morningRitual: 'Walk up to the Mirador de San Nicolás for the Alhambra-at-sunrise view, breakfast in the Albayzín after.',
    fitness: 'Sacromonte hill has zigzag walking paths — calf workout, panoramic finish.',
  },
  valencia: {
    morningRitual: 'Horchata + fartons at Daniel in Mercado de Colón, then a slow Turia gardens walk.',
    fitness: 'The Turia Gardens (a former riverbed) stretch 9km through the city — running loops everywhere.',
  },
  jaipur: {
    morningRitual: 'Masala chai + kachori on Johari Bazaar before the shutters open, then Hawa Mahal in soft light.',
    fitness: 'The walls of Nahargarh Fort are a 30-minute uphill walk; the city wakes up below as you climb.',
  },
  udaipur: {
    morningRitual: 'Ghat breakfast on Lake Pichola — masala omelette, river view, before the boats start.',
    fitness: 'The walk along the lake from Hanuman Ghat to Ambrai Ghat is 2km of sunrise gold on white palaces.',
  },
  goa: {
    morningRitual: 'Filter coffee + poi (Goan bread) at a beach shack, then a slow tide walk before the loungers go out.',
    fitness: 'Yoga on Palolem or Agonda beach at 7am — most shacks run drop-in classes for under £8.',
  },
  kerala: {
    morningRitual: 'Puttu + kadala curry at a local tea shop, then a backwater paddle before the houseboats stir.',
    fitness: 'Fort Kochi seafront has a flat 2km path past the Chinese fishing nets — best at sunrise.',
  },
  kathmandu: {
    morningRitual: 'Monastery prayers at Boudhanath at 6am — circumambulate the stupa with the locals, then milk tea + sel roti.',
    fitness: 'Walk up to Swayambhunath (the Monkey Temple) — 365 steps, panoramic city view at the top.',
  },
};

/** Return the intel paragraph (combined morning ritual + fitness) for a
 *  city. Empty string if we have no intel — caller should fall back to a
 *  generic line. */
export function neighbourhoodIntel(city: string | null | undefined): { morningRitual: string; fitness: string } | null {
  if (!city) return null;
  const key = String(city).trim().toLowerCase();
  if (!key) return null;
  // Match exact, or strip trailing "(IATA)"-like suffixes
  const stripped = key.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return CITY_INTEL[key] || CITY_INTEL[stripped] || null;
}

/** Generic fallback — used when we have no city-specific intel. */
export function genericIntel(city: string | null | undefined): { morningRitual: string; fitness: string } {
  const c = city ? city.trim() : 'your destination';
  return {
    morningRitual: `Wake up early on day one — ${c} is a different city before the tour groups arrive. Find a local bakery, a quiet coffee, and walk the central streets before 9am.`,
    fitness: 'Most central hotels have a quiet park or seafront within 10 minutes\' walk — ask the front desk for the morning-runners\' route.',
  };
}
