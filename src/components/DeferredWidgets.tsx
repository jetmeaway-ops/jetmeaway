'use client';

import dynamic from 'next/dynamic';

const ScoutChat = dynamic(() => import('@/components/ScoutChat'), { ssr: false });
const ServiceWorkerRegistration = dynamic(() => import('@/components/ServiceWorkerRegistration'), { ssr: false });
const PushNotificationPrompt = dynamic(() => import('@/components/PushNotificationPrompt'), { ssr: false });

export default function DeferredWidgets() {
  return (
    <>
      <ScoutChat />
      <ServiceWorkerRegistration />
      <PushNotificationPrompt />
    </>
  );
}
