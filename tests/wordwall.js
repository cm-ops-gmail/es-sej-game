/* Reviewer feedback checks: the instructions card before a game (like a Wordwall start screen), the instruction
   staying on screen, and the admin switch that turns Class Battle on and off.
   Usage: node tests/wordwall.js <url> <output-dir>   (run tests/dev-server.js first, on a fresh start) */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };
const PLAYER = JSON.stringify({ name: 'Tester', hero: 'mathman', onboarded: true, sound: false, music: false, stars: {}, custom: {} });

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (w, h, player = true) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    if (player) await ctx.addInitScript((s) => { if (!localStorage.getItem('sej-hero-quest-v1')) localStorage.setItem('sej-hero-quest-v1', s); }, PLAYER);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    return p;
  };
  /* Plays the current game to the end by following its own target, like a child who knows the answers. */
  const playToEnd = (page) => page.evaluate(async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      if (document.querySelector('.results')) return true;
      const el = SEJ.current && SEJ.current.alive && SEJ.current.target();
      if (el && el.isConnected && !el.disabled) el.click();
      await new Promise((r) => setTimeout(r, 40));
    }
    return false;
  });

  /* 1. The instructions card comes first, in English and Bangla, and the game starts on Start. */
  const kid = await open(1280, 800);
  await kid.goto(`${BASE}/index.html?test=1&intro=1#/play/1.3/1`);
  await kid.waitForSelector('#game-intro');
  const introText = await kid.textContent('#game-intro');
  check('instructions card shows the game title', /Adventure Sentences/.test(introText), introText.slice(0, 80));
  check('instructions card shows the Bangla instruction', /এলোমেলো/.test(introText));
  check('the game waits behind the card', (await kid.$$('.chip')).length === 0);
  await kid.screenshot({ path: `${OUT}/feedback-intro.png` });
  await kid.click('#intro-start');
  await kid.waitForSelector('.chip');
  await kid.waitForSelector('#game-intro', { state: 'detached' });
  check('Start opens the game', (await kid.$$('.chip')).length > 2);
  check('the instruction stays on screen while playing', await kid.isVisible('#game-how'));
  check('the game plays to the end after Start', await playToEnd(kid));

  /* 2. On a short laptop window the instruction used to be hidden. It now stays. */
  const short = await open(1280, 600);
  await short.goto(`${BASE}/index.html?test=1#/play/1.1/1`);
  await short.waitForSelector('.game-screen');
  check('instruction visible on a 600px-tall screen', await short.isVisible('#game-how'));

  /* 3. The admin switch hides Class Battle from the lesson pages, and shows it again. */
  const admin = await open(1200, 850, false);
  await admin.goto(`${BASE}/index.html?test=1#/admin`);
  await admin.fill('#admin-pass', '1010'); await admin.click('#admin-login');
  await admin.waitForSelector('#set-class-battle');
  check('switch starts on', (await admin.getAttribute('#set-class-battle', 'aria-checked')) === 'true');
  await admin.click('#set-class-battle');
  await admin.waitForFunction(() => document.querySelector('#set-class-battle') && document.querySelector('#set-class-battle').getAttribute('aria-checked') === 'false');
  await admin.screenshot({ path: `${OUT}/feedback-admin-switch.png` });
  const student = await open(1280, 800);
  await student.goto(`${BASE}/index.html?test=1#/lesson/1.1`);
  await student.waitForSelector('.game-list');
  await student.waitForTimeout(600);
  check('Class Battle hidden from the lesson page when off', !(await student.$('#class-battle-link')));
  await student.goto(`${BASE}/index.html?test=1#/class/1.1`);
  await student.waitForTimeout(500);
  check('Class Battle page closed to students when off', /#\/lesson\/1\.1/.test(student.url()), student.url());
  await admin.click('#set-class-battle');
  await admin.waitForFunction(() => document.querySelector('#set-class-battle') && document.querySelector('#set-class-battle').getAttribute('aria-checked') === 'true');
  const again = await open(1280, 800);
  await again.goto(`${BASE}/index.html?test=1#/lesson/1.1`);
  await again.waitForSelector('#class-battle-link', { timeout: 5000 }).catch(() => {});
  check('Class Battle back on the lesson page when on', !!(await again.$('#class-battle-link')));

  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
  await b.close();
})();
