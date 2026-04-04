/**
 * Build a redirect interstitial URL that shows cross-sells before
 * sending the user to the partner site.
 */
export function redirectUrl(
  affiliateUrl: string,
  provider: string,
  destination: string,
  category: 'flights' | 'hotels' | 'cars' | 'packages' | 'esim' | 'insurance' | 'explore',
): string {
  const params = new URLSearchParams({
    url: affiliateUrl,
    provider,
    dest: destination,
    cat: category,
  });
  return `/redirect?${params.toString()}`;
}
