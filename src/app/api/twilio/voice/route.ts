import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { listBookings, type Booking } from '@/lib/bookings';

/**
 * Twilio Voice IVR — JetMeAway Helpline
 *
 * Flow:
 * 1. Language select (English / Urdu)
 * 2. Department menu
 * 3. Enter booking reference
 * 4. Read back booking details
 * 5. Problem category
 * 6. Automated resolution message
 * 7. Satisfaction check
 * 8. Only then → forward to agent (last resort)
 *
 * Twilio sends POST to this URL. We return TwiML XML.
 */

const FORWARD_NUMBER = process.env.TWILIO_FORWARD_NUMBER || '';

/* Hold music — Twilio-hosted S3 clip that we loop between dial attempts.
   Used anywhere we want to keep the caller entertained while waiting. */
const HOLD_MUSIC_URL = 'http://com.twilio.music.soft-rock.s3.amazonaws.com/Strehlow_-_Holding_Pattern.mp3';

/* Max times we'll try to reach an agent before giving up and playing
   the fallback "no agent available" message. */
const MAX_DIAL_ATTEMPTS = 5;

/* How long each individual dial attempt rings before Twilio gives up.
   5 attempts × 15 seconds = ~75 seconds max wait per caller. */
const DIAL_TIMEOUT_SECONDS = 15;

/* ── Messages ─────────────────────────────────────────────────────────── */

