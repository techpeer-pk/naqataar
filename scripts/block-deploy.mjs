/**
 * Naqatar NEVER deploys Firestore / RTDB / Storage rules or Cloud Functions.
 * The files in emulator/ are read-only snapshots of K:\QuFree\app_OLD's rules,
 * used only by the local Firebase Emulator. The real backend (project
 * qunjee-com) is owned and deployed from K:\QuFree\app_OLD only.
 *
 * This script runs as the predeploy hook of every rules target in
 * firebase.json, so `firebase deploy` from this repo always fails.
 */
console.error(
  '\n❌ BLOCKED: Naqatar rules/backend deploy nahi karta.\n' +
  '   emulator/ ke rules sirf local emulator ke liye hain.\n' +
  '   Asli backend sirf K:\QuFree\app_OLD se deploy hota hai.\n',
);
process.exit(1);
