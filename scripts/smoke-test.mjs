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
  setDoc, updateDoc, getDoc, serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';
import { issueToken, queueRef, tokenRef, mobileLockRef, genTokenId, todayPKT } from '../src/utils/dots.js';
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

// 5. DOTS token queue (CareFirst, max 3 tokens)
const denied = async (label, fn) => {
  try { await fn(); check(label, false, 'was allowed!'); }
  catch (e) { check(label, e.code === 'permission-denied' || e.code === 'duplicate' || e.code === 'full', e.code); }
};
const today = todayPKT();
const cfId = own.id;

await denied('DOTS: guest cannot create a queue', () => setDoc(queueRef(db, cfId, today), {
  date: today, maxTokens: 3, lastToken: 0, nowServing: 0, isOpen: true,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
}));

await signInWithEmailAndPassword(auth, 'carefirst@demo.com', 'demo1234');
try {
  await setDoc(queueRef(db, cfId, today), {
    date: today, maxTokens: 3, lastToken: 0, nowServing: 0, isOpen: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  check('DOTS: owner creates today\'s queue', true);
} catch (e) { check('DOTS: owner creates today\'s queue', false, e.code); }
await denied('DOTS: owner cannot create a queue for tomorrow', () => {
  const tmr = todayPKT(Date.now() + 864e5);
  return setDoc(queueRef(db, cfId, tmr), {
    date: tmr, maxTokens: 3, lastToken: 0, nowServing: 0, isOpen: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
});
await signOut(auth);

let t1;
try {
  t1 = await issueToken(db, cfId, { name: 'Bilal Khan', mobile: '0300-1111111' });
  check('DOTS: guest gets token #1', t1.seq === 1, `#${t1.seq} ${t1.tokenId}`);
} catch (e) { check('DOTS: guest gets token #1', false, e.code); }
await denied('DOTS: same mobile twice is refused', () => issueToken(db, cfId, { name: 'Bilal Again', mobile: '03001111111' }));
await denied('DOTS: raw write reusing a mobile is blocked by rules', () => {
  const b = writeBatch(db);
  b.update(queueRef(db, cfId, today), { lastToken: 2, updatedAt: serverTimestamp() });
  b.set(tokenRef(db, cfId, genTokenId()), { date: today, seq: 2, name: 'Cheat', mobile: '03001111111', status: 'waiting', createdAt: serverTimestamp() });
  b.set(mobileLockRef(db, cfId, today, '03001111111'), { createdAt: serverTimestamp() });
  return b.commit();
});
const t2 = await issueToken(db, cfId, { name: 'Sara Ali', mobile: '+92 300 2222222' });
check('DOTS: next guest gets token #2', t2.seq === 2, `#${t2.seq}`);
const tok = await getDoc(tokenRef(db, cfId, t1.tokenId));
check('DOTS: guest can open own token by link', tok.exists() && tok.data().seq === 1);
await denied('DOTS: guest cannot list tokens', () => getDocs(collection(db, 'businesses', cfId, 'dotsTokens')));
await denied('DOTS: guest cannot skip numbers', () => updateDoc(queueRef(db, cfId, today), { lastToken: increment(2) }));
await denied('DOTS: guest cannot mark served', () => updateDoc(tokenRef(db, cfId, t1.tokenId), { status: 'served' }));
await issueToken(db, cfId, { name: 'Usman', mobile: '03003333333' });
await denied('DOTS: queue full after max tokens', () => issueToken(db, cfId, { name: 'Late Comer', mobile: '03004444444' }));

await signInWithEmailAndPassword(auth, 'carefirst@demo.com', 'demo1234');
const listed = await getDocs(query(collection(db, 'businesses', cfId, 'dotsTokens'), where('date', '==', today)));
check('DOTS: owner lists today\'s tokens', listed.size === 3, `${listed.size}`);
try {
  await updateDoc(tokenRef(db, cfId, t1.tokenId), { status: 'served', updatedAt: serverTimestamp() });
  await updateDoc(queueRef(db, cfId, today), { nowServing: 2, updatedAt: serverTimestamp() });
  check('DOTS: owner marks served + moves nowServing', true);
} catch (e) { check('DOTS: owner marks served + moves nowServing', false, e.code); }
await signOut(auth);

console.log(failed ? `\n❌ ${failed} check(s) failed` : '\n✅ All smoke checks passed');
process.exit(failed ? 1 : 0);