const MSG = {
  en: {
    welcome: 'Thank you for calling JetMeAway, the United Kingdom\'s smartest travel comparison engine. Our customer care team is available 24 hours a day, 7 days a week, supporting travellers across more than 150 destinations worldwide. Please note, this support line is reserved for customers with an active JetMeAway booking. To speak with our team, please have your booking reference or confirmation number ready — this can be found at the top of your confirmation email. If you have a general enquiry, or do not yet have a booking with us, please hang up and email contact at jetmeaway dot co dot uk, and our team will respond within 24 hours.',
    langSelect: 'For English, press 1. Urdu ke liye, 2 dabayein.',
    dept: 'Please select from the following options. Press 1 for hotel bookings. Press 2 for flight enquiries. Press 3 for car hire. Press 4 for holiday packages. Press 5 for insurance or e-sim. Press 6 for general enquiry.',
    enterRef: 'Please say or type your booking reference now. For example, J, M, A, 2, 0, 2, 6, E, P, 3, N, K, V. If you are typing it on the keypad, press hash when finished. If you do not have a reference, press hash now.',
    noRef: 'No worries. Please note, you can find your booking reference in your confirmation email.',
    bookingFound: 'We found your booking.',
    bookingNotFound: 'Sorry, we could not find a booking with that reference. Please check and try again, or press hash to continue without a reference.',
    problem: 'How can we help you today? Press 1 for check-in or check-out issues. Press 2 for cancellation request. Press 3 for refund query. Press 4 for amendment or room change. Press 5 for payment issues. Press 6 for something else.',
    checkin: 'For check-in and check-out queries, please contact your hotel directly using the details in your confirmation email. The hotel front desk will be able to assist you with early check-in, late check-out, or any room related concerns.',
    cancel: 'To request a cancellation, please email contact at jetmeaway dot co dot uk with your booking reference number. Our cancellation policy allows free cancellation up to 48 hours before check-in for most bookings. You will receive a confirmation email within 24 hours.',
    refund: 'Refund requests are processed within 5 to 10 business days after cancellation is confirmed. If your cancellation has already been confirmed and you have not received your refund, please email contact at jetmeaway dot co dot uk with your booking reference and we will investigate.',
    amendment: 'To amend your booking, including date changes, room upgrades, or guest name changes, please email contact at jetmeaway dot co dot uk with your booking reference and the changes you would like to make. We will confirm availability and any price difference within 24 hours.',
    payment: 'For payment issues, please check your bank statement for a charge from Nuitee Travel or JetMeAway. If you have been double charged or see an unexpected payment, please email contact at jetmeaway dot co dot uk with your booking reference and a screenshot of the charge. We will resolve this within 48 hours.',
    other: 'For all other enquiries, please visit our website at jetmeaway dot co dot uk slash contact, or email us at contact at jetmeaway dot co dot uk. Our team typically responds within 24 hours.',
    resolved: 'We hope this has been helpful. Has your query been resolved? Press 1 for yes. Press 2 if you still need assistance.',
    noAgentWithoutRef: 'We are unable to connect your call to an agent because this support line is reserved exclusively for customers with an active booking. A valid booking reference or confirmation number is required to speak with our team, and it can be found in your confirmation email. For all other enquiries, please email contact at jetmeaway dot co dot uk or visit jetmeaway dot co dot uk slash contact and we will respond within 24 hours.',
    thankyou: 'Thank you for calling JetMeAway. We appreciate your business and wish you a wonderful trip. Goodbye.',
    holdMsg: 'Please hold while we connect you to the next available agent. Please note, this call may be recorded for quality and training purposes.',
    holdMusic: 'Thank you for your patience. An agent will be with you shortly.',
    tryingAgent: 'We are still trying to connect you to an agent. Please continue to hold.',
    sorry: 'We are sorry we could not resolve your query today. Let us connect you to a member of our team.',
    closed: 'Unfortunately, no agent is available to take your call right now. Please email contact at jetmeaway dot co dot uk or visit jetmeaway dot co dot uk slash contact with your booking reference, and our team will respond within 24 hours. Thank you for calling JetMeAway.',
    flightDept: 'For flight enquiries, JetMeAway compares prices across multiple airlines and booking platforms. We do not book flights directly. To find the best flight deals, please visit jetmeaway dot co dot uk slash flights. If you booked a flight through one of our partner links, please contact the airline or booking platform directly for changes or cancellations.',
    carDept: 'For car hire enquiries, please visit jetmeaway dot co dot uk slash cars to compare prices across our partner providers. If you have an existing car hire booking, please contact the rental company directly using the details in your confirmation email.',
    packageDept: 'For holiday package enquiries, please visit jetmeaway dot co dot uk slash packages to compare deals from Expedia, Trip dot com, and other providers. If you booked a package through one of our partner links, please contact the provider directly for any changes.',
    insuranceDept: 'For travel insurance or e-sim enquiries, please visit jetmeaway dot co dot uk. If you purchased insurance or an e-sim through one of our partner links, please contact the provider directly using the details in your confirmation email.',
  },
  ur: {
    welcome: 'JetMeAway mein call karne ka shukriya. Hum United Kingdom ki smartest travel comparison engine hain. Hamari customer care team 24 ghante, haftay ke saaton din available hai, aur 150 se zyada manzilon par travellers ki madad karti hai. Baraye meherbani note karein, yeh support line sirf un customers ke liye hai jin ki JetMeAway ke saath active booking hai. Hamari team se baat karne ke liye, apna booking reference ya confirmation number taiyaar rakhein — yeh aap ki confirmation email ke shuru mein mojood hai. Agar aam sawal hai, ya abhi koi booking nahi ki, toh baraye meherbani call band karein aur contact at jetmeaway dot co dot uk par email karein — hum 24 ghanton mein jawab denge.',
    langSelect: 'For English, press 1. Urdu ke liye, 2 dabayein.',
    dept: 'Baraye meherbani apna option chunein. Hotel booking ke liye 1 dabayein. Flight ke liye 2 dabayein. Car hire ke liye 3 dabayein. Holiday packages ke liye 4 dabayein. Insurance ya e-sim ke liye 5 dabayein. Aam sawal ke liye 6 dabayein.',
    enterRef: 'Baraye meherbani abhi apna booking reference bol kar batayein ya keypad se darj karein. Misaal ke taur par, J, M, A, 2, 0, 2, 6, E, P, 3, N, K, V. Agar keypad se type kar rahe hain, toh hash dabayein. Agar reference nahi hai, toh abhi hash dabayein.',
    noRef: 'Koi baat nahi. Aap ka booking reference aap ki confirmation email mein mojood hai.',
    bookingFound: 'Humne aap ki booking dhundh li hai.',
    bookingNotFound: 'Maaf kijiye, is reference se koi booking nahi mili. Baraye meherbani dobara check karein, ya hash dabayein.',
    problem: 'Hum aap ki kaise madad kar sakte hain? Check-in ya check-out ke liye 1 dabayein. Cancellation ke liye 2 dabayein. Refund ke liye 3 dabayein. Booking mein tabdeeli ke liye 4 dabayein. Payment masle ke liye 5 dabayein. Kuch aur ke liye 6 dabayein.',
    checkin: 'Check-in aur check-out ke sawalaat ke liye, baraye meherbani apne hotel se seedha rabta karein. Hotel ki contact details aap ki confirmation email mein hain.',
    cancel: 'Cancellation ke liye, baraye meherbani apna booking reference email karein contact at jetmeaway dot co dot uk par. Aksar bookings check-in se 48 ghante pehle muft cancel ho sakti hain. Aap ko 24 ghanton mein jawab milega.',
    refund: 'Refund cancellation confirm hone ke 5 se 10 kaam ke dinon mein process hota hai. Agar aap ka refund nahi aaya, toh baraye meherbani email karein contact at jetmeaway dot co dot uk par.',
    amendment: 'Booking mein tabdeeli ke liye, baraye meherbani email karein contact at jetmeaway dot co dot uk par apna booking reference aur jo tabdeeliyaan chahiye woh bhi likhein. 24 ghanton mein jawab milega.',
    payment: 'Payment maslon ke liye, apne bank statement mein Nuitee Travel ya JetMeAway ka charge check karein. Agar double charge hua hai toh email karein contact at jetmeaway dot co dot uk par. 48 ghanton mein hal ho jayega.',
    other: 'Baqi tamam sawalaat ke liye, jetmeaway dot co dot uk slash contact par jayein ya email karein contact at jetmeaway dot co dot uk par.',
    resolved: 'Kya aap ka masla hal ho gaya? Haan ke liye 1 dabayein. Agar abhi bhi madad chahiye toh 2 dabayein.',
    noAgentWithoutRef: 'Hum aap ki call agent se connect nahi kar sakte kyunke yeh support line sirf un customers ke liye hai jin ki active booking hai. Hamari team se baat karne ke liye booking reference ya confirmation number lazmi hai, jo aap ki confirmation email mein mojood hai. Baqi tamam sawalaat ke liye, baraye meherbani contact at jetmeaway dot co dot uk par email karein ya jetmeaway dot co dot uk slash contact par jayein. Hum 24 ghanton mein jawab denge.',
    thankyou: 'JetMeAway mein call karne ka shukriya. Aap ka safar khush-gawaar ho. Khuda Hafiz.',
    holdMsg: 'Baraye meherbani hold karein, hum aap ko agent se connect kar rahe hain. Yeh call quality aur training ke liye record ho sakti hai.',
    holdMusic: 'Shukriya aap ke sabr ka. Agent jald aap se baat karega.',
    tryingAgent: 'Hum abhi bhi aap ko agent se connect karne ki koshish kar rahe hain. Baraye meherbani hold karein.',
    sorry: 'Maaf kijiye hum aap ka masla hal nahi kar sake. Hum aap ko team ke ek member se connect kar rahe hain.',
    closed: 'Maazrat, abhi koi agent aap ki call lene ke liye mojood nahi hai. Baraye meherbani contact at jetmeaway dot co dot uk par email karein ya jetmeaway dot co dot uk slash contact par jayein, apni booking reference ke saath. Hamari team 24 ghanton mein jawab degi. JetMeAway mein call karne ka shukriya.',
    flightDept: 'Flight ke sawalaat ke liye, JetMeAway multiple airlines se prices compare karta hai. Hum seedha flights book nahi karte. Behterein deals ke liye jetmeaway dot co dot uk slash flights par jayein.',
    carDept: 'Car hire ke sawalaat ke liye, jetmeaway dot co dot uk slash cars par jayein. Agar aap ne car book ki hai toh rental company se seedha rabta karein.',
    packageDept: 'Holiday package ke sawalaat ke liye, jetmeaway dot co dot uk slash packages par jayein. Agar aap ne kisi partner se book kiya hai toh un se seedha rabta karein.',
    insuranceDept: 'Insurance ya e-sim ke sawalaat ke liye, jetmeaway dot co dot uk par jayein. Provider se seedha rabta karein.',
  },
};

