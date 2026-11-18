/**
 * Hosting predeploy guard (firebase.json → hosting.predeploy).
 *
 * Blocks a deploy of a build that would not work in production:
 *  - dist/ missing
 *  - built with the emulator config (VITE_USE_FIREBASE_EMULATOR=true →
 *    the "demo-naqatar" project id is baked into the bundle)
 *  - missing the real Firebase project config (.env.production.local)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const fail = (msg) => { console.error(`\n❌ Deploy blocked: ${msg}\n`); process.exit(1); };

const dir = 'dist/assets';
if (!existsSync(dir)) fail('dist/ not found. Run "npm run build" first.');

const js = readdirSync(dir).filter(f => f.endsWith('.js')).map(f => readFileSync(join(dir, f), 'utf8')).join('\n');
if (js.includes('demo-naqatar')) fail('the build points at the local emulator (demo-naqatar). Check .env.production.local has VITE_USE_FIREBASE_EMULATOR=false, then rebuild.');
if (!js.includes('qunjee-com')) fail('the real Firebase project config is missing from the build. Create .env.production.local (see README → Deploy), then rebuild.');

console.log('✅ Production build check passed (real Firebase config, no emulator).');
