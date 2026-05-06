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
  { code: 'Tenerife', label: 'Tenerife', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Malaga', label: 'Malaga', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Madrid', label: 'Madrid', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Seville', label: 'Seville', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Granada', label: 'Granada', sub: 'Spain', flag: '🇪🇸' },
  { code: 'Athens', label: 'Athens', sub: 'Greece', flag: '🇬🇷' },
  { code: 'Antalya', label: 'Antalya', sub: 'Turkey', flag: '🇹🇷' },
  { code: 'Hurghada', label: 'Hurghada', sub: 'Egypt', flag: '🇪🇬' },
  { code: 'Cairo', label: 'Cairo', sub: 'Egypt', flag: '🇪🇬' },
  { code: 'Goa', label: 'Goa', sub: 'India', flag: '🇮🇳' },
  { code: 'Kerala', label: 'Kerala', sub: 'India', flag: '🇮🇳' },
  { code: 'Jaipur', label: 'Jaipur', sub: 'India', flag: '🇮🇳' },
  { code: 'Udaipur', label: 'Udaipur', sub: 'India', flag: '🇮🇳' },
  { code: 'Maldives', label: 'Maldives', sub: 'Maldives', flag: '🇲🇻' },
  { code: 'Bali', label: 'Bali', sub: 'Indonesia', flag: '🇮🇩' },
  { code: 'Tokyo', label: 'Tokyo', sub: 'Japan', flag: '🇯🇵' },
  { code: 'Singapore', label: 'Singapore', sub: 'Singapore', flag: '🇸🇬' },
];
