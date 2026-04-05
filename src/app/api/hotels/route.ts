import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getHotels as liteapiGetHotels, type HotelOffer } from '@/lib/liteapi';

export const runtime = 'edge';

const KV_TTL = 43200; // 12 hours

/** City → ISO-3166 alpha-2 country code for LiteAPI lookups */
const CITY_COUNTRY: Record<string, string> = {
  'barcelona': 'ES', 'madrid': 'ES', 'malaga': 'ES', 'alicante': 'ES', 'palma': 'ES',
  'tenerife': 'ES', 'lanzarote': 'ES', 'fuerteventura': 'ES', 'gran canaria': 'ES',
  'london': 'GB', 'edinburgh': 'GB', 'manchester': 'GB', 'glasgow': 'GB',
  'liverpool': 'GB', 'birmingham': 'GB',
  'paris': 'FR', 'nice': 'FR',
  'rome': 'IT', 'venice': 'IT', 'florence': 'IT', 'milan': 'IT',
  'lisbon': 'PT', 'faro': 'PT',
  'amsterdam': 'NL', 'berlin': 'DE', 'munich': 'DE',
  'athens': 'GR', 'santorini': 'GR', 'crete': 'GR', 'rhodes': 'GR', 'corfu': 'GR',
  'istanbul': 'TR', 'antalya': 'TR', 'bodrum': 'TR', 'dalaman': 'TR',
  'dubrovnik': 'HR', 'split': 'HR',
  'dubai': 'AE', 'cairo': 'EG', 'marrakech': 'MA',
  'new york': 'US', 'los angeles': 'US', 'miami': 'US',
  'tokyo': 'JP', 'bangkok': 'TH', 'phuket': 'TH', 'singapore': 'SG',
  'bali': 'ID', 'maldives': 'MV',
  'sydney': 'AU', 'cape town': 'ZA',
  'cancun': 'MX',
};

