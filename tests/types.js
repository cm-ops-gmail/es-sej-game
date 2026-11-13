/* Every Wordwall game type in the admin catalog: its example content must parse, play to the end on a
   phone-sized screen without errors, and fit the screen. Also checks the admin panel's create flow.
   Usage: node tests/types.js <url> <screenshot-dir>   (run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8124';
const SHOTS = process.argv[3] || 'shots';
fs.mkdirSync(SHOTS, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('sej-hero-quest-v1')) localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Rafi', hero: 'mathman', onboarded: true, sound: false, music: false, stars: {}, custom: {} })); });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/index.html?test=1#/map`);
  await p.waitForSelector('.map-page');
  const catalog = await p.evaluate(() => SEJ.CATALOG.flatMap(([group, list]) => list.map(([name, t, o]) => ({ group, name, t, o: o || {} }))));
  check('34 game types in the catalog', catalog.length === 34, catalog.length);
  check('every type has a game engine and a paste format', await p.evaluate(() => SEJ.CATALOG.every(([, l]) => l.every(([, t]) => SEJ.ENGINES[t] && SEJ.formats[t] && SEJ.TEMPLATES[t]))));

  for (const entry of catalog) {
    errors.length = 0;
    const res = await p.evaluate(async ({ t, o, name }) => {
      const lesson = SEJ.lesson('1.1');
      let game;
      try { game = SEJ.parseGame(t, name, SEJ.formats[t].sample, o); } catch (e) { return { parse: e.message }; }
      const root = document.querySelector('#app');
      let finished = null;
      const host = SEJ.playGame(root, lesson, 'test', game, { onExit() {}, onFinish(r) { finished = r; } });
      const t0 = performance.now();
      let steps = 0;
      while (!finished && performance.now() - t0 < 20000) {
        const el = host.target();
        if (el && el.isConnected && !el.disabled) { el.click(); steps++; }
        await new Promise((r) => setTimeout(r, 30));
        const over = document.documentElement.scrollWidth > innerWidth + 2;
        if (over) return { overflow: true, steps };
      }
      return { finished: !!finished, stars: finished && finished.stars, steps };
    }, entry);
    const label = `${entry.name} (${entry.t})`;
    check(`${label} example parses`, !res.parse, res.parse || '');
    check(`${label} plays to the end`, !!res.finished, JSON.stringify(res));
    check(`${label} fits a phone screen`, !res.overflow);
    check(`${label} no errors`, !errors.length, errors.join(' | '));
    await p.evaluate(() => { document.querySelector('#app').replaceChildren(); });
  }

  /* Screens of a few new types mid-game. */
  for (const t of ['wordsearch', 'crossword', 'maze', 'hangman', 'magnets', 'labelled', 'wheel', 'pairs']) {
    await p.evaluate((tt) => {
      const game = SEJ.parseGame(tt, '', SEJ.formats[tt].sample, {});
      SEJ.playGame(document.querySelector('#app'), SEJ.lesson('1.1'), 'test', game, { onExit() {}, onFinish() {} });
    }, t);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/type-${t}.png` });
  }

  /* Admin flow: Admin button, PIN, create a game from the catalog, see it on the map, play it, delete it. */
  await p.goto(`${BASE}/index.html?test=1#/map`);
  await p.reload();
  await p.waitForSelector('#admin-btn');
  check('map has an Admin button and no settings button', (await p.$('#admin-btn')) && !(await p.$('a[href="#/teacher"]')));
  await p.click('#admin-btn');
  await p.waitForSelector('.pin-card');
  for (const d of '1234') await p.click(`.pin-key[data-key="${d}"]`);
  await p.waitForFunction(() => /Wrong PIN/.test(document.querySelector('.pin-msg').textContent));
  check('wrong admin PIN is refused', !(await p.$('#create-game')));
  for (const d of '1010') await p.click(`.pin-key[data-key="${d}"]`);
  await p.waitForSelector('#lesson-table');
  check('admin opens on an overview of all 24 lessons', (await p.locator('#lesson-table tbody tr').count()) === 24);
  await p.fill('.cms-search', 'action');
  check('lessons can be searched', (await p.locator('#lesson-table tbody tr:visible').count()) === 1);
  await p.fill('.cms-search', '');
  await p.screenshot({ path: `${SHOTS}/admin-overview.png`, fullPage: true });
  await p.locator('#lesson-table tbody tr').first().locator('td').nth(1).click();
  await p.waitForSelector('#create-game');
  check('the sidebar marks the open lesson', (await p.locator('.b-lesson.on').count()) === 1);
  check('admin panel shows default games', (await p.locator('.b-section[aria-label="Default games"] .b-game').count()) === 3);
  check('panel saves for everyone', /everyone/.test(await p.textContent('.b-save-state')));
  await p.screenshot({ path: `${SHOTS}/admin-panel.png`, fullPage: true });
  await p.click('#create-game');
  await p.waitForSelector('.template-btn');
  check('picker lists all 34 types', (await p.locator('.template-btn').count()) === 34);
  await p.screenshot({ path: `${SHOTS}/admin-picker.png`, fullPage: true });
  await p.click('.template-btn[data-type="Hangman"]');
  await p.waitForSelector('#use-example');
  check('editor shows the example for the chosen type', /pencil/.test(await p.textContent('.b-sample')));
  await p.click('#save-game');
  await p.waitForTimeout(200);
  check('empty content is not saved', !!(await p.$('#save-game')));
  await p.click('#use-example');
  await p.fill('.b-input', 'School Hangman');
  await p.screenshot({ path: `${SHOTS}/admin-editor.png`, fullPage: true });
  await p.click('#save-test');
  await p.waitForSelector('.game-screen');
  check('new game opens to play', /School Hangman/.test(await p.textContent('.game-title h1')));
  /* A student on another device sees it after a reload, because it was saved for everyone. */
  const other = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  await other.addInitScript(() => localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Mim', hero: 'bhasha', onboarded: true, sound: false, music: false, stars: {}, custom: {} })));
  await other.goto(`${BASE}/index.html?test=1#/lesson/1.1`);
  await other.waitForSelector('.game-card');
  check('another student sees the new game on the lesson page', (await other.locator('.game-card').count()) === 4 && /School Hangman/.test(await other.textContent('.game-list')));
  /* Remove a default game from the map, then reset the lesson. */
  await p.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await p.waitForSelector('#create-game');
  await p.locator('.b-section[aria-label="On the map"] .b-game').first().getByText('➖ Remove').click();
  await p.waitForTimeout(300);
  check('a game can be taken off the map', (await p.locator('.b-section[aria-label="On the map"] .b-game').count()) === 3);
  await p.getByText('↩ Reset this lesson to its default games').click();
  await p.getByText('Tap again to reset everything in this lesson').click();
  await p.waitForTimeout(400);
  check('reset brings back the 3 default games', (await p.locator('.b-section[aria-label="On the map"] .b-game').count()) === 3 && (await p.locator('.b-section[aria-label="Created games"] .b-game').count()) === 0);
  await other.reload();
  await other.waitForSelector('.game-card');
  check('students see the reset too', (await other.locator('.game-card').count()) === 3);

  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
