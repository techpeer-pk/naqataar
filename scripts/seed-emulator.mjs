/**
 * Naqatar — clinic-only seed for the LOCAL Firebase Emulator.
 *
 *   Terminal 1:  npm run emulator
 *   Terminal 2:  npm run seed
 *
 * Uses the Admin SDK pointed at the emulator, which bypasses security rules.
 * That is deliberate and safe here: since the 2026-11-17 rules hardening an
 * owner can't create an already-approved business (isActive: true) — only a
 * SuperAdmin can approve one. The seed plays that SuperAdmin role. The app
 * itself still runs fully under emulator/firestore.rules.
 *
 * Field shapes mirror what the real flows write:
 *   businesses   → AdminRegister.jsx + useBusinesses.create
 *   users        → AuthContext.createUserProfile
 *   appointments → useBooking.bookAppointment (+ matching slot docs)
 *   visitMode    → /admin/profile "Patient options" (CareFirst both, Smile Dental booking, Little Stars token; others unset = both)
 *
 * Safety: refuses to run unless it is talking to the emulator with a
 * `demo-` project id, so it can never write to production.
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-naqatar';
process.env.FIRESTORE_EMULATOR_HOST     ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

if (!PROJECT_ID.startsWith('demo-')) {
  console.error('❌ Seed sirf demo- project par chal sakta hai.');
  process.exit(1);
}

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db   = getFirestore();

// ── Helpers ──────────────────────────────────────────────────────────────
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const PASSWORD = 'demo1234';
const TRIAL_DAYS = 30;

const hours = (weekday, sat = weekday, sun = null) => ({
  mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday, sat, sun,
});

const pad = n => String(n).padStart(2, '0');
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slotId  = (date, time) => `${date}_${time.replace(':', '-')}`;

/** Next day (offset >= 1, or negative for past) on which the clinic is open. */
function openDay(workingHours, offset) {
  const step = offset >= 0 ? 1 : -1;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  while (!workingHours[DAY_KEYS[d.getDay()]]) d.setDate(d.getDate() + step);
  return d;
}

/** Same scheme as bookingRef() in src/utils/format.js */
const bookingRef = id => `QF-${String(id).slice(-6).toUpperCase()}`;

