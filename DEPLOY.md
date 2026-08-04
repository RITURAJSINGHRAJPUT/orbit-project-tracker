# Deploying Orbit

Hosting on Vercel, then packaging the live site as an installable Android APK with PWABuilder.

Orbit is entirely client-side — all data lives in IndexedDB, and there are no API routes or server actions.

**Environment variables are optional.** The app deploys and runs fully without any. Set the two Supabase keys only if you want cloud sync (§9) — without them the Sync section simply doesn't appear and everything stays local.

---

## 0. Prerequisites

- Node ≥ 20.9 and npm
- A Vercel account (free tier is fine)
- An Android phone for testing

**You do not need** Java, the Android SDK, Android Studio, Gradle, or Bubblewrap. PWABuilder does the packaging in the browser.

---

## 1. Regenerate assets

Icons and splash screens are generated from two SVGs and committed to the repo.

```bash
npm run assets        # icons + splash
npm run icons         # just the icons
npm run splash        # just the iOS launch images
```

**Re-run after** editing `public/icons/icon.svg` (the app icon, rounded plate) or `public/icons/icon-mark.svg` (the bare mark used for maskable icons and splashes). Keep both visually in sync with `components/brand/OrbitLogo.tsx`.

Output:

| Files | Purpose |
|---|---|
| `public/icons/icon-{72…1024}.png` | Manifest icons, favicon, notification icon |
| `public/icons/maskable-{192,512,1024}.png` | Android adaptive icons — padded so the circular mask can't clip the mark |
| `public/apple-touch-icon.png` | iOS home screen (180×180, no alpha) |
| `public/splash/apple-splash-*.png` | 13 iOS launch images (~318 KB total) |

`npm run icons` **fails the build if the maskable artwork outgrows Android's 66% safe area** — that guard exists so a future logo tweak can't silently ship a clipped icon.

### Adding a new iPhone to the splash table

iOS only shows a launch image when a `<link>` matches the device exactly, so each screen needs its own row. On the device, open Safari and run:

```js
console.log(screen.width, screen.height, devicePixelRatio)
```

Add a row to `APPLE_SPLASH_SCREENS` in `lib/pwa/splash-screens.ts` (`cssWidth`/`cssHeight` are the first two numbers, `width`/`height` are those multiplied by `ratio`), then `npm run splash`. Both the PNG and the `<link>` are driven off that one table.

---

## 2. Local production smoke test

