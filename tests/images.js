/* Pictures in games: paste or choose a picture in the editor, it is saved in the database and shown to every student.
   Usage: node tests/images.js <url> <output-dir>   (run tests/dev-server.js first) */
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
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  /* Two test pictures, drawn in the browser: a big photo-like one and a small one. */
  const makePng = (w, h, colour) => p.evaluate(([ww, hh, c]) => { const cv = document.createElement('canvas'); cv.width = ww; cv.height = hh; const g = cv.getContext('2d'); for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${(i * 37) % 360} 70% 60%)`; g.fillRect((i * 53) % ww, (i * 97) % hh, 90, 90); } g.fillStyle = c; g.beginPath(); g.arc(ww / 2, hh / 2, Math.min(ww, hh) / 3, 0, 7); g.fill(); return cv.toDataURL('image/png').split(',')[1]; }, [w, h, colour]);

  await p.goto(`${BASE}/index.html?test=1#/admin/1.1/new`);
  await p.fill('#admin-pass', '1010'); await p.click('#admin-login');
  await p.waitForSelector('.template-btn');
  await p.click('.template-btn[data-type="Image quiz"]');
  await p.waitForSelector('#pic-file');
  const big = path.join(OUT, 'big.png'), small = path.join(OUT, 'small.png');
  fs.writeFileSync(big, Buffer.from(await makePng(2400, 1600, '#d33'), 'base64'));
  fs.writeFileSync(small, Buffer.from(await makePng(300, 300, '#36c'), 'base64'));
  check('the test photo is large', fs.statSync(big).size > 100000, fs.statSync(big).size);

  /* choose a file */
  await p.setInputFiles('#pic-file', big);
  await p.waitForFunction(() => /img:[a-z0-9]{10}/.test(document.querySelector('.b-text').value), null, { timeout: 15000 });
  const code1 = (await p.inputValue('.b-text')).match(/img:[a-z0-9]{10}/)[0];
  check('choosing a picture puts a short code in the content', !!code1);
  check('the editor shows a thumbnail of the picture', (await p.locator('.b-pic img').count()) === 1);
  const res = await p.request.get(`${BASE}/api/image?id=${code1.slice(4)}`);
  const bytes = await res.body();
  check('the picture is served from the database, made small', res.status() === 200 && /image\/jpeg/.test(res.headers()['content-type']) && bytes.length > 2000 && bytes.length < 135000 && bytes[0] === 0xff && bytes[1] === 0xd8, `${res.status()} ${bytes.length}`);
  check('pictures are cached for a long time', /immutable/.test(res.headers()['cache-control']));

  /* paste a picture from the clipboard, as from a document */
  await p.fill('.b-text', `${code1} | Circle | Square; Star\n`);
  await p.focus('.b-text');
  await p.keyboard.press('Control+End');
  await p.evaluate(async (b64) => {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([arr], 'pasted.png', { type: 'image/png' }));
    const area = document.querySelector('.b-text');
    area.selectionStart = area.selectionEnd = area.value.length;
    area.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, fs.readFileSync(small).toString('base64'));
  await p.waitForFunction(() => (document.querySelector('.b-text').value.match(/img:[a-z0-9]{10}/g) || []).length === 2, null, { timeout: 15000 });
  check('pasting a picture adds a second code', (await p.locator('.b-pic img').count()) === 2);
  const code2 = (await p.inputValue('.b-text')).match(/img:[a-z0-9]{10}/g)[1];
  await p.fill('.b-text', `${code1} | Red ball | Blue ball; Green ball\n${code2} | Blue ball | Red ball; Green ball`);
  await p.fill('.b-input', 'Picture Quiz');
  check('content with pictures reads as a game', /Looks good: 2 items/.test(await p.textContent('.b-status')), await p.textContent('.b-status'));
  await p.screenshot({ path: `${OUT}/editor-pictures.png`, fullPage: true });
  await p.click('#save-test');
  await p.waitForSelector('.game-screen');
  await p.waitForSelector('.game-screen img.pic');
  const shown = await p.evaluate(() => new Promise((done) => { const img = document.querySelector('.game-screen img.pic'); const ok = () => done({ src: img.getAttribute('src'), w: img.naturalWidth }); if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = () => done({ src: img.getAttribute('src'), w: 0 }); } }));
  check('the game shows the picture', /^api\/image\?id=/.test(shown.src) && shown.w > 50, JSON.stringify(shown));
  await p.screenshot({ path: `${OUT}/game-picture.png` });

  /* a batch student, on another device, sees the same picture */
  const other = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  const made = await (await p.request.post(`${BASE}/api/batch`, { data: { side: 'create', pin: '1010', name: 'Test Batch' } })).json();
  await p.request.post(`${BASE}/api/batch`, { data: { side: 'join', code: made.batch.code, id: 'M1', name: 'Mim' } });
  await other.addInitScript((code) => localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ name: 'Mim', hero: 'bhasha', onboarded: true, sound: false, music: false, stars: {}, custom: {}, batch: { code, name: 'Test Batch', id: 'M1', open: ['1.1'], done: [] } })), made.batch.code);
  await other.goto(`${BASE}/index.html?test=1#/play/1.1/3`);
  await other.waitForSelector('.game-screen img.pic');
  check('a student on another device sees the picture too', await other.evaluate(() => new Promise((done) => { const img = document.querySelector('.game-screen img.pic'); if (img.complete) done(img.naturalWidth > 50); else { img.onload = () => done(true); img.onerror = () => done(false); } })));

  /* the handout prints the picture */
  await p.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await p.waitForSelector('.b-game');
  await p.locator('.b-section[aria-label="On the map"] .b-game', { hasText: 'Picture Quiz' }).getByText('Handouts').click();
  await p.waitForSelector('.ho-page');
  check('flashcards show the picture', (await p.locator('.ho-card .ho-pic').count()) === 2);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#ho-pdf')]);
  const pdf = path.join(OUT, 'picture-cards.pdf');
  await dl.saveAs(pdf);
  check('the PDF with pictures downloads', fs.statSync(pdf).size > 20000);

  /* safety */
  check('students can’t upload pictures', (await p.request.post(`${BASE}/api/image`, { data: { data: 'data:image/png;base64,AAAA' } })).status() === 401);
  check('only pictures are accepted', (await p.request.post(`${BASE}/api/image`, { data: { pin: '1010', data: 'data:text/html;base64,PHNjcmlwdD4=' } })).status() === 400);
  check('an unknown picture gives 404', (await p.request.get(`${BASE}/api/image?id=zzzzzzzzzz`)).status() === 404);

  if (errors.length) { failed += errors.length; console.error(errors.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
