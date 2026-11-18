import { useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

/** Append-only trail of SuperAdmin/Ops mutations — see firestore.rules `auditLog`. */
export function useAuditLog() {
  const log = useCallback(async ({ action, targetCollection, docId, summary }) => {
    const actor = auth.currentUser;
    try {
      await addDoc(collection(db, 'auditLog'), {
        actorUid:   actor?.uid || null,
        actorEmail: actor?.email || null,
        action,            // 'create' | 'update' | 'delete'
        targetCollection,  // e.g. 'users', 'businesses', 'appointments'
        docId,
        summary,
        timestamp: serverTimestamp(),
      });
    } catch {
      // Best-effort: the audited mutation has already succeeded by the time
      // log() runs, so a denied/failed log write must not fail the action.
      // Rules only allow superAdmin/eatsAdmin to append — business owners
      // (F2) share these pages and are expected to be denied here.
    }
  }, []);

  return { log };
}
