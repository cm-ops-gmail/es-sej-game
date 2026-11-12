/* Handouts: flashcards, quick tips and a practice sheet, previewed and saved as PDF.
   Usage: node tests/handouts.js <url> <output-dir>   (run tests/dev-server.js first) */
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
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true })).newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/index.html?test=1#/admin/1.3`);
  await p.waitForSelector('.pin-card');
  for (const d of '1010') await p.click(`.pin-key[data-key="${d}"]`);
  await p.waitForSelector('#lesson-handouts');
  await p.click('#lesson-handouts');
  await p.waitForSelector('.ho-page');
  await p.waitForTimeout(400);

  const pdf = async (name) => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), p.click('#ho-pdf')]);
    const file = path.join(OUT, name);
    await dl.saveAs(file);
    return { file, size: fs.statSync(file).size, head: fs.readFileSync(file).slice(0, 5).toString(), pages: (fs.readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length };
  };
  const overflow = () => p.evaluate(() => [...document.querySelectorAll('.ho-body')].filter((x) => x.scrollHeight > x.clientHeight + 1).length);
  const pages = () => p.locator('.ho-page').count();

  /* flashcards */
  check('flashcards open first, with cards', (await p.locator('.ho-card').count()) >= 8);
  check('each flashcard page holds at most 8 cards', await p.evaluate(() => [...document.querySelectorAll('.ho-grid')].every((g) => g.children.length <= 8)));
  check('the power words are cards too', /Power word/.test(await p.textContent('.ho-pages')));
  check('no flashcard page overflows', (await overflow()) === 0);
  check('the options row has no stray text', !/null|undefined/.test(await p.textContent('.ho-options')));
  await p.screenshot({ path: `${OUT}/handout-cards.png` });
  const n1 = await pages();
  const f1 = await pdf('flashcards.pdf');
  check('flashcards download as a PDF', f1.head === '%PDF-' && f1.size > 30000, JSON.stringify(f1));
  check('the PDF has one page per preview page', f1.pages === n1, `${f1.pages} vs ${n1}`);
  await p.check('#ho-two');
  check('two-sided cards add a back page for each front page', (await pages()) === n1 * 2 && (await p.locator('.ho-card.is-back').count()) > 0);
  check('two-sided fronts hide the answer', (await p.locator('.ho-card-answer').count()) === 0);
  const mirrored = await p.evaluate(() => { const g = document.querySelector('.ho-mirror'); const a = g.children[0].getBoundingClientRect(), c = g.children[1].getBoundingClientRect(); return a.left > c.left; });
  check('back pages are mirrored for two-sided printing', mirrored);
  await p.uncheck('#ho-two');

  /* quick tips */
  await p.click('.ho-tab[data-kind="tips"]');
  await p.waitForSelector('.ho-mission');
  check('quick tips show the goal, power words and speaking lines', (await p.locator('.ho-word').count()) >= 3 && (await p.locator('.ho-talk').count()) >= 1 && (await p.locator('.ho-fact').count()) >= 3);
  check('no tips page overflows', (await overflow()) === 0);
  check('pages are numbered', /^1 \/ \d+$/.test(await p.textContent('.ho-num')));
  await p.screenshot({ path: `${OUT}/handout-tips.png` });
  const f2 = await pdf('quick-tips.pdf');
  check('quick tips download as a PDF', f2.head === '%PDF-' && f2.pages === (await pages()), JSON.stringify(f2));

  /* practice sheet */
  await p.click('.ho-tab[data-kind="sheet"]');
  await p.waitForSelector('.ho-q');
  const qs = await p.locator('.ho-q').count();
  check('practice sheet has numbered questions and a name line', qs >= 8 && /Name:/.test(await p.textContent('.ho-who')));
  check('the answer key has an answer for each question', (await p.locator('.ho-keys p').count()) === qs);
  check('the answer key starts on its own page', await p.evaluate(() => { const k = document.querySelector('.ho-keys').closest('.ho-page'); return !k.querySelector('.ho-q'); }));
  check('no practice page overflows', (await overflow()) === 0);
  await p.uncheck('#ho-key');
  check('the answer key can be left out', (await p.locator('.ho-keys').count()) === 0);
  await p.check('#ho-key');
  const f3 = await pdf('practice-sheet.pdf');
  check('practice sheet downloads as a PDF', f3.head === '%PDF-' && f3.pages === (await pages()), JSON.stringify(f3));

  /* the teacher's own content */
  await p.check('#ho-own-on');
  await p.fill('#ho-own', 'Mango | আম\nWhich one can fly? | Bird | Fish | Cat >> Birds have wings.\nAlways say please.');
  await p.click('#ho-make');
  check('pasted lines become practice questions', (await p.locator('.ho-q').count()) === 2 && (await p.locator('.ho-opts').count()) === 1);
  await p.click('.ho-tab[data-kind="tips"]');
  check('pasted tips appear on the tips page', (await p.locator('.ho-tip').count()) === 2 && /Birds have wings/.test(await p.textContent('.ho-pages')));
  await p.click('.ho-tab[data-kind="cards"]');
  check('pasted lines become flashcards, Bangla included', (await p.locator('.ho-card').count()) === 2 && /আম/.test(await p.textContent('.ho-pages')));
  const f4 = await pdf('own-cards.pdf');
  check('own content downloads as a PDF', f4.head === '%PDF-' && f4.pages === 1, JSON.stringify(f4));
  await p.click('#ho-close');
  check('the handout maker closes', (await p.locator('.ho-overlay').count()) === 0);

  /* one game's handout */
  await p.locator('.b-game .soft-btn', { hasText: 'Handouts' }).first().click();
  await p.waitForSelector('.ho-page');
  check('a single game has its own handout', (await p.locator('.ho-card').count()) >= 3 && !/Power word/.test(await p.textContent('.ho-pages')));
  await p.keyboard.press('Escape');

  /* phone width: the preview shrinks to fit */
  await p.setViewportSize({ width: 390, height: 780 });
  await p.click('#lesson-handouts');
  await p.waitForSelector('.ho-page');
  await p.waitForTimeout(200);
  check('the preview fits a phone screen', await p.evaluate(() => document.querySelector('.ho-fit').getBoundingClientRect().width <= 390 && document.documentElement.scrollWidth <= 390));
  await p.screenshot({ path: `${OUT}/handout-phone.png` });

  if (errors.length) { failed += errors.length; console.error(errors.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
