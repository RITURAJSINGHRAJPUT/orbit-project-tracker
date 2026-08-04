# Orbit

A mobile-first personal project tracker. Offline-first PWA, installable to a phone home screen or packaged as an Android APK.

Projects live in IndexedDB on the device, so the app works with no network and no account. Cloud sync to Supabase is optional and additive — turn it on and your data survives an uninstall and follows you across devices.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

The service worker only registers in production builds — in dev it unregisters itself so it can't serve stale chunks over hot reload. To exercise offline behaviour:

```bash
npm run build && npm start
```

## Docs

| | |
|---|---|
| [PWA.md](PWA.md) | Installing on Android / iOS / desktop, how offline works, service-worker strategy, troubleshooting |
| [DEPLOY.md](DEPLOY.md) | Hosting on Vercel, building the Android APK with PWABuilder, and setting up Supabase sync |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run assets` | Regenerate all icons and splash images |
| `npm run icons` / `splash` | Either half on its own |

Run `npm run assets` after editing `public/icons/icon.svg` (the app icon) or `public/icons/icon-mark.svg` (the bare mark used for maskable icons and splash screens).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Base UI · Dexie (IndexedDB) · Zustand · Recharts · Supabase (optional sync)

## Layout

```
app/            routes — projects, dashboard, settings, auth callback
components/     ui/ (primitives) · layout/ · projects/ · sync/ · brand/
lib/            db/ (Dexie) · store/ · sync/ · pwa/ · validations/
scripts/        icon + splash generators
supabase/       schema.sql — run once in the Supabase SQL editor
public/         manifest, service worker, generated icons and splash images
```
