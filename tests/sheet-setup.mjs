/* Checks and repairs the real Google Sheet, then prints what it found.
   Usage: node tests/sheet-setup.mjs            (reads .env; prints no secrets)
          node tests/sheet-setup.mjs --clean    also removes rows left by earlier tests (batch names starting "ZZ ") */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const m of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').matchAll(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/gm)) if (!process.env[m[1]]) process.env[m[1]] = m[2].trim();
const db = await import(path.join(ROOT, 'lib/sheets.mjs'));
console.log(JSON.stringify(await db.setup()));
if (process.argv.includes('--clean')) {
  const test = new Set((await db.rows('SEJ_Batches')).filter((r) => /^ZZ /.test(r[1] || '')).map((r) => r[0]));
  let n = 0;
  for (const t of ['SEJ_Batches', 'SEJ_Students', 'SEJ_Scores']) for (const r of await db.rows(t)) if (test.has(r[0])) { await db.update(t, r._n, []); n++; }
  console.log(`cleared ${n} test rows from ${test.size} test batches`);
}
for (const t of Object.keys(db.TABLES)) { const r = await db.rows(t); console.log(t, 'header ok, rows:', r.filter((x) => x[0]).length, 'blank:', r.filter((x) => !x[0]).length); }