async function upsertUser({ email, name, role, phone = '' }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password: PASSWORD, displayName: name, emailVerified: true });
  }
  await db.doc(`users/${user.uid}`).set({
    uid: user.uid, email, displayName: name, photoURL: '',
    role, businessId: null, phone, createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return user.uid;
}

// ── Clinics ──────────────────────────────────────────────────────────────
const clinics = [
  // ---- Medical ----
  {
    name: 'CareFirst Clinic', clinicType: 'medical', slotDuration: 20, slotCapacity: 1, visitMode: 'both',
    description: 'General medicine, specialist consultation aur basic lab tests — sab ek jagah.',
    address: 'Block G, Johar Town, Lahore', phone: '924235550101',
    workingHours: hours({ open: '09:00', close: '18:00' }, { open: '10:00', close: '14:00' }),
    admin: { email: 'carefirst@demo.com', name: 'Dr. Farrukh Aslam' },
    services: [
      { name: 'General Consultation', duration: 20, price: 1500, description: 'Doctor se mulaqat aur checkup' },
      { name: 'Specialist Consultation', duration: 40, price: 3000 },
      { name: 'Blood Test (CBC)', duration: 20, price: 900 },
      { name: 'ECG', duration: 20, price: 1200 },
    ],
  },
  {
    name: 'Smile Dental Care', clinicType: 'medical', slotDuration: 30, slotCapacity: 2, visitMode: 'booking',
    description: 'Dant ka checkup, scaling, filling aur root canal. 2 dental chairs.',
    address: 'Main Boulevard, DHA Phase 6, Lahore', phone: '924235550202',
    workingHours: hours({ open: '11:00', close: '20:00' }, { open: '11:00', close: '20:00' }),
    admin: { email: 'smiledental@demo.com', name: 'Dr. Sana Malik' },
    services: [
      { name: 'Dental Checkup', duration: 30, price: 2000 },
      { name: 'Scaling & Polishing', duration: 60, price: 5000 },
      { name: 'Tooth Filling', duration: 60, price: 6000 },
      { name: 'Root Canal (per sitting)', duration: 90, price: 15000 },
    ],
  },
  {
    name: 'Little Stars Child Clinic', clinicType: 'medical', slotDuration: 15, slotCapacity: 1, visitMode: 'token',
    description: 'Bachon ke doctor — vaccination, growth checkup aur bukhar/khansi ka ilaj.',
    address: 'F-8 Markaz, Islamabad', phone: '925155550303',
    workingHours: hours({ open: '17:00', close: '22:00' }, { open: '10:00', close: '14:00' }),
    admin: { email: 'littlestars@demo.com', name: 'Dr. Imran Qureshi' },
    services: [
      { name: 'Child Consultation', duration: 15, price: 2000 },
      { name: 'Vaccination', duration: 15, price: 1000, description: 'Vaccine ki qeemat alag' },
      { name: 'Growth & Nutrition Checkup', duration: 30, price: 2500 },
    ],
  },
  // ---- Aesthetic ----
  {
    name: 'Glow Skin & Laser Clinic', clinicType: 'aesthetic', slotDuration: 30, slotCapacity: 1,
    description: 'HydraFacial, laser hair removal aur acne treatment — certified dermatologist.',
    address: 'MM Alam Road, Gulberg III, Lahore', phone: '924235550404',
    workingHours: hours({ open: '12:00', close: '21:00' }, { open: '12:00', close: '21:00' }),
    admin: { email: 'glowskin@demo.com', name: 'Dr. Ayesha Raza' },
    services: [
      { name: 'Skin Consultation', duration: 30, price: 3000 },
      { name: 'HydraFacial', duration: 60, price: 12000 },
      { name: 'Laser Hair Removal (Face)', duration: 30, price: 8000 },
      { name: 'Acne Treatment Session', duration: 45, price: 7000 },
    ],
  },
  {
    name: 'HairRestore Clinic', clinicType: 'aesthetic', slotDuration: 60, slotCapacity: 1,
    description: 'Hair loss ka ilaj — PRP, mesotherapy aur hair transplant consultation.',
    address: 'Shahrah-e-Faisal, Karachi', phone: '922135550505',
    workingHours: hours({ open: '10:00', close: '19:00' }),
    admin: { email: 'hairrestore@demo.com', name: 'Dr. Kamran Sheikh' },
    services: [
      { name: 'Hair Loss Consultation', duration: 30, price: 2500 },
      { name: 'PRP Therapy', duration: 60, price: 15000 },
      { name: 'Mesotherapy', duration: 60, price: 10000 },
    ],
  },
  {
    name: 'Radiance Aesthetics', clinicType: 'aesthetic', slotDuration: 30, slotCapacity: 2,
    description: 'Botox, fillers aur chemical peel — 2 treatment rooms.',
    address: 'Clifton Block 5, Karachi', phone: '922135550606',
    workingHours: hours({ open: '11:00', close: '20:00' }, { open: '11:00', close: '17:00' }),
    admin: { email: 'radiance@demo.com', name: 'Dr. Hina Zaidi' },
    services: [
      { name: 'Aesthetic Consultation', duration: 30, price: 3500 },
      { name: 'Chemical Peel', duration: 45, price: 9000 },
      { name: 'Botox (per area)', duration: 30, price: 25000 },
    ],
  },
  // ---- Pending approval (isActive: false) — tests the "waiting for approval" dashboard ----
  {
    name: 'New Life Physio Clinic', clinicType: 'medical', slotDuration: 45, slotCapacity: 1,
    description: 'Physiotherapy aur back pain treatment. (Approval pending — public list mein nahi aayega)',
    address: 'Saddar, Rawalpindi', phone: '925155550707',
    workingHours: hours({ open: '09:00', close: '17:00' }),
    admin: { email: 'newlife@demo.com', name: 'Dr. Usman Tariq' },
    pending: true,
    services: [
      { name: 'Physio Session', duration: 45, price: 3000 },
    ],
  },
];

// ── Run ──────────────────────────────────────────────────────────────────
console.log(`🌱 Naqatar seed → emulator (${PROJECT_ID})\n`);

const existing = await db.collection('businesses').where('type', '==', 'clinic').limit(1).get();
if (!existing.empty) {
  console.log('⚠️  Clinics pehle se majood hain. Dobara seed ke liye emulator restart karein (data reset ho jata hai).');
  process.exit(0);
}

const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + TRIAL_DAYS * 864e5));
const created = [];

