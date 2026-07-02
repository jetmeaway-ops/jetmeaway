/**
 * Editorial content for the /world-cup-2026 page. Generated from the
 * wc-2026-content workflow (web-search grounded), then hand-checked. Edit copy
 * here directly. Figures are ESTIMATES; football picks are PREDICTIONS.
 */

export type WcBudgetTier = { name: string; dailyPerPersonGBP: string; weekTotalPerPersonGBP: string; vibe: string; includes: string[] };
export type WcBudget = { assumptions: string; tiers: WcBudgetTier[] };
export type WcEntry = { country: string; requirement: string };
export type WcChecklist = { packing: string[]; entry: WcEntry[]; tips: string[] };
export type WcCommuteCity = { slug: string; airportToStadium: string; cityCentreToStadium: string; climate: string };
export type WcXI = { name: string; position: string; club?: string };
export type WcSpotlight = { name: string; note: string };
export type WcSquad = { formation: string; blueprint: string; predictedXI: WcXI[]; spotlights: WcSpotlight[]; disclaimer: string };
export type WcFixture = { match: string; city: string; date: string };
export type WcGroupStage = { summary: string; fixtures: WcFixture[]; travel: string; climate: string; disclaimer: string };
/**
 * Scotland squad section is intentionally lighter than the England Tuchel
 * blueprint above — no fabricated predicted XI, just CONFIRMED names from
 * Steve Clarke's announced 26 with their established roles. Renders via a
 * dedicated ScotlandSquadSection component on /world-cup-2026.
 */
export type WcScotlandSquad = { formation: string; blueprint: string; spotlights: WcSpotlight[]; disclaimer: string };

export const WC_BUDGET: WcBudget = {
  "assumptions": "UK return flight + ~10 nights in ONE England group city (Dallas/Boston/NY-NJ, the pricier US end). Per person, group stage 2026. Excludes match tickets. All figures are ESTIMATES — World Cup demand surge means prices move fast.",
  "tiers": [
    {
      "name": "Budget",
      "dailyPerPersonGBP": "£90–150",
      "weekTotalPerPersonGBP": "£1,900–2,700",
      "vibe": "Lean, fan-zone energy, share costs with mates.",
      "includes": [
        "Return economy flight UK→USA (est. £600–1,200, books early)",
        "Hostel, motel or shared Airbnb, often outside the centre (est. £70–120/night, split rooms)",
        "Supermarket + fast-food, food trucks (est. £30–45/day)",
        "Subway, bus and metro passes only (est. £8–12/day)",
        "Match-day: replica shirt, fan-zone pints, public transit to stadium"
      ]
    },
    {
      "name": "Mid-range",
      "dailyPerPersonGBP": "£180–300",
      "weekTotalPerPersonGBP": "£3,800–5,500",
      "vibe": "3-star comfort, sit-down meals, the sensible sweet spot.",
      "includes": [
        "Return economy flight, decent times/legroom (est. £700–1,300)",
        "3–4 star hotel in a central area — projected $350–600/night on match nights",
        "Restaurant meals, sports bars, a few craft beers (est. £60–90/day)",
        "Mix of Uber/taxi and public transport (est. £20–35/day)",
        "Match-day: official merch, pre-game bar, rideshare to and from the ground"
      ]
    },
    {
      "name": "Luxury",
      "dailyPerPersonGBP": "£500–900+",
      "weekTotalPerPersonGBP": "£9,000–16,000+",
      "vibe": "Premium cabin, 5-star base, zero compromise.",
      "includes": [
        "Premium-economy or business return (est. £2,500–9,000+)",
        "5-star hotel near the action — projected $600/night and well up on match nights",
        "Fine dining, rooftop bars, nightlife (£200+/day)",
        "Private transfers, chauffeur or premium rideshare throughout",
        "Match-day: hospitality add-ons, VIP transport (match tickets still extra)"
      ]
    }
  ]
};

