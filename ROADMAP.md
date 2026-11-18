# Naqatar: Roadmap aur Development Timeline

> **⚠️ 18 Nov 2026 se purana: approach badal gayi hai.** Yeh document React Native (Expo) wale
> plan ke liye tha. Faisla ab yeh hai: **QuFree (React 18 + Vite PWA) ka sirf clinic module**,
> Naqatar branding + Hinglish UI ke saath, `naqatar.web.app` par. Backend ko haath nahi lagana,
> development emulator + seed par, aur code GitHub par. Neeche ke Security (Sec. 5) aur
> Khatray (Sec. 9) ab bhi kaam ke hain; timeline (Sec. 8) ab lagu nahi. Naya plan jald.

**Project:** Naqatar, Clinic Appointment App (Aesthetic + Medical)
**Platforms:** Android, iOS, Web (browser), ek hi codebase (React Native + Expo)
**Backend (BaaS):** Wahi Firebase project jo QuFree use karta hai (`qunjee-com`)
**Reference project:** `K:\QuFree\app_OLD` (branch `feat/appobook`)
**App language:** Hinglish (Roman Urdu/Hindi + English), i18n ke saath taa ke baad mein English/Urdu add ho sake
**Tayyar kiya:** 18 Nov 2026

---

## 1. Goal

QuFree ka clinic module ek **alag, native app** ki shakal mein:

- **Customer:** clinic dhoondhna, booking karna, apni appointments dekhna aur cancel karna, push aur email notifications.
- **Clinic owner (admin):** appointments confirm, cancel, no-show aur complete karna; services, timings aur profile manage karna.
- Data aur security wahi rahegi jo QuFree mein hai. Ek clinic ki booking chahe web (`qufree.web.app`) se aaye ya Naqatar se, dono jagah nazar aayegi.

**Scope se bahar** (QuFree web panels par hi rahenge): SuperAdmin, CSR, Ops console, billing approval, push campaigns, QunjeeEats, hotel aur baqi verticals.

---

## 2. Bunyadi faislay

| # | Faisla | Wajah |
|---|---|---|
| D1 | **Expo** (latest SDK) + **Expo Router** + **TypeScript** | Ek code se Android, iOS aur Web; file-based routing; EAS build/submit |
| D2 | Firestore, Auth aur Storage ke liye **Firebase JS SDK** | Web aur native dono par chalta hai. Reference ka `runTransaction` booking logic waisa hi port ho jayega |
| D3 | **`@react-native-firebase/app-check` + `messaging`** sirf native par | App Check (Play Integrity / App Attest) aur asli FCM token. JS SDK ko App Check token `CustomProvider` ke zariye diya jayega |
| D4 | **Development build** use hogi, Expo Go nahi | RNFirebase native modules Expo Go mein nahi chalte |
| D5 | Backend ka **owner `K:\QuFree\app_OLD` hi rahega** | Rules aur Cloud Functions sirf wahin se deploy hon. Naqatar repo mein koi rules, functions ya `firebase deploy` nahi hoga (sirf web hosting, apni site par) |
| D6 | Appointment ka **data shape bilkul reference jaisa** | `firestore.rules` fields ko allowlist karte hain. Naya field chahiye ho to pehle rules mein add karke `app_OLD` se deploy karna hoga |
| D7 | Business types: `type == 'clinic'`, aur `clinicType` ki value `'aesthetic'` ya `'medical'` | Reference mein yahi model hai (`AdminRegister.jsx`) |
| D8 | Web build ek **alag Hosting site** par (tajweez: `naqatar`) | `qufree` site ko nahi chhedna. `deploy-guard.mjs` mein site ki ijazat deni hogi |
| D9 | UI strings **i18n file** mein (`hi-Latn` / Hinglish default) | Hard-coded text nahi hoga |

---

## 3. Reference se kya reuse hoga

| Reference file | Naqatar mein | Kaam |
|---|---|---|
| `src/utils/slots.js` | `src/core/slots.ts` | Waisa hi copy, TS types + unit tests |
| `src/hooks/useBooking.js` | `src/hooks/useBooking.ts` | Logic same, sirf imports badlenge |
| `useSlots`, `useServices`, `useAppointments`, `useAdminSlots`, `useBusinesses`, `useOwnBusiness` | `src/hooks/` | Port, sirf clinic queries |
| `utils/format.js`, `validation.js`, `cancelReasons.js`, `subscription.js` | `src/core/` | Copy |
| `useEmailNotifications.js` | `src/services/email.ts` | `@emailjs/browser` (web) aur `@emailjs/react-native` (native) |
| `useReminders.js`, `useNotifications.js` | `src/hooks/` | Port |
| `context/AuthContext.jsx` | `src/context/AuthContext.tsx` | Sirf customer + businessAdmin roles |
| Pages + CSS | ❌ | Dobara banenge (`View`/`Text` + StyleSheet) |

> **Rule (reference jaisa):** koi screen Firestore ko seedha call nahi karegi. Har read aur write `src/hooks/` ke zariye hoga.

---

## 4. Features ki list

