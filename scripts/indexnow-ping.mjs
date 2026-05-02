#!/usr/bin/env node
/**
 * One-shot IndexNow ping — pulls the live sitemap and fires every URL at
 * api.indexnow.org. Bing/Yandex/Seznam pick up immediately; Google ignores
 * IndexNow but discovers via the regular sitemap anyway.
 *
 * Usage: node scripts/indexnow-ping.mjs
 */

const KEY = '710ec95581af460ca881d4cf3cf14a16';
const HOST = 'jetmeaway.co.uk';

async function main() {
  const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // Ensure newest posts are pinged even if sitemap hasn't regenerated yet.
  const must = [
    `https://${HOST}/blog/best-hotels-bangkok-2026`,
    `https://${HOST}/blog/best-hotels-lisbon-2026`,
  ];
  for (const u of must) if (!urls.includes(u)) urls.push(u);

  console.log(`Pinging IndexNow with ${urls.length} URLs…`);
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: urls,
    }),
  });
  const body = await res.text();
  console.log(`HTTP ${res.status}${body ? ' — ' + body.slice(0, 200) : ''}`);
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