export const WC_CHECKLIST: WcChecklist = {
  "entry": [
    {
      "country": "USA",
      "requirement": "Confirmed: UK full 'British citizen' e-passport holders travel under the Visa Waiver Programme and need an approved ESTA (Electronic System for Travel Authorisation) before flying — covers tourism/business/transit up to 90 days. Apply only via the official site esta.cbp.dhs.gov (fee currently approx. $40.27 USD; estimate — confirm at apply time). ESTA is valid 2 years or until passport expiry, whichever is sooner. Passport must be valid for the whole stay (no 6-month rule for VWP). Covers the 8 US host cities you'll use: Dallas, Boston, New York/NJ, Los Angeles, Miami, Atlanta, Seattle and San Francisco Bay Area. Apply at least 72 hours before travel; many approvals are near-instant but do not bank on it. Always confirm with the official government source."
    },
    {
      "country": "Canada",
      "requirement": "Confirmed: UK passport holders flying to Canada (Toronto/YYZ, Vancouver/YVR) need an approved eTA (Electronic Travel Authorisation) before boarding. Apply only via the official Government of Canada site canada.ca (fee CAD $7). The eTA is valid up to 5 years or until passport expiry, whichever comes first, and is linked to the exact passport you apply with — renew the passport, reapply for the eTA. Note: an eTA is only needed when arriving by AIR; land/sea arrivals (e.g. crossing from the US by car/coach/train) don't require one but you still need a valid passport. Apply well ahead of travel. Always confirm with the official government source."
    },
    {
      "country": "Mexico",
      "requirement": "Confirmed: UK 'British citizen' passport holders are visa-free for tourism stays up to 180 days for Mexico City (MEX) — no ESTA/eTA equivalent to arrange online. You need the FMM (Forma Migratoria Multiple) entry record; when flying in, the cost is included in your airfare and is usually handled electronically by the airline/immigration officer (no paper card in many cases). Passport validity: GOV.UK says valid for the duration of stay, but the Mexican Embassy in the UK recommends at least 180 days' validity (the max tourist stay) — safest to travel with 6 months. Keep proof of onward/return travel; days granted are at the officer's discretion. (If you side-trip to Quintana Roo, e.g. Cancun, a separate Visitax applies — not relevant to a Mexico City-only trip.) Always confirm with the official government source."
    }
  ],
  "packing": [
    "Travel documents wallet: full 'British citizen' e-passport (valid for the whole trip; 6 months' validity recommended to clear all three countries), printed ESTA + Canada eTA approval emails, and printed flight/hotel confirmations as a backup to your phone",
    "Match-day kit: digital tickets in the official FIFA app PLUS screenshots, plus a clear stadium-compliant bag (AT&T Stadium, MetLife, Gillette and others enforce strict clear-bag policies — a small clear tote saves you at the gate)",
    "US-style power adapter (Type A/B, 120V) for the USA and Canada, and a separate check that your chargers handle 120V; a multi-port USB plug and a power bank for long match days",
    "Layered clothing for wildly different climates: breathable kit and a sunhat for Dallas/Miami/Atlanta summer heat (30C+), a light rain jacket for Seattle/Vancouver, and a warm layer for cool evenings",
    "High-SPF sun cream, refillable water bottle (empty through security, fill after) and electrolyte sachets — June-July heat in southern US host cities is no joke for all-day fan zones",
    "eSIM or US/Canada/Mexico data plan sorted before you fly (JetMeAway compares eSIMs) so maps, rideshare and mobile tickets work the moment you land",
    "Contactless payment card with low/zero overseas fees plus a small amount of USD/CAD/MXN cash; tell your bank your travel dates to avoid blocks",
    "England shirt/scarf and lightweight fan gear for the confirmed group cities — Dallas, Boston and New York/NJ — but pack light, you'll likely buy merch there",
    "Compact first-aid + medication kit with any prescription meds in original packaging plus a copy of the prescription (US pharmacies won't dispense without it)",
    "Comprehensive travel insurance documents (with USA-level medical cover — healthcare is extremely expensive) saved offline and printed",
    "Refillable toiletries in a clear 100ml liquids bag for carry-on, and a compact daypack for stadiums and fan festivals"
  ],
  "tips": [
    "Map your route to the matches, not the cities: England's confirmed group games are in Dallas, Boston and New York/NJ — but the stadiums sit OUTSIDE the city (AT&T Stadium is in Arlington ~30-40 min from Dallas, Gillette is in Foxborough ~45 min from Boston, MetLife is in East Rutherford NJ across the river from NYC). Budget extra travel time and book transport early.",
    "Sort all three travel authorisations the moment your trip is booked: ESTA (USA) and the eTA (Canada) should be applied for at least 72 hours ahead — don't leave them to the airport. Mexico City needs no online authorisation, just your passport. Each is tied to the specific passport you apply with.",
    "Estimate, don't assume, on money: a UK fan should budget realistically for the tournament window (11 June - 19 July 2026) — flights, host-city hotels and match-day transport all spike during the World Cup. Treat any price you see now as an estimate and compare across providers before booking.",
    "Cross-border legs add friction: if you're pairing US matches with Toronto/Vancouver or Mexico City, you re-clear immigration each time — flying into Canada needs the eTA, and re-entering the USA needs your ESTA to still be valid. Check your ESTA's 2-year expiry covers every US re-entry.",
    "Heat and hydration are a real risk in southern host cities (Dallas, Miami, Atlanta) where June-July temperatures regularly top 30C — pace yourself at outdoor fan zones, carry water and use sun protection.",
    "Save everything offline: tickets, passport photo page, ESTA/eTA approvals, hotel and insurance docs — phone signal and battery both vanish in packed stadiums, so screenshots and a printed backup are worth the few minutes."
  ]
};

