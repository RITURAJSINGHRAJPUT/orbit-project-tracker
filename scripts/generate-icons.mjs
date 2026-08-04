#!/usr/bin/env node
/**
 * Rasterizes the Orbit brand mark into every PNG the PWA and the TWA/APK need.
 *
 *   npm run icons
 *
 * Idempotent — safe to re-run after editing public/icons/icon*.svg.
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS = path.join(PUBLIC, 'icons');

const BRAND_BG = '#0F172A';

/** Sizes for the plain ("any" purpose) icon — the rounded-plate artwork. */
const ANY_SIZES = [72, 96, 128, 144, 192, 256, 384, 512, 1024];
/** Sizes for the maskable icon — Android masks these to a circle/squircle. */
const MASKABLE_SIZES = [192, 512, 1024];

/**
 * Android's adaptive-icon spec only guarantees the central 66% diameter is
 * visible. The mark fills ~73.5% of its own canvas, so it's scaled to 82% of
 * the tile before compositing: 0.82 x 73.5% ~= 60% final diameter, safely
 * inside both the 66% adaptive area and the 80% maskable circle.
 */
const MASKABLE_INNER = 0.82;
/** Android guarantees the central 66% diameter; asserted below so this can't drift. */
const MASKABLE_MAX_DIAMETER_RATIO = 0.66;

/**
 * Rasterize at native resolution by scaling librsvg's DPI, rather than
 * rendering once and upscaling a bitmap (which would soften the strokes).
 */
const render = (svg, size) =>
  sharp(svg, { density: Math.ceil((72 * size) / 512) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

/**
 * Widest opaque radius from centre divided by half the tile — which is the
 * artwork's diameter as a fraction of the tile width.
 */
async function contentDiameterRatio(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  let maxSq = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * channels + 3] < 8) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d > maxSq) maxSq = d;
    }
  }
  return Math.sqrt(maxSq) / (w / 2);
}

const log = async (file, buf) => {
  await writeFile(file, buf);
  const { width, height } = await sharp(buf).metadata();
  console.log(`  ${path.relative(ROOT, file).padEnd(38)} ${width}x${height}  ${(buf.length / 1024).toFixed(1)} KB`);
};

async function main() {
  await mkdir(ICONS, { recursive: true });

  const iconSvg = await readFile(path.join(ICONS, 'icon.svg'));
  const markSvg = await readFile(path.join(ICONS, 'icon-mark.svg'));

  console.log('\nAny-purpose icons (rounded plate, alpha preserved)');
  for (const size of ANY_SIZES) {
    await log(path.join(ICONS, `icon-${size}.png`), await render(iconSvg, size));
  }

  console.log('\nMaskable icons (full-bleed brand field, safe-zone padded)');
  for (const size of MASKABLE_SIZES) {
    const inner = Math.round(size * MASKABLE_INNER);
    const buf = await sharp({
      create: { width: size, height: size, channels: 4, background: BRAND_BG },
    })
      .composite([{ input: await render(markSvg, inner), gravity: 'centre' }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    await log(path.join(ICONS, `maskable-${size}.png`), buf);
  }

  // Guard the safe zone using the transparent mark, since the composited
  // maskable tile is opaque corner to corner by design.
  const probe = await render(markSvg, Math.round(512 * MASKABLE_INNER));
  const padded = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: probe, gravity: 'centre' }])
    .png()
    .toBuffer();
  const ratio = await contentDiameterRatio(padded);
  console.log(
    `\nMaskable safe zone: artwork spans ${(ratio * 100).toFixed(1)}% of the tile ` +
      `(Android guarantees ${MASKABLE_MAX_DIAMETER_RATIO * 100}%)`
  );
  if (ratio > MASKABLE_MAX_DIAMETER_RATIO) {
    throw new Error(
      `Maskable artwork exceeds Android's adaptive-icon safe area ` +
        `(${(ratio * 100).toFixed(1)}% > ${MASKABLE_MAX_DIAMETER_RATIO * 100}%). Lower MASKABLE_INNER.`
    );
  }

  // iOS composites any alpha to black, so this one is flattened onto the brand
  // colour. Lives at the public root to also satisfy iOS's implicit lookup of
  // /apple-touch-icon.png.
  console.log('\nApple touch icon (flattened, no alpha)');
  const apple = await sharp(await render(iconSvg, 180))
    .flatten({ background: BRAND_BG })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await log(path.join(PUBLIC, 'apple-touch-icon.png'), apple);

  await generateAvatar();

  console.log('\nDone.\n');
}

/**
 * Profile photo → a small square avatar.
 *
 * The source is a full portrait, so it's cropped to the head before resizing —
 * a straight square resize leaves the face too small to read in a 36px circle.
 * The window is fixed rather than sharp's `attention` strategy, because the
 * source is already square and every automatic strategy therefore picked
 * essentially the whole frame.
 *
 * Skipped silently when there's no profile photo; the UI falls back to initials.
 */
async function generateAvatar() {
  const source = path.join(PUBLIC, 'profile.jpeg');
  try {
    await access(source);
  } catch {
    console.log('\nAvatar: no public/profile.jpeg — skipping (UI falls back to initials)');
    return;
  }

  const HEAD_CROP = { left: 300, top: 0, width: 1100, height: 1100 };
  const { width = 0, height = 0 } = await sharp(source).metadata();

  // Only crop when the source is big enough to contain the window; otherwise
  // fall back to a plain square cover so a replacement photo can't break this.
  const fits = width >= HEAD_CROP.left + HEAD_CROP.width && height >= HEAD_CROP.top + HEAD_CROP.height;
  if (!fits) {
    console.log(`\nAvatar: source is ${width}x${height}, too small for the head crop — using a centre square`);
  }

  let pipeline = sharp(source);
  if (fits) pipeline = pipeline.extract(HEAD_CROP);

  const buf = await pipeline
    .resize(192, 192, { fit: 'cover' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  console.log('\nAvatar (192px covers the 36px header and 48px settings tile at 3x)');
  await log(path.join(PUBLIC, 'avatar-192.jpg'), buf);
}

main().catch((err) => {
  console.error(`\nicon generation failed: ${err.message}\n`);
  process.exit(1);
});
