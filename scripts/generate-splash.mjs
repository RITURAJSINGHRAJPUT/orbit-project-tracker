#!/usr/bin/env node
/**
 * Renders one iOS launch image per device in lib/pwa/splash-screens.ts.
 *
 *   npm run splash
 *
 * Each is a flat #0F172A field with the Orbit mark centred — matching what the
 * in-app SplashScreen paints, so the handoff from the OS launch image to the
 * React splash is seamless.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { APPLE_SPLASH_SCREENS, splashFileName } from '../lib/pwa/splash-screens.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'splash');

const BRAND_BG = '#0F172A';
/** Mark size as a fraction of the short edge. */
const MARK_SCALE = 0.52;
/**
 * These images are ~97% flat brand colour, so an indexed palette cuts the set
 * from ~846 KB to ~318 KB. Flip to false if the gradient ever bands visibly.
 */
const USE_PALETTE = true;

async function main() {
  await mkdir(OUT, { recursive: true });
  const markSvg = await readFile(path.join(ROOT, 'public', 'icons', 'icon-mark.svg'));

  let total = 0;
  for (const screen of APPLE_SPLASH_SCREENS) {
    const { width, height } = screen;
    const markSize = Math.round(Math.min(width, height) * MARK_SCALE);

    const mark = await sharp(markSvg, { density: Math.ceil((72 * markSize) / 512) })
      .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const png = sharp({ create: { width, height, channels: 4, background: BRAND_BG } })
      .composite([{ input: mark, gravity: 'centre' }]);

    const buf = await (USE_PALETTE
      ? png.png({ palette: true, quality: 100, effort: 10 })
      : png.png({ compressionLevel: 9, adaptiveFiltering: true })
    ).toBuffer();

    const file = path.join(OUT, splashFileName(screen));
    await writeFile(file, buf);
    total += buf.length;
    console.log(`  ${splashFileName(screen).padEnd(30)} ${String(width).padStart(4)}x${String(height).padEnd(4)}  ${(buf.length / 1024).toFixed(1).padStart(6)} KB  ${screen.label}`);
  }

  console.log(`\n${APPLE_SPLASH_SCREENS.length} launch images, ${(total / 1024).toFixed(0)} KB total${USE_PALETTE ? ' (palette)' : ''}.\n`);
}

main().catch((err) => {
  console.error(`\nsplash generation failed: ${err.message}\n`);
  process.exit(1);
});
