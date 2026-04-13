export const runtime = 'edge';

// Lightweight ping endpoint for cron-job.org / UptimeRobot
// Hit every 5 minutes to keep edge functions warm
export async function GET() {
  return new Response(JSON.stringify({ status: 'ok', ts: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
