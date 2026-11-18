# Naqatar

Clinic appointment web app (PWA) for **Medical** and **Aesthetic** clinics, in Hinglish.
Naqatar is a clinic-only frontend built from the QuFree codebase (`K:\QuFree\app_OLD`).
It uses the **same Firebase backend** (project `qunjee-com`).

> **Status:** setup stage. The code is still a copy of QuFree. Clinic-only trimming,
> Naqatar branding and the Hinglish UI come next.
> All development happens against the **local emulator**, never production.

## Backend rules (important)

- Naqatar **never deploys** Firestore/RTDB/Storage rules or Cloud Functions. Every
  rules target in `firebase.json` runs `scripts/block-deploy.mjs`, which always fails.
- `emulator/` holds **read-only snapshots** of QuFree's rules, used only by the local
  emulator. The real backend is owned and deployed from `K:\QuFree\app_OLD`.
- Never commit `.env*` files or a service-account key. `.gitignore` covers both.

## Setup

Requirements: Node 20+, Java 11+ (Firestore emulator), Firebase CLI (`npm i -g firebase-tools`).

```bash
npm install          # .npmrc sets legacy-peer-deps (vite-plugin-pwa peer range)
cp .env.example .env.local
```

In `.env.local`, set:

```
VITE_USE_FIREBASE_EMULATOR=true
```

## Run locally (emulator + seed)

```bash
# Terminal 1: local Firebase (Auth, Firestore, RTDB, Storage); UI at http://localhost:4000
npm run emulator

# Terminal 2: clinic demo data (run once after every emulator start)
npm run seed

# Terminal 3: app at http://localhost:5173
npm run dev
```

The emulator starts empty each time it starts. Run `npm run seed` again after every restart.

### Demo accounts (password for all: `demo1234`)

| Role | Email | Clinic |
|---|---|---|
| Customer | `customer@demo.com` | 4 sample appointments |
| Owner | `carefirst@demo.com` | CareFirst Clinic (medical) |
| Owner | `smiledental@demo.com` | Smile Dental Care (medical) |
| Owner | `littlestars@demo.com` | Little Stars Child Clinic (medical) |
| Owner | `glowskin@demo.com` | Glow Skin & Laser Clinic (aesthetic) |
| Owner | `hairrestore@demo.com` | HairRestore Clinic (aesthetic) |
| Owner | `radiance@demo.com` | Radiance Aesthetics (aesthetic) |
| Owner | `newlife@demo.com` | New Life Physio Clinic (approval pending) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run emulator` | Firebase emulators (project `demo-naqatar`) |
| `npm run seed` | Clinic-only demo data; refuses to run on a non-`demo-` project |
| `npm run test:smoke` | Starts the emulator, seeds it, and checks reads under the real rules (public, customer, owner), then stops |
| `npm run test:smoke:live` | Same checks against an emulator that is **already running and seeded** (`test:smoke` can't start while ports 8080/9099 are taken) |
| `npm run brand:assets` | Regenerates logos and icons from `brand/source/` |
| `npm run sync:rules` | Refreshes `emulator/` from `K:\QuFree\app_OLD` after its rules change |

## Known limits

- Cloud Functions are not emulated: push notifications and auto-cancel don't run locally.
- FCM push needs the real project, so it doesn't run against the emulator.
- EmailJS sends real emails if its keys are set in `.env.local`. Leave them empty for local work.

## UI language (Hinglish)

All UI text goes through `t()` from `src/i18n`. The English source text is the key,
and `src/i18n/hinglish.js` holds the Hinglish translation.

```jsx
import { t } from '../../i18n';
<button>{t('Book Appointment')}</button>        // → "Appointment Book Karein"
t('{n} min', { n: 30 })                          // → "30 min"
```

- A missing key renders in English, so the UI never breaks.
- `npm run i18n:check` lists any literal `t('…')` key missing from the dictionary.
- Never name a local variable `t`: it shadows the helper (e.g. `toast((t) => …)`).
- English is kept for: day and month names (date-fns), export column headers,
  the invoice document, and iPhone button names in the install guide.

## Deploy (Hosting only)

Naqatar deploys **only** the Hosting site `naqatar` (https://naqatar.web.app) in project
`qunjee-com`. Rules and Cloud Functions are never deployed from here.

1. Create `.env.production.local` (gitignored) with the real Firebase web config and
   `VITE_USE_FIREBASE_EMULATOR=false`. It overrides `.env.local` for `npm run build` only,
   so local dev stays on the emulator.
2. Run `npm run deploy`. This builds and then runs `firebase deploy --only hosting:naqatar --project qunjee-com`.

`scripts/check-prod-build.mjs` runs before every hosting deploy and blocks a build that
points at the emulator or lacks the real project config.

One-time Firebase Console setup:
- Authentication → Settings → Authorized domains: add `naqatar.web.app` (needed for Google sign-in)
- reCAPTCHA Enterprise key → allowed domains: add `naqatar.web.app` (needed for App Check)
