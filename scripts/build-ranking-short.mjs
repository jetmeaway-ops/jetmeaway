/**
 * build-ranking-short.mjs — JetMeAway travel ranking short renderer (2026-07-03)
 *
 * Renders a 9:16 (1080x1920) ranking short from a job JSON:
 *   title card -> one segment per hotel (photo + rank badge + name + price
 *   + one-liner) -> jetmeaway.co.uk endcard. ffmpeg only, no paid tools
 *   (owner decision 2026-06-15: free local render + manual posting).
 *
 * Posts go to the EXISTING JetMeAway accounts (YouTube @Jetmeawayy, TikTok/
 * FB/Bluesky/IG "jetmeawayy") — owner reviews every reel before posting.
 *
 * Usage: node scripts/build-ranking-short.mjs <job.json> [outputDir]
 * Output: <outputDir>/<jobId>.mp4 — outputDir defaults to the owner's
 * deliverables folder "Desktop/Advertisement/new plan by Fable" (owner
 * directive 2026-07-03: all shorts deliverables live there, not scratch).
 *
 * Job shape:
 * {
 *   "id": "vegas-cheapest-5",
 *   "titleLines": [ {"text": "Ranking the 5", "color": "white"},
 *                   {"text": "CHEAPEST Vegas hotels", "color": "0x2DD4BF"} ],
 *   "subtitle": "real bookable prices · from £20/night",
 *   "entries": [ { "badge": "#5", "hotelName": "...", "price": "from ~£35/night",
 *                  "oneLiner": "...", "photoUrl": "https://static.cupid.travel/..." } ],
 *   "playbackOrder": [2,4,1,3,0],   // indexes into entries — shuffled retention trick
 *   "cta": { "line1": "Full list + live prices", "line2": "jetmeaway.co.uk", "line3": "LINK IN BIO" }
 * }
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FF = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway/scratch/sw-build/ff/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe';
const ROOT = 'C:/Users/10ban/OneDrive/Desktop/jetmeaway';
const LOGO = ROOT + '/public/jetmeaway-logo.png';

const jobPath = process.argv[2];
if (!jobPath) { console.error('usage: node scripts/build-ranking-short.mjs <job.json>'); process.exit(1); }
const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));

const W = 1080, H = 1920, FPS = 30;
const TITLE_DUR = 2.5, SEG_DUR = 4.5, END_DUR = 3.0;
const NAVY = '0x0a1628', ORANGE = '0xF97316';

const WORK = path.join(ROOT, 'scratch', 'shorts', 'work', job.id);
const OUTDIR = process.argv[3] || 'C:/Users/10ban/OneDrive/Desktop/Advertisement/new plan by Fable';
const OUT = path.join(OUTDIR, job.id + '.mp4');
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUTDIR, { recursive: true });

// Fonts copied local so drawtext fontfile= needs no drive-letter escaping.
fs.copyFileSync('C:/Windows/Fonts/segoeuib.ttf', path.join(WORK, 'fontb.ttf'));
fs.copyFileSync('C:/Windows/Fonts/segoeui.ttf', path.join(WORK, 'font.ttf'));

const run = (args) => execFileSync(FF, args, { cwd: WORK, stdio: ['ignore', 'ignore', 'inherit'] });
// All strings go through textfiles — no ffmpeg escaping pain, full UTF-8 (£).
let tfCount = 0;
const tf = (text) => { const f = `t${tfCount++}.txt`; fs.writeFileSync(path.join(WORK, f), text, 'utf8'); return f; };
const dt = ({ text, font = 'fontb.ttf', size, color = 'white', x = '(w-text_w)/2', y, box = null, alpha = null }) =>
  `drawtext=fontfile=${font}:textfile=${tf(text)}:fontsize=${size}:fontcolor=${color}` +
  `:x=${x}:y=${y}` +
  (box ? `:box=1:boxcolor=${box}:boxborderw=18` : ':borderw=3:bordercolor=black@0.5') +
  (alpha ? `:alpha='${alpha}'` : '');

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo ${res.status}: ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** Animate a composed still into a segment mp4: slow zoom + fade in/out. */
function animate(basePng, outMp4, dur, extraFilters = '') {
  // STILL image + fade in/out. zoompan removed 2026-07-03 — it jittered on
  // still photos ("shaky pictures" — owner). Perfectly static by design.
  const fc =
    `[0:v]scale=${W}:${H},setsar=1,format=yuv420p` +
    (extraFilters ? `,${extraFilters}` : '') +
    `,fade=t=in:st=0:d=0.2,fade=t=out:st=${(dur - 0.2).toFixed(2)}:d=0.2[v]`;
  run(['-y', '-loop', '1', '-t', String(dur), '-i', basePng, '-filter_complex', fc, '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), outMp4]);
}

const parts = [];

/* ── 1. Title card ─────────────────────────────────────────────────────── */
{
  const lines = job.titleLines.map((l, i) =>
    dt({ text: l.text, size: 92, color: l.color || 'white', y: 700 + i * 130 }));
  if (job.subtitle) lines.push(dt({ text: job.subtitle, font: 'font.ttf', size: 42, color: 'white@0.75', y: 700 + job.titleLines.length * 130 + 60 }));
  lines.push(dt({ text: 'JETMEAWAY  ·  SCOUT RANKINGS', font: 'fontb.ttf', size: 30, color: ORANGE, y: 1650 }));
  run(['-y', '-f', 'lavfi', '-i', `color=c=${NAVY}:s=${W}x${H}`, '-vf', lines.join(','), '-frames:v', '1', 'title.png']);
  animate('title.png', 'part_title.mp4', TITLE_DUR);
  parts.push('part_title.mp4');
}

/* ── 2. Hotel segments (in shuffled playbackOrder) ─────────────────────── */
const order = job.playbackOrder && job.playbackOrder.length === job.entries.length
  ? job.playbackOrder
  : job.entries.map((_, i) => i);

for (let s = 0; s < order.length; s++) {
  const e = job.entries[order[s]];
  const photo = `photo${s}.jpg`;
  await download(e.photoUrl, path.join(WORK, photo));

  // Blur-fill background + fitted foreground photo (landscape photos on 9:16).
  const baseFc =
    `[0:v]split=2[s0][s1];` +
    `[s0]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=30,eq=brightness=-0.08:saturation=1.05[bg];` +
    `[s1]scale=1020:-1[fg];` +
    `[bg][fg]overlay=x=(main_w-overlay_w)/2:y=780-overlay_h/2,setsar=1[base]`;
  run(['-y', '-i', photo, '-filter_complex', baseFc, '-map', '[base]', '-frames:v', '1', `segbase${s}.png`]);

  const overlays = [
    dt({ text: ` ${e.badge} `, size: 120, color: 'white', x: '60', y: '150', box: `${ORANGE}@0.92` }),
    dt({ text: e.hotelName, size: 58, y: 1400, box: 'black@0.45' }),
    dt({ text: e.price, size: 48, color: ORANGE, y: 1505, box: 'black@0.45' }),
    dt({ text: e.oneLiner, font: 'font.ttf', size: 40, color: 'white@0.92', y: 1600, box: 'black@0.45' }),
  ].join(',');
  animate(`segbase${s}.png`, `part_seg${s}.mp4`, SEG_DUR, overlays);
  parts.push(`part_seg${s}.mp4`);
}

/* ── 3. Endcard — logo + CTA (existing JetMeAway brand assets only) ────── */
{
  const cta = job.cta || { line1: 'Full list + live prices', line2: 'jetmeaway.co.uk', line3: 'LINK IN BIO' };
  const fc =
    `[1:v]scale=560:-1[logo];[0:v][logo]overlay=x=(main_w-overlay_w)/2:y=620[b0];` +
    `[b0]${dt({ text: cta.line1, font: 'font.ttf', size: 48, color: 'white@0.85', y: 1080 })},` +
    `${dt({ text: cta.line2, size: 74, y: 1170 })},` +
    `${dt({ text: cta.line3, size: 52, color: ORANGE, y: 1330 })}[v]`;
  run(['-y', '-f', 'lavfi', '-i', `color=c=${NAVY}:s=${W}x${H}`, '-i', LOGO,
    '-filter_complex', fc, '-map', '[v]', '-frames:v', '1', 'end.png']);
  animate('end.png', 'part_end.mp4', END_DUR);
  parts.push('part_end.mp4');
}

/* ── 4. Concat + silent AAC track (players behave better with audio) ───── */
fs.writeFileSync(path.join(WORK, 'list.txt'), parts.map(p => `file '${p}'`).join('\n'));
run(['-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
  '-shortest', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', OUT]);

const total = TITLE_DUR + order.length * SEG_DUR + END_DUR;
console.log(`DONE -> ${OUT}  (~${total.toFixed(1)}s, ${order.length} ranks)`);
