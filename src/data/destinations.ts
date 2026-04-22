import type { VibeTag } from '@/lib/silentScout';
import { vibesForCountry } from '@/lib/regionVibes';

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
  /** SEO overrides — when present, used instead of the auto-generated defaults */
  seoTitle?: string;
  metaDescription?: string;
  /**
   * Ordered vibe tags for Silent Scout tab defaulting on hotel ScoutSidebar.
   * First tag is the primary vibe (decides which tab opens by default);
   * remaining tags are reserved for future ranking inside other tabs.
   */
  vibeTags?: VibeTag[];
  /** Scout Sidebar — local intelligence surfaced as a distinct block */
  scout?: {
    morningRitual: string;
    wellness: string;
    privacy: string;
  };
}

export const DESTINATIONS: Destination[] = [
  {
    slug: 'dubai',
    vibeTags: ['urban', 'spa'],
    city: 'Dubai',
    country: 'United Arab Emirates',
    iata: 'DXB',
    seoTitle: 'Dubai Beyond the Burj: Morning Rituals & Local Scout',
    metaDescription:
      'Experience Dubai like a local. Scout the best morning coffee spots and wellness rituals while booking the fastest flights from the UK.',
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
    scout: {
      morningRitual: 'Join the Uncommon Club for their Saturday community run at Marasi Bay. It starts at 6:45 AM and ends with coffee at Bonbon Caf\u00E9 \u2014 a perfect social wellness ritual by the water.',
      wellness: 'Experience the Awaken Spa at Atlantis The Royal for \u2018Energy Therapy\u2019 and 24k gold massages, or use the public 7km cycling track at Al Qudra for a sunrise desert session.',
      privacy: 'Avoid the high-traffic Downtown hotels. We scout for stays in Jumeirah 1 or Al Barari for a lush, secluded atmosphere away from the tourist eye.',
    },
  },
  {
    slug: 'istanbul',
    vibeTags: ['foodie', 'urban'],
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
    scout: {
      morningRitual: 'Skip the hotel breakfast. Head to the Karak\u00F6y waterfront by 7:30 AM for a \u2018Simit and Sea\u2019 ritual \u2014 watching the ferries cross the Bosphorus while the city wakes up in the mist.',
      wellness: 'Experience the H\u00FCrrem Sultan Hamam for a royal Ottoman ritual, or run the Bosphorus Promenade from Bebek to Rumeli Hisar\u0131 \u2014 the most scenic 5km flat run in Europe (and Asia).',
      privacy: 'We recommend staying in Ni\u015Fanta\u015F\u0131. It\u2019s the \u2018Upper East Side\u2019 of Istanbul \u2014 quiet, upscale, and home to the city\u2019s best private wellness boutiques.',
    },
  },
  {
    slug: 'baku',
    vibeTags: ['urban', 'foodie'],
    city: 'Baku',
    country: 'Azerbaijan',
    iata: 'GYD',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/commons/b/b4/Panorama_of_night_Baku%2C_Azerbaijan_IMG_9682.jpg',
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
    scout: {
      morningRitual: 'A sunrise walk on the Baku Boulevard. The air off the Caspian Sea is crisp, and you can watch the Flame Towers catch the first light before the city heat kicks in.',
      wellness: 'Visit the Hamambath for an authentic Azeri scrub, or head to the Fairmont Spa in the Flame Towers for the best high-altitude sky-pool workout in the region.',
      privacy: 'The White City district is our top scout pick for 2026 \u2014 modern, spacious, and away from the noise of the Old City tourists.',
    },
  },
  {
    slug: 'islamabad',
    vibeTags: ['urban'],
    city: 'Islamabad',
    country: 'Pakistan',
    iata: 'ISB',
    seoTitle: 'Islamabad Scout Report: Fitness, Nature & Private Stays',
    metaDescription:
      'Scout Islamabad\u2019s best hiking trails and wellness spots. Book high-quality, private stays with deep neighborhood intelligence from JetMeAway.',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Faisal_Masjid_From_Damn_e_koh.jpg/1280px-Faisal_Masjid_From_Damn_e_koh.jpg',
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
    scout: {
      morningRitual: 'A 6:30 AM ascent of Trail 3 or Trail 5 in the Margalla Hills. Reaching the \u2018Monal\u2019 viewpoint as the mist clears over the capital is the ultimate Islamabad mental reset.',
      wellness: 'Visit MetaFitnosis in F-6 for boutique, results-driven training, or check out the Safa Fitness Club for a rooftop workout with views of the Faisal Mosque.',
      privacy: 'We recommend the F-7 or E-7 sectors. These are the quietest, tree-lined residential zones that maintain the \u2018Privacy Shield\u2019 JetMeAway is known for.',
    },
  },
  {
    slug: 'lahore',
    vibeTags: ['foodie', 'urban'],
    city: 'Lahore',
    country: 'Pakistan',
    iata: 'LHE',
    seoTitle: 'Scout Lahore: Morning Rituals & Best Stays in 2026',
    metaDescription:
      'Discover the best of Lahore. From wellness ecosystems to the fastest flight routes, get the neighborhood intel you need for a perfect stay.',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Badshahi_Mosquee%2C_Lahore.jpg/1280px-Badshahi_Mosquee%2C_Lahore.jpg',
    tagline: 'Mughal courtyards, chai at sunrise, and the food capital of Pakistan.',
    intro:
      'Lahore is the soul of Pakistan \u2014 700 years of Mughal history, the world\u2019s most opinionated food scene, and a morning culture that runs on strong doodh-patti chai before the city wakes. Where Islamabad is planned, Lahore is lived-in.',
    whyGo:
      'Direct flights from London Heathrow on PIA and British Airways, fully restored after the April 17 2026 ceasefire. Lahore is cheaper than Islamabad on hotels (\u00A340/night for four-star) and delivers the deepest cultural experience of any South Asian city break.',
    bestTime:
      'October to March. Winter mornings are crisp and perfect for walking the Walled City. Summer (May-September) is brutal \u2014 40\u00B0C+ and pre-monsoon humidity.',
    neighbourhoods: [
      {
        name: 'Gulberg',
        blurb:
          'Lahore\u2019s upscale heart \u2014 boutique hotels, MM Alam Road restaurants, Liberty Market. Best base for first-time visitors.',
      },
      {
        name: 'Walled City (Androon Shehr)',
        blurb:
          'The 400-year-old Mughal core \u2014 Badshahi Mosque, Lahore Fort, Food Street. Budget hotels from \u00A320/night and the best food in Pakistan.',
      },
      {
        name: 'DHA Phase 5 \u0026 6',
        blurb:
          'Modern, residential, gated. Apartment-hotels and wellness clubs. Quieter base if you prefer tree-lined streets to old-city chaos.',
      },
    ],
    averageNightlyPrice: 42,
    flightTimeFromLondonHours: 8,
    faqs: [
      {
        q: 'Do I need a visa for Lahore from the UK?',
        a: 'Yes. UK passport holders apply online for a Pakistan e-visa at nadra.gov.pk. Tourist visas cost around \u00A335 and are issued in 7-10 business days.',
      },
      {
        q: 'Is Lahore safe for tourists?',
        a: 'Gulberg, DHA and the Walled City daytime areas are well policed and heavily touristed. Exercise normal big-city caution and follow UK FCDO advice.',
      },
      {
        q: 'What\u2019s Lahore famous for?',
        a: 'Mughal architecture (Badshahi Mosque, Shalimar Gardens), food (nihari, siri paya, Gawalmandi Food Street), and a morning culture built around chai and paratha.',
      },
    ],
    scout: {
      morningRitual: 'Head to the Walled City (Androon Shehar) by 7:00 AM. Witness the \u2018Gate Awakening\u2019 as the old city starts its day with traditional Halwa Puri in Lakshmi Chowk before the heat and crowds arrive.',
      wellness: 'Experience the Nirvana Spa in DHA for modern recovery, or join the locals for a sunrise power-walk in Model Town Park, which features a dedicated 2.5km fitness track under ancient trees.',
      privacy: 'Stay in Gulberg III for high-end privacy with immediate access to M.M. Alam Road\u2019s wellness boutiques.',
    },
  },
  {
    slug: 'abu-dhabi',
    vibeTags: ['urban', 'spa'],
    city: 'Abu Dhabi',
    country: 'United Arab Emirates',
    iata: 'AUH',
    seoTitle: 'Abu Dhabi Scout: Cultural Immersion & Wellness Stays',
    metaDescription:
      'Explore Abu Dhabi\u2019s traditional rituals and modern luxury. Get expert intel on the best neighborhood stays for a high-quality 2026 trip.',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/en/thumb/a/a3/Sheikh_Zayed_Mosque_2022.jpg/1280px-Sheikh_Zayed_Mosque_2022.jpg',
    tagline: 'Slower than Dubai, richer in culture, and where the UAE actually lives.',
    intro:
      'Abu Dhabi is the UAE\u2019s quiet capital \u2014 the Sheikh Zayed Grand Mosque, the Louvre, desert stretches that start 20 minutes from the corniche, and a serious wellness scene built around beach clubs, yoga retreats, and 5am falcon-watching.',
    whyGo:
      'Direct flights from London Heathrow on Etihad and BA, six and a half hours door to door. Often \u00A3100 cheaper than Dubai on mid-range hotels with better beaches, easier taxis, and no Dubai Mall queues.',
    bestTime:
      'November to March \u2014 daytime highs 24-28\u00B0C, low humidity, perfect for the corniche and the desert. Avoid June-September.',
    neighbourhoods: [
      {
        name: 'Corniche \u0026 Al Markaziyah',
        blurb:
          'The seafront core \u2014 luxury hotels, public beaches, morning runners. Best base for first-timers who want water views.',
      },
      {
        name: 'Saadiyat Island',
        blurb:
          'Cultural district \u2014 Louvre Abu Dhabi, Guggenheim (opening 2026), and the quietest stretch of Gulf beach you\u2019ll find anywhere.',
      },
      {
        name: 'Yas Island',
        blurb:
          'Theme-park and F1 circuit territory. Family-friendly hotels with pools, Ferrari World, and Yas Marina Circuit on the doorstep.',
      },
    ],
    averageNightlyPrice: 82,
    flightTimeFromLondonHours: 6.5,
    faqs: [
      {
        q: 'Do I need a visa for Abu Dhabi from the UK?',
        a: 'No. UK passport holders get a free 30-day visit visa on arrival at Abu Dhabi International.',
      },
      {
        q: 'Is Abu Dhabi or Dubai better for a first UAE trip?',
        a: 'Dubai if you want nightlife, shopping and sheer spectacle. Abu Dhabi if you want cultural depth, cleaner beaches, and a slower pace. Many travellers split the week between both \u2014 they\u2019re 80 minutes apart by car.',
      },
      {
        q: 'What\u2019s special about the Sheikh Zayed Grand Mosque?',
        a: 'It\u2019s the third-largest mosque in the world, free to enter, and one of the most visited buildings on Earth. Dress-code abayas are provided free at the entrance. Go at sunset for the best light.',
      },
    ],
  },
  {
    slug: 'sharjah',
    vibeTags: ['urban'],
    city: 'Sharjah',
    country: 'United Arab Emirates',
    iata: 'SHJ',
    seoTitle: 'Sharjah Uncovered: The Cultural Scout Guide 2026',
    metaDescription:
      'Scout Sharjah\u2019s hidden arts and culture scene. Your personal travel scout for high-quality stays and authentic local lifestyle integration.',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Al_Khan_Lagoon_by_Night.jpg/1280px-Al_Khan_Lagoon_by_Night.jpg',
    tagline: 'The UAE\u2019s cultural capital \u2014 museums, calligraphy, and no pretence.',
    intro:
      'Sharjah is the emirate that kept the culture. UNESCO named it Arab Capital of Culture for good reason \u2014 23 museums, the Heart of Sharjah restoration project, and a calligraphy museum that beats anything in Dubai. It\u2019s also the cheapest way to visit the UAE.',
    whyGo:
      'Fly into Dubai (30 minutes away) or direct from London Gatwick on Air Arabia \u2014 the cheapest UAE fare on the market. Hotels are roughly half Dubai prices and licensed venues are rare (dry emirate), so your mornings are productive.',
    bestTime:
      'November to March \u2014 daytime 22-27\u00B0C, cool evenings. Summer is 45\u00B0C and only worth braving for deep discounts on hotels.',
    neighbourhoods: [
      {
        name: 'Al Majaz Waterfront',
        blurb:
          'The modern seafront \u2014 fountains, joggers at dawn, family hotels. Best base for a first visit, metro-connected to Dubai.',
      },
      {
        name: 'Heart of Sharjah',
        blurb:
          'The restored historic quarter \u2014 coral-stone houses, heritage hotels, the Calligraphy Museum and Souk Al Arsah. The cultural core.',
      },
      {
        name: 'Al Qasba',
        blurb:
          'Canal-front arts district \u2014 boutique hotels, the Maraya Art Centre, and the 60m Eye of the Emirates ferris wheel.',
      },
    ],
    averageNightlyPrice: 45,
    flightTimeFromLondonHours: 7,
    faqs: [
      {
        q: 'Do I need a visa for Sharjah from the UK?',
        a: 'No. UK passport holders get the same free 30-day UAE visit visa on arrival that applies to Dubai and Abu Dhabi.',
      },
      {
        q: 'Is alcohol available in Sharjah?',
        a: 'Sharjah is a dry emirate \u2014 no licensed bars or hotel minibars. You can drink legally at private residences and in neighbouring Dubai / Ajman. Many visitors base themselves in Dubai and day-trip to Sharjah.',
      },
      {
        q: 'Is Sharjah worth visiting separately from Dubai?',
        a: 'For cultural depth, yes. The museums, Heart of Sharjah and the Souk Al Arsah are genuinely unique and refreshingly uncommercial. Budget half a day minimum.',
      },
    ],
  },
  {
    slug: 'muscat',
    vibeTags: ['urban', 'adventure'],
    city: 'Muscat',
    country: 'Oman',
    iata: 'MCT',
    seoTitle: 'Scout Muscat: Wild Landscapes & Ancient Rituals',
    metaDescription:
      'From the Al Hajar mountains to ancient morning rituals, scout the best of Muscat. Private, fast, and focused on life beyond lodging.',
    heroImage:
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Low-rise, mountain-backed, and the quietest capital on the Gulf.',
    intro:
      'Muscat refused to become Dubai. The city by law has no building taller than a palm tree, the old souk in Mutrah still smells of frankincense, and the Al Hajar mountains rise 3,000m straight off the corniche. Oman is what the UAE was 40 years ago.',
    whyGo:
      'Direct flights from London Heathrow on Oman Air and BA, around seven hours. Omanis rate among the friendliest hosts in the region, the wadis (canyon swimming pools) an hour from Muscat are life-changing, and prices sit below UAE levels.',
    bestTime:
      'November to March. December-January daytime is perfect (25\u00B0C). Summer (June-August) is genuinely dangerous \u2014 45\u00B0C+ with humidity.',
    neighbourhoods: [
      {
        name: 'Mutrah',
        blurb:
          'The historic port \u2014 corniche walk, Mutrah Souk, fish market at dawn. Best base for atmosphere, budget hotels from \u00A340/night.',
      },
      {
        name: 'Shatti Al Qurum',
        blurb:
          'The beach strip \u2014 five-star resorts, public beaches, the Royal Opera House. Best base if you want the pool-and-beach rhythm.',
      },
      {
        name: 'Al Mouj (The Wave)',
        blurb:
          'A modern marina development \u2014 apartment-hotels, golf course, and the quietest stretch of sand near the city.',
      },
    ],
    averageNightlyPrice: 68,
    flightTimeFromLondonHours: 7,
    faqs: [
      {
        q: 'Do I need a visa for Oman from the UK?',
        a: 'Yes. UK passport holders apply online for an Oman e-visa at evisa.rop.gov.om. Tourist visas are issued in 24-48 hours and cost around \u00A315 for 10 days.',
      },
      {
        q: 'Is Muscat safe?',
        a: 'Extremely. Oman consistently ranks among the safest countries in the region for tourists, with very low crime rates and a well-funded police presence.',
      },
      {
        q: 'What day trips are worth it from Muscat?',
        a: 'Wadi Shab (2 hours, canyon swimming), Nizwa (1.5 hours, the old capital and Friday goat market), and the Bimmah Sinkhole for a quick swim. Hire a 4x4 \u2014 the roads are excellent.',
      },
    ],
  },
  {
    slug: 'doha',
    vibeTags: ['urban', 'foodie'],
    city: 'Doha',
    country: 'Qatar',
    iata: 'DOH',
    seoTitle: 'Doha Scout Report: Morning Rituals & Elite Wellness',
    metaDescription:
      'Get the neighborhood intel on Doha. Scout the best fitness ecosystems and high-quality stays for a private, authentic Qatar experience.',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Doha_Dhow_Harbour_Skyline_View_01.jpg/1280px-Doha_Dhow_Harbour_Skyline_View_01.jpg',
    tagline: 'Post-World Cup Doha \u2014 the Gulf\u2019s most ambitious city, still half-empty.',
    intro:
      'Doha spent \u00A3180 billion preparing for the 2022 World Cup and hasn\u2019t finished building. The Museum of Islamic Art is I.M. Pei\u2019s last great work, Souq Waqif is the best-preserved old market on the Gulf, and the city\u2019s Corniche running path is a genuine morning ritual.',
    whyGo:
      'Qatar Airways flies direct from London Heathrow and Gatwick, around six and a half hours \u2014 consistently rated the world\u2019s best airline. The city itself is cleaner, quieter and less touristed than Dubai, with better cultural institutions.',
    bestTime:
      'November to March. December-February is ideal (24\u00B0C, no humidity). Avoid May-September: 45\u00B0C plus the summer humidity off the Gulf is unbearable.',
    neighbourhoods: [
      {
        name: 'West Bay \u0026 Corniche',
        blurb:
          'The skyline \u2014 five-star hotels, morning joggers, and the seven-kilometre Corniche walk. Best base for first-timers.',
      },
      {
        name: 'Msheireb \u0026 Souq Waqif',
        blurb:
          'The historic core \u2014 restored souq, heritage hotels, and the best dining in Doha. More atmospheric than West Bay.',
      },
      {
        name: 'The Pearl',
        blurb:
          'Artificial-island luxury \u2014 marina apartments, waterfront dining, Porto Arabia. Family-friendly and walkable.',
      },
    ],
    averageNightlyPrice: 95,
    flightTimeFromLondonHours: 6.5,
    faqs: [
      {
        q: 'Do I need a visa for Doha from the UK?',
        a: 'No. UK passport holders get a free 30-day visa waiver on arrival at Hamad International.',
      },
      {
        q: 'Is Doha expensive?',
        a: 'Hotels are pricier than Dubai on average, but the quality tier is higher. Food ranges widely \u2014 Souq Waqif has meals from \u00A38, while West Bay fine dining easily runs \u00A380+. Taxis are cheap.',
      },
      {
        q: 'Is alcohol available in Doha?',
        a: 'Only in licensed hotel bars and the QDC (for residents). No off-licence, no alcohol in the souq or restaurants outside hotels. Plan accordingly.',
      },
    ],
  },
  {
    slug: 'colombo',
    vibeTags: ['foodie', 'urban'],
    city: 'Colombo',
    country: 'Sri Lanka',
    iata: 'CMB',
    seoTitle: 'Colombo Scout: Morning Rituals & Coastal Wellness',
    metaDescription:
      'Scout Colombo\u2019s vibrant lifestyle. We find the best wellness spots and neighborhood intel for your 2026 Sri Lankan journey.',
    heroImage:
      'https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Galle Face sunsets, Pettah chaos, and the cheapest five-star stays in Asia.',
    intro:
      'Colombo is the gateway to Sri Lanka but a destination in its own right \u2014 a 400-year-old port layered with Portuguese, Dutch, British and Tamil history, a food scene built on short-eats and hoppers, and a lagoon-side morning running culture along Galle Face Green.',
    whyGo:
      'Sri Lankan Airlines and Emirates (via Dubai) connect London to Colombo in 10-13 hours. The rupee means a four-star hotel runs under \u00A360/night, a genuinely great meal is under \u00A315, and a tuktuk across town is \u00A31.',
    bestTime:
      'December to March \u2014 dry, clear, low humidity. The southwest monsoon (May-September) brings heavy rain to Colombo\u2019s coast. October-November is the inter-monsoon shoulder.',
    neighbourhoods: [
      {
        name: 'Galle Face \u0026 Colombo 3',
        blurb:
          'The seafront core \u2014 Galle Face Green, luxury hotels, the Colombo Lotus Tower. Best base for first-timers.',
      },
      {
        name: 'Cinnamon Gardens (Colombo 7)',
        blurb:
          'Leafy diplomatic quarter \u2014 boutique hotels in colonial villas, Viharamahadevi Park, the National Museum. Quieter, greener, higher-end.',
      },
      {
        name: 'Pettah \u0026 Fort',
        blurb:
          'The raw old port \u2014 wholesale markets, Dutch Hospital dining, budget hotels. Loud, chaotic, unbeatable street food.',
      },
    ],
    averageNightlyPrice: 52,
    flightTimeFromLondonHours: 11,
    faqs: [
      {
        q: 'Do I need a visa for Sri Lanka from the UK?',
        a: 'Yes \u2014 a Sri Lanka ETA, applied online at eta.gov.lk. Tourist ETAs cost around \u00A325 and are issued within 48 hours.',
      },
      {
        q: 'Is Colombo safe for tourists?',
        a: 'Yes \u2014 Colombo has low violent crime and tourist areas are well policed. Normal big-city precautions apply in Pettah after dark.',
      },
      {
        q: 'Is Colombo worth visiting or just a stopover?',
        a: 'Worth two full days minimum. Most travellers rush through to Kandy or Galle, but Colombo\u2019s food, markets and architecture reward a proper visit.',
      },
    ],
  },
  {
    slug: 'marrakech',
    vibeTags: ['foodie', 'spa'],
    city: 'Marrakech',
    country: 'Morocco',
    iata: 'RAK',
    seoTitle: 'Marrakech Scout: Hidden Rituals & Authentic Riad Stays',
    metaDescription:
      'Discover the \u201CLife\u201D in Marrakech. Scout the best morning rituals and hidden wellness spots with our deep neighborhood intelligence layer.',
    heroImage:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Minaret_de_Marrakech.jpg/1280px-Minaret_de_Marrakech.jpg',
    tagline: 'Riads at sunrise, Atlas snow on the horizon, and a hammam every 300 metres.',
    intro:
      'Marrakech is the red city \u2014 a medina where 12th-century walls enclose a thousand alleyways, a new town (Gueliz) where Moroccan design meets French caf\u00E9 culture, and a riad tradition that turns guesthouses into sanctuaries around orange-tree courtyards.',
    whyGo:
      'Three-and-a-half hours direct from London Gatwick, Stansted and Luton on Ryanair, easyJet, British Airways and Royal Air Maroc. Riads from \u00A340/night, hammam rituals under \u00A320, and the Atlas mountains an hour away for day hikes.',
    bestTime:
      'March to May and September to November. Summer is hot (40\u00B0C) but the riads stay cool. Winter evenings can drop to 5\u00B0C \u2014 bring layers.',
    neighbourhoods: [
      {
        name: 'The Medina',
        blurb:
          'The walled old city \u2014 Jemaa el-Fna square, the souks, Bahia Palace. Traditional riads line the alleyways. The essential first-time base.',
      },
      {
        name: 'Gueliz (New Town)',
        blurb:
          'French colonial quarter \u2014 boutique hotels, design shops, rooftop restaurants, Majorelle Garden. Quieter, more modern.',
      },
      {
        name: 'Palmeraie \u0026 Hivernage',
        blurb:
          'Resort and palm-grove territory \u2014 spa hotels, boutique riads with full hammams, polo clubs. For slower, wellness-led stays.',
      },
    ],
    averageNightlyPrice: 55,
    flightTimeFromLondonHours: 3.5,
    faqs: [
      {
        q: 'Do I need a visa for Morocco from the UK?',
        a: 'No. UK passport holders get a free 90-day visit entry on arrival.',
      },
      {
        q: 'Is Marrakech safe for tourists?',
        a: 'Yes \u2014 the medina is heavily patrolled and tourist scams (rather than crime) are the main issue. Agree tuktuk/taxi prices before the ride and be firm with guides.',
      },
      {
        q: 'Should I stay in a riad or a hotel?',
        a: 'A riad, at least for the first night. It\u2019s the authentic Marrakech experience \u2014 courtyards, rooftop breakfasts, hand-crafted everything. Boutique hotels in Gueliz work well for longer stays.',
      },
    ],
    scout: {
      morningRitual: 'Early morning at Le Jardin Secret in the Medina. Being there right at opening (9:00 AM) lets you experience the Islamic gardens in total silence before the midday bustle.',
      wellness: 'Indulge in a traditional Beldi Soap scrub at a neighbourhood hammam, or head to the Agafay Desert (45 mins away) for sunrise yoga on the dunes.',
      privacy: 'We scout for riads in the Bab Doukkala area. It\u2019s authentic and quiet, yet just a 10-minute walk to the main square.',
    },
  },
  {
    slug: 'london',
    vibeTags: ['urban', 'foodie'],
    city: 'London',
    country: 'United Kingdom',
    iata: 'LHR',
    seoTitle: 'Scout London: Best Morning Rituals & Fitness Ecosystems',
    metaDescription:
      'Visiting the UK? Scout London\u2019s best-kept secrets. From neighborhood fitness spots to local morning rituals, travel like a Londoner.',
    heroImage:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&h=900&fit=crop&fm=webp&q=80',
    tagline: 'Six Heathrow terminals, 33 boroughs, and more morning run clubs than any city on Earth.',
    intro:
      'London is the world\u2019s most connected travel hub and one of its most underrated wellness cities. Hampstead Heath at 6am, lido swimming year-round, 80+ parkruns every Saturday, and a serious specialty-coffee culture that rivals Melbourne. This is the Scout\u2019s home turf.',
    whyGo:
      'For international travellers: six airports (LHR, LGW, STN, LTN, LCY, SEN) connect to 300+ destinations. For UK travellers: London is your hub \u2014 every flight on JetMeAway lets you fly from your nearest city, not just Heathrow.',
    bestTime:
      'May-June and September-October \u2014 long daylight, mild weather, the parks at their best. December for Christmas markets. Avoid August (tourist peak) and February (grey and cold).',
    neighbourhoods: [
      {
        name: 'Shoreditch \u0026 Hoxton',
        blurb:
          'East London\u2019s creative core \u2014 boutique hotels, specialty-coffee every 100m, and the best nightlife in the city. Best base for first-time visitors who want modern London.',
      },
      {
        name: 'Marylebone \u0026 Fitzrovia',
        blurb:
          'Central and walkable \u2014 five-star heritage hotels, Regent\u2019s Park, and some of the city\u2019s best restaurants. Best for luxury stays.',
      },
      {
        name: 'Hampstead \u0026 Highgate',
        blurb:
          'Village London on the Heath \u2014 boutique inns, swimming ponds, and Sunday morning runs through one of the world\u2019s great urban wildernesses.',
      },
    ],
    averageNightlyPrice: 165,
    flightTimeFromLondonHours: 0,
    faqs: [
      {
        q: 'Which London airport should I fly into?',
        a: 'Heathrow for most long-haul routes, Gatwick for Europe and US budget carriers, Stansted and Luton for budget Europe, London City for business quick-trips. JetMeAway\u2019s flight search compares all six automatically.',
      },
      {
        q: 'Is London expensive?',
        a: 'Hotels average \u00A3165/night, pints \u00A37, restaurant mains \u00A320-35. The best value comes from East London (Shoreditch, Dalston) and staying in hotels with Tube access rather than taxis.',
      },
      {
        q: 'What\u2019s London\u2019s best underrated morning ritual?',
        a: 'Hampstead Heath Ladies\u2019 / Men\u2019s / Mixed Ponds at sunrise \u2014 open year-round, \u00A34.75 entry, the city\u2019s best-kept secret. Follow with coffee at Ginger \u0026 White in Belsize Park.',
      },
    ],
    scout: {
      morningRitual: 'A \u2018Serpentine Dip\u2019 or a walk through Regent\u2019s Park to catch the sunset at Primrose Hill. It\u2019s the ritual of choice for London\u2019s creative class to ground themselves in the city\u2019s green lungs.',
      wellness: 'For community wellness, visit the Walthamstow Community Sauna Baths. For high-end fitness, scout the boutique studios in Marylebone or the lidos (outdoor pools) like Brockwell or Parliament Hill.',
      privacy: 'Look beyond Zone 1. We scout Richmond or Crouch End \u2014 neighbourhoods that feel like English market towns but are just 20 minutes from the centre.',
    },
  },
  {
    slug: 'sharm-el-sheikh',
    vibeTags: ['adventure', 'spa'],
    city: 'Sharm El Sheikh',
    country: 'Egypt',
    iata: 'SSH',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Sharm_El_Sheikh._Naama_Bay..jpg/1280px-Sharm_El_Sheikh._Naama_Bay..jpg',
    tagline: 'Red Sea reef walks, desert-sunrise runs and thermal-salt bathing on Sinai\u2019s wellness coast.',
    intro:
      'Sharm El Sheikh is the UK\u2019s favourite winter-sun escape \u2014 a five-hour hop to 27\u00B0C, some of the world\u2019s clearest reef diving, and a growing wellness scene built around Bedouin breathwork, Sinai salt caves and sunrise desert PT. Naama Bay handles the nightlife; Nabq and Sharks Bay handle the quiet coral-edged mornings.',
    whyGo:
      'Year-round reef snorkelling straight off the beach, 35-minute direct flights to some of the Red Sea\u2019s best dive sites, and all-inclusive resorts that still undercut Canaries pricing. Visa is a 25 USD e-visa or free 15-day Sinai-only stamp on arrival.',
    bestTime:
      'October to April: 22-28\u00B0C, 25\u00B0C sea, calm winds. May to September is hot (35\u00B0C+) but cheapest. Ramadan 2027 shifts to February \u2014 resorts stay fully open.',
    neighbourhoods: [
      { name: 'Nabq Bay', blurb: 'Protected reef right off the beach, newest five-stars, quiet wellness-led stays. Best for first-time divers and spa escapes.' },
      { name: 'Sharks Bay', blurb: 'Dive-centre capital \u2014 cliffside reefs, sunrise desert runs into the Sinai hills, mid-range resorts with real dive schools.' },
      { name: 'Naama Bay', blurb: 'The original strip \u2014 walkable promenade, rooftop restaurants, nightlife. Older hotels but the most liveable if you hate resort compounds.' },
    ],
    averageNightlyPrice: 72,
    flightTimeFromLondonHours: 5,
    faqs: [
      { q: 'Is Sharm El Sheikh safe in 2026?', a: 'Yes \u2014 FCDO advises against travel to North Sinai but Sharm (South Sinai) is open and heavily secured. Resort areas and the airport road are fine; day trips beyond Dahab require guided tours.' },
      { q: 'Do I need a visa?', a: 'UK passport holders get a free 15-day Sinai-only stamp on arrival if you\u2019re staying in the Sharm/Dahab/Nuweiba area. For day trips to Cairo or Luxor, buy the 25 USD e-visa before flying.' },
      { q: 'What\u2019s the underrated morning ritual?', a: 'Sunrise camel breakfast at Ras Mohammed with a Bedouin guide \u2014 45 minutes from town, 60 GBP, includes mint tea and fresh bread on coals while the sun clears the reef.' },
    ],
    seoTitle: 'Scout Sharm El Sheikh: Red Sea Vitality & Desert Rituals',
    metaDescription: 'Red Sea wellness, reef diving rituals and Sinai desert fitness from the UK. Compare Sharm El Sheikh hotels and flights with Scout-grade neighbourhood intel.',
    scout: {
      morningRitual: 'A sunrise meditation at Farsha Mountain Lounge before it gets busy. Watching the sun hit the cliffs of Hadaba is the ultimate Sinai start.',
      wellness: 'Scout the Ras Muhammad National Park for drift diving \u2014 the ultimate \u2018Blue Health\u2019 ritual. For land-based recovery, the Turkish Hammams in the Old Market offer the best salt-scrub treatments.',
      privacy: 'We recommend the Shark\u2019s Bay area. It\u2019s closer to the airport but much quieter and more private than the crowded Naama Bay centre.',
    },
  },
  {
    slug: 'budapest',
    vibeTags: ['spa', 'urban'],
    city: 'Budapest',
    country: 'Hungary',
    iata: 'BUD',
    heroImage: 'https://images.unsplash.com/photo-1541343672885-9be56236302a?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Thermal baths, Danube sunrise runs and 19th-century wellness rituals two hours from London.',
    intro:
      'Budapest is Europe\u2019s thermal capital \u2014 built on 120 natural hot springs, with bath palaces older than most countries. UK travellers land at 6am, swim laps at Sz\u00E9chenyi under the steam, eat goulash for breakfast, and still have a full day before check-in. Ruin bars get the headlines but the morning ritual is the real draw.',
    whyGo:
      '2h 30m flights, 6-day weeks on 400 GBP (hotel, baths, food), and a wellness scene that spans 200-year-old baths, forest saunas in the Buda hills and new Scandi-style floating saunas on the Danube.',
    bestTime:
      'March to May and September to October: 15-22\u00B0C, thin crowds, bath-garden terraces open. Winter (Dec-Feb) is the most atmospheric \u2014 steam rising off the outdoor baths in minus temperatures.',
    neighbourhoods: [
      { name: 'District V (Belv\u00E1ros)', blurb: 'Pest\u2019s riverbank core \u2014 Parliament, Danube promenade, five-star heritage hotels. Best for first-time stays.' },
      { name: 'District VII (Jewish Quarter)', blurb: 'Ruin bars, speciality coffee, boutique stays. Noisy nights, brilliant morning coffee culture.' },
      { name: 'District II (Buda Hills)', blurb: 'Quiet side \u2014 thermal baths, forest runs, Art Nouveau villas. Best for spa-led slow stays.' },
    ],
    averageNightlyPrice: 78,
    flightTimeFromLondonHours: 2.5,
    faqs: [
      { q: 'Which bath should I book first?', a: 'Sz\u00E9chenyi for the spectacle (yellow Neo-Baroque, outdoor pools, chess players in the steam) and Rudas for the authentic 500-year-old Turkish dome bath. Both 12-18 GBP including locker.' },
      { q: 'Is the Jewish Quarter really that loud?', a: 'Weekends yes \u2014 ruin bars run until 4am. Mid-week is quieter. If you want the atmosphere but not the noise, stay District V or VI and walk over.' },
      { q: 'Underrated morning ritual?', a: 'G\u00E9ll\u00E9rt Hill sunrise hike \u2014 20 minutes up, 360\u00B0 Danube view, then coffee at Cafe G\u00E9rbeaud before the tour coaches land. Free.' },
    ],
    seoTitle: 'Scout Budapest: Thermal Rituals & Morning Wellness',
    metaDescription: 'Budapest thermal baths, Danube morning runs and Buda hills wellness stays for UK travellers. Compare hotels and direct flights with Scout-grade neighbourhood notes.',
    scout: {
      morningRitual: 'The \u2018Gell\u00E9rt Rise.\u2019 Hike up Gell\u00E9rt Hill at 6:30 AM for a panoramic view of the Danube, then head straight down into the Gell\u00E9rt Thermal Baths as they open.',
      wellness: 'Beyond the famous baths, use Margitsziget (Margaret Island) \u2014 a 5km car-free island in the middle of the river dedicated entirely to running, swimming and outdoor fitness.',
      privacy: 'Stay on the Buda side (District I or II). It\u2019s residential, green, and feels worlds away from the \u2018ruin bar\u2019 noise of the Pest side.',
    },
  },
  {
    slug: 'lisbon',
    vibeTags: ['foodie', 'urban'],
    city: 'Lisbon',
    country: 'Portugal',
    iata: 'LIS',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg/1280px-Torre_Bel%C3%A9m_April_2009-4a.jpg',
    tagline: 'Atlantic surf sunrises, tram-line coffee rituals and seven-hill wellness walks on Europe\u2019s west edge.',
    intro:
      'Lisbon has quietly become the UK\u2019s favourite short-haul city \u2014 2h 40m flights, 20\u00B0C in February, and a wellness culture built on Atlantic surf dawns at Costa da Caparica, pastel de nata breakfasts, and the seven-hill walks that double as free stair-master sessions.',
    whyGo:
      'Direct flights from LHR, LGW, LTN, STN, MAN and EDI; no visa; the euro; and a price point that still beats Barcelona or Rome by 30%. Wellness stays along the Estoril coast are the new spa-break sweet spot.',
    bestTime:
      'April to June and September to October: 22-27\u00B0C, thin crowds, surf is clean. July-August is hot (32\u00B0C) and busy. Winter is mild (16\u00B0C) and the cheapest the city gets.',
    neighbourhoods: [
      { name: 'Alfama', blurb: 'The oldest quarter \u2014 tiled alleys, fado bars, tram 28. Best for atmosphere; worst for wheeled suitcases.' },
      { name: 'Principe Real', blurb: 'Boutique Lisbon \u2014 design hotels, concept stores, the best speciality coffee. Best for slow stays.' },
      { name: 'Belem', blurb: 'Riverside, MAAT museum, the original Pastels de Bel\u00E9m. Best for runners and families.' },
    ],
    averageNightlyPrice: 110,
    flightTimeFromLondonHours: 2.7,
    faqs: [
      { q: 'Where do locals swim?', a: 'Locals drive 20 minutes to Costa da Caparica or Carcavelos. Lisbon itself has no beach \u2014 the river is not swimmable. 90-minute train gets you to Cascais for the cleanest sand.' },
      { q: 'Is Lisbon still cheap?', a: 'Cheaper than London but not 2015 cheap \u2014 hotels average 110 GBP, a flat white is 3 GBP, a full dinner with wine 25-35 GBP. Still 30% under Barcelona.' },
      { q: 'Underrated morning ritual?', a: 'Sunrise at Miradouro da Senhora do Monte \u2014 the highest viewpoint, zero tourists before 8am, then breakfast at Dear Breakfast in Pr\u00EDncipe Real.' },
    ],
    seoTitle: 'Lisbon Scout: Coastal Wellness & Neighborhood Rituals',
    metaDescription: 'Atlantic surf, seven-hill walks and Principe Real wellness stays for UK travellers. Compare Lisbon hotels and direct flights with Scout-grade neighbourhood intel.',
  },
  {
    slug: 'baden-baden',
    vibeTags: ['spa'],
    city: 'Baden-Baden',
    country: 'Germany',
    iata: 'FKB',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Baden-Baden-Kurhaus-27-2021-gje.jpg/1280px-Baden-Baden-Kurhaus-27-2021-gje.jpg',
    tagline: 'Black Forest bathing, Belle \u00C9poque spa rituals and the elite wellness capital of Europe.',
    intro:
      'Baden-Baden is where European aristocracy came to recover for 200 years \u2014 thermal springs, Roman baths, forest trails, and Friedrichsbad, the 1877 Irish-Roman bath house where you still move through 17 textile-free stations in silence. The UK discovered it late, which is why it still feels like a secret.',
    whyGo:
      'Karlsruhe/Baden-Baden (FKB) is a 90-minute Ryanair hop from STN; the town is 20 minutes from the airport, and the Black Forest starts where the spa-garden ends. Forest bathing here is not a trend \u2014 it\u2019s prescribed.',
    bestTime:
      'May to October for the forest and outdoor spa-garden terraces; November to March is peak thermal season \u2014 snow on the pines, steam off the outdoor pool at Caracalla Therme.',
    neighbourhoods: [
      { name: 'Kurviertel (Spa Quarter)', blurb: 'Friedrichsbad, Caracalla Therme, the casino, the Kurpark. Walk everywhere; stay here for the full ritual.' },
      { name: 'Lichtental', blurb: 'Quieter southern valley \u2014 Brahms\u2019 summer house, wine taverns, direct trails into the Black Forest. Best for slow stays.' },
      { name: 'Altstadt', blurb: 'The medieval core \u2014 Stiftskirche, cobbled lanes, boutique Gasthof inns. Best on a budget.' },
    ],
    averageNightlyPrice: 145,
    flightTimeFromLondonHours: 1.7,
    faqs: [
      { q: 'Friedrichsbad or Caracalla?', a: 'Friedrichsbad for the 3-hour silent Roman ritual (textile-free, 29 EUR). Caracalla for modern outdoor/indoor thermal pools and swimwear (17 EUR). Most locals do both in one trip.' },
      { q: 'Is Baden-Baden just for older travellers?', a: 'It was \u2014 not anymore. The Roomers and Maison Messmer have pulled in a 30s-40s wellness crowd, and forest-trail running is huge on weekends.' },
      { q: 'Underrated morning ritual?', a: 'Sunrise walk up the Merkur funicular trail (4km, 500m climb) before the 9.30am spa opens. Free, empty, and ends with a view over the whole Rhine valley.' },
    ],
    seoTitle: 'Baden-Baden Scout: Forest Bathing & Elite Wellness',
    metaDescription: 'Black Forest bathing, Friedrichsbad rituals and elite spa stays two hours from London. Compare Baden-Baden hotels and Ryanair flights with Scout-grade intel.',
  },
  {
    slug: 'rome',
    vibeTags: ['foodie', 'urban'],
    city: 'Rome',
    country: 'Italy',
    iata: 'FCO',
    heroImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Villa Borghese sunrise runs, espresso rituals and 2,000-year-old bathing culture.',
    intro:
      'Rome is not a museum \u2014 it\u2019s a living wellness city, if you know where to look. Villa Borghese and Villa Pamphili are Europe\u2019s best urban running parks. The Terme di Caracalla ruins are 400 metres from a still-operating Roman-inspired thermal spa. And the espresso ritual at 7am is the oldest, fastest morning practice in Europe.',
    whyGo:
      '2h 30m flights from every UK airport, the euro, and a pricing sweet spot that beats Paris and Amsterdam. Food is still cheap (15 EUR for excellent pasta), coffee is always 1.20 EUR standing at the bar, and hotels have quietly professionalised.',
    bestTime:
      'April to June and September to October: 22-27\u00B0C, terraces open, manageable crowds. August is empty and hot (the locals leave). Winter (Dec-Feb) is the secret best time \u2014 15\u00B0C, no queues for the Vatican.',
    neighbourhoods: [
      { name: 'Centro Storico', blurb: 'The Pantheon, Navona, Campo de\u2019 Fiori \u2014 heart of the old city. Walk everywhere; stay here on your first trip.' },
      { name: 'Trastevere', blurb: 'Cobbled, trattoria-heavy, the best morning coffee culture. Loud on weekends, brilliant mid-week.' },
      { name: 'Prati', blurb: 'Quiet and elegant, a bridge from the Vatican, the best value four-star hotels. Best for slow stays with young kids.' },
    ],
    averageNightlyPrice: 135,
    flightTimeFromLondonHours: 2.7,
    faqs: [
      { q: 'How do I avoid the Vatican queue?', a: 'Book the 7.30am early-entry tour (65 EUR) or go 3.30pm on a weekday. Skip-the-line tickets still queue \u2014 the early tour is the only real bypass.' },
      { q: 'Is Rome walkable?', a: 'Yes \u2014 the centre is 2.5km across. Wear real shoes (cobbles), use trams for Trastevere, and taxi only for the airport. Metro is limited but clean.' },
      { q: 'Underrated morning ritual?', a: 'Run Villa Pamphili at 6.30am \u2014 Rome\u2019s largest park, 9km loop, zero tourists, then espresso and cornetto at Antico Forno Roscioli before the queue forms.' },
    ],
    seoTitle: 'Rome Scout Report: Ancient Rituals & Modern Vitality',
    metaDescription: 'Villa Borghese dawn runs, espresso rituals and centro storico wellness stays for UK travellers. Compare Rome hotels and direct flights with Scout-grade intel.',
  },
  {
    slug: 'porto',
    vibeTags: ['foodie'],
    city: 'Porto',
    country: 'Portugal',
    iata: 'OPO',
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Porto3flat-cc-contr-oliv1002_edit2.jpg/1920px-Porto3flat-cc-contr-oliv1002_edit2.jpg',
    tagline: 'Douro river sunrise walks, tiled-church coffee rituals and Atlantic-edge wellness stays.',
    intro:
      'Porto is Lisbon\u2019s quieter northern sibling \u2014 half the price, twice the character. The Douro river cuts the city in two, port lodges line the south bank, and the Atlantic surf at Matosinhos is 20 minutes by tram. Francesinha is the comfort food; sunrise on the Dom Lu\u00EDs bridge is the free ritual.',
    whyGo:
      '2h 20m Ryanair/EasyJet flights from STN, LGW, MAN, EDI; the euro; and a hotel market that undercuts Lisbon by 25%. Boutique stays in Cedofeita and Foz have made Porto a wellness-break contender for UK couples.',
    bestTime:
      'May to June and September to October: 20-25\u00B0C, river terraces open. July-August is warm and busy. Winter is mild but wet \u2014 the cheapest four-stars of the year.',
    neighbourhoods: [
      { name: 'Ribeira', blurb: 'UNESCO riverside \u2014 tiled facades, port cellars across the bridge, the best sunset views. Best for first-time stays.' },
      { name: 'Cedofeita', blurb: 'Art-school quarter \u2014 boutique design hotels, concept coffee, vintage shops. Best for slow 4-night stays.' },
      { name: 'Foz do Douro', blurb: 'Where the river meets the Atlantic \u2014 surf beaches, promenade, quiet boutique stays. Best for runners.' },
    ],
    averageNightlyPrice: 95,
    flightTimeFromLondonHours: 2.3,
    faqs: [
      { q: 'Lisbon or Porto for a first trip?', a: 'Porto for 3-4 nights (walkable, cheaper, more atmospheric); Lisbon for 5+ (more neighbourhoods, more day trips). Many UK travellers now do Porto for the long weekend and Lisbon as a separate trip.' },
      { q: 'Is the port tour worth it?', a: 'Only Graham\u2019s or Taylor\u2019s \u2014 the rest are forgettable. 25 EUR, 90 minutes, includes three tastings. Book the 10am slot to avoid the coach tours.' },
      { q: 'Underrated morning ritual?', a: 'Walk the Jardim do Morro before 8am for a sunrise view over the entire tiled city, then coffee and pastel at Zen\u00EDth in Cedofeita before it fills.' },
    ],
    seoTitle: 'Porto Scout: Douro River Rituals & Wellness Stays',
    metaDescription: 'Douro sunrise walks, Atlantic surf mornings and Cedofeita wellness hotels for UK travellers. Compare Porto hotels and direct flights with Scout-grade intel.',
  },
  {
    slug: 'berlin',
    vibeTags: ['urban', 'foodie'],
    city: 'Berlin',
    country: 'Germany',
    iata: 'BER',
    heroImage: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1600&q=80',
    tagline: 'Tiergarten sunrise runs, Grunewald forest rituals and the least pretentious wellness city in Europe.',
    intro:
      'Berlin\u2019s wellness culture is hiding in plain sight \u2014 a 210-hectare Tiergarten running park in the centre, Vabali (Bali-themed city spa) in Moabit, the Grunewald forest and its swim lakes on the S-Bahn, and a 24-hour coffee culture that treats mornings as seriously as nights. UK travellers still come for the clubs and miss the real city.',
    whyGo:
      '1h 50m flights from every UK airport to BER, the euro, and a hotel pricing floor that still sits 40% below Paris. Mitte, Prenzlauer Berg and Kreuzberg all walk in different directions from one another \u2014 pick one and go deep.',
    bestTime:
      'May to September: 20-26\u00B0C, lake swimming open, beer gardens running. Winter is cold (0\u00B0C, dark by 4pm) but Christmas markets and Vabali make it the wellness sweet spot.',
    neighbourhoods: [
      { name: 'Mitte', blurb: 'The centre \u2014 Museum Island, Brandenburg Gate, five-star hotels. Best for first-time trips; quietest at night.' },
      { name: 'Prenzlauer Berg', blurb: 'Leafy, pram-heavy, the best coffee in the city, Mauerpark flea market on Sundays. Best for slow stays.' },
      { name: 'Kreuzberg', blurb: 'The cultural engine \u2014 Turkish markets, canals, the Berghain scene. Noisiest, most alive; best for 3-night city breaks.' },
    ],
    averageNightlyPrice: 105,
    flightTimeFromLondonHours: 1.8,
    faqs: [
      { q: 'Is Berlin still cheap?', a: 'Cheaper than London but catching up \u2014 hotels average 105 GBP, a flat white is 4 EUR, a D\u00F6ner is 7 EUR, a club entry 20 EUR. Far cheaper than Paris or Amsterdam.' },
      { q: 'Do I need to speak German?', a: 'No \u2014 English is universal in Mitte, Prenzlauer Berg, Kreuzberg and Friedrichshain. Older staff in traditional Kneipen may not, but menus are bilingual.' },
      { q: 'Underrated morning ritual?', a: 'Tiergarten lap at 7am (6km, empty, flat), then coffee at Bonanza in Kreuzberg and a cold plunge in Schlachtensee if it\u2019s summer. The real Berlin happens before 10am.' },
    ],
    seoTitle: 'Berlin Scout: Urban Vitality & Hidden Forest Rituals',
    metaDescription: 'Tiergarten dawn runs, Grunewald forest swims and Vabali wellness stays for UK travellers. Compare Berlin hotels and direct flights with Scout-grade intel.',
  },
];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find(d => d.slug === slug);
}

/**
 * Resolve ordered vibe tags for a city name as typed into the hotel search
 * box (e.g. "London", "Dubai", "Lisbon"). Matching is case-insensitive against
 * Destination.city and Destination.slug.
 *
 * Precedence:
 *   1. Destination's own `vibeTags` (hand-picked editorial)
 *   2. Country-level fallback via `vibesForCountry`
 *   3. Empty array — Silent Scout falls back to its generic default
 *
 * Safe to call with any string; unknown cities return [] and Silent Scout
 * gracefully picks 'food' as the neutral default.
 */
export function vibeTagsForSearchedCity(searchedDest: string | null | undefined): VibeTag[] {
  if (!searchedDest) return [];
  const needle = searchedDest.trim().toLowerCase();
  if (!needle) return [];

  const match = DESTINATIONS.find(
    d => d.city.toLowerCase() === needle || d.slug === needle
  );
  if (!match) return [];
  if (match.vibeTags && match.vibeTags.length > 0) return match.vibeTags;
  return vibesForCountry(match.country);
}
