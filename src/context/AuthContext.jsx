import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  fetchSignInMethodsForEmail,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, googleProvider } from '../firebase';
import { useIdleLogout } from '../hooks/useIdleLogout';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEatsAdmin, setIsEatsAdmin]   = useState(false);
  const [isCsr, setIsCsr]               = useState(false);
  const [opsRole, setOpsRole]           = useState(null);

  // Membership lives in a Firestore allowlist doc that only a listed uid may
  // read (self-check rule) and NO client can ever write — see firestore.rules.
  // A permission-denied read simply means "not a superAdmin."
  const checkSuperAdmin = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'config', 'superAdmins'));
      return snap.exists() && (snap.data().uids || []).includes(uid);
    } catch {
      return false;
    }
  };

  // Qunjee Eats Ops staff — separate, lower-privilege allowlist with the same
  // protection model as superAdmins (hand-edited in the Console, never
  // client-writable). Kept apart so Ops access never implies platform access.
  const checkEatsAdmin = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'config', 'eatsAdmins'));
      return snap.exists() && (snap.data().uids || []).includes(uid);
    } catch {
      return false;
    }
  };

  // Customer Support (call-center) staff — same protection model, own
  // allowlist. See docs/CRM-Support.md.
  const checkCsr = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'config', 'csrAgents'));
      return snap.exists() && (snap.data().uids || []).includes(uid);
    } catch {
      return false;
    }
  };

  // Operations console — same protection model, but a uid→tier map instead
  // of a flat uids array (the first internal role with a hierarchy). Returns
  // the tier string ('teamLead' | 'managerBD' | 'managerOps') or null if not
  // a member. See docs/Operations-Console.md.
  const checkOps = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'config', 'opsTeam'));
      return snap.exists() ? (snap.data().members || {})[uid] || null : null;
    } catch {
      return null;
    }
  };

  // Best-effort request that the browser protect this origin's storage
  // (IndexedDB, where Firebase Auth persists the session) from automatic
  // eviction under storage pressure. Without this, some mobile browsers can
  // silently wipe the session — no error, just logged out on next open —
  // which is what "clear all recents" on some Android OEMs was triggering.
  // Fully optional-chained + caught: unsupported browsers (older Safari,
  // some WebViews) just skip it, never throw.
  const requestPersistentStorage = () => {
    navigator.storage?.persist?.().catch(() => {});
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        requestPersistentStorage();
        const [profile, superAdmin, eatsAdmin, csr, ops] = await Promise.all([
          fetchUserProfile(firebaseUser.uid),
          checkSuperAdmin(firebaseUser.uid),
          checkEatsAdmin(firebaseUser.uid),
          checkCsr(firebaseUser.uid),
          checkOps(firebaseUser.uid),
        ]);
        setUserProfile(profile);
        setIsSuperAdmin(superAdmin);
        setIsEatsAdmin(eatsAdmin);
        setIsCsr(csr);
        setOpsRole(ops);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsSuperAdmin(false);
        setIsEatsAdmin(false);
        setIsCsr(false);
        setOpsRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Privileged consoles auto sign-out (idle 60m / absolute 24h). Customers are
  // never subject to this — see useIdleLogout. businessAdmin is identified by
  // its profile role; the four internal consoles by their allowlist flags.
  const isPrivileged = isSuperAdmin || isEatsAdmin || isCsr || !!opsRole
    || userProfile?.role === 'businessAdmin';
  useIdleLogout(isPrivileged);

  const fetchUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  };

  const createUserProfile = async (firebaseUser, extra = {}) => {
    const profile = {
      uid:         firebaseUser.uid,
      email:       firebaseUser.email,
      displayName: firebaseUser.displayName || extra.displayName || '',
      photoURL:    firebaseUser.photoURL || '',
      role:        extra.role || 'customer',
      businessId:  extra.businessId || null,
      phone:       extra.phone || '',
      createdAt:   serverTimestamp(),
      ...extra,
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), profile, { merge: true });
    return profile;
  };

  const register = async (email, password, displayName, phone = '', role = 'customer') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    await updateProfile(cred.user, { displayName });
    const profile = await createUserProfile(cred.user, { displayName, phone, role });
    setUserProfile(profile);
    return cred.user;
  };

  const login = async (email, password, expectedRole = null) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    const [profile, superAdmin, eatsAdmin, csr, ops] = await Promise.all([
      fetchUserProfile(cred.user.uid),
      checkSuperAdmin(cred.user.uid),
      checkEatsAdmin(cred.user.uid),
      checkCsr(cred.user.uid),
      checkOps(cred.user.uid),
    ]);

    // Same role-gate loginWithGoogle already enforces below — email/password
    // login used to skip it entirely, so a businessAdmin's credentials on
    // the customer Sign In tab (or vice versa) authenticated silently and
    // landed the account on the wrong side of the app with no warning.
    // expectedRole is optional: staff logins (SuperAdmin/Ops/Eats/CSR) don't
    // pass one, and allowlisted staff always skip the check — their `role`
    // field is just the customer/businessAdmin UI hint, not a gate.
    if (expectedRole && profile && profile.role !== expectedRole && !superAdmin && !eatsAdmin && !csr && !ops) {
      await signOut(auth);
      setUser(null);
      throw Object.assign(
        new Error(
          profile.role === 'businessAdmin'
            ? 'This account is registered as a Business Admin. Use the Business Login page.'
            : 'This account is registered as a customer. Use the customer Sign In page.'
        ),
        { code: 'auth/role-mismatch' }
      );
    }

    setUserProfile(profile);
    setIsSuperAdmin(superAdmin);
    setIsEatsAdmin(eatsAdmin);
    setIsCsr(csr);
    setOpsRole(ops);
    // Callers that need to redirect based on allowlist membership right
    // after signing in (e.g. sending a superAdmin straight to /superadmin)
    // can't rely on the isSuperAdmin context value here — it won't reflect
    // this render until the state update above actually re-renders the
    // caller, one tick later. Returning it directly sidesteps that race.
    return { user: cred.user, isSuperAdmin: superAdmin, isEatsAdmin: eatsAdmin, isCsr: csr, opsRole: ops };
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginWithGoogle = async (role = 'customer') => {
    let cred;
    try {
      cred = await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        const methods = await fetchSignInMethodsForEmail(auth, err.customData?.email || '');
        const method = methods[0] === 'password' ? 'email/password' : methods[0];
        throw Object.assign(new Error(`This email is already registered via ${method}. Please sign in with that method.`), { code: err.code });
      }
      throw err;
    }

    setUser(cred.user);

    // Same allowlist checks login() does — loginWithGoogle() used to skip
    // these entirely, so a superAdmin/eatsAdmin/csr/ops signing in with
    // Google never got flagged as one (isSuperAdmin stayed false until the
    // next onAuthStateChanged tick, and callers had no way to redirect on it).
    const [superAdmin, eatsAdmin, csr, ops] = await Promise.all([
      checkSuperAdmin(cred.user.uid),
      checkEatsAdmin(cred.user.uid),
      checkCsr(cred.user.uid),
      checkOps(cred.user.uid),
    ]);
    setIsSuperAdmin(superAdmin);
    setIsEatsAdmin(eatsAdmin);
    setIsCsr(csr);
    setOpsRole(ops);

    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists()) {
      // Only CUSTOMER profiles may auto-create on first Google sign-in. A new
      // Google account on Business Login would otherwise become an admin with
      // no business and no way to finish setup (registration is email/password).
      if (role === 'businessAdmin') {
        await signOut(auth);
        throw Object.assign(
          new Error('No business account found for this Google account. Please use "Register Business" first.'),
          { code: 'auth/no-admin-account' }
        );
      }
      const profile = await createUserProfile(cred.user, { role });
      setUserProfile(profile);
    } else {
      const existing = snap.data();
      // Role mismatch: e.g. customer trying admin Google login or vice versa.
      // Allowlisted staff (superAdmin/eatsAdmin/csr/ops) skip this check —
      // their `role` field is just the customer/businessAdmin UI hint, not a
      // gate, and it can hold values (like "SuperAdmin") this check never expects.
      if (existing.role !== role && !superAdmin && !eatsAdmin && !csr && !ops) {
        await signOut(auth);
        throw Object.assign(
          new Error(
            existing.role === 'businessAdmin'
              ? 'This Google account is registered as a Business Admin. Use the Business Login page.'
              : 'This Google account is registered as a customer. Use the customer Sign In page.'
          ),
          { code: 'auth/role-mismatch' }
        );
      }
      setUserProfile(existing);
    }
    return { user: cred.user, isSuperAdmin: superAdmin, isEatsAdmin: eatsAdmin, isCsr: csr, opsRole: ops };
  };

  // Presence cleanup must run BEFORE signOut() — the RTDB rule requires
  // being authenticated as this uid, so an attempt made after signing out
  // is already unauthenticated and silently rejected (see usePresence.js's
  // stopPresence() comment for the full explanation).
  const logout = async () => {
    if (user) {
      try {
        const { stopPresence } = await import('../hooks/usePresence');
        await stopPresence(user.uid, isCsr ? 'csrStatus' : 'status');
      } catch { /* best-effort — don't block logout on it */ }
    }
    return signOut(auth);
  };

  const updateBusinessId = async (businessId) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { businessId }, { merge: true });
    setUserProfile(prev => ({ ...prev, businessId }));
  };

  const updateUserProfile = async (data) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    if (data.displayName) await updateProfile(user, { displayName: data.displayName });
    setUserProfile(prev => ({ ...prev, ...data }));
  };

  const isGoogleUser = () => user?.providerData?.[0]?.providerId === 'google.com';

  const reauthenticate = async (currentPassword) => {
    if (isGoogleUser()) {
      await reauthenticateWithPopup(user, googleProvider);
    } else {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    await reauthenticate(currentPassword);
    await updatePassword(user, newPassword);
  };

  const deleteAccount = async (currentPassword) => {
    await reauthenticate(currentPassword);
    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
  };

  const uploadAvatar = async (file) => {
    if (!user) return;
    const fileRef = ref(storage, `avatars/${user.uid}/${file.name}`);
    await uploadBytes(fileRef, file);
    const photoURL = await getDownloadURL(fileRef);
    await updateProfile(user, { photoURL });
    await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true });
    setUserProfile(prev => ({ ...prev, photoURL }));
    return photoURL;
  };

  const removeAvatar = async () => {
    if (!user?.photoURL) return;
    try {
      await deleteObject(ref(storage, `avatars/${user.uid}/${decodeURIComponent(user.photoURL.split('/').pop().split('?')[0])}`));
    } catch { /* file may already be gone */ }
    await updateProfile(user, { photoURL: '' });
    await setDoc(doc(db, 'users', user.uid), { photoURL: '' }, { merge: true });
    setUserProfile(prev => ({ ...prev, photoURL: '' }));
  };

  const isAdmin    = userProfile?.role === 'businessAdmin';
  const isCustomer = userProfile?.role === 'customer';

  // Derived from opsRole rather than stored separately — see docs/
  // Operations-Console.md for the tier matrix. SuperAdmin isn't OR'd in here
  // on purpose: callers that need "managerOps OR superAdmin" combine it
  // themselves (same convention isSuperAdmin bypasses use everywhere else),
  // since isOps/isOpsManager/isOpsOperational describe Ops-tier membership
  // specifically, not the union of capabilities.
  const isOps            = opsRole != null;
  const isOpsManager     = opsRole === 'managerBD' || opsRole === 'managerOps';
  const isOpsOperational = opsRole === 'managerOps';

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, isAdmin, isCustomer, isSuperAdmin, isEatsAdmin, isCsr,
      opsRole, isOps, isOpsManager, isOpsOperational,
      register, login, loginWithGoogle, logout, resetPassword,
      fetchUserProfile, updateBusinessId, updateUserProfile,
      isGoogleUser, changePassword, deleteAccount, uploadAvatar, removeAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