export const WC_COMMUTE: WcCommuteCity[] = [
  {
    "slug": "dallas",
    "airportToStadium": "DFW → AT&T Stadium, Arlington ~29 km / 18 mi by car, 25 min off-peak (45-65 min on match day). No direct transit — Arlington has no city bus or rail.",
    "cityCentreToStadium": "Downtown Dallas → stadium ~32 km. No through transit: take Trinity Railway Express (TRE) to CentrePort/DFW or a charter-bus park-and-ride, then rideshare the last ~16 km. Realistically 60-90+ min door-to-door; most fans drive or use Uber/Lyft (~30 min). Tip: budget for surge pricing on match days.",
    "climate": "Hot and humid. Daytime highs typically ~33-35°C (mid-90s°F), nights ~22-25°C, humidity 60-65%. Mostly sunny with the odd afternoon thunderstorm. Indoor venue with retractable roof + A/C, so the stadium itself stays cool."
  },
  {
    "slug": "boston",
    "airportToStadium": "BOS (Logan) → Gillette Stadium, Foxborough ~45-50 km / 28-32 mi by car, ~45 min off-peak. No direct airport rail — transfer into the city first.",
    "cityCentreToStadium": "Boston (South Station / Back Bay) → Gillette via MBTA Commuter Rail 'Foxboro/Patriot' event-day trains, ~1 hr, drops right at the stadium. Round-trip ~$20 (est). From Logan allow 90-120 min total (shuttle/subway into town, then commuter rail). Trains get packed — leave early.",
    "climate": "Warm and fairly humid. Highs ~25-28°C (high 70s-low 80s°F), nights ~17-19°C, with occasional muggy spells and thundery showers. Generally comfortable for a UK fan."
  },
  {
    "slug": "new-york",
    "airportToStadium": "EWR (Newark) → MetLife Stadium, East Rutherford ~21 km / 13 mi by car, 20-30 min off-peak. No single-seat ride: AirTrain → Newark Penn → NJ Transit → Secaucus → Meadowlands event train, ~45-60 min.",
    "cityCentreToStadium": "Manhattan (Penn Station) → NJ Transit to Secaucus Junction, transfer to the Meadowlands Rail Line (event-day service direct to the stadium); ~30-45 min total, ~$10-15 (est). This is the recommended route — driving and parking are a nightmare on match days.",
    "climate": "Warm and humid. Highs ~27-29°C (low-to-mid 80s°F), nights ~19-21°C, humidity often high with sticky afternoons and the odd thunderstorm. Bring light, breathable kit."
  },
  {
    "slug": "los-angeles",
    "airportToStadium": "LAX → SoFi Stadium, Inglewood ~5 km / 3 mi — the closest airport-to-stadium of any host city. By car ~10-15 min. Transit: LAX shuttle to LAX/Metro Transit Center, then Metro C/K Line + free SoFi event shuttle.",
    "cityCentreToStadium": "Downtown LA → SoFi ~27 km / 17 mi. Metro plans direct event buses from Downtown and other hubs; otherwise Metro rail to Downtown Inglewood (K Line) + ~20-25 min shuttle, as the stadium sits ~2.5 km from the nearest station. By car 25-40 min depending on traffic.",
    "climate": "Warm and dry, low humidity. Inland Inglewood highs ~24-28°C (mid-70s-low 80s°F), nights ~16-18°C. Expect morning coastal cloud ('June Gloom') burning off to sunshine. Very pleasant; little rain."
  },
  {
    "slug": "miami",
    "airportToStadium": "MIA → Hard Rock Stadium, Miami Gardens ~27 km / 17 mi by car, ~25-30 min off-peak. Transit: MIA Mover to the Intermodal Center, then Tri-Rail north + rideshare, or Brightline (official partner) to Aventura + free Game Day Express shuttle.",
    "cityCentreToStadium": "Downtown/South Beach → stadium ~25-30 km. Best transit: Brightline to Aventura station then the free match-day shuttle to the gates (round-trip ~£60-120 est). By car 30-45 min. No single rail line goes door-to-door, so plan a transfer.",
    "climate": "Hot, very humid, tropical. Highs ~31-33°C (high 80s-low 90s°F), nights ~25-26°C, humidity 70%+. This is wet season — expect short, heavy afternoon thunderstorms most days. Open-air stadium has a canopy roof but stays warm; hydrate."
  },
  {
    "slug": "atlanta",
    "airportToStadium": "ATL (Hartsfield-Jackson) → Mercedes-Benz Stadium ~16 km / 10 mi. Best option is MARTA rail: Airport Station to GWCC/CNN Center or Vine City (~5-10 min walk to gates), ~15-25 min, ~$2.50-3. One of the easiest airport-to-stadium hops of the tournament.",
    "cityCentreToStadium": "Downtown Atlanta → stadium is a short hop — the venue sits just west of downtown by Centennial Olympic Park. MARTA Blue/Green Line to Vine City (~5 min walk) or a 10-15 min walk/rideshare from the core. Very transit-friendly.",
    "climate": "Hot and humid. Highs ~30-32°C (high 80s°F), nights ~21-22°C, humidity high with frequent afternoon thunderstorms. The stadium has a retractable roof + A/C, so matches stay comfortable indoors."
  },
  {
    "slug": "seattle",
    "airportToStadium": "SEA (Sea-Tac) → Lumen Field ~23 km / 14 mi. Link Light Rail (1 Line) runs direct: Sea-Tac to Stadium Station is a ~1-min walk from the gate, ~35-40 min, ~$3 (est). The most seamless transit-to-stadium link of any host city.",
    "cityCentreToStadium": "Downtown Seattle → Lumen Field is essentially walkable (~10-15 min from the retail core) or one stop on Link to Stadium / Int'l District-Chinatown station. Right beside the Pioneer Square district. No need for a car.",
    "climate": "Mild, dry and pleasant — the coolest US host city. Highs ~21-24°C (low-to-mid 70s°F), nights ~13-14°C, low humidity and long daylight. Mostly dry in summer with the odd grey morning. Pack a light layer for evenings."
  },
  {
    "slug": "san-francisco",
    "airportToStadium": "SFO → Levi's Stadium, Santa Clara ~49 km / 30 mi — the stadium is ~70 km south of SF itself. By car ~35-45 min. Transit: Caltrain from Millbrae (linked to SFO via BART) to Mountain View, then VTA Orange Line light rail to the stadium, ~1 hr 40 min total, ~£13-18 (est).",
    "cityCentreToStadium": "San Francisco → Levi's Stadium ~70 km. Best transit: Caltrain southbound to Mountain View + VTA light rail, ~90 min+. By car ~50-70 min in traffic. Note the stadium is in Silicon Valley, well outside the city — factor the long journey into match-day timing.",
    "climate": "Two micro-climates: foggy, cool San Francisco highs ~18-20°C (mid-60s°F) with a chilly breeze, versus warm, dry inland Santa Clara highs ~27-29°C (low-to-mid 80s°F) at the stadium. Open-air venue can get hot in the sun — but bring a jacket for the city."
  },
  {
    "slug": "toronto",
    "airportToStadium": "YYZ (Pearson) → BMO Field ~24 km / 15 mi. Transit: UP Express to Union Station (~25-28 min, ~CA$12.35), then GO Train (Lakeshore West) one stop to Exhibition (~7 min, 3-5 min walk to gates). Total ~45-55 min.",
    "cityCentreToStadium": "Downtown Toronto → BMO Field ~5 km. Take the 509/511 streetcar to Exhibition Loop, or GO Train from Union to Exhibition (~7 min). Quick and easy; ~20-30 min door-to-door by transit.",
    "climate": "Warm and moderately humid. Highs ~25-27°C (high 70s-low 80s°F), nights ~16-18°C, with occasional humid spells and thundery showers. Comfortable, UK-friendly summer weather. Open-air stadium."
  },
  {
    "slug": "vancouver",
    "airportToStadium": "YVR → BC Place ~14 km / 9 mi. Canada Line SkyTrain from the airport to downtown (~25 min), transfer at Waterfront to the Expo Line and ride to Stadium-Chinatown station (steps from the gates) or use Main St-Science World. Total ~30-40 min, ~CA$10-12 (est).",
    "cityCentreToStadium": "Downtown Vancouver → BC Place is walkable (~10-15 min) or one short SkyTrain hop to Stadium-Chinatown station, right beside the venue. Among the most central, transit-easy stadiums of the tournament.",
    "climate": "Mild, dry and pleasant. Highs ~21-22°C (low 70s°F), nights ~13-14°C, low humidity and long summer evenings. Generally dry in early-mid summer — the most temperate Canadian host city. BC Place has a retractable roof."
  },
  {
    "slug": "mexico-city",
    "airportToStadium": "MEX (Benito Juárez) → Estadio Azteca ~21-26 km / 13-16 mi by car, 25-40 min depending on heavy traffic. Transit: Metro Line 1/2 to Tasqueña, then the Tren Ligero light rail to Estadio Azteca station (short walk), ~1 hr+ with transfers.",
    "cityCentreToStadium": "Central CDMX → Azteca: Metro Line 2 to Tasqueña then Tren Ligero to the dedicated Estadio Azteca stop, ~45-60 min and very cheap (a few pence per leg). Traffic-heavy by car, so the metro + light rail combo is the reliable choice.",
    "climate": "Mild by day but note the ALTITUDE — the stadium sits at ~2,240 m (7,200 ft), so expect breathlessness and stronger sun; pace yourself and hydrate. Highs ~24-25°C (mid-70s°F), nights cool to ~12-13°C. This is the rainy season: frequent, often heavy late-afternoon/evening thunderstorms — pack a waterproof. Open-air stadium."
  }
];

