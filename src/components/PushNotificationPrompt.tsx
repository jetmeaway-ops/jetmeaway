'use client';

import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Don't show if no VAPID key, no SW support, or already dismissed/subscribed
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (localStorage.getItem('jma-push-dismissed')) return;

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscribed(true);
        } else {
          // Show prompt after 5 seconds (don't interrupt initial page load)
          setTimeout(() => setShow(true), 5000);
        }
      });
    });
  }, []);

  const handleSubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      setSubscribed(true);
      setShow(false);
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setShow(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem('jma-push-dismissed', '1');
    setShow(false);
  }, []);

  if (!show || subscribed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-[360px] z-[300] animate-[slideUp_0.3s_ease-out]">
      <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#0052CC] flex items-center justify-center text-white font-black text-lg shrink-0">
            J
          </div>
          <div className="flex-1">
            <h3 className="font-poppins font-black text-[.9rem] text-[#1A1D2B] mb-0.5">
              Get deal alerts
            </h3>
            <p className="text-[.75rem] text-[#5C6378] font-semibold leading-snug">
              Be the first to know when prices drop on flights and hotels.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubscribe}
            className="flex-1 bg-[#0066FF] hover:bg-[#0052CC] text-white font-poppins font-bold text-[.78rem] py-2.5 rounded-xl transition-all"
          >
            Allow
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 text-[#8E95A9] hover:text-[#5C6378] font-bold text-[.78rem] rounded-xl transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