for (const c of clinics) {
  const { admin, services, pending, ...biz } = c;
  const adminUid = await upsertUser({ email: admin.email, name: admin.name, role: 'businessAdmin', phone: biz.phone });

  const ref = db.collection('businesses').doc();
  await ref.set({
    ...biz,
    type: 'clinic',
    email: admin.email,
    adminUid,
    isActive: !pending,
    trialEndsAt,
    category: null, salonGender: null, categories: null,
    offersOrdering: false, offersBooking: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`users/${adminUid}`).set({ businessId: ref.id }, { merge: true });

  const svcRefs = [];
  for (const s of services) {
    const sRef = ref.collection('services').doc();
    await sRef.set({ ...s, createdAt: FieldValue.serverTimestamp() });
    svcRefs.push({ id: sRef.id, ...s });
  }
  created.push({ id: ref.id, ...c, services: svcRefs });
  console.log(`✅ ${pending ? '⏳' : '  '} ${c.name} (${c.clinicType})`);
}

// ── Customer + sample appointments ──────────────────────────────────────
const customer = { email: 'customer@demo.com', name: 'Ali Ahmed', phone: '923001234567' };
const customerUid = await upsertUser({ ...customer, role: 'customer' });

/**
 * Writes an appointment + its slot claims exactly like useBooking does.
 * Services used here all fit in one slot, so each claims one slot doc.
 */
async function addAppointment(clinic, svc, day, time, status) {
  const date = dateStr(day);
  const [h, m] = time.split(':').map(Number);
  const when = new Date(day); when.setHours(h, m, 0, 0);
  const apptRef = db.collection('appointments').doc();
  const sid = slotId(date, time);
  const holdsSlot = status === 'pending' || status === 'confirmed';

  await apptRef.set({
    bookingRef: bookingRef(apptRef.id),
    businessId: clinic.id, businessType: 'clinic',
    businessName: clinic.name, businessAddress: clinic.address,
    serviceId: svc.id, serviceName: svc.name, servicePrice: svc.price, serviceDuration: svc.duration,
    services: [{ id: svc.id, name: svc.name, duration: svc.duration, price: svc.price }],
    date, time, appointmentDatetime: Timestamp.fromDate(when),
    customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email,
    customerId: customerUid, notes: '', paymentProofUrl: null, isOnline: null,
    status,
    bookedSlotIds: holdsSlot ? [sid] : [],
    reminders: { r24: false, r1hr: false, r15min: false },
    fcmToken: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (holdsSlot) {
    await db.doc(`businesses/${clinic.id}/slots/${sid}`).set({
      date, time, capacity: clinic.slotCapacity, booked: 1,
      apptIds: [apptRef.id], updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

const [carefirst, dental, , glow] = created;
await addAppointment(carefirst, carefirst.services[0], openDay(carefirst.workingHours, 1),  '10:00', 'pending');
await addAppointment(glow,      glow.services[1],      openDay(glow.workingHours, 2),      '13:00', 'confirmed');
await addAppointment(dental,    dental.services[0],    openDay(dental.workingHours, -3),   '12:00', 'completed');
await addAppointment(carefirst, carefirst.services[3], openDay(carefirst.workingHours, -5), '11:00', 'cancelled');
console.log('\n✅ Customer + 4 sample appointments (pending, confirmed, completed, cancelled)');

// ── Summary ──────────────────────────────────────────────────────────────
console.log('\n✅ Seed mukammal!\n');
console.log(`🔑 Sab accounts ka password: ${PASSWORD}`);
console.log(`👤 Customer:  ${customer.email}`);
console.log('🏥 Clinic owners:');
clinics.forEach(c => console.log(`   ${c.admin.email.padEnd(24)} ${c.name}${c.pending ? '  (approval pending)' : ''}`));
console.log('\n🌐 App:          http://localhost:5173');
console.log('🔧 Emulator UI:  http://localhost:4000');
process.exit(0);
