'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ScoutChat = dynamic(() => import('@/components/ScoutChat'), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import('@/components/ServiceWorkerRegistration'), { ssr: false });
const PushNotificationPrompt = dynamic(() => import('@/components/PushNotificationPrompt'), { ssr: false });
// Vercel Analytics moved here so its script never competes with LCP/FCP.
// PageSpeed flagged 150ms of render-blocking; Analytics was one of the
// scripts loading inside the first paint window.
const Analytics = dynamic(() => import('@vercel/analytics/react').then(m => m.Analytics), { ssr: false });

/**
 * Delays mounting of non-critical widgets (chat, SW, push prompt, analytics)
 * until 3s after hydration so they never compete with LCP paint.
 */
export default function DeferredWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <>
      <Analytics />
      <ScoutChat />
      <ServiceWorkerRegistration />
      <PushNotificationPrompt />
    </>
  );
}
