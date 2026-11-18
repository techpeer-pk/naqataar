/**
 * Smoke test — reads the seeded data the way the APP does (client SDK, under
 * emulator/firestore.rules), not with admin rights. Run against a seeded
 * emulator:
 *
 *   npm run test:smoke        (starts emulator, seeds, runs this, stops)
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, collection, query, where, getDocs,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const app  = initializeApp({ apiKey: 'demo-key', projectId: 'demo-naqatar' });
const db   = getFirestore(app);
const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

let failed = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failed++;
};

// 1. Signed-out visitor: same query as useBusinesses.fetchAll('clinic')
const clinics = (await getDocs(query(collection(db, 'businesses'),
  where('type', '==', 'clinic'), where('isActive', '==', true)))).docs.map(d => d.data());
const medical   = clinics.filter(c => c.clinicType === 'medical').length;
const aesthetic = clinics.filter(c => c.clinicType === 'aesthetic').length;
check('Public: active clinics visible', clinics.length === 6, `${clinics.length} (medical ${medical}, aesthetic ${aesthetic})`);
check('Public: pending clinic hidden', !clinics.some(c => c.name === 'New Life Physio Clinic'));

// 2. Signed-out visitor must NOT be able to list appointments
try {
  await getDocs(collection(db, 'appointments'));
  check('Public: appointments blocked by rules', false, 'read was allowed!');
} catch (e) {
  check('Public: appointments blocked by rules', e.code === 'permission-denied', e.code);
}

// 3. Customer: own appointments (same query shape as useAppointments)
await signInWithEmailAndPassword(auth, 'customer@demo.com', 'demo1234');
const mine = await getDocs(query(collection(db, 'appointments'),
  where('customerEmail', '==', 'customer@demo.com')));
check('Customer: sees own appointments', mine.size === 4, `${mine.size}`);
await signOut(auth);

// 4. Clinic owner: own business's appointments only
await signInWithEmailAndPassword(auth, 'carefirst@demo.com', 'demo1234');
const own = (await getDocs(query(collection(db, 'businesses'), where('isActive', '==', true), where('type', '==', 'clinic'))))
  .docs.find(d => d.data().name === 'CareFirst Clinic');
const ownAppts = await getDocs(query(collection(db, 'appointments'), where('businessId', '==', own.id)));
check('Owner: sees own clinic appointments', ownAppts.size === 2, `${ownAppts.size}`);
const glow = clinics.find(c => c.name === 'Glow Skin & Laser Clinic');
try {
  const other = (await getDocs(query(collection(db, 'businesses'), where('isActive', '==', true), where('type', '==', 'clinic'))))
    .docs.find(d => d.data().name === glow.name);
  await getDocs(query(collection(db, 'appointments'), where('businessId', '==', other.id)));
  check('Owner: other clinic appointments blocked', false, 'read was allowed!');
} catch (e) {
  check('Owner: other clinic appointments blocked', e.code === 'permission-denied', e.code);
}
await signOut(auth);

console.log(failed ? `\n❌ ${failed} check(s) failed` : '\n✅ All smoke checks passed');
process.exit(failed ? 1 : 0);
