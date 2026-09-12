/**
 * /admin/users — "Who has signed up / engaged with JetMeAway".
 *
 * IMPORTANT context (2026-09-12): the site does NOT keep a user registry.
 * Sign-in (Apple / Google / magic-link) just mints a session cookie from the
 * verified email — no user row is written anywhere. So there is no single
 * "signups" list to read. This page RECONSTRUCTS the set of known people from
 * every place an email actually lands in KV:
 *
 *   - auth:apple:sub:*        → Apple sign-ins (real account creations; the one
 *                               sign-in path that DOES persist, only to recover
 *                               Apple's dropped-email-on-repeat behaviour)
 *   - favourites:${email}     → signed-in users who saved a hotel
 *   - saved-searches:${email} → signed-in users who saved a search
 *   - bookings:all            → customers who booked (+ channel / country)
 *   - deal_alert_subscribers  → email/deal-alert subscribers
 *   - users:all               → forward-looking registry (empty until capture
 *                               is wired into the sign-in routes; read here so
 *                               the page fills in automatically once it is)
 *
 * Google / magic-link sign-ins that took no further action leave no trace and
 * cannot be listed retroactively — that gap is called out in the UI honestly.
 *
 * Read-only. Auth: same `jma_admin` cookie + ADMIN_SECRET as the rest of /admin.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { kv } from '@vercel/kv';
import { listBookings } from '@/lib/bookings';
import { normaliseEmail } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Person = {
  email: string;
  apple: boolean;
  favourites: number;
  savedSearches: number;
  bookings: number;
  subscriber: boolean;
  provider?: string; // from users:all (future capture)
  channel?: string; // last known booking channel
  country?: string; // last known booking country
  firstSeen?: number; // ms epoch, best effort
  lastSeen?: number; // ms epoch, best effort
};

function ms(iso: string | number | undefined | null): number | undefined {
  if (iso == null) return undefined;
  if (typeof iso === 'number') return Number.isFinite(iso) ? iso : undefined;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : undefined;
}

function touch(p: Person, when?: number) {
  if (when == null) return;
  p.firstSeen = p.firstSeen == null ? when : Math.min(p.firstSeen, when);
  p.lastSeen = p.lastSeen == null ? when : Math.max(p.lastSeen, when);
}

async function loadPeople(): Promise<Person[]> {
  const map = new Map<string, Person>();
  const get = (raw: string): Person => {
    const email = normaliseEmail(raw) || raw.trim().toLowerCase();
    let p = map.get(email);
    if (!p) {
      p = { email, apple: false, favourites: 0, savedSearches: 0, bookings: 0, subscriber: false };
      map.set(email, p);
    }
    return p;
  };

  // 1. Bookers — richest source (channel / country / created date).
  try {
    const bookings = await listBookings();
    for (const b of bookings) {
      const em = (b as { customerEmail?: string }).customerEmail;
      if (!em) continue;
      const p = get(em);
      p.bookings += 1;
      const bk = b as { channel?: string; country?: string; createdAt?: string; date?: string };
      if (bk.channel) p.channel = bk.channel;
      if (bk.country) p.country = bk.country;
      touch(p, ms(bk.createdAt || bk.date));
    }
  } catch { /* degrade */ }

  // 2. Apple sign-ins — auth:apple:sub:<sub> → email.
  try {
    const keys = await kv.keys('auth:apple:sub:*');
    if (keys.length) {
      const emails = await Promise.all(keys.map(k => kv.get<string>(k).catch(() => null)));
      for (const em of emails) {
        if (typeof em === 'string' && em.includes('@')) get(em).apple = true;
      }
    }
  } catch { /* degrade */ }

  // 3. Favourites — favourites:<email> → list.
  try {
    const keys = await kv.keys('favourites:*');
    await Promise.all(keys.map(async k => {
      const email = k.slice('favourites:'.length);
      if (!email) return;
      const list = (await kv.get<Array<{ createdAt?: number }>>(k).catch(() => null)) || [];
      const p = get(email);
      p.favourites = Array.isArray(list) ? list.length : 0;
      for (const f of list) touch(p, ms(f?.createdAt));
    }));
  } catch { /* degrade */ }

  // 4. Saved searches — saved-searches:<email> → list.
  try {
    const keys = await kv.keys('saved-searches:*');
    await Promise.all(keys.map(async k => {
      const email = k.slice('saved-searches:'.length);
      if (!email) return;
      const list = (await kv.get<Array<{ createdAt?: number }>>(k).catch(() => null)) || [];
      const p = get(email);
      p.savedSearches = Array.isArray(list) ? list.length : 0;
      for (const s of list) touch(p, ms(s?.createdAt));
    }));
  } catch { /* degrade */ }

  // 5. Deal-alert / PDF subscribers — single combined list of emails.
  try {
    const subs = (await kv.get<string[]>('deal_alert_subscribers')) || [];
    for (const em of subs) if (typeof em === 'string' && em.includes('@')) get(em).subscriber = true;
  } catch { /* degrade */ }

  // 6. Forward-looking registry (empty until capture is added to sign-in).
  try {
    const reg = (await kv.hgetall<Record<string, string>>('users:all')) || {};
    for (const [em, val] of Object.entries(reg)) {
      const p = get(em);
      try {
        const o = typeof val === 'string' ? JSON.parse(val) : (val as Record<string, unknown>);
        if (o && typeof o === 'object') {
          if (typeof o.provider === 'string') p.provider = o.provider;
          if (typeof o.channel === 'string' && !p.channel) p.channel = o.channel as string;
          touch(p, ms(o.firstSeen as string | number));
          touch(p, ms(o.lastSeen as string | number));
        }
      } catch { /* ignore malformed */ }
    }
  } catch { /* degrade — key may not exist */ }

  return Array.from(map.values()).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
}

