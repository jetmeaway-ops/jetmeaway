/**
 * The JetMeAway hotel voucher — the document a guest shows at reception.
 *
 * Owner's ask (2026-08-28, holding the supplier's PDF): "where ever it says
 * liteapi and there logo we have to replace it with jetmeaway and our logo."
 * The VOUCHER is ours to brand: every fact on it is booking data we hold.
 * (The supplier's tax INVOICE is not ours and is deliberately not replaced —
 * it is issued by the company that took the money.)
 *
 * Two parts, deliberately split:
 *   buildVoucherModel(b) — WHAT the voucher says. Pure, testable, no PDF.
 *   buildVoucherPdf(b)   — HOW it is drawn (pdf-lib, edge-safe, A4).
 * Content bugs are caught by asserting on the model; the drawing only ever
 * consumes it, so the tested words are the printed words.
 *
 * Every field is optional: a record written before 2026-08-28 carries almost
 * none of them, and the voucher must read cleanly for both. An omitted line
 * beats a confident wrong one.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fmtGbp, fmtDate, type Booking } from './bookings';

const BLUE = rgb(0, 0.4, 1);
const INK = rgb(0.04, 0.086, 0.157);
const BODY = rgb(0.36, 0.39, 0.47);
const FAINT = rgb(0.56, 0.58, 0.66);
const LINE = rgb(0.91, 0.93, 0.96);

export type VoucherModel = {
  title: string;
  status: string;
  refLine: string;
  hotel: { name: string; address: string | null };
  sections: Array<{ title: string; rows: Array<[string, string]> }>;
  notes: string[];
  support: string[];
  footer: string;
};

function party(b: Booking): string | null {
  const a = Math.max(0, b.adults || 0);
  const c = Math.max(0, b.children || 0);
  if (!a && !c) return b.guests ? `${b.guests} guest${b.guests === 1 ? '' : 's'}` : null;
  const ages = Array.isArray(b.childAges) && b.childAges.length ? ` (${b.childAges.join(', ')})` : '';
  return [
    `${a} adult${a === 1 ? '' : 's'}`,
    ...(c > 0 ? [`${c} child${c === 1 ? '' : 'ren'}${ages}`] : []),
  ].join(' + ');
}

function address(b: Booking): string | null {
  const street = (b.hotelAddress || '').trim();
  const parts = [street];
  for (const extra of [b.hotelCity, b.hotelCountry]) {
    const e = (extra || '').trim();
    if (!e || e.length === 2) continue; // a bare ISO code reads worse than nothing
    const re = new RegExp(`(^|[\\s,])${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s,]|$)`, 'i');
    if (!re.test(street)) parts.push(e);
  }
  const out = parts.filter(Boolean).join(', ');
  return out || null;
}

function nights(b: Booking): number | null {
  if (!b.checkIn || !b.checkOut) return null;
  const n = Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);
  return n > 0 ? n : null;
}

export function buildVoucherModel(b: Booking): VoucherModel {
  const stay: Array<[string, string]> = [];
  if (b.checkIn) stay.push(['Check-in', `${fmtDate(b.checkIn)}${b.checkInTime ? `, from ${b.checkInTime}` : ''}`]);
  if (b.checkOut) stay.push(['Check-out', `${fmtDate(b.checkOut)}${b.checkOutTime ? `, until ${b.checkOutTime}` : ''}`]);
  const n = nights(b);
  if (n) stay.push(['Nights', String(n)]);
  if (b.roomName) stay.push(['Room', b.roomName]);
  if (b.boardName) stay.push(['Meals', b.boardName]);

  const guests: Array<[string, string]> = [];
  const heldUnder = (b.customerName || '').trim();
  if (heldUnder && heldUnder.toLowerCase() !== 'guest') guests.push(['Room held under', heldUnder]);
  const p = party(b);
  if (p) guests.push(['Guests', p]);

  const payment: Array<[string, string]> = [['Total paid', fmtGbp(b.totalPence)]];
  if (typeof b.localFeesPence === 'number' && b.localFeesPence > 0) {
    payment.push(['Payable at the hotel', fmtGbp(b.localFeesPence)]);
  }

  const cancellation: Array<[string, string]> = [];
  if (b.cancellationDeadline) {
    const d = new Date(b.cancellationDeadline);
    if (!isNaN(d.getTime())) {
      cancellation.push(['Free cancellation until', fmtDate(b.cancellationDeadline.slice(0, 10))]);
    }
  }

  const notes = [
    'Show this voucher and the name above at reception - it is the name the hotel holds the room under.',
  ];
  if (typeof b.localFeesPence === 'number' && b.localFeesPence > 0) {
    notes.push(
      `The property collects ${fmtGbp(b.localFeesPence)} on arrival (city tax and local fees) - not included in the total paid.`,
    );
  }
  notes.push(
    'Hotels may ask for photo ID and a card or cash deposit for incidentals. If you will arrive after 8pm, tell the hotel in advance so the room is not released.',
  );

  return {
    title: 'Hotel voucher',
    status: (b.status || 'confirmed').toUpperCase(),
    refLine: `Booking ${b.id}${b.supplierRef ? `  ·  Hotel reference ${b.supplierRef}` : ''}`,
    hotel: { name: b.title || 'Your hotel', address: address(b) },
    sections: [
      { title: 'Your stay', rows: stay },
      { title: 'Guests', rows: guests },
      { title: 'Payment', rows: payment },
      ...(cancellation.length ? [{ title: 'Cancellation', rows: cancellation }] : []),
    ].filter((s) => s.rows.length > 0),
    notes,
    // Our contact first; the 24/7 line below it is the one that answers
    // mid-stay and can actually amend a booking - a hotel phoning at 11pm
    // must never hit a dead end.
    support: [
      'JetMeAway - contact@jetmeaway.co.uk',
      '24/7 stay support line: +44 20 4630 0278',
    ],
    footer: 'JETMEAWAY LTD (Company No: 17140522) · 66 Paul Street, London · jetmeaway.co.uk',
  };
}

/** Strip characters Helvetica (WinAnsi) cannot encode, keeping accents that
 *  can. pdf-lib THROWS on an unencodable glyph, and one emoji or dash from a
 *  supplier string must never cost a guest their voucher. */
