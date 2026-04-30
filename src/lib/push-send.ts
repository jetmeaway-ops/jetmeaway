/**
 * Expo Push API helper — fan-out push notifications to a list of tokens.
 *
 * Uses Expo's hosted push service (https://exp.host/--/api/v2/push/send)
 * which proxies to APNs (iOS) and FCM (Android) for us. No Apple Push
 * certificate or FCM server-key configuration required at the server level
 * — Expo manages those credentials when EAS builds the app.
 *
 * Edge-runtime compatible (uses fetch + JSON, no Node-only APIs).
 *
 * Failures are returned per-message; the caller decides whether to delete
 * stale tokens (DeviceNotRegistered) from KV.
 */

export type ExpoPushMessage = {
  to: string;                 // Expo push token: ExponentPushToken[xxx]
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: 'default' | null;
  channelId?: string;         // Android channel
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;               // seconds
};

export type ExpoPushResult =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo's documented per-request cap

export async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
  if (messages.length === 0) return [];

  const out: ExpoPushResult[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        for (let j = 0; j < chunk.length; j++) {
          out.push({ status: 'error', message: `HTTP ${res.status}: ${text.slice(0, 200)}` });
        }
        continue;
      }
      const data = await res.json() as { data?: ExpoPushResult[] };
      const results = Array.isArray(data?.data) ? data.data : [];
      for (let j = 0; j < chunk.length; j++) {
        out.push(results[j] ?? { status: 'error', message: 'Missing result for message' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      for (let j = 0; j < chunk.length; j++) {
        out.push({ status: 'error', message: msg });
      }
    }
  }
  return out;
}

/**
 * Convenience: send the same payload to many tokens. Each recipient gets
 * their own ExpoPushMessage so per-token errors can be surfaced.
 */
export async function sendExpoPushToTokens(
  tokens: string[],
  template: Omit<ExpoPushMessage, 'to'>,
): Promise<ExpoPushResult[]> {
  const messages = tokens.map((t) => ({ to: t, ...template }));
  return sendExpoPushBatch(messages);
}
