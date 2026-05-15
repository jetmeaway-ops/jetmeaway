'use client';

/**
 * BookingClient — the customer-facing Kyte booking step machine.
 *
 * Flow varies by carrier:
 *   - LS / 6E / HV / V7 (standard LCC): passenger → book → card → success
 *   - FR (Ryanair OTA): passenger → address → book → T&Cs → commit → iframe → card → success
 *   - U2 (easyJet): bundle workflow not yet shipped; we surface a "coming soon" notice
 *
 * Card capture is a placeholder until PCI strategy lands (email out to
 * Raquel 2026-05-12). When the PCI path is decided, the `card` step
 * gets the real surface (Kyte hosted / Stripe Forwarding / VGS).
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import RyanairConfirmIframe, {
  type RyanairTelemetryPayload,
} from '@/components/RyanairConfirmIframe';
import RyanairTermsCheckbox from '@/components/RyanairTermsCheckbox';
import FlightCheckoutLegal from '@/components/FlightCheckoutLegal';
import { neighbourhoodIntel, genericIntel } from '@/lib/neighbourhood-intel';
import { scoutGreeting } from '@/lib/scout-greeting';

// Lazy-load StripeCardForm so @stripe/react-stripe-js (and js.stripe.com)
// only fetch when the user reaches the card step — same pattern as the
// hotels DOTW checkout.
const StripeCardForm = dynamic(() => import('@/components/StripeCardForm'), {
  ssr: false,
  loading: () => (
    <div className="text-sm text-[#5C6378] py-4">Loading secure payment form…</div>
  ),
});

type StashedOffer = {
  airline: string;
  airlineCode: string;
  price: number;
  currency: string;
  departure_at: string | null;
  arrival_at?: string | null;
  return_at: string | null;
  flight_number: string | null;
  duration_to: number;
  duration_back: number;
  transfers: number;
  offer_id?: string | null;
  kyteTransactionId?: string;
  _searchedAt?: number;
  /** Optional — passed from /flights row click for Scout content on success page. */
  originCode?: string;
  originCity?: string;
  destinationCode?: string;
  destinationCity?: string;
};

type Title = 'mr' | 'mrs' | 'ms' | 'miss' | 'dr';
type Gender = 'male' | 'female';

type Passenger = {
  firstName: string;
  lastName: string;
  gender: Gender | '';
  title: Title | '';
  dateOfBirth: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
};

type Address = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

type Step =
  | 'load-offer'
  | 'passenger'
  | 'address'
  | 'booking'
  | 'easyjet-coming-soon'
  | 'loading-ancillaries'
  | 'ancillaries'
  | 'adding-seat'
  | 'terms'
  | 'committing'
  | 'iframe'
  | 'card'
  | 'paid-pending-bridge'  // Stripe Auth done; awaiting Kyte agency-card book + capture
  | 'success'
  | 'error';

type PriceBreakdown = {
  airline: number;     // pence
  kyteFee: number;     // pence
  processing: number;  // pence
  total: number;       // pence
  currency: string;    // ISO code, e.g. "GBP"
};

type SeatInRow = {
  number: string;
  position?: string;
  category?: string;
  available?: boolean;
  isEmergencyExit?: boolean;
  isRestrictedFor?: string;
  type?: string;
} | null;

type SeatMap = Record<
  string,
  {
    seatCategories?: Record<string, { id: string; name: string; price: number }>;
    cabins?: Array<{
      cabinConfiguration?: Array<string | null>;
      rows?: Record<string, SeatInRow[]>;
    }>;
  }
>;

type ShopAncResponse = {
  seatMap?: SeatMap;
  bags?: unknown;
  currency?: { code: string; decimals: number };
  errors?: unknown;
};

type SeatPick = {
  number: string;
  segmentId: string;
  categoryName: string;
  priceMinor: number;
};

const EMPTY_PASSENGER: Passenger = {
  firstName: '',
  lastName: '',
  gender: '',
  title: '',
  dateOfBirth: '',
  email: '',
  phoneCountryCode: '+44',
  phoneNumber: '',
};

const EMPTY_ADDRESS: Address = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  countryCode: 'GB',
};