export const WC_COMMUTE_BY_SLUG: Record<string, WcCommuteCity> = Object.fromEntries(
  WC_COMMUTE.map((c) => [c.slug, c]),
);

export const WC_SQUAD: WcSquad = {
  "formation": "4-2-3-1 (morphing to 3-2-5 / 2-3-5 in possession)",
  "blueprint": "PREDICTED blueprint: Tuchel leans on a possession-based 4-2-3-1 that an inverting full-back (Reece James) twists into a 3-2-5 to control tempo and conserve legs in the heat — fewer sprints, more positional rotations, slow the game in the worst sun. With England's group games spread across Dallas, Boston and New York/NJ, expect heavy rotation, deep squad use, cooling-break game management and hydration-led load planning across the long internal travel between US host cities. Tuchel has publicly downplayed expectations (\"not favourites\"), framing England as controlled rather than gung-ho.",
  "predictedXI": [
    {
      "name": "Jordan Pickford",
      "position": "GK",
      "club": "Everton"
    },
    {
      "name": "Reece James",
      "position": "RB (inverts to pivot)",
      "club": "Chelsea"
    },
    {
      "name": "Marc Guéhi",
      "position": "CB",
      "club": "Manchester City"
    },
    {
      "name": "John Stones",
      "position": "CB",
      "club": "Manchester City"
    },
    {
      "name": "Nico O'Reilly",
      "position": "LB",
      "club": "Manchester City"
    },
    {
      "name": "Declan Rice",
      "position": "DM",
      "club": "Arsenal"
    },
    {
      "name": "Elliot Anderson",
      "position": "CM",
      "club": "Nottingham Forest"
    },
    {
      "name": "Jude Bellingham",
      "position": "AM (No.10)",
      "club": "Real Madrid"
    },
    {
      "name": "Bukayo Saka",
      "position": "RW",
      "club": "Arsenal"
    },
    {
      "name": "Anthony Gordon",
      "position": "LW",
      "club": "Newcastle United"
    },
    {
      "name": "Harry Kane",
      "position": "ST (captain)",
      "club": "Bayern Munich"
    }
  ],
  "spotlights": [
    {
      "name": "Jude Bellingham",
      "note": "PREDICTED No.10 and creative heartbeat. CONFIRMED: in the 26-man squad, his second World Cup. The heat may actually suit his game — he thrives in low-tempo, half-space pockets rather than end-to-end chaos. Expect him licensed to roam off Kane and arrive late in the box. England's biggest swing factor."
    },
    {
      "name": "Nico O'Reilly",
      "note": "The emerging talent. CONFIRMED: Man City's Premier League Young Player of the Season, only a handful of caps, debut major tournament. PREDICTED to start at left-back precisely because, at 6ft4 with a midfield brain, he can invert into the pivot — central to Tuchel's 3-2-5. A genuine breakout candidate."
    },
    {
      "name": "Elliot Anderson",
      "note": "The wildcard. CONFIRMED: 2025 U21 Euros winner with England, Tuchel has repeatedly called him the 'full package'. PREDICTED as the box-to-box carrier beside Rice, breaking lines through congested midfields. If he delivers on this stage he could be a tournament revelation."
    },
    {
      "name": "Harry Kane",
      "note": "CONFIRMED captain, third World Cup, leads a side that qualified with a 100% record. PREDICTED to drop deeper as a link man in the heat, sharing the goal load with the wingers rather than chasing channels — preserving him for the latter rounds."
    }
  ],
  "disclaimer": "Predicted XI only — subject to form, injuries (Saka fitness was a recent watch) and Tuchel's final selection. Any cost/ticket figures a fan sees should be treated as estimates, not guarantees."
};

