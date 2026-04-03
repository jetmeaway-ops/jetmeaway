import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TOKEN = 'f797fbb7074a15838d5536c10be6f7b5';
const MARKER = '714449';
const HOST = 'jetmeaway.co.uk';

const AIRLINES: Record<string, string> = {
  AA: 'American Airlines', AB: 'Air Berlin', AC: 'Air Canada',
  AF: 'Air France', AI: 'Air India', AY: 'Finnair',
  AZ: 'ITA Airways', B6: 'JetBlue', BA: 'British Airways',
  BR: 'EVA Air', CA: 'Air China', CI: 'China Airlines',
  CX: 'Cathay Pacific', CZ: 'China Southern', DL: 'Delta',
  EK: 'Emirates', EW: 'Eurowings', EY: 'Etihad',
  FR: 'Ryanair', FZ: 'flydubai', G9: 'Air Arabia',
  IB: 'Iberia', J2: 'Azerbaijan Airlines', JL: 'Japan Airlines',
  KE: 'Korean Air', KL: 'KLM', LH: 'Lufthansa',
  LO: 'LOT Polish', LX: 'Swiss', MH: 'Malaysia Airlines',
  MS: 'EgyptAir', MU: 'China Eastern', NH: 'ANA',
  NZ: 'Air New Zealand', OA: 'Olympic Air', OK: 'Czech Airlines',
  OS: 'Austrian Airlines', OZ: 'Asiana Airlines',
  PC: 'Pegasus Airlines', QF: 'Qantas', QR: 'Qatar Airways',
  RJ: 'Royal Jordanian', RO: 'TAROM', S7: 'S7 Airlines',
  SK: 'SAS', SN: 'Brussels Airlines', SQ: 'Singapore Airlines',
  SU: 'Aeroflot', TG: 'Thai Airways', TK: 'Turkish Airlines',
  TN: 'Air Tahiti Nui', TP: 'TAP Air Portugal',
  U2: 'easyJet', UA: 'United Airlines', UX: 'Air Europa',
  V7: 'Volotea', VN: 'Vietnam Airlines', VS: 'Virgin Atlantic',
  VY: 'Vueling', W6: 'Wizz Air', W9: 'Wizz Air UK',
  WN: 'Southwest', WS: 'WestJet',
  XC: 'Corendon Airlines', XQ: 'SunExpress', XY: 'flynas',
  ZI: 'Aigle Azur', ZT: 'Titan Airways',
  '5O': 'ASL Airlines', '6B': 'TUI fly Nordic',
  '7R': 'RusLine', '9W': 'Jet Airways',
  HV: 'Transavia', TO: 'Transavia France',
  DY: 'Norwegian', D8: 'Norwegian',
  TB: 'TUI fly Belgium', BY: 'TUI Airways',
  MT: 'Thomas Cook Airlines', TCX: 'Thomas Cook',
};

function airlineName(code: string): string {
  return AIRLINES[code] || code;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// MD5 implementation for edge runtime (no crypto.createHash)
async function md5(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);

  // Edge runtime may not support MD5 via subtle crypto — fallback to manual
  if (hashBuffer) {
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Simple MD5 fallback for edge
  return md5Fallback(message);
}

function md5Fallback(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function md51(s: string) {
    const n = s.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  const hex_chr = '0123456789abcdef'.split('');
  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
    return s;
  }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF; }
  function hex(x: number[]) { return x.map(v => rhex(v)).join(''); }
  return hex(md51(string));
}

