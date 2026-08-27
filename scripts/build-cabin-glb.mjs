/**
 * One-off generator for `public/3d/whole_cabin.glb`.
 *
 * Builds a simplified A320-style single-aisle cabin programmatically and
 * exports it as a tiny binary glTF (~10–20 KB). Each seat is its own
 * named mesh — `seat_1A`, `seat_12C`, etc — so the runtime can find
 * them via GLTF traversal and cross-reference with the booking API's
 * seat IDs without a separate manifest file.
 *
 * Why programmatic instead of a downloaded CC0 asset:
 *   - Final .glb is ~15 KB vs 5–20 MB for typical CC0 cabin models.
 *     Matters on iOS WebView where every kilobyte hits paint time.
 *   - Seat mesh names are guaranteed to match a known format so the
 *     runtime traversal is robust.
 *   - No licensing or attribution burden.
 *   - Re-runnable for different aircraft (737, 787) by editing CONFIG.
 *
 * Run with: `node scripts/build-cabin-glb.mjs`
 * Output:   `public/3d/whole_cabin.glb`
 */

import { Document, NodeIO } from '@gltf-transform/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/* ── Cabin layout config — A320-ish ─────────────────────────────────── */
const CONFIG = {
  // Business class (rows 1–3, 2-2 layout) — taller seat backs read as
  // "premium" from above.
  business: {
    rows: 3,
    seatsPerSide: 2,
    seatWidth: 0.55,
    seatPitch: 1.0,   // metres front-to-back
    seatHeight: 0.95,
    seatLetters: ['A', 'C', 'D', 'F'],
  },
  // Economy class (rows 4–30, 3-3 layout)
  economy: {
    rows: 27,
    seatsPerSide: 3,
    seatWidth: 0.43,
    seatPitch: 0.78,
    seatHeight: 0.7,
    seatLetters: ['A', 'B', 'C', 'D', 'E', 'F'],
  },
  // Cabin shell
  hull: {
    length: 32,
    diameter: 3.95,
  },
  // Aisle width
  aisleWidth: 0.5,
};

/* ── Geometry primitives (vertex/index arrays) ───────────────────────── */

/** A box centred on origin with given dimensions, returning typed arrays. */
function boxGeometry(w, h, d) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  // 8 corners
  const v = new Float32Array([
    -x, -y,  z,   x, -y,  z,   x,  y,  z,  -x,  y,  z,  // front
    -x, -y, -z,  -x,  y, -z,   x,  y, -z,   x, -y, -z,  // back
  ]);
  // 6 faces, 2 triangles each
  const i = new Uint16Array([
    0, 1, 2,  0, 2, 3,   // front
    1, 7, 6,  1, 6, 2,   // right
    7, 4, 5,  7, 5, 6,   // back
    4, 0, 3,  4, 3, 5,   // left
    3, 2, 6,  3, 6, 5,   // top
    4, 7, 1,  4, 1, 0,   // bottom
  ]);
  // Per-vertex normals — flat-shaded; we just use position-derived
  // normals so each face reads cleanly. Good enough at our viewing distance.
  const n = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
  ]);
  return { positions: v, indices: i, normals: n };
}

/** A thin floor plane along x-z. */
function planeGeometry(w, d) {
  const x = w / 2;
  const z = d / 2;
  const v = new Float32Array([
    -x, 0,  z,   x, 0,  z,   x, 0, -z,  -x, 0, -z,
  ]);
  const i = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const n = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  return { positions: v, indices: i, normals: n };
}

/* ── glTF assembly ───────────────────────────────────────────────────── */
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('CabinScene');

// Materials. Hex → linear-ish RGB approximation good enough for unlit cabin.
function hex(h, a = 1) {
  const r = ((h >> 16) & 255) / 255;
  const g = ((h >> 8) & 255) / 255;
  const b = (h & 255) / 255;
  return [r, g, b, a];
}
// Economy seat — vivid premium blue. Brighter than the floor so each
// seat reads as its own object from the top-down camera.
const matSeat = doc.createMaterial('SeatEconomy')
  .setBaseColorFactor(hex(0x4A5878))
  .setMetallicFactor(0.05)
  .setRoughnessFactor(0.5);
// Business seat — a deeper richer tone so the cabin classes read
// differently at a glance.
const matSeatBiz = doc.createMaterial('SeatBusiness')
  .setBaseColorFactor(hex(0x1B3A6B))
  .setMetallicFactor(0.1)
  .setRoughnessFactor(0.45);
const matFloor = doc.createMaterial('Floor')
  .setBaseColorFactor(hex(0x14182A))
  .setRoughnessFactor(0.92);
const matWall = doc.createMaterial('Wall')
  .setBaseColorFactor(hex(0xE8E4D8))
  .setRoughnessFactor(0.8);

function addMesh(name, geom, material, translation = [0, 0, 0]) {
  const mesh = doc.createMesh(name);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor()
      .setType('VEC3').setArray(geom.positions).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor()
      .setType('VEC3').setArray(geom.normals || new Float32Array(geom.positions.length)).setBuffer(buffer))
    .setIndices(doc.createAccessor()
      .setType('SCALAR').setArray(geom.indices).setBuffer(buffer))
    .setMaterial(material);
  mesh.addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh).setTranslation(translation);
  scene.addChild(node);
  return node;
}

