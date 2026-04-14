import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PasswordInput from './PasswordInput';

export const runtime = 'nodejs';

export const metadata = {
  title: 'Admin login — JetMeAway',
  robots: 'noindex, nofollow',
};

async function loginAction(formData: FormData) {
  'use server';
  const password = String(formData.get('password') || '');
  const secret = process.env.ADMIN_SECRET || '';

  if (!secret) {
    redirect('/admin/login?error=not-configured');
  }
  if (password !== secret) {
    redirect('/admin/login?error=wrong');
  }

  const cookieStore = await cookies();
  cookieStore.set('jma_admin', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  });
  redirect('/admin');
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,102,255,0.08)] p-8">
        <div className="text-center mb-8">
          <div className="font-black text-2xl mb-2">
            <span className="text-[#0066FF]">Jet</span>MeAway
          </div>
          <div className="text-sm text-[#5C6378]">Admin access</div>
        </div>

        <form action={loginAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C6378] uppercase tracking-wide mb-2">
              Password
            </label>
            <PasswordInput />
          </div>

          {error === 'wrong' && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Incorrect password
            </div>
          )}
          {error === 'not-configured' && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ADMIN_SECRET not configured on the server
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold rounded-xl transition"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-[#8E95A9] hover:text-[#0066FF]">
            ← Back to site
          </a>
        </div>
      </div>
    </div>
  );
}
