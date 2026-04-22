/**
 * Country-level vibe fallback used when a destination has no hand-picked
 * vibeTags of its own. Keys are the long-form country strings used on
 * Destination records (e.g. "United Arab Emirates") — not ISO codes — so the
 * same map works whether you look up by a known destination or by a searched
 * city whose country we happen to know.
 *
 * Tag order matters: first tag is the primary vibe, used for tab defaulting.
 */

import type { VibeTag } from './silentScout';

const COUNTRY_VIBES: Record<string, VibeTag[]> = {
  // ── British Isles ──
  'United Kingdom': ['urban', 'foodie'],
  'Ireland': ['urban', 'foodie'],

  // ── North America ──
  'United States': ['urban', 'foodie'],
  'Canada': ['urban', 'adventure'],

  // ── Iberia / Mediterranean ──
  'Portugal': ['foodie', 'urban'],
  'Spain': ['foodie', 'urban'],
  'France': ['foodie', 'urban'],
  'Italy': ['foodie', 'urban'],
  'Greece': ['foodie', 'urban'],

  // ── Central / Western Europe ──
  'Germany': ['urban', 'foodie'],
  'Netherlands': ['urban', 'foodie'],
  'Belgium': ['foodie', 'urban'],
  'Austria': ['spa', 'urban'],
  'Switzerland': ['adventure', 'spa'],
  'Czech Republic': ['urban', 'foodie'],
  'Hungary': ['spa', 'urban'],
  'Poland': ['urban', 'foodie'],

  // ── Nordic / Alpine ──
  'Iceland': ['adventure', 'spa'],
  'Norway': ['adventure', 'urban'],
  'Sweden': ['urban', 'adventure'],
  'Finland': ['spa', 'adventure'],
  'Denmark': ['urban', 'foodie'],

  // ── Middle East / Gulf ──
  'United Arab Emirates': ['urban', 'spa'],
  'Qatar': ['urban', 'spa'],
  'Oman': ['urban', 'spa'],
  'Saudi Arabia': ['urban'],
  'Bahrain': ['urban'],
  'Kuwait': ['urban'],

  // ── Turkey / Caucasus ──
  'Turkey': ['foodie', 'urban'],
  'Azerbaijan': ['urban', 'foodie'],
  'Georgia': ['foodie', 'adventure'],
  'Armenia': ['foodie', 'urban'],

  // ── North Africa ──
  'Morocco': ['foodie', 'urban'],
  'Egypt': ['adventure', 'spa'],
  'Tunisia': ['foodie', 'spa'],

  // ── South Asia ──
  'Pakistan': ['urban', 'foodie'],
  'India': ['foodie', 'urban'],
  'Sri Lanka': ['adventure', 'spa'],
  'Maldives': ['spa', 'adventure'],

  // ── East / Southeast Asia ──
  'Japan': ['foodie', 'urban'],
  'South Korea': ['urban', 'foodie'],
  'China': ['urban', 'foodie'],
  'Thailand': ['spa', 'foodie'],
  'Vietnam': ['foodie', 'urban'],
  'Indonesia': ['spa', 'adventure'],
  'Malaysia': ['foodie', 'urban'],
  'Singapore': ['foodie', 'urban'],

  // ── Oceania ──
  'Australia': ['urban', 'adventure'],
  'New Zealand': ['adventure', 'urban'],
};

/**
 * Returns the ordered vibe tags for a country string, or [] if unknown.
 * Unknown countries yield no signal — Silent Scout falls back to its
 * generic default ('food') rather than guessing.
 */
export function vibesForCountry(country?: string | null): VibeTag[] {
  if (!country) return [];
  return COUNTRY_VIBES[country] ?? [];
}
