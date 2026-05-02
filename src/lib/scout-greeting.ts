/**
 * Scout Greeting — destination-aware salutation for Scout Communications.
 *
 * Maps a destination (city name OR country code) to a culturally appropriate
 * greeting. Returns "Hello" as fallback. Used in confirmation emails, SMS,
 * and 24-hour pre-check-in reminders so customers feel the trip starting
 * the moment we say their name.
 *
 * Editorial rule: greetings must be the casual/everyday form a UK traveller
 * would actually hear arriving, not the most formal religious variant.
 * (e.g. "Salaam" not "As-Salamu Alaykum"; "Konnichiwa" not "Konban wa".)
 */

/** Country-code → greeting. Lower-case ISO 3166-1 alpha-2. */
const COUNTRY_GREETING: Record<string, string> = {
  // South Asia
  np: 'Namaste', in: 'Namaste',
  // Middle East / North Africa (Arabic-speaking)
  sa: 'Salaam', ae: 'Salaam', qa: 'Salaam', kw: 'Salaam', bh: 'Salaam',
  om: 'Salaam', jo: 'Salaam', lb: 'Salaam', eg: 'Salaam', ma: 'Salaam',
  tn: 'Salaam', dz: 'Salaam', ly: 'Salaam', iq: 'Salaam',
  // Pakistan / Bangladesh — Urdu/Bengali speakers commonly use Salaam too
  pk: 'Salaam', bd: 'Salaam',
  // Turkey
  tr: 'Merhaba',
  // East Asia
  jp: 'Konnichiwa',
  cn: 'Nǐ hǎo', hk: 'Nǐ hǎo', tw: 'Nǐ hǎo',
  kr: 'Annyeonghaseyo',
  // South-East Asia
  th: 'Sawasdee',
  vn: 'Xin chào',
  id: 'Halo', my: 'Halo', sg: 'Halo',
  ph: 'Kumusta',
  // Europe — Romance
  es: 'Hola', mx: 'Hola', ar: 'Hola', cl: 'Hola', pe: 'Hola', co: 'Hola',
  ve: 'Hola', uy: 'Hola', cr: 'Hola', cu: 'Hola', do: 'Hola',
  it: 'Ciao',
  fr: 'Bonjour',
  pt: 'Olá', br: 'Olá',
  ro: 'Bună',
  // Europe — Germanic
  de: 'Hallo', at: 'Hallo', ch: 'Hallo', nl: 'Hallo', be: 'Hallo',
  // Europe — Nordic
  se: 'Hej', no: 'Hei', dk: 'Hej', fi: 'Hei', is: 'Halló',
  // Europe — Slavic
  ru: 'Privet', pl: 'Cześć', cz: 'Ahoj', sk: 'Ahoj', ua: 'Pryvit',
  bg: 'Zdravei', hr: 'Bok', si: 'Živjo', rs: 'Zdravo',
  // Europe — Greek
  gr: 'Geia sas', cy: 'Geia sas',
  // Africa — sub-Saharan (English-speaking default)
  ke: 'Jambo', tz: 'Jambo', ug: 'Jambo',
  za: 'Hello', zw: 'Hello', na: 'Hello', bw: 'Hello',
  ng: 'Hello', gh: 'Hello',
  // Anglophone — fallback to Hello but listed for completeness
  gb: 'Hello', uk: 'Hello', us: 'Hello', ca: 'Hello', au: 'Hello', nz: 'Hello',
  ie: 'Hello',
};

/** Lower-case city or destination keyword → country code. Fallback when the
 *  caller has only a city name. Coverage focused on the destinations we
 *  actually publish hotel content for (see content/posts/best-hotels-*.mdx). */
