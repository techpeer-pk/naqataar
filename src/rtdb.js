import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import app, { useFirebaseEmulator } from './firebase';

// Centralized because connectDatabaseEmulator() must run exactly once,
// before any read/write on the instance — but getDatabase(app) is called
// independently from several lazy-loaded consumers (useSupportChat,
// useVisitorCounter, usePresence, BellNotification, CsrActivityLogPage),
// all of which resolve to the same cached instance. Still only pulled in by
// those same consumers, so this doesn't change what's in the main bundle —
// see the comment in firebase.js for why getDatabase() isn't called there.
const rtdb = getDatabase(app);

if (useFirebaseEmulator) {
  connectDatabaseEmulator(rtdb, 'localhost', 9000);
}

export default rtdb;
