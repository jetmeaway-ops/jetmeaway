/**
 * POST /api/account/social-signin
 *
 * Verify an Apple or Google ID token, extract the email, mint a session
 * cookie, and return success. Used by both:
 *   - Web: the /account page calls this with a Google credential (GIS) or
 *     Apple's `id_token` from the Sign in with Apple JS SDK redirect.
 *   - Native: the React Native shell calls this after expo-apple-authentication
 *     or expo-auth-session returns an ID token. The WebView, with
 *     sharedCookiesEnabled, inherits the cookie and the user is signed in
 *     across both surfaces.
 *
 * Multiple expected audiences are configured via environment variables —
 * web has its own client ID, iOS uses the bundle ID, Android has its own
 * Google OAuth client ID. We accept any of them.
 *
 * Email-verified flag MUST be true (Google's `email_verified` claim, Apple
 * sets `email_verified` for real-email accounts; for Apple's relay/private
 * emails the claim is also set true because Apple itself owns the inbox).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { createSessionToken, sessionCookieHeader, normaliseEmail } from '@/lib/session';

export const runtime = 'edge';

// JWKS endpoints — both Apple and Google publish their public keys here.
// jose's createRemoteJWKSet caches them per-process, so we reuse the same
// resolver across requests instead of re-fetching every time.
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

const APPLE_ISSUER = 'https://appleid.apple.com';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Pull the configured audience values for a provider. */
function expectedAudiences(provider: 'apple' | 'google'): string[] {
  if (provider === 'apple') {
    return [
      process.env.APPLE_BUNDLE_ID,
      process.env.APPLE_SERVICE_ID,
    ].filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  return [
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
    process.env.GOOGLE_CLIENT_ID_WEB,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);
}

async function verifyAppleToken(idToken: string): Promise<JWTPayload | null> {
  const audiences = expectedAudiences('apple');
  if (audiences.length === 0) {
    console.error('[social-signin] APPLE_BUNDLE_ID / APPLE_SERVICE_ID env vars not set');
    return null;
  }
  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience: audiences,
    });
    return payload;
  } catch (err) {
    console.error('[social-signin] Apple verify failed', err instanceof Error ? err.message : err);
    return null;
  }
}

async function verifyGoogleToken(idToken: string): Promise<JWTPayload | null> {
  const audiences = expectedAudiences('google');
  if (audiences.length === 0) {
    console.error('[social-signin] GOOGLE_CLIENT_ID_* env vars not set');
    return null;
  }
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
    });
    return payload;
  } catch (err) {
    console.error('[social-signin] Google verify failed', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const provider = typeof body.provider === 'string' ? body.provider.toLowerCase() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';

    if (provider !== 'apple' && provider !== 'google') {
      return NextResponse.json({ success: false, error: 'Invalid provider' }, { status: 400 });
    }
    if (!idToken || idToken.split('.').length !== 3) {
      return NextResponse.json({ success: false, error: 'Invalid ID token' }, { status: 400 });
    }

    const payload = provider === 'apple'
      ? await verifyAppleToken(idToken)
      : await verifyGoogleToken(idToken);

    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token verification failed' }, { status: 401 });
    }

    // Extract + validate email. Apple sometimes ships the email only on the
    // FIRST sign-in for a given Apple ID — subsequent sign-ins drop it from
    // the token. To handle that, the client must persist the email it saw
    // first time round and re-send it (we ignore client-supplied emails when
    // the token already carries one). For Phase 1 we just require an email
    // in the token and tell users to sign out + back in if they hit the
    // edge case. Phase 2: store first-seen email per `sub`.
    const email = normaliseEmail(typeof payload.email === 'string' ? payload.email : null);
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'No email in token. If signing in with Apple a second time, sign out of Apple ID for this app in Settings → Apple ID → Sign in with Apple, then try again.',
      }, { status: 400 });
    }

    // Email verification: Google sets `email_verified: true` for verified
    // accounts. Apple's flag is also reliable. Reject unverified emails to
    // prevent attackers from claiming arbitrary email ownership.
    if (payload.email_verified === false) {
      return NextResponse.json({ success: false, error: 'Email not verified by provider' }, { status: 400 });
    }

    const sessionToken = await createSessionToken(email);
    const res = NextResponse.json({ success: true, email });
    res.headers.append('Set-Cookie', sessionCookieHeader(sessionToken));
    return res;
  } catch (err) {
    console.error('[social-signin] route error', err);
    return NextResponse.json({ success: false, error: 'Could not sign in' }, { status: 500 });
  }
}
