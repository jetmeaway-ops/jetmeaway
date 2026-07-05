import type { Metadata } from 'next';
import GetClient from './get-client';

export const runtime = 'edge';

/**
 * /get — the single "smart link" behind the JetMeAway QR code.
 *
 * One QR code can only encode one URL, but people scan it on every kind of
 * device. This page is that one URL: it detects the visitor's platform and
 * forwards them to the right place —
 *
 *   • iPhone / iPad  → the App Store listing
 *   • Android        → the Google Play listing
 *   • Desktop / other → stays here, showing both store badges plus a
 *                       "Browse the website" button
 *
 * So a printed QR pointing at jetmeaway.co.uk/get gives "App Store OR Play
 * Store OR website" from a single code. The redirect is done client-side
 * (UA sniffing) rather than at the edge so we can still render a proper
 * fallback card if the store redirect is blocked, and so desktop scanners
 * land on something useful instead of a bounce.
 */
export const metadata: Metadata = {
  title: 'Get the JetMeAway App | iOS & Android',
  description:
    'Download the JetMeAway app for iPhone or Android — compare flights, hotels, car hire and holiday packages in seconds. Or carry on to jetmeaway.co.uk.',
  alternates: { canonical: 'https://jetmeaway.co.uk/get' },
  robots: { index: false, follow: true },
};

export default function GetPage() {
  return <GetClient />;
}
