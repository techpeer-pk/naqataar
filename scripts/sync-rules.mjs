// Copies the current QuFree backend rules into emulator/ (read-only snapshot).
// Usage: npm run sync:rules  [-- <path-to-app_OLD>]
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2] || 'K:/QuFree/app_OLD';
for (const f of ['firestore.rules', 'storage.rules', 'database.rules.json']) {
  const from = join(src, f);
  if (!existsSync(from)) { console.error(`❌ Not found: ${from}`); process.exit(1); }
  copyFileSync(from, join('emulator', f));
  console.log(`✅ ${f}`);
}
console.log('\nUpdate the snapshot date/commit in emulator/README.md.');
