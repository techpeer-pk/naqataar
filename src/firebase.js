import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Opt-in only — set VITE_USE_FIREBASE_EMULATOR=true in .env.local to point
// this app at the local Firebase Local Emulator Suite (run separately via
// `npm run emulator`) instead of real prod Firebase. Default is unset/false,
// so `npm run dev` behaves exactly as before: real prod project, real data.
export const useFirebaseEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

// Same fake project used by scripts/seed-emulator.mjs and .firebaserc — a
// `demo-` prefixed Firebase project id needs no real credentials and the
// emulators accept it without ever touching prod, even by mistake.
const demoConfig = {
  apiKey:        'demo-key',
  authDomain:    'demo-naqatar.firebaseapp.com',
  projectId:     'demo-naqatar',
  storageBucket: 'demo-naqatar.appspot.com',
  databaseURL:   'https://demo-naqatar-default-rtdb.firebaseio.com',
};

const firebaseConfig = useFirebaseEmulator ? demoConfig : {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  // Realtime Database — separate from Firestore, used only for the live
  // support chat (see docs/CRM-Support.md). databaseURL lives here so
  // initializeApp() knows about it, but getDatabase() itself is called from
  // src/rtdb.js, not here — this file is imported by nearly every module in
  // the app (including the main, non-lazy bundle), so eagerly calling
  // getDatabase() here would pull the RTDB SDK into every page load even for
  // visitors who never touch chat/presence/notifications. Keeping the actual
  // `firebase/database` import confined to src/rtdb.js (only ever reached
  // via its lazy-loaded consumers) lets Rollup code-split it into its own
  // chunk.
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

// App Check — proves writes come from the real app, not a script hitting
// Firestore directly (this is what closes the ethical-hack DoS/burst-create
// gap: no rate-limiting exists in firestore.rules, so an unverified script
// can currently flood slot/roomNight/appointment writes unthrottled).
// Starts in Console "Unenforced" mode — nothing is blocked yet, this only
// starts attaching tokens so we can verify real traffic before switching
// enforcement on.
// RE-ENABLED 2026-09-25 — resuming after the 2026-09-11 rollback. Testing the
// "Google Sign-In popup went blank" issue locally FIRST; App Check stays
// "Unenforced" in Console throughout, so nothing can block real prod users
// while we verify. (Prod metrics currently show <1% verified / 100% outdated
// precisely because this was off — the client wasn't attaching any tokens.)
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN) {
  // npm run dev hits real Firebase (no emulator) — the debug token bypasses
  // the reCAPTCHA domain check for localhost. Registered in Console under
  // App Check > Apps > qunjeebook > Manage debug tokens.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
}
// Naqatar: skipped against the emulator only — the demo project has no
// reCAPTCHA key and the emulators don't verify App Check tokens. The prod
// path below is unchanged from QuFree.
if (!useFirebaseEmulator) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

if (useFirebaseEmulator) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  // Superseded 2026-09-24 — payment-proof uploads (checkout/booking) hung
  // forever against the non-existent demo bucket, so Storage is now wired too:
  // // Storage emulator isn't wired here — not part of this phase's scope
  // // (Firestore/Auth/Functions/RTDB only), and firebase.json's emulators
  // // block has no storage port configured. `storage` above still points at
  // // the demo project's (non-existent) bucket when the flag is on; fine as
  // // long as no upload/download runs while testing against the emulator.
  connectStorageEmulator(storage, 'localhost', 9199);
}

export const getMessagingInstance = async () => {
  // FCM needs a real Google Cloud project — there's no Messaging emulator in
  // the Firebase Local Emulator Suite, so this would throw on the demo
  // project's fake config (missing appId) regardless of what's filled in.
  // Fail quietly instead of an uncaught promise rejection on every page.
  if (useFirebaseEmulator) return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
