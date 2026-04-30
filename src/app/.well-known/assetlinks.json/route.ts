/**
 * GET /.well-known/assetlinks.json
 *
 * Android App Links — Google verifies this file before letting the app
 * "verify" itself for jetmeaway.co.uk URLs. When verified, taps on a
 * jetmeaway.co.uk link inside other apps (Gmail, WhatsApp, Chrome) open
 * directly in the JetMeAway app without the disambiguation chooser.
 *
 * Setup: the SHA-256 cert fingerprint comes from Google Play Console →
 * Setup → App Integrity → App signing key certificate (after the first
 * Play Store release was signed, which we already did for v1.0.4).
 *
 * Without ANDROID_PLAY_SHA256 env var the file serves a placeholder and
 * Android will refuse to verify. Set in Vercel before relying on this.
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-static';

const PACKAGE_NAME = 'uk.co.jetmeaway.app';
// Hex SHA-256, colon-separated, uppercase. Example shape:
//   "AB:CD:EF:01:23:45:..." (95 chars total).
const SHA256 = process.env.ANDROID_PLAY_SHA256 || 'AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA';

export async function GET() {
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: [SHA256],
      },
    },
  ];

  return new NextResponse(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, must-revalidate',
    },
  });
}
