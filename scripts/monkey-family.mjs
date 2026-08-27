#!/usr/bin/env node
/**
 * Monkey Family — the owner's trip, replayed twice a day, forever.
 *
 * Born 2026-08-25 from a real failed trip (Dijon → Milan → Rome, family of
 * five: 2 adults + kids 16/14/10). Every check below locks a bug the owner
 * personally hit on that trip with his own family and his own card:
 *
 *   S1  couple-search baseline          — city inventory is healthy at all
 *   S2  family search, one room         — the DIJON bug: a poisoned occupancy
 *       + few-and-expensive detector      showed 3 expensive hotels while the
 *                                         supplier had 27 cheap ones
 *   S3  the SAME search repeated        — the cached-degraded / dropped-pages
 *                                         bug: a repeat search must not shrink
 *   S4  rooms 1 → 2 re-pricing          — the MILAN bug: £194.86 frozen for
 *       + tax must not shrink             1, 2 and 3 rooms; tax fell as rooms
 *                                         rose (per-room tax division)
 *   S5  rates contract                  — party echo must match the request
 *                                         (clarity work, PR#137); offers must
 *                                         be bookable (offerId + price)
 *   S6  details deep-link coords        — the Show-on-map bug: /data/hotel
 *                                         nests coords under `location`; a
 *                                         parser regression re-kills the map
 *                                         on every blog/shared link (PR#139)
 *
 * Added 2026-08-27 after a full audit of the hotel page against raw LiteAPI
 * found 13 defects that S1-S6 caught NONE of. A robot only finds the bugs it
 * was taught, and these had never been taught:
 *
 *   S7  no duplicate rate rows          — one room listed 2-4 times because
 *                                         the supplier appends the bed list
 *                                         to the name (PR#158/#161)
 *   S8  property tax is plausible       — taxes escaped the FX conversion, so
 *                                         a native-currency market showed a
 *                                         raw dirham figure behind a £ sign;
 *                                         that number also feeds the all-in
 *                                         cost the results list ranks on
 *   S9  rooms have names                — boardOptions was emitted only for
 *                                         2+ rates, so single-rate hotels
 *                                         rendered a bare board label (PR#161)
 *   S10 no guest silently dropped       — 2 adults + 5 children came back
 *                                         priced for 4 children, unannounced
 *   S11 the advertised rate LOCKS       — the one that matters: prove the
 *                                         price we show can actually be held
 *                                         at the supplier. Asking LiteAPI to
 *                                         wait longer for suppliers revealed
 *                                         21 offers instead of 14 at Hotel
 *                                         Valadier and the three cheapest ALL
 *                                         failed prebook — phantom inventory
 *                                         is worse than thin inventory
 *   S12 deal-card contract              — deals are a SECOND path to the Pay
 *                                         button: they hid the tax due at the
 *                                         property (£153.31 on a £720 stay)
 *                                         and rounded prices to whole pounds,
 *                                         which tripped a false "the hotel
 *                                         changed the price" warning (PR#160)
 *
 * Usage:
 *   node scripts/monkey-family.mjs                       # against prod
 *   BASE=http://localhost:3000 node scripts/monkey-family.mjs
 *
 * Exit 0 = every city passed. Non-zero = at least one failed; failures POST
 * to /api/bug-monitor (when BUG_MONITOR_SECRET is set) where the auto-triage
 * robot picks them up and drafts a fix PR. Never auto-merged — owner's law.
 */

const BASE = process.env.BASE || 'https://jetmeaway.co.uk';

/** The family from the trip that started all this. */
const FAMILY = { adults: 2, childrenAges: [16, 14, 10] };

/** Major-inventory cities only — the baseline thresholds assume real depth.
 *  Dijon is deliberately on the list: it is where the owner stood in the
 *  street while his own site showed him 3 expensive hotels. */
const CITIES = ['Milan', 'Rome', 'Dijon', 'London', 'Paris', 'Barcelona', 'Dubai', 'Istanbul',
  // Native-name airport, exactly as Google autocomplete fills it — locks the
  // 2026-08-27 MXP bug (owner AT the airport, site showed 0 for everyone
  // because only the English "milan malpensa" was keyed).
  'Milano Malpensa Airport (MXP)'];

/** Couple-search floor per city. Dijon is a small city — lower bar; the
 *  airport ring holds ~a dozen hotels. */
const COUPLE_MIN = { Dijon: 8, 'Milano Malpensa Airport (MXP)': 4 };
const COUPLE_MIN_DEFAULT = 20;

