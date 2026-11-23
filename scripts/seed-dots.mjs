/**
 * DOTS demo data — today's token queue for CareFirst Clinic with N waiting
 * tokens (default 25). Run AFTER `npm run seed`, against the emulator only.
 *
 *   npm run seed:dots            (25 tokens)
 *   npm run seed:dots -- 40      (40 tokens)
 *
 * Admin SDK = bypasses rules (the seed plays the role of many customers).
 * Same doc shapes as src/utils/dots.js issueToken().
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { genTokenId, todayPKT } from '../src/utils/dots.js';

const PROJECT_ID = 'demo-naqatar';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
if (!PROJECT_ID.startsWith('demo-')) { console.error('❌ Sirf demo- project.'); process.exit(1); }

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const COUNT = Math.max(1, Math.min(1000, Number(process.argv[2]) || 25));
const MAX = Math.max(100, COUNT);
const CLINIC = 'CareFirst Clinic';

const FIRST = ['Ali', 'Ahmed', 'Bilal', 'Usman', 'Hamza', 'Zain', 'Fahad', 'Imran', 'Kashif', 'Naveed',
  'Ayesha', 'Fatima', 'Sana', 'Hina', 'Maryam', 'Zainab', 'Amna', 'Rabia', 'Saima', 'Nadia'];
const LAST = ['Khan', 'Ahmed', 'Malik', 'Qureshi', 'Sheikh', 'Raza', 'Butt', 'Chaudhry', 'Hussain', 'Iqbal'];

const snap = await db.collection('businesses').where('name', '==', CLINIC).limit(1).get();
if (snap.empty) { console.error(`❌ ${CLINIC} nahi mila. Pehle npm run seed chalayein.`); process.exit(1); }
const biz = snap.docs[0].ref;

const date = todayPKT();
const qRef = biz.collection('dotsQueues').doc(date);
if ((await qRef.get()).exists) {
  console.log(`⚠️  ${CLINIC} ki aaj (${date}) ki queue pehle se hai. Reset ke liye emulator restart + npm run seed.`);
  process.exit(0);
}

const expireAt = Timestamp.fromMillis(Date.now() + 90 * 864e5); // same as expireAt() in src/utils/dots.js
const batch = db.batch();
batch.set(qRef, {
  date, maxTokens: MAX, lastToken: COUNT, nowServing: 1, isOpen: true,
  createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), expireAt,
});
for (let i = 1; i <= COUNT; i++) {
  const name = `${FIRST[(i - 1) % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
  const mobile = `0300${String(1000000 + i).padStart(7, '0')}`;
  batch.set(biz.collection('dotsTokens').doc(genTokenId()), {
    date, seq: i, name, mobile, status: 'waiting', createdAt: FieldValue.serverTimestamp(), expireAt,
  });
  batch.set(qRef.collection('mobiles').doc(mobile), { createdAt: FieldValue.serverTimestamp(), expireAt });
}
await batch.commit();

console.log(`✅ ${CLINIC}: aaj (${date}) ki queue — ${COUNT} waiting tokens, max ${MAX}`);
console.log(`   Seed mobiles: 03001000001 … 0300${String(1000000 + COUNT).padStart(7, '0')} (yeh numbers dobara token nahi le sakte jab tak waiting hain)`);
console.log(`🎫 Customer: http://localhost:5173/index/businessDOTS/${biz.id}`);
console.log('🔧 Admin:    http://localhost:5173/admin/tokens  (carefirst@demo.com / demo1234)');
process.exit(0);
