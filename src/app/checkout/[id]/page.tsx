'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StripeCardForm from '@/components/StripeCardForm';
import SeatMapModal, {
  type SeatSelection,
  type SeatSelectionsMap,
} from '@/components/SeatMapModal';

export const runtime = 'edge';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

type BagSummary = { quantity: number; weight: string | null };
type SliceSummary = {
  direction: 'outbound' | 'return';
  fareBrand: string | null;
  cabinClass: string;
  baggage: { carryOn: BagSummary; checked: BagSummary };
};

type BaggageService = {
  id: string;
  kind: 'carry_on' | 'checked';
  weight: string | null;
  priceAmount: number;
  priceCurrency: string;
  priceDisplay: string;
  maxQuantity: number;
  scope: 'outbound' | 'return' | 'full_trip';
  scopeLabel: string;
  passengerIds: string[];
  segmentIds: string[];
  maxLengthCm: number | null;
};

type ExperienceService = {
  id: string;
  kind: 'meal' | 'wifi';
  label: string;           // e.g. "Chef-curated meal"
  tagline: string | null;  // secondary text
  priceAmount: number;
  priceCurrency: string;
  priceDisplay: string;
  scope: 'outbound' | 'return' | 'full_trip';
  scopeLabel: string;
  passengerIds: string[];
  segmentIds: string[];
};

type OfferData = {
  id: string;
  airline: string;
  airlineCode: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureAt: string | null;
  arrivalAt: string | null;
  durationOut: number;
  stopsOut: number;
  hasReturn: boolean;
  returnDepartureAt: string | null;
  returnArrivalAt: string | null;
  durationBack: number;
  stopsBack: number;
  passengerCount: number;
  passengers: { id: string; type: string }[];
  currency: string;
  basePerPerson: number;
  pricing: { airline: number; markup: number; total: number; display: string };
  totalForAll: number;
  refundable: boolean;
  changeable: boolean;
  cabinClass: string;
  slices: SliceSummary[];
  availableServices: {
    baggage: BaggageService[];
    experience: ExperienceService[];
  };
  expiresAt: string | null;
};

type PassengerForm = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female' | 'undisclosed' | '';
  email: string;
  phone: string;
};

type FieldErrors = Partial<Record<keyof PassengerForm, string>>;

type CheckoutStep = 'passengers' | 'payment' | 'processing' | 'confirmed';

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function fmtTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDuration(mins: number): string {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function stopsLabel(n: number): string {
  return n === 0 ? 'Direct' : n === 1 ? '1 stop' : `${n} stops`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z\s'-]{2,}$/;

function validatePassenger(p: PassengerForm, isLead: boolean, paxType?: string): FieldErrors {
  const err: FieldErrors = {};
  if (!NAME_RE.test(p.firstName.trim())) err.firstName = 'Enter a valid first name (as on passport)';
  if (!NAME_RE.test(p.lastName.trim())) err.lastName = 'Enter a valid last name (as on passport)';
  if (!p.dob || !/^\d{4}-\d{2}-\d{2}$/.test(p.dob)) {
    err.dob = 'Enter date of birth (YYYY-MM-DD)';
  } else {
    const ageYears = (Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 0 || ageYears > 120) {
      err.dob = 'Enter a valid date of birth';
    } else if (paxType === 'adult' && ageYears < 18) {
      err.dob = 'Adults must be 18 or older';
    } else if (paxType === 'child' && (ageYears < 2 || ageYears >= 12)) {
      err.dob = 'Children must be aged 2–11';
    } else if (paxType === 'infant_without_seat' && ageYears >= 2) {
      err.dob = 'Infants must be under 2';
    }
  }
  if (!p.gender) err.gender = 'Select gender';
  if (isLead) {
    if (!EMAIL_RE.test(p.email.trim())) err.email = 'Enter a valid email address';
    if (!p.phone.trim() || p.phone.trim().length < 7) err.phone = 'Enter a valid phone number';
  }
  return err;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto px-5 pt-36 pb-16 animate-pulse">
      <div className="h-8 w-64 bg-[#E8ECF4] rounded-xl mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="h-48 bg-[#F1F3F7] rounded-2xl" />
          <div className="h-48 bg-[#F1F3F7] rounded-2xl" />
        </div>
        <div className="h-64 bg-[#F1F3F7] rounded-2xl" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLIGHT SUMMARY CARD (reused in form + confirmation)
   ═══════════════════════════════════════════════════════════════════════════ */

function FlightSummary({ offer, compact }: { offer: OfferData; compact?: boolean }) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <img
          src={`https://pics.avs.io/60/60/${offer.airlineCode}.png`}
          alt={offer.airline}
          className="w-8 h-8 object-contain rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <div className="font-poppins font-bold text-[.85rem] text-[#1A1D2B]">{offer.airline}</div>
          {!compact && <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.cabinClass}</div>}
        </div>
      </div>
      <div className="flex items-center gap-4 text-[.78rem]">
        <div>
          <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.departureAt)}</div>
          <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.origin}</div>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="text-[.62rem] text-[#8E95A9] font-semibold">{fmtDuration(offer.durationOut)}</div>
          <div className="w-full h-px bg-[#D1D5DB]" />
          <span className={`text-[.58rem] font-black uppercase ${offer.stopsOut === 0 ? 'text-green-600' : 'text-orange-500'}`}>
            {stopsLabel(offer.stopsOut)}
          </span>
        </div>
        <div>
          <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.arrivalAt)}</div>
          <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.destination}</div>
        </div>
      </div>
      <div className="text-[.65rem] text-[#8E95A9] font-semibold mt-2">{fmtDate(offer.departureAt)}</div>
      {offer.hasReturn && (
        <div className="border-t border-[#F1F3F7] mt-3 pt-3 flex items-center gap-4 text-[.78rem]">
          <div>
            <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.returnDepartureAt)}</div>
            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.destination}</div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <div className="text-[.62rem] text-[#8E95A9] font-semibold">{fmtDuration(offer.durationBack)}</div>
            <div className="w-full h-px bg-[#D1D5DB]" />
            <span className={`text-[.58rem] font-black uppercase ${offer.stopsBack === 0 ? 'text-green-600' : 'text-orange-500'}`}>
              {stopsLabel(offer.stopsBack)}
            </span>
          </div>
          <div>
            <div className="font-poppins font-black text-[#1A1D2B]">{fmtTime(offer.returnArrivalAt)}</div>
            <div className="text-[.65rem] text-[#8E95A9] font-semibold">{offer.origin}</div>
          </div>
          <div className="text-[.65rem] text-[#8E95A9] font-semibold">{fmtDate(offer.returnDepartureAt)}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHAT'S INCLUDED — premium fare-inclusions panel
   ───────────────────────────────────────────────────────────────────────────
   Renders per-slice (outbound + return) fare brand, cabin class, carry-on
   and checked baggage with preformatted weight (e.g. "23kg") sourced from
   Duffel. Uses Playfair Display with tight tracking for the editorial feel
   requested, emerald for "Included" states, subtle gold accent for the
   fare brand pill.
   ═══════════════════════════════════════════════════════════════════════════ */