function safe(s: string): string {
  return s
    .replace(/–|—/g, '-')
    .replace(/’|‘/g, "'")
    .replace(/“|”/g, '"')
    .replace(/·/g, '·')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E -ÿ·]/g, '');
}

export async function buildVoucherPdf(b: Booking, logoPng?: Uint8Array | null): Promise<Uint8Array> {
  const m = buildVoucherModel(b);
  const doc = await PDFDocument.create();
  doc.setTitle(`JetMeAway voucher ${b.id}`);
  const page = doc.addPage([595.28, 841.89]); // A4 portrait, points
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const M = 48; // margin
  let y = 841.89 - 56;

  const text = (
    s: string,
    opts: { x?: number; size?: number; font?: typeof font; color?: ReturnType<typeof rgb>; right?: boolean },
  ) => {
    const f = opts.font || font;
    const size = opts.size || 10;
    const str = safe(s);
    const x = opts.right ? W - M - f.widthOfTextAtSize(str, size) : (opts.x ?? M);
    page.drawText(str, { x, y, size, font: f, color: opts.color || BODY });
  };
  const rule = () => {
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: LINE });
  };

  // ── Masthead: our brand, never the supplier's.
  if (logoPng && logoPng.length) {
    try {
      const img = await doc.embedPng(logoPng);
      const h = 30;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: M, y: y - 8, width: w, height: h });
    } catch {
      text('JetMeAway', { size: 22, font: bold, color: BLUE });
    }
  } else {
    text('JetMeAway', { size: 22, font: bold, color: BLUE });
  }
  text(m.status, { right: true, size: 11, font: bold, color: rgb(0.02, 0.59, 0.41) });
  y -= 18;
  text(m.title, { right: true, size: 10, color: FAINT });
  y -= 26;
  text(m.refLine, { size: 10, color: FAINT });
  y -= 24;
  rule();
  y -= 26;

  // ── The property.
  text(m.hotel.name, { size: 17, font: bold, color: INK });
  y -= 16;
  if (m.hotel.address) {
    text(m.hotel.address, { size: 10.5 });
    y -= 14;
  }
  y -= 10;

  // ── Sections.
  for (const s of m.sections) {
    rule();
    y -= 20;
    text(s.title.toUpperCase(), { size: 8.5, font: bold, color: FAINT });
    y -= 16;
    for (const [label, value] of s.rows) {
      text(label, { size: 10.5 });
      text(value, { right: true, size: 10.5, font: bold, color: INK });
      y -= 16;
    }
    y -= 8;
  }

  // ── Notes.
  rule();
  y -= 20;
  text('GOOD TO KNOW', { size: 8.5, font: bold, color: FAINT });
  y -= 15;
  const maxWidth = W - 2 * M;
  for (const note of m.notes) {
    // Naive greedy wrap - fine for short sentences at 9.5pt.
    const words = safe(note).split(' ');
    let line = '';
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(probe, 9.5) > maxWidth) {
        text(line, { size: 9.5 });
        y -= 12.5;
        line = w;
      } else {
        line = probe;
      }
    }
    if (line) {
      text(line, { size: 9.5 });
      y -= 12.5;
    }
    y -= 4;
  }

  // ── Support + footer, pinned low.
  y = Math.min(y, 120);
  rule();
  y -= 18;
  for (const sLine of m.support) {
    text(sLine, { size: 9.5, font: bold, color: INK });
    y -= 13;
  }
  y -= 4;
  text(m.footer, { size: 8, color: FAINT });

  return doc.save();
}
