/* Edits and created games reach students, even when the server is slow to answer at start-up.
   Usage: node tests/sharing.js <url> <output-dir>   (run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };
const slowFirst = async (page, ms) => { let n = 0; await page.route('**/api/content', async (route) => { if (route.request().method() === 'GET' && n++ < 1) await new Promise((r) => setTimeout(r, ms)); await route.continue(); }); };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (w, h) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p; };
  const admin = await open(1200, 850);

  /* A batch to play in. */
  await admin.goto(`${BASE}/index.html?test=1#/admin/batches`);
  await admin.fill('#admin-pass', '1010'); await admin.click('#admin-login');
  await admin.waitForSelector('#batch-create');
  await admin.fill('#batch-new-name', 'Sharing Batch'); await admin.click('#batch-create');
  await admin.waitForSelector('.b-batch');
  const code = (await admin.inputValue('.b-link')).split('batch=')[1];

  /* The admin's page starts while the server is slow (longer than the 3 seconds a page normally waits). */
  const slowAdmin = await open(1200, 850);
  await slowFirst(slowAdmin, 4500);
  await slowAdmin.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await slowAdmin.fill('#admin-pass', '1010'); await slowAdmin.click('#admin-login');
  await slowAdmin.waitForSelector('#create-game', { timeout: 20000 });
  check('after a slow start the admin still ends up connected to the sheet', /Saves for everyone/.test(await slowAdmin.textContent('.b-save-state')), await slowAdmin.textContent('.b-save-state'));
  /* Edit a default game and create a new one, then put the new one on the map. */
  await slowAdmin.locator('.b-section[aria-label="Default games"] .b-game').first().getByText('✏️ Edit').click();
  await slowAdmin.waitForSelector('.b-text');
  const before = await slowAdmin.inputValue('.b-text');
  await slowAdmin.fill('.b-input', 'Edited Title Game');
  await slowAdmin.click('#save-game');
  await slowAdmin.waitForSelector('#create-game');
  await slowAdmin.click('#create-game');
  await slowAdmin.click('.template-btn[data-type="Quiz"]');
  await slowAdmin.fill('.b-input', 'Brand New Quiz');
  await slowAdmin.fill('.b-text', 'Which is a fruit? | Mango | Chair; Pen\nWhich can fly? | Bird | Fish; Cat');
  await slowAdmin.click('#save-game');
  await slowAdmin.waitForSelector('#create-game');
  const saved = await (await admin.request.get(`${BASE}/api/content?x=${Date.now()}`)).json();
  check('the edit and the new game are saved in the shared database', !!saved.content['1.1'] && JSON.stringify(saved.content['1.1']).includes('Brand New Quiz') && JSON.stringify(saved.content['1.1']).includes('Edited Title Game'), Object.keys(saved.content).join());
  check('nothing was kept only on the admin’s device', await slowAdmin.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('sej-hero-quest-v1')).custom || {}).length === 0));

  /* A student whose page starts slowly still gets the games, without reloading. */
  const student = await open(390, 780);
  await student.addInitScript((c) => localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Rafi', hero: 'knight', onboarded: true, sound: false, music: false, stars: {}, custom: {}, batch: { code: c, name: 'Sharing Batch', id: 'S1', open: ['1.1'], done: [] } })), code);
  await slowFirst(student, 4500);
  await student.goto(`${BASE}/index.html?test=1#/lesson/1.1`);
  await student.waitForSelector('.game-card', { timeout: 20000 });
  await student.waitForFunction(() => /Brand New Quiz/.test(document.querySelector('.game-list').textContent), null, { timeout: 25000 });
  check('a student whose page loaded slowly sees the new game without reloading', (await student.locator('.game-card').count()) === 4 && /Edited Title Game/.test(await student.textContent('.game-list')));

  /* A second student, a normal start. */
  const student2 = await open(390, 780);
  await student2.addInitScript((c) => localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Mim', hero: 'bhasha', onboarded: true, sound: false, music: false, stars: {}, custom: {}, batch: { code: c, name: 'Sharing Batch', id: 'S2', open: ['1.1'], done: [] } })), code);
  await student2.goto(`${BASE}/index.html?test=1#/lesson/1.1`);
  await student2.waitForSelector('.game-card');
  check('every student of the batch sees the edited and the new game', (await student2.locator('.game-card').count()) === 4 && /Brand New Quiz/.test(await student2.textContent('.game-list')) && /Edited Title Game/.test(await student2.textContent('.game-list')));
  check('the plain site address still shows only the defaults', await (async () => { const p = await open(390, 780); await p.addInitScript(() => localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Visitor', hero: 'knight', onboarded: true, sound: false, music: false, stars: {}, custom: {} }))); await p.goto(`${BASE}/index.html?test=1#/lesson/1.1`); await p.waitForSelector('.game-card'); return (await p.locator('.game-card').count()) === 3 && !/Brand New Quiz/.test(await p.textContent('.game-list')); })());

  /* A server that doesn't answer never leads to a silent device-only save. */
  const down = await open(1200, 850);
  await down.goto(`${BASE}/index.html?test=1#/admin/1.2`);
  await down.fill('#admin-pass', '1010'); await down.click('#admin-login');
  await down.waitForSelector('#create-game');
  await down.route('**/api/content', (route) => (route.request().method() === 'POST' && /"save"/.test(route.request().postData() || '') ? route.abort() : route.continue()));
  await down.locator('.b-section[aria-label="On the map"] .b-game').first().getByText('➖ Remove').click();
  await down.waitForFunction(() => /nothing was saved/.test((document.querySelector('.toast') || {}).textContent || ''), null, { timeout: 10000 });
  check('if the server can’t be reached the admin is told, not silently saved on the device', await down.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('sej-hero-quest-v1')).custom || {}).length === 0));

  /* Changes stuck on a device (saved before the sheet was connected) can be published or dropped. */
  const stuck = await open(1200, 850);
  await stuck.addInitScript(() => { if (!localStorage.getItem('sej-hero-quest-v1')) localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'T', hero: 'knight', onboarded: true, sound: false, music: false, stars: {}, custom: { '1.5': { map: ['d0', 'd1'], created: [], edits: {} } } })); });
  await stuck.goto(`${BASE}/index.html?test=1#/admin`);
  await stuck.fill('#admin-pass', '1010'); await stuck.click('#admin-login');
  await stuck.waitForSelector('#device-banner');
  check('changes stranded on a device are flagged', /1 lesson change/.test(await stuck.textContent('#device-banner')));
  await stuck.click('#device-publish');
  await stuck.waitForFunction(() => !document.querySelector('#device-banner'), null, { timeout: 10000 });
  const pub = await (await admin.request.get(`${BASE}/api/content?x=${Date.now()}`)).json();
  check('publishing sends them to the shared database', JSON.stringify(pub.content['1.5'].map) === '["d0","d1"]');
  await admin.request.post(`${BASE}/api/content`, { data: { side: 'save', pin: '1010', code: '1.5', change: null } });
  await admin.request.post(`${BASE}/api/content`, { data: { side: 'save', pin: '1010', code: '1.1', change: null } });

  if (errors.length) { failed += errors.length; console.error(errors.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
