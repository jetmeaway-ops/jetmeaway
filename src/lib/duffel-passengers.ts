/**
 * Duffel passenger payload builder.
 * Handles adult/child/infant types and links infants to responsible adults
 * via `infant_passenger_id` as required by Duffel.
 */

export type PaxType = 'adult' | 'child' | 'infant_without_seat';

export type IncomingPassenger = {
  id: string;                 // Duffel passenger id from the offer
  type?: PaxType;             // passenger type from the offer (preferred)
  given_name: string;
  family_name: string;
  born_on: string;            // YYYY-MM-DD
  gender: string;             // 'male' | 'female' | other
  title?: string;             // optional — otherwise derived
  email?: string;             // lead passenger only
  phone?: string;             // lead passenger only (E.164-ish)
};

/**
 * Build the `passengers` array for POST /air/orders.
 * - Every passenger gets email + phone_number (Duffel requires them on all).
 *   The caller should pass the same contact details on every passenger object;
 *   for families this is typically the lead adult's contact info.
 * - Each infant is linked to an adult via `infant_passenger_id`.
 *   If there are more infants than adults, extras remain unlinked and
 *   Duffel will reject the order — the caller should validate upstream.
 */
export function buildDuffelPassengers(passengers: IncomingPassenger[]) {
  const adultIdxs: number[] = [];
  const infantIdxs: number[] = [];

  passengers.forEach((p, i) => {
    if (p.type === 'infant_without_seat') infantIdxs.push(i);
    else if (p.type === 'adult' || p.type === undefined) adultIdxs.push(i);
  });

  // Map: adult index -> infant id assigned to it (one per adult)
  const adultToInfant = new Map<number, string>();
  infantIdxs.forEach((infantIdx, k) => {
    const adultIdx = adultIdxs[k];
    if (adultIdx !== undefined) {
      adultToInfant.set(adultIdx, passengers[infantIdx].id);
    }
  });

  // Fallback contact info: if a passenger is missing email/phone, fall back to
  // the lead adult's details (Duffel requires email+phone on every passenger).
  const leadIdx = adultIdxs[0] ?? 0;
  const leadEmail = passengers[leadIdx]?.email || passengers.find((p) => p.email)?.email || '';
  const leadPhone = passengers[leadIdx]?.phone || passengers.find((p) => p.phone)?.phone || '';

  return passengers.map((p, i) => {
    const derivedTitle =
      p.title || (p.gender === 'male' || p.gender === 'm' ? 'mr' : 'ms');
    const infantId = adultToInfant.get(i);
    const email = p.email || leadEmail;
    const phone = (p.phone || leadPhone).replace(/\s+/g, '');

    return {
      id: p.id,
      given_name: p.given_name,
      family_name: p.family_name,
      born_on: p.born_on,
      gender: p.gender === 'male' ? 'm' : p.gender === 'female' ? 'f' : p.gender,
      title: derivedTitle,
      email,
      phone_number: phone,
      ...(infantId ? { infant_passenger_id: infantId } : {}),
    };
  });
}

/** Pick the lead passenger (first adult, or first passenger if none tagged). */
export function pickLeadPassenger<T extends { type?: PaxType }>(passengers: T[]): T | undefined {
  return passengers.find((p) => p.type === 'adult' || p.type === undefined) || passengers[0];
}
