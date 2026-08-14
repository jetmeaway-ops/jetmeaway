'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  loadFavourites,
  subscribeFavourites,
  toggleFavourite,
  type Favourite,
} from '@/lib/favourites';
import { newTabProps } from '@/lib/new-tab';

/**
 * The saved-hotels list.
 *
 * Works signed out as well as signed in — the store decides where the list
 * lives (see src/lib/favourites.ts). Signed-out visitors get a line explaining
 * the list is device-only, which is the honest version of "sign in to sync"
 * without blocking them from using the feature.
 *
 * Prices are shown as "£X when you saved" and never as a live price. Rates move
 * daily; printing a stale number as though it were today's would be a lie to
 * the customer at exactly the moment they're deciding.
 */
export default function FavouritesClient() {
  const t = useTranslations('favourites');
  const [items, setItems] = useState<Favourite[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = subscribeFavourites(setItems);
    void loadFavourites().then((list) => setItems(list));
    fetch('/api/account/me', { credentials: 'include' })
      .then((r) => setSignedIn(r.ok))
      .catch(() => setSignedIn(false));
    return unsub;
  }, []);

  const fmtPrice = (pence?: number, currency?: string) => {
    if (typeof pence !== 'number') return null;
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
    return `${symbol}${Math.round(pence / 100).toLocaleString()}`;
  };

  const fmtDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  if (items === null) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white border border-[#E8ECF4] animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#E8ECF4] rounded-2xl p-10 text-center">
        <div className="text-4xl mb-3" aria-hidden>🤍</div>
        <h2 className="font-poppins font-black text-[1.05rem] text-[#1A1D2B] mb-1.5">{t('empty')}</h2>
        <p className="text-[.82rem] text-[#5C6378] font-semibold mb-5">{t('emptyHint')}</p>
        <a
          href="/hotels"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.8rem] transition-colors"
        >
          {t('browse')}
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-[.78rem] font-bold text-[#5C6378]">
          {t('countLabel', { count: items.length })}
        </span>
        {signedIn === false && (
          <span className="text-[.72rem] font-semibold text-[#8E95A9] inline-flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-[.66rem]" aria-hidden />
            {t('deviceOnly')}
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {items.map((f) => {
          const price = fmtPrice(f.savedPricePence, f.currency);
          return (
            <li
              key={f.hotelId}
              className="bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden flex items-stretch hover:shadow-md transition-shadow"
            >
              <a
                href={f.url}
                {...newTabProps()}
                className="w-28 sm:w-40 shrink-0 bg-gradient-to-br from-[#EFE4D6] to-[#F8F2E9]"
                aria-label={f.name}
              >
                {f.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl" aria-hidden>🛏</div>
                )}
              </a>

              <div className="flex-1 min-w-0 p-4 flex flex-col justify-center gap-1">
                <a href={f.url} {...newTabProps()} className="min-w-0">
                  <h3 className="font-poppins font-black text-[.95rem] text-[#1A1D2B] leading-tight truncate">
                    {f.name}
                  </h3>
                </a>
                {(f.city || typeof f.stars === 'number') && (
                  <p className="text-[.72rem] text-[#8E95A9] font-semibold truncate">
                    {typeof f.stars === 'number' && f.stars > 0 && (
                      <span className="text-amber-500 mr-1.5" aria-hidden>{'★'.repeat(Math.min(5, f.stars))}</span>
                    )}
                    {f.city}
                  </p>
                )}
                <p className="text-[.72rem] text-[#5C6378] font-semibold">
                  {price && <span className="text-[#1A1D2B] font-bold">{t('priceWhenSaved', { price })}</span>}
                  {price && <span className="text-[#C8CEDA] mx-1.5">·</span>}
                  {t('savedOn', { date: fmtDate(f.createdAt) })}
                </p>
              </div>

              <div className="p-4 flex items-center">
                <button
                  type="button"
                  onClick={() => void toggleFavourite(f)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8ECF4] text-[.72rem] font-bold text-[#5C6378] hover:border-rose-200 hover:text-rose-600 transition-colors whitespace-nowrap"
                >
                  {t('removeAction')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
