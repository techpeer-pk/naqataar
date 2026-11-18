/**
 * i18n check — every literal t('…') key used in src/ must exist in the
 * Hinglish dictionary (src/i18n/hinglish.js). Missing keys would silently
 * render in English, so this catches them.
 *
 *   npm run i18n:check
 *
 * Dynamic keys (t(label), t(row.label), …) can't be checked statically —
 * their English source strings live in arrays/maps next to the call.
 * Also lists dictionary entries no literal call uses (may be dynamic keys,
 * or leftovers worth deleting).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import dict from '../src/i18n/hinglish.js';

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== 'i18n') walk(p); } // i18n/ only holds examples in comments
    else if (/\.(jsx?|mjs)$/.test(n)) files.push(p);
  }
})('src');

const used = new Map(); // key -> first file
const re = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    const key = m[2].replace(/\\(['"\\])/g, '$1');
    if (!used.has(key)) used.set(key, f);
  }
}

const missing = [...used].filter(([k]) => !(k in dict));
const unused  = Object.keys(dict).filter(k => !used.has(k));

console.log(`t() literal keys: ${used.size} | dictionary: ${Object.keys(dict).length}`);
if (missing.length) {
  console.log(`\n❌ Missing from hinglish.js (${missing.length}):`);
  for (const [k, f] of missing) console.log(`   ${JSON.stringify(k)}   ← ${f}`);
}
if (unused.length) {
  console.log(`\nℹ️  Not used as a literal key (${unused.length}) — dynamic keys or leftovers:`);
  console.log('   ' + unused.map(k => JSON.stringify(k)).join(', '));
}
if (!missing.length) console.log('\n✅ Every literal t() key has a Hinglish entry.');
process.exit(missing.length ? 1 : 0);
