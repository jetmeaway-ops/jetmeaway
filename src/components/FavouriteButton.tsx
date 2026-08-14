'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  loadFavourites,
  subscribeFavourites,
  toggleFavourite,
  peekFavourites,
  type Favourite,
} from '@/lib/favourites';

/**
 * Heart toggle for saving a hotel.
 *
 * Works signed out (device) and signed in (account) — see src/lib/favourites.ts.
 * We never block on a sign-in prompt: a visitor mid-decision who is told to
 * make an account first usually just leaves.
 *
 * Two sizes: `card` for the results grid (sits over the photo) and `detail`
 * for the hotel page (a labelled pill, since there's room and the label makes
 * the action obvious).
 */
export default function FavouriteButton({
  favourite,
  variant = 'card',
  className = '',
}: {
  favourite: Favourite;
  variant?: 'card' | 'detail';
  className?: string;
}) {
  const t = useTranslations('favourites');
  const [saved, setSaved] = useState(() => peekFavourites().some((f) => f.hotelId === favourite.hotelId));
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    void loadFavourites();
    return subscribeFavourites((list) => {
      setSaved(list.some((f) => f.hotelId === favourite.hotelId));
    });
  }, [favourite.hotelId]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // The card wraps this in a link to the hotel — a save must not navigate.
      e.preventDefault();
      e.stopPropagation();
      setPulse(true);
      window.setTimeout(() => setPulse(false), 260);
      void toggleFavourite(favourite);
    },
    [favourite],
  );

  const label = saved ? t('remove') : t('add');

  if (variant === 'detail') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-poppins font-bold text-[.75rem] transition-all ${
          saved
            ? 'bg-rose-50 border-rose-200 text-rose-600'
            : 'bg-white border-[#E8ECF4] text-[#1A1D2B] hover:border-rose-200 hover:text-rose-600'
        } ${className}`}
      >
        <i
          className={`${saved ? 'fa-solid' : 'fa-regular'} fa-heart text-[.85rem] ${pulse ? 'scale-125' : ''} transition-transform`}
          aria-hidden
        />
        {saved ? t('saved') : t('save')}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border transition-all ${
        saved
          ? 'bg-rose-500 border-rose-500 text-white'
          : 'bg-white/95 border-[#E8ECF4] text-[#5C6378] hover:text-rose-500 hover:border-rose-200'
      } ${className}`}
    >
      <i
        className={`${saved ? 'fa-solid' : 'fa-regular'} fa-heart text-[.82rem] ${pulse ? 'scale-125' : ''} transition-transform`}
        aria-hidden
      />
    </button>
  );
}