/** S11 holds a real room at a real supplier, so exactly ONE city per pass
 *  does it. Milan: deep inventory (a lock failure there means us, not the
 *  city) and it is where the owner's own booking fell over. */
const LOCK_TEST_CITY = 'Milan';

function dates() {
  const plus = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  // 3 weeks out, 2 nights — far enough that availability is stable, near
  // enough that suppliers have live rates.
  return { checkin: plus(21), checkout: plus(23) };
}

async function getJson(path, timeoutMs = 150_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => null);
    return { status: res.status, body, ms: Date.now() - t0 };
  } catch (err) {
    return { status: 0, body: null, ms: Date.now() - t0, err: err?.name || 'fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(path, payload, timeoutMs = 150_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch (err) {
    return { status: 0, body: null, err: err?.name || 'fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

const bookable = (d) => (d?.hotels || []).filter((h) => h.bookable && h.offerId && h.totalPrice > 0);
const cheapest = (rows, key = 'pricePerNight') =>
  rows.reduce((min, h) => (h[key] > 0 && h[key] < min ? h[key] : min), Infinity);

async function runCity(city) {
  const { checkin, checkout } = dates();
  const errs = [];
  // Encode — the airport entry carries spaces and "(MXP)".
  const cityQ = encodeURIComponent(city);
  const stay = `checkin=${checkin}&checkout=${checkout}`;
  const fam = `adults=${FAMILY.adults}&children=${FAMILY.childrenAges.length}&childrenAges=${FAMILY.childrenAges.join(',')}`;

  // ── S1: couple baseline — is the city healthy at all? ──────────────────
  const couple = await getJson(`/api/hotels?city=${cityQ}&${stay}&adults=2&children=0&rooms=1`);
  const coupleRows = bookable(couple.body);
  const coupleFloor = COUPLE_MIN[city] ?? COUPLE_MIN_DEFAULT;
  if (couple.status !== 200) errs.push(`S1 couple search HTTP ${couple.status}`);
  else if (coupleRows.length < coupleFloor) {
    errs.push(`S1 couple search collapsed: ${coupleRows.length} bookable (< ${coupleFloor}) — degraded upstream or search regression`);
  }
  const coupleCheapest = cheapest(coupleRows);

  // ── S2: the family search + the Dijon fingerprint ──────────────────────
  const famSearch = await getJson(`/api/hotels?city=${cityQ}&${stay}&${fam}&rooms=1`);
  const famRows = bookable(famSearch.body);
  if (famSearch.status !== 200) errs.push(`S2 family search HTTP ${famSearch.status}`);
  else if (famRows.length === 0) {
    errs.push(`S2 family search returned ZERO bookable hotels (couple search had ${coupleRows.length})`);
  } else {
    // Few-and-expensive is the exact fingerprint of occupancy poisoning:
    // Dijon 2026-08-23 went 27 hotels/£52 → 7 hotels/£186. Genuine family
    // scarcity reduces count but not 4x the couple price at the same time.
    const famCheapest = cheapest(famRows);
    if (famRows.length < 5 && Number.isFinite(coupleCheapest) && famCheapest > coupleCheapest * 4) {
      errs.push(`S2 FEW-AND-EXPENSIVE: ${famRows.length} hotels from £${famCheapest}/nt vs couple £${coupleCheapest}/nt — occupancy-poisoning fingerprint`);
    }
  }

  // ── S3: the same family search AGAIN — a repeat must not shrink ────────
  const famRepeat = await getJson(`/api/hotels?city=${cityQ}&${stay}&${fam}&rooms=1`);
  const famRepeatRows = bookable(famRepeat.body);
  if (famRepeat.status === 200 && famRows.length > 0 && famRepeatRows.length < famRows.length * 0.8) {
    errs.push(`S3 repeat search shrank: ${famRows.length} → ${famRepeatRows.length} bookable — cached-degraded / dropped-pages class`);
  }

  // Pick the test hotel for the per-hotel stages from the healthy baseline.
  const hotelId = coupleRows[0]?.id;
  if (!hotelId) return { city, errs, checkin, checkout };

  // ── S4: rooms 1 → 2 must RE-PRICE, and tax must not shrink ─────────────
  const r1 = await getJson(`/api/hotels/rates?hotelId=${hotelId}&${stay}&adults=2&children=0&rooms=1`);
  const r2 = await getJson(`/api/hotels/rates?hotelId=${hotelId}&${stay}&adults=2&children=0&rooms=2`);
  const o1 = (r1.body?.offers || []).filter((o) => o.totalPrice > 0);
  const o2 = (r2.body?.offers || []).filter((o) => o.totalPrice > 0);
  if (o1.length > 0 && o2.length > 0) {
    const p1 = cheapest(o1, 'totalPrice');
    const p2 = cheapest(o2, 'totalPrice');
    // FROZEN (identical to the penny) is the proven Milan-bug fingerprint —
    // a hard failure. A cheaper 2-room total is NOT: two budget singles can
    // legitimately undercut one double, and a lower price means lower VAT,
    // so those are console warnings only (first live run flagged a genuine
    // Milan hotel where 2 singles cost £70.66 vs one double £90.24).
    if (Math.abs(p2 - p1) < 0.01) {
      errs.push(`S4 PRICE FROZEN across room counts on ${hotelId}: rooms=1 £${p1} == rooms=2 £${p2} — the Milan £194.86 bug`);
    } else if (p2 < p1) {
      console.log(`     WARN ${city}: 2 rooms cheaper than 1 on ${hotelId} (£${p1} → £${p2}) — plausible (2 singles), not failing`);
    }
    const t1 = o1.find((o) => o.totalPrice === p1)?.excludedTaxes;
    const t2 = o2.find((o) => o.totalPrice === p2)?.excludedTaxes;
    // WARN only (demoted 2026-08-26 after 2 days of false alarms in
    // Milan/Rome/London): the cheapest rooms=1 and rooms=2 offers are
    // DIFFERENT RATE PLANS, and plans genuinely differ in how much tax they
    // include in the headline price vs leave payable at the desk — so the
    // excluded slice can honestly shrink while the true total grows
    // (verified on la_lp5d952: the 2-room £294 rate simply includes most
    // taxes). Cross-rate tax comparison cannot prove the division bug;
    // the FROZEN-price check above remains the only S4 hard failure.
    if (typeof t1 === 'number' && typeof t2 === 'number' && t2 < t1 - 0.01 && p2 >= p1) {
      console.log(`     WARN ${city}: excluded tax lower on 2-room rate (${hotelId}: £${t1} → £${t2}) — different rate plans, not failing`);
    }
  } else if (r1.status === 200 && o1.length === 0) {
    errs.push(`S4 zero couple offers on ${hotelId} (search said it was bookable)`);
  }

  // ── S5: the rates clarity contract (party echo, PR#137) ────────────────
  const famRates = await getJson(`/api/hotels/rates?hotelId=${hotelId}&${stay}&${fam}&rooms=2`);
  const party = famRates.body?.party;
  if (famRates.status === 200 && party) {
    if (party.adults !== FAMILY.adults || party.children !== FAMILY.childrenAges.length) {
      errs.push(`S5 party echo wrong on ${hotelId}: asked 2A+3C, priced ${JSON.stringify(party)} — occupancy drift`);
    }
  } else if (famRates.status === 200 && !party) {
    errs.push(`S5 party echo MISSING from /api/hotels/rates on ${hotelId} — clarity contract broken`);
  }
  for (const o of (famRates.body?.offers || []).slice(0, 5)) {
    if (!o.offerId) { errs.push(`S5 offer without offerId on ${hotelId} — unbookable row`); break; }
  }

  // ── S6: deep-link details must carry coordinates (PR#139 lock) ─────────
  const det = await getJson(`/api/hotels/details/${hotelId}`);
  const h = det.body?.hotel;
  if (det.status === 200 && h && (typeof h.latitude !== 'number' || typeof h.longitude !== 'number')) {
    errs.push(`S6 details coords null on ${hotelId} — Show-on-map dies on deep links (location.{latitude} parse)`);
  }

  // ═══ The 2026-08-27 audit locks (S7-S11) ═══════════════════════════════
  // Each of these was a CONFIRMED defect found by auditing the whole hotel
  // page against raw LiteAPI. The old S1-S6 caught none of them: they were
  // written to guard the Dijon trip's bugs, and a robot only ever finds the
  // bugs it was taught. These teach it the rest.

  const famOffers = (famRates.body?.offers || []).filter((o) => o.totalPrice > 0);

  // ── S7: one room, one row — no duplicate rate rows ─────────────────────
  // Suppliers list the same room twice, once with the bed list appended
  // ("Family Cabin (Pets not allowed)" vs "…(2 Twin Bunk Beds and 1 Double
  // Bed)"), and both survived a name-keyed collapse: La Maison Rouge showed
  // one room four times. A genuine pair now differs by refundability, which
  // is part of the key, so an exact (name, board, refundable, price) match is
  // a duplicate by construction.
  const seenRow = new Map();
  for (const o of famOffers) {
    const k = `${(o.roomName || '').toLowerCase()}|${(o.boardType || '').toLowerCase()}|${o.refundable}|${o.totalPrice}`;
    if (seenRow.has(k)) {
      errs.push(`S7 DUPLICATE ROW on ${hotelId}: "${o.roomName}" ${o.boardType} £${o.totalPrice} listed twice — collapse-key regression`);
      break;
    }
    seenRow.set(k, true);
  }

  // ── S8: property tax must be plausible, and present when charged ───────
  // Two defects in one bound. (a) Taxes were computed BEFORE the FX block and
  // added to an already-converted GBP price, so a native-currency market
  // showed a raw dirham/baht figure behind a £ sign — roughly 12x for MAD.
  // (b) The all-in figure the results list ranks on is price + this number,
  // so a wrong one silently mis-orders the whole page. A property tax worth
  // more than 60% of the room itself is not a tax, it is a units bug.
  for (const o of famOffers) {
    if (typeof o.excludedTaxes === 'number' && o.excludedTaxes > o.totalPrice * 0.6) {
      errs.push(`S8 IMPLAUSIBLE PROPERTY TAX on ${hotelId}: £${o.excludedTaxes} against a £${o.totalPrice} room — FX or scaling bug`);
      break;
    }
  }

  // ── S9: the room card must say what you are getting ────────────────────
  // 8-9 of 26 Málaga properties rendered a bare board label and a price
  // because boardOptions was emitted only when a hotel had MORE than one
  // rate, and the single-row fallback hardcoded name and capacity to null.
  // A priced hotel with rows but not one room name is that regression.
  if (famOffers.length > 0 && !famOffers.some((o) => o.roomName)) {
    errs.push(`S9 NO ROOM NAMES on ${hotelId}: ${famOffers.length} rows, every roomName null — boardOptions/single-rate regression`);
  }

  // ── S10: the party echo must cover the WHOLE family ────────────────────
  // A guest could vanish silently: 2 adults + 5 children in one room came
  // back priced for 4 children with no notice. S5 already checks the echo
  // matches the request; this checks the request itself was not trimmed.
  if (party && party.adults + party.children < FAMILY.adults + FAMILY.childrenAges.length) {
    errs.push(`S10 GUEST DROPPED on ${hotelId}: asked ${FAMILY.adults + FAMILY.childrenAges.length}, priced ${party.adults + party.children} — silent occupancy clamp`);
  }

  // ── S11: what we advertise must survive a real rate lock ───────────────
  // The check that matters most, and the one that would have stopped us
  // shipping a "coverage" fix that made things worse: asking LiteAPI to wait
  // longer for suppliers revealed 21 offers instead of 14 at Hotel Valadier,
  // and the three cheapest ALL failed prebook with "no availability found"
  // (2026-08-27). Phantom inventory is worse than thin inventory — it turns
  // into a dead checkout for a real customer. So: take the cheapest offer we
  // are actually advertising and prove it locks, at the price we advertised.
  //
  // Runs on ONE city per pass (a prebook holds a room at the supplier, and
  // nine holds twice a day is rude to properties we depend on). Never calls
  // /api/hotels/book — a hold expires by itself, a booking does not.
  if (city === LOCK_TEST_CITY && famOffers.length > 0) {
    const target = famOffers.reduce((min, o) => (o.totalPrice < min.totalPrice ? o : min), famOffers[0]);
    const started = await postJson('/api/hotels/start-booking', {
      offerId: target.offerId,
      hotelName: `monkey-lock-test ${hotelId}`,
      stars: 0,
      totalPrice: target.totalPrice,
      currency: 'GBP',
      checkIn: checkin,
      checkOut: checkout,
      city,
      adults: FAMILY.adults,
      nights: 2,
      rooms: 2,
      children: FAMILY.childrenAges.length,
      childAges: FAMILY.childrenAges,
    });
    const ref = started.body?.ref;
    if (!ref) {
      errs.push(`S11 start-booking refused the cheapest advertised offer on ${hotelId} — ${started.body?.error || started.status}`);
    } else {
      const locked = await postJson('/api/hotels/prebook', { ref });
      if (!locked.body?.success) {
        // 409 rate_unavailable on a rate we are ADVERTISING is the phantom-
        // inventory fingerprint. It is also what a genuinely just-sold-out
        // room looks like, so this is a WARN on the first sighting and a
        // FAIL only when the price we showed cannot be honoured at all.
        errs.push(`S11 ADVERTISED RATE WILL NOT LOCK on ${hotelId}: £${target.totalPrice} → ${locked.body?.error || locked.status} — phantom inventory or a dead cache`);
      } else if (typeof locked.body.price === 'number'
                 && Math.abs(locked.body.price - target.totalPrice) > Math.max(1, target.totalPrice * 0.02)) {
        errs.push(`S11 PRICE MOVED AT LOCK on ${hotelId}: advertised £${target.totalPrice}, locked £${locked.body.price}`);
      }
    }
  }

  return { city, errs, checkin, checkout, coupleCount: coupleRows.length, famCount: famRows.length };
}

/** Deal cards are a second, separate path to the Pay button and they had
 *  their own defects: they dropped the tax payable at the property (a
 *  Santorini deal charged £720.11 while £153.31 was due at the desk) and they
 *  rounded prices to whole pounds, which then tripped a FALSE "the hotel has
 *  updated their rate" warning against the supplier's exact re-quote. City
 *  loop can't see this — it runs once per pass. */
async function runDealsContract() {
  const errs = [];
  const deals = await getJson('/api/hotels/deals');
  if (deals.status !== 200) return [`S12 /api/hotels/deals HTTP ${deals.status}`];
  const dests = Array.isArray(deals.body?.destinations) ? deals.body.destinations
    : Array.isArray(deals.body?.deals) ? deals.body.deals
    : Array.isArray(deals.body) ? deals.body : [];
  const hotels = dests.flatMap((d) => [d?.budgetHotel, d?.topHotel, d?.premiumHotel].filter(Boolean));
  const bookableDeals = hotels.filter((h) => h.offerId && h.totalPrice > 0);
  if (bookableDeals.length === 0) return errs; // nothing on offer today, not a defect

  // The tax field must EXIST on every bookable deal. Its value may legitimately
  // be null (nothing payable at the property); `undefined` means the field was
  // dropped again and the deal is back to under-quoting the desk bill.
  const missingTax = bookableDeals.filter((h) => typeof h.localFees === 'undefined');
  if (missingTax.length > 0) {
    errs.push(`S12 DEAL TAX FIELD MISSING on ${missingTax.length}/${bookableDeals.length} bookable deals — hidden property tax regression`);
  }
  // Whole-pound prices mean Math.round is back, which manufactures a price
  // difference the checkout then alarms about.
  if (bookableDeals.every((h) => Number.isInteger(h.totalPrice))) {
    errs.push(`S12 DEAL PRICES ALL WHOLE POUNDS (${bookableDeals.length} deals) — rounding regression fires a false "price changed" warning at the Pay button`);
  }
  return errs;
}

async function reportFailureToInbox(r) {
  const secret = process.env.BUG_MONITOR_SECRET;
  if (!secret) return;
  const payload = [
    {
      level: 'error',
      message: `monkey-family failure: ${r.city} :: ${r.errs.join(' | ')}`,
      context: {
        source: 'monkey-family.mjs',
        city: r.city,
        checkin: r.checkin,
        checkout: r.checkout,
        coupleCount: r.coupleCount ?? null,
        famCount: r.famCount ?? null,
        errors: r.errs,
      },
      ts: new Date().toISOString(),
    },
  ];
  try {
    await fetch(`${BASE}/api/bug-monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bug-monitor-secret': secret },
      body: JSON.stringify(payload),
    });
  } catch {
    /* best-effort */
  }
}

async function main() {
  console.log(`Monkey family — ${CITIES.length} cities against ${BASE}\n`);
  const results = [];
  // 2-wide: each city journey fires ~7 sequential calls, several of which are
  // full LiteAPI rate computations. Wider batches hammer prod for no signal.
  const BATCH = 2;
  for (let i = 0; i < CITIES.length; i += BATCH) {
    const batch = await Promise.all(CITIES.slice(i, i + BATCH).map(runCity));
    for (const r of batch) {
      const tag = r.errs.length === 0 ? 'OK  ' : 'FAIL';
      console.log(`${tag} ${r.city.padEnd(10)} couple=${r.coupleCount ?? '-'} family=${r.famCount ?? '-'}${r.errs.length ? '\n     · ' + r.errs.join('\n     · ') : ''}`);
      results.push(r);
    }
  }
  // The deal-card path never appears in a city journey — it is its own route
  // to the Pay button, and it had its own hidden-tax and false-alarm defects.
  const dealErrs = await runDealsContract();
  if (dealErrs.length > 0) {
    console.log(`FAIL deals\n     · ${dealErrs.join('\n     · ')}`);
    results.push({ city: 'deals', errs: dealErrs, checkin: '-', checkout: '-' });
  } else {
    console.log('OK   deals');
  }

  const failed = results.filter((r) => r.errs.length > 0);
  for (const r of failed) await reportFailureToInbox(r);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('monkey-family crashed:', err);
  process.exit(2);
});