type Lang = 'en' | 'ur';

/* ── TwiML Helpers ────────────────────────────────────────────────────── */

function twiml(body: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

function say(text: string, lang: Lang = 'en') {
  const voice = lang === 'ur' ? 'Polly.Aditi' : 'Polly.Amy';
  const language = lang === 'ur' ? 'hi-IN' : 'en-GB';
  return `<Say voice="${voice}" language="${language}">${escXml(text)}</Say>`;
}

function gather(action: string, opts: { numDigits?: number; finishOnKey?: string; timeout?: number; speech?: boolean; speechTimeout?: number | 'auto' } = {}) {
  const nd = opts.numDigits ? ` numDigits="${opts.numDigits}"` : '';
  const fk = opts.finishOnKey !== undefined ? ` finishOnKey="${opts.finishOnKey}"` : '';
  const to = ` timeout="${opts.timeout || 5}"`;
  const input = opts.speech ? 'speech dtmf' : 'dtmf';
  // speechTimeout="auto" tells Twilio to end the speech recognition when the
  // caller stops talking — perfect for booking refs of unknown length.
  const st = opts.speech ? ` speechTimeout="${opts.speechTimeout ?? 'auto'}"` : '';
  // 'numbers_and_commands' model is more accurate for short alphanumerics
  // than the default 'phone_call' general-purpose model.
  const model = opts.speech ? ` speechModel="numbers_and_commands"` : '';
  return { open: `<Gather action="${escXml(action)}"${nd}${fk}${to}${st}${model} input="${input}">`, close: '</Gather>' };
}

function escXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pause(seconds = 1) {
  return `<Pause length="${seconds}"/>`;
}

/* ── Step Handlers ────────────────────────────────────────────────────── */

function step1Welcome() {
  const g = gather('/api/twilio/voice?step=lang', { numDigits: 1, timeout: 8 });
  return twiml(
    say(MSG.en.welcome, 'en') +
    pause(1) +
    g.open +
    say(MSG.en.langSelect, 'en') +
    g.close +
    `<Redirect>/api/twilio/voice?step=lang&amp;timeout=1</Redirect>`
  );
}

function step2Dept(lang: Lang) {
  const m = MSG[lang];
  const g = gather(`/api/twilio/voice?step=dept&lang=${lang}`, { numDigits: 1, timeout: 8 });
  return twiml(
    g.open +
    say(m.dept, lang) +
    g.close +
    say(m.dept, lang) +
    `<Redirect>/api/twilio/voice?step=start&amp;lang=${lang}</Redirect>`
  );
}

function step3EnterRef(lang: Lang, dept: string) {
  const m = MSG[lang];
  // Accept BOTH keypad and speech. Callers with letter-containing refs
  // (e.g. JMA-2026-ABC123) can't type letters on a phone keypad, so we
  // let them speak the reference instead.
  const g = gather(`/api/twilio/voice?step=ref&lang=${lang}&dept=${dept}`, {
    finishOnKey: '#',
    timeout: 10,
    speech: true,
    speechTimeout: 'auto',
  });
  return twiml(
    g.open +
    say(m.enterRef, lang) +
    g.close +
    `<Redirect>/api/twilio/voice?step=noref&amp;lang=${lang}&amp;dept=${dept}</Redirect>`
  );
}

function stepNonHotelDept(lang: Lang, dept: string) {
  const m = MSG[lang];
  let msg = m.other;
  if (dept === '2') msg = m.flightDept;
  else if (dept === '3') msg = m.carDept;
  else if (dept === '4') msg = m.packageDept;
  else if (dept === '5') msg = m.insuranceDept;

  // Non-hotel depts never forward to agent — info only
  return twiml(
    say(msg, lang) +
    pause(1) +
    say(m.thankyou, lang) +
    '<Hangup/>'
  );
}

/** Speak each character one at a time so the caller can confirm what was
 *  entered or recognised. "JMA2026ABC" becomes "J. M. A. 2. 0. 2. 6. A. B. C."
 *  — Twilio's TTS naturally pauses at full stops. */
function spellDigits(input: string): string {
  return input.split('').join('. ') + '.';
}

/** Normalise a spoken or typed booking reference into a canonical form we
 *  can look up. Strips whitespace, punctuation and common spoken fillers
 *  ("jay em ay" → "JMA", etc), uppercases everything, and returns both
 *  the raw alphanumeric string and a hyphenated JMA-YYYY-CODE guess. */
function normaliseSpokenRef(raw: string): { alnum: string; shaped: string | null } {
  if (!raw) return { alnum: '', shaped: null };
  // Expand common phonetic spellings Twilio sometimes returns.
  const phoneticMap: Record<string, string> = {
    'jay': 'J', 'em': 'M', 'en': 'N', 'bee': 'B', 'see': 'C', 'dee': 'D',
    'eff': 'F', 'gee': 'G', 'aitch': 'H', 'jay.': 'J', 'kay': 'K', 'ell': 'L',
    'oh': '0', 'ohh': '0', 'zero': '0', 'one': '1', 'two': '2', 'three': '3',
    'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ay': 'A', 'ey': 'A', 'bi': 'B', 'si': 'C', 'ar': 'R', 'ess': 'S',
    'tee': 'T', 'you': 'U', 'vee': 'V', 'double-you': 'W', 'ex': 'X',
    'why': 'Y', 'wye': 'Y', 'zed': 'Z', 'zee': 'Z',
  };
  const expanded = raw
    .toLowerCase()
    .split(/[\s,.\-_/]+/)
    .map(tok => phoneticMap[tok] ?? tok)
    .join('');
  const alnum = expanded.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Try to shape into JMA-YYYY-CODE.
  const match = alnum.match(/^JMA(\d{4})([A-Z0-9]+)$/);
  const shaped = match ? `JMA-${match[1]}-${match[2]}` : null;
  return { alnum, shaped };
}

async function stepLookupRef(lang: Lang, dept: string, digits: string) {
  const m = MSG[lang];

  const { alnum, shaped } = normaliseSpokenRef(digits);
  const lookupKey = alnum || digits;

  // Try multiple KV key shapes so the same prompt works for hotel, flight
  // and any future booking types. First match wins.
  const currentYear = new Date().getFullYear();
  const candidateRefs = [
    shaped,                                 // JMA-2026-ABC123 (shaped from speech)
    `JMA-H-${lookupKey}`,                   // hotel (historical)
    `JMA-${lookupKey}`,                     // generic
    `JMA-${currentYear}-${lookupKey}`,      // flight (current-year)
    `JMA-${currentYear - 1}-${lookupKey}`,  // flight (last-year, edge case Jan)
    alnum && alnum.startsWith('JMA') ? alnum.replace(/^JMA/, 'JMA-').replace(/-(\d{4})/, '-$1-') : null,
  ].filter((x): x is string => !!x);

  let record: any = null;
  let ref = candidateRefs[0];

  // 1. Primary: scan the unified bookings store. This is where every real
  //    booking (hotel via LiteAPI, flight via Duffel, etc.) is mirrored,
  //    keyed by both our canonical id (JMA-2026-0001) and the supplier's
  //    own reference (e.g. Duffel "KCJ52B4", LiteAPI booking id). The IVR
  //    used to skip this and only check the legacy `pending-booking:*`
  //    keys, which is why callers reading their real confirmation number
  //    were told "we could not find a booking with that reference".
  try {
    const all = await listBookings();
    // Build probe set: alnum (hyphen-stripped), shaped (JMA-YYYY-CODE), and
    // the original digits. We compare against both the booking's canonical
    // id and its supplier reference, each stripped to alphanumerics so
    // "JMA-2026-0001" spoken as one string matches "JMA20260001".
    const stripAlnum = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const probes = [alnum, lookupKey, shaped ? stripAlnum(shaped) : null, stripAlnum(digits)]
      .filter((x): x is string => !!x);
    const match = all.find((b: Booking) => {
      const id = stripAlnum(b.id || '');
      const sup = stripAlnum(b.supplierRef || '');
      return probes.some(p => p === id || p === sup);
    });
    if (match) {
      record = {
        hotelName: match.type === 'hotel' ? match.title : null,
        airline: match.type === 'flight' ? match.title : null,
        destination: match.destination,
        checkin: match.checkIn,
        checkout: match.checkOut,
        guests: match.guests,
        totalPrice: (match.totalPence / 100).toFixed(2),
        state: match.status,
      };
      ref = match.id;
    }
  } catch { /* fall through to legacy */ }

  // 2. Legacy fallback: pending-booking:* keys (pre-unified-store bookings).
  if (!record) {
    for (const candidate of candidateRefs) {
      try {
        const r = await kv.get<any>(`pending-booking:${candidate}`);
        if (r) {
          record = r;
          ref = candidate;
          break;
        }
      } catch { /* try next */ }
    }
  }

  let bookingInfo = '';
  if (record) {
    if (lang === 'en') {
      bookingInfo = `Your booking reference is ${ref}. ` +
        (record.hotelName ? `Hotel: ${record.hotelName}. ` : '') +
        (record.destination ? `Destination: ${record.destination}. ` : '') +
        (record.airline ? `Airline: ${record.airline}. ` : '') +
        (record.checkin ? `Check-in date: ${record.checkin}. ` : '') +
        (record.checkout ? `Check-out date: ${record.checkout}. ` : '') +
        (record.departureDate ? `Departure date: ${record.departureDate}. ` : '') +
        (record.returnDate ? `Return date: ${record.returnDate}. ` : '') +
        (record.guests ? `Number of guests: ${record.guests}. ` : '') +
        (record.passengers ? `Number of passengers: ${record.passengers}. ` : '') +
        (record.totalPrice ? `Total amount: ${record.totalPrice} pounds. ` : '') +
        `Booking status: ${record.state || 'pending'}.`;
    } else {
      bookingInfo = `Aap ka booking reference hai ${ref}. ` +
        (record.hotelName ? `Hotel: ${record.hotelName}. ` : '') +
        (record.destination ? `Manzil: ${record.destination}. ` : '') +
        (record.airline ? `Airline: ${record.airline}. ` : '') +
        (record.checkin ? `Check-in: ${record.checkin}. ` : '') +
        (record.checkout ? `Check-out: ${record.checkout}. ` : '') +
        (record.departureDate ? `Rawangi: ${record.departureDate}. ` : '') +
        (record.returnDate ? `Wapsi: ${record.returnDate}. ` : '') +
        (record.guests ? `Mehmaan: ${record.guests}. ` : '') +
        (record.passengers ? `Musafir: ${record.passengers}. ` : '') +
        (record.totalPrice ? `Kul raqam: ${record.totalPrice} pounds. ` : '') +
        `Booking ki halat: ${record.state || 'pending'}.`;
    }
  }

  // Always read what we received back to the caller so they can confirm,
  // whether we matched a booking or not. Prefer the normalised alphanumeric
  // form (works for both spoken "jay em ay two oh two six" and typed digits).
  const spokenBack = alnum || digits;
  const readBack = lang === 'en'
    ? `I heard ${spellDigits(spokenBack)}`
    : `Mujhe sunai diya ${spellDigits(spokenBack)}`;

  if (bookingInfo) {
    const g = gather(`/api/twilio/voice?step=problem&lang=${lang}&dept=${dept}&ref=${digits}`, { numDigits: 1, timeout: 8 });
    return twiml(
      say(readBack, lang) +
      pause(1) +
      say(m.bookingFound, lang) +
      pause(1) +
      say(bookingInfo, lang) +
      pause(1) +
      g.open +
      say(m.problem, lang) +
      g.close +
      say(m.problem, lang) +
      `<Redirect>/api/twilio/voice?step=problem&amp;lang=${lang}&amp;dept=${dept}&amp;ref=${digits}</Redirect>`
    );
  }

  // Booking not found — read digits back then let caller try again or continue
  const g = gather(`/api/twilio/voice?step=ref&lang=${lang}&dept=${dept}`, { finishOnKey: '#', timeout: 10 });
  return twiml(
    say(readBack, lang) +
    pause(1) +
    say(m.bookingNotFound, lang) +
    pause(1) +
    g.open +
    say(m.enterRef, lang) +
    g.close +
    `<Redirect>/api/twilio/voice?step=noref&amp;lang=${lang}&amp;dept=${dept}</Redirect>`
  );
}

function stepNoRef(lang: Lang, dept: string) {
  const m = MSG[lang];
  const g = gather(`/api/twilio/voice?step=problem&lang=${lang}&dept=${dept}&ref=none`, { numDigits: 1, timeout: 8 });
  return twiml(
    say(m.noRef, lang) +
    pause(1) +
    g.open +
    say(m.problem, lang) +
    g.close +
    say(m.problem, lang) +
    `<Redirect>/api/twilio/voice?step=problem&amp;lang=${lang}&amp;dept=${dept}&amp;ref=none</Redirect>`
  );
}

function stepProblemResponse(lang: Lang, problem: string, ref: string) {
  const m = MSG[lang];
  let response = m.other;
  if (problem === '1') response = m.checkin;
  else if (problem === '2') response = m.cancel;
  else if (problem === '3') response = m.refund;
  else if (problem === '4') response = m.amendment;
  else if (problem === '5') response = m.payment;
  else if (problem === '6') response = m.other;

  const g = gather(`/api/twilio/voice?step=resolved&lang=${lang}&ref=${ref}`, { numDigits: 1, timeout: 8 });
  return twiml(
    say(response, lang) +
    pause(2) +
    g.open +
    say(m.resolved, lang) +
    g.close +
    say(m.thankyou, lang) +
    '<Hangup/>'
  );
}

function stepResolved(lang: Lang, digit: string, ref: string) {
  const m = MSG[lang];

  if (digit === '1') {
    // Resolved — thank you and hang up
    return twiml(say(m.thankyou, lang) + '<Hangup/>');
  }

  // Not resolved — only forward if they have a valid booking reference
  const hasValidRef = ref && ref !== 'none' && ref !== '';
  if (hasValidRef && FORWARD_NUMBER) {
    // Kick off the first of MAX_DIAL_ATTEMPTS tries.
    return stepDialAgent(lang, ref, 1);
  }

  // No valid ref — tell them they need a reference to speak to an agent
  return twiml(
    say(m.noAgentWithoutRef, lang) +
    pause(1) +
    say(m.thankyou, lang) +
    '<Hangup/>'
  );
}

/* ── Dial-with-retry flow ─────────────────────────────────────────────
   Twilio's <Dial> verb rings the forwarded number once per TwiML
   response. To "retry" the agent, we have to return fresh TwiML each
   time. The trick: <Dial action="..."> tells Twilio to POST back to
   us after the dial finishes, with a DialCallStatus parameter telling
   us whether it was answered (completed) or not (no-answer/busy/failed).

   We chain up to MAX_DIAL_ATTEMPTS of these, playing hold music
   between attempts so the caller hears something other than silence.
   After all attempts fail, we play the fallback "no agent" message
   and hang up. */
function stepDialAgent(lang: Lang, ref: string, attempt: number) {
  const m = MSG[lang];
  const actionUrl = `/api/twilio/voice?step=dial-result&lang=${lang}&ref=${ref}&attempt=${attempt}`;

  // Attempt 1: full apology + hold preamble + music clip (caller hears
  // something meaningful before the first ring). <Play> plays the full
  // audio file to completion, so we only include it on the first attempt
  // to keep subsequent retry cycles short (~20s each instead of minutes).
  //
  // Attempts 2-5: just "still trying" + the dial ring tone. This keeps
  // the total retry window bounded to ~1-2 minutes maximum.
  const preamble = attempt === 1
    ? say(m.sorry, lang) +
      pause(1) +
      say(m.holdMsg, lang) +
      `<Play>${HOLD_MUSIC_URL}</Play>` +
      say(m.holdMusic, lang)
    : say(m.tryingAgent, lang);

  return twiml(
    preamble +
    `<Dial timeout="${DIAL_TIMEOUT_SECONDS}" action="${escXml(actionUrl)}" callerId="${escXml(process.env.TWILIO_FROM || '')}">${escXml(FORWARD_NUMBER)}</Dial>`
  );
}

function stepDialResult(lang: Lang, ref: string, attempt: number, dialStatus: string) {
  const m = MSG[lang];

  // 'completed' means the dialed party answered and the call has ended
  // naturally. Nothing more to do.
  if (dialStatus === 'completed') {
    return twiml('<Hangup/>');
  }

  // Not connected (no-answer / busy / failed / canceled).
  // Retry if we haven't hit the max.
  if (attempt < MAX_DIAL_ATTEMPTS) {
    return stepDialAgent(lang, ref, attempt + 1);
  }

  // All attempts exhausted — play fallback and hang up.
  return twiml(
    say(m.closed, lang) +
    pause(1) +
    say(m.thankyou, lang) +
    '<Hangup/>'
  );
}

function stepClosed(lang: Lang) {
  const m = MSG[lang];
  return twiml(say(m.closed, lang) + '<Hangup/>');
}

/* ── Main Handler ─────────────────────────────────────────────────────── */
/* Note: IVR runs 24/7. The 'closed' message is only used as a fallback if
   no agent is available when forwarding a call, not as a business-hours
   gate. Previously the IVR was gated to Mon-Sat 9am-8pm UK time. */

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const step = url.searchParams.get('step') || 'start';
  const lang = (url.searchParams.get('lang') || 'en') as Lang;
  const dept = url.searchParams.get('dept') || '1';
  const ref = url.searchParams.get('ref') || '';

  // Parse Twilio form body
  const body = await req.text();
  const params = new URLSearchParams(body);
  // Prefer spoken input when present — SpeechResult is only set when the
  // caller actually spoke. Otherwise fall back to DTMF digits.
  const speech = params.get('SpeechResult') || '';
  const digits = speech.trim() || params.get('Digits') || '';

  switch (step) {
    case 'start':
      return step1Welcome();

    case 'lang': {
      const timeout = url.searchParams.get('timeout');
      if (timeout) return step2Dept('en'); // Default to English on timeout
      const selectedLang: Lang = digits === '2' ? 'ur' : 'en';
      // 24/7 — no business hours gate. Proceed straight to department menu.
      return step2Dept(selectedLang);
    }

    case 'dept':
      // Hotel (1) and flight (2) both go through the full flow — enter
      // booking reference, read it back, look up, route to problem menu.
      if (digits === '1' || digits === '2') return step3EnterRef(lang, digits);
      return stepNonHotelDept(lang, digits || '6');

    case 'ref':
      if (!digits || digits === '') return stepNoRef(lang, dept);
      return stepLookupRef(lang, dept, digits);

    case 'noref':
      return stepNoRef(lang, dept);

    case 'problem':
      return stepProblemResponse(lang, digits || '6', ref);

    case 'resolved':
      return stepResolved(lang, digits || '1', ref);

    case 'dial-result': {
      // Twilio POSTs here after each <Dial> finishes. The body includes
      // DialCallStatus (completed / no-answer / busy / failed / canceled).
      const attempt = parseInt(url.searchParams.get('attempt') || '1', 10);
      const dialStatus = params.get('DialCallStatus') || '';
      return stepDialResult(lang, ref, attempt, dialStatus);
    }

    default:
      return step1Welcome();
  }
}

// Twilio may also send GET requests for initial webhook
export async function GET(req: NextRequest) {
  return POST(req);
}
