import { kv } from '@vercel/kv';

/**
 * Subscribers widget — server component, reads KV directly during render.
 * Shows:
 *  - Total deal-alert subscriber count
 *  - Top per-PDF lead-magnet conversions (which guides earned emails)
 *
 * No API route — this is rendered inside the admin server component, which
 * already enforces auth via the `jma_admin` cookie + secret check.
 *
 * Owner explicitly opted out of showing per-email rows on this card (even
 * masked) — the count + per-PDF breakdown is enough at a glance.
 */

type PdfLeadGroup = { slug: string; count: number };

async function loadAll(): Promise<{
  total: number;
  pdfGroups: PdfLeadGroup[];
}> {
  // Combined deal-alerts list (also includes everyone who downloaded a PDF —
  // see /api/pdf-download which writes both per-slug and combined).
  const subscribers = (await kv.get<string[]>('deal_alert_subscribers')) || [];

  // Per-PDF breakdown — scan all `pdf-leads:*` keys.
  let pdfGroups: PdfLeadGroup[] = [];
  try {
    const keys = await kv.keys('pdf-leads:*');
    if (keys.length > 0) {
      const lists = await Promise.all(
        keys.map(async k => {
          const list = (await kv.get<string[]>(k)) || [];
          const slug = k.replace(/^pdf-leads:/, '');
          return { slug, count: list.length };
        }),
      );
      pdfGroups = lists
        .filter(g => g.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }
  } catch {
    // KV scan can fail in transient outages — degrade quietly, never crash /admin.
  }

  return { total: subscribers.length, pdfGroups };
}

export default async function SubscribersWidget() {
  const { total, pdfGroups } = await loadAll();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-wide text-[#5C6378]">
          Subscribers
        </div>
        <div className="text-xs opacity-60">deal alerts + PDFs</div>
      </div>

      <div className="text-2xl font-black text-[#1A1D2B] mb-4">
        {total.toLocaleString()}
        <span className="ml-2 text-xs font-semibold text-[#8E95A9] uppercase tracking-wide">
          total
        </span>
      </div>

      {/* Per-PDF lead conversion (top 5) */}
      {pdfGroups.length > 0 ? (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#5C6378] mb-1.5">
            PDF leads (top guides)
          </div>
          <ul className="space-y-1 text-xs">
            {pdfGroups.map(g => (
              <li
                key={g.slug}
                className="flex items-center justify-between gap-2 text-[#1A1D2B]"
              >
                <span className="truncate font-mono text-[11px] text-[#5C6378]">
                  {g.slug}
                </span>
                <span className="font-semibold tabular-nums">{g.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-xs italic text-[#8E95A9]">
          {total === 0 ? 'No signups yet.' : 'No PDF lead conversions yet.'}
        </div>
      )}
    </div>
  );
}
