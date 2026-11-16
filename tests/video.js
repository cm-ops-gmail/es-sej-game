/* The quiz video maker: opens from a lesson and from a game, draws every scene, records a video file,
   and saves an HTML file that plays on its own.
   Usage: node tests/video.js <url> <output-dir>   (run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true })).newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/index.html?test=1#/admin`);
  await p.fill('#admin-pass', '1010');
  await p.click('#admin-login');
  await p.waitForTimeout(800);
  await p.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await p.waitForSelector('#lesson-video');
  check('every game on the map has a Video button', (await p.locator('.b-game .soft-btn', { hasText: 'Video' }).count()) === 3);
  check('the Slides and Handouts buttons are still there', (await p.locator('#lesson-slides').count()) === 1 && (await p.locator('#lesson-handouts').count()) === 1);

  await p.click('#lesson-video');
  await p.waitForFunction(() => !document.querySelector('#vd-play').disabled, null, { timeout: 15000 });
  check('the lesson video lists its games', (await p.locator('.vd-chip.on').count()) === 3);
  check('the video says how long it is', /\d+ questions · \d+:\d\d long/.test(await p.textContent('#vd-length')), await p.textContent('#vd-length'));
  const painted = await p.evaluate(() => { const c = document.querySelector('#vd-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4000) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`); return seen.size; });
  check('the first frame is drawn', painted > 20, painted);
  await p.locator('#vd-canvas').screenshot({ path: path.join(OUT, 'video-poster.png') });

  await p.click('#vd-play');
  await p.waitForTimeout(1200);
  await p.click('#vd-play');
  check('Play moves the video on', !/^0:00/.test(await p.textContent('#vd-time')), await p.textContent('#vd-time'));
  await p.evaluate(() => { const s = document.querySelector('#vd-seek'); s.value = '990'; s.dispatchEvent(new Event('input')); });
  await p.locator('#vd-canvas').screenshot({ path: path.join(OUT, 'video-end.png') });

  /* A short video: one game, three questions, four seconds each. */
  const chips = p.locator('.vd-chip');
  await chips.nth(1).click();
  await chips.nth(2).click();
  check('games can be left out', (await p.locator('.vd-chip.on').count()) === 1);
  await p.selectOption('#vd-per', '3');
  await p.selectOption('#vd-think', '4');
  check('options change the length', /^3 questions/.test(await p.textContent('#vd-length')), await p.textContent('#vd-length'));
  const rec = p.waitForEvent('download', { timeout: 120000 });
  await p.click('#vd-rec');
  check('options are locked while recording', await p.evaluate(() => document.querySelector('.vd-panel').classList.contains('vd-busy')));
  const video = await rec;
  const vf = path.join(OUT, video.suggestedFilename());
  await video.saveAs(vf);
  check('the recording downloads as a video file', /\.(mp4|webm)$/.test(vf) && fs.statSync(vf).size > 100000, `${vf} ${fs.statSync(vf).size}`);
  check('the file name has no odd characters', /^1\.1 Hey Thats Me - Quiz video\.(mp4|webm)$/.test(video.suggestedFilename()), video.suggestedFilename());

  const save = p.waitForEvent('download', { timeout: 60000 });
  await p.click('#vd-html');
  const page = await save;
  const hf = path.join(OUT, page.suggestedFilename());
  await page.saveAs(hf);
  const html = fs.readFileSync(hf, 'utf8');
  check('the HTML file has the heroes and fonts inside', /data:image\/webp;base64/.test(html) && /data:font\/woff2;base64|data:application\/octet-stream;base64/.test(html), String(html.length));
  check('the HTML file needs nothing from the site', !/src="(js|assets)\//.test(html) && !/url\((\.\.\/)?assets/.test(html));

  await p.click('#vd-close');
  await p.locator('.b-game .soft-btn', { hasText: 'Video' }).first().click();
  await p.waitForFunction(() => !document.querySelector('#vd-play').disabled, null, { timeout: 15000 });
  check('a single game makes its own video, with no game list', (await p.locator('.vd-chip').count()) === 0);
  await p.keyboard.press('Escape');
  check('Escape closes the video maker', (await p.locator('.vd-overlay').count()) === 0);

  /* The saved HTML file plays by itself. */
  const q = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  const qerr = [];
  q.on('pageerror', (e) => qerr.push(e.message));
  await q.goto('file://' + path.resolve(hf));
  await q.waitForFunction(() => document.querySelector('#status').textContent === '', null, { timeout: 15000 });
  await q.click('#play');
  await q.waitForTimeout(1500);
  await q.click('#play');
  check('the HTML file plays on its own', !/^0:00/.test(await q.textContent('#time')) && qerr.length === 0, `${await q.textContent('#time')} ${qerr.join(' | ')}`);
  await q.screenshot({ path: path.join(OUT, 'video-standalone.png') });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