function bookingLink(
  origin: string, dest: string, depDate: string,
  retDate: string | null, adults: number, children: number
): string {
  const parts = depDate.split('-');
  const ddmm = parts[2] + parts[1];
  let path = `${origin}${ddmm}${dest}`;
  if (retDate) {
    const rp = retDate.split('-');
    path += rp[2] + rp[1];
  }
  path += String(adults);
  if (children > 0) path += String(children);
  const encoded = encodeURIComponent(`https://www.aviasales.com/search/${path}`);
  return `https://tp.media/r?campaign_id=121&marker=${MARKER}&trs=512633&p=4114&u=${encoded}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin')?.toUpperCase();
  const destination = searchParams.get('destination')?.toUpperCase();
  const depDate = searchParams.get('departure');
  const retDate = searchParams.get('return') || null;
  const adults = parseInt(searchParams.get('adults') || '1', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);
  const infants = parseInt(searchParams.get('infants') || '0', 10);
  const pollId = searchParams.get('poll'); // for polling live results

  if (!origin || !destination || !depDate) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // ── Poll mode: check for live search results ──
  if (pollId) {
    try {
      const pollRes = await fetch(
        `https://api.travelpayouts.com/v1/flight_search_results?uuid=${pollId}`,
        { headers: { 'X-Access-Token': TOKEN } }
      );
      if (!pollRes.ok) {
        return NextResponse.json({ done: false, flights: [], searchId: pollId });
      }
      const pollData = await pollRes.json();

      // Check if search is still in progress
      const proposals = pollData.proposals || pollData.results || [];
      const searchDone = !pollData.search_id || proposals.length > 0;

      const link = bookingLink(origin, destination, depDate, retDate, adults, children);

      const flights = proposals.slice(0, 20).map((p: any) => {
        const segment = p.segment?.[0] || {};
        const flight = segment.flight?.[0] || {};
        const airlineCode = p.validating_carrier || p.carrier || flight.operating_carrier || flight.carrier || '';
        const depTime = flight.departure || segment.dep?.time || '';
        const durationMins = p.total_duration || segment.duration || flight.duration || 0;
        const stops = (segment.flight?.length || 1) - 1;

        // Get price from unified_price or terms
        let price = 0;
        if (p.terms) {
          const termKeys = Object.keys(p.terms);
          if (termKeys.length > 0) {
            const firstTerm = p.terms[termKeys[0]];
            price = firstTerm.unified_price || firstTerm.price || 0;
          }
        }

        return {
          airline: airlineName(airlineCode),
          airlineCode,
          price: Math.round(price),
          currency: '£',
          stops: stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`,
          duration: formatDuration(durationMins),
          departure: depTime,
          link,
          live: true,
        };
      }).filter((f: any) => f.price > 0);

      flights.sort((a: any, b: any) => a.price - b.price);

      return NextResponse.json({
        done: searchDone || flights.length > 0,
        flights,
        searchId: pollId,
        origin, destination, depDate, retDate
      });
    } catch {
      return NextResponse.json({ done: false, flights: [], searchId: pollId });
    }
  }

  // ── Initiate live search ──
  try {
    const segments = [{ origin, destination, date: depDate }];
    if (retDate) {
      segments.push({ origin: destination, destination: origin, date: retDate });
    }

    // Build signature string
    // Format: token:host:locale:marker:adults:children:infants:date1:origin1:dest1[:date2:origin2:dest2]:trip_class:user_ip
    const sigParts = [
      TOKEN, HOST, 'en', MARKER,
      String(adults), String(children), String(infants),
    ];
    for (const seg of segments) {
      sigParts.push(seg.date, seg.origin, seg.destination);
    }
    sigParts.push('Y', '127.0.0.1');
    const sigString = sigParts.join(':');
    const signature = await md5(sigString);

    const body = {
      signature,
      marker: MARKER,
      host: HOST,
      user_ip: '127.0.0.1',
      locale: 'en',
      currency: 'gbp',
      trip_class: 'Y',
      passengers: { adults, children, infants },
      segments,
    };

    const searchRes = await fetch('https://api.travelpayouts.com/v1/flight_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': TOKEN,
      },
      body: JSON.stringify(body),
    });

    let liveSearchId: string | null = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      liveSearchId = searchData.search_id || null;
    }

    // ── Also fire cached queries as fallback ──
    const depMonth = depDate.slice(0, 7);
    const headers = { Accept: 'application/json' };
    const queries: Promise<any>[] = [];

    if (retDate) {
      queries.push(
        fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&return_at=${retDate}&currency=gbp&sorting=price&limit=10&market=gb&token=${TOKEN}`, { headers })
          .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
      );
    }
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depDate}&currency=gbp&sorting=price&limit=10&market=gb&one_way=true&token=${TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );
    queries.push(
      fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${depMonth}&currency=gbp&sorting=price&limit=30&market=gb&one_way=true&token=${TOKEN}`, { headers })
        .then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    );

    const results = await Promise.all(queries);

    const seen = new Set<string>();
    const allData: any[] = [];
    for (const res of results) {
      for (const f of (res.data || [])) {
        const key = `${f.airline}-${f.departure_at}-${f.price}`;
        if (!seen.has(key)) {
          seen.add(key);
          allData.push(f);
        }
      }
    }
    allData.sort((a: any, b: any) => a.price - b.price);

    const link = bookingLink(origin, destination, depDate, retDate, adults, children);

    const flights = allData.slice(0, 15).map((f: any) => {
      const durationMins = f.duration_to || f.duration || 0;
      return {
        airline: airlineName(f.airline),
        airlineCode: f.airline,
        gate: f.gate || null,
        price: f.price,
        currency: '£',
        stops: f.transfers === 0 ? 'Direct' : f.transfers === 1 ? '1 stop' : `${f.transfers} stops`,
        duration: formatDuration(durationMins),
        departure: f.departure_at || null,
        link,
        live: false,
      };
    });

    return NextResponse.json({
      flights,
      searchId: liveSearchId,
      origin, destination, depDate, retDate
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch flight prices', detail: err.message }, { status: 500 });
  }
}