The service worker only registers in production builds (in dev it actively unregisters itself, so it can't serve stale chunks over HMR). Test it like this:

```bash
npm run build && npm start     # http://localhost:3000
```

Offline checklist:
1. Load `/projects` once **online**.
2. DevTools → Network → **Offline**.
3. Hard-reload. The app should render, not an offline page.
4. Tap through Projects / Dashboard / Settings — all three should work offline.

**The offline contract:** after one online visit, everything needed is cached — HTML, every build chunk, the self-hosted Inter font, and the brand assets. Data was already local. From the second launch onward the app works with no network at all.

---

## 3. Deploy to Vercel

No `vercel.json` is needed. Vercel auto-detects Next.js, and the `headers()` rules in `next.config.ts` (the `/sw.js` content-type, `no-store`, and CSP) are compiled into the routes manifest and served natively.

### 3a. Commit first

The app is currently almost entirely untracked — only the create-next-app scaffold is in git.

```bash
git add -A
git commit -m "Orbit: PWA assets, splash screens, offline service worker"
```

`.env*`, `.next/`, and `node_modules/` are already gitignored.

### 3b. Vercel CLI — fastest route to a live URL

```bash
npx vercel login      # opens a browser (manual)
npx vercel            # prompts: scope, link existing? N, name, root ./, override? N
npx vercel --prod     # → https://<project>.vercel.app
```

That production URL is what PWABuilder needs.

### 3c. GitHub + Git integration — better long term

`gh` is not installed, so the repo has to be created in the browser.

1. github.com/new → new repo, **no** README/gitignore/license
2. ```bash
   git remote add origin https://github.com/<user>/orbit-app.git
   git branch -M main
   git push -u origin main
   ```
3. vercel.com/new → Import Git Repository → select it → Deploy

Every push to `main` is now a production deploy. You can start with 3b and attach the repo later with `vercel git connect`.

### 3d. Verify the deployment

```bash
BASE=https://<your-project>.vercel.app

curl -sI  $BASE/sw.js | grep -i 'content-type\|cache-control'   # javascript + no-store
curl -sI  $BASE/icons/icon-512.png | head -1                    # 200
curl -s   $BASE/manifest.json | jq -r '.icons[].src' \
  | while read u; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' $BASE$u)" "$u"; done
```

Every icon must return `200`. A 404 here is the single most common reason PWABuilder rejects a site.

---

## 4. Build the APK with PWABuilder

Entirely manual, in a browser. **The site must be live first.**

1. Go to **pwabuilder.com**, enter your Vercel URL, run the report card. Manifest, service worker, and security should all pass.
2. **Package For Stores → Android → Generate Package.**
3. Options that matter:

| Field | Value |
|---|---|
| Package ID | e.g. `app.vercel.orbit_app.twa` — lowercase, dot-separated, **no hyphens** |
| App name | `Orbit – Project Tracker` |
| Short name | `Orbit` |
| Start URL | `/projects` |
| Display mode | `standalone` |
| Theme / Background / Nav bar colour | `#0F172A` |
| Icon | `/icons/icon-512.png` |
| Signing key | **Create new** (first time only) |

> **The Package ID is permanent.** Changing it later produces a different app that cannot update the installed one — users would have to uninstall and reinstall.

4. Download the zip: `app-release-signed.apk`, `app-release-bundle.aab`, `assetlinks.json`, `signing.keystore`, `signing-key-info.txt`.

> **Back up `signing.keystore` plus its password and key alias somewhere permanent, outside this repo.** Without them you can never ship an update to the same installed app. Never commit them — they are private keys.

---

## 5. assetlinks.json

This is what proves your APK and your domain belong together. Without it the app opens in a Chrome Custom Tab **with a visible URL bar** — it looks like a browser, not an installed app.

It has to come *after* step 4, because the file contains the signing key's SHA-256 fingerprint, which doesn't exist until PWABuilder generates the key.

1. Copy the `assetlinks.json` from the zip to **`public/.well-known/assetlinks.json`**:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.vercel.orbit_app.twa",
    "sha256_cert_fingerprints": ["AA:BB:…:FF"]
  }
}]
```

2. Commit and redeploy.
3. Verify **before installing the APK**:

```bash
curl -s https://<your-domain>/.well-known/assetlinks.json
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<your-domain>&relation=delegate_permission/common.handle_all_urls"
```

> Android caches this verification **at install time**. If you install the APK before assetlinks is live, fixing it afterwards requires uninstalling and reinstalling.

**Play Store note:** if you ever upload to Google Play, Play re-signs the app with its own key, which has a different fingerprint. You then need **both** fingerprints in `sha256_cert_fingerprints`.

---

## 6. Install and test on the device

1. Transfer `app-release-signed.apk` to the phone (USB, Drive, email).
2. Allow "Install unknown apps" for whichever app opens it.
3. Install and launch.

Check:
- [ ] **No URL bar** at the top — this is the definitive assetlinks check
- [ ] Branded splash on launch, then the app
- [ ] Icon on the home screen is the Orbit mark, not clipped or letterboxed
- [ ] Content clears the status bar and gesture bar (safe areas)
- [ ] Create a project, force-quit, reopen — it persists
- [ ] **Airplane mode, then cold launch** — the app still works

---

## 7. Updating later

**Web changes ship without touching the APK.** The TWA loads your live site, so `git push` (or `npx vercel --prod`) reaches users on their next launch. Bump `VERSION` in `public/sw.js` when you change caching behaviour so old caches get purged.

**You only need to rebuild the APK** when changing: app name, package ID, launcher icon, `theme_color`, `start_url`, display mode, or orientation. Rebuild with the **same `signing.keystore`**, or the update will be rejected as a different app.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| URL bar visible in the APK | assetlinks missing, wrong fingerprint, or installed before it went live. Fix the file, redeploy, then **uninstall and reinstall**. |
| Blank screen offline | The first visit must complete online. Confirm `orbit-static-v3` contains `/_next/static/…` entries in DevTools → Application → Cache Storage. |
| Icon changes not showing | Bump `VERSION` in `public/sw.js`, redeploy, then reinstall the APK. Android also caches launcher icons aggressively. |
| White splash on a new iPhone | That device isn't in `APPLE_SPLASH_SCREENS`. Add a row (see §1) and `npm run splash`. |
| PWABuilder rejects the manifest icon | Remove the trailing `icon.svg` entry from `manifest.json` — the PNGs alone satisfy installability. |
| `/.well-known/assetlinks.json` 404s | Shouldn't happen — Next serves the dotfolder from `public/` (verified: `200`, `application/json`). If a host ever strips it, add `async rewrites() { return [{ source: '/.well-known/assetlinks.json', destination: '/assetlinks.json' }] }` to `next.config.ts` and move the file to `public/assetlinks.json`. |
| `next build` fails fetching fonts | `next/font/google` downloads Inter at build time. Needs network (Vercel has it). Offline fallback: switch to `next/font/local` with the woff2 committed. |

---

## 9. Optional: cloud sync with Supabase

Without this, projects live only in IndexedDB on one device — and **Android wipes app data when the APK is uninstalled**. Turning on sync gives you a backup that survives that, plus the same projects on your phone and laptop.

The app stays local-first either way: IndexedDB remains the source of truth, everything works offline and signed out, and sync is a background addition on top.

### 9a. Create the project and schema

1. Create a project at supabase.com.
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → Run. That creates the `projects` table, its index, and the row-level-security policy that scopes every row to its owner.
3. **Settings → API** → copy the Project URL and the `anon` public key.

### 9b. Configure auth

- **Auth → URL Configuration** → add your Vercel URL as Site URL, and add both `https://<your-app>.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` to Redirect URLs.

