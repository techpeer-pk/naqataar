# Naqatar: Roadmap aur Development Timeline

**Project:** Naqatar, Clinic Appointment Web App (PWA), **Medical + Aesthetic**
**Base:** QuFree ka frontend (`K:\QuFree\app_OLD`, branch `feat/appobook`, commit `4e1dbf2`), sirf clinic module
**Stack:** React 18 + Vite + PWA (QuFree jaisa)
**Backend (BaaS):** Wahi Firebase project (`qunjee-com`). **Backend ko haath nahi lagana.**
**UI language:** Hinglish (Roman Urdu/Hindi + English)
**Host:** `naqatar.web.app`
**Version control:** GitHub (private repo `naqatar`)
**Updated:** 18 Nov 2026

---

## 1. Faislon ka record

| Tareekh | Faisla | Wajah |
|---|---|---|
| 18 Nov | ~~React Native (Expo), 14 hafte~~ | Pehla plan. UI dobara likhna padta |
| 18 Nov | **QuFree PWA ki copy, sirf clinic module** | QuFree ka tested code reuse hota hai, launch dinon mein |
| 18 Nov | **Backend nahi chherna** | Rules aur functions sirf `app_OLD` se. QuFree aur TWA par koi khatra nahi |
| 18 Nov | **Development sirf emulator + seed par** | Production data ko test mein nahi chhoona |
| 18 Nov | Brand colors: teal `#1D565D`, gold `#A9873F` | Logo se liye gaye. QuFree ka teal (`#1B5566`) taqreeban yahi hai |

---

## 2. Hamesha ke usool

1. **Naqatar se sirf Hosting deploy hoga.** Firestore/RTDB/Storage rules aur Cloud Functions kabhi nahi. `scripts/block-deploy.mjs` har rules deploy ko rokta hai.
2. `emulator/` mein QuFree ke rules ki **read-only copy** hai. Asal security wahi rules hain jo `app_OLD` se deploy hote hain. QuFree mein rules badlein to `npm run sync:rules` chalayein.
3. **Data shape QuFree jaisa.** Appointment, business aur user docs ke fields wahi rahenge, warna rules reject karenge.
4. Firestore tak har read/write `src/hooks/` ke zariye (QuFree ka usool).
5. `.env*` aur service-account key kabhi commit nahi hongi.
6. Har tabdeeli ke baad: `npm run build` + `npm run test:smoke`.

---

## 3. Phases aur timeline

| # | Phase | Dates | Kaam | Status |
|---|---|---|---|---|
| **P0** | Bootstrap | 18 Nov | QuFree copy, emulator config (`demo-naqatar`), deploy-block, clinic seed (6+1 clinics, customer, 4 appointments), smoke test (6 checks), README, Git | ✅ Done (`7ebd745`) |
| **P1** | Brand assets | 18 – 19 Nov | Logo se favicon, PWA icons (any + maskable), Apple touch icon, notification badge, OG image (1200×628), transparent logo/wordmark (dark aur light) | 🔄 Jari |
| **P2** | Clinic-only | 19 – 20 Nov | `App.jsx`: sirf clinic ke customer + admin routes, baaqi redirect. Home par **Medical / Aesthetic** tabs. Navbar, BottomNav, Footer mein sirf clinic links. AdminRegister mein sirf `clinic` type. Ghair-zaroori pages, assets aur dependencies hatana | ⏳ |
| **P3** | Branding wire-up | 20 Nov | PWA manifest (naam, icons, theme), `index.html` meta/OG/title, ~20 jagah QuFree logos ki jagah Naqatar, gold accent. **QuFree ke Google Analytics tags hatana**. `qufree.web.app` links, sitemap, robots | ⏳ |
| **P4** | Hinglish UI | 23 – 25 Nov | ~400 strings, 22 files. Ek dictionary file (`src/i18n/hinglish.js`) taa ke baad mein English add ho sake. Pehle customer screens, phir clinic admin | ⏳ |
| **P5** | QA (emulator) | 26 – 27 Nov | Neeche di gayi checklist (Sec. 4), mobile/responsive check, PWA install (Android Chrome, iOS Safari), smoke test mein booking aur cancel ke checks add karna | ⏳ |
| **P6** | Launch ki tayyari *(owner ke kaam, P2–P5 ke saath saath)* | 27 Nov tak | Sec. 5 ki checklist | ⏳ |
| **P7** | 🌐 **Web launch** | **~30 Nov** | `npm run build`, phir sirf `hosting:naqatar` deploy. Production par 1 asli test booking (test clinic) | ⏳ |
| **P8** | 🤖 Android (TWA) | 1 – 4 Dec build, phir review | Bubblewrap TWA, `assetlinks.json`, Play listing, privacy policy. *Agar Play account naya personal account hai: 12 testers ke saath 14 din ka closed test* | ⏳ |
| **P9** | 🍎 iOS | Baad mein | Abhi: Safari "Add to Home Screen" guide. App Store chahiye ho to **Capacitor** wrapper (native push, Sign in with Apple) | 🔜 |

**Milestones**
- **M1 (20 Nov):** Naqatar-branded, clinic-only app emulator par chalti hai
- **M2 (25 Nov):** Poori Hinglish UI
- **M3 (~30 Nov):** `naqatar.web.app` live
- **M4 (Dec):** Play Store par Android

