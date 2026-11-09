/* Plays every game in a real browser by following each game's own hint target, including
   wrong taps, and fails on any page error. Saves screenshots for review.
   Usage: node tests/playthrough.js <url> <screenshot-dir>   (needs the playwright package) */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8123';
const SHOTS = process.argv[3] || 'shots';
fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Tester', hero: 'mathman', sound: false, music: false, stars: {}, custom: {} }));
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) problems.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => problems.push('failed request: ' + r.url()));

  await page.goto(`${BASE}/index.html?test=1#/map`);
  const list = await page.evaluate(() => SEJ.lessons().map((l) => ({ code: l.code, keys: [...l.games.map((_, i) => String(i)), 'talk'], types: [...l.games.map((g) => g.t), 'talk'] })));
  let played = 0;
  const shotTaken = new Set();

  for (const l of list) {
    for (let k = 0; k < l.keys.length; k++) {
      const key = l.keys[k], t = l.types[k], name = `${l.code}/${key} (${t})`;
      await page.goto(`${BASE}/index.html?test=1#/play/${l.code}/${key}`);
      await page.reload();
      await page.waitForSelector('.game-screen', { timeout: 5000 });
      let finished = false, steps = 0, wrongTried = false;
      const t0 = Date.now();
      while (Date.now() - t0 < 40000) {
        if (await page.$('.results')) { finished = true; break; }
        if (!shotTaken.has(t) && steps === 2) {
          shotTaken.add(t);
          await page.screenshot({ path: `${SHOTS}/game-${t}.png` });
        }
        /* Tap one wrong answer per game to exercise the gentle-miss path. */
        if (!wrongTried && steps === 1) {
          wrongTried = true;
          await page.evaluate(() => {
            const good = SEJ.current.target();
            const sel = '.chip:not([disabled]),.tile:not([disabled]),.option:not([disabled]),.answer:not([disabled]),.balloon:not([disabled])';
            const wrong = [...document.querySelectorAll(sel)].find((b) => b !== good && good && b.textContent !== good.textContent);
            if (wrong) wrong.click();
          });
        }
        const acted = await page.evaluate(() => {
          if (!window.SEJ.current || !SEJ.current.alive) return false;
          const el = SEJ.current.target();
          if (el && el.isConnected && !el.disabled) { el.click(); return true; }
          return false;
        });
        if (acted) steps++;
        await page.waitForTimeout(acted ? 25 : 60);
      }
      if (!finished) problems.push(`${name}: did not finish within 40s`);
      else {
        played++;
        const ok = await page.$('#next-game');
        if (!ok) problems.push(`${name}: results had no next button`);
        const stars = await page.evaluate((a) => SEJ.store.starsFor(a.c, a.k), { c: l.code, k: key });
        if (stars < 1) problems.push(`${name}: no stars saved`);
      }
    }
  }
  console.log(`Played ${played} games to the end.`);
  if (problems.length) { console.error(`${problems.length} problem(s):\n- ` + problems.join('\n- ')); process.exitCode = 1; }
  else console.log('No errors.');
  await browser.close();
})();