const CITY_TO_COUNTRY: Record<string, string> = {
  // South Asia
  kathmandu: 'np', pokhara: 'np',
  delhi: 'in', mumbai: 'in', goa: 'in', jaipur: 'in', udaipur: 'in',
  agra: 'in', kerala: 'in', kochi: 'in', bangalore: 'in',
  // MENA
  dubai: 'ae', 'abu dhabi': 'ae',
  doha: 'qa',
  riyadh: 'sa', jeddah: 'sa',
  cairo: 'eg',
  marrakech: 'ma', casablanca: 'ma', fes: 'ma',
  // Turkey
  istanbul: 'tr', cappadocia: 'tr', antalya: 'tr',
  // East Asia
  tokyo: 'jp', kyoto: 'jp', osaka: 'jp',
  beijing: 'cn', shanghai: 'cn', 'hong kong': 'hk',
  seoul: 'kr', busan: 'kr',
  // SE Asia
  bangkok: 'th', phuket: 'th', krabi: 'th', 'chiang mai': 'th',
  hanoi: 'vn', 'ho chi minh': 'vn', 'ho chi minh city': 'vn',
  bali: 'id', jakarta: 'id', 'kuala lumpur': 'my', singapore: 'sg',
  manila: 'ph', boracay: 'ph', 'el nido': 'ph', palawan: 'ph',
  // Europe
  barcelona: 'es', madrid: 'es', seville: 'es', granada: 'es',
  valencia: 'es', malaga: 'es', palma: 'es', tenerife: 'es', lanzarote: 'es',
  rome: 'it', milan: 'it', florence: 'it', venice: 'it',
  paris: 'fr', nice: 'fr', lyon: 'fr', bordeaux: 'fr',
  lisbon: 'pt', porto: 'pt',
  athens: 'gr', santorini: 'gr', mykonos: 'gr', rhodes: 'gr', crete: 'gr',
  amsterdam: 'nl',
  berlin: 'de', munich: 'de', hamburg: 'de',
  vienna: 'at', prague: 'cz', budapest: 'hu', krakow: 'pl', warsaw: 'pl',
  dublin: 'ie', edinburgh: 'gb', london: 'gb',
  copenhagen: 'dk', stockholm: 'se', helsinki: 'fi', oslo: 'no', reykjavik: 'is',
  // Africa
  'cape town': 'za', johannesburg: 'za',
  'victoria falls': 'zw',
  // Americas
  'new york': 'us', 'los angeles': 'us', miami: 'us', 'las vegas': 'us',
  chicago: 'us', boston: 'us', austin: 'us', orlando: 'us', honolulu: 'us',
  toronto: 'ca', vancouver: 'ca',
  cancun: 'mx', 'mexico city': 'mx', 'punta cana': 'do',
  havana: 'cu', 'buenos aires': 'ar', lima: 'pe', 'rio de janeiro': 'br',
};

/**
 * Resolve a greeting for a destination. Accepts:
 *   - ISO country code (any case): "in", "GB", "ae"
 *   - City / destination name (any case): "Kathmandu", "barcelona", "Cape Town"
 *
 * Returns "Hello" when nothing matches.
 */
export function scoutGreeting(destination: string | null | undefined): string {
  if (!destination) return 'Hello';
  const norm = String(destination).trim().toLowerCase();
  if (!norm) return 'Hello';

  // Try as country code (2 letters)
  if (norm.length === 2 && COUNTRY_GREETING[norm]) {
    return COUNTRY_GREETING[norm];
  }

  // Try as city
  const cc = CITY_TO_COUNTRY[norm];
  if (cc && COUNTRY_GREETING[cc]) {
    return COUNTRY_GREETING[cc];
  }

  // Last resort — strip "(IATA)" suffix and try again ("London Heathrow (LHR)" → "london heathrow")
  const stripped = norm.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (stripped !== norm && CITY_TO_COUNTRY[stripped]) {
    const cc2 = CITY_TO_COUNTRY[stripped];
    if (COUNTRY_GREETING[cc2]) return COUNTRY_GREETING[cc2];
  }

  return 'Hello';
}

/** Convenience — returns "Namaste, Waqar!" or "Hello, Waqar!". Strips
 *  the surname for warmth (matches the owner-approved confirmation copy). */
export function scoutSalutation(destination: string | null | undefined, fullName: string | null | undefined): string {
  const greeting = scoutGreeting(destination);
  const first = (fullName || '').trim().split(/\s+/)[0] || '';
  return first ? `${greeting}, ${first}!` : `${greeting}!`;
}
