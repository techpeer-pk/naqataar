import { useCallback } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import mainApp, { db } from '../firebase';

export function useUsers() {
  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'users', id), data);
  }, []);

  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'users', id));
  }, []);

  /**
   * Creates a brand-new Firebase Auth account + Firestore profile from the
   * SuperAdmin console. Runs on a throwaway secondary Firebase app instance
   * — createUserWithEmailAndPassword always signs in as the new user on
   * whichever app instance it's called on, so doing this on the *primary*
   * app would kick the SuperAdmin out of their own session. The secondary
   * instance is torn down right after, leaving the SuperAdmin's real
   * session untouched. The Firestore write happens as the new user
   * themselves (self-create), which is exactly what the existing
   * self-service `users/{uid}` create rule already allows.
   */
  const create = useCallback(async ({ email, password, displayName, phone, role, businessId, isTester }) => {
    const secondaryApp = initializeApp(mainApp.options, `sa-create-user-${Date.now()}`);
    try {
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      if (displayName) await updateProfile(cred.user, { displayName });

      const secondaryDb = getFirestore(secondaryApp);
      await setDoc(doc(secondaryDb, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email,
        displayName: displayName || '',
        photoURL: '',
        role: role || 'customer',
        businessId: businessId || null,
        phone: phone || '',
        isActive: true,
        isTester: !!isTester,
        createdAt: serverTimestamp(),
      });
      return cred.user.uid;
    } finally {
      await deleteApp(secondaryApp);
    }
  }, []);

  return { create, update, remove };
}