export const WC_GROUP_STAGE: WcGroupStage = {
  // Updated 2026-07-02 to knockout-stage state. Results verified via
  // ESPN / Sky / englandfootball.com on 2 July 2026 — do NOT write match
  // results here without a source.
  "summary": "England topped Group L unbeaten — a 4-2 win over Croatia in Dallas, a 0-0 draw with Ghana in Boston and a 2-0 win over Panama in New York/New Jersey — then beat DR Congo 2-1 in the Round of 32 on 1 July. Next up: Mexico at the Estadio Azteca in the Round of 16 — Sunday 5 July, 18:00 local (1am BST Monday 6 July for UK viewers).",
  "fixtures": [
    {
      "match": "England 4-2 Croatia (Group L opener)",
      "city": "Dallas — AT&T Stadium, Arlington (DFW)",
      "date": "Wednesday 17 June 2026 · FT"
    },
    {
      "match": "England 0-0 Ghana (Group L)",
      "city": "Boston — Gillette Stadium, Foxborough (BOS)",
      "date": "Tuesday 23 June 2026 · FT"
    },
    {
      "match": "England 2-0 Panama (Group L finale)",
      "city": "New York/New Jersey — MetLife Stadium, East Rutherford (EWR)",
      "date": "Saturday 27 June 2026 · FT"
    },
    {
      "match": "England 2-1 DR Congo (Round of 32)",
      "city": "Knockout stage",
      "date": "Wednesday 1 July 2026 · FT"
    },
    {
      "match": "Mexico v England (Round of 16) — up next",
      "city": "Mexico City — Estadio Azteca (MEX)",
      "date": "Sunday 5 July 2026, 18:00 local · 1am BST Mon 6 July"
    }
  ],
  "travel": "Two of England's three cities are close; one is a long hop. Dallas to Boston is the big one — roughly 1,550 mi / 2,500 km, about a 3.5–4 hr direct flight (DFW–BOS). Boston to New York/NJ is the easy leg — only about 190 mi / 305 km, a ~1 hr flight or a 3.5–4 hr Amtrak/drive down the I-95 corridor. Dallas to New York/NJ direct is about 1,370 mi / 2,200 km, a ~3.5 hr flight. The smart fan plan: fly out for Dallas, then base on the north-east corridor for the Boston and New York games. Projected return fares between US cities are an estimated £80–£250 per leg depending on how early you book — not guaranteed.",
  "climate": "Expect a real swing between the cities in late June. Dallas is the hot, humid outlier — daytime highs typically around 33–36°C, often muggy (AT&T Stadium is air-conditioned with a roof, so the match itself is sheltered). Boston and New York/NJ are noticeably milder and more variable — typically low-to-mid 20s°C, occasionally warmer, with a chance of summer showers and higher humidity in a heatwave. Pack for Texas heat first, then layers for the cooler, changeable north-east. These are typical seasonal averages, not a forecast.",
  "disclaimer": "CONFIRMED results as of 2 July 2026: England won Group L (4-2 v Croatia, 0-0 v Ghana, 2-0 v Panama) and beat DR Congo 2-1 in the Round of 32; the Round of 16 tie against Mexico at the Estadio Azteca kicks off 18:00 local on Sunday 5 July (1am BST Monday 6 July). PROJECTED / not confirmed: any venues beyond the Round of 16 depend on results; travel distances and flight times are approximate; fares are rough estimates, not guaranteed prices; climate figures are seasonal averages, not a forecast."
};

