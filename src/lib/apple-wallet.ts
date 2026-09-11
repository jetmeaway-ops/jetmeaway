/**
 * Apple Wallet (.pkpass) generator for the hotel voucher.
 *
 * Owner ask (2026-09-11): the confirmation email should also carry an Apple
 * Wallet pass the guest can add to their phone. A .pkpass is a signed ZIP of
 * pass.json + images + a manifest + a PKCS#7 signature over that manifest,
 * signed with our Apple "Pass Type ID" certificate (pass.uk.co.jetmeaway.
 * voucher, Team 65YS3XW329). iOS Mail recognises the attachment and shows
 * "Add to Apple Wallet".
 *
 * Secrets: the signer cert + private key are read from env (base64 PEM) —
 * never in the repo. The Apple WWDR intermediate is PUBLIC, so it's embedded
 * below. If the env isn't configured, buildApplePkpass returns null and the
 * email simply goes out without the pass — nothing breaks.
 *
 * Signing is pure-JS (node-forge) so it works without native crypto; the ZIP
 * is built with fflate. Both are edge/serverless-safe.
 */
import forge from 'node-forge';
import { zipSync, strToU8 } from 'fflate';
import { fmtDate, type Booking } from './bookings';
import { stringsFor, isSupportedLocale, translateBoard, translateRoom, formatTime } from './booking-i18n';

const PASS_TYPE_ID = 'pass.uk.co.jetmeaway.voucher';
const TEAM_ID = '65YS3XW329';

// Apple Worldwide Developer Relations Certification Authority (G4) — PUBLIC
// intermediate. A pass signature must chain to it. Base64 of the PEM.
const WWDR_PEM_B64 =
  'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlFVlRDQ0F6MmdBd0lCQWdJVUU5eDNsVkp4NVQzR011ak0vK1VoODh6Rnp0SXdEUVlKS29aSWh2Y05BUUVMDQpCUUF3WWpFTE1Ba0dBMVVFQmhNQ1ZWTXhFekFSQmdOVkJBb1RDa0Z3Y0d4bElFbHVZeTR4SmpBa0JnTlZCQXNUDQpIVUZ3Y0d4bElFTmxjblJwWm1sallYUnBiMjRnUVhWMGFHOXlhWFI1TVJZd0ZBWURWUVFERXcxQmNIQnNaU0JTDQpiMjkwSUVOQk1CNFhEVEl3TVRJeE5qRTVNell3TkZvWERUTXdNVEl4TURBd01EQXdNRm93ZFRGRU1FSUdBMVVFDQpBd3c3UVhCd2JHVWdWMjl5YkdSM2FXUmxJRVJsZG1Wc2IzQmxjaUJTWld4aGRHbHZibk1nUTJWeWRHbG1hV05oDQpkR2x2YmlCQmRYUm9iM0pwZEhreEN6QUpCZ05WQkFzTUFrYzBNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11DQpNUXN3Q1FZRFZRUUdFd0pWVXpDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTkFmDQplS3A2SnpLd1JsL25GM2JZb0owT0tZNnRQVEtseEdzM3llUkJrV3EzZVhGZEREUUVZSFgzcmtPUFI4U0dIZ2pvDQp2OVk1VWk4ZVoveHg4WUp0UEg0R1VuYWRMTHpWUStteHRMeEFPbmhSWFZHaEplRytiSkdkYXlGWkdFSFZENDF0DQpRU281U2lIZ2tKOU9FMC9RakpveXVOZHFraDRsYXFReXppSVpoUVZnM0FKSzhscnJkM2tDZmNDWFZHeVNqbllCDQo1a2FQNWVZcSs2S3dyUml0YlRPRk9DT0w2b3FXN1ordVprK2pERUFuYlpYUVlvalpReWtuL2Uya3YxTXVrQlZsDQpQTmt1WW1RekhXeHEzWTRocXFSZkZjWXc3Vi9takRhU2xMZmNPUUlBKzJTTTFBeUI4ai9WTkplSGRTYkNiNjREDQpZeUVNZTlRYnNXTEZBcHk5L2E4Q0F3RUFBYU9CN3pDQjdEQVNCZ05WSFJNQkFmOEVDREFHQVFIL0FnRUFNQjhHDQpBMVVkSXdRWU1CYUFGQ3ZRYVVlVWRnbis5R3VOTGtDbTkwZE5md2hlTUVRR0NDc0dBUVVGQndFQkJEZ3dOakEwDQpCZ2dyQmdFRkJRY3dBWVlvYUhSMGNEb3ZMMjlqYzNBdVlYQndiR1V1WTI5dEwyOWpjM0F3TXkxaGNIQnNaWEp2DQpiM1JqWVRBdUJnTlZIUjhFSnpBbE1DT2dJYUFmaGgxb2RIUndPaTh2WTNKc0xtRndjR3hsTG1OdmJTOXliMjkwDQpMbU55YkRBZEJnTlZIUTRFRmdRVVc5bjZIZWVhR2d1am1YWWlVSVkra2NoYmQ2Z3dEZ1lEVlIwUEFRSC9CQVFEDQpBZ0VHTUJBR0NpcUdTSWIzWTJRR0FnRUVBZ1VBTUEwR0NTcUdTSWIzRFFFQkN3VUFBNElCQVFBL1ZqMmU1YmJEDQplZVpGSUdpOXYzT0xMQktlQXVPdWdDS01CQjdEVXNod2dLajd6cWV3MVVKRWdnT0NUd2I4TzBrVSs5aDBVb1d2DQpwNTBoNXdFU0E1L05RRmpRQWRlL01vTXJVMWdvUE82Y24xUjJQV1FueG42TkhUaE5MYTZCNXJtbHVKeUpsUGVmDQp4NGVsVVdZMEd6bHhPU1RqaDJmdnBiRm9lNHp1UGZldXRudmkwdi9mWWNacWRVbVZJa1NvQlB5VXVBc3VPUkZKDQpFdEhsZ2VwWkFFOWJQRm8yMm5vaWN3a0phYzNBZk9yaUpQNllSTGo0NzdKeFB4cGQxRjErTTAyY0hTUytBUENRDQpBMWlaUVQweFdtSkFyem1vVVVPU3F3U29uTUpOc1V2U3EzeEtYK3VkTzd4UGlFQUdFLytRRjRvSVJ5bm9ZcGdwDQpwVThSQldrNnovS2YNCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0NCg==';

