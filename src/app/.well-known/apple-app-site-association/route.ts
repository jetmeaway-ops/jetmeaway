/**
 * GET /.well-known/apple-app-site-association
 *
 * iOS universal links — Apple fetches this file from each domain listed
 * in the app's `associatedDomains` (mobile/app.json). When the user taps
 * a jetmeaway.co.uk link in Mail, Messages, Safari, etc., iOS routes the
 * request to our app instead of Safari, *if the path matches one of the
 * `paths` patterns below*.
 *
 * Critical: must be served with Content-Type: application/json (Apple is
 * strict). Must NOT have a file extension. Must NOT redirect. We use a
 * Next.js Route Handler (not a static public/ file) for full header control.
 *
 * The `appID` field is "<TEAM_ID>.<BUNDLE_ID>". Team ID comes from the
 * Apple Developer account (top-right of developer.apple.com); bundle ID
 * is `uk.co.jetmeaway.app` (matches mobile/app.json).
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-static'; // pre-render at build time, no per-request cost

// Owner sets APPLE_TEAM_ID in Vercel env once they've enrolled in the
// Developer Program. Without it the file still serves but with a placeholder
// — iOS will refuse to associate. Kept env-driven so we don't ever commit
// a real Team ID to the repo.
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || 'ZZZZZZZZZZ';
const BUNDLE_ID = 'uk.co.jetmeaway.app';

// Paths the app handles. Anything here will open the app instead of Safari
// when a jetmeaway.co.uk link with a matching path is tapped.
const APP_PATHS = [
  '/account/*',
  '/account/bookings*',
  '/blog/*',
  '/hotels/*',
  '/flights/*',
  '/packages/*',
  '/cars/*',
  '/explore/*',
  '/destinations/*',
  '/success/*',
  '/booking/*',
];

export async function GET() {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${APPLE_TEAM_ID}.${BUNDLE_ID}`,
          paths: APP_PATHS,
        },
      ],
    },
    // Web Credentials API — lets iOS suggest jetmeaway.co.uk passwords/
    // keys to the app. Cheap to add now; useful if we ever add a password
    // login path alongside the magic-link/social flows.
    webcredentials: {
      apps: [`${APPLE_TEAM_ID}.${BUNDLE_ID}`],
    },
  };

  return new NextResponse(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      // Apple recommends short/no caching to make Team-ID rotation fast.
      'Cache-Control': 'public, max-age=300, must-revalidate',
    },
  });
}