/* ── Scotland Group C ─────────────────────────────────────────────────────── */
export const WC_SCOTLAND_GROUP_STAGE: WcGroupStage = {
  // Updated 2026-07-02: Scotland's campaign ended in the group stage
  // (3 points — the win over Haiti — was not enough to advance as one of
  // the best third-placed sides). Verified via ESPN 2 July 2026. Exact
  // scores of the Morocco and Brazil defeats deliberately not stated —
  // not verified; do not invent them.
  summary: "Scotland's first World Cup since France 1998 ended in the group stage. The 28-year return brought a famous 1-0 win over Haiti at Gillette Stadium (McGinn 28'), but defeats to Morocco in Boston and group-winners Brazil in Miami left the Tartan Army on 3 points — not enough to advance as one of the best third-placed sides. A heartbreaking exit, and still a historic summer for Scottish football.",
  fixtures: [
    {
      match: "Scotland 1-0 Haiti (Group C opener) — McGinn 28'",
      city: "Boston — Gillette Stadium, Foxborough (BOS)",
      date: "Saturday 13 June 2026 · FT",
    },
    {
      match: "Scotland lost v Morocco (Group C)",
      city: "Boston — Gillette Stadium, Foxborough (BOS)",
      date: "Friday 19 June 2026 · FT",
    },
    {
      match: "Scotland lost v Brazil (Group C finale)",
      city: "Miami — Hard Rock Stadium, Miami Gardens (MIA)",
      date: "Wednesday 24 June 2026 · FT",
    },
  ],
  travel: "A friendlier itinerary than England's three-city run. The first two group games are five days apart at the same Boston venue, so a single central-Boston hotel base covers both — no relocation needed between Haiti and Morocco. The Miami leg is a ~2.5 hr internal flight south (BOS → MIA, est. £80–£200 one-way refundable depending on lead time) or a very long drive few will attempt. Total trans-Atlantic + domestic transport estimated ~£2,300 per fan for the full group stage — figures are estimates, not guaranteed prices.",
  climate: "Boston in mid-to-late June is warm and fairly humid — typically 25–28°C daytime, dropping to 17–19°C overnight, with the odd thundery shower. Generally comfortable for a UK fan. Miami in late June is the contrast: heat indices regularly exceed 35°C with 70%+ humidity and routine afternoon thunderstorms. Air-conditioned hotels are non-negotiable in Florida; pack light, breathable kit for the Brazil game. These are seasonal averages, not a weather forecast.",
  disclaimer: "CONFIRMED as of 2 July 2026: Scotland qualified by beating Denmark 4-2 at Hampden on 18 November 2025; beat Haiti 1-0 (Boston, 13 June); lost to Morocco (Boston, 19 June) and Brazil (Miami, 24 June); finished on 3 points and did not advance from Group C. Travel and climate notes are kept for reference for fans planning future US trips — fares are estimates, climate figures are seasonal averages.",
};