function hasAccount(p: Person): boolean {
  return p.apple || p.favourites > 0 || p.savedSearches > 0 || !!p.provider;
}

function fmtWhen(t?: number): string {
  if (!t) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(t));
  } catch { return '—'; }
}

const COUNTRY_NAMES: Record<string, string> = {
  GB: 'UK', ES: 'Spain', IL: 'Israel', US: 'USA', AR: 'Argentina', FR: 'France',
  DE: 'Germany', IT: 'Italy', NL: 'Netherlands', PT: 'Portugal', IE: 'Ireland',
  EG: 'Egypt', TR: 'Türkiye', AE: 'UAE', SA: 'Saudi Arabia', IN: 'India',
};
function countryName(c?: string): string {
  if (!c) return '—';
  return COUNTRY_NAMES[c.toUpperCase()] || c.toUpperCase();
}
function channelLabel(c?: string): string {
  if (!c) return '—';
  if (c === 'web') return 'Website';
  if (c === 'ios') return 'iOS app';
  if (c === 'android') return 'Android app';
  return c;
}

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jma_admin')?.value || '';
  const secret = process.env.ADMIN_SECRET || '';
  if (!secret || token !== secret) redirect('/admin/login');

  const people = await loadPeople();
  const accounts = people.filter(hasAccount).length;
  const bookers = people.filter(p => p.bookings > 0).length;
  const subscribers = people.filter(p => p.subscriber).length;
  const appleUsers = people.filter(p => p.apple).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black mb-1">Users</h1>
        <p className="text-[#5C6378] text-sm">
          Everyone we have an email for — reconstructed from sign-ins, saves, bookings and subscribers.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Known people" value={String(people.length)} accent="text-[#0066FF]" />
        <Kpi label="Accounts (signed in)" value={String(accounts)} accent="text-green-600" />
        <Kpi label="Booked" value={String(bookers)} accent="text-amber-600" />
        <Kpi label="Subscribers" value={String(subscribers)} accent="text-[#1A1D2B]" />
      </div>

      {/* Honesty note about the gap */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[13px] text-amber-900 leading-relaxed">
        <strong>How to read this:</strong> the site doesn&apos;t yet log every sign-in — Apple sign-ins are
        recorded ({appleUsers}), and anyone who saved a hotel, saved a search, booked, or subscribed shows here.
        <strong> Google and email-link sign-ins that took no further action aren&apos;t individually captured yet.</strong>{' '}
        Wire capture into the sign-in routes and every future sign-up will appear here automatically.
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="font-bold text-lg">All known people ({people.length})</h2>
        </div>
        {people.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8E95A9]">No users found yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[#5C6378] text-left">
                <tr>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">How we know them</th>
                  <th className="px-4 py-3 font-semibold text-center">Bookings</th>
                  <th className="px-4 py-3 font-semibold text-center">Favs</th>
                  <th className="px-4 py-3 font-semibold text-center">Saved</th>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-6 py-3 font-semibold text-right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {people.map(p => (
                  <tr key={p.email} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-[#1A1D2B] break-all max-w-[260px]">{p.email}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {p.apple && <Tag tone="dark">Apple sign-in</Tag>}
                        {p.provider === 'google' && <Tag tone="blue">Google</Tag>}
                        {p.provider === 'email' && <Tag tone="blue">Email link</Tag>}
                        {p.bookings > 0 && <Tag tone="green">Booked</Tag>}
                        {p.favourites > 0 && <Tag tone="gray">Favourites</Tag>}
                        {p.savedSearches > 0 && <Tag tone="gray">Saved search</Tag>}
                        {p.subscriber && <Tag tone="amber">Subscriber</Tag>}
                        {!p.apple && !p.provider && p.bookings === 0 && p.favourites === 0 && p.savedSearches === 0 && p.subscriber && null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums font-semibold">{p.bookings || '—'}</td>
                    <td className="px-4 py-4 text-center tabular-nums">{p.favourites || '—'}</td>
                    <td className="px-4 py-4 text-center tabular-nums">{p.savedSearches || '—'}</td>
                    <td className="px-4 py-4 text-[#5C6378]">{channelLabel(p.channel)}</td>
                    <td className="px-4 py-4 text-[#5C6378]">{countryName(p.country)}</td>
                    <td className="px-6 py-4 text-right text-[#5C6378] whitespace-nowrap">{fmtWhen(p.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="text-xs font-medium text-[#8E95A9] uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-black ${accent}`}>{value}</div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'dark' | 'blue' | 'green' | 'gray' | 'amber' }) {
  const cls = {
    dark: 'bg-gray-900 text-white',
    blue: 'bg-[#0066FF]/10 text-[#0066FF]',
    green: 'bg-green-50 text-green-800 border border-green-200',
    gray: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-100 text-amber-800',
  }[tone];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{children}</span>;
}
