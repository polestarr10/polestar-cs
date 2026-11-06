// Runs test emails through the built-in email reader and compares what it
// extracts with the correct answer written under each email.
//
//   npm run test:emails                       -> the made-up examples in tests/emails
//   npm run test:emails -- "D:\private-emails" -> also a folder of real emails
//
// Each test is one .txt file: the email as pasted, then a line
// "=== EXPECTED ===", then the correct answer as JSON, e.g.
//   { "kind": "new_inquiry",
//     "inquiries": [ { "pol": "Ningbo", "pod": "Nhava Sheva", "volumeCbm": 2.9 } ] }
// Only the fields you list are checked. Keep real client emails OUT of this
// project folder (pass their folder on the command line instead).
import fs from 'fs';
import path from 'path';
import { readEmailWithRules } from '../src/utils/ruleReader.js';

const SPLIT = /^=+\s*EXPECTED\s*=+\s*$/m;
const folders = [path.resolve('tests/emails'), ...process.argv.slice(2).map(p => path.resolve(p))];

const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9.@#]+/g, ' ').trim();

// Text matches when the reader's value contains the expected words in order
// ("Nhava Sheva / JNPT" counts for "Nhava Sheva"); numbers must be equal.
function matches(actual, expected) {
  if (typeof expected === 'number') return Math.abs((Number(actual) || 0) - expected) < 0.01;
  const a = norm(actual);
  const e = norm(expected);
  if (!e) return !a;
  return a === e || a.includes(e);
}

const PORT_KEYS = { pol: 'polCode', pod: 'podCode' };
// Fields that must match exactly (no extra words allowed, e.g. "FOB" not "FOB Yokohama").
const EXACT = new Set(['incoterms', 'hsnCode', 'direction', 'containerType']);

let files = 0;
let fieldsOk = 0;
let fieldsTotal = 0;
const failures = [];

for (const folder of folders) {
  if (!fs.existsSync(folder)) {
    console.log(`(folder not found: ${folder})`);
    continue;
  }
  for (const name of fs.readdirSync(folder).filter(f => f.endsWith('.txt')).sort()) {
    const text = fs.readFileSync(path.join(folder, name), 'utf8');
    const [email, answer] = text.split(SPLIT);
    if (!answer) { console.log(`?? ${name}: no "=== EXPECTED ===" line, skipped`); continue; }
    let expected;
    try { expected = JSON.parse(answer); } catch (e) { console.log(`?? ${name}: the expected answer isn't valid JSON (${e.message})`); continue; }
    files++;

    // Replies are read against inquiries already in the app; a test can list them
    // under "existing", e.g. [{ "id": "INQ-2026-1001", "emailSubject": "...", "contactEmail": "..." }].
    const existing = (expected.existing || []).map(i => ({ status: 'QUOTED_REPLIED', isQuoted: true, hasReplied: true, receivedAt: new Date().toISOString(), ...i }));
    const result = readEmailWithRules(email, existing);
    const problems = [];
    let ok = 0;
    let total = 0;

    if (expected.kind) {
      total++;
      if (result.kind === expected.kind) ok++; else problems.push(`type: got "${result.kind}", should be "${expected.kind}"`);
    }
    if (expected.matches) {
      total++;
      if (result.matchedInquiryId === expected.matches) ok++; else problems.push(`belongs to: got "${result.matchedInquiryId || 'none'}", should be "${expected.matches}"`);
    }
    if (expected.declineReason) {
      total++;
      if (result.declined?.reason === expected.declineReason) ok++; else problems.push(`decline reason: got "${result.declined?.reason}", should be "${expected.declineReason}"`);
    }
    const wanted = expected.inquiries || [];
    const got = result.shipments?.length ? result.shipments : [result.shipment];
    if (wanted.length) {
      total++;
      if (got.length === wanted.length) ok++;
      else problems.push(`shipments: found ${got.length}, should be ${wanted.length}`);
    }
    if (expected.warns !== undefined) {
      total++;
      if (Boolean(result.multipleHint) === expected.warns) ok++;
      else problems.push(`"may hold several shipments" warning: ${result.multipleHint ? `shown (${result.multipleHint})` : 'not shown'}, should be ${expected.warns ? 'shown' : 'not shown'}`);
    }
    // Compare each expected shipment with the one the reader found in the same position.
    wanted.forEach((want, n) => {
      const ship = got[n] || {};
      const tag = wanted.length > 1 ? `#${n + 1} ` : '';
      for (const [key, value] of Object.entries(want)) {
        total++;
        const actual = ship[key];
        const portCode = PORT_KEYS[key] && ship[PORT_KEYS[key]];
        const good = EXACT.has(key) ? norm(actual) === norm(value) : matches(actual, value) || (portCode && matches(portCode, value));
        if (good) ok++;
        else problems.push(`${tag}${key}: got "${actual ?? ''}", should be "${value}"`);
      }
    });

    fieldsOk += ok;
    fieldsTotal += total;
    const mark = problems.length ? '❌' : '✅';
    console.log(`${mark} ${name.padEnd(42)} ${ok}/${total}`);
    for (const p of problems) console.log(`     - ${p}`);
    if (problems.length) failures.push(name);
  }
}

const pct = fieldsTotal ? Math.round((fieldsOk / fieldsTotal) * 100) : 0;
console.log(`\n${files} emails · ${fieldsOk}/${fieldsTotal} checks correct (${pct}%) · ${failures.length} email(s) with mistakes`);
process.exitCode = failures.length ? 1 : 0;
