/* Checks every lesson and game against the rules the templates rely on.
   Run from the project folder: node tests/check-content.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
['data', 'links'].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), sandbox));

const lessons = sandbox.SEJ_LESSONS, links = sandbox.SEJ_LINKS;
const errors = [];
const types = {};
const bad = (where, msg) => errors.push(`${where}: ${msg}`);
let itemTotal = 0;

for (const l of lessons) {
  const at = l.code;
  if (!l.mission || !l.mission.en || !l.mission.bn) bad(at, 'missing mission');
  if (!['mathman', 'bhasha', 'knight', 'innovara'].includes(l.hero)) bad(at, 'unknown hero');
  if (!l.talk || l.talk.length < 3) bad(at, 'needs at least 3 talk prompts');
  (l.talk || []).forEach((t, i) => { if (t.length !== 3 || t.some((x) => !x)) bad(at, `talk ${i} needs 3 parts`); });
  const expected = 3;
  if (l.games.length !== expected) bad(at, `has ${l.games.length} games, expected ${expected}`);
  const ref = (links[l.code] || {}).games || [];
  if (ref.length !== 3) bad(at, `has ${ref.length} reference links`);

  l.games.forEach((g, gi) => {
    const w = `${at} game ${gi + 1} (${g.t})`;
    types[g.t] = (types[g.t] || 0) + 1;
    const list = g.items || g.cards || g.pairs || g.good;
    if (!g.title) bad(w, 'no title');
    if (!list || list.length < 3) bad(w, `only ${list ? list.length : 0} items`);
    itemTotal += list ? list.length : 0;
    const seen = new Set();
    (list || []).forEach((it) => {
      const key = JSON.stringify(it);
      if (seen.has(key)) bad(w, `duplicate ${key}`);
      seen.add(key);
    });
    if (g.t === 'unjumble') g.items.forEach((s) => {
      const text = s.split('|').pop().trim();
      if (text.split(/\s+/).length < 2) bad(w, `too short: ${s}`);
      if (text.split(/\s+/).length > 12) bad(w, `too long for juniors: ${s}`);
      if (!/[.?!]$/.test(text)) bad(w, `no end mark: ${s}`);
    });
    if (g.t === 'sort') {
      if (g.groups.length < 2 || g.groups.length > 3) bad(w, 'needs 2 or 3 groups');
      g.groups.forEach((_, n) => { if (!g.cards.some((c) => c[1] === n)) bad(w, `group ${n} is empty`); });
      g.cards.forEach((c) => { if (c[1] >= g.groups.length) bad(w, `bad group for ${c[0]}`); });
    }
    if (g.t === 'anagram' || g.t === 'spell') g.items.forEach((i) => {
      if (!/^[a-zA-Z]{2,14}( [a-zA-Z]{1,14})*$/.test(i[0])) bad(w, `bad word ${i[0]}`);
      if (!i[1]) bad(w, `no clue for ${i[0]}`);
      if (i[1].toLowerCase().includes(i[0].toLowerCase())) bad(w, `clue gives away ${i[0]}`);
    });
    if (g.t === 'blank') g.items.forEach((i) => {
      const m = i[0].match(/\{(.+)\}/);
      if (!m) return bad(w, `no gap: ${i[0]}`);
      if (!i[1].length) bad(w, `no wrong options: ${i[0]}`);
      if (i[1].includes(m[1])) bad(w, `wrong option equals answer: ${i[0]}`);
    });
    if (g.t === 'match') {
      if (new Set(g.pairs.map((p) => p[0])).size !== g.pairs.length) bad(w, 'duplicate left card');
      if (new Set(g.pairs.map((p) => p[1])).size !== g.pairs.length) bad(w, 'duplicate right card');
    }
    if (g.t === 'find' && new Set(g.items.map((i) => i[1])).size < 2) bad(w, 'needs varied answers');
    if (g.t === 'quiz' || g.t === 'plane' || g.t === 'boxes') g.items.forEach((i) => {
      if (!i[2].length) bad(w, `no wrong answers: ${i[0]}`);
      if (i[2].includes(i[1])) bad(w, `wrong answer equals right answer: ${i[0]}`);
      if (g.t === 'plane' && i[2].length !== 2) bad(w, `plane needs exactly 2 wrong answers: ${i[0]}`);
    });
    if (g.t === 'pair' || g.t === 'tf') {
      const yes = g.items.filter((i) => (g.t === 'pair' ? i[2] : i[1])).length;
      if (!yes || yes === g.items.length) bad(w, 'answers are all the same');
    }
    if (g.t === 'whack' && (!g.good.length || !g.bad.length || !g.prompt)) bad(w, 'needs good, bad and a prompt');
  });
}

console.log(`Lessons: ${lessons.length}`);
console.log(`Games: ${lessons.reduce((a, l) => a + l.games.length, 0)} + ${lessons.length} speaking rounds`);
console.log(`Items: ${itemTotal}`);
console.log('Templates:', JSON.stringify(types));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('All content checks passed.');
