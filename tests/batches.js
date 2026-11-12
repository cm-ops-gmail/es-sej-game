/* Batches, locks, leaderboard and slides, end to end.
   Usage: node tests/batches.js <url> <output-dir>   (run tests/dev-server.js first; it keeps the tables in memory) */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (w, h) => {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true })).newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    return p;
  };
  const playToEnd = async (p, missFirst) => {
    await p.waitForSelector('.game-screen');
    if (missFirst) await p.evaluate(() => { const good = SEJ.current.target(); const wrong = [...document.querySelectorAll('.chip:not([disabled]),.tile:not([disabled]),.answer:not([disabled])')].find((x) => x !== good && good && x.textContent !== good.textContent); if (wrong) wrong.click(); });
    for (let i = 0; i < 400 && !(await p.$('.results')); i++) {
      await p.evaluate(() => { if (SEJ.current && SEJ.current.alive) { const el = SEJ.current.target(); if (el && el.isConnected && !el.disabled) el.click(); } });
      await p.waitForTimeout(30);
    }
    await p.waitForSelector('.results');
  };

  /* ---------- admin creates a batch ---------- */
  const admin = await open(1100, 800);
  await admin.goto(`${BASE}/index.html?test=1#/admin/batches`);
  await admin.waitForSelector('.pin-card');
  for (const d of '1010') await admin.click(`.pin-key[data-key="${d}"]`);
  await admin.waitForSelector('#batch-create');
  await admin.fill('#batch-new-name', 'SEJ Batch 12');
  await admin.click('#batch-create');
  await admin.waitForSelector('.b-batch');
  const link = await admin.inputValue('.b-link');
  const code = link.split('batch=')[1];
  check('batch link has a 6-character code', /^[A-Z0-9]{6}$/.test(code), link);
  check('a new batch starts with lesson 1.1 unlocked', (await admin.locator('.lock-chip.open').count()) === 1 && (await admin.locator('.lock-chip.open').getAttribute('data-lesson')) === '1.1');
  await admin.screenshot({ path: `${OUT}/admin-batches.png`, fullPage: true });

  /* ---------- a student joins with name and ID ---------- */
  const s1 = await open(390, 780);
  await s1.goto(`${link}&test=1`);
  await s1.waitForSelector('#batch-id');
  check('student is asked for name and ID', !!(await s1.$('#batch-name')) && /SEJ Batch 12/.test(await s1.textContent('.onb-card')));
  await s1.screenshot({ path: `${OUT}/student-join.png` });
  await s1.fill('#batch-name', 'Rafi');
  await s1.fill('#batch-id', 'bad id!');
  await s1.click('.onb-card button[type=submit]');
  check('a wrong student ID is refused', !!(await s1.$('#batch-id')));
  await s1.fill('#batch-id', 'S101');
  await s1.click('.onb-card button[type=submit]');
  await s1.waitForSelector('.hero-pick');
  await s1.click('.onb-actions .cta');
  await s1.waitForSelector('.map-page');
  check('map shows 23 locked lessons', (await s1.locator('.node.locked').count()) === 23, await s1.locator('.node.locked').count());
  check('batch students see a leaderboard button, not Admin', !!(await s1.$('#board-btn')) && !(await s1.$('#admin-btn')));
  await s1.screenshot({ path: `${OUT}/student-map-locked.png` });
  await s1.goto(`${BASE}/index.html?test=1#/lesson/1.2`);
  await s1.waitForSelector('.map-page');
  check('a locked lesson can’t be opened by its link', !(await s1.$('.lesson-page')));

  /* ---------- first try counts; a second try is practice ---------- */
  await s1.goto(`${BASE}/index.html?test=1#/play/1.1/0`);
  await playToEnd(s1, true);
  await s1.waitForFunction(() => /on the leaderboard!/.test(document.querySelector('#result-board').textContent), null, { timeout: 8000 });
  const firstScore = Number(await s1.evaluate(() => SEJ.batch && JSON.parse(localStorage.getItem('sej-hero-quest-v1')).batch.done.length));
  check('first try is counted', firstScore === 1);
  await s1.screenshot({ path: `${OUT}/student-result.png` });
  const board1 = await (await s1.request.get(`${BASE}/api/batch?code=${code}&side=board`)).json();
  const score1 = board1.rows[0].score;
  check('leaderboard has the student with a score', board1.rows.length === 1 && board1.rows[0].name === 'Rafi' && score1 > 0, JSON.stringify(board1.rows));
  await s1.goto(`${BASE}/index.html?test=1#/play/1.1/0`);
  await s1.reload();
  await playToEnd(s1, false);
  await s1.waitForFunction(() => /Practice try/.test(document.querySelector('#result-board').textContent), null, { timeout: 8000 });
  await s1.waitForTimeout(400);
  const board2 = await (await s1.request.get(`${BASE}/api/batch?code=${code}&side=board&x=2`)).json();
  check('a second try doesn’t change the leaderboard', board2.rows[0].score === score1 && board2.rows[0].games === 1, `${board2.rows[0].score} vs ${score1}`);
  /* The server enforces it too, even if a phone forgets. */
  const again = await s1.request.post(`${BASE}/api/batch`, { data: { side: 'score', code, id: 'S101', name: 'Rafi', lesson: '1.1', game: 'd0', score: 4999, stars: 3 } });
  check('server ignores a repeat score', (await again.json()).counted === false);
  const locked = await s1.request.post(`${BASE}/api/batch`, { data: { side: 'score', code, id: 'S101', name: 'Rafi', lesson: '1.2', game: 'd0', score: 100, stars: 3 } });
  check('server refuses a score for a locked lesson', locked.status() === 403);
  const noPin = await s1.request.post(`${BASE}/api/batch`, { data: { side: 'open', code, open: ['1.1', '1.2'] } });
  check('students can’t unlock lessons', noPin.status() === 401);

  /* ---------- more students, then the leaderboard ---------- */
  const others = [['Mim', 'S102', 'bhasha', 170], ['Tuli', 'S103', 'knight', 90], ['Nabil', 'S104', 'innovara', 60], ['Sara', 'S105', '', 20]];
  for (const [name, id, hero, score] of others) {
    await s1.request.post(`${BASE}/api/batch`, { data: { side: 'join', code, id, name } });
    await s1.request.post(`${BASE}/api/batch`, { data: { side: 'score', code, id, name, hero, lesson: '1.1', game: 'd0', score, stars: 2 } });
  }
  await s1.goto(`${BASE}/index.html?test=1#/board`);
  await s1.waitForSelector('.lb-step');
  const names = await s1.locator('.lb-step.p1 strong, .lb-row .lb-name').allTextContents();
  check('leaderboard shows the podium and the rest', (await s1.locator('.lb-step').count()) === 3 && (await s1.locator('.lb-row').count()) === 2, names.join());
  check('the top score is first', (await s1.textContent('.lb-step.p1 strong')) === 'Mim');
  check('the student’s own row is highlighted', (await s1.locator('.me').count()) === 1);
  await s1.waitForTimeout(500);
  await s1.screenshot({ path: `${OUT}/leaderboard.png`, fullPage: true });

  /* ---------- the teacher unlocks a lesson; the student sees it ---------- */
  await admin.locator('.lock-chip[data-lesson="1.2"]').click();
  await admin.waitForTimeout(400);
  await s1.goto(`${BASE}/index.html?test=1#/map`);
  await s1.waitForFunction(() => document.querySelectorAll('.node.locked').length === 22, null, { timeout: 8000 });
  check('unlocking a lesson reaches the student', true);
  await admin.locator('.b-batch a', { hasText: 'Leaderboard' }).click();
  await admin.waitForSelector('.lb-step');
  check('the teacher can open the batch leaderboard', (await admin.textContent('.lb-batch')) === 'SEJ Batch 12');

  /* ---------- a second batch has its own leaderboard ---------- */
  const made = await (await admin.request.post(`${BASE}/api/batch`, { data: { side: 'create', pin: '1010', name: 'Batch B' } })).json();
  const boardB = await (await admin.request.get(`${BASE}/api/batch?code=${made.batch.code}&side=board`)).json();
  check('a new batch starts with an empty leaderboard', boardB.rows.length === 0 && made.batch.code !== code);

  /* ---------- slides ---------- */
  await admin.goto(`${BASE}/index.html?test=1#/admin/1.3`);
  await admin.waitForSelector('#lesson-slides');
  const [dl] = await Promise.all([admin.waitForEvent('download', { timeout: 30000 }), admin.click('#lesson-slides')]);
  const pptx = path.join(OUT, 'lesson-1.3.pptx');
  await dl.saveAs(pptx);
  check('lesson slides download as a PowerPoint file', fs.statSync(pptx).size > 20000 && fs.readFileSync(pptx).slice(0, 2).toString() === 'PK', fs.statSync(pptx).size);
  if (process.argv[4] && fs.existsSync(process.argv[4])) {
    const [dl2] = await Promise.all([admin.waitForEvent('download', { timeout: 30000 }), admin.setInputFiles('#docx-file', process.argv[4])]);
    const out2 = path.join(OUT, 'from-word.pptx');
    await dl2.saveAs(out2);
    check('a Word file becomes slides', fs.statSync(out2).size > 20000);
  }
  /* An explanation written with >> is kept with the game and reaches the slides. */
  const noted = await admin.evaluate(() => { const g = SEJ.parseGame('quiz', 'T', 'Which is a fruit? | Mango | Chair; Pen >> A mango grows on a tree.\nWhich can fly? | Bird | Fish; Cat', {}); return { notes: g.notes, items: g.items.length, clean: !JSON.stringify(g.items).includes('>>') }; });
  check('an explanation after >> is kept apart from the game', noted.items === 2 && noted.clean && noted.notes.length === 1 && /grows on a tree/.test(noted.notes[0][1]), JSON.stringify(noted));

  if (errors.length) { failed += errors.length; console.error(errors.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