---

## 4. QA checklist (P5, emulator)

**Customer**
- [ ] Home: Medical aur Aesthetic dono tabs mein sahi clinics, pending clinic nazar nahi aata
- [ ] Clinic page: services, timings, address
- [ ] Booking: ek aur kai services, slot picker, band din (Sunday), guzra hua waqt block
- [ ] Do customers ek hi aakhri slot par: sirf ek ki booking ho (double-booking test)
- [ ] Payment proof upload (Storage emulator)
- [ ] Confirmation + bookingRef
- [ ] My Appointments: list, cancel with reason, slot wapas free
- [ ] Login, register, logout, Google login (web popup)

**Clinic owner**
- [ ] Register (Medical/Aesthetic), "approval pending" dashboard (`newlife@demo.com`)
- [ ] Appointments: confirm, cancel, no-show, complete
- [ ] Services: add, edit, delete
- [ ] Profile, working hours, logo upload
- [ ] Doosre clinic ka data nazar na aaye

**Platform**
- [ ] Mobile (360px), tablet, desktop
- [ ] PWA install aur offline page
- [ ] `npm run build` aur `npm run test:smoke` pass

---

## 5. Launch se pehle (owner ke kaam: Firebase Console aur doosri services)

Yeh **backend code** nahi, sirf console settings hain. Rules aur functions phir bhi nahi chhede jayenge.

- [ ] GitHub par private repo `naqatar` banana, URL dena (`gh` CLI install nahi hai)
- [ ] Firebase Hosting mein nayi site **`naqatar`** (`qunjee-com` project)
- [ ] Firebase Console → Project settings → nayi **Web app "Naqatar"** register karna, aur us ka config `.env.local` mein
- [ ] Firebase Auth → Authorized domains mein `naqatar.web.app` *(warna Google login nahi chalega)*
- [ ] reCAPTCHA Enterprise key ke allowed domains mein `naqatar.web.app` *(App Check)*
- [ ] App Check mein Naqatar web app register karna (Unenforced hi rahe)
- [ ] **EmailJS:** Naqatar ke liye naye templates (QuFree wale shared hain, unhein edit na karein)
- [ ] Naya **Google Analytics** property (ya analytics ke baghair launch)
- [ ] Privacy policy aur Terms (Naqatar ke naam se)
- [ ] Sentry: naya project/DSN (ya khaali chhorna)

---

## 6. Security (QuFree ke mutabiq, kuch nahi badla)

| # | Cheez | Naqatar mein |
|---|---|---|
| S1 | Asal security `firestore.rules`, `storage.rules`, `database.rules.json` | QuFree wale, `app_OLD` se deploy. Naqatar mein sirf read-only copy |
| S2 | Price aur capacity client par trusted nahi | Rules `get()` se re-derive karte hain. `flagAppointmentPriceMismatch` function chalta rehta hai |
| S3 | Double-booking | `useBooking.js` ki transaction + rules ka capacity check (QuFree ka code, waisa hi) |
| S4 | Business approval aur subscription | Owner khud approve ya extend nahi kar sakta (rules, 17 Nov hardening) |
| S5 | Admin allowlists (`config/*`) | Naqatar mein koi write path nahi. SuperAdmin, CSR aur Ops QuFree par hi rehte hain |
| S6 | App Check | Production mein reCAPTCHA Enterprise (QuFree jaisa). Sirf emulator par skip |
| S7 | Secrets | `.env*` aur service key gitignored. Commit se pehle scan |
| S8 | Testing | Sirf emulator (`demo-naqatar`). Seed `demo-` ke ilawa kisi project par nahi chalta |

---

## 7. Khatray aur unka hal

| Khatra | Asar | Hal |
|---|---|---|
| QuFree mein rules badlein aur Naqatar ki copy purani ho jaye | Medium | `npm run sync:rules` + smoke test. `emulator/README.md` mein snapshot ki tareekh |
| Naqatar par bani booking ki email ya push mein "QuFree" naam aaye | Low | Naye EmailJS templates (P6). Push ke texts functions mein generic hain ("Booking Confirmed ✅") |
| Naqatar par register hone wala clinic QuFree par bhi dikhe | Info | Backend ek hai, yeh by design hai |
| QuFree mein bug fix ho aur Naqatar mein na pahunche | Medium | `useBooking`, `slots.js` aur rules ki tabdeeliyan har maah QuFree ki git log se check karna |
| Hinglish strings seedha code mein | Low | P4 mein dictionary file |
| `vite-plugin-pwa@0.21` aur `vite@7` ka peer conflict | Low | `.npmrc` mein `legacy-peer-deps`. Baad mein plugin 1.x par upgrade |
| `xlsx@0.18.5` ke known vulnerabilities | Low | Agar clinic module mein export zaroori nahi to hata dena (P2) |
| AI-generated logo: Kufic "نقطار" ke huroof aur JPEG quality | Low | Launch se pehle designer se SVG/vector version |

---

## 8. Launch ke baad (v1.1+)

- English toggle (i18n dictionary tayyar hogi)
- Doctor-wise slots (ek clinic, kai doctors)
- Online payment (JazzCash / Easypaisa)
- Reviews aur ratings
- iOS App Store (Capacitor)
- Naqatar ke apne push texts (functions mein `source` ki buniyad par, `app_OLD` ke zariye)
