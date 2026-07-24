/**
 * ESM resolve hook so plain `node` can import the app's TypeScript modules.
 *
 * Next/TypeScript use `moduleResolution: "bundler"`, which allows
 * extensionless relative imports (`'../data/blog-countries'`). Node's ESM
 * resolver requires the extension. Rather than making app code less
 * idiomatic to suit a test script, this hook appends `.ts` when an
 * extensionless relative specifier fails to resolve.
 *
 * Used by scripts/verify-related-posts.mjs. Not part of the app.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // try the next candidate
      }
    }
  }
  return nextResolve(specifier, context);
}
