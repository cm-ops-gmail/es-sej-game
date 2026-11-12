/* Auto-format: content pasted in many shapes must become a playable game of the chosen type, with no AI.
   Usage: node tests/autoformat.js <url> <output-dir>   (run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };

/* [type, messy paste, items expected, text that must be in the result] */
const CASES = [
  ['quiz', '1. What is the capital of Bangladesh?\na) Chittagong\nb) Dhaka\nc) Khulna\nAnswer: b\nExplanation: Dhaka is the capital.\n\n2. Which one is a fruit?\nA. Chair\n*B. Mango\nC. Pen', 2, 'What is the capital of Bangladesh? | Dhaka | Chittagong; Khulna >> Dhaka is the capital.'],
  ['quiz', 'Which is a fruit? a) Mango b) Chair c) Pen Answer: a\nWhich can fly? a) Fish b) Bird c) Cat Answer: b', 2, 'Which can fly? | Bird | Fish; Cat'],
  ['quiz', 'What do we sleep on? - A bed\nWhat do we write with? - A pencil\nWhat do we eat with? - A spoon', 3, 'What do we sleep on? | A bed |'],
  ['quiz', 'Which is a fruit?\tMango\tChair\tPen\nWhich can fly?\tBird\tFish\tCat', 2, 'Which is a fruit? | Mango | Chair; Pen'],
  ['quiz', 'Which is a fruit?\nMango ✓\nChair\nPen\n\nWhich can fly?\nFish\nBird (correct)\nCat', 2, 'Which can fly? | Bird | Fish; Cat'],
  ['boxes', 'Q1: Colour of the sky? Blue, Green, Red\nQ2: Colour of grass? Green, Blue, Pink', 2, 'Colour of the sky? | Blue | Green; Red'],
  ['maze', '• Which one is a fruit? | Mango | Chair | Pen | Shoe\n• Which one can fly? | Bird | Fish | Cat | Cow', 2, 'Mango | Chair; Pen; Shoe'],
  ['winlose', 'Which one is a vegetable: Carrot\nWhat colour is the sky: Blue\nWhat do bees make: Honey', 3, 'Carrot'],
  ['imagequiz', '🦁\tLion\tTiger\tCat\n🐘\tElephant\tHorse\tCow', 2, '🦁 | Lion | Tiger; Cat'],
  ['plane', 'Past tense of GO: went\nPast tense of EAT: ate\nPast tense of SEE: saw', 3, 'Past tense of GO | went | ate; saw'],
  ['plane', 'Past tense of GO | went | goes | going | gone\nPast tense of EAT | ate | eats | eating | eaten', 2, 'went | goes; going'],
  ['blank', '1) I ___ in the park. (play/plays/playing)\n2) She ___ rice. | eats | eat\n3) We [go] to school.\nHe is reading a book. | reading | read', 4, 'I {play} in the park. | plays; playing'],
  ['blank', 'I ____ a student.\nAnswer: am\nShe ____ my friend.\nAnswer: is\nThey ____ happy.\nAnswer: are', 3, 'She {is} my friend.'],
  ['match', 'Kitchen - We cook food here\nBedroom: We sleep here\n• Bathroom\tWe take a bath here', 3, 'Bedroom | We sleep here'],
  ['pairs', '1. Spoon = চামচ\n2. Fork = কাঁটাচামচ\n3. Knife = ছুরি', 3, 'Spoon | চামচ'],
  ['flash', 'Spoon – চামচ\nFork – কাঁটাচামচ\nKnife – ছুরি', 3, 'Fork | কাঁটাচামচ'],
  ['fliptiles', 'Spring\tবসন্ত\nSummer\tগ্রীষ্ম', 2, 'Spring | বসন্ত'],
  ['find', 'Breakfast - the first meal of the day\nDinner - the last meal of the day', 2, 'the first meal of the day | Breakfast'],
  ['type', 'What do we cut paper with? scissors\nWhat do we write with? pencil', 2, 'What do we cut paper with? | scissors'],
  ['fruit', 'Past tense of GO → went\nPast tense of EAT → ate', 2, 'Past tense of GO | went'],
  ['balloonpop', 'Spoon: We stir with it\nKnife: We cut with it\nPlate: We eat from it', 3, 'Spoon | We stir with it'],
  ['wordsearch', 'pencil, ruler, book, bag, eraser', 5, 'ruler'],
  ['crossword', 'A pet that says meow - cat\ntiger - A big striped cat\n3. rat: A small animal', 3, 'cat | A pet that says meow'],
  ['anagram', 'We write with it - pencil\neraser: It rubs out mistakes\nruler', 3, 'pencil | We write with it'],
  ['spell', 'pencil, eraser, ruler', 3, 'eraser'],
  ['hangman', '1. Pencil!\n2. Elephant - A big grey animal', 2, 'Elephant | A big grey animal'],
  ['sort', 'Fruits: mango, apple, banana\nVegetables: carrot, potato', 5, '# Fruits |'],
  ['sort', 'Polite\nThank you\nPlease\n\nImpolite\nGo away\nHurry up', 4, 'Go away | 2'],
  ['speedsort', 'Football | Group\nReading | Solo\nCricket | Group', 3, 'Reading | 2'],
  ['tf', '1. Red means stop. (True)\n2. The sun is cold - False\nCats can fly | F', 3, 'The sun is cold | no'],
  ['whack', 'Tap the polite words!\nCorrect: Thank you, Please, Sorry\nWrong: Go away, Hurry up', 3, '- Go away'],
  ['whack', '✓ Thank you\n✓ Please\n✗ Go away', 2, '+ Please'],
  ['pair', 'Rice + Curry\nBread and Butter = yes\nRice | Syrup | no', 3, 'Bread | Butter | yes'],
  ['unjumble', '1. I study at school. I am ten years old.\n2. I live in Dhaka.', 3, 'I am ten years old.'],
  ['magnets', '- The cat is small.\n- The dog is big.', 2, 'The dog is big.'],
  ['rank', '1. Wake up\n2. Brush my teeth\n3. Eat breakfast', 3, 'Brush my teeth'],
  ['rank', 'Wake up → Brush my teeth → Eat breakfast → Go to school', 4, 'Go to school'],
  ['wheel', 'Name a fruit, Say a colour, Name an animal, Say a number', 4, 'Say a colour'],
  ['speakcards', '1) Talk about your favourite food.\n2) Describe your best friend.', 2, 'Describe your best friend.'],
  ['memorize', 'Apple, Ball, Cat, Dog, Egg, Fish', 6, 'Egg'],
  ['labelled', '🏠\nRoof, Window, Door', 3, '# 🏠'],
  ['maths', 'addition and subtraction, numbers 1 to 20, 10 questions', 10, '# numbers: 1 20'],
  ['talk', 'What is your name? My name is Robin.\nWhere do you live? I live in Dhaka.', 2, 'What is your name? | My name is ___. | My name is Robin.'],
];

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/index.html?test=1#/admin/1.1`);
  await p.waitForSelector('.pin-card');
  for (const d of '1010') await p.click(`.pin-key[data-key="${d}"]`);
  await p.waitForSelector('#create-game');

  const covered = new Set(CASES.map((c) => c[0]));
  check('every game type has a messy-paste case', await p.evaluate((list) => SEJ.CATALOG.every(([, l]) => l.every(([, t]) => list.includes(t))), [...covered]), await p.evaluate((list) => SEJ.CATALOG.flatMap(([, l]) => l.map(([, t]) => t)).filter((t) => !list.includes(t)).join(), [...covered]));
  for (const [t, text, count, must] of CASES) {
    const r = await p.evaluate(([tt, raw]) => {
      const out = SEJ.autoFormat(tt, raw);
      try { const g = SEJ.parseGame(tt, 'T', out.text, {}); return { text: out.text, count: SEJ.itemCount(g), again: SEJ.autoFormat(tt, out.text).text === out.text || (() => { try { SEJ.parseGame(tt, 'T', SEJ.autoFormat(tt, out.text).text, {}); return true; } catch (e) { return false; } })() }; } catch (e) { return { text: out.text, error: e.message }; }
    }, [t, text]);
    check(`${t}: messy paste becomes a playable game`, !r.error && r.count === count && r.text.includes(must) && r.again, `\n${JSON.stringify(r)}`);
  }
  /* The examples already in the right format must come through untouched in meaning. */
  const samples = await p.evaluate(() => Object.keys(SEJ.formats).map((t) => { let a; try { a = SEJ.parseGame(t, 'T', SEJ.formats[t].sample, {}); } catch (e) { return ''; } try { const b2 = SEJ.parseGame(t, 'T', SEJ.autoFormat(t, SEJ.formats[t].sample).text, {}); return JSON.stringify(a) === JSON.stringify(b2) ? '' : t; } catch (e) { return `${t}: ${e.message}`; } }).filter(Boolean));
  check('well-formed content is not changed by auto-format', samples.length === 0, samples.join(' | '));

  /* In the editor: paste, see it arranged, undo, save and play. */
  await p.click('#create-game');
  await p.click('.template-btn[data-type="Quiz"]');
  await p.waitForSelector('#auto-format');
  check('there is no AI button any more', !(await p.$('#fix-ai')) && !/AI/.test(await p.textContent('#auto-format')));
  const messy = '1. What do we sleep on?\na) A table\nb) A bed\nc) A sink\nAnswer: b\n\n2. What do we write with?\na) A pencil\nb) A spoon\nAnswer: a';
  await p.evaluate((t) => navigator.clipboard.writeText(t), messy);
  await p.click('.b-text');
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  await p.waitForFunction(() => /\| A bed \|/.test(document.querySelector('.b-text').value), null, { timeout: 5000 }).catch(() => {});
  check('pasting messy content arranges it by itself', /What do we sleep on\? \| A bed \| A table; A sink/.test(await p.inputValue('.b-text')), await p.inputValue('.b-text'));
  check('the editor says it looks good', /Looks good: 2 items/.test(await p.textContent('.b-status')));
  await p.screenshot({ path: `${OUT}/auto-format.png`, fullPage: true });
  await p.getByText('↩ Undo auto-format').click();
  check('undo brings back what was pasted', (await p.inputValue('.b-text')).trim() === messy);
  await p.click('#auto-format');
  check('the button arranges it again', /\| A pencil \| A spoon/.test(await p.inputValue('.b-text')));
  /* Typed (not pasted) messy content is arranged when saving. */
  await p.fill('.b-text', 'What do we sleep on? - A bed\nWhat do we write with? - A pencil\nWhat do we eat with? - A spoon');
  await p.fill('.b-input', 'Auto Quiz');
  await p.click('#save-test');
  await p.waitForSelector('.game-screen');
  check('saving arranges the content and the game plays', /Auto Quiz/.test(await p.textContent('.game-title h1')));
  for (let i = 0; i < 300 && !(await p.$('.results')); i++) { await p.evaluate(() => { if (SEJ.current && SEJ.current.alive) { const el = SEJ.current.target(); if (el && el.isConnected && !el.disabled) el.click(); } }); await p.waitForTimeout(30); }
  check('the arranged game can be finished', !!(await p.$('.results')));
  check('the format endpoint is gone', (await p.request.post(`${BASE}/api/format`, { data: {} })).status() === 404);

  if (errors.length) { failed += errors.length; console.error(errors.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