function envPem(name: string): string | null {
  const b64 = process.env[name];
  if (!b64) return null;
  try { return Buffer.from(b64, 'base64').toString('utf8'); } catch { return null; }
}

function sha1hex(bytes: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(Buffer.from(bytes).toString('binary'));
  return md.digest().toHex();
}

async function fetchPng(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch { return null; }
}

/** party string in the pass language (mirror of the voucher's logic). */
function partyStr(b: Booking, locale: string): string {
  const S = stringsFor(locale);
  const a = Math.max(0, b.adults || 0);
  const c = Math.max(0, b.children || 0);
  if (!a && !c) return b.guests ? `${b.guests} ${b.guests === 1 ? S.guest : S.guestsWord}` : '';
  const ages = Array.isArray(b.childAges) && b.childAges.length
    ? ` (${b.childAges.join(', ')}${S.years ? ' ' + S.years : ''})` : '';
  return [
    `${a} ${a === 1 ? S.adult : S.adults}`,
    ...(c > 0 ? [`${c} ${c === 1 ? S.child : S.children}${ages}`] : []),
  ].join(' + ');
}

function dateL(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const S = stringsFor(locale);
  if (!isSupportedLocale(locale)) return fmtDate(iso);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fmtDate(iso);
  try { return new Intl.DateTimeFormat(S.dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d); }
  catch { return fmtDate(iso); }
}

/**
 * Build a signed .pkpass for a hotel booking. Returns the raw bytes, or null
 * if signing isn't configured / images can't be loaded (so the email still
 * sends without it). `locale` localizes the visible fields to match the email.
 */
