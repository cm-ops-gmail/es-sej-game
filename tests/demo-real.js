/* A full demo on the REAL Google Sheet: an admin creates a game and a batch, students join and play, the leaderboard fills.
   Usage: REAL_SHEET=1 node tests/dev-server.js 8125   then   node tests/demo-real.js http://localhost:8125 <output-dir>
   It leaves "Demo Batch (sample)" and the created game (taken off the map) so they can be looked at; both can be removed in the admin panel. */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8125';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) { passed++; console.log(`ok   ${name}`); } else { failed++; console.error(`FAIL ${name} ${extra}`); } };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (w, h) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
  const play = async (p, shot) => {
    await p.waitForSelector('.game-screen');
    for (let i = 0; i < 600 && !(await p.$('.results')); i++) {
      await p.evaluate(() => { if (SEJ.current && SEJ.current.alive) { const el = SEJ.current.target(); if (el && el.isConnected && !el.disabled) el.click(); } });
      if (i === 3 && shot) await p.screenshot({ path: shot });
      await p.waitForTimeout(40);
    }
    await p.waitForSelector('.results');
  };

  /* 1. the admin makes a new game from pasted content */
  const admin = await open(1200, 850);
  await admin.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await admin.waitForSelector('.pin-card');
  await admin.fill('#admin-pass', '1010'); await admin.click('#admin-login');
  await admin.waitForSelector('#create-game');
  check('admin panel saves to the shared sheet', /everyone/.test(await admin.textContent('.b-save-state')));
  await admin.click('#create-game');
  await admin.click('.template-btn[data-type="Quiz"]');
  await admin.waitForSelector('#use-example');
  await admin.click('#use-example');
  await admin.fill('.b-input', 'Demo: Quick Quiz');
  await admin.click('#save-test');
  await play(admin, `${OUT}/demo-game.png`);
  check('the demo game was created and played by the admin', true);

  /* 2. the admin makes a batch link */
  await admin.goto(`${BASE}/index.html?test=1#/admin/batches`);
  await admin.waitForSelector('#batch-create');
  await admin.fill('#batch-new-name', 'Demo Batch (sample)');
  await admin.click('#batch-create');
  await admin.waitForFunction(() => [...document.querySelectorAll('.b-batch')].some((x) => /Demo Batch \(sample\)/.test(x.textContent)), null, { timeout: 20000 });
  const card = admin.locator('.b-batch', { hasText: 'Demo Batch (sample)' }).last();
  const link = await card.locator('.b-link').inputValue();
  const code = link.split('batch=')[1];
  check('a batch link was made', /^[A-Z0-9]{6}$/.test(code), link);

  /* 3. students join with name and ID, and play */
  const students = [['Rafi', 'DEMO-01', 3], ['Mim', 'DEMO-02', 0], ['Tuli', 'DEMO-03', 1]];
  let last;
  for (const [name, id, game] of students) {
    const s = await open(390, 800);
    await s.goto(`${link}&test=1`);
    await s.waitForSelector('#batch-id');
    await s.fill('#batch-name', name);
    await s.fill('#batch-id', id);
    await s.click('.onb-card button[type=submit]');
    await s.waitForSelector('.hero-pick', { timeout: 20000 });
    await s.click('.onb-actions .cta');
    await s.waitForSelector('.map-page');
    if (name === 'Rafi') {
      await s.screenshot({ path: `${OUT}/demo-map.png` });
      await s.goto(`${BASE}/index.html?test=1#/lesson/1.1`);
      await s.waitForSelector('.game-card');
      check('the student sees the admin’s new game in the lesson', /Demo: Quick Quiz/.test(await s.textContent('.game-list')));
    }
    await s.goto(`${BASE}/index.html?test=1#/play/1.1/${game}`);
    await play(s, name === 'Mim' ? `${OUT}/demo-game-phone.png` : null);
    await s.waitForFunction(() => /on the leaderboard!/.test(document.querySelector('#result-board').textContent), null, { timeout: 20000 });
    check(`${name} played and the first score was saved`, true);
    if (name === 'Rafi') {
      await s.screenshot({ path: `${OUT}/demo-result.png` });
      await s.goto(`${BASE}/index.html?test=1#/play/1.1/${game}`); await s.reload();
      await play(s);
      await s.waitForFunction(() => /Practice try/.test(document.querySelector('#result-board').textContent), null, { timeout: 20000 });
      check('Rafi’s second try was practice only', true);
    }
    last = s;
  }
  await last.goto(`${BASE}/index.html?test=1#/board`);
  await last.waitForSelector('.lb-step', { timeout: 20000 });
  await last.waitForTimeout(900);
  check('the leaderboard shows all three students', (await last.locator('.lb-step').count()) === 3);
  await last.screenshot({ path: `${OUT}/demo-leaderboard.png`, fullPage: true });
  const board = await (await last.request.get(`${BASE}/api/batch?code=${code}&side=board`)).json();
  check('each student has exactly one counted game', board.rows.length === 3 && board.rows.every((r) => r.games === 1 && r.score > 0), JSON.stringify(board.rows));
  console.log('leaderboard:', board.rows.map((r) => `${r.rank}. ${r.name} ${r.score}`).join(' | '));

  /* 4. the database check, and tidy the map */
  await admin.goto(`${BASE}/index.html?test=1#/admin/batches`);
  await admin.waitForSelector('#db-check');
  await admin.click('#db-check');
  await admin.waitForFunction(() => /database is ready/.test(document.querySelector('#db-status').textContent), null, { timeout: 30000 });
  console.log('db check:', await admin.textContent('#db-status'));
  check('the database check passes', true);
  await admin.screenshot({ path: `${OUT}/demo-admin-batches.png`, fullPage: true });
  await admin.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await admin.waitForSelector('#create-game');
  await admin.locator('.b-section[aria-label="On the map"] .b-game', { hasText: 'Demo: Quick Quiz' }).getByText('➖ Remove').click();
  await admin.waitForTimeout(1500);
  check('the demo game is off the map again, kept under Created games', (await admin.locator('.b-section[aria-label="On the map"] .b-game').count()) === 3 && /Demo: Quick Quiz/.test(await admin.textContent('.b-section[aria-label="Created games"]')));

  if (errors.length) { failed += errors.length; console.error(errors.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
