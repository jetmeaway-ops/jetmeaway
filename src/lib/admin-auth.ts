/**
 * Admin auth guard — Edge Runtime compatible.
 *
 * Protects internal/debug endpoints from being called by random visitors.
 * Caller must send: Authorization: Bearer <ADMIN_SECRET>
 *
 * Uses a constant-time comparison to avoid timing attacks.
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

/** Constant-time string compare (prevents timing side-channels). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Returns null if the request is authorised, otherwise a Response to return.
 *
 * Usage:
 *   const unauth = requireAdmin(req);
 *   if (unauth) return unauth;
 */
export function requireAdmin(req: Request): Response | null {
  // If no secret is configured, refuse — fail closed, never fail open.
  if (!ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Admin access is not configured on the server' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || '';

  if (!token || !timingSafeEqual(token, ADMIN_SECRET)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return null;
}
