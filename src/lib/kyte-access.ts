/**
 * Kyte access gate.
 *
 * Kyte is OFF for customers: its sandbox key only covers a handful of fixed
 * routes, so surfacing it in the public /flights search would show broken or
 * sandbox rows to real users. The customer search route therefore returns an
 * empty Kyte offer set unless a request is explicitly allowed here.
 *
 * A request is allowed when EITHER:
 *   - KYTE_ENABLED === 'true' — the global switch (used only once the LIVE key
 *     lands and Kyte is meant to be visible to everyone), OR
 *   - the request carries the cert token: header `x-kyte-cert` equal to
 *     KYTE_DEMO_TOKEN. This is how the private /kyte-cert page (which only
 *     Kyte has the link to) exercises the full sandbox flow end-to-end WITHOUT
 *     any customer ever seeing a Kyte row.
 *
 * Never log the token.
 */
export function kyteCertAllowed(req: Request): boolean {
  if (process.env.KYTE_ENABLED === 'true') return true;
  const token = process.env.KYTE_DEMO_TOKEN;
  if (!token) return false;
  return req.headers.get('x-kyte-cert') === token;
}
