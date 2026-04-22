'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   ROOM DETAIL MODAL — "Scout" identity
   ───────────────────────────────────────────────────────────────────────────
   Opens when the customer clicks "See room details & photos" on a RoomsTable
   row. Booking.com's modal shows a photo carousel, size/bed/occupancy chips,
   a dense amenity grid, the room description, and a sticky "Reserve" footer.
   We match that information density in Scout's editorial voice:
     - Playfair Display title
     - Emerald solid / slate outline dots for amenity tone (same as RoomsTable)
     - Scroll-snap photo strip (matches hotel gallery pattern)
     - Sticky footer CTA that reuses the row's Reserve action

   Closes on:
     - Overlay click (anywhere outside the card)
     - Escape key
     - Explicit × button in the top-right
     - Reserve button (hands off to onReserve, which triggers the checkout)

   Body scroll is locked while open so the backdrop doesn't jitter on iOS.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';

export interface RoomMetaLite {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  maxOccupancy: number | null;
  sizeSqm: number | null;
  beds: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onReserve: () => void;
  room: RoomMetaLite | null;
  /** Total price for the stay (already honest — includes VAT, excludes only
   *  property-payable city tax which is shown as a secondary line). */
  totalPrice: number | null;
  pricePerNight: number | null;
  nights: number;
  currency: string;
  boardLabel: string | null;
  refundable: boolean | null;
  excludedTaxes: number | null;
  reserving: boolean;
  /** Fallback photos (hotel gallery) — used when the room itself has no
   *  photos[] populated by the supplier. Degrades more gracefully than an
   *  empty state. */
  fallbackPhotos?: string[];
}

const fmtGBP = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;

