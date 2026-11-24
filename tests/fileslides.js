/* "File to slides" in the admin: a Word (.docx) or PowerPoint (.pptx) file becomes slides in the SEJ template.
   Usage: node tests/fileslides.js <url> <output-dir> [real.pptx] [real.docx]   (run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
const REAL_PPTX = process.argv[4], REAL_DOCX = process.argv[5];
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 850 }, acceptDownloads: true });
  const admin = await ctx.newPage();
  const errors = [];
  admin.on('pageerror', (e) => errors.push(e.message));
  await admin.goto(`${BASE}/index.html?test=1#/admin`);
  await admin.fill('#admin-pass', '1010'); await admin.click('#admin-login');
  await admin.waitForSelector('#set-class-battle');
  await admin.goto(`${BASE}/index.html?test=1#/admin/1.3`);
  await admin.waitForSelector('#docx-file', { state: 'attached' });

  /* The button is named for any file and takes both kinds. */
  const label = await admin.evaluate(() => document.querySelector('#docx-file').closest('label').textContent.trim());
  const accept = await admin.getAttribute('#docx-file', 'accept');
  check('the button says File to slides', /File to slides/.test(label), label);
  check('it accepts Word files', /\.docx/.test(accept), accept);
  check('it accepts PowerPoint files', /\.pptx/.test(accept), accept);

  /* A small PowerPoint made here: a title slide, points, a question with options, and a table. */
  const sample = path.join(OUT, 'sample-in.pptx');
  const bytes = await admin.evaluate(async () => {
    await SEJ.slides.count(() => {});
    const p = new window.PptxGenJS();
    let s = p.addSlide(); s.addText('My Animals Lesson', { x: 1, y: 1, w: 8, h: 1, placeholder: 'title' });
    s = p.addSlide(); s.addText('Animals we know', { x: 0.5, y: 0.3, w: 9, h: 0.8 }); s.addText([{ text: 'A cat says meow', options: { breakLine: true } }, { text: 'A dog says woof' }], { x: 0.5, y: 1.5, w: 9, h: 2 });
    s = p.addSlide(); s.addText('Which animal can fly?', { x: 0.5, y: 1, w: 9, h: 0.8 });
    s.addText([{ text: 'A) Bird', options: { breakLine: true } }, { text: 'B) Fish', options: { breakLine: true } }, { text: 'C) Cow' }], { x: 0.5, y: 2, w: 9, h: 2 });
    s.addText('Answer: Bird', { x: 0.5, y: 4.5, w: 9, h: 0.6 });
    s = p.addSlide(); s.addTable([[{ text: 'Animal' }, { text: 'Sound' }], [{ text: 'Cat' }, { text: 'Meow' }], [{ text: 'Cow' }, { text: 'Moo' }]], { x: 0.5, y: 1, w: 8 });
    const buf = await p.write({ outputType: 'arraybuffer' });
    return Array.from(new Uint8Array(buf));
  });
  fs.writeFileSync(sample, Buffer.from(bytes));
  const blocks = await admin.evaluate(async (data) => SEJ.slides.readPptx(new File([new Uint8Array(data)], 'sample.pptx')), bytes);
  const texts = blocks.map((x) => x.text || '').join(' | ');
  check('PowerPoint text is read', /cat says meow/.test(texts) && /dog says woof/.test(texts), texts);
  check('slides are read in order', texts.indexOf('meow') < texts.indexOf('fly?'), texts);
  check('a question is found', blocks.some((x) => x.text === 'Which animal can fly?'), texts);
  check('the answer line is kept', blocks.some((x) => x.text === 'Answer: Bird'), texts);
  check('a table stays a table', blocks.some((x) => x.kind === 'table' && x.rows.length === 3 && x.rows[1][1] === 'Meow'), JSON.stringify(blocks.filter((x) => x.kind === 'table')));

  const make = async (file, name) => {
    const [dl] = await Promise.all([admin.waitForEvent('download', { timeout: 40000 }), admin.setInputFiles('#docx-file', file)]);
    const out = path.join(OUT, name);
    await dl.saveAs(out);
    return { out, size: fs.statSync(out).size, pk: fs.readFileSync(out).slice(0, 2).toString() === 'PK', suggested: dl.suggestedFilename() };
  };
  const fromSample = await make(sample, 'from-pptx.pptx');
  check('a PowerPoint file becomes template slides', fromSample.size > 20000 && fromSample.pk, fromSample.size);
  check('the new deck keeps the file name', fromSample.suggested === 'sample-in.pptx', fromSample.suggested);
  /* The new deck is the SEJ template: its slides use the template background and the 10MS logo. */
  const made = await admin.evaluate(async (data) => {
    const zip = await window.JSZip.loadAsync(new Uint8Array(data));
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    const media = Object.keys(zip.files).filter((f) => f.startsWith('ppt/media/'));
    const all = (await Promise.all(slides.map((f) => zip.file(f).async('string')))).join(' ');
    return { slides: slides.length, media: media.length, hasQ: all.includes('Which animal can fly?'), hasOpt: all.includes('Bird'), hasMeow: all.includes('Meow') };
  }, Array.from(fs.readFileSync(fromSample.out)));
  check('template deck has a cover, content and closing slides', made.slides >= 6, made.slides);
  check('template pictures are inside', made.media >= 3, made.media);
  check('the question and answer reach the slides', made.hasQ && made.hasOpt, JSON.stringify(made));
  check('the table reaches the slides', made.hasMeow);

  if (REAL_PPTX && fs.existsSync(REAL_PPTX)) {
    const r = await make(REAL_PPTX, 'from-real-pptx.pptx');
    check('a real PowerPoint deck becomes slides', r.size > 20000 && r.pk, r.size);
    console.log(`real pptx -> ${r.suggested} (${Math.round(r.size / 1024)} KB)`);
  }
  if (REAL_DOCX && fs.existsSync(REAL_DOCX)) {
    const r = await make(REAL_DOCX, 'from-real-docx.pptx');
    check('a Word file still becomes slides', r.size > 20000 && r.pk, r.size);
    console.log(`real docx -> ${r.suggested} (${Math.round(r.size / 1024)} KB)`);
  }
  /* Another kind of file gets a friendly message, not a crash. */
  const txt = path.join(OUT, 'notes.txt');
  fs.writeFileSync(txt, 'hello');
  await admin.setInputFiles('#docx-file', txt);
  await admin.waitForSelector('.toast-bad', { timeout: 8000 }).catch(() => {});
  const toast = await admin.evaluate(() => Array.from(document.querySelectorAll('.toast-bad')).map((t) => t.textContent).join(' '));
  check('a wrong file type gets a clear message', /\.docx|\.pptx|Word|PowerPoint/.test(toast), toast);

  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
  await b.close();
})();