/* ── Floor (the cabin "tub") ──────────────────────────────────────────
 * Slightly inset so the walls visually frame it. Tinted dark navy
 * so the seats and aisle accent both read against it. */
addMesh('Floor', planeGeometry(CONFIG.hull.diameter * 0.95, CONFIG.hull.length), matFloor, [0, 0, 0]);

/* ── Aisle accent — lighter strip down the centre so the cabin reads
 *    as a real plane interior, not just a sea of seats. */
const matAisle = doc.createMaterial('Aisle')
  .setBaseColorFactor(hex(0x2A2F40))
  .setRoughnessFactor(0.85);
addMesh('Aisle', planeGeometry(CONFIG.aisleWidth, CONFIG.hull.length * 0.92), matAisle, [0, 0.01, 0]);

/* ── Walls — kept SHORT (~half seat height) so seats are visible from
 *    above. Real cabin ceiling is omitted on purpose: the user is
 *    looking INTO the cabin to pick a seat, so a closed roof would
 *    just hide everything. Reads as an "exploded" / cutaway view —
 *    the same trick most airline apps use. */
const wallHeight = 0.4;
addMesh('WallLeft', boxGeometry(0.08, wallHeight, CONFIG.hull.length), matWall, [-CONFIG.hull.diameter * 0.475, wallHeight / 2, 0]);
addMesh('WallRight', boxGeometry(0.08, wallHeight, CONFIG.hull.length), matWall, [ CONFIG.hull.diameter * 0.475, wallHeight / 2, 0]);
addMesh('WallFront', boxGeometry(CONFIG.hull.diameter * 0.95, wallHeight, 0.08), matWall, [0, wallHeight / 2, -CONFIG.hull.length / 2]);
addMesh('WallBack', boxGeometry(CONFIG.hull.diameter * 0.95, wallHeight, 0.08), matWall, [0, wallHeight / 2,  CONFIG.hull.length / 2]);

/* ── Window strip — small cyan blocks set into the walls so you can
 *    tell which side is "windows" at a glance. Mostly visual — the
 *    runtime doesn't need to know which seats are windows from the
 *    GLB itself (Kyte's seatmap response carries that flag). */
const matWindow = doc.createMaterial('Window')
  .setBaseColorFactor(hex(0x3FA9FF, 1))
  .setEmissiveFactor([0.15, 0.45, 0.95])
  .setRoughnessFactor(0.1)
  .setMetallicFactor(0.0);
const windowSpacing = 0.78;
const windowCount = Math.floor(CONFIG.hull.length / windowSpacing) - 4;
const windowStart = -CONFIG.hull.length / 2 + windowSpacing * 2;
for (let i = 0; i < windowCount; i++) {
  const zPos = windowStart + i * windowSpacing;
  addMesh(`window_L_${i}`, boxGeometry(0.04, 0.18, 0.35), matWindow, [-CONFIG.hull.diameter * 0.475 - 0.02, wallHeight + 0.05, zPos]);
  addMesh(`window_R_${i}`, boxGeometry(0.04, 0.18, 0.35), matWindow, [ CONFIG.hull.diameter * 0.475 + 0.02, wallHeight + 0.05, zPos]);
}

/* ── Seats ───────────────────────────────────────────────────────────── */

/**
 * Layout each row. z = front-to-back, starting from front of cabin.
 * Each seat mesh is named `seat_<rowNumber><letter>` so the runtime
 * can match it to a seat ID returned by the booking API.
 */
let z = -CONFIG.hull.length / 2 + 1; // start near the front
let rowNumber = 1;

function placeRow(cfg, material) {
  const halfSeats = cfg.seatLetters.length / 2;
  const totalRowWidth = cfg.seatsPerSide * cfg.seatWidth * 2 + CONFIG.aisleWidth;
  const startX = -totalRowWidth / 2;
  for (let i = 0; i < cfg.seatLetters.length; i++) {
    let x;
    if (i < halfSeats) {
      x = startX + (i + 0.5) * cfg.seatWidth;
    } else {
      x = startX + halfSeats * cfg.seatWidth + CONFIG.aisleWidth + (i - halfSeats + 0.5) * cfg.seatWidth;
    }
    const seatName = `seat_${rowNumber}${cfg.seatLetters[i]}`;
    addMesh(
      seatName,
      boxGeometry(cfg.seatWidth * 0.85, cfg.seatHeight, cfg.seatPitch * 0.62),
      material,
      [x, cfg.seatHeight / 2 + 0.05, z],
    );
  }
  z += cfg.seatPitch;
  rowNumber += 1;
}

for (let r = 0; r < CONFIG.business.rows; r++) placeRow(CONFIG.business, matSeatBiz);
// Small gap between cabins to read as a "class divider"
z += 0.5;
for (let r = 0; r < CONFIG.economy.rows; r++) placeRow(CONFIG.economy, matSeat);

/* ── Write the binary glTF ───────────────────────────────────────────── */
const io = new NodeIO();
const glb = await io.writeBinary(doc);

const outPath = 'public/3d/whole_cabin.glb';
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, glb);

const totalSeats = CONFIG.business.rows * CONFIG.business.seatLetters.length
  + CONFIG.economy.rows * CONFIG.economy.seatLetters.length;

console.log(`✓ wrote ${outPath} — ${(glb.byteLength / 1024).toFixed(1)} KB · ${totalSeats} seats · ${CONFIG.business.rows + CONFIG.economy.rows} rows`);