- **Auth → Emails → Templates** → add **`{{ .Token }}`** to **two** templates, not one:

  | Template | When it's used |
  |---|---|
  | **Confirm signup** | The very first time an address signs in — no account exists yet |
  | **Magic Link** | Every sign-in after that |

  It's easy to only do Magic Link and then wonder why the first email has a link but no code. Something like:

  ```html
  <h2>Confirm your email</h2>
  <p>Your Orbit verification code is:</p>
  <p style="font-size:30px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
  <hr>
  <p>Or <a href="{{ .ConfirmationURL }}">confirm by link</a>.</p>
  ```

  Editing a template doesn't affect emails already sent — request a fresh code after saving.

> Why the code and not just the link: tapping a magic link on a phone often opens a *different* browser than the installed app, so the session lands somewhere you can't see. Typing the code keeps everything in one window. The link still works on desktop.
>
> The app handles the token-type difference for you: a first-time code verifies as `signup` and a returning one as `email`, and `SignInSheet` tries both — otherwise a correct code would be rejected on first use.

### Email sending limits (no SMTP configured)

This setup uses **Supabase's built-in email sender**, which is fine for a personal single-user app but has real limits worth knowing before they surprise you:

- **Roughly 2 emails per hour** on the free tier. Enough for occasional sign-ins; you *will* hit it while testing, and the symptom is simply no email arriving. Wait an hour rather than assuming something is broken.
- **Deliverability is mediocre** — check spam if a code doesn't show up.
- Supabase marks it as not intended for production.

Since you sign in rarely and only from your own devices, that's an acceptable trade. If it becomes annoying, add custom SMTP under **Project Settings → Authentication → SMTP Settings** — Brevo (300/day free, works with just a verified sender address, no domain needed) or Resend (3,000/month, better deliverability, wants a domain) are both straightforward. Nothing in the app changes; it's purely a dashboard setting.

### 9c. Set the keys

Local — in `.env.local`, replacing the `your_...` placeholders:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Vercel — **Settings → Environment Variables**, same two names, Production + Preview, then redeploy.

The anon key is public by design; it's safe in a client bundle. RLS is the actual security boundary, which is why §9a is not optional.

### 9d. Use it

Open **Settings → Cloud Sync → Not syncing**, enter your email, then the 6-digit code. Everything already on the device uploads on first sign-in — ids are client-generated UUIDs, so nothing is duplicated or renumbered.

After that, sync runs on sign-in, when the device comes back online, when the app is foregrounded, and a couple of seconds after any edit. Offline edits queue up and drain automatically.

**To verify it actually works:** sign in on a second browser or device and confirm your projects appear. That is also the real test of the uninstall-survival story.

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| No "Cloud Sync" section in Settings | The keys aren't set, or the URL doesn't look like `https://….supabase.co`. Placeholder values are rejected on purpose. |
| Email arrives with a link but no code | The template is missing `{{ .Token }}`. On a **first** sign-in that's **Confirm signup**, not Magic Link — both need it (§9b). |
| No email arrives at all | Most likely the built-in sender's ~2/hour limit — wait an hour, and check spam. See "Email sending limits" above. |
| The emailed link doesn't sign you in | It points at wherever you started the sign-in, so a link from `localhost` won't open on your phone, and the URL must be in Supabase's Redirect URLs. Use the 6-digit code instead — it doesn't depend on either. |
| "Sync failed" | Usually the schema or RLS policy hasn't been run — check §9a. The error surfaces under the account row in Settings. Data is never lost: rows stay marked pending and retry. |
| Signed in but nothing uploads | Confirm the SQL ran against the same project the keys point at. |
| Changes not appearing on the other device | Sync is pull-on-foreground, not realtime. Background the app and reopen it, or tap **Sync now**. |
