'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ScoutChat = dynamic(() => import('@/components/ScoutChat'), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import('@/components/ServiceWorkerRegistration'), { ssr: false });
const PushNotificationPrompt = dynamic(() => import('@/components/PushNotificationPrompt'), { ssr: false });

/**
 * Delays mounting of non-critical widgets (chat, SW, push prompt)
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
      <ScoutChat />
      <ServiceWorkerRegistration />
      <PushNotificationPrompt />
    </>
  );
}
