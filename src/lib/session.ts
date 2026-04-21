/**
 * Session — magic-link email auth for /account.
 *
 * No password store, no DB. A signed, short-lived token is emailed to the
 * customer; they click it, we verify the HMAC + expiry and set a signed
 * HttpOnly session cookie. Cookie payload is just the verified email —
 * bookings are looked up by customerEmail from the existing KV store.
 *
 * Edge-runtime compatible (Web Crypto, no Node APIs). All string encoding
 * uses base64url so the token can safely sit in a URL.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const enc = new TextEncoder();
const dec = new TextDecoder();

/** 1 hour — a freshly-requested magic link must be clicked within this. */
export const MAGIC_LINK_TTL_SECONDS = 60 * 60;
/** 30 days — how long the post-verify session cookie stays live. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const SESSION_COOKIE_NAME = 'jma_sess';

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    // Fail loud in server logs but soft-return a dev-only constant so local
    // preview doesn't explode. Production must set SESSION_SECRET.
    console.warn('[session] SESSION_SECRET not set — using insecure dev fallback');
    return 'dev-only-insecure-fallback-do-not-use-in-production';
  }
  return s;
}

/* ─── base64url helpers ─────────────────────────────────────────────── */

function b64urlEncode(bytes: Uint8Array): string {
  // Build a binary string (Uint8Array has no direct base64 method in Web Crypto).
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ─── HMAC-SHA256 via Web Crypto ────────────────────────────────────── */

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

/** Constant-time string compare to avoid leaking the signature via timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ─── Tokens ─────────────────────────────────────────────────────────── */

/**
 * Build a signed token of the form `{purpose}.{email}.{expiry}.{sig}`.
 * `purpose` ("magic" vs "session") prevents a magic-link token from being
 * reused as a session cookie and vice-versa.
 */
async function makeToken(purpose: 'magic' | 'session', email: string, ttlSec: number): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${purpose}.${email}.${expiry}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

async function verifyToken(purpose: 'magic' | 'session', token: string): Promise<string | null> {
  if (!token || typeof token !== 'string') return null;
  // Token format: `{purpose}.{email}.{expiry}.{sig}`. Email domains contain
  // dots (`user@gmail.com`, `x@foo.co.uk`), so a naive `split('.')` produces
  // 5+ parts. Purpose has no dots, expiry is digits only, and sig is base64url
  // (which replaces `.` with `_`), so only the email can contribute interior
  // dots — parse from the ends and rejoin the middle as the email.
  const parts = token.split('.');
  if (parts.length < 4) return null;
  const p = parts[0];
  const sig = parts[parts.length - 1];
  const expStr = parts[parts.length - 2];
  const email = parts.slice(1, -2).join('.');
  if (p !== purpose) return null;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const expected = await hmac(`${p}.${email}.${exp}`);
  if (!safeEqual(expected, sig)) return null;
  return email.toLowerCase();
}

/** Normalise to lowercase, trim, and guard against obvious garbage. */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

/* ─── Public API ─────────────────────────────────────────────────────── */

export function createMagicToken(email: string): Promise<string> {
  return makeToken('magic', email.toLowerCase(), MAGIC_LINK_TTL_SECONDS);
}

export function verifyMagicToken(token: string): Promise<string | null> {
  return verifyToken('magic', token);
}

export function createSessionToken(email: string): Promise<string> {
  return makeToken('session', email.toLowerCase(), SESSION_TTL_SECONDS);
}

export function verifySessionToken(token: string): Promise<string | null> {
  return verifyToken('session', token);
}

/** Serialise a Set-Cookie header for the session token. */
export function sessionCookieHeader(token: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  // Only set Secure in production — localhost http cookies would be dropped
  // otherwise. Vercel always sets NODE_ENV=production.
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/** Serialise a Set-Cookie header that clears the session. */
export function clearSessionCookieHeader(): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/** Read the signed email out of a request's cookies. Returns null when the
 *  cookie is missing, expired, or tampered with. */
export async function readSessionEmail(cookieHeader: string | null | undefined): Promise<string | null> {
  if (!cookieHeader) return null;
  // Parse only our cookie — avoids pulling in a parser for one line.
  const match = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.slice(SESSION_COOKIE_NAME.length + 1);
  return verifySessionToken(token);
}

/**
 * Server-component variant — accepts Next.js's `cookies()` store directly.
 *
 * Pages were previously calling `readSessionEmail(cookieStore.toString())`,
 * but `ReadonlyRequestCookies.toString()` does NOT produce a cookie header
 * string — it returns Next's internal debug repr, which `readSessionEmail`
 * then fails to parse. The result: the session cookie is set correctly on
 * verify, but both `/account` and `/account/bookings` silently treat every
 * visitor as signed-out and bounce them back to the sign-in form.
 *
 * This helper takes a cookie store with a `.get(name)` method (the shape of
 * `ReadonlyRequestCookies`) and pulls the session cookie out directly.
 */
export async function readSessionEmailFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined },
): Promise<string | null> {
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
