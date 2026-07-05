'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Client half of /get. Detects the platform on mount and forwards mobile
 * visitors straight to their store; desktop / unknown visitors see the
 * two-badge fallback card. See page.tsx for the "why one smart link" note.
 */

const APP_STORE_URL = 'https://apps.apple.com/gb/app/jetmeaway/id6765715611';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=uk.co.jetmeaway.app';
const APP_UA_SIGNATURE = /JetMeAway\/[\d.]+\s+Mobile/;

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(ua: string): Platform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS 13+ reports as desktop Safari; catch it via touch + Mac UA.
  if (
    /Macintosh/i.test(ua) &&
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 1
  ) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function GetClient() {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

    // Already inside the JetMeAway app — no point sending them to the store.
    // Bounce to the homepage so the scan still does something sensible.
    if (
      (window as unknown as { JetMeAwayNative?: unknown }).JetMeAwayNative ||
      APP_UA_SIGNATURE.test(ua)
    ) {
      window.location.replace('/');
      return;
    }

    const p = detectPlatform(ua);
    setPlatform(p);

    // Forward mobile visitors straight to their store. The fallback card
    // below still renders (with the matching badge highlighted) in case the
    // store redirect is blocked by an in-app browser or pop-up guard.
    if (p === 'ios') {
      window.location.replace(APP_STORE_URL);
    } else if (p === 'android') {
      window.location.replace(PLAY_STORE_URL);
    }
  }, []);

  const redirecting = platform === 'ios' || platform === 'android';

  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-[#F8FAFC] flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_40px_rgba(0,102,255,0.10)]">
          <span
            aria-hidden="true"
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0066FF]/10 text-[#0066FF]"
          >
            <i className="fa-solid fa-mobile-screen-button text-2xl" />
          </span>

          <h1 className="text-[1.6rem] font-extrabold tracking-tight text-[#1A1D2B]">
            Get JetMeAway
          </h1>
          <p className="mt-2 text-[.95rem] leading-relaxed text-[#5C6378]">
            {redirecting
              ? 'Taking you to the store…'
              : 'Download the app, or carry on to the website. Compare flights, hotels, car hire and holidays in seconds.'}
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download JetMeAway on the App Store"
              className={`group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-black px-4 py-3 text-white transition-all hover:-translate-y-0.5 ${
                platform === 'ios' ? 'ring-2 ring-[#0066FF] ring-offset-2' : ''
              }`}
            >
              <i className="fa-brands fa-apple text-[1.7rem] leading-none" aria-hidden="true" />
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[.6rem] font-medium tracking-wide opacity-80">
                  Download on the
                </span>
                <span className="-mt-0.5 text-[1rem] font-bold">App Store</span>
              </span>
            </a>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get JetMeAway on Google Play"
              className={`group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-black px-4 py-3 text-white transition-all hover:-translate-y-0.5 ${
                platform === 'android' ? 'ring-2 ring-[#0066FF] ring-offset-2' : ''
              }`}
            >
              <i className="fa-brands fa-google-play text-[1.45rem] leading-none" aria-hidden="true" />
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[.6rem] font-medium tracking-wide opacity-80">
                  Get it on
                </span>
                <span className="-mt-0.5 text-[1rem] font-bold">Google Play</span>
              </span>
            </a>
          </div>

          <div className="mt-6 flex items-center gap-3 text-[#8E95A9]">
            <span className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-[.72rem] font-semibold uppercase tracking-wide">or</span>
            <span className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 text-[.9rem] font-bold text-[#0066FF] hover:underline"
          >
            Browse the website
            <i className="fa-solid fa-arrow-right text-[.8rem]" aria-hidden="true" />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