export default function RoomDetailModal({
  open,
  onClose,
  onReserve,
  room,
  totalPrice,
  pricePerNight,
  nights,
  currency,
  boardLabel,
  refundable,
  excludedTaxes,
  reserving,
  fallbackPhotos,
}: Props) {
  const [activePhoto, setActivePhoto] = useState(0);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Reset the active photo when a new room is opened.
  useEffect(() => {
    if (open) setActivePhoto(0);
  }, [open, room?.id]);

  if (!open || !room) return null;

  const photos = room.photos.length > 0 ? room.photos : (fallbackPhotos || []);
  const mainPhoto = photos[activePhoto] || photos[0] || null;
  const currencyPrefix = currency === 'GBP' ? '£' : `${currency} `;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${room.name} — room details`}
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-4xl md:mx-4 bg-white rounded-t-3xl md:rounded-3xl shadow-[0_30px_80px_rgba(10,22,40,0.45)] max-h-[92vh] flex flex-col"
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-[#0a1628] border border-[#E8ECF4] shadow-[0_4px_14px_rgba(10,22,40,0.18)] flex items-center justify-center transition-transform hover:scale-105"
        >
          <i className="fa-solid fa-xmark text-[1rem]" />
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Photo carousel */}
          {mainPhoto ? (
            <div className="relative w-full h-[260px] md:h-[400px] bg-[#F1F3F7] rounded-t-3xl md:rounded-t-3xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mainPhoto}
                alt={room.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((p) => (p - 1 + photos.length) % photos.length)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 text-[#0a1628] border border-[#E8ECF4] shadow flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <i className="fa-solid fa-chevron-left text-[.85rem]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhoto((p) => (p + 1) % photos.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 text-[#0a1628] border border-[#E8ECF4] shadow flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <i className="fa-solid fa-chevron-right text-[.85rem]" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-[.68rem] font-bold px-2.5 py-1 rounded-full">
                    {activePhoto + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-[140px] md:h-[180px] bg-gradient-to-br from-[#FAF3E6] to-[#F1F3F7] flex items-center justify-center rounded-t-3xl">
              <i className="fa-solid fa-bed text-[2.4rem] text-[#8a6d00]/40" />
            </div>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="px-5 md:px-8 pt-4 flex gap-2 overflow-x-auto pb-1 -mb-1">
              {photos.slice(0, 14).map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? 'border-[#0a1628]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {/* Main copy */}
          <div className="px-5 md:px-8 pt-5 pb-6">
            <h2 className="font-[var(--font-playfair)] font-black text-[1.5rem] md:text-[1.9rem] text-[#0a1628] tracking-tight leading-tight">
              {room.name}
            </h2>

            {/* Spec chips — size / beds / occupancy / board / cancellation */}
            <div className="mt-3 flex flex-wrap gap-2">
              {room.sizeSqm && (
                <SpecChip icon="fa-up-right-and-down-left-from-center" label={`${room.sizeSqm} m²`} />
              )}
              {room.beds && <SpecChip icon="fa-bed" label={room.beds} />}
              {room.maxOccupancy && (
                <SpecChip icon="fa-user-group" label={`Sleeps ${room.maxOccupancy}`} />
              )}
              {boardLabel && <SpecChip icon="fa-utensils" label={boardLabel} />}
              {refundable === true && (
                <SpecChip icon="fa-circle-check" label="Free cancellation" tone="positive" />
              )}
              {refundable === false && (
                <SpecChip icon="fa-circle-minus" label="Non-refundable" tone="neutral" />
              )}
            </div>

            {/* Description */}
            {room.description && (
              <div className="mt-5">
                <h3 className="font-poppins font-black text-[.78rem] text-[#0a1628] uppercase tracking-[1.8px] mb-2">
                  About this room
                </h3>
                <p className="text-[.88rem] text-[#5C6378] font-medium leading-relaxed">
                  {room.description.slice(0, 900)}
                  {room.description.length > 900 ? '…' : ''}
                </p>
              </div>
            )}

            {/* Amenity grid — Booking.com-style two-column checklist */}
            {room.amenities.length > 0 && (
              <div className="mt-6">
                <h3 className="font-poppins font-black text-[.78rem] text-[#0a1628] uppercase tracking-[1.8px] mb-3">
                  In this room
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {room.amenities.map((a, i) => (
                    <div key={`${a}-${i}`} className="flex items-center gap-2 leading-tight">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                      <span className="text-[.82rem] font-semibold text-[#0a1628]">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer CTA */}
        <div className="border-t border-[#E8ECF4] bg-[#FCFAF5] px-5 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-b-3xl">
          <div>
            {totalPrice != null && (
              <div className="font-[var(--font-playfair)] font-black text-[1.5rem] text-[#0a1628] leading-none">
                {currencyPrefix}{totalPrice.toFixed(2)}
              </div>
            )}
            <div className="text-[.62rem] font-semibold text-slate-500 uppercase tracking-[1.5px] mt-1">
              Total for {nights} {nights === 1 ? 'night' : 'nights'}
              {pricePerNight != null && (
                <span className="normal-case tracking-normal text-slate-400 font-medium">
                  {' '}· {currencyPrefix}{pricePerNight.toFixed(2)} / night
                </span>
              )}
            </div>
            {excludedTaxes != null && excludedTaxes > 0 && (
              <div className="text-[.66rem] font-medium text-slate-500 mt-0.5">
                + {fmtGBP(excludedTaxes)} city tax payable at the property
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onReserve}
            disabled={reserving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-poppins font-bold text-[.85rem] rounded-full px-6 py-3 bg-[#0a1628] text-white hover:bg-[#0066FF] disabled:opacity-60 shadow-[0_8px_22px_rgba(10,22,40,0.22)] transition-all"
          >
            {reserving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Starting…
              </>
            ) : (
              <>Secure this rate →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpecChip({
  icon,
  label,
  tone = 'default',
}: {
  icon: string;
  label: string;
  tone?: 'default' | 'positive' | 'neutral';
}) {
  const toneClass =
    tone === 'positive'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : tone === 'neutral'
      ? 'bg-slate-50 border-slate-200 text-slate-500'
      : 'bg-white border-[#E8D8A8] text-[#0a1628]';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[.72rem] font-bold ${toneClass}`}>
      <i className={`fa-solid ${icon} text-[.66rem]`} />
      {label}
    </span>
  );
}
