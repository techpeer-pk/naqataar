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
| `npm run sync:rules` | Refreshes `emulator/` from `K:\QuFree\app_OLD` after its rules change |

## Known limits

- Cloud Functions are not emulated: push notifications and auto-cancel don't run locally.
- FCM push needs the real project, so it doesn't run against the emulator.
- EmailJS sends real emails if its keys are set in `.env.local`. Leave them empty for local work.