function BagRow({
  iconClass,
  label,
  kind,
  quantity,
  weight,
}: {
  iconClass: string;
  label: string;
  kind: 'carry_on' | 'checked';
  quantity: number;
  weight: string | null;
}) {
  // Three states:
  //   1. quantity > 0  → "N {label}(s) · up to 23kg"   (Included, emerald)
  //   2. quantity = 0, weight set, kind=carry_on → "Personal item only · up to 10kg"
  //        (Duffel occasionally returns an underseat/personal-item allowance
  //         with quantity=0 on Light/Basic fares — we must NOT render this as
  //         a bare "10kg" orphan because the customer reads that as "a bag")
  //   3. quantity = 0 otherwise → "{label} not included"  (grey, em-dash)
  const hasBag = quantity > 0;
  const isPersonalItemOnly = !hasBag && kind === 'carry_on' && !!weight;
  const shownAsIncluded = hasBag || isPersonalItemOnly;

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          shownAsIncluded ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F7] text-[#8E95A9]'
        }`}
      >
        <i
          className={`fa-solid ${isPersonalItemOnly ? 'fa-bag-shopping' : iconClass} text-[.78rem]`}
          aria-hidden
        />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[.82rem] font-semibold text-[#1A1D2B] leading-tight">
          {hasBag && (
            <>
              {quantity} {label}
              {quantity > 1 ? 's' : ''}
              {weight && (
                <span className="text-[#5C6378] font-semibold"> &middot; up to {weight}</span>
              )}
            </>
          )}
          {isPersonalItemOnly && (
            <>
              Personal item only
              <span className="text-[#5C6378] font-semibold"> &middot; up to {weight}</span>
            </>
          )}
          {!shownAsIncluded && (
            <span className="text-[#8E95A9]">{label} not included</span>
          )}
        </div>
      </div>
      <span
        className={`text-[.62rem] font-black uppercase tracking-[1.5px] ${
          shownAsIncluded ? 'text-emerald-700' : 'text-[#8E95A9]'
        }`}
      >
        {shownAsIncluded ? 'Included' : '—'}
      </span>
    </div>
  );
}

function IncludedPanel({
  slices,
  refundable,
  changeable,
  compact,
}: {
  slices: SliceSummary[];
  refundable: boolean;
  changeable: boolean;
  compact?: boolean;
}) {
  if (!slices || slices.length === 0) return null;

  return (
    <div
      className={`bg-white border border-[#E8ECF4] rounded-2xl ${compact ? 'p-4' : 'p-6'} shadow-[0_2px_20px_rgba(10,22,40,0.04)]`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-[var(--font-playfair)] font-black text-[#0a1628] tracking-tight"
          style={{ fontSize: compact ? '1.05rem' : '1.2rem' }}
        >
          What&apos;s included with your fare
        </h3>
        <span className="text-[.58rem] font-black uppercase tracking-[2px] text-[#8E95A9]">
          Fare details
        </span>
      </div>

      <div className="space-y-4">
        {slices.map((s, idx) => (
          <div
            key={idx}
            className={idx > 0 ? 'pt-4 border-t border-[#F1F3F7]' : ''}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[.6rem] font-black uppercase tracking-[2px] text-[#8E95A9]">
                  {s.direction === 'outbound' ? 'Outbound' : 'Return'}
                </span>
                <span className="text-[.78rem] font-bold text-[#1A1D2B]">
                  {s.cabinClass}
                </span>
              </div>
              {s.fareBrand && s.fareBrand.toLowerCase() !== s.cabinClass.toLowerCase() && (
                <span className="inline-flex items-center gap-1 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#8a6d00] text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-0.5 rounded-full">
                  {s.fareBrand}
                </span>
              )}
            </div>

            <BagRow
              iconClass="fa-briefcase"
              label="Carry-on bag"
              kind="carry_on"
              quantity={s.baggage.carryOn.quantity}
              weight={s.baggage.carryOn.weight}
            />
            <BagRow
              iconClass="fa-suitcase-rolling"
              label="Checked bag"
              kind="checked"
              quantity={s.baggage.checked.quantity}
              weight={s.baggage.checked.weight}
            />
          </div>
        ))}

        {/* Global fare conditions — refund + change */}
        <div className="pt-4 border-t border-[#F1F3F7] grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                refundable ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F7] text-[#8E95A9]'
              }`}
            >
              <i
                className={`fa-solid ${refundable ? 'fa-rotate-left' : 'fa-ban'} text-[.7rem]`}
                aria-hidden
              />
            </span>
            <span className="text-[.72rem] font-semibold text-[#1A1D2B]">
              {refundable ? 'Refundable' : 'Non-refundable'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                changeable ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F7] text-[#8E95A9]'
              }`}
            >
              <i
                className={`fa-solid ${changeable ? 'fa-pen-to-square' : 'fa-lock'} text-[.7rem]`}
                aria-hidden
              />
            </span>
            <span className="text-[.72rem] font-semibold text-[#1A1D2B]">
              {changeable ? 'Changeable' : 'Non-changeable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD EXTRAS CARD — Phase 2a: baggage ancillaries from Duffel
   ───────────────────────────────────────────────────────────────────────────
   Renders available_services (baggage only for Phase 2a) grouped under
   "Essential". Ghost-to-emerald toggle per service; no checkboxes.
   Pass-through pricing (no markup) — CMA drip-pricing guidance.
   ═══════════════════════════════════════════════════════════════════════════ */

function PassengerLabel({
  passengerIds,
  allPassengers,
  passengerForms,
}: {
  passengerIds: string[];
  allPassengers: { id: string; type: string }[];
  passengerForms: PassengerForm[];
}) {
  const names = passengerIds
    .map((pid) => {
      const idx = allPassengers.findIndex((p) => p.id === pid);
      if (idx < 0) return null;
      const form = passengerForms[idx];
      const full = `${form?.firstName || ''} ${form?.lastName || ''}`.trim();
      return full || `Passenger ${idx + 1}`;
    })
    .filter(Boolean) as string[];
  if (names.length === 0) return null;
  if (names.length === 1) return <>{names[0]}</>;
  if (names.length === allPassengers.length) return <>All passengers</>;
  return <>{names.join(', ')}</>;
}

function ExtraRow({
  svc,
  selected,
  onToggle,
  allPassengers,
  passengerForms,
}: {
  svc: BaggageService;
  selected: boolean;
  onToggle: () => void;
  allPassengers: { id: string; type: string }[];
  passengerForms: PassengerForm[];
}) {
  const iconClass = svc.kind === 'checked' ? 'fa-suitcase-rolling' : 'fa-briefcase';
  const kindLabel = svc.kind === 'checked' ? 'Checked bag' : 'Carry-on bag';

  return (
    <div
      className={`flex items-center gap-3 border rounded-xl p-3 transition-all duration-300 ease-out ${
        selected
          ? 'border-emerald-300 bg-emerald-50/40 shadow-[0_2px_10px_rgba(16,185,129,0.08)]'
          : 'border-[#E8ECF4] bg-white hover:border-[#C8D0E0]'
      }`}
    >
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
          selected ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F1F3F7] text-[#5C6378]'
        }`}
      >
        <i className={`fa-solid ${iconClass} text-[.85rem]`} aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[.85rem] font-bold text-[#1A1D2B] leading-tight">
          {kindLabel}
          {svc.weight && (
            <span className="text-[#5C6378] font-semibold"> &middot; up to {svc.weight}</span>
          )}
        </div>
        <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5 truncate">
          <span className="text-[#5C6378]">{svc.scopeLabel}</span>
          <span className="mx-1.5">&middot;</span>
          <PassengerLabel
            passengerIds={svc.passengerIds}
            allPassengers={allPassengers}
            passengerForms={passengerForms}
          />
          {svc.maxLengthCm && (
            <>
              <span className="mx-1.5">&middot;</span>
              <span>max {svc.maxLengthCm}cm</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div
            className={`font-[var(--font-playfair)] font-black text-[.98rem] tracking-tight ${
              selected ? 'text-emerald-700' : 'text-[#1A1D2B]'
            }`}
          >
            {svc.priceDisplay}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${kindLabel} from order` : `Add ${kindLabel} to order`}
          className={`relative inline-flex items-center gap-1.5 font-poppins font-bold text-[.72rem] px-3.5 py-1.5 rounded-full transition-all duration-300 ease-out ${
            selected
              ? 'bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:bg-emerald-700'
              : 'bg-white border border-[#C8D0E0] text-[#1A1D2B] hover:border-[#0a1628] hover:text-[#0a1628]'
          }`}
        >
          <i
            className={`fa-solid ${selected ? 'fa-check' : 'fa-plus'} text-[.7rem]`}
            aria-hidden
          />
          {selected ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function AddExtrasCard({
  services,
  selectedIds,
  onToggle,
  allPassengers,
  passengerForms,
}: {
  services: BaggageService[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  allPassengers: { id: string; type: string }[];
  passengerForms: PassengerForm[];
}) {
  // Empty state — the fare already covers it.
  if (!services || services.length === 0) {
    return (
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-[0_2px_20px_rgba(10,22,40,0.04)]">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <i className="fa-solid fa-circle-check text-[.95rem]" aria-hidden />
          </span>
          <div>
            <h3 className="font-[var(--font-playfair)] font-black text-[1.05rem] text-[#0a1628] tracking-tight leading-tight">
              Your fare includes everything you need
            </h3>
            <p className="text-[.72rem] text-[#5C6378] font-semibold mt-0.5">
              No extra baggage required on this fare.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 md:p-6 shadow-[0_2px_20px_rgba(10,22,40,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-[var(--font-playfair)] font-black text-[1.2rem] text-[#0a1628] tracking-tight">
            Add extras
          </h3>
          <p className="text-[.72rem] text-[#5C6378] font-semibold mt-0.5">
            Pre-book at the airline&apos;s own price. No booking fees, no markup.
          </p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#8a6d00] text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-1 rounded-full">
          <i className="fa-solid fa-star text-[.62rem]" aria-hidden /> Essential
        </span>
      </div>

      <div className="space-y-2.5">
        {services.map((svc) => (
          <ExtraRow
            key={svc.id}
            svc={svc}
            selected={selectedIds.has(svc.id)}
            onToggle={() => onToggle(svc.id)}
            allPassengers={allPassengers}
            passengerForms={passengerForms}
          />
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F1F3F7] flex items-center gap-2 text-[.66rem] text-[#8E95A9] font-semibold">
        <i className="fa-solid fa-lock text-[.72rem]" aria-hidden />
        Extras are added to your total at the airline&apos;s price. We don&apos;t mark them up.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPERIENCE CARD — Phase 2c. Meals + Wi-Fi as "victory lap" on the same
   ghost-to-emerald toggle pattern. Same pipeline (selectedServiceIds)
   handles baggage and experience uniformly, so nothing downstream changes.
   ═══════════════════════════════════════════════════════════════════════════ */

function ExperienceRow({
  svc,
  selected,
  onToggle,
  allPassengers,
  passengerForms,
}: {
  svc: ExperienceService;
  selected: boolean;
  onToggle: () => void;
  allPassengers: { id: string; type: string }[];
  passengerForms: PassengerForm[];
}) {
  const iconClass = svc.kind === 'wifi' ? 'fa-wifi' : 'fa-utensils';

  return (
    <div
      className={`flex items-center gap-3 border rounded-xl p-3 transition-all duration-300 ease-out ${
        selected
          ? 'border-emerald-300 bg-emerald-50/40 shadow-[0_2px_10px_rgba(16,185,129,0.08)]'
          : 'border-[#E8ECF4] bg-white hover:border-[#C8D0E0]'
      }`}
    >
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
          selected ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F1F3F7] text-[#5C6378]'
        }`}
      >
        <i className={`fa-solid ${iconClass} text-[.85rem]`} aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[.85rem] font-bold text-[#1A1D2B] leading-tight">
          {svc.label}
        </div>
        <div className="text-[.68rem] text-[#8E95A9] font-semibold mt-0.5 truncate">
          <span className="text-[#5C6378]">{svc.scopeLabel}</span>
          <span className="mx-1.5">&middot;</span>
          <PassengerLabel
            passengerIds={svc.passengerIds}
            allPassengers={allPassengers}
            passengerForms={passengerForms}
          />
          {svc.tagline && (
            <>
              <span className="mx-1.5">&middot;</span>
              <span className="italic">{svc.tagline}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`font-[var(--font-playfair)] font-black text-[.98rem] tracking-tight ${
            selected ? 'text-emerald-700' : 'text-[#1A1D2B]'
          }`}
        >
          {svc.priceDisplay}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${svc.label} from order` : `Add ${svc.label} to order`}
          className={`relative inline-flex items-center gap-1.5 font-poppins font-bold text-[.72rem] px-3.5 py-1.5 rounded-full transition-all duration-300 ease-out ${
            selected
              ? 'bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:bg-emerald-700'
              : 'bg-white border border-[#C8D0E0] text-[#1A1D2B] hover:border-[#0a1628] hover:text-[#0a1628]'
          }`}
        >
          <i
            className={`fa-solid ${selected ? 'fa-check' : 'fa-plus'} text-[.7rem]`}
            aria-hidden
          />
          {selected ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function ExperienceCard({
  services,
  selectedIds,
  onToggle,
  allPassengers,
  passengerForms,
}: {
  services: ExperienceService[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  allPassengers: { id: string; type: string }[];
  passengerForms: PassengerForm[];
}) {
  // Quietly absent when the airline offers nothing — zero empty-state clutter.
  if (!services || services.length === 0) return null;

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 md:p-6 shadow-[0_2px_20px_rgba(10,22,40,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-[var(--font-playfair)] font-black text-[1.2rem] text-[#0a1628] tracking-tight">
            Your experience
          </h3>
          <p className="text-[.72rem] text-[#5C6378] font-semibold mt-0.5">
            Meals, Wi-Fi and the small details that make a long flight shorter.
          </p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-1 rounded-full">
          <i className="fa-solid fa-wand-magic-sparkles text-[.62rem]" aria-hidden /> Curated
        </span>
      </div>

      <div className="space-y-2.5">
        {services.map((svc) => (
          <ExperienceRow
            key={svc.id}
            svc={svc}
            selected={selectedIds.has(svc.id)}
            onToggle={() => onToggle(svc.id)}
            allPassengers={allPassengers}
            passengerForms={passengerForms}
          />
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F1F3F7] flex items-center gap-2 text-[.66rem] text-[#8E95A9] font-semibold">
        <i className="fa-solid fa-lock text-[.72rem]" aria-hidden />
        Added to your total at the airline&apos;s price. We don&apos;t mark them up.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMFORT CARD — Phase 2b entry point. Shows current seat selections inline,
   opens the SeatMapModal on click. Uses the same editorial voice as the other
   extras cards (Playfair, emerald accents on selected state).
   ═══════════════════════════════════════════════════════════════════════════ */

function ComfortCard({
  seatSelections,
  allPassengers,
  passengerForms,
  onOpen,
}: {
  seatSelections: SeatSelectionsMap;
  allPassengers: { id: string; type: string }[];
  passengerForms: PassengerForm[];
  onOpen: () => void;
}) {
  const selectionsArray = Array.from(seatSelections.values());
  const hasSelections = selectionsArray.length > 0;
  const subtotal = selectionsArray.reduce((s, sel) => s + sel.priceAmount, 0);

  // Group by passenger for the summary list
  const byPax = new Map<string, typeof selectionsArray>();
  for (const sel of selectionsArray) {
    const arr = byPax.get(sel.passengerId) || [];
    arr.push(sel);
    byPax.set(sel.passengerId, arr);
  }

  return (
    <div
      className={`bg-white border rounded-2xl p-5 md:p-6 shadow-[0_2px_20px_rgba(10,22,40,0.04)] transition-all ${
        hasSelections ? 'border-emerald-200' : 'border-[#E8ECF4]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasSelections
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-[#F1F3F7] text-[#5C6378]'
            }`}
          >
            <i className="fa-solid fa-chair text-[.95rem]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-[var(--font-playfair)] font-black text-[1.2rem] text-[#0a1628] tracking-tight leading-tight">
              Choose your seats
            </h3>
            <p className="text-[.72rem] text-[#5C6378] font-semibold mt-0.5">
              Sit together, by the window, or stretch out with extra legroom.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 bg-[#FBF3DF] border border-[#E8CB85]/50 text-[#6B5318] text-[.58rem] font-black uppercase tracking-[1.5px] px-2 py-1 rounded-full shrink-0">
          <i className="fa-solid fa-star text-[.62rem]" aria-hidden /> Recommended
        </span>
      </div>

      {hasSelections ? (
        <div className="space-y-2">
          {Array.from(byPax.entries()).map(([paxId, sels]) => {
            const idx = allPassengers.findIndex((p) => p.id === paxId);
            const form = passengerForms[idx];
            const name =
              `${form?.firstName || ''} ${form?.lastName || ''}`.trim() ||
              `Passenger ${idx + 1}`;
            return (
              <div
                key={paxId}
                className="flex items-center justify-between gap-3 border border-emerald-100 bg-emerald-50/40 rounded-xl px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[.8rem] font-bold text-[#1A1D2B] truncate">
                    {name}
                  </div>
                  <div className="text-[.68rem] text-[#5C6378] font-semibold">
                    {sels
                      .map(
                        (s) =>
                          `Seat ${s.designator}${
                            s.tier === 'extra_legroom' ? ' · Extra legroom' : ''
                          }`,
                      )
                      .join(' · ')}
                  </div>
                </div>
                <span className="font-[var(--font-playfair)] font-black text-emerald-700 text-[.9rem] tracking-tight shrink-0">
                  {sels.reduce((s, x) => s + x.priceAmount, 0) === 0
                    ? 'Free'
                    : `£${sels.reduce((s, x) => s + x.priceAmount, 0).toFixed(2)}`}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 text-[.75rem] font-bold text-[#0a1628] hover:text-[#0066FF] transition-colors"
            >
              <i className="fa-solid fa-pen-to-square text-[.72rem]" aria-hidden />
              Edit seats
            </button>
            <span className="text-[.7rem] font-semibold text-[#5C6378]">
              Seats subtotal{' '}
              <span className="font-[var(--font-playfair)] font-black text-[#0a1628] text-[.85rem]">
                {subtotal === 0 ? 'Free' : `£${subtotal.toFixed(2)}`}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full group border border-dashed border-[#C8D0E0] hover:border-[#0a1628] hover:bg-[#F8FAFC] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 transition-all"
        >
          <span className="flex items-center gap-2.5 text-[#1A1D2B]">
            <i className="fa-solid fa-plus text-[.78rem] text-[#5C6378] group-hover:text-[#0a1628]" aria-hidden />
            <span className="text-[.8rem] font-bold">Pick your seats</span>
          </span>
          <span className="text-[.66rem] text-[#8E95A9] font-semibold hidden sm:inline">
            Or skip — the airline will assign at check-in
          </span>
          <i className="fa-solid fa-arrow-right text-[.75rem] text-[#5C6378] group-hover:text-[#0a1628] transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-[#F1F3F7] flex items-center gap-2 text-[.66rem] text-[#8E95A9] font-semibold">
        <i className="fa-solid fa-lock text-[.72rem]" aria-hidden />
        Seats are charged at the airline&apos;s price. We don&apos;t mark them up.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP INDICATOR
   ═══════════════════════════════════════════════════════════════════════════ */

function StepIndicator({ current }: { current: CheckoutStep }) {
  const steps: { key: CheckoutStep; label: string }[] = [
    { key: 'passengers', label: 'Passengers' },
    { key: 'payment', label: 'Payment' },
    { key: 'confirmed', label: 'Confirmed' },
  ];

  const getIndex = (s: CheckoutStep) => {
    if (s === 'processing') return 1; // same visual position as payment
    return steps.findIndex(st => st.key === s);
  };

  const currentIdx = getIndex(current);

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx || (current === 'processing' && s.key === 'payment');
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-8 h-px ${isDone ? 'bg-[#0066FF]' : 'bg-[#E8ECF4]'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[.6rem] font-black
                  ${isDone ? 'bg-[#0066FF] text-white' : isActive ? 'bg-[#0066FF] text-white' : 'bg-[#F1F3F7] text-[#8E95A9]'}`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-[.68rem] font-bold ${isActive || isDone ? 'text-[#1A1D2B]' : 'text-[#8E95A9]'}`}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRICE SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════ */

function PriceSidebar({
  offer,
  step,
  onCta,
  ctaDisabled,
  ctaLabel,
  errorMsg,
  selectedServices,
  selectedSeats,
  selectedExperience,
  servicesSubtotal,
  grandTotalAll,
}: {
  offer: OfferData;
  step: CheckoutStep;
  onCta?: () => void;
  ctaDisabled?: boolean;
  ctaLabel?: string;
  errorMsg?: string | null;
  selectedServices: BaggageService[];
  selectedSeats: SeatSelection[];
  selectedExperience: ExperienceService[];
  servicesSubtotal: number;
  grandTotalAll: number;
}) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-28 space-y-4">
        <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-[0_2px_20px_rgba(10,22,40,0.04)]">
          <h3 className="font-[var(--font-playfair)] font-black text-[1.05rem] text-[#0a1628] tracking-tight mb-4">
            Price summary
          </h3>

          <div className="space-y-2.5 text-[.78rem]">
            {/* Scout-secured price — single line, margin baked in. Rationale:
                separating a "JetMeAway fee" primes price pain and makes us
                look more expensive than Trip.com / Expedia who quote the
                all-in ticket price. The margin still lives on the offer
                object (pricing.markup) and is tracked server-side. */}
            <div className="flex justify-between">
              <span className="text-[#5C6378] font-semibold">Flight ({offer.airline})</span>
              <span className="font-bold text-[#1A1D2B]">£{offer.pricing.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C6378] font-semibold">Taxes &amp; provider fees</span>
              <span className="font-bold text-emerald-700">Included</span>
            </div>
            {(() => {
              const slice = offer.slices?.[0];
              if (!slice) return null;
              const carry = slice.baggage.carryOn;
              const checked = slice.baggage.checked;
              const carryHasBag = carry.quantity > 0;
              const carryPersonalOnly = !carryHasBag && !!carry.weight;
              return (
                <>
                  {carryHasBag && (
                    <div className="flex justify-between">
                      <span className="text-[#5C6378] font-semibold">
                        Carry-on{carry.weight ? ` (${carry.weight})` : ''}
                      </span>
                      <span className="font-bold text-emerald-700">Included</span>
                    </div>
                  )}
                  {carryPersonalOnly && (
                    <div className="flex justify-between">
                      <span className="text-[#5C6378] font-semibold">
                        Personal item only ({carry.weight})
                      </span>
                      <span className="font-bold text-emerald-700">Included</span>
                    </div>
                  )}
                  {checked.quantity > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#5C6378] font-semibold">
                        Checked bag{checked.weight ? ` (${checked.weight})` : ''}
                      </span>
                      <span className="font-bold text-emerald-700">Included</span>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="flex justify-between">
              <span className="text-[#5C6378] font-semibold">Scout Protection</span>
              <span className="font-bold text-emerald-700">FREE</span>
            </div>
            <div className="border-t border-[#F1F3F7] pt-2.5 flex justify-between items-baseline">
              <span className="font-[var(--font-playfair)] font-black text-[#0a1628] tracking-tight text-[.95rem]">
                Per person
              </span>
              <span className="font-[var(--font-playfair)] font-black text-emerald-700 text-[1.25rem] tracking-tight">
                {offer.pricing.display}
              </span>
            </div>
            {offer.passengerCount > 1 && (
              <div className="flex justify-between text-[.72rem]">
                <span className="text-[#8E95A9] font-semibold">&times; {offer.passengerCount} passengers</span>
                <span className="font-bold text-[#1A1D2B]">£{offer.totalForAll.toFixed(2)}</span>
              </div>
            )}

            {/* Selected ancillary services — slide in on add, slide out on remove. */}
            {(selectedServices.length > 0 ||
              selectedSeats.length > 0 ||
              selectedExperience.length > 0) && (
              <div className="pt-2.5 mt-2.5 border-t border-[#F1F3F7] space-y-1.5">
                <div className="text-[.58rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1">
                  Extras
                </div>
                {selectedServices.map((svc) => {
                  const kindLabel = svc.kind === 'checked' ? 'Checked bag' : 'Carry-on bag';
                  return (
                    <div
                      key={svc.id}
                      className="extras-slide-in flex justify-between items-baseline text-[.78rem]"
                    >
                      <span className="text-[#1A1D2B] font-semibold truncate pr-2">
                        + {kindLabel}
                        {svc.weight && <span className="text-[#5C6378]"> ({svc.weight})</span>}
                        <span className="text-[#8E95A9]"> · {svc.scopeLabel}</span>
                      </span>
                      <span className="font-[var(--font-playfair)] font-black text-emerald-700 tracking-tight shrink-0">
                        {svc.priceDisplay}
                      </span>
                    </div>
                  );
                })}
                {selectedSeats.map((seat) => (
                  <div
                    key={`${seat.segmentId}:${seat.passengerId}`}
                    className="extras-slide-in flex justify-between items-baseline text-[.78rem]"
                  >
                    <span className="text-[#1A1D2B] font-semibold truncate pr-2">
                      + Seat {seat.designator}
                      {seat.tier === 'extra_legroom' && (
                        <span className="text-[#5C6378]"> (Extra legroom)</span>
                      )}
                    </span>
                    <span className="font-[var(--font-playfair)] font-black text-emerald-700 tracking-tight shrink-0">
                      {seat.priceAmount === 0 ? 'Free' : seat.priceDisplay}
                    </span>
                  </div>
                ))}
                {selectedExperience.map((svc) => (
                  <div
                    key={svc.id}
                    className="extras-slide-in flex justify-between items-baseline text-[.78rem]"
                  >
                    <span className="text-[#1A1D2B] font-semibold truncate pr-2">
                      + {svc.label}
                      <span className="text-[#8E95A9]"> · {svc.scopeLabel}</span>
                    </span>
                    <span className="font-[var(--font-playfair)] font-black text-emerald-700 tracking-tight shrink-0">
                      {svc.priceDisplay}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-[.72rem] pt-1.5">
                  <span className="text-[#5C6378] font-semibold">Extras subtotal</span>
                  <span className="font-bold text-[#1A1D2B]">£{servicesSubtotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Grand total — only visible when it differs from Per person
                (i.e. multi-pax OR ancillaries selected). */}
            {(offer.passengerCount > 1 ||
              selectedServices.length > 0 ||
              selectedSeats.length > 0 ||
              selectedExperience.length > 0) && (
              <div className="pt-2.5 mt-1 border-t border-[#0a1628]/10 flex justify-between items-baseline">
                <span className="font-[var(--font-playfair)] font-black text-[#0a1628] tracking-tight text-[1rem]">
                  Total to pay
                </span>
                <span className="font-[var(--font-playfair)] font-black text-emerald-700 text-[1.35rem] tracking-tight">
                  £{grandTotalAll.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Slide-in keyframes — subtle ease-out, ~280ms, translate + fade. */}
          <style>{`
            @keyframes extras-slide-in {
              0%   { opacity: 0; transform: translateY(-6px); max-height: 0; }
              100% { opacity: 1; transform: translateY(0);    max-height: 48px; }
            }
            .extras-slide-in {
              animation: extras-slide-in 280ms cubic-bezier(0.22, 1, 0.36, 1);
              will-change: opacity, transform;
            }
          `}</style>

          {/* CTA — only on passenger step */}
          {step === 'passengers' && onCta && (
            <>
              <button
                onClick={onCta}
                disabled={ctaDisabled}
                className="w-full mt-5 bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white font-poppins font-bold text-[.85rem] px-6 py-3 rounded-xl transition-all shadow-[0_4px_16px_rgba(0,102,255,0.2)]"
              >
                {ctaLabel || 'Continue to Payment →'}
              </button>
              {errorMsg && (
                <p className="text-[.65rem] text-red-500 font-semibold text-center mt-2">{errorMsg}</p>
              )}
            </>
          )}
        </div>

        {/* Trust badges */}
        <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4">
          <div className="space-y-2 text-[.68rem] font-semibold text-[#5C6378]">
            <div className="flex items-center gap-2">
              <span className="text-green-600">🔒</span> Secure checkout — SSL encrypted
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span> Prices include all taxes &amp; fees
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span> Instant e-ticket confirmation
            </div>
            {step === 'payment' && (
              <div className="flex items-center gap-2">
                <span className="text-green-600">💳</span> Powered by Stripe via Duffel
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKOUT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();

  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passenger forms
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [errors, setErrors] = useState<FieldErrors[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Step management
  const [step, setStep] = useState<CheckoutStep>('passengers');

  // Payment state — Stripe merchant-of-record
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Safe-checkout acknowledgement (non-refundable flights only)
  const [fareAcknowledged, setFareAcknowledged] = useState(false);

  // Phase 2a — selected ancillary service IDs (baggage for now).
  // Quantity is always 1 per selected ID; Duffel's model is one service-id
  // per (pax × scope × kind) so multiple bags = multiple IDs, not qty > 1.
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  // Stale-offer warning: shown when the pre-submit refetch drops a selected ID.
  const [staleServiceWarning, setStaleServiceWarning] = useState<string | null>(null);

  // Phase 2b — seat selections. Keyed by `${segmentId}:${passengerId}`.
  // Seat service IDs live alongside baggage IDs in the final booking payload,
  // but we track them separately here because their shape (per-segment,
  // per-passenger) differs from fare-level baggage services.
  const [seatSelections, setSeatSelections] = useState<SeatSelectionsMap>(
    () => new Map<string, SeatSelection>(),
  );
  const [seatModalOpen, setSeatModalOpen] = useState(false);

  // Order state
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    bookingReference: string;
    documentsUrl: string | null;
    emailSent: boolean;
    totalPerPerson: number;
    totalAll: number;
  } | null>(null);

  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // ── Fetch offer ──
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/offers/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setOffer(data.offer);
          const count = data.offer.passengerCount || 1;
          setPassengers(
            Array.from({ length: count }, () => ({
              firstName: '',
              lastName: '',
              dob: '',
              gender: '' as const,
              email: '',
              phone: '',
            }))
          );
          setErrors(Array.from({ length: count }, () => ({})));
        }
      })
      .catch(() => setError('Failed to load offer. Please try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Phase 2a: selected services derived state ──
  const availableBaggageServices = offer?.availableServices?.baggage || [];
  const selectedServices = availableBaggageServices.filter((s) => selectedServiceIds.has(s.id));
  const baggageSubtotal = selectedServices.reduce((sum, s) => sum + s.priceAmount, 0);

  // ── Phase 2b: seat services ──
  const selectedSeatArray = Array.from(seatSelections.values()).filter(
    (s) => s.serviceId && s.priceAmount > 0,
  );
  const seatSubtotal = selectedSeatArray.reduce((sum, s) => sum + s.priceAmount, 0);

  // ── Phase 2c: experience services (meals, wifi) ──
  // Shares the same `selectedServiceIds` pool as baggage — downstream
  // booking payload and Stripe metadata treat them identically.
  const availableExperienceServices = offer?.availableServices?.experience || [];
  const selectedExperienceServices = availableExperienceServices.filter((s) =>
    selectedServiceIds.has(s.id),
  );
  const experienceSubtotal = selectedExperienceServices.reduce(
    (sum, s) => sum + s.priceAmount,
    0,
  );

  // Combined ancillary subtotal — used by sidebar, Stripe metadata, drift check.
  const servicesSubtotal = baggageSubtotal + seatSubtotal + experienceSubtotal;
  const grandTotalAll = (offer?.totalForAll || 0) + servicesSubtotal;

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Clear stale warning the moment the user re-engages with the card
    setStaleServiceWarning(null);
  }, []);

  // Update a passenger field
  const updateField = useCallback((idx: number, field: keyof PassengerForm, value: string) => {
    setPassengers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    setErrors(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: undefined };
      return copy;
    });
  }, []);

  // ── Build Duffel passenger array (shared by payment + order) ──
  // Lead passenger (contact email/phone) is the first ADULT in the offer.
  // The server ({@link /api/flights/book}) links infants to adults via
  // `infant_passenger_id` using the `type` we pass here.
  const leadIdx = offer
    ? Math.max(0, offer.passengers.findIndex((p) => p.type === 'adult'))
    : 0;
  const buildDuffelPassengers = useCallback(() => {
    if (!offer) return [];
    return passengers.map((p, i) => ({
      id: offer.passengers[i]?.id,
      type: offer.passengers[i]?.type, // 'adult' | 'child' | 'infant_without_seat'
      given_name: p.firstName.trim(),
      family_name: p.lastName.trim(),
      born_on: p.dob,
      gender: p.gender || 'undisclosed',
      ...(i === leadIdx ? { email: p.email.trim(), phone: p.phone.trim() } : {}),
    }));
  }, [offer, passengers, leadIdx]);

  // ── Step 1: Validate passengers → create payment intent → go to step 2 ──
  const handleContinueToPayment = async () => {
    if (!offer || paymentLoading) return;

    // Validate
    const newErrors = passengers.map((p, i) =>
      validatePassenger(p, i === leadIdx, offer?.passengers[i]?.type),
    );
    setErrors(newErrors);
    setSubmitted(true);

    const hasErrors = newErrors.some(e => Object.keys(e).length > 0);
    if (hasErrors) return;

    setPaymentLoading(true);
    setPaymentError(null);
    setStaleServiceWarning(null);

    try {
      /* ── Stale-offer guard ──────────────────────────────────────────────
         If the user selected any ancillaries, re-hit the offer API to make
         sure those service IDs still exist at the same price. Duffel offers
         expire + repricing can drop a service silently; submitting a stale
         ID returns a 4xx after payment which is exactly what we refuse to
         let happen. Banner + no Stripe intent if anything changed.
      ─────────────────────────────────────────────────────────────────── */
      if (selectedServiceIds.size > 0) {
        const freshRes = await fetch(`/api/offers/${offer.id}`);
        const freshJson = await freshRes.json();
        if (!freshRes.ok || freshJson.error) {
          setPaymentError(freshJson.error || 'Offer is no longer available.');
          return;
        }
        const freshBaggage: BaggageService[] = freshJson.offer?.availableServices?.baggage || [];
        const freshExperience: ExperienceService[] =
          freshJson.offer?.availableServices?.experience || [];
        // Union of all available IDs — one comparison pool for baggage + experience.
        const freshIds = new Set<string>([
          ...freshBaggage.map((s) => s.id),
          ...freshExperience.map((s) => s.id),
        ]);
        // Track dropped/repriced with a shared shape to keep the banner copy simple.
        type AncillaryLike = { id: string; priceAmount: number };
        const dropped: AncillaryLike[] = [];
        const repriced: { svc: AncillaryLike; fresh: AncillaryLike }[] = [];
        const freshAll: AncillaryLike[] = [...freshBaggage, ...freshExperience];
        for (const svc of [...selectedServices, ...selectedExperienceServices]) {
          const match = freshAll.find((s) => s.id === svc.id);
          if (!match) dropped.push(svc);
          else if (match.priceAmount !== svc.priceAmount) repriced.push({ svc, fresh: match });
        }

        if (dropped.length > 0 || repriced.length > 0) {
          // Update the offer with fresh service data so prices re-render,
          // and drop any IDs that no longer exist.
          setOffer({
            ...offer,
            availableServices: { baggage: freshBaggage, experience: freshExperience },
          });
          setSelectedServiceIds((prev) => {
            const next = new Set<string>();
            for (const id of prev) if (freshIds.has(id)) next.add(id);
            return next;
          });
          const msgParts: string[] = [];
          if (dropped.length) {
            msgParts.push(
              `${dropped.length === 1 ? 'One extra' : `${dropped.length} extras`} is no longer available`,
            );
          }
          if (repriced.length) {
            msgParts.push(
              `${repriced.length === 1 ? 'one extra' : `${repriced.length} extras`} changed price`,
            );
          }
          setStaleServiceWarning(
            `${msgParts.join(' and ')}. We&apos;ve refreshed the options above — please review before paying.`,
          );
          return;
        }
      }

      // Merchant-of-record: create a Stripe PaymentIntent on OUR account.
      // Amount MUST be in minor units (pence) for Stripe.
      // Total = base offer (with markup) + ancillary services at cost.
      const amountPence = Math.round(grandTotalAll * 100);
      // Combine baggage + seat service IDs — Stripe metadata is the source of
      // truth for post-mortem refund reconciliation if booking fails.
      const seatServiceIds = selectedSeatArray
        .map((s) => s.serviceId)
        .filter(Boolean);
      const serviceIdsList = [
        ...Array.from(selectedServiceIds),
        ...seatServiceIds,
      ];

      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPence,
          currency: (offer.currency || 'GBP').toLowerCase(),
          offerId: offer.id,
          // Stripe metadata — service IDs for post-mortem reconciliation
          // if booking fails after payment succeeds.
          serviceIds: serviceIdsList,
          servicesSubtotalPence: Math.round(servicesSubtotal * 100),
          sessionId: typeof window !== 'undefined' ? (localStorage.getItem('jma_sid') || 'anon') : 'anon',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setPaymentError(data.error || 'Failed to initialise payment. Please try again.');
        return;
      }

      setPaymentClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setStep('payment');

      // Scroll to payment section after render
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch {
      setPaymentError('Something went wrong. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Step 2b: Payment succeeded → create order ──
  const handlePaymentSuccess = async () => {
    if (!offer || !paymentIntentId) return;

    setStep('processing');
    setOrderLoading(true);
    setOrderError(null);

    try {
      const duffelPassengers = buildDuffelPassengers();

      // Call the merchant-of-record orchestrator.
      // It verifies the Stripe charge, writes a pending booking, re-quotes,
      // checks balance, then issues a Duffel balance order. Refunds on any
      // downstream failure.
      // Duffel expects services: [{ id, quantity }]. We always send quantity=1
      // because Duffel's model is one service-id per (pax × scope × kind) —
      // two bags means two service IDs, not quantity=2.
      const serviceBookingPayload = [
        ...selectedServices.map((s) => ({ id: s.id, quantity: 1 })),
        ...selectedSeatArray.map((s) => ({ id: s.serviceId, quantity: 1 })),
      ];

      const res = await fetch('/api/flights/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.id,
          passengers: duffelPassengers,
          paymentIntentId,
          services: serviceBookingPayload,
          destination: offer.destinationCity || offer.destination,
          departureDate: offer.departureAt,
          returnDate: offer.returnDepartureAt,
          title: `${offer.airline} ${offer.origin} → ${offer.destination}`,
          sessionId: typeof window !== 'undefined' ? (localStorage.getItem('jma_sid') || 'anon') : 'anon',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setOrderError(data.error || 'Booking failed. Please contact support.');
        setStep('payment'); // allow retry / show refund notice
        return;
      }

      setConfirmation({
        bookingReference: data.bookingReference,
        documentsUrl: null,
        emailSent: false,
        totalPerPerson: offer.pricing.total,
        totalAll: grandTotalAll,
      });
      setStep('confirmed');
    } catch {
      setOrderError('An unexpected error occurred. Please contact support.');
      setStep('payment');
    } finally {
      setOrderLoading(false);
    }
  };

  // ── Step 2c: Payment failed ──
  const handlePaymentFailure = (message: string) => {
    console.error('Payment failed:', message);
    setPaymentError(message || 'Your card was declined. Please try a different card.');
  };

  // ── Go back to passenger step ──
  const handleBackToPassengers = () => {
    setStep('passengers');
    setPaymentError(null);
    setOrderError(null);
  };

  return (
    <>
      <Header />

      {loading && <LoadingSkeleton />}

      {error && !loading && (
        <div className="max-w-[860px] mx-auto px-5 pt-36 pb-16">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <span className="text-3xl mb-3 block">⏰</span>
            <h2 className="font-poppins font-black text-[1.1rem] text-[#1A1D2B] mb-2">Offer Expired</h2>
            <p className="text-[.82rem] text-[#5C6378] font-semibold mb-5">{error}</p>
            <a
              href="/flights"
              className="inline-block bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.82rem] px-6 py-2.5 rounded-xl transition-all"
            >
              Search Again →
            </a>
          </div>
        </div>
      )}

      {/* ═══════════════ CONFIRMED ═══════════════ */}
      {!loading && !error && offer && step === 'confirmed' && confirmation && (
        <div className="max-w-[680px] mx-auto px-5 pt-36 pb-16">
          {/* Success banner */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-3xl p-8 text-center mb-6 shadow-[0_8px_32px_rgba(22,163,74,0.25)]">
            <div className="text-5xl mb-3">✓</div>
            <h1 className="font-poppins font-black text-[1.6rem] text-white mb-1">Booking Confirmed!</h1>
            <p className="text-[.82rem] text-white/80 font-semibold">Your e-ticket will be sent by the airline shortly.</p>
          </div>

          {/* Booking reference */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 mb-4 text-center">
            <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-1">Booking Reference</div>
            <div className="font-poppins font-black text-[1.5rem] text-[#1A1D2B] tracking-[2px]">
              {confirmation.bookingReference}
            </div>
          </div>

          {/* Flight summary */}
          <div className="mb-4">
            <FlightSummary offer={offer} compact />
          </div>

          {/* Price paid */}
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 mb-4">
            <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-3">Total Paid</div>
            <div className="flex justify-between items-baseline">
              <span className="text-[.78rem] text-[#5C6378] font-semibold">
                {offer.passengerCount > 1 ? `${offer.passengerCount} passengers` : '1 passenger'}
              </span>
              <span className="font-poppins font-black text-[1.3rem] text-green-600">
                £{confirmation.totalAll.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Email + Documents info */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 space-y-2.5">
            {confirmation.emailSent && (
              <div className="flex items-center gap-2 text-[.78rem] text-blue-700 font-semibold">
                <span>✉</span> Confirmation email sent to {passengers[leadIdx]?.email}
              </div>
            )}
            {confirmation.documentsUrl && (
              <div className="flex items-center gap-2 text-[.78rem] text-blue-700 font-semibold">
                <span>📄</span>
                <a
                  href={confirmation.documentsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  Download your e-ticket (PDF)
                </a>
              </div>
            )}
            {!confirmation.emailSent && !confirmation.documentsUrl && (
              <div className="text-[.78rem] text-blue-700 font-semibold">
                Your airline will send your e-ticket via email shortly.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/flights"
              className="flex-1 text-center bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.82rem] px-6 py-3 rounded-xl transition-all"
            >
              Search More Flights
            </a>
            <a
              href="/"
              className="flex-1 text-center bg-white border border-[#E8ECF4] hover:border-[#0066FF] text-[#1A1D2B] font-poppins font-bold text-[.82rem] px-6 py-3 rounded-xl transition-all"
            >
              Back to Home
            </a>
          </div>
        </div>
      )}

      {/* ═══════════════ PASSENGERS + PAYMENT STEPS ═══════════════ */}
      {!loading && !error && offer && step !== 'confirmed' && (
        <div className="max-w-[1100px] mx-auto px-5 pt-36 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[.72rem] font-semibold text-[#8E95A9] mb-4">
            <a href="/flights" className="hover:text-[#0066FF]">Flights</a>
            <span>›</span>
            <span className="text-[#1A1D2B]">Checkout</span>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            {/* ── Left column ── */}
            <div className="space-y-5">

              {/* ═══ STEP 1: Passenger Details ═══ */}
              {step === 'passengers' && (
                <>
                  <h1 className="font-[var(--font-playfair)] font-black text-[1.7rem] md:text-[2rem] text-[#0a1628] tracking-tight mb-1">
                    Who&apos;s flying?
                  </h1>
                  <p className="text-[.8rem] text-[#5C6378] font-semibold mb-2">
                    Enter details exactly as they appear on each passenger&apos;s passport.
                  </p>

                  {/* Flight summary */}
                  <FlightSummary offer={offer} />

                  {/* What's included — Phase 1: surface baggage + fare brand */}
                  <IncludedPanel
                    slices={offer.slices}
                    refundable={offer.refundable}
                    changeable={offer.changeable}
                  />

                  {/* Passenger forms */}
                  {passengers.map((p, idx) => {
                    const isLead = idx === leadIdx;
                    const paxType = offer.passengers[idx]?.type || 'adult';
                    const paxTypeLabel =
                      paxType === 'infant_without_seat' ? 'infant'
                      : paxType === 'child' ? 'child'
                      : 'adult';
                    const pErr = errors[idx] || {};

                    return (
                      <div key={idx} className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-poppins font-black text-[.92rem] text-[#1A1D2B]">
                            {isLead ? 'Lead Passenger' : `Passenger ${idx + 1}`}
                          </h3>
                          <span className="text-[.6rem] font-black uppercase tracking-[1.5px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {paxTypeLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* First Name */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={p.firstName}
                              onChange={e => updateField(idx, 'firstName', e.target.value)}
                              placeholder="As on passport"
                              className={`w-full border ${pErr.firstName ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                            />
                            {pErr.firstName && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.firstName}</p>}
                          </div>

                          {/* Last Name */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={p.lastName}
                              onChange={e => updateField(idx, 'lastName', e.target.value)}
                              placeholder="As on passport"
                              className={`w-full border ${pErr.lastName ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                            />
                            {pErr.lastName && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.lastName}</p>}
                          </div>

                          {/* Date of Birth */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              Date of Birth <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={p.dob}
                              onChange={e => updateField(idx, 'dob', e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className={`w-full border ${pErr.dob ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                            />
                            {pErr.dob && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.dob}</p>}
                          </div>

                          {/* Gender */}
                          <div>
                            <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                              Gender <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={p.gender}
                              onChange={e => updateField(idx, 'gender', e.target.value)}
                              className={`w-full border ${pErr.gender ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all bg-white`}
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="undisclosed">Prefer not to say</option>
                            </select>
                            {pErr.gender && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.gender}</p>}
                          </div>

                          {/* Email (lead only) */}
                          {isLead && (
                            <div>
                              <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                                Email <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={p.email}
                                onChange={e => updateField(idx, 'email', e.target.value)}
                                placeholder="you@example.com"
                                className={`w-full border ${pErr.email ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                              />
                              {pErr.email && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.email}</p>}
                            </div>
                          )}

                          {/* Phone (lead only) */}
                          {isLead && (
                            <div>
                              <label className="block text-[.68rem] font-bold text-[#5C6378] uppercase tracking-[1px] mb-1.5">
                                Phone <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={p.phone}
                                onChange={e => updateField(idx, 'phone', e.target.value)}
                                placeholder="+44 7700 900000"
                                className={`w-full border ${pErr.phone ? 'border-red-300 bg-red-50' : 'border-[#E8ECF4]'} rounded-xl px-4 py-2.5 text-[.82rem] font-semibold text-[#1A1D2B] outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 transition-all`}
                              />
                              {pErr.phone && <p className="text-[.62rem] text-red-500 font-semibold mt-1">{pErr.phone}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Phase 2a — Add extras (baggage) */}
                  <AddExtrasCard
                    services={availableBaggageServices}
                    selectedIds={selectedServiceIds}
                    onToggle={toggleService}
                    allPassengers={offer.passengers}
                    passengerForms={passengers}
                  />

                  {/* Phase 2c — Experience (meals, Wi-Fi). Quietly absent if
                      the airline doesn't offer any. Shares selectedServiceIds
                      with baggage — same pipeline all the way through. */}
                  <ExperienceCard
                    services={availableExperienceServices}
                    selectedIds={selectedServiceIds}
                    onToggle={toggleService}
                    allPassengers={offer.passengers}
                    passengerForms={passengers}
                  />

                  {/* Phase 2b — Comfort (seat selection). We always show this
                      entry point; if the airline doesn't support seat maps the
                      modal itself handles the empty-state gracefully. */}
                  <ComfortCard
                    seatSelections={seatSelections}
                    allPassengers={offer.passengers}
                    passengerForms={passengers}
                    onOpen={() => setSeatModalOpen(true)}
                  />

                  {/* Stale-offer warning banner — shown when pre-submit refetch
                      detected dropped or repriced ancillaries. */}
                  {staleServiceWarning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-triangle-exclamation text-[.82rem]" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[.8rem] font-bold text-amber-900 leading-tight">
                          Extras updated
                        </p>
                        <p
                          className="text-[.72rem] text-amber-800 font-semibold mt-0.5"
                          dangerouslySetInnerHTML={{ __html: staleServiceWarning }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment init error */}
                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                      <p className="text-[.78rem] text-red-600 font-semibold">{paymentError}</p>
                    </div>
                  )}

                  {/* Mobile CTA */}
                  <div className="lg:hidden">
                    <button
                      onClick={handleContinueToPayment}
                      disabled={paymentLoading}
                      className="w-full bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-[#0066FF]/50 text-white font-poppins font-bold text-[.88rem] px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(0,102,255,0.2)]"
                    >
                      {paymentLoading ? 'Loading payment...' : 'Continue to Payment →'}
                    </button>
                    {submitted && errors.some(e => Object.keys(e).length > 0) && (
                      <p className="text-[.7rem] text-red-500 font-semibold text-center mt-2">
                        Please fix the errors above before continuing.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ═══ STEP 2: Payment ═══ */}
              {(step === 'payment' || step === 'processing') && (
                <div ref={paymentSectionRef}>
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="font-[var(--font-playfair)] font-black text-[1.7rem] md:text-[2rem] text-[#0a1628] tracking-tight">
                      Payment
                    </h1>
                    <button
                      onClick={handleBackToPassengers}
                      className="text-[.72rem] font-bold text-[#0066FF] hover:text-[#0052CC] transition-all"
                    >
                      ← Edit passengers
                    </button>
                  </div>

                  {/* Passenger summary (collapsed) */}
                  <div className="bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4 mb-5">
                    <div className="text-[.62rem] font-black uppercase tracking-[2px] text-[#8E95A9] mb-2">Passengers</div>
                    <div className="space-y-1">
                      {passengers.map((p, i) => (
                        <div key={i} className="text-[.78rem] font-semibold text-[#1A1D2B]">
                          {p.firstName} {p.lastName}
                          {i === 0 && <span className="text-[.62rem] text-[#8E95A9] ml-2">(Lead)</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Flight summary */}
                  <div className="mb-5">
                    <FlightSummary offer={offer} compact />
                  </div>

                  {/* What's included — condensed */}
                  <div className="mb-5">
                    <IncludedPanel
                      slices={offer.slices}
                      refundable={offer.refundable}
                      changeable={offer.changeable}
                      compact
                    />
                  </div>

                  {/* Processing overlay */}
                  {step === 'processing' && (
                    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-8 text-center">
                      <div className="animate-spin w-10 h-10 border-4 border-[#0066FF] border-t-transparent rounded-full mx-auto mb-4" />
                      <h3 className="font-poppins font-black text-[1rem] text-[#1A1D2B] mb-1">
                        Booking your flight...
                      </h3>
                      <p className="text-[.78rem] text-[#5C6378] font-semibold">
                        Payment received. Confirming with the airline — please don&apos;t close this page.
                      </p>
                    </div>
                  )}

                  {/* Order creation error */}
                  {orderError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
                      <p className="text-[.78rem] text-red-600 font-semibold mb-1">{orderError}</p>
                      <p className="text-[.68rem] text-red-500">Your payment was processed. Contact <a href="mailto:contact@jetmeaway.co.uk" className="underline">contact@jetmeaway.co.uk</a> for assistance.</p>
                    </div>
                  )}

                  {/* Payment card error */}
                  {paymentError && step === 'payment' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
                        <div>
                          <p className="text-[.82rem] text-red-700 font-bold mb-0.5">Payment declined</p>
                          <p className="text-[.72rem] text-red-600 font-semibold">{paymentError}</p>
                          <p className="text-[.68rem] text-red-500 mt-1">Please check your card details and try again, or use a different card.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Safe Checkout — non-refundable acknowledgement */}
                  {step === 'payment' && paymentClientSecret && offer && !offer.refundable && (
                    <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={fareAcknowledged}
                        onChange={e => setFareAcknowledged(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#0066FF] shrink-0"
                      />
                      <span className="text-[.78rem] font-semibold text-amber-900 leading-snug">
                        I confirm that I have read the fare conditions and understand that this flight is <strong>non-refundable</strong> and <strong>non-changeable</strong>.
                      </span>
                    </label>
                  )}

                  {/* Stripe Payment Element (merchant-of-record) */}
                  {step === 'payment' && paymentClientSecret && (
                    <div className={`bg-white border border-[#E8ECF4] rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,102,255,0.06)] ${!offer?.refundable && !fareAcknowledged ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-lg">💳</span>
                        <h3 className="font-poppins font-black text-[.92rem] text-[#1A1D2B]">
                          Card Details
                        </h3>
                      </div>

                      <div className="text-[.72rem] text-[#5C6378] font-semibold mb-4">
                        Total charge:{' '}
                        <span className="font-[var(--font-playfair)] font-black text-[#0a1628] tracking-tight">
                          £{grandTotalAll.toFixed(2)}
                        </span>
                        {selectedServices.length > 0 && (
                          <span className="text-[#8E95A9]">
                            {' '}(incl. {selectedServices.length}{' '}
                            {selectedServices.length === 1 ? 'extra' : 'extras'})
                          </span>
                        )}
                      </div>

                      <StripeCardForm
                        clientSecret={paymentClientSecret}
                        onSucceeded={handlePaymentSuccess}
                        onError={handlePaymentFailure}
                        disabled={!offer?.refundable && !fareAcknowledged}
                        amountLabel={`£${grandTotalAll.toFixed(2)}`}
                      />

                      <div className="mt-4 pt-4 border-t border-[#F1F3F7] flex items-center gap-2 text-[.65rem] text-[#8E95A9] font-semibold">
                        <span>🔒</span> Payments are securely processed via Stripe. JetMeAway never sees your card number.
                      </div>
                    </div>
                  )}

                  {/* Mobile price reminder */}
                  <div className="lg:hidden mt-5 bg-[#F8FAFC] border border-[#F1F3F7] rounded-2xl p-4">
                    {(selectedServices.length > 0 ||
                      selectedSeatArray.length > 0 ||
                      selectedExperienceServices.length > 0) && (
                      <div className="text-[.68rem] text-[#5C6378] font-semibold mb-1">
                        Flight £{offer.totalForAll.toFixed(2)} + extras £{servicesSubtotal.toFixed(2)}
                      </div>
                    )}
                    <div className="flex justify-between items-baseline">
                      <span className="text-[.78rem] text-[#5C6378] font-semibold">Total to pay</span>
                      <span className="font-[var(--font-playfair)] font-black text-[1.2rem] text-emerald-700 tracking-tight">
                        £{grandTotalAll.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Price Sidebar ── */}
            <PriceSidebar
              offer={offer}
              step={step}
              onCta={handleContinueToPayment}
              ctaDisabled={paymentLoading}
              ctaLabel={paymentLoading ? 'Loading payment...' : 'Continue to Payment →'}
              errorMsg={submitted && errors.some(e => Object.keys(e).length > 0) ? 'Please fix the errors above.' : null}
              selectedServices={selectedServices}
              selectedSeats={selectedSeatArray}
              selectedExperience={selectedExperienceServices}
              servicesSubtotal={servicesSubtotal}
              grandTotalAll={grandTotalAll}
            />
          </div>
        </div>
      )}

      {/* Phase 2b — Seat map modal. Rendered at root so it escapes the grid
          and overlays the whole viewport. */}
      {seatModalOpen && offer && (
        <SeatMapModal
          offerId={offer.id}
          passengers={offer.passengers.map((p, i) => {
            const form = passengers[i];
            const name =
              `${form?.firstName || ''} ${form?.lastName || ''}`.trim() ||
              `Passenger ${i + 1}`;
            return { id: p.id, name };
          })}
          initialSelections={seatSelections}
          onClose={() => setSeatModalOpen(false)}
          onSave={(sels) => {
            setSeatSelections(sels);
            setSeatModalOpen(false);
            // Clear any stale warning — seats are an independent service pool,
            // but the banner should reset on user interaction either way.
            setStaleServiceWarning(null);
          }}
        />
      )}

      <Footer />
    </>
  );
}