export async function buildApplePkpass(b: Booking, locale: string = 'en'): Promise<Uint8Array | null> {
  const certPem = envPem('APPLE_PASS_CERT');
  const keyPem = envPem('APPLE_PASS_KEY');
  if (!certPem || !keyPem) return null; // not configured yet — no-op

  const S = stringsFor(locale);
  const SITE = 'https://jetmeaway.co.uk';

  // Images (required: icon.png). Reuse the site's square PWA icons + wordmark.
  const [icon, icon2x, logo] = await Promise.all([
    fetchPng(`${SITE}/icon-192x192.png`),
    fetchPng(`${SITE}/icon-512x512.png`),
    fetchPng(`${SITE}/jetmeaway-logo.png`),
  ]);
  if (!icon) return null; // a pass without an icon is invalid

  const room = b.roomName ? translateRoom(b.roomName, locale) : '';
  const board = b.boardName ? translateBoard(b.boardName, locale) : '';
  const address = [b.hotelAddress, b.hotelCity].map((x) => (x || '').trim()).filter((x) => x && x.length > 2).join(', ');
  const heldUnder = (b.customerName || '').trim();
  const barcodeMsg = b.supplierRef || b.id;

  const secondaryFields: Array<Record<string, unknown>> = [];
  if (b.checkIn) secondaryFields.push({ key: 'checkin', label: S.checkIn, value: dateL(b.checkIn, locale) });
  if (b.checkOut) secondaryFields.push({ key: 'checkout', label: S.checkOut, value: dateL(b.checkOut, locale) });

  const auxiliaryFields: Array<Record<string, unknown>> = [];
  const p = partyStr(b, locale);
  if (p) auxiliaryFields.push({ key: 'guests', label: S.guests, value: p });
  if (room) auxiliaryFields.push({ key: 'room', label: S.room, value: room });

  const backFields: Array<Record<string, unknown>> = [];
  if (b.supplierRef) {
    backFields.push({ key: 'confirmation', label: S.hotelConfirmation, value: b.supplierRef });
  }
  if (address) backFields.push({ key: 'address', label: S.hotelDetails, value: address });
  if (board) backFields.push({ key: 'board', label: S.meals, value: board });
  if (heldUnder && heldUnder.toLowerCase() !== 'guest') backFields.push({ key: 'held', label: S.heldUnder, value: heldUnder });
  if (b.checkInTime) backFields.push({ key: 'checkintime', label: S.checkIn, value: formatTime(b.checkInTime, locale) });
  if (b.checkOutTime) backFields.push({ key: 'checkouttime', label: S.checkOut, value: formatTime(b.checkOutTime, locale) });
  backFields.push({ key: 'support', label: 'JetMeAway', value: 'contact@jetmeaway.co.uk\n+44 20 4630 0278 (24/7)' });

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    organizationName: 'JetMeAway',
    serialNumber: b.id,
    description: S.voucherTitle,
    // White card so the full-colour JetMeAway logo reads (it has dark text +
    // a coloured mark, unreadable on a dark ground). No logoText — the logo
    // image already carries the wordmark, so a text label would double it.
    foregroundColor: 'rgb(10, 22, 40)',
    backgroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(0, 102, 255)',
    ...(b.checkIn ? { relevantDate: `${b.checkIn}T12:00:00Z` } : {}),
    barcodes: [{ format: 'PKBarcodeFormatQR', message: barcodeMsg, messageEncoding: 'iso-8859-1', altText: barcodeMsg }],
    generic: {
      primaryFields: [{ key: 'hotel', label: S.voucherTitle, value: b.title || 'Hotel' }],
      secondaryFields,
      auxiliaryFields,
      backFields,
    },
  };

  // ── Build the file set, hash it (manifest), sign the manifest (PKCS#7). ──
  const files: Record<string, Uint8Array> = {
    'pass.json': strToU8(JSON.stringify(pass)),
    'icon.png': icon,
    ...(icon2x ? { 'icon@2x.png': icon2x } : {}),
    ...(logo ? { 'logo.png': logo, 'logo@2x.png': logo } : {}),
  };
  const manifest: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) manifest[name] = sha1hex(bytes);
  const manifestBytes = strToU8(JSON.stringify(manifest));

  let signature: Uint8Array;
  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const key = forge.pki.privateKeyFromPem(keyPem);
    const wwdr = forge.pki.certificateFromPem(Buffer.from(WWDR_PEM_B64, 'base64').toString('utf8'));
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(Buffer.from(manifestBytes).toString('binary'));
    p7.addCertificate(cert);
    p7.addCertificate(wwdr);
    p7.addSigner({
      key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
      ],
    });
    p7.sign({ detached: true });
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    signature = Uint8Array.from(der, (c) => c.charCodeAt(0));
  } catch (err) {
    console.error('[apple-wallet] signing failed', err);
    return null;
  }

  const zip = zipSync(
    { ...files, 'manifest.json': manifestBytes, signature },
    { level: 0 },
  );
  return zip;
}
