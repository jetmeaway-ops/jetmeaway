/**
 * Root gate — the very first screen mounted after fonts and the storage
 * migration finish in `_layout.tsx`. Reads the `jma:onboarded:v1` MMKV
 * flag synchronously and redirects:
 *
 *   - flag === true  → /(tabs)/discover
 *   - flag === false → /onboarding/welcome
 *
 * No UI — this component renders only a Redirect. Subsequent navigations
 * back to "/" are rare (deep links resolve to specific routes) but safe
 * because the redirect is idempotent.
 */

import { Redirect } from 'expo-router';
import { storage } from '../src/services/storage';

const ONBOARDED_KEY = 'jma:onboarded:v1';

export default function Index() {
  const onboarded = storage.getBoolean(ONBOARDED_KEY) ?? false;
  return (
    <Redirect href={onboarded ? '/(tabs)/discover' : '/onboarding/welcome'} />
  );
}