export default function BookingClient({
  offerId,
  transactionId,
}: {
  offerId: string;
  transactionId: string;
}) {
  const [step, setStep] = useState<Step>('load-offer');
  const [offer, setOffer] = useState<StashedOffer | null>(null);
  const [passenger, setPassenger] = useState<Passenger>(EMPTY_PASSENGER);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [bookingId, setBookingId] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [sessionToken, setSessionToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [seatCurrency, setSeatCurrency] = useState<{ code: string; decimals: number }>({
    code: 'GBP',
    decimals: 2,
  });
  const [chosenSeat, setChosenSeat] = useState<SeatPick | null>(null);

  // Phase 2 — Stripe Auth+Hold state. Created when user reaches `card` step,
  // confirmed when StripeCardForm signals success, consumed by Phase 3 (the
  // agency-card bridge) which captures the PI after Kyte's payBooking
  // returns status:'ok'.
  const [paymentClientSecret, setPaymentClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [cardError, setCardError] = useState('');

  // ATOL / agent disclosure acknowledgement — Kyte tickets are direct-agent
  // sales with no ATOL cover; the customer must tick this to unlock payment.
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);

  // Load the offer stashed in sessionStorage when the user clicked through.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`kyte-offer-${offerId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as StashedOffer;
        setOffer(parsed);
        setStep('passenger');
        return;
      }
    } catch {
      /* sessionStorage unavailable */
    }
    setError(
      'We could not find the offer details for this booking. Please return to flight results and pick the flight again — offers expire after ~15 minutes.',
    );
    setStep('error');
  }, [offerId]);

  /* ---------- Phase 2: create Stripe PaymentIntent on entering `card` ---------- */
  // Fires once when the step becomes 'card'. Creates a manual-capture PI
  // (Auth + Hold) sized to airline + £0.50 Kyte + Stripe gross-up. We
  // intentionally don't re-fire on retries within the same step — if the
  // first call succeeded we already have a clientSecret to reuse, and if
  // it failed the user gets routed to the error step.
  useEffect(() => {
    if (step !== 'card') return;
    if (paymentClientSecret) return; // already created
    if (!transactionId) return;

    let cancelled = false;
    setCardError('');

    (async () => {
      try {
        const res = await fetch('/api/flights/kyte/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerId, transactionId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.clientSecret) {
          setCardError(
            data?.error
              ? `Could not start payment: ${data.error}`
              : 'Could not start payment. Please try again.',
          );
          return;
        }
        setPaymentClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setPriceBreakdown({
          airline: data.breakdown?.airline ?? 0,
          kyteFee: data.breakdown?.kyteFee ?? 0,
          processing: data.breakdown?.processing ?? 0,
          total: data.total ?? 0,
          currency: data.breakdown?.currency || 'GBP',
        });
      } catch (e) {
        if (cancelled) return;
        setCardError(
          'Network error preparing payment. Please check your connection and try again.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, offerId, transactionId, paymentClientSecret]);

  /* ---------- Phase 3: agency-card bridge on entering `paid-pending-bridge` ---------- */
  // Customer's card is authorised (Stripe PI = requires_capture). We
  // now call the server bridge which:
  //   1. Reads AGENCY_CARD_* env vars
  //   2. Posts the agency card to Kyte's payBooking
  //   3. On Kyte success → captures the customer's Stripe PI
  //   4. On Kyte failure → cancels/refunds the customer's Stripe PI
  // We DON'T pass card data from the frontend any more — server is
  // the only place that touches the agency card, server is the only
  // place that touches Stripe capture/refund. Frontend just observes.
  useEffect(() => {
    if (step !== 'paid-pending-bridge') return;
    if (!paymentIntentId || !bookingId || !transactionId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/flights/kyte/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId,
            bookingId,
            paymentIntentId,
            amount: currentBalance, // Kyte balance in minor units
            payer: {
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              title: passenger.title,
              email: passenger.email,
              phone: {
                countryCode: passenger.phoneCountryCode,
                number: passenger.phoneNumber,
              },
            },
            transactionType: offer?.airlineCode === 'FR' ? 'moto' : undefined,
            codegen: offer?.airlineCode === 'FR' ? true : undefined,
            tripContext: {
              destination: offer?.destinationCity || offer?.destinationCode || '',
              departureDate: offer?.departure_at || null,
              returnDate: offer?.return_at || null,
              passengerCount: 1,
              title: `${offer?.airline ?? 'Flight'} ${offer?.originCode ?? ''}–${offer?.destinationCode ?? ''}`,
            },
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.status !== 'ok') {
          setError(
            data?.error
              ? `Booking failed: ${data.error}. Your card hold has been released.`
              : 'Booking failed. Your card hold has been released. Please try again or contact support.',
          );
          setStep('error');
          return;
        }
        setStep('success');
      } catch (e) {
        if (cancelled) return;
        setError(
          'Network error finalising your booking. If your card shows a pending charge, it will release within 7 days. Please contact support with your reference.',
        );
        setStep('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, paymentIntentId, bookingId, transactionId, currentBalance, passenger, offer]);

  const isRyanair = offer?.airlineCode === 'FR';
  const isEasyJet = offer?.airlineCode === 'U2';
  const carrierBookingPath = useMemo(() => {
    if (!offer) return [];
    if (isEasyJet) return ['Passenger details', 'easyJet bundles'];
    if (isRyanair) {
      return [
        'Passenger details',
        'Address',
        'Choose seat',
        'Confirm flights (Ryanair)',
        'Payment',
        'Confirmation',
      ];
    }
    return ['Passenger details', 'Payment', 'Confirmation'];
  }, [offer, isRyanair, isEasyJet]);

  const currentStepLabel = (() => {
    if (step === 'passenger') return 'Passenger details';
    if (step === 'address') return 'Address';
    if (step === 'booking' || step === 'committing') return 'Working…';
    if (step === 'loading-ancillaries' || step === 'ancillaries' || step === 'adding-seat')
      return 'Choose seat';
    if (step === 'terms' || step === 'iframe') return 'Confirm flights (Ryanair)';
    if (step === 'card') return 'Payment';
    if (step === 'paid-pending-bridge') return 'Payment';
    if (step === 'success') return 'Confirmation';
    return '';
  })();

  // Format minor-unit pence into a user-facing money string.
  // £101.80 from { 10180, 'GBP' }, etc.
  const fmtMoney = (pence: number, code: string) => {
    const major = (Number(pence) || 0) / 100;
    const symbol = code === 'GBP' ? '£' : code === 'EUR' ? '€' : code === 'USD' ? '$' : '';
    return symbol ? `${symbol}${major.toFixed(2)}` : `${major.toFixed(2)} ${code}`;
  };

  function passengerValid() {
    return (
      passenger.firstName.trim().length > 0 &&
      passenger.lastName.trim().length > 0 &&
      passenger.gender !== '' &&
      passenger.title !== '' &&
      /^\d{4}-\d{2}-\d{2}$/.test(passenger.dateOfBirth) &&
      /@/.test(passenger.email) &&
      passenger.phoneCountryCode.startsWith('+') &&
      passenger.phoneNumber.trim().length >= 6
    );
  }

  function addressValid() {
    return (
      address.addressLine1.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.postalCode.trim().length > 0 &&
      address.countryCode.trim().length === 2
    );
  }

  function submitPassenger() {
    if (!passengerValid()) return;
    if (isRyanair) {
      setStep('address');
    } else {
      void callBook();
    }
  }

  async function submitAddress() {
    if (!addressValid()) return;
    await callBook();
  }

  async function callBook() {
    setBusy(true);
    setStep('booking');
    setError('');
    try {
      const body: Record<string, unknown> = {
        transactionId,
        offerId,
        passengers: [
          {
            firstName: passenger.firstName.trim(),
            lastName: passenger.lastName.trim(),
            gender: passenger.gender,
            title: passenger.title,
            dateOfBirth: passenger.dateOfBirth,
            email: passenger.email.trim(),
            phone: {
              countryCode: passenger.phoneCountryCode.trim(),
              number: passenger.phoneNumber.trim(),
            },
          },
        ],
      };
      if (isRyanair) {
        body.address = {
          addressLines: [address.addressLine1, address.addressLine2].filter(Boolean),
          city: address.city,
          postalCode: address.postalCode,
          countryCode: address.countryCode,
        };
      }
      const res = await fetch('/api/flights/kyte/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        bookingId?: string;
        currentBalance?: number;
        error?: string;
      };
      if (!res.ok || !data.bookingId) {
        throw new Error(data.error || `Book failed (HTTP ${res.status})`);
      }
      setBookingId(data.bookingId);
      setCurrentBalance(data.currentBalance ?? offer?.price ?? 0);

      if (isEasyJet) {
        setStep('easyjet-coming-soon');
        return;
      }
      if (isRyanair) {
        // Don't keep `booking` busy — handing control to the
        // shop-ancillaries fetch which manages its own loading state.
        setBusy(false);
        void loadAncillaries(data.bookingId);
        return;
      }
      setStep('card');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
      setStep('error');
    } finally {
      setBusy(false);
    }
  }

  async function loadAncillaries(bid: string) {
    setStep('loading-ancillaries');
    setError('');
    try {
      const res = await fetch('/api/flights/kyte/ancillaries/shop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionId, bookingId: bid, types: ['seat', 'bag'] }),
      });
      const data = (await res.json()) as ShopAncResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || `shop-ancillaries failed (HTTP ${res.status})`);
      setSeatMap(data.seatMap || null);
      if (data.currency) setSeatCurrency(data.currency);
      setStep('ancillaries');
    } catch (err) {
      // Soft-fail: ancillaries are optional. Surface the error to the
      // log but let the customer continue to T&Cs without picking a seat.
      // eslint-disable-next-line no-console
      console.error('[kyte/ancillaries] shop failed', err);
      setStep('ancillaries');
    }
  }

  async function addChosenSeat() {
    if (!chosenSeat || !bookingId) {
      setStep('terms');
      return;
    }
    setStep('adding-seat');
    try {
      const res = await fetch('/api/flights/kyte/ancillaries/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          bookingId,
          passengers: [
            {
              // Ryanair OTA expects passenger id '1' (matches our /book request).
              id: '1',
              ancillaries: [
                {
                  id: chosenSeat.number,
                  type: 'seat',
                  action: 'add',
                  quantity: 1,
                  flightSegments: [chosenSeat.segmentId],
                },
              ],
            },
          ],
        }),
      });
      const data = (await res.json()) as {
        currentBalance?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `add-seat failed (HTTP ${res.status})`);
      if (typeof data.currentBalance === 'number') setCurrentBalance(data.currentBalance);
      setStep('terms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seat selection failed');
      setStep('error');
    }
  }

  function skipSeat() {
    setChosenSeat(null);
    setStep('terms');
  }

  async function callCommit() {
    setBusy(true);
    setStep('committing');
    setError('');
    try {
      const res = await fetch('/api/flights/kyte/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transactionId, bookingId }),
      });
      const data = (await res.json()) as { sessionToken?: string; error?: string };
      if (!res.ok || !data.sessionToken) {
        throw new Error(data.error || `Commit failed (HTTP ${res.status})`);
      }
      setSessionToken(data.sessionToken);
      setStep('iframe');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
      setStep('error');
    } finally {
      setBusy(false);
    }
  }

  function onIframeConfirmed(_t: RyanairTelemetryPayload) {
    setStep('card');
  }

  function onIframeSessionError(t: RyanairTelemetryPayload) {
    setError(`Ryanair confirmation session error: ${t.error || 'invalid session'}`);
    setStep('error');
  }

  function onIframeTimeout() {
    setError('Ryanair confirmation timed out — please retry the booking.');
    setStep('error');
  }

  /* ───────────────── Render ──────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/flights"
          className="inline-flex items-center gap-2 text-sm text-[#5C6378] hover:text-[#0066FF]"
        >
          ← Back to flight results
        </Link>

        {offer && (
          <FlightSummary offer={offer} />
        )}

        {carrierBookingPath.length > 0 && step !== 'load-offer' && step !== 'error' && (
          <StepIndicator path={carrierBookingPath} current={currentStepLabel} />
        )}

        {step === 'load-offer' && <Loading label="Loading flight details…" />}

        {step === 'passenger' && (
          <PassengerStep
            value={passenger}
            onChange={setPassenger}
            onContinue={submitPassenger}
            ctaLabel={isRyanair ? 'Continue to address' : 'Continue to payment'}
            disabled={!passengerValid()}
          />
        )}

        {step === 'address' && (
          <AddressStep
            value={address}
            onChange={setAddress}
            onContinue={submitAddress}
            onBack={() => setStep('passenger')}
            disabled={!addressValid() || busy}
            busy={busy}
          />
        )}

        {step === 'booking' && <Loading label="Securing your booking with the airline…" />}

        {step === 'loading-ancillaries' && (
          <Loading label="Loading available seats…" />
        )}

        {step === 'ancillaries' && (
          <SeatPickerStep
            seatMap={seatMap}
            currency={seatCurrency}
            chosen={chosenSeat}
            onPick={setChosenSeat}
            onContinue={addChosenSeat}
            onSkip={skipSeat}
          />
        )}

        {step === 'adding-seat' && <Loading label="Securing your seat…" />}

        {step === 'easyjet-coming-soon' && (
          <Card title="easyJet direct booking — launching soon">
            <p className="text-sm text-[#5C6378] leading-relaxed">
              easyJet uses a fare-bundle workflow (Hand-bag-only, Hold-bag, Flexi) that needs a few
              more screens than the other carriers. We&apos;ve built the API integration; the
              customer flow is the next phase. In the meantime, please pick a different airline on
              this route, or email us and we&apos;ll book it for you manually.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/flights"
                className="flex-1 bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium rounded-lg px-5 py-3 text-sm text-center"
              >
                Back to results
              </Link>
              <a
                href="mailto:waqar@jetmeaway.co.uk?subject=easyJet%20direct%20booking%20request"
                className="flex-1 bg-white border border-[#E8ECF4] text-[#1A1D2B] font-medium rounded-lg px-5 py-3 text-sm text-center"
              >
                Ask us to book
              </a>
            </div>
          </Card>
        )}

        {step === 'terms' && (
          <RyanairTermsCheckbox
            continueLabel="Continue to flight confirmation"
            onContinue={callCommit}
            busy={busy}
          />
        )}

        {step === 'committing' && (
          <Loading label="Securing your seat with Ryanair…" />
        )}

        {step === 'iframe' && sessionToken && (
          <Card title="Confirm your Ryanair flights">
            <p className="text-sm text-[#5C6378] mb-4">
              Please review and confirm your flight selection on Ryanair&apos;s confirmation page
              below. Once you confirm, we&apos;ll take you to payment.
            </p>
            <RyanairConfirmIframe
              sessionToken={sessionToken}
              market="gb/en"
              partnerId="KOTA"
              hostBase="https://fr.sandbox.gokyte.com"
              onConfirmed={onIframeConfirmed}
              onSessionError={onIframeSessionError}
              onTimeout={onIframeTimeout}
              onClosed={onIframeTimeout}
            />
          </Card>
        )}

        {step === 'card' && (
          <Card title="Payment">
            {/* Loading state — Stripe PI being created */}
            {!paymentClientSecret && !cardError && (
              <p className="text-sm text-[#5C6378] leading-relaxed py-2">
                Preparing secure payment…
              </p>
            )}

            {/* Error state — PI creation failed */}
            {cardError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-medium">
                {cardError}
                <button
                  onClick={() => {
                    setCardError('');
                    setPaymentClientSecret('');
                  }}
                  className="block mt-3 text-xs font-bold text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Ready state — show breakdown + Stripe Elements */}
            {paymentClientSecret && priceBreakdown && (
              <>
                <div className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-4 mb-4 text-sm">
                  <div className="font-bold text-[#1A1D2B] mb-2 text-[.78rem] uppercase tracking-wide">
                    Price breakdown
                  </div>
                  <div className="flex justify-between text-[#5C6378] py-1">
                    <span>Flight (direct airline rate)</span>
                    <span>{fmtMoney(priceBreakdown.airline, priceBreakdown.currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#5C6378] py-1">
                    <span>Payment processing</span>
                    <span>{fmtMoney(priceBreakdown.kyteFee + priceBreakdown.processing, priceBreakdown.currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#1A1D2B] font-bold pt-2 mt-2 border-t border-[#E8ECF4]">
                    <span>Total</span>
                    <span>{fmtMoney(priceBreakdown.total, priceBreakdown.currency)}</span>
                  </div>
                  <p className="mt-3 text-[.72rem] text-[#8E95A9] leading-relaxed">
                    JetMeAway doesn&apos;t profit from this booking — the processing line covers
                    Stripe + airline-booking-platform fees only. We earn from optional add-ons
                    (seat, baggage) if you choose them.
                  </p>
                </div>

                <FlightCheckoutLegal
                  acknowledged={legalAcknowledged}
                  onAcknowledgedChange={setLegalAcknowledged}
                />

                <StripeCardForm
                  clientSecret={paymentClientSecret}
                  acceptableStatuses={['requires_capture']}
                  amountLabel={fmtMoney(priceBreakdown.total, priceBreakdown.currency)}
                  disabled={!legalAcknowledged}
                  onSucceeded={() => setStep('paid-pending-bridge')}
                  onError={(msg) => setCardError(msg)}
                />

                <div className="mt-3 text-xs text-[#8E95A9] font-mono">
                  Booking · {bookingId.slice(0, 28)}…
                </div>
              </>
            )}
          </Card>
        )}

        {step === 'paid-pending-bridge' && (
          <Card title="Confirming your booking…">
            <div className="flex items-center gap-3 py-2">
              <div className="w-5 h-5 rounded-full border-2 border-[#0066FF] border-t-transparent animate-spin" />
              <p className="text-sm text-[#5C6378]">
                Your card is held — we&apos;re finalising the ticket with the airline now.
                Don&apos;t close this page.
              </p>
            </div>
            <div className="mt-4 text-xs text-[#8E95A9] font-mono bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg px-3 py-2">
              Payment · {paymentIntentId.slice(0, 16)}… · Booking · {bookingId.slice(0, 16)}…
            </div>
          </Card>
        )}

        {step === 'success' && (
          <>
            <Card title="Booking received">
              <p className="text-sm text-[#5C6378] leading-relaxed">
                Thanks {passenger.firstName || 'there'} — your booking is in our system. As soon as
                card capture goes live, we&apos;ll move it straight through to the airline. Until
                then, you&apos;ll get a confirmation email shortly with your reference.
              </p>
              <div className="mt-4 text-xs text-[#8E95A9] font-mono bg-[#F8FAFC] border border-[#E8ECF4] rounded-lg px-3 py-2">
                Reference · {bookingId.slice(0, 28)}…
              </div>
              <Link
                href="/flights"
                className="mt-5 inline-block bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium rounded-lg px-5 py-3 text-sm"
              >
                Search another flight
              </Link>
            </Card>
            <ScoutTipsSection destinationCity={offer?.destinationCity} />
          </>
        )}

        {step === 'error' && (
          <Card title="Something went wrong">
            <p className="text-sm text-red-700 leading-relaxed">{error}</p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/flights"
                className="bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium rounded-lg px-5 py-3 text-sm"
              >
                Back to flight results
              </Link>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

/* ───────────────── Sub-components ───────────────────────────────────── */

function FlightSummary({ offer }: { offer: StashedOffer }) {
  const dep = offer.departure_at ? new Date(offer.departure_at) : null;
  const arr = offer.arrival_at ? new Date(offer.arrival_at) : null;
  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '—';
  return (
    <div className="mt-6 bg-white rounded-2xl border border-[#E8ECF4] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E8ECF4] flex items-center justify-center text-lg">
          ✈
        </div>
        <div className="flex-1">
          <div className="font-bold text-[#1A1D2B]">
            {offer.airline}
            {offer.flight_number && (
              <span className="ml-2 text-xs font-semibold text-[#8E95A9]">
                {offer.airlineCode} {offer.flight_number}
              </span>
            )}
          </div>
          <div className="text-xs text-[#5C6378]">
            {fmt(dep)} → {fmt(arr)}
            {offer.transfers > 0 && ` · ${offer.transfers} stop${offer.transfers > 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[1.2rem] text-[#1A1D2B]">
            {offer.currency}
            {offer.price.toFixed(2)}
          </div>
          <div className="text-[.6rem] text-[#8E95A9] font-semibold">per person</div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ path, current }: { path: string[]; current: string }) {
  const idx = path.findIndex((s) => s === current);
  return (
    <ol className="mt-6 flex items-center gap-2 text-xs">
      {path.map((label, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[.65rem] font-bold ${
                done
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'bg-[#0066FF] text-white'
                    : 'bg-[#E8ECF4] text-[#8E95A9]'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={`hidden sm:inline ${
                active ? 'text-[#1A1D2B] font-semibold' : 'text-[#8E95A9]'
              }`}
            >
              {label}
            </span>
            {i < path.length - 1 && <span className="text-[#E8ECF4] hidden sm:inline">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 bg-white rounded-2xl border border-[#E8ECF4] p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1A1D2B] mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 text-sm text-[#5C6378]">
      <div className="w-8 h-8 border-2 border-[#E8ECF4] border-t-[#0066FF] rounded-full animate-spin" />
      <span>{label}</span>
    </div>
  );
}

function PassengerStep({
  value,
  onChange,
  onContinue,
  ctaLabel,
  disabled,
}: {
  value: Passenger;
  onChange: (next: Passenger) => void;
  onContinue: () => void;
  ctaLabel: string;
  disabled: boolean;
}) {
  function set<K extends keyof Passenger>(k: K, v: Passenger[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <Card title="Lead passenger details">
      <p className="text-xs text-[#8E95A9] mb-4">
        Use the name exactly as it appears on the travel document. Airlines charge a fee for name
        changes after booking.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title">
          <select
            value={value.title}
            onChange={(e) => set('title', e.target.value as Title | '')}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Select…</option>
            <option value="mr">Mr</option>
            <option value="mrs">Mrs</option>
            <option value="ms">Ms</option>
            <option value="miss">Miss</option>
            <option value="dr">Dr</option>
          </select>
        </Field>
        <Field label="Gender">
          <select
            value={value.gender}
            onChange={(e) => set('gender', e.target.value as Gender | '')}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="First name">
          <input
            value={value.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name">
          <input
            value={value.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="family-name"
          />
        </Field>
        <Field label="Date of birth (YYYY-MM-DD)">
          <input
            type="date"
            value={value.dateOfBirth}
            onChange={(e) => set('dateOfBirth', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={value.email}
            onChange={(e) => set('email', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="email"
          />
        </Field>
        <Field label="Phone country code">
          <input
            value={value.phoneCountryCode}
            onChange={(e) => set('phoneCountryCode', e.target.value)}
            placeholder="+44"
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Phone number">
          <input
            value={value.phoneNumber}
            onChange={(e) => set('phoneNumber', e.target.value)}
            placeholder="7700123456"
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="tel-national"
          />
        </Field>
      </div>
      <button
        onClick={onContinue}
        disabled={disabled}
        className="mt-6 w-full md:w-auto bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-5 py-3 text-sm"
      >
        {ctaLabel}
      </button>
    </Card>
  );
}

function AddressStep({
  value,
  onChange,
  onContinue,
  onBack,
  disabled,
  busy,
}: {
  value: Address;
  onChange: (next: Address) => void;
  onContinue: () => void;
  onBack: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  function set<K extends keyof Address>(k: K, v: Address[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <Card title="Billing address">
      <p className="text-xs text-[#8E95A9] mb-4">
        Ryanair require a billing address on every booking. We send the same address to the airline
        as the traveller address.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Address line 1" wide>
          <input
            value={value.addressLine1}
            onChange={(e) => set('addressLine1', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="address-line1"
          />
        </Field>
        <Field label="Address line 2 (optional)" wide>
          <input
            value={value.addressLine2}
            onChange={(e) => set('addressLine2', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="address-line2"
          />
        </Field>
        <Field label="City">
          <input
            value={value.city}
            onChange={(e) => set('city', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="address-level2"
          />
        </Field>
        <Field label="Postal code">
          <input
            value={value.postalCode}
            onChange={(e) => set('postalCode', e.target.value)}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="postal-code"
          />
        </Field>
        <Field label="Country (ISO-2)">
          <input
            value={value.countryCode}
            onChange={(e) => set('countryCode', e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className="w-full border border-[#E8ECF4] rounded-lg px-3 py-2 text-sm"
            autoComplete="country"
          />
        </Field>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          disabled={busy}
          className="bg-white hover:bg-[#F8FAFC] border border-[#E8ECF4] text-[#1A1D2B] font-medium rounded-lg px-5 py-3 text-sm"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={disabled}
          className="flex-1 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-5 py-3 text-sm"
        >
          {busy ? 'Working…' : 'Continue to flight confirmation'}
        </button>
      </div>
    </Card>
  );
}

function SeatPickerStep({
  seatMap,
  currency,
  chosen,
  onPick,
  onContinue,
  onSkip,
}: {
  seatMap: SeatMap | null;
  currency: { code: string; decimals: number };
  chosen: SeatPick | null;
  onPick: (seat: SeatPick | null) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const segments = seatMap ? Object.entries(seatMap) : [];
  const symbol = currency.code === 'GBP' ? '£' : currency.code === 'EUR' ? '€' : currency.code === 'USD' ? '$' : currency.code;
  const fmtPrice = (minor: number) =>
    minor === 0 ? 'Free' : `+${symbol}${(minor / Math.pow(10, currency.decimals)).toFixed(2)}`;

  if (segments.length === 0) {
    return (
      <Card title="Seat selection">
        <p className="text-sm text-[#5C6378] leading-relaxed">
          No seat-selection options are available for this flight. You&apos;ll be allocated a seat
          automatically at check-in.
        </p>
        <button
          onClick={onSkip}
          className="mt-5 w-full md:w-auto bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium rounded-lg px-5 py-3 text-sm"
        >
          Continue
        </button>
      </Card>
    );
  }

  return (
    <Card title="Choose your seat (optional)">
      <p className="text-xs text-[#8E95A9] mb-5">
        Picking a seat is optional. Skip and the airline will allocate one for free at check-in.
      </p>

      {segments.map(([segmentId, segData]) => {
        const cats = segData.seatCategories || {};
        const cabins = segData.cabins || [];
        return (
          <div key={segmentId} className="mb-6 last:mb-0">
            <div className="text-[.7rem] font-bold uppercase tracking-[1.5px] text-[#5C6378] mb-3">
              {segmentId}
            </div>
            {cabins.map((cabin, ci) => {
              const config = cabin.cabinConfiguration || [];
              const rows = cabin.rows || {};
              const rowNums = Object.keys(rows).sort(
                (a, b) => parseInt(a, 10) - parseInt(b, 10),
              );
              return (
                <div
                  key={ci}
                  className="bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl p-3 overflow-x-auto"
                >
                  <div className="inline-block min-w-full">
                    <div className="flex items-center gap-1.5 mb-2 pl-7">
                      {config.map((letter, li) =>
                        letter === null ? (
                          <span key={`hd${li}`} className="w-4" />
                        ) : (
                          <span
                            key={`hd${li}`}
                            className="w-9 text-center text-[.65rem] font-bold text-[#8E95A9]"
                          >
                            {letter}
                          </span>
                        ),
                      )}
                    </div>
                    {rowNums.map((rn) => {
                      const seatsInRow = rows[rn] || [];
                      return (
                        <div key={rn} className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-5 text-right text-[.65rem] font-bold text-[#8E95A9]">
                            {rn}
                          </span>
                          {seatsInRow.map((s, si) => {
                            if (!s) return <span key={si} className="w-4" />;
                            const cat = s.category ? cats[s.category] : undefined;
                            const price = cat?.price ?? 0;
                            // isRestrictedFor is a passenger-type code (e.g. "INF" = no
                            // infants). For adult-only bookings those seats are still
                            // pickable — matches kyte-ryanair-smoke.mjs's selection logic.
                            const disabled = !s.available || s.isEmergencyExit;
                            const isChosen =
                              chosen?.number === s.number && chosen.segmentId === segmentId;
                            return (
                              <button
                                key={si}
                                disabled={disabled}
                                onClick={() => {
                                  if (isChosen) {
                                    onPick(null);
                                  } else {
                                    onPick({
                                      number: s.number,
                                      segmentId,
                                      categoryName: cat?.name || 'Standard',
                                      priceMinor: price,
                                    });
                                  }
                                }}
                                title={`${s.number}${cat?.name ? ' · ' + cat.name : ''}${price ? ' · ' + fmtPrice(price) : ''}${disabled ? ' · unavailable' : ''}`}
                                className={`w-9 h-9 rounded text-[.6rem] font-bold border transition-all ${
                                  disabled
                                    ? 'bg-[#E8ECF4] text-[#B0B8CC] border-[#E8ECF4] cursor-not-allowed'
                                    : isChosen
                                      ? 'bg-[#0066FF] text-white border-[#0066FF] ring-2 ring-[#0066FF]/30'
                                      : price > 0
                                        ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                                        : 'bg-white text-[#1A1D2B] border-[#E8ECF4] hover:border-[#0066FF]'
                                }`}
                              >
                                {/* Strip leading-zero-padded row prefix — Kyte returns
                                    "01B" for row 1, "27F" for row 27. Display just the
                                    letter. */}
                                {s.number.replace(/^0*\d+/, '')}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {Object.values(cats).some((c) => c.price > 0) && (
              <div className="mt-3 flex flex-wrap gap-3 text-[.65rem] text-[#5C6378]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-[#E8ECF4]" /> Free
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Paid
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#E8ECF4]" /> Unavailable / restricted
                </span>
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-6 p-4 bg-[#F8FAFC] border border-[#E8ECF4] rounded-xl">
        {chosen ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <span className="text-[#5C6378]">Selected: </span>
              <span className="font-semibold text-[#1A1D2B]">
                Seat {chosen.number} · {chosen.categoryName}
              </span>
              {chosen.priceMinor > 0 && (
                <span className="ml-2 text-[#0066FF] font-semibold">{fmtPrice(chosen.priceMinor)}</span>
              )}
            </div>
            <button
              onClick={() => onPick(null)}
              className="text-xs text-[#5C6378] hover:text-[#1A1D2B] underline"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#8E95A9]">No seat selected — click a seat above to choose.</p>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={onSkip}
          className="bg-white hover:bg-[#F8FAFC] border border-[#E8ECF4] text-[#1A1D2B] font-medium rounded-lg px-5 py-3 text-sm"
        >
          Skip seat selection
        </button>
        <button
          onClick={onContinue}
          className="flex-1 bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium rounded-lg px-5 py-3 text-sm"
        >
          {chosen ? `Continue with seat ${chosen.number}` : 'Continue without a seat'}
        </button>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="block text-[#5C6378] mb-1">{label}</span>
      {children}
    </label>
  );
}

function ScoutTipsSection({ destinationCity }: { destinationCity?: string }) {
  // If the city isn't covered by our scout intel, the section still renders
  // (with the generic fallback) — it sets brand tone even without local data.
  const specific = neighbourhoodIntel(destinationCity);
  const intel = specific ?? genericIntel(destinationCity);
  const greeting = scoutGreeting(destinationCity || null);
  const cityLabel = destinationCity ? destinationCity.trim() : 'your destination';
  const slug = destinationCity
    ? destinationCity.trim().toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
    : '';

  return (
    <section className="mt-6 bg-gradient-to-br from-[#0066FF]/5 to-white border border-[#0066FF]/10 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0066FF] text-white text-lg">🧭</span>
        <div>
          <div className="text-[.65rem] font-black uppercase tracking-[1.5px] text-[#0066FF]">
            Your Personal Scout
          </div>
          <h3 className="text-lg font-bold text-[#1A1D2B] mt-0.5">
            What&apos;s next for your trip to {cityLabel}?
          </h3>
        </div>
      </div>

      <p className="text-sm text-[#5C6378] italic mb-5 leading-relaxed">{greeting}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">☕</span>
            <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-[#5C6378]">
              Morning ritual
            </div>
          </div>
          <p className="text-sm text-[#1A1D2B] leading-relaxed">{intel.morningRitual}</p>
        </div>

        <div className="bg-white border border-[#E8ECF4] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏃</span>
            <div className="text-[.62rem] font-black uppercase tracking-[1.5px] text-[#5C6378]">
              Walks & fresh air
            </div>
          </div>
          <p className="text-sm text-[#1A1D2B] leading-relaxed">{intel.fitness}</p>
        </div>
      </div>

      {slug && (
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/destinations/${slug}`}
            className="flex-1 inline-flex items-center justify-center bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium rounded-lg px-4 py-2.5 text-sm"
          >
            See the full {cityLabel} Scout Report →
          </Link>
          <Link
            href="/hotels"
            className="flex-1 inline-flex items-center justify-center bg-white hover:bg-[#F8FAFC] border border-[#E8ECF4] text-[#1A1D2B] font-medium rounded-lg px-4 py-2.5 text-sm"
          >
            Find a hotel in {cityLabel}
          </Link>
        </div>
      )}
    </section>
  );
}
