/**
 * Blog routes run on Node.js so the MDX helper can read files from
 * content/posts/ via fs. This is now the default runtime since the
 * root layout dropped its `runtime = 'edge'` declaration — kept as a
 * placeholder layout so the /blog subtree has a clear owner.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
