/**
 * Override the root layout's Edge runtime for /blog/* routes.
 *
 * The root layout at src/app/layout.tsx sets `runtime = 'edge'` so the
 * rest of the site ships on Vercel Edge Functions for speed. But the
 * blog uses Node's `fs` module to read MDX files from content/posts/,
 * which Edge runtime doesn't support. Overriding runtime to 'nodejs'
 * for this subtree is the cleanest fix — everything under /blog runs
 * on Node and can read the filesystem.
 */
export const runtime = 'nodejs';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
