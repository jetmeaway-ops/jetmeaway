export interface Destination {
  slug: string;
  city: string;
  country: string;
  iata: string;
  heroImage: string;
  tagline: string;
  intro: string;
  whyGo: string;
  bestTime: string;
  neighbourhoods: { name: string; blurb: string }[];
  averageNightlyPrice: number;
  flightTimeFromLondonHours: number;
  faqs: { q: string; a: string }[];
}

export const DESTINATIONS: Destination[] = [
  {
    slug: 'dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    iata: 'DXB',
    heroImage:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Winter sun, rooftop pools, and the world\u2019s busiest long-haul airport.',
    intro:
      'Dubai is the UK\u2019s favourite winter-sun escape \u2014 seven hours from London, 25\u00B0C in January, and a hotel for every budget from Deira\u2019s old souks to Palm Jumeirah\u2019s beachfront towers.',
    whyGo:
      'Direct flights from every major UK airport, no jet lag on the way out, English widely spoken, and a strong pound still buys comfort here despite the luxury reputation.',
    bestTime:
      'November to March \u2014 daytime highs 22-28\u00B0C, low humidity, dry. Avoid July-August unless you plan to live indoors.',
    neighbourhoods: [
      {
        name: 'Downtown Dubai',
        blurb:
          'Burj Khalifa, Dubai Mall, Dubai Fountain. Best if you want five-star hotels within walking distance of the headline sights.',
      },
      {
        name: 'JBR \u0026 Dubai Marina',
        blurb:
          'Beachfront, Metro connected, and packed with mid-range apartments and four-star hotels. Great for first-time visitors who want the beach and the skyline.',
      },
      {
        name: 'Deira \u0026 Old Dubai',
        blurb:
          'The historic half \u2014 gold souk, spice souk, creek abras. Budget hotels start around \u00A335/night and the food is the best in the city.',
      },
    ],
    averageNightlyPrice: 78,
    flightTimeFromLondonHours: 7,
    faqs: [
      {
        q: 'Do I need a visa for Dubai from the UK?',
        a: 'UK passport holders get a free 30-day visit visa on arrival. No advance application needed.',
      },
      {
        q: 'Is Dubai expensive?',
        a: 'Hotels span the full range \u2014 three-star in Deira from \u00A335/night, five-star on the Palm from \u00A3220/night. Food and transport are cheaper than London. Alcohol in licensed venues is expensive.',
      },
      {
        q: 'What\u2019s the cheapest way to fly London to Dubai?',
        a: 'Emirates and British Airways run multiple daily direct flights from Heathrow and Gatwick. flydubai and Wizz Air Abu Dhabi offer cheaper one-stop and direct options from Stansted and Luton. Book 6-10 weeks out for the best fares.',
      },
    ],
  },
  {
    slug: 'istanbul',
    city: 'Istanbul',
    country: 'Turkey',
    iata: 'IST',
    heroImage:
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Two continents, one city, and the best value city-break in 2026.',
    intro:
      'Istanbul is the rare capital where a four-star hotel still costs under \u00A380/night, a kebab lunch under \u00A36, and you can walk from Byzantine Constantinople to Ottoman Stamboul in an afternoon.',
    whyGo:
      'Weak lira means UK visitors get five-star hotels and Michelin-listed restaurants for mid-range prices. Four-hour direct flights from London on Turkish Airlines, Pegasus and BA.',
    bestTime:
      'April-May and September-October. Summer is hot and crowded, winter is cold and damp but Christmas markets are charming.',
    neighbourhoods: [
      {
        name: 'Sultanahmet',
        blurb:
          'The old city \u2014 Hagia Sophia, Blue Mosque, Topkapi. Tourist central but unbeatable if it\u2019s your first visit.',
      },
      {
        name: 'Beyo\u011Flu \u0026 Karak\u00F6y',
        blurb:
          'The hip side of the Golden Horn \u2014 Istiklal Street, rooftop bars, boutique hotels. Best for nightlife and food.',
      },
      {
        name: 'Kad\u0131k\u00F6y',
        blurb:
          'The Asian side. Quieter, cheaper, and where actual Istanbullus live. A 15-minute ferry ride from Europe.',
      },
    ],
    averageNightlyPrice: 54,
    flightTimeFromLondonHours: 4,
    faqs: [
      {
        q: 'Do I need a visa for Istanbul from the UK?',
        a: 'No \u2014 UK passport holders can enter Turkey visa-free for stays up to 90 days.',
      },
      {
        q: 'Is Istanbul safe for tourists?',
        a: 'Yes. Istanbul is safer than most European capitals by crime rate. Usual big-city precautions apply in Sultanahmet and on public transport.',
      },
      {
        q: 'How many days do I need in Istanbul?',
        a: 'Three full days covers the headline sights. Four or five lets you slow down, cross to the Asian side, and eat properly.',
      },
    ],
  },
  {
    slug: 'baku',
    city: 'Baku',
    country: 'Azerbaijan',
    iata: 'GYD',
    heroImage:
      'https://images.unsplash.com/photo-1596394723269-b2cbca4e6e33?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Medieval walls, Caspian winds, and the Flame Towers on the skyline.',
    intro:
      'Baku is what you get when a medieval silk-road port earns oil money \u2014 a UNESCO-listed walled city wrapped inside a skyline of Zaha Hadid curves and 182-metre flame-shaped towers.',
    whyGo:
      'Direct flights from London Heathrow on BA and Azerbaijan Airlines. Excellent value on hotels (four-star from \u00A355/night), almost no UK tourists, and surprisingly good food.',
    bestTime:
      'April to June and September to October. July and August are hot and windy. Winter is milder than you\u2019d expect but grey.',
    neighbourhoods: [
      {
        name: '\u0130\u00E7\u0259ri\u015F\u0259h\u0259r (Old City)',
        blurb:
          'The UNESCO-listed walled old town \u2014 Maiden Tower, Palace of the Shirvanshahs, tiny carpet shops. Stay here for atmosphere.',
      },
      {
        name: 'Fountains Square \u0026 Nizami Street',
        blurb:
          'Baku\u2019s pedestrianised shopping heart. Four-star chains, late-night caf\u00E9s, and the main entry to the seafront boulevard.',
      },
      {
        name: 'Nasimi',
        blurb:
          'Modern, residential, and the cheapest place to stay if you\u2019re happy with a 10-minute metro ride into the centre.',
      },
    ],
    averageNightlyPrice: 58,
    flightTimeFromLondonHours: 5.5,
    faqs: [
      {
        q: 'Do I need a visa for Baku from the UK?',
        a: 'Yes \u2014 UK passport holders need an e-visa, applied online at evisa.gov.az. It costs around $25 and comes through in three business days.',
      },
      {
        q: 'Is Azerbaijan expensive?',
        a: 'No. Hotels, taxis and restaurants are roughly half London prices. A full meal with drinks at a good restaurant runs \u00A315-25.',
      },
      {
        q: 'Is Baku safe?',
        a: 'Very. Baku is one of the safest capitals in the region. Violent crime against tourists is rare and the old city is well policed.',
      },
    ],
  },
  {
    slug: 'islamabad',
    city: 'Islamabad',
    country: 'Pakistan',
    iata: 'ISB',
    heroImage:
      'https://images.unsplash.com/photo-1715528533091-f2a05fd2aa9a?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Faisal Mosque, Margalla foothills, and the cleanest capital in South Asia.',
    intro:
      'Islamabad is unlike the rest of Pakistan \u2014 a green, planned capital tucked against the Margalla Hills, home to the Faisal Mosque, foreign embassies, and the country\u2019s best air quality. With UK-Pakistan flights fully resumed after the April 17 ceasefire, Islamabad is back on the UK diaspora travel map.',
    whyGo:
      'Direct flights on PIA and British Airways from London Heathrow. Strong pound goes far: four-star hotels from \u00A345/night, a full dinner for \u00A310. The Margalla National Park is on the city\u2019s doorstep for hiking, and Murree\u2019s hill stations are 90 minutes away.',
    bestTime:
      'March-April and October-November. Summer (May-August) is hot (35-40\u00B0C) and monsoon-prone. Winter is cool and clear \u2014 good for sightseeing, poor for the northern areas.',
    neighbourhoods: [
      {
        name: 'F-6 \u0026 F-7 (Blue Area adjacent)',
        blurb:
          'The diplomatic and upscale sectors. Boutique hotels, Kohsar Market, Saidpur Village nearby. Best base for first-time visitors.',
      },
      {
        name: 'Blue Area',
        blurb:
          'Islamabad\u2019s business spine \u2014 international chain hotels (Marriott, Serena), banks, and the best restaurants. Convenient but less atmospheric.',
      },
      {
        name: 'E-11 \u0026 DHA',
        blurb:
          'Modern, residential, apartment-hotel territory. Cheapest comfortable stays and a short drive from the airport.',
      },
    ],
    averageNightlyPrice: 48,
    flightTimeFromLondonHours: 8,
    faqs: [
      {
        q: 'Are UK-Pakistan flights operating after the April 2026 ceasefire?',
        a: 'Yes. The April 17 2026 ceasefire restored normal civil aviation. PIA and British Airways resumed full London-Islamabad schedules within 48 hours of the announcement.',
      },
      {
        q: 'Do I need a visa for Pakistan from the UK?',
        a: 'Yes \u2014 UK passport holders apply online for a Pakistan e-visa at nadra.gov.pk. Tourist visas are issued in 7-10 business days and cost around \u00A335.',
      },
      {
        q: 'Is Islamabad safe for tourists?',
        a: 'Islamabad is the safest major city in Pakistan. The diplomatic enclave, Blue Area and F-sectors are well policed. Check the UK FCDO travel advice before booking.',
      },
    ],
  },
];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find(d => d.slug === slug);
}