/* ── Steve Clarke's Scotland — confirmed core only ──────────────────────────
 * Deliberately no predicted XI grid (unlike the Tuchel section above) — the
 * blueprint is to surface the CONFIRMED named players from Clarke's 26 with
 * their established roles, not to fabricate positional predictions.
 */
export const WC_SCOTLAND_SQUAD: WcScotlandSquad = {
  formation: "3-4-2-1 (Clarke's preferred shape)",
  blueprint: "PREDICTED blueprint: Steve Clarke's Scotland is built on a back three with wing-backs, two screening midfielders and two creative tens behind a lone striker — the shape he has used through both Euro 2024 and the 2026 qualifying campaign. Set-piece dangerous, defensively organised, designed to frustrate elite opposition (Brazil, Morocco) and grind out a result against the side Scotland are expected to beat (Haiti). With the heat of a Florida finale, expect heavy rotation and cooling-break game management.",
  spotlights: [
    {
      name: "Steve Clarke (Head Coach)",
      note: "CONFIRMED: in post since May 2019, the longest-serving Scotland coach in living memory. Signed a contract extension through the 2030 cycle in May 2026 — though he has publicly indicated he is unlikely to remain in post beyond this tournament. Engineered Scotland's first World Cup qualification in 28 years.",
    },
    {
      name: "Andy Robertson (Captain)",
      note: "CONFIRMED captain. Liverpool left-back, Champions League and Premier League winner, at 92 international caps the most experienced player in the squad. The emotional anchor of the trip.",
    },
    {
      name: "Scott McTominay",
      note: "CONFIRMED: Napoli midfielder, the goal-scoring physical presence of the modern Scottish side. Opened the scoring inside three minutes against Denmark in the qualifying decider — the single most important goal of the campaign.",
    },
    {
      name: "John McGinn",
      note: "CONFIRMED: Aston Villa midfielder, 85+ caps, brings creativity and leadership. Owner-side note: Scotland 1-0 Haiti (McGinn 28' goal, opening fixture) — a fact emerging during the tournament window.",
    },
    {
      name: "Kenny McLean",
      note: "CONFIRMED: Norwich midfielder, scored the stoppage-time goal v Denmark that finally settled the qualifying night and broke the 28-year drought.",
    },
    {
      name: "Craig Gordon",
      note: "CONFIRMED: Hearts goalkeeper, 43 years old — becomes the second-oldest player ever named to a World Cup squad (behind Egypt's Essam El-Hadary at Russia 2018). An emotional honour for one of the most respected figures in Scottish football.",
    },
    {
      name: "Lawrence Shankland & Kieran Tierney",
      note: "CONFIRMED: both scored in the 4-2 win v Denmark that sealed qualification. Shankland is the Hearts striker called on for fixtures Scotland are favoured to win; Tierney is the versatile defender comfortable at left-back or in a back three.",
    },
    {
      name: "Ross Stewart & Ben Curtis",
      note: "CONFIRMED: Ross Stewart returns to the Scotland squad after a four-year international absence — a forward whose injury-disrupted club career has regained momentum. Ben Curtis, 19, is the youngest player in the squad, providing midfield depth and a glimpse of the next generation.",
    },
  ],
  disclaimer: "Squad spotlights drawn from confirmed Scotland selections and reporting around Clarke's announced 26. Formation is Clarke's typical shape — final XI subject to form and injuries. Any cost/ticket figures elsewhere on this page should be treated as estimates, not guarantees.",
};
