import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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

/* ── Messages ─────────────────────────────────────────────────────────── */

const MSG = {
  en: {
    welcome: 'Thank you for calling JetMeAway, your trusted travel comparison engine. Your call is important to us.',
    langSelect: 'For English, press 1. Urdu ke liye, 2 dabayein.',
    dept: 'Please select from the following options. Press 1 for hotel bookings. Press 2 for flight enquiries. Press 3 for car hire. Press 4 for holiday packages. Press 5 for insurance or e-sim. Press 6 for general enquiry.',
    enterRef: 'Please enter your booking reference number using your keypad, followed by the hash key. If you do not have a reference number, press hash.',
    noRef: 'No worries. Please note, you can find your booking reference in your confirmation email.',
    bookingFound: 'We found your booking.',
    bookingNotFound: 'Sorry, we could not find a booking with that reference. Please check and try again, or press hash to continue without a reference.',
    problem: 'How can we help you today? Press 1 for check-in or check-out issues. Press 2 for cancellation request. Press 3 for refund query. Press 4 for amendment or room change. Press 5 for payment issues. Press 6 for something else.',
    checkin: 'For check-in and check-out queries, please contact your hotel directly using the details in your confirmation email. The hotel front desk will be able to assist you with early check-in, late check-out, or any room related concerns.',
    cancel: 'To request a cancellation, please email waqar at jetmeaway dot co dot uk with your booking reference number. Our cancellation policy allows free cancellation up to 48 hours before check-in for most bookings. You will receive a confirmation email within 24 hours.',
    refund: 'Refund requests are processed within 5 to 10 business days after cancellation is confirmed. If your cancellation has already been confirmed and you have not received your refund, please email waqar at jetmeaway dot co dot uk with your booking reference and we will investigate.',
    amendment: 'To amend your booking, including date changes, room upgrades, or guest name changes, please email waqar at jetmeaway dot co dot uk with your booking reference and the changes you would like to make. We will confirm availability and any price difference within 24 hours.',
    payment: 'For payment issues, please check your bank statement for a charge from Nuitee Travel or JetMeAway. If you have been double charged or see an unexpected payment, please email waqar at jetmeaway dot co dot uk with your booking reference and a screenshot of the charge. We will resolve this within 48 hours.',
    other: 'For all other enquiries, please visit our website at jetmeaway dot co dot uk slash contact, or email us at waqar at jetmeaway dot co dot uk. Our team typically responds within 24 hours.',
    resolved: 'We hope this has been helpful. Has your query been resolved? Press 1 for yes. Press 2 if you still need assistance.',
    thankyou: 'Thank you for calling JetMeAway. We appreciate your business and wish you a wonderful trip. Goodbye.',
    holdMsg: 'Please hold while we connect you to the next available agent. Your estimated wait time is 2 to 3 minutes. Please note, this call may be recorded for quality and training purposes.',
    holdMusic: 'Thank you for your patience. An agent will be with you shortly.',
    sorry: 'We are sorry we could not resolve your query today. Let us connect you to a member of our team.',
    closed: 'Our phone lines are open Monday to Saturday, 9 ay em to 8 pee em. You have reached us outside of business hours. Please email waqar at jetmeaway dot co dot uk or visit jetmeaway dot co dot uk slash contact and we will get back to you within 24 hours. Thank you for calling JetMeAway.',
    flightDept: 'For flight enquiries, JetMeAway compares prices across multiple airlines and booking platforms. We do not book flights directly. To find the best flight deals, please visit jetmeaway dot co dot uk slash flights. If you booked a flight through one of our partner links, please contact the airline or booking platform directly for changes or cancellations.',
    carDept: 'For car hire enquiries, please visit jetmeaway dot co dot uk slash cars to compare prices across our partner providers. If you have an existing car hire booking, please contact the rental company directly using the details in your confirmation email.',
    packageDept: 'For holiday package enquiries, please visit jetmeaway dot co dot uk slash packages to compare deals from Expedia, Trip dot com, and other providers. If you booked a package through one of our partner links, please contact the provider directly for any changes.',
    insuranceDept: 'For travel insurance or e-sim enquiries, please visit jetmeaway dot co dot uk. If you purchased insurance or an e-sim through one of our partner links, please contact the provider directly using the details in your confirmation email.',
  },
  ur: {
    welcome: 'JetMeAway mein call karne ka shukriya. Aap ki call hamare liye ahem hai.',
    langSelect: 'For English, press 1. Urdu ke liye, 2 dabayein.',
    dept: 'Baraye meherbani apna option chunein. Hotel booking ke liye 1 dabayein. Flight ke liye 2 dabayein. Car hire ke liye 3 dabayein. Holiday packages ke liye 4 dabayein. Insurance ya e-sim ke liye 5 dabayein. Aam sawal ke liye 6 dabayein.',
    enterRef: 'Baraye meherbani apna booking reference number keypad se darj karein, phir hash key dabayein. Agar reference number nahi hai, toh hash dabayein.',
    noRef: 'Koi baat nahi. Aap ka booking reference aap ki confirmation email mein mojood hai.',
    bookingFound: 'Humne aap ki booking dhundh li hai.',
    bookingNotFound: 'Maaf kijiye, is reference se koi booking nahi mili. Baraye meherbani dobara check karein, ya hash dabayein.',
    problem: 'Hum aap ki kaise madad kar sakte hain? Check-in ya check-out ke liye 1 dabayein. Cancellation ke liye 2 dabayein. Refund ke liye 3 dabayein. Booking mein tabdeeli ke liye 4 dabayein. Payment masle ke liye 5 dabayein. Kuch aur ke liye 6 dabayein.',
    checkin: 'Check-in aur check-out ke sawalaat ke liye, baraye meherbani apne hotel se seedha rabta karein. Hotel ki contact details aap ki confirmation email mein hain.',
    cancel: 'Cancellation ke liye, baraye meherbani apna booking reference email karein waqar at jetmeaway dot co dot uk par. Aksar bookings check-in se 48 ghante pehle muft cancel ho sakti hain. Aap ko 24 ghanton mein jawab milega.',
    refund: 'Refund cancellation confirm hone ke 5 se 10 kaam ke dinon mein process hota hai. Agar aap ka refund nahi aaya, toh baraye meherbani email karein waqar at jetmeaway dot co dot uk par.',
    amendment: 'Booking mein tabdeeli ke liye, baraye meherbani email karein waqar at jetmeaway dot co dot uk par apna booking reference aur jo tabdeeliyaan chahiye woh bhi likhein. 24 ghanton mein jawab milega.',
    payment: 'Payment maslon ke liye, apne bank statement mein Nuitee Travel ya JetMeAway ka charge check karein. Agar double charge hua hai toh email karein waqar at jetmeaway dot co dot uk par. 48 ghanton mein hal ho jayega.',
    other: 'Baqi tamam sawalaat ke liye, jetmeaway dot co dot uk slash contact par jayein ya email karein waqar at jetmeaway dot co dot uk par.',
    resolved: 'Kya aap ka masla hal ho gaya? Haan ke liye 1 dabayein. Agar abhi bhi madad chahiye toh 2 dabayein.',
    thankyou: 'JetMeAway mein call karne ka shukriya. Aap ka safar khush-gawaar ho. Khuda Hafiz.',
    holdMsg: 'Baraye meherbani hold karein, hum aap ko agent se connect kar rahe hain. Tahmini intezaar ka waqt 2 se 3 minute hai.',
    holdMusic: 'Shukriya aap ke sabr ka. Agent jald aap se baat karega.',
    sorry: 'Maaf kijiye hum aap ka masla hal nahi kar sake. Hum aap ko team ke ek member se connect kar rahe hain.',
    closed: 'Hamari phone lines Monday se Saturday, subah 9 baje se raat 8 baje tak khuli hain. Aap ne business hours ke baad call ki hai. Baraye meherbani email karein waqar at jetmeaway dot co dot uk par. Shukriya.',
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

function gather(action: string, opts: { numDigits?: number; finishOnKey?: string; timeout?: number } = {}) {
  const nd = opts.numDigits ? ` numDigits="${opts.numDigits}"` : '';
  const fk = opts.finishOnKey !== undefined ? ` finishOnKey="${opts.finishOnKey}"` : '';
  const to = ` timeout="${opts.timeout || 5}"`;
  return { open: `<Gather action="${escXml(action)}"${nd}${fk}${to} input="dtmf">`, close: '</Gather>' };
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
  const g = gather(`/api/twilio/voice?step=ref&lang=${lang}&dept=${dept}`, { finishOnKey: '#', timeout: 10 });
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

  const g = gather(`/api/twilio/voice?step=resolved&lang=${lang}&dept=${dept}`, { numDigits: 1, timeout: 8 });
  return twiml(
    say(msg, lang) +
    pause(1) +
    g.open +
    say(m.resolved, lang) +
    g.close +
    say(m.thankyou, lang) +
    '<Hangup/>'
  );
}

async function stepLookupRef(lang: Lang, dept: string, digits: string) {
  const m = MSG[lang];

  // Try to look up booking in KV
  const ref = `JMA-H-${digits}`;
  let bookingInfo = '';
  try {
    const record = await kv.get<any>(`pending-booking:${ref}`);
    if (record) {
      if (lang === 'en') {
        bookingInfo = `Your booking reference is ${ref}. ` +
          (record.hotelName ? `Hotel: ${record.hotelName}. ` : '') +
          (record.checkin ? `Check-in date: ${record.checkin}. ` : '') +
          (record.checkout ? `Check-out date: ${record.checkout}. ` : '') +
          (record.guests ? `Number of guests: ${record.guests}. ` : '') +
          (record.totalPrice ? `Total amount: ${record.totalPrice} pounds. ` : '') +
          (record.state === 'confirmed' ? 'Booking status: confirmed.' : 'Booking status: pending.');
      } else {
        bookingInfo = `Aap ka booking reference hai ${ref}. ` +
          (record.hotelName ? `Hotel: ${record.hotelName}. ` : '') +
          (record.checkin ? `Check-in: ${record.checkin}. ` : '') +
          (record.checkout ? `Check-out: ${record.checkout}. ` : '') +
          (record.guests ? `Mehmaan: ${record.guests}. ` : '') +
          (record.totalPrice ? `Kul raqam: ${record.totalPrice} pounds. ` : '') +
          (record.state === 'confirmed' ? 'Booking ki halat: confirmed.' : 'Booking ki halat: pending.');
      }
    }
  } catch { /* KV lookup failed — continue without booking info */ }

  if (bookingInfo) {
    const g = gather(`/api/twilio/voice?step=problem&lang=${lang}&dept=${dept}&ref=${digits}`, { numDigits: 1, timeout: 8 });
    return twiml(
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

  // Booking not found — ask again or continue
  const g = gather(`/api/twilio/voice?step=ref&lang=${lang}&dept=${dept}`, { finishOnKey: '#', timeout: 10 });
  return twiml(
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

function stepProblemResponse(lang: Lang, problem: string) {
  const m = MSG[lang];
  let response = m.other;
  if (problem === '1') response = m.checkin;
  else if (problem === '2') response = m.cancel;
  else if (problem === '3') response = m.refund;
  else if (problem === '4') response = m.amendment;
  else if (problem === '5') response = m.payment;
  else if (problem === '6') response = m.other;

  const g = gather(`/api/twilio/voice?step=resolved&lang=${lang}`, { numDigits: 1, timeout: 8 });
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

function stepResolved(lang: Lang, digit: string) {
  const m = MSG[lang];

  if (digit === '1') {
    // Resolved — thank you and hang up
    return twiml(say(m.thankyou, lang) + '<Hangup/>');
  }

  // Not resolved — hold message, then forward
  if (FORWARD_NUMBER) {
    return twiml(
      say(m.sorry, lang) +
      pause(1) +
      say(m.holdMsg, lang) +
      pause(3) +
      say(m.holdMusic, lang) +
      pause(5) +
      say(m.holdMusic, lang) +
      pause(5) +
      `<Dial timeout="30" callerId="${escXml(process.env.TWILIO_FROM || '')}">${escXml(FORWARD_NUMBER)}</Dial>` +
      say(m.closed, lang) +
      '<Hangup/>'
    );
  }

  // No forward number configured
  return twiml(
    say(m.other, lang) +
    pause(1) +
    say(m.thankyou, lang) +
    '<Hangup/>'
  );
}

function stepClosed(lang: Lang) {
  const m = MSG[lang];
  return twiml(say(m.closed, lang) + '<Hangup/>');
}

/* ── Check business hours (Mon-Sat 9am-8pm UK) ───────────────────────── */
function isBusinessHours(): boolean {
  const now = new Date(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
  const day = now.getDay(); // 0=Sun
  const hour = now.getHours();
  if (day === 0) return false; // Sunday closed
  return hour >= 9 && hour < 20; // 9am-8pm
}

/* ── Main Handler ─────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const step = url.searchParams.get('step') || 'start';
  const lang = (url.searchParams.get('lang') || 'en') as Lang;
  const dept = url.searchParams.get('dept') || '1';
  const ref = url.searchParams.get('ref') || '';

  // Parse Twilio form body
  const body = await req.text();
  const params = new URLSearchParams(body);
  const digits = params.get('Digits') || '';

  switch (step) {
    case 'start':
      return step1Welcome();

    case 'lang': {
      const timeout = url.searchParams.get('timeout');
      if (timeout) return step2Dept('en'); // Default to English on timeout
      const selectedLang: Lang = digits === '2' ? 'ur' : 'en';

      // Check business hours
      if (!isBusinessHours()) {
        return stepClosed(selectedLang);
      }
      return step2Dept(selectedLang);
    }

    case 'dept':
      // Hotel bookings (1) go to full flow, others get quick info
      if (digits === '1') return step3EnterRef(lang, digits);
      return stepNonHotelDept(lang, digits || '6');

    case 'ref':
      if (!digits || digits === '') return stepNoRef(lang, dept);
      return stepLookupRef(lang, dept, digits);

    case 'noref':
      return stepNoRef(lang, dept);

    case 'problem':
      return stepProblemResponse(lang, digits || '6');

    case 'resolved':
      return stepResolved(lang, digits || '1');

    default:
      return step1Welcome();
  }
}

// Twilio may also send GET requests for initial webhook
export async function GET(req: NextRequest) {
  return POST(req);
}