### Customer
- Onboarding + login (Email/Password, Google). Guest booking agar rules ijazat dein (reference mein guest create allowed hai)
- Home: **Aesthetic** | **Medical** tabs, search, area/city filter
- Clinic detail: logo, services (price/duration), timings, address, map link, call/WhatsApp
- Booking: multi-service select → date → available slots (`computeAvailable`) → details (phone validation) → payment proof upload (bank details card) → confirm
- Confirmation screen (bookingRef) + **EmailJS** "booking received" email
- My Appointments: upcoming/past, status, cancel with reason (`cancelAppointment`)
- Reminders (24h / 1h / 15m) + **Push notifications** (confirmed / cancelled / completed)
- Notifications inbox (`users/{uid}/notifications`)
- Profile: naam, phone, notification settings, logout, **account delete request** (store policy ki zaroorat)

### Clinic owner (admin)
- Register clinic (`type: 'clinic'`, `clinicType` select), free trial (reference ka `trialEndsAt` logic)
- Dashboard: aaj ki appointments, pending count, subscription banner (trial/expired)
- Appointments: confirm / cancel / no-show / complete, filter, payment proof dekhna
- Services CRUD (naam, price, duration)
- Profile + working hours + slot duration/capacity + logo upload
- Naye booking par push (admin ko) aur EmailJS confirmation/cancellation

### Shared / Platform
- Sentry error tracking
- Idle logout (admin ke liye, reference ka `useIdleLogout`)
- Offline/no-internet state, loading skeletons
- Deep links (`naqatar://` + web URLs)
- Dark mode

---

## 5. Security (reference ke mutabiq)

| # | Cheez | Naqatar mein |
|---|---|---|
| S1 | **Asal security `firestore.rules`, `storage.rules`, `database.rules.json` hain** | Inhi par bharosa. App mein buttons chhupana sirf UX hai |
| S2 | Price aur capacity client par trusted nahi | Rules `get()` se re-derive karte hain. `flagAppointmentPriceMismatch` function bhi chalta rahega |
| S3 | **App Check** | Pehle din se: Android par Play Integrity, iOS par App Attest, web par reCAPTCHA Enterprise. Enforce karne se pehle teeno apps ka traffic "verified" hona chahiye |
| S4 | Allowlists (`config/superAdmins` waghera) | App mein inka koi write path nahi hoga |
| S5 | Secrets | `.env` gitignored. `EXPO_PUBLIC_*` values **public** hoti hain (Firebase config, EmailJS public key theek hain). **Service account key kabhi is repo mein nahi** |
| S6 | Session storage | Auth persistence AsyncStorage mein; koi bhi sensitive cheez `expo-secure-store` mein |
| S7 | Subscription gate | `subscription.ts` client par, `isSubscriptionActive()` rules mein (reference jaisa) |
| S8 | Data-shape lock | Appointment fields reference jaise. Tabdeeli sirf rules update ke baad |
| S9 | Emulator-first testing | `demo-` project + Firebase emulators. Production data par test booking nahi |
| S10 | Store compliance | Privacy policy, Play "Health apps" declaration, Data Safety form, Apple privacy labels, in-app account deletion |

---

## 6. Backend mein zaroori tabdeeliyan (`app_OLD` mein)

Yeh kaam reference repo mein honge aur wahin se deploy honge. Web app ko kuch nahi hona chahiye (backward compatible):

1. **Push functions native ke liye:** abhi saare pushes **data-only** hain (web service worker ke liye). Native par data-only message app band hone par khud nazar nahi aata, aur iOS par aksar deliver hi nahi hota.
   - Hal: token ke saath `platform` save karein (`web` / `android` / `ios`). Native tokens ke liye `notification` + `apns` block bhejein. Web ke liye data-only hi rakhein.
   - `url` field web path hai (`/index/my-appointments`). App mein isay screen route par map karna hoga.
2. **Admin ko naye booking ka push** (agar reference mein nahi hai to naya function).
3. **Rules review:** agar Naqatar koi naya field bheje (maslan `source: 'naqatar'`), to use rules ki allowlist mein add karna.
4. **Firestore composite index:** `type + clinicType (+ city)` wali query ke liye.
5. **Firebase Console:** Android app (`com.naqatar.app`), iOS app aur web app register karna. App Check providers, Google Sign-In ke SHA-1/SHA-256, authorized domains.
6. **`deploy-guard.mjs`:** `naqatar` hosting site ki ijazat.

---

## 7. Folder structure (tajweez)

```
naqatur/
  app/                    Expo Router screens
    (auth)/               login, register
    (customer)/           home, clinic/[id], book/[id], appointments, notifications, profile
    (admin)/              dashboard, appointments, services, profile, register
  src/
    core/                 slots.ts, format.ts, validation.ts, subscription.ts  (pure, tested)
    hooks/                saare Firestore reads/writes
    services/             firebase.ts, appCheck.ts, push.ts, email.ts, sentry.ts
    context/              AuthContext
    components/           UI pieces
    i18n/                 hinglish.json, en.json
    theme/                colors, spacing, typography
  __tests__/
  app.config.ts  eas.json  .env.example  ROADMAP.md
```

---

## 8. Development timeline

