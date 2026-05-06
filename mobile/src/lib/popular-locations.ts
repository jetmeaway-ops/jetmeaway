/**
 * Static location lists for the v1 native search forms. Replaces the live
 * Google-Places autocomplete until Phase 5/6 native results screens land.
 *
 * Lists are deliberately short — top-of-mind UK origins, top hotel
 * destinations, top cities for cars/packages — so the UI feels curated
 * rather than overwhelming. Free-text entry stays available via the
 * LocationPicker's `allowCustom` flag.
 */

import type { LocationOption } from '../components/forms/LocationPicker';

export const UK_ORIGINS: LocationOption[] = [
  { code: 'LON', label: 'London (any)', sub: 'LHR · LGW · STN · LTN · LCY · SEN', flag: '🇬🇧' },
  { code: 'LHR', label: 'London Heathrow', sub: 'LHR', flag: '🇬🇧' },
  { code: 'LGW', label: 'London Gatwick', sub: 'LGW', flag: '🇬🇧' },
  { code: 'STN', label: 'London Stansted', sub: 'STN', flag: '🇬🇧' },
  { code: 'LTN', label: 'London Luton', sub: 'LTN', flag: '🇬🇧' },
  { code: 'MAN', label: 'Manchester', sub: 'MAN', flag: '🇬🇧' },
  { code: 'BHX', label: 'Birmingham', sub: 'BHX', flag: '🇬🇧' },
  { code: 'EDI', label: 'Edinburgh', sub: 'EDI', flag: '🇬🇧' },
  { code: 'GLA', label: 'Glasgow', sub: 'GLA', flag: '🇬🇧' },
  { code: 'BRS', label: 'Bristol', sub: 'BRS', flag: '🇬🇧' },
  { code: 'NCL', label: 'Newcastle', sub: 'NCL', flag: '🇬🇧' },
  { code: 'LPL', label: 'Liverpool', sub: 'LPL', flag: '🇬🇧' },
  { code: 'LBA', label: 'Leeds Bradford', sub: 'LBA', flag: '🇬🇧' },
  { code: 'BFS', label: 'Belfast', sub: 'BFS', flag: '🇬🇧' },
  { code: 'CWL', label: 'Cardiff', sub: 'CWL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
];

export const FLIGHT_DESTINATIONS: LocationOption[] = [
  { code: 'BCN', label: 'Barcelona', sub: 'BCN · Spain', flag: '🇪🇸' },
  { code: 'CDG', label: 'Paris', sub: 'CDG · France', flag: '🇫🇷' },
  { code: 'AMS', label: 'Amsterdam', sub: 'AMS · Netherlands', flag: '🇳🇱' },
  { code: 'FCO', label: 'Rome', sub: 'FCO · Italy', flag: '🇮🇹' },
  { code: 'IST', label: 'Istanbul', sub: 'IST · Turkey', flag: '🇹🇷' },
  { code: 'DXB', label: 'Dubai', sub: 'DXB · UAE', flag: '🇦🇪' },
  { code: 'JFK', label: 'New York', sub: 'JFK · USA', flag: '🇺🇸' },
  { code: 'BKK', label: 'Bangkok', sub: 'BKK · Thailand', flag: '🇹🇭' },
  { code: 'AGP', label: 'Malaga', sub: 'AGP · Spain', flag: '🇪🇸' },
  { code: 'TFS', label: 'Tenerife', sub: 'TFS · Spain', flag: '🇪🇸' },
  { code: 'LIS', label: 'Lisbon', sub: 'LIS · Portugal', flag: '🇵🇹' },
  { code: 'ATH', label: 'Athens', sub: 'ATH · Greece', flag: '🇬🇷' },
  { code: 'RAK', label: 'Marrakech', sub: 'RAK · Morocco', flag: '🇲🇦' },
  { code: 'AYT', label: 'Antalya', sub: 'AYT · Turkey', flag: '🇹🇷' },
  { code: 'PMI', label: 'Palma', sub: 'PMI · Spain', flag: '🇪🇸' },
  { code: 'HRG', label: 'Hurghada', sub: 'HRG · Egypt', flag: '🇪🇬' },
  { code: 'CAI', label: 'Cairo', sub: 'CAI · Egypt', flag: '🇪🇬' },
  { code: 'MLE', label: 'Maldives', sub: 'MLE · Maldives', flag: '🇲🇻' },
  { code: 'BGI', label: 'Barbados', sub: 'BGI · Caribbean', flag: '🇧🇧' },
  { code: 'DOH', label: 'Doha', sub: 'DOH · Qatar', flag: '🇶🇦' },
  { code: 'SIN', label: 'Singapore', sub: 'SIN · Singapore', flag: '🇸🇬' },
  { code: 'NRT', label: 'Tokyo Narita', sub: 'NRT · Japan', flag: '🇯🇵' },
  { code: 'COK', label: 'Kochi', sub: 'COK · India', flag: '🇮🇳' },
];

/**
 * Hotel destinations for /webview/hotels and /webview/packages.
 *
 * Important rule: `code` is the value sent to the website's hotels page,
 * which feeds it straight into LiteAPI's city resolver. LiteAPI does
 * NOT resolve regions (Kerala, Bali) or islands (Tenerife) — only
 * proper city names. So the `code` here is always a real city; the
 * `label` stays human ("Bali", "Tenerife") so the picker still feels
 * tourist-friendly. Failing that mapping was the cause of the
 * "no hotels available for Kerala / Bali / Tenerife" bug reported on
 * Build #15. (2026-05-06)
 */
export const HOTEL_DESTINATIONS: LocationOption[] = [
  { code: 'Barcelona', label: 'Barcelona', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Paris', label: 'Paris', sub: 'France', flag: '🇫🇷' },
  { code: 'Rome', label: 'Rome', sub: 'Italy', flag: '🇮🇹' },
  { code: 'Lisbon', label: 'Lisbon', sub: 'Portugal', flag: '🇵🇹' },
  { code: 'Amsterdam', label: 'Amsterdam', sub: 'Netherlands', flag: '🇳🇱' },
  { code: 'Istanbul', label: 'Istanbul', sub: 'Turkey', flag: '🇹🇷' },
  { code: 'Dubai', label: 'Dubai', sub: 'UAE', flag: '🇦🇪' },
  { code: 'Marrakech', label: 'Marrakech', sub: 'Morocco', flag: '🇲🇦' },
  { code: 'Bangkok', label: 'Bangkok', sub: 'Thailand', flag: '🇹🇭' },
  { code: 'New York', label: 'New York', sub: 'USA', flag: '🇺🇸' },
  // 2026-05-06: Tenerife is an island, LiteAPI doesn't resolve it as a
  // city. Costa Adeje on the south coast is where most British tourists
  // stay; Adeje resolves cleanly.
  { code: 'Adeje', label: 'Tenerife', sub: 'Costa Adeje, Spain', flag: '🇪🇸' },
  { code: 'Malaga', label: 'Malaga', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Madrid', label: 'Madrid', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Seville', label: 'Seville', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Granada', label: 'Granada', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Palma', label: 'Palma de Mallorca', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Athens', label: 'Athens', sub: 'Greece', flag: '🇬🇷' },
  { code: 'Antalya', label: 'Antalya', sub: 'Turkey', flag: '🇹🇷' },
  { code: 'Hurghada', label: 'Hurghada', sub: 'Egypt', flag: '🇪🇬' },
  { code: 'Cairo', label: 'Cairo', sub: 'Egypt', flag: '🇪🇬' },
  // 2026-05-06: Goa is a state. Calangute / Baga are the busiest
  // beach towns; Calangute resolves reliably in LiteAPI.
  { code: 'Calangute', label: 'Goa', sub: 'Calangute, India', flag: '🇮🇳' },
  // 2026-05-06: Kerala is a state. Kochi is the largest tourist hub.
  { code: 'Kochi', label: 'Kerala', sub: 'Kochi, India', flag: '🇮🇳' },
  { code: 'Jaipur', label: 'Jaipur', sub: 'India', flag: '🇮🇳' },
  { code: 'Udaipur', label: 'Udaipur', sub: 'India', flag: '🇮🇳' },
  { code: 'Male', label: 'Maldives', sub: 'Malé, Maldives', flag: '🇲🇻' },
  // 2026-05-06: Bali is an island. Denpasar is the capital and the
  // city LiteAPI uses for the wider Bali resort area.
  { code: 'Denpasar', label: 'Bali', sub: 'Denpasar, Indonesia', flag: '🇮🇩' },
  { code: 'Tokyo', label: 'Tokyo', sub: 'Japan', flag: '🇯🇵' },
  { code: 'Singapore', label: 'Singapore', sub: 'Singapore', flag: '🇸🇬' },
];

/**
 * Car-hire pickup locations for /webview/cars.
 *
 * The website /cars page (`src/app/cars/page.tsx`) uses an EXACT-MATCH
 * lookup against its `LOCATIONS` array (`l.name === name`) to resolve
 * the EconomyBookings `plc` ID before kicking the affiliate redirect.
 * The `code` field in this list MUST match the `name` field in that
 * web array character-for-character — otherwise auto-search bails out
 * with a silent alert and the user sees a blank form. That mismatch
 * was the cause of the "Cars Search button doesn't move forward" bug
 * reported on Build #15. (2026-05-06)
 *
 * Curated subset of the website's full ~70-airport list — covers the
 * UK origins British tourists actually pick up from at the home end,
 * plus the top European / Mediterranean / long-haul holiday hubs.
 * Free-text custom entries fall through to the LocationPicker's
 * `allowCustom` path and the web autocomplete handles the rest.
 */
export const CAR_PICKUPS: LocationOption[] = [
  // United Kingdom
  { code: 'London Heathrow Airport (LHR)', label: 'London Heathrow', sub: 'LHR · UK', flag: '🇬🇧' },
  { code: 'London Gatwick Airport (LGW)', label: 'London Gatwick', sub: 'LGW · UK', flag: '🇬🇧' },
  { code: 'London Stansted Airport (STN)', label: 'London Stansted', sub: 'STN · UK', flag: '🇬🇧' },
  { code: 'London Luton Airport (LTN)', label: 'London Luton', sub: 'LTN · UK', flag: '🇬🇧' },
  { code: 'London City Airport (LCY)', label: 'London City', sub: 'LCY · UK', flag: '🇬🇧' },
  { code: 'Manchester Airport (MAN)', label: 'Manchester', sub: 'MAN · UK', flag: '🇬🇧' },
  { code: 'Birmingham Airport (BHX)', label: 'Birmingham', sub: 'BHX · UK', flag: '🇬🇧' },
  { code: 'Edinburgh Airport (EDI)', label: 'Edinburgh', sub: 'EDI · UK', flag: '🇬🇧' },
  { code: 'Glasgow Airport (GLA)', label: 'Glasgow', sub: 'GLA · UK', flag: '🇬🇧' },
  { code: 'Bristol Airport (BRS)', label: 'Bristol', sub: 'BRS · UK', flag: '🇬🇧' },
  { code: 'Belfast Airport (BFS)', label: 'Belfast', sub: 'BFS · UK', flag: '🇬🇧' },
  // Spain & Portugal
  { code: 'Barcelona Airport (BCN)', label: 'Barcelona', sub: 'BCN · Spain', flag: '🇪🇸' },
  { code: 'Madrid Airport (MAD)', label: 'Madrid', sub: 'MAD · Spain', flag: '🇪🇸' },
  { code: 'Malaga Airport (AGP)', label: 'Malaga', sub: 'AGP · Spain', flag: '🇪🇸' },
  { code: 'Alicante Airport (ALC)', label: 'Alicante', sub: 'ALC · Spain', flag: '🇪🇸' },
  { code: 'Palma Mallorca Airport (PMI)', label: 'Palma de Mallorca', sub: 'PMI · Spain', flag: '🇪🇸' },
  { code: 'Tenerife South Airport (TFS)', label: 'Tenerife South', sub: 'TFS · Spain', flag: '🇪🇸' },
  { code: 'Lanzarote Airport (ACE)', label: 'Lanzarote', sub: 'ACE · Spain', flag: '🇪🇸' },
  { code: 'Faro Airport (FAO)', label: 'Faro', sub: 'FAO · Portugal', flag: '🇵🇹' },
  { code: 'Lisbon Airport (LIS)', label: 'Lisbon', sub: 'LIS · Portugal', flag: '🇵🇹' },
  // France & Italy
  { code: 'Paris Charles de Gaulle Airport (CDG)', label: 'Paris CDG', sub: 'CDG · France', flag: '🇫🇷' },
  { code: 'Nice Airport (NCE)', label: 'Nice', sub: 'NCE · France', flag: '🇫🇷' },
  { code: 'Rome Fiumicino Airport (FCO)', label: 'Rome', sub: 'FCO · Italy', flag: '🇮🇹' },
  { code: 'Milan Malpensa Airport (MXP)', label: 'Milan', sub: 'MXP · Italy', flag: '🇮🇹' },
  { code: 'Venice Airport (VCE)', label: 'Venice', sub: 'VCE · Italy', flag: '🇮🇹' },
  // Greece, Netherlands, Turkey
  { code: 'Amsterdam Schiphol Airport (AMS)', label: 'Amsterdam', sub: 'AMS · Netherlands', flag: '🇳🇱' },
  { code: 'Athens Airport (ATH)', label: 'Athens', sub: 'ATH · Greece', flag: '🇬🇷' },
  { code: 'Heraklion Crete Airport (HER)', label: 'Heraklion (Crete)', sub: 'HER · Greece', flag: '🇬🇷' },
  { code: 'Antalya Airport (AYT)', label: 'Antalya', sub: 'AYT · Turkey', flag: '🇹🇷' },
  { code: 'Istanbul Airport (IST)', label: 'Istanbul', sub: 'IST · Turkey', flag: '🇹🇷' },
  // UAE / Morocco / Egypt
  { code: 'Dubai Airport (DXB)', label: 'Dubai', sub: 'DXB · UAE', flag: '🇦🇪' },
  { code: 'Marrakech Airport (RAK)', label: 'Marrakech', sub: 'RAK · Morocco', flag: '🇲🇦' },
  { code: 'Cairo Airport (CAI)', label: 'Cairo', sub: 'CAI · Egypt', flag: '🇪🇬' },
  // Long-haul holiday
  { code: 'Bangkok Airport (BKK)', label: 'Bangkok', sub: 'BKK · Thailand', flag: '🇹🇭' },
  { code: 'Bali Airport (DPS)', label: 'Bali', sub: 'DPS · Indonesia', flag: '🇮🇩' },
  { code: 'Phuket Airport (HKT)', label: 'Phuket', sub: 'HKT · Thailand', flag: '🇹🇭' },
  { code: 'Singapore Changi Airport (SIN)', label: 'Singapore', sub: 'SIN · Singapore', flag: '🇸🇬' },
  { code: 'New York JFK Airport (JFK)', label: 'New York JFK', sub: 'JFK · USA', flag: '🇺🇸' },
  { code: 'Orlando Airport (MCO)', label: 'Orlando', sub: 'MCO · USA', flag: '🇺🇸' },
];
