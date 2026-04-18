import { NextResponse } from 'next/server';
import { credentialsStatus, regionSearch } from '@/lib/ratehawk';

export const runtime = 'edge';

/**
 * RateHawk health check. Reports whether credentials are set and
 * optionally fires a cheap `multicomplete` call to verify auth works.
 *
 * GET /api/ratehawk/status          — config status only
 * GET /api/ratehawk/status?ping=1   — also test auth with live call
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ping = searchParams.get('ping') === '1';

  const status = credentialsStatus();

  if (!ping) {
    return NextResponse.json(status);
  }

  if (!status.configured) {
    return NextResponse.json({
      ...status,
      ping: 'skipped — credentials not set',
    });
  }

  const probe = await regionSearch('London');
  return NextResponse.json({
    ...status,
    ping: {
      ok: probe.ok,
      status: probe.status,
      error: probe.error,
      requestId: probe.requestId,
    },
  });
}