**Farz kiya gaya hai:** 1 full-time developer (AI assistance ke saath), shuru **Mon 23 Nov 2026**. Har phase ke aakhir mein demo hoga. Dec ke aakhir ki chhuttiyon ke liye buffer rakha gaya hai.

| Phase | Hafta | Dates | Kaam | Deliverable / "Done" ka matlab |
|---|---|---|---|---|
| **0. Setup** | W1 | 23 – 29 Nov | Expo + TS + Expo Router, ESLint/Prettier, i18n, theme, Firebase apps register, emulator wiring, dev build (Android), Sentry | App Android emulator aur web par chalti hai, Firestore emulator se connected |
| **1. Core port** | W2 | 30 Nov – 6 Dec | `slots`, `format`, `validation`, `subscription` port + **unit tests**; `useBooking` port | Tests pass; emulator par transaction se booking ban jati hai |
| **2. Auth** | W3 | 7 – 13 Dec | Email + Google (native + web), AuthContext, role detection (customer / businessAdmin), persistence | Teeno platforms par login aur logout |
| **3. Discovery** | W4 | 14 – 20 Dec | Home (Aesthetic/Medical tabs), search, clinic list, clinic detail, skeletons | Seed data se clinics nazar aate hain |
| **4. Booking flow** | W5 – W6 | 21 Dec – 3 Jan | Service select, date, slots, details, payment proof upload, confirm, confirmation screen, EmailJS | Emulator par end-to-end booking + email. *(Chhuttiyon ka buffer isi mein)* |
| **5. Customer post-booking** | W7 | 4 – 10 Jan | My Appointments, cancel with reason, reminders, notifications inbox, profile, account delete request | Customer ka poora flow mukammal |
| **6. Push** | W8 | 11 – 17 Jan | RNFirebase messaging, permission flow, token save, foreground/background display, deep links; **backend function update (Sec. 6.1)** | Status badalne par Android, iOS aur web teeno par push aata hai |
| **7. Clinic admin** | W9 – W10 | 18 – 31 Jan | Register (clinicType), dashboard, appointments actions, services CRUD, hours/profile/logo, subscription banner, idle logout, admin push | Clinic owner app se poora din chala sakta hai |
| **8. Security hardening** | W11 | 1 – 7 Feb | App Check (teeno platforms), rules review + emulator rules tests, secrets audit, Sentry alerts | App Check metrics par Naqatar ka traffic "verified" |
| **9. QA + Beta** | W12 | 8 – 14 Feb | Asli devices (low-end Android, iPhone) par testing, bug fixing, performance; EAS build → Play Internal Testing + TestFlight; web deploy (`naqatar` site) | Beta testers ke paas app |
| **10. Store release** | W13 – W14 | 15 – 28 Feb | Store listing (Hinglish + English), screenshots, privacy policy, Health declaration, submit, review ke fixes | **Target launch: ~1 Mar 2027** |

**Milestones**
- **M1 (13 Dec):** Login + core booking logic tested
- **M2 (10 Jan):** Customer app feature-complete (emulator par)
- **M3 (31 Jan):** Admin app feature-complete
- **M4 (14 Feb):** Beta (Play Internal + TestFlight + web)
- **M5 (~1 Mar 2027):** Public launch

---

## 9. Khatray aur unka hal

| Khatra | Asar | Hal |
|---|---|---|
| Rules mein tabdeeli QuFree web ya TWA ko tod de | High | Har rules change emulator tests ke baad, pehle `backups/` mein copy, phir sirf `app_OLD` se deploy |
| Data-only push native par na dikhe | High | Sec. 6.1 wala function update, Phase 6 mein |
| App Check enforce hone par app block ho jaye | High | Phase 8 se pehle enforce nahi karna; metrics dekh kar |
| Time zone: device clock se slot ka waqt ghalat | Medium | Slot ka waqt `Asia/Karachi` mein calculate karna (reference mein bhi yahi behtari ki zaroorat hai) |
| Apple review (medical app) mein rejection | Medium | Clear privacy policy, account deletion, koi medical claim nahi, sirf booking |
| EmailJS client se chalta hai (key public) | Low/Med | Reference jaisa rakhenge; baad mein Cloud Function par shift (Phase 2 ke baad) |
| Google Sign-In native setup (SHA keys, iOS URL scheme) | Medium | Phase 2 mein pehle hi poora karna |

---

## 10. Launch ke baad (v1.1+)

- English/Urdu language toggle
- Doctor-wise slots (ek clinic, kai doctors)
- In-app payment (JazzCash / Easypaisa / card)
- Reviews aur ratings
- EmailJS ki jagah server-side email (Cloud Function)
- Video consultation (medical)

---

## 11. Shuru karne se pehle chahiye

- [ ] Firebase Console access (`qunjee-com`): Android, iOS aur Web apps register karna
- [ ] Apple Developer account ($99/saal) + Google Play Console
- [ ] Package / Bundle ID final: `com.naqatar.app`?
- [ ] Logo, brand colors, app icon
- [ ] EmailJS templates (reference wale reuse ya naye "Naqatar" branding ke saath)
- [ ] Privacy policy aur terms ka URL
