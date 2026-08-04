/**
 * iOS launch-image table.
 *
 * Safari only shows a splash for a home-screen PWA when a
 * `<link rel="apple-touch-startup-image">` matches the device EXACTLY — CSS
 * pixel dimensions and DPR all have to line up, so this is a lookup table
 * rather than anything derivable.
 *
 * Shared by scripts/generate-splash.mjs (which rasterizes one PNG per row) and
 * app/layout.tsx (which emits one <link> per row), so the two can never drift.
 * Kept to erasable-syntax-only TypeScript so Node can type-strip and import it
 * directly from the generator script.
 *
 * Adding a device: open Safari on it and read `window.screen.width`,
 * `window.screen.height` and `devicePixelRatio`; add a row; `npm run splash`.
 *
 * Portrait only — the manifest requests `orientation: portrait`, and this is a
 * phone-first app. Consequence: an iPad launched in landscape gets a blank
 * splash rather than a branded one.
 */
export interface AppleSplashScreen {
  /** Physical pixel width of the generated PNG. */
  width: number;
  /** Physical pixel height of the generated PNG. */
  height: number;
  /** CSS pixel width, used in the media query. */
  cssWidth: number;
  /** CSS pixel height, used in the media query. */
  cssHeight: number;
  /** Device pixel ratio, used in the media query. */
  ratio: number;
  /** Human-readable device list; documentation only. */
  label: string;
}

export const APPLE_SPLASH_SCREENS: AppleSplashScreen[] = [
  { width: 750, height: 1334, cssWidth: 375, cssHeight: 667, ratio: 2, label: 'iPhone SE (2nd/3rd gen), 6/7/8' },
  { width: 1242, height: 2208, cssWidth: 414, cssHeight: 736, ratio: 3, label: 'iPhone 8 Plus' },
  { width: 1125, height: 2436, cssWidth: 375, cssHeight: 812, ratio: 3, label: 'iPhone X, XS, 11 Pro, 12/13 mini' },
  { width: 828, height: 1792, cssWidth: 414, cssHeight: 896, ratio: 2, label: 'iPhone XR, 11' },
  { width: 1242, height: 2688, cssWidth: 414, cssHeight: 896, ratio: 3, label: 'iPhone XS Max, 11 Pro Max' },
  { width: 1170, height: 2532, cssWidth: 390, cssHeight: 844, ratio: 3, label: 'iPhone 12, 12 Pro, 13, 13 Pro, 14' },
  { width: 1284, height: 2778, cssWidth: 428, cssHeight: 926, ratio: 3, label: 'iPhone 12/13 Pro Max, 14 Plus' },
  { width: 1179, height: 2556, cssWidth: 393, cssHeight: 852, ratio: 3, label: 'iPhone 14 Pro, 15, 15 Pro, 16' },
  { width: 1290, height: 2796, cssWidth: 430, cssHeight: 932, ratio: 3, label: 'iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus' },
  { width: 1206, height: 2622, cssWidth: 402, cssHeight: 874, ratio: 3, label: 'iPhone 16 Pro' },
  { width: 1320, height: 2868, cssWidth: 440, cssHeight: 956, ratio: 3, label: 'iPhone 16 Pro Max' },
  { width: 1668, height: 2388, cssWidth: 834, cssHeight: 1194, ratio: 2, label: 'iPad Pro 11", iPad Air 11"' },
  { width: 2048, height: 2732, cssWidth: 1024, cssHeight: 1366, ratio: 2, label: 'iPad Pro 12.9"/13"' },
];

export const splashFileName = (s: AppleSplashScreen) => `apple-splash-${s.width}x${s.height}.png`;

export const splashMedia = (s: AppleSplashScreen) =>
  `(device-width: ${s.cssWidth}px) and (device-height: ${s.cssHeight}px) and ` +
  `(-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`;