/** Fetch LiteAPI bookable offers with a hard timeout so we never block the response */
async function fetchLiteApiHotels(
  cityKey: string,
  checkin: string,
  checkout: string,
  adults: number,
  childrenCount: number,
  rooms: number,
  timeoutMs: number = 5000,
): Promise<HotelOffer[]> {
  if (!process.env.LITE_API_KEY) return [];
  const countryCode = CITY_COUNTRY[cityKey];
  if (!countryCode) return [];
  const cityName = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);

  // Build occupancy: one entry per room. Split adults across rooms (min 1 per
  // room). Put all children in the first room — LiteAPI allows uneven splits.
  const safeRooms = Math.max(1, Math.min(3, rooms));
  const safeAdults = Math.max(1, adults);
  const safeChildren = Math.max(0, childrenCount);
  const adultsPerRoom: number[] = [];
  let remaining = safeAdults;
  for (let i = 0; i < safeRooms; i++) {
    const a = i === safeRooms - 1 ? remaining : Math.max(1, Math.floor(safeAdults / safeRooms));
    adultsPerRoom.push(a);
    remaining -= a;
  }
  // Children are represented as an array of ages — LiteAPI expects integers.
  // We default any unknown child age to 8 (mid-range, no cot/infant surcharge).
  const childAges = Array.from({ length: safeChildren }, () => 8);
  const occupancy = adultsPerRoom.map((a, idx) => ({
    adults: a,
    children: idx === 0 ? childAges : [],
  }));

  try {
    const result = await Promise.race([
      liteapiGetHotels({
        cityName,
        countryCode,
        checkIn: checkin,
        checkOut: checkout,
        occupancy,
        currency: 'GBP',
        guestNationality: 'GB',
        limit: 20,
      }),
      new Promise<HotelOffer[]>((_, reject) =>
        setTimeout(() => reject(new Error('LiteAPI timeout')), timeoutMs),
      ),
    ]);
    return result;
  } catch (err: any) {
    console.warn('[liteapi] hotels fetch failed:', err?.message || err);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CURATED HOTEL DATA

   The Hotellook engine API is no longer available (404).
   We maintain curated data for popular destinations. Each hotel has a
   realistic base price per night in GBP that the front-end uses as an
   indicative "from" price. Real prices are shown on provider sites via
   affiliate deep links.
   ═══════════════════════════════════════════════════════════════════════════ */

interface CuratedHotel {
  id: number;
  name: string;
  stars: number;
  basePrice: number; // GBP per night indicative
  district: string;
}

/* City-centre coordinates for Scout neighbourhood lookups */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'barcelona': { lat: 41.3874, lng: 2.1686 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'bali': { lat: -8.3405, lng: 115.092 },
  'malaga': { lat: 36.7213, lng: -4.4214 },
  'tenerife': { lat: 28.2916, lng: -16.6291 },
  'nice': { lat: 43.7102, lng: 7.262 },
  'venice': { lat: 45.4408, lng: 12.3155 },
  'florence': { lat: 43.7696, lng: 11.2558 },
  'milan': { lat: 45.4642, lng: 9.19 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'santorini': { lat: 36.3932, lng: 25.4615 },
  'crete': { lat: 35.2401, lng: 24.4709 },
  'antalya': { lat: 36.8969, lng: 30.7133 },
  'dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'faro': { lat: 37.0194, lng: -7.9322 },
  'lanzarote': { lat: 28.9638, lng: -13.5477 },
  'fuerteventura': { lat: 28.3587, lng: -14.0538 },
  'alicante': { lat: 38.3452, lng: -0.481 },
  'palma': { lat: 39.5696, lng: 2.6502 },
  'rhodes': { lat: 36.4341, lng: 28.2176 },
  'corfu': { lat: 39.6243, lng: 19.9217 },
  'split': { lat: 43.5081, lng: 16.4402 },
  'bodrum': { lat: 37.0344, lng: 27.4305 },
  'dalaman': { lat: 36.7666, lng: 28.7929 },
  'marrakech': { lat: 31.6295, lng: -7.9811 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'phuket': { lat: 7.8804, lng: 98.3923 },
  'maldives': { lat: 4.1755, lng: 73.5093 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'gran canaria': { lat: 27.9202, lng: -15.5474 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'liverpool': { lat: 53.4084, lng: -2.9916 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
};

const CURATED: Record<string, CuratedHotel[]> = {
  'barcelona': [
    { id: 1, name: 'Hotel Arts Barcelona', stars: 5, basePrice: 280, district: 'Port Olímpic' },
    { id: 2, name: 'W Barcelona', stars: 5, basePrice: 250, district: 'Barceloneta' },
    { id: 3, name: 'Mandarin Oriental', stars: 5, basePrice: 320, district: 'Passeig de Gràcia' },
    { id: 4, name: 'Hotel Casa Fuster', stars: 5, basePrice: 190, district: 'Gràcia' },
    { id: 5, name: 'Catalonia Passeig de Gràcia', stars: 4, basePrice: 110, district: 'Eixample' },
    { id: 6, name: 'H10 Casanova', stars: 4, basePrice: 95, district: 'Eixample' },
    { id: 7, name: 'Hotel Barcelona 1882', stars: 4, basePrice: 120, district: 'Eixample' },
    { id: 8, name: 'Acta Atrium Palace', stars: 4, basePrice: 85, district: 'Eixample' },
    { id: 9, name: 'Hostal Grau', stars: 2, basePrice: 55, district: 'El Raval' },
    { id: 10, name: 'Generator Barcelona', stars: 2, basePrice: 35, district: 'Gràcia' },
  ],
  'london': [
    { id: 11, name: 'The Savoy', stars: 5, basePrice: 450, district: 'Strand' },
    { id: 12, name: 'Shangri-La The Shard', stars: 5, basePrice: 380, district: 'London Bridge' },
    { id: 13, name: 'The Langham', stars: 5, basePrice: 340, district: 'Marylebone' },
    { id: 14, name: 'Park Plaza Westminster', stars: 4, basePrice: 160, district: 'Westminster' },
    { id: 15, name: 'Premier Inn Hub London', stars: 3, basePrice: 90, district: 'Soho' },
    { id: 16, name: 'Travelodge London City', stars: 3, basePrice: 75, district: 'City of London' },
    { id: 17, name: 'The Z Hotel Covent Garden', stars: 3, basePrice: 95, district: 'Covent Garden' },
    { id: 18, name: 'Holiday Inn Express Southwark', stars: 3, basePrice: 85, district: 'Southwark' },
    { id: 19, name: 'Generator London', stars: 2, basePrice: 30, district: "King's Cross" },
    { id: 20, name: 'Wombat City Hostel', stars: 2, basePrice: 28, district: 'Whitechapel' },
  ],
  'paris': [
    { id: 21, name: 'Le Meurice', stars: 5, basePrice: 520, district: '1st Arrondissement' },
    { id: 22, name: 'Hôtel Plaza Athénée', stars: 5, basePrice: 480, district: '8th Arrondissement' },
    { id: 23, name: 'Hôtel de Crillon', stars: 5, basePrice: 550, district: 'Place de la Concorde' },
    { id: 24, name: 'Pullman Paris Tour Eiffel', stars: 4, basePrice: 180, district: '15th Arrondissement' },
    { id: 25, name: 'Hôtel Eiffel Blomet', stars: 4, basePrice: 130, district: '15th Arrondissement' },
    { id: 26, name: 'Ibis Styles Paris Eiffel', stars: 3, basePrice: 90, district: '15th Arrondissement' },
    { id: 27, name: 'Generator Paris', stars: 2, basePrice: 35, district: '10th Arrondissement' },
    { id: 28, name: 'Hôtel du Nord', stars: 3, basePrice: 85, district: 'Canal Saint-Martin' },
  ],
  'dubai': [
    { id: 31, name: 'Burj Al Arab Jumeirah', stars: 5, basePrice: 1200, district: 'Jumeirah' },
    { id: 32, name: 'Atlantis The Royal', stars: 5, basePrice: 450, district: 'Palm Jumeirah' },
    { id: 33, name: 'Address Downtown', stars: 5, basePrice: 280, district: 'Downtown Dubai' },
    { id: 34, name: 'JW Marriott Marquis', stars: 5, basePrice: 180, district: 'Business Bay' },
    { id: 35, name: 'Rove Downtown', stars: 3, basePrice: 65, district: 'Downtown Dubai' },
    { id: 36, name: 'Premier Inn Dubai Silicon Oasis', stars: 3, basePrice: 40, district: 'Silicon Oasis' },
    { id: 37, name: 'Citymax Hotel Al Barsha', stars: 3, basePrice: 35, district: 'Al Barsha' },
  ],
  'amsterdam': [
    { id: 41, name: 'Hotel De L\'Europe', stars: 5, basePrice: 350, district: 'City Centre' },
    { id: 42, name: 'Waldorf Astoria Amsterdam', stars: 5, basePrice: 400, district: 'Herengracht' },
    { id: 43, name: 'NH Collection Flower Market', stars: 4, basePrice: 160, district: 'City Centre' },
    { id: 44, name: 'Motel One Amsterdam', stars: 3, basePrice: 95, district: 'Waterlooplein' },
    { id: 45, name: 'The Flying Pig Downtown', stars: 2, basePrice: 30, district: 'City Centre' },
    { id: 46, name: 'Hampshire Hotel Eden', stars: 4, basePrice: 120, district: 'Amstel' },
  ],
  'rome': [
    { id: 51, name: 'Hotel de Russie', stars: 5, basePrice: 420, district: 'Piazza del Popolo' },
    { id: 52, name: 'Hotel Hassler Roma', stars: 5, basePrice: 380, district: 'Spanish Steps' },
    { id: 53, name: 'Hotel Artemide', stars: 4, basePrice: 150, district: 'Via Nazionale' },
    { id: 54, name: 'Hotel Colosseum', stars: 3, basePrice: 90, district: 'Monti' },
    { id: 55, name: 'The Yellow Hostel', stars: 2, basePrice: 28, district: 'Termini' },
    { id: 56, name: 'Hotel Quirinale', stars: 4, basePrice: 130, district: 'Repubblica' },
  ],
  'madrid': [
    { id: 61, name: 'The Westin Palace', stars: 5, basePrice: 250, district: 'Paseo del Prado' },
    { id: 62, name: 'Hotel Ritz Madrid', stars: 5, basePrice: 350, district: 'Retiro' },
    { id: 63, name: 'NH Madrid Nacional', stars: 4, basePrice: 110, district: 'Atocha' },
    { id: 64, name: 'Room Mate Oscar', stars: 3, basePrice: 85, district: 'Chueca' },
    { id: 65, name: 'Far Home Atocha', stars: 2, basePrice: 25, district: 'Lavapiés' },
  ],
  'lisbon': [
    { id: 71, name: 'Four Seasons Ritz Lisbon', stars: 5, basePrice: 350, district: 'Marquês de Pombal' },
    { id: 72, name: 'Bairro Alto Hotel', stars: 5, basePrice: 280, district: 'Bairro Alto' },
    { id: 73, name: 'Hotel Avenida Palace', stars: 4, basePrice: 130, district: 'Baixa' },
    { id: 74, name: 'Lisboa Pessoa Hotel', stars: 4, basePrice: 100, district: 'Chiado' },
    { id: 75, name: 'Home Lisbon Hostel', stars: 2, basePrice: 22, district: 'Baixa' },
  ],
  'istanbul': [
    { id: 81, name: 'Four Seasons Sultanahmet', stars: 5, basePrice: 320, district: 'Sultanahmet' },
    { id: 82, name: 'Ciragan Palace Kempinski', stars: 5, basePrice: 380, district: 'Beşiktaş' },
    { id: 83, name: 'Dosso Dossi Hotels', stars: 4, basePrice: 55, district: 'Fatih' },
    { id: 84, name: 'Hotel Momento Golden Horn', stars: 4, basePrice: 45, district: 'Beyoğlu' },
    { id: 85, name: 'Cheers Hostel', stars: 2, basePrice: 12, district: 'Sultanahmet' },
  ],
  'new york': [
    { id: 91, name: 'The Plaza', stars: 5, basePrice: 550, district: 'Midtown' },
    { id: 92, name: 'The Standard High Line', stars: 4, basePrice: 280, district: 'Meatpacking' },
    { id: 93, name: 'Pod 51 Hotel', stars: 3, basePrice: 120, district: 'Midtown East' },
    { id: 94, name: 'YOTEL New York', stars: 3, basePrice: 140, district: 'Hell\'s Kitchen' },
    { id: 95, name: 'HI New York City Hostel', stars: 2, basePrice: 45, district: 'Upper West Side' },
  ],
  'tokyo': [
    { id: 101, name: 'Aman Tokyo', stars: 5, basePrice: 600, district: 'Otemachi' },
    { id: 102, name: 'Park Hyatt Tokyo', stars: 5, basePrice: 400, district: 'Shinjuku' },
    { id: 103, name: 'Shinjuku Granbell Hotel', stars: 3, basePrice: 80, district: 'Shinjuku' },
    { id: 104, name: 'APA Hotel Shinjuku', stars: 3, basePrice: 55, district: 'Shinjuku' },
    { id: 105, name: 'Khaosan World Asakusa', stars: 2, basePrice: 20, district: 'Asakusa' },
  ],
  'bangkok': [
    { id: 111, name: 'Mandarin Oriental Bangkok', stars: 5, basePrice: 280, district: 'Riverside' },
    { id: 112, name: 'Lebua at State Tower', stars: 5, basePrice: 150, district: 'Silom' },
    { id: 113, name: 'Amara Bangkok', stars: 4, basePrice: 55, district: 'Siam' },
    { id: 114, name: 'Ibis Styles Bangkok', stars: 3, basePrice: 30, district: 'Sukhumvit' },
    { id: 115, name: 'NapPark Hostel', stars: 2, basePrice: 10, district: 'Khao San' },
  ],
  'singapore': [
    { id: 121, name: 'Marina Bay Sands', stars: 5, basePrice: 380, district: 'Marina Bay' },
    { id: 122, name: 'Raffles Hotel', stars: 5, basePrice: 550, district: 'City Hall' },
    { id: 123, name: 'Naumi Hotel', stars: 4, basePrice: 130, district: 'City Hall' },
    { id: 124, name: 'Hotel G Singapore', stars: 3, basePrice: 80, district: 'Bugis' },
    { id: 125, name: 'The Pod Boutique Capsule', stars: 2, basePrice: 25, district: 'Bugis' },
  ],
  'bali': [
    { id: 131, name: 'Four Seasons Jimbaran', stars: 5, basePrice: 350, district: 'Jimbaran' },
    { id: 132, name: 'The Mulia Nusa Dua', stars: 5, basePrice: 250, district: 'Nusa Dua' },
    { id: 133, name: 'Alila Seminyak', stars: 4, basePrice: 120, district: 'Seminyak' },
    { id: 134, name: 'Kuta Paradiso Hotel', stars: 4, basePrice: 40, district: 'Kuta' },
    { id: 135, name: 'Puri Garden Hotel', stars: 3, basePrice: 18, district: 'Ubud' },
  ],
  'malaga': [
    { id: 141, name: 'Gran Hotel Miramar', stars: 5, basePrice: 220, district: 'Malagueta' },
    { id: 142, name: 'Vincci Selección Posada del Patio', stars: 5, basePrice: 170, district: 'Centro' },
    { id: 143, name: 'Molina Lario Hotel', stars: 4, basePrice: 110, district: 'Centro' },
    { id: 144, name: 'Hotel Sur Málaga', stars: 3, basePrice: 55, district: 'Centro' },
    { id: 145, name: 'Feel Hostel City Center', stars: 2, basePrice: 25, district: 'Centro' },
  ],
  'tenerife': [
    { id: 151, name: 'The Ritz-Carlton Abama', stars: 5, basePrice: 280, district: 'Guía de Isora' },
    { id: 152, name: 'Hard Rock Hotel Tenerife', stars: 5, basePrice: 180, district: 'Adeje' },
    { id: 153, name: 'H10 Costa Adeje Palace', stars: 4, basePrice: 100, district: 'Costa Adeje' },
    { id: 154, name: 'Hotel Colón Rambla', stars: 3, basePrice: 55, district: 'Santa Cruz' },
  ],
  'nice': [
    { id: 161, name: 'Hôtel Negresco', stars: 5, basePrice: 300, district: 'Promenade des Anglais' },
    { id: 162, name: 'Hyatt Regency Nice', stars: 5, basePrice: 220, district: 'Promenade des Anglais' },
    { id: 163, name: 'Hotel Aston La Scala', stars: 4, basePrice: 120, district: 'Centre Ville' },
    { id: 164, name: 'Hotel Ozz Nice', stars: 2, basePrice: 30, district: 'Centre Ville' },
  ],
  'venice': [
    { id: 171, name: 'The Gritti Palace', stars: 5, basePrice: 550, district: 'San Marco' },
    { id: 172, name: 'Hotel Danieli', stars: 5, basePrice: 420, district: 'San Marco' },
    { id: 173, name: 'Hotel Ai Cavalieri', stars: 4, basePrice: 130, district: 'Dorsoduro' },
    { id: 174, name: 'Generator Venice', stars: 2, basePrice: 30, district: 'Giudecca' },
  ],
  'florence': [
    { id: 181, name: 'The St. Regis Florence', stars: 5, basePrice: 400, district: 'Lungarno' },
    { id: 182, name: 'Hotel Brunelleschi', stars: 4, basePrice: 180, district: 'Duomo' },
    { id: 183, name: 'Hotel Davanzati', stars: 3, basePrice: 95, district: 'Centro' },
    { id: 184, name: 'Plus Florence', stars: 2, basePrice: 25, district: 'Santa Maria Novella' },
  ],
  'milan': [
    { id: 191, name: 'Armani Hotel Milano', stars: 5, basePrice: 450, district: 'Quadrilatero' },
    { id: 192, name: 'Château Monfort', stars: 5, basePrice: 220, district: 'Porta Venezia' },
    { id: 193, name: 'NYX Hotel Milan', stars: 4, basePrice: 100, district: 'Centrale' },
    { id: 194, name: 'Ostello Bello Grande', stars: 2, basePrice: 28, district: 'Centrale' },
  ],
  'athens': [
    { id: 201, name: 'Hotel Grande Bretagne', stars: 5, basePrice: 280, district: 'Syntagma' },
    { id: 202, name: 'Electra Palace Athens', stars: 5, basePrice: 180, district: 'Plaka' },
    { id: 203, name: 'Athens Was Hotel', stars: 4, basePrice: 110, district: 'Koukaki' },
    { id: 204, name: 'Athens Backpackers', stars: 2, basePrice: 18, district: 'Makrigianni' },
  ],
  'santorini': [
    { id: 211, name: 'Canaves Oia Suites', stars: 5, basePrice: 450, district: 'Oia' },
    { id: 212, name: 'Andronis Luxury Suites', stars: 5, basePrice: 380, district: 'Oia' },
    { id: 213, name: 'El Greco Resort', stars: 4, basePrice: 100, district: 'Fira' },
    { id: 214, name: 'Caveland Hostel', stars: 2, basePrice: 25, district: 'Karterados' },
  ],
  'crete': [
    { id: 221, name: 'Blue Palace Resort', stars: 5, basePrice: 250, district: 'Elounda' },
    { id: 222, name: 'Domes Noruz Chania', stars: 5, basePrice: 200, district: 'Chania' },
    { id: 223, name: 'Galaxy Hotel Heraklion', stars: 5, basePrice: 110, district: 'Heraklion' },
    { id: 224, name: 'Lato Boutique Hotel', stars: 3, basePrice: 60, district: 'Heraklion' },
  ],
  'antalya': [
    { id: 231, name: 'Mardan Palace', stars: 5, basePrice: 180, district: 'Kundu' },
    { id: 232, name: 'Rixos Downtown Antalya', stars: 5, basePrice: 150, district: 'Konyaaltı' },
    { id: 233, name: 'Akra Hotel', stars: 5, basePrice: 120, district: 'Lara' },
    { id: 234, name: 'Hotel SU', stars: 4, basePrice: 60, district: 'Konyaaltı' },
    { id: 235, name: 'White Garden Hotel', stars: 3, basePrice: 25, district: 'Kaleiçi' },
  ],
  'dubrovnik': [
    { id: 241, name: 'Hotel Excelsior Dubrovnik', stars: 5, basePrice: 280, district: 'Ploče' },
    { id: 242, name: 'Hotel Stari Grad', stars: 4, basePrice: 150, district: 'Old Town' },
    { id: 243, name: 'Hotel Lero', stars: 4, basePrice: 80, district: 'Lapad' },
    { id: 244, name: 'Hostel Angelina Old Town', stars: 2, basePrice: 25, district: 'Old Town' },
  ],
  'edinburgh': [
    { id: 251, name: 'The Balmoral', stars: 5, basePrice: 300, district: 'Princes Street' },
    { id: 252, name: 'The Scotsman Hotel', stars: 5, basePrice: 200, district: 'Old Town' },
    { id: 253, name: 'Apex Grassmarket Hotel', stars: 4, basePrice: 110, district: 'Grassmarket' },
    { id: 254, name: 'Motel One Edinburgh-Royal', stars: 3, basePrice: 75, district: 'Royal Mile' },
    { id: 255, name: 'Castle Rock Hostel', stars: 2, basePrice: 20, district: 'Old Town' },
  ],
  'manchester': [
    { id: 261, name: 'The Edwardian Manchester', stars: 5, basePrice: 180, district: 'City Centre' },
    { id: 262, name: 'Hotel Gotham', stars: 5, basePrice: 160, district: 'City Centre' },
    { id: 263, name: 'Motel One Manchester-Royal Exchange', stars: 3, basePrice: 65, district: 'City Centre' },
    { id: 264, name: 'YHA Manchester', stars: 2, basePrice: 22, district: 'Castlefield' },
  ],
  'faro': [
    { id: 271, name: 'AP Eva Senses Hotel', stars: 4, basePrice: 90, district: 'City Centre' },
    { id: 272, name: 'Hotel Faro & Beach Club', stars: 4, basePrice: 100, district: 'City Centre' },
    { id: 273, name: 'Stay Hotel Faro Centro', stars: 3, basePrice: 55, district: 'City Centre' },
    { id: 274, name: 'Casa d\'Alagoa', stars: 2, basePrice: 30, district: 'City Centre' },
  ],
  'lanzarote': [
    { id: 281, name: 'Princesa Yaiza Suite Hotel', stars: 5, basePrice: 220, district: 'Playa Blanca' },
    { id: 282, name: 'H10 Rubicón Palace', stars: 4, basePrice: 110, district: 'Playa Blanca' },
    { id: 283, name: 'Hotel Lancelot', stars: 3, basePrice: 60, district: 'Arrecife' },
  ],
  'fuerteventura': [
    { id: 291, name: 'Barceló Fuerteventura Royal Level', stars: 5, basePrice: 180, district: 'Caleta de Fuste' },
    { id: 292, name: 'R2 Bahía Playa Design Hotel', stars: 4, basePrice: 80, district: 'Tarajalejo' },
    { id: 293, name: 'Hotel Playa Sur Tenerife', stars: 3, basePrice: 50, district: 'El Médano' },
  ],
  'alicante': [
    { id: 301, name: 'Hospes Amérigo', stars: 5, basePrice: 180, district: 'Old Town' },
    { id: 302, name: 'Hotel Meliá Alicante', stars: 4, basePrice: 100, district: 'Playa del Postiguet' },
    { id: 303, name: 'Hotel Eurostars Lucentum', stars: 4, basePrice: 65, district: 'City Centre' },
  ],
  'palma': [
    { id: 311, name: 'Hotel Can Alomar', stars: 5, basePrice: 250, district: 'Old Town' },
    { id: 312, name: 'HM Jaime III', stars: 4, basePrice: 100, district: 'Jaime III' },
    { id: 313, name: 'Hotel Saratoga', stars: 4, basePrice: 90, district: 'Paseo Mallorca' },
    { id: 314, name: 'Hostal Apuntadores', stars: 2, basePrice: 40, district: 'La Lonja' },
  ],
  'rhodes': [
    { id: 321, name: 'Atrium Prestige Resort', stars: 5, basePrice: 180, district: 'Lachania' },
    { id: 322, name: 'Spirit of the Knights', stars: 4, basePrice: 120, district: 'Old Town' },
    { id: 323, name: 'Stay Hotel Rhodes', stars: 3, basePrice: 50, district: 'Rhodes Town' },
  ],
  'corfu': [
    { id: 331, name: 'Grecotel Corfu Imperial', stars: 5, basePrice: 200, district: 'Kommeno' },
    { id: 332, name: 'Bella Venezia', stars: 3, basePrice: 70, district: 'Corfu Town' },
    { id: 333, name: 'Pink Palace Beach Resort', stars: 2, basePrice: 30, district: 'Agios Gordios' },
  ],
  'split': [
    { id: 341, name: 'Hotel Park Split', stars: 5, basePrice: 180, district: 'Bačvice' },
    { id: 342, name: 'Radisson Blu Resort', stars: 4, basePrice: 120, district: 'City Centre' },
    { id: 343, name: 'Hotel Peristil', stars: 4, basePrice: 85, district: 'Diocletian\'s Palace' },
  ],
  'bodrum': [
    { id: 351, name: 'Mandarin Oriental Bodrum', stars: 5, basePrice: 350, district: 'Paradise Bay' },
    { id: 352, name: 'Voyage Bodrum', stars: 5, basePrice: 150, district: 'Torba' },
    { id: 353, name: 'Costa Bodrum City', stars: 3, basePrice: 40, district: 'City Centre' },
  ],
  'dalaman': [
    { id: 361, name: 'Hilton Dalaman Sarıgerme', stars: 5, basePrice: 140, district: 'Sarıgerme' },
    { id: 362, name: 'TUI BLUE Sarıgerme', stars: 5, basePrice: 110, district: 'Sarıgerme' },
    { id: 363, name: 'Hotel Caria Royal', stars: 4, basePrice: 50, district: 'Dalaman' },
  ],
  'marrakech': [
    { id: 371, name: 'Royal Mansour Marrakech', stars: 5, basePrice: 600, district: 'Medina' },
    { id: 372, name: 'La Mamounia', stars: 5, basePrice: 400, district: 'Medina' },
    { id: 373, name: 'Riad Kniza', stars: 4, basePrice: 80, district: 'Medina' },
    { id: 374, name: 'Riad Dar Anika', stars: 3, basePrice: 35, district: 'Medina' },
  ],
  'cairo': [
    { id: 381, name: 'Marriott Mena House', stars: 5, basePrice: 180, district: 'Giza' },
    { id: 382, name: 'Kempinski Nile Hotel', stars: 5, basePrice: 150, district: 'Garden City' },
    { id: 383, name: 'Steigenberger Hotel El Tahrir', stars: 4, basePrice: 55, district: 'Downtown' },
    { id: 384, name: 'Meramees Hostel', stars: 2, basePrice: 10, district: 'Downtown' },
  ],
  'cancun': [
    { id: 391, name: 'Ritz-Carlton Cancún', stars: 5, basePrice: 350, district: 'Hotel Zone' },
    { id: 392, name: 'Hyatt Ziva Cancún', stars: 5, basePrice: 250, district: 'Hotel Zone' },
    { id: 393, name: 'Hotel NYX Cancún', stars: 4, basePrice: 80, district: 'Hotel Zone' },
    { id: 394, name: 'Hostel Mundo Joven', stars: 2, basePrice: 15, district: 'Centro' },
  ],
  'phuket': [
    { id: 401, name: 'Trisara Phuket', stars: 5, basePrice: 400, district: 'Layan Beach' },
    { id: 402, name: 'Kata Rocks', stars: 5, basePrice: 250, district: 'Kata' },
    { id: 403, name: 'Novotel Phuket Resort', stars: 4, basePrice: 60, district: 'Patong' },
    { id: 404, name: 'Lub d Phuket Patong', stars: 2, basePrice: 15, district: 'Patong' },
  ],
  'maldives': [
    { id: 411, name: 'Soneva Fushi', stars: 5, basePrice: 1500, district: 'Baa Atoll' },
    { id: 412, name: 'Conrad Maldives Rangali', stars: 5, basePrice: 600, district: 'Rangali Island' },
    { id: 413, name: 'Adaaran Club Rannalhi', stars: 4, basePrice: 120, district: 'South Malé Atoll' },
  ],
  'sydney': [
    { id: 421, name: 'Park Hyatt Sydney', stars: 5, basePrice: 450, district: 'The Rocks' },
    { id: 422, name: 'QT Sydney', stars: 4, basePrice: 180, district: 'CBD' },
    { id: 423, name: 'Travelodge Wynyard', stars: 3, basePrice: 90, district: 'CBD' },
    { id: 424, name: 'Wake Up! Sydney', stars: 2, basePrice: 25, district: 'Central' },
  ],
  'cape town': [
    { id: 431, name: 'One&Only Cape Town', stars: 5, basePrice: 350, district: 'Waterfront' },
    { id: 432, name: 'The Silo Hotel', stars: 5, basePrice: 400, district: 'Waterfront' },
    { id: 433, name: 'Protea Hotel Cape Town', stars: 4, basePrice: 80, district: 'Sea Point' },
    { id: 434, name: 'Once in Cape Town', stars: 2, basePrice: 15, district: 'Gardens' },
  ],
  'los angeles': [
    { id: 441, name: 'Beverly Wilshire', stars: 5, basePrice: 480, district: 'Beverly Hills' },
    { id: 442, name: 'The Hollywood Roosevelt', stars: 4, basePrice: 200, district: 'Hollywood' },
    { id: 443, name: 'Freehand Los Angeles', stars: 3, basePrice: 100, district: 'Downtown' },
    { id: 444, name: 'HI Los Angeles Santa Monica', stars: 2, basePrice: 40, district: 'Santa Monica' },
  ],
  'miami': [
    { id: 451, name: 'Faena Hotel Miami Beach', stars: 5, basePrice: 400, district: 'Mid-Beach' },
    { id: 452, name: 'The Setai Miami Beach', stars: 5, basePrice: 350, district: 'South Beach' },
    { id: 453, name: 'Gale South Beach', stars: 4, basePrice: 150, district: 'South Beach' },
    { id: 454, name: 'Generator Miami', stars: 2, basePrice: 30, district: 'South Beach' },
  ],
  'gran canaria': [
    { id: 461, name: 'Lopesan Costa Meloneras', stars: 5, basePrice: 180, district: 'Meloneras' },
    { id: 462, name: 'Seaside Palm Beach', stars: 5, basePrice: 200, district: 'Maspalomas' },
    { id: 463, name: 'Bull Hotel Escorial', stars: 3, basePrice: 55, district: 'Playa del Inglés' },
  ],
  'glasgow': [
    { id: 471, name: 'Blythswood Square', stars: 5, basePrice: 180, district: 'City Centre' },
    { id: 472, name: 'citizenM Glasgow', stars: 4, basePrice: 85, district: 'City Centre' },
    { id: 473, name: 'Motel One Glasgow', stars: 3, basePrice: 60, district: 'City Centre' },
  ],
  'liverpool': [
    { id: 481, name: 'Hotel Titanic Liverpool', stars: 4, basePrice: 100, district: 'Stanley Dock' },
    { id: 482, name: 'Malmaison Liverpool', stars: 4, basePrice: 90, district: 'City Centre' },
    { id: 483, name: 'YHA Liverpool Albert Dock', stars: 2, basePrice: 22, district: 'Albert Dock' },
  ],
  'birmingham': [
    { id: 491, name: 'Hyatt Regency Birmingham', stars: 5, basePrice: 150, district: 'City Centre' },
    { id: 492, name: 'Hotel du Vin Birmingham', stars: 4, basePrice: 110, district: 'City Centre' },
    { id: 493, name: 'Ibis Styles Birmingham', stars: 3, basePrice: 55, district: 'City Centre' },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = searchParams.get('adults') || '2';
  const childrenParam = searchParams.get('children') || '0';
  const roomsParam = searchParams.get('rooms') || '1';
  const starsParam = searchParams.get('stars') || '0';

  if (!city || !checkin || !checkout) {
    return NextResponse.json({ error: 'Missing required parameters (city, checkin, checkout)' }, { status: 400 });
  }

  const cityKey = city.toLowerCase().trim();
  const adultsNum = parseInt(adults);
  const childrenNum = Math.max(0, Math.min(4, parseInt(childrenParam) || 0));
  const roomsNum = Math.max(1, Math.min(3, parseInt(roomsParam) || 1));
  const minStars = Math.max(0, Math.min(5, parseInt(starsParam) || 0));
  // Cache key v4 — bumped after LiteAPI sandbox → production swap
  const kvKey = `hotels:v4:${cityKey}:${checkin}:${checkout}:${adultsNum}:${childrenNum}:${roomsNum}:${minStars}`;

  // Check KV cache
  try {
    const cached = await kv.get<any>(kvKey);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  } catch { /* KV miss */ }

  /**
   * Normalise LiteAPI offers into the shape the /hotels page expects.
   * We tag them source='liteapi' + bookable=true so the frontend can show a
   * "Book Direct" badge (and we keep the offerId so checkout can call
   * /api/liteapi/book).
   */
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000,
    ),
  );
  const normaliseLiteApi = (offers: HotelOffer[]) =>
    offers.map((o, i) => ({
      id: `la_${o.hotelId}`,
      name: o.hotelName,
      stars: o.stars ?? 0,
      pricePerNight: Math.round((o.pricePerNight ?? o.price / nights) * 100) / 100,
      totalPrice: Math.round(o.price * 100) / 100,
      currency: o.currency || 'GBP',
      location: o.city || city,
      district: null,
      lat: o.latitude ?? undefined,
      lng: o.longitude ?? undefined,
      thumbnail: o.thumbnail || null,
      refundable: o.refundable,
      boardType: o.boardType,
      source: 'liteapi' as const,
      bookable: true,
      offerId: o.offerId,
      rank: i,
    }));

  // Kick off the LiteAPI fetch in parallel — we'll await it below alongside curated
  const liteApiPromise = fetchLiteApiHotels(cityKey, checkin, checkout, adultsNum, childrenNum, roomsNum);

  // Apply server-side minStars filter. minStars === 5 means exactly 5; else >=.
  const passesStars = <T extends { stars: number }>(h: T) => {
    if (minStars === 0) return true;
    if (minStars === 5) return h.stars >= 5;
    return h.stars >= minStars;
  };

  // Look up curated hotels
  const curated = CURATED[cityKey];

  if (!curated || curated.length === 0) {
    // Try partial match
    const match = Object.keys(CURATED).find(k => k.includes(cityKey) || cityKey.includes(k));
    if (match) {
      const coords = CITY_COORDS[match];
      const curatedHotels = CURATED[match].map(h => ({
        id: h.id,
        name: h.name,
        stars: h.stars,
        pricePerNight: h.basePrice,
        location: match.charAt(0).toUpperCase() + match.slice(1),
        district: h.district,
        source: 'curated' as const,
        bookable: false,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      }));
      const liteApiHotels = normaliseLiteApi(await liteApiPromise).filter(passesStars);
      const hotels = [...liteApiHotels, ...curatedHotels.filter(passesStars)];

      const result = { hotels, city: match.charAt(0).toUpperCase() + match.slice(1), checkin, checkout, adults: adultsNum, liteapiCount: liteApiHotels.length };
      try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch { /* KV write fail */ }
      return NextResponse.json(result);
    }

    // No curated match — still try LiteAPI as a last resort
    const liteApiHotels = normaliseLiteApi(await liteApiPromise).filter(passesStars);
    if (liteApiHotels.length > 0) {
      const result = { hotels: liteApiHotels, city, checkin, checkout, adults: adultsNum, liteapiCount: liteApiHotels.length };
      try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch {}
      return NextResponse.json(result);
    }

    return NextResponse.json({ hotels: [], city, checkin, checkout, adults: adultsNum, message: 'No hotels found for this destination' });
  }

  const coords = CITY_COORDS[cityKey];
  const curatedHotels = curated.map(h => ({
    id: h.id,
    name: h.name,
    stars: h.stars,
    pricePerNight: h.basePrice,
    location: city.charAt(0).toUpperCase() + city.slice(1),
    district: h.district,
    source: 'curated' as const,
    bookable: false,
    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
  }));
  const liteApiHotels = normaliseLiteApi(await liteApiPromise).filter(passesStars);
  // LiteAPI bookable hotels first, curated deep-link hotels after
  const hotels = [...liteApiHotels, ...curatedHotels.filter(passesStars)];

  const result = {
    hotels,
    city: city.charAt(0).toUpperCase() + city.slice(1),
    checkin,
    checkout,
    adults: adultsNum,
    liteapiCount: liteApiHotels.length,
  };

  // Cache in KV
  try { await kv.set(kvKey, result, { ex: KV_TTL }); } catch { /* KV write fail */ }

  return NextResponse.json(result);
}
