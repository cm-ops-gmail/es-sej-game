/* Class Battle check: real TV page and real phone page, joined by the real relay code.
   Usage: node tests/classroom.js <url> <screenshot-dir>   (needs playwright; run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8124';
const SHOTS = process.argv[3] || 'shots';
fs.mkdirSync(SHOTS, { recursive: true });
let failed = 0, passed = 0;
const check = (name, ok, extra = '') => {
  if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); }
};

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const watch = (page, label) => {
    page.on('pageerror', (e) => problems.push(`${label} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|503|Failed to load resource/.test(m.text())) problems.push(`${label} console: ${m.text()}`); });
  };
  const tvCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
  /* Muted, like tests/playthrough.js: this test reloads the TV page dozens of times. */
  await tvCtx.addInitScript(() => {
    if (!localStorage.getItem('sej-hero-quest-v1')) localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ onboarded: true, sound: false, music: false, stars: {}, custom: {} }));
  });
  const tv = await tvCtx.newPage();
  const phone = await phoneCtx.newPage();
  watch(tv, 'tv'); watch(phone, 'phone');

  /* 1. Every lesson has a sound plan. */
  await tv.goto(`${BASE}/index.html?test=1#/map`);
  const plans = await tv.evaluate(() => SEJ.lessonsRaw().map((l) => ({ code: l.code, kinds: [], plan: SEJ.classPlan(l.code, 12345) })));
  check('24 lessons', plans.length === 24, plans.length);
  const seen = {};
  for (const { code, plan } of plans) {
    check(`${code} has Team Battle and Speak`, plan.stages.length >= 2 && plan.stages.some((x) => x.round === 'Team Battle') && plan.stages.some((x) => x.round === 'Speak'), plan.stages.length);
    check(`${code} has no Read and Say`, !plan.stages.some((x) => x.kind === 'read'));
    for (const st of plan.stages) {
      seen[st.kind] = (seen[st.kind] || 0) + 1;
      check(`${code} ${st.kind} has items`, st.items.length >= (st.kind === 'memory' ? 1 : 2), st.items.length);
      for (const it of st.items) {
        if (st.kind === 'quiz') {
          check(`${code} quiz answer listed`, it.options.includes(it.answer), JSON.stringify(it));
          check(`${code} quiz has choices`, it.options.length >= 2, JSON.stringify(it));
          check(`${code} quiz options differ`, new Set(it.options).size === it.options.length, JSON.stringify(it));
          check(`${code} text has no object`, !/\[object|undefined/.test(JSON.stringify(it)), JSON.stringify(it));
        }
        if (st.kind === 'sort') check(`${code} sort group`, !!st.groups[it.group], JSON.stringify(it));
        if (st.kind === 'order') check(`${code} tiles match`, it.tiles.slice().sort().join() === it.parts.slice().sort().join(), JSON.stringify(it));
        if (st.kind === 'flash') check(`${code} flash`, it.en && it.bn, JSON.stringify(it));
        if (['listen', 'letters'].includes(st.kind)) check(`${code} ${st.kind} answer listed`, it.options.includes(it.en) && new Set(it.options).size === it.options.length, JSON.stringify(it));
        if (st.kind === 'letters') check(`${code} letters pattern`, it.pattern.length === it.en.length && it.pattern.some((c) => !c) && !!it.pattern[0], JSON.stringify(it));
        if (st.kind === 'tf') check(`${code} true/false`, ['True', 'False'].includes(it.answer) && (it.answer === 'True') === (it.claim === it.right), JSON.stringify(it));
        if (['riddle', 'complete', 'matchup'].includes(st.kind)) check(`${code} ${st.kind} answer listed`, it.options.includes(it.answer) && new Set(it.options).size === it.options.length && it.options.length >= 2, JSON.stringify(it));
        if (st.kind === 'complete') check(`${code} complete has a gap`, typeof it.before === 'string' && typeof it.after === 'string' && !!it.answer, JSON.stringify(it));
        if (st.kind === 'cards') check(`${code} speak`, it.q && it.frame && it.sample, JSON.stringify(it));
        if (st.kind === 'memory') check(`${code} memory`, it.cards.length === it.pairs.length * 2 && it.pairs.length >= 4, JSON.stringify(it).slice(0, 200));
        if (['wheel', 'boxes', 'role'].includes(st.kind)) check(`${code} speak`, it.q && it.frame && it.sample, JSON.stringify(it));
      }
    }
  }
  console.log('Round types across lessons:', JSON.stringify(seen));
  for (const k of ['flash', 'listen', 'memory', 'letters', 'matchup', 'quiz', 'riddle', 'sort', 'complete', 'order', 'tf', 'wheel', 'boxes', 'role', 'cards']) check(`${k} is used`, seen[k] > 0);

  /* 2. Every lesson plays from lobby to podium on the TV by itself. */
  for (const { code } of plans) {
    await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
    await tv.goto(`${BASE}/index.html?test=1#/class/${code}`);
    await tv.reload();
    await tv.waitForSelector('.cl-lobby');
    await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'start' }));
    let guard = 0;
    while (guard++ < 120 && !(await tv.$('.cl-podium'))) {
      await tv.evaluate(() => {
        const d = SEJ.classDebug;
        if (d.state.spinning) return;
        if (!d.state.teams[1].score) d.dispatch({ type: 'score', team: 1, delta: 1 });
        d.primary();
      });
      await tv.waitForTimeout(30);
    }
    console.log(`${code}: ${guard} steps`);
    check(`${code} reaches the podium`, !!(await tv.$('.cl-podium')), `after ${guard}`);
    const overflow = await tv.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1);
    check(`${code} no page scroll`, !overflow);
  }

  /* 3. The phone runs the TV, on a lesson that starts with Word Flash. */
  const flashLesson = plans.find((p) => p.plan.stages[0].kind === 'flash').code;
  await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
  await tv.goto(`${BASE}/?class=${flashLesson}&test=1`);
  await tv.reload();
  await tv.waitForSelector('.cl-lobby');
  check('short link opens the lobby', tv.url().includes(`#/class/${flashLesson}`), tv.url());
  await tv.screenshot({ path: `${SHOTS}/tv-lobby.png` });
  const code = await tv.evaluate(() => SEJ.classDebug.state.code);
  const qrUrl = `${BASE}/?remote=${code}&test=1`;
  await phone.goto(qrUrl);
  /* The teacher PIN: no controls and no game data without it. */
  await phone.waitForSelector('.pin-card', { timeout: 8000 });
  check('phone asks for the PIN first', !(await phone.$('#rm-primary')));
  const tvApi = tvCtx.request;
  check('state refused without PIN', (await tvApi.get(`${BASE}/api/room?code=${code}&side=phone`)).status() === 401);
  check('state refused with wrong PIN', (await tvApi.get(`${BASE}/api/room?code=${code}&side=phone`, { headers: { 'x-teacher-pin': '0000' } })).status() === 401);
  check('commands refused without PIN', (await tvApi.post(`${BASE}/api/room`, { data: { code, side: 'phone', client: 'x', cmds: [{ seq: 1, type: 'start' }] } })).status() === 401);
  const typePin = async (p, pin) => { for (const d of pin) await p.locator(`.pin-key[data-key="${d}"]`).click(); };
  await typePin(phone, '1234');
  await phone.waitForFunction(() => /Wrong PIN/.test(document.querySelector('.pin-msg').textContent), null, { timeout: 8000 });
  check('wrong PIN keeps the phone out', !(await phone.$('#rm-primary')));
  await tv.waitForTimeout(800);
  check('TV ignores a phone without the PIN', await tv.evaluate(() => SEJ.classDebug.state.phone === false && SEJ.classDebug.state.screen === 'lobby'));
  check('PIN is not in the page code', !(await (await tvApi.get(`${BASE}/js/remote.js`)).text()).includes('1010') && !(await (await tvApi.get(`${BASE}/js/classroom.js`)).text()).includes('1010'));
  await phone.screenshot({ path: `${SHOTS}/phone-pin.png` });
  await typePin(phone, '1010');
  await phone.waitForSelector('#rm-primary', { timeout: 8000 });
  check('phone link opens remote', /#\/remote\//.test(phone.url()), phone.url());
  await tv.waitForFunction(() => SEJ.classDebug.state.phone === true, null, { timeout: 8000 });
  check('TV knows phone joined', true);
  await phone.waitForFunction(() => document.querySelector('.rm-status.on'), null, { timeout: 8000 });
  await phone.screenshot({ path: `${SHOTS}/phone-lobby.png`, fullPage: true });

  const tvState = () => tv.evaluate(() => { const s = SEJ.classDebug.state; return { screen: s.screen, stage: s.stage, item: s.item, revealed: s.revealed, teams: s.teams.map((t) => t.score), left: s.timer.left, running: s.timer.running, mode: s.mode, picked: s.picked, roster: s.roster, used: s.used, spinning: s.spinning, hidden: s.hidden }; });
  const waitTv = (fn, arg) => tv.waitForFunction(fn, arg, { timeout: 8000 });
  const primary = () => phone.click('#rm-primary:not([disabled])', { timeout: 8000 });

  await primary();
  await waitTv(() => SEJ.classDebug.state.screen === 'stage');
  await tv.screenshot({ path: `${SHOTS}/tv-flash.png` });
  await phone.waitForFunction(() => /Reveal/.test(document.querySelector('#rm-primary').textContent), null, { timeout: 8000 });
  const answerOnPhone = await phone.textContent('.rm-answer b');
  const answerOnTv = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[0].items[0].en);
  check('phone shows the teacher the answer', answerOnPhone === answerOnTv, `${answerOnPhone} / ${answerOnTv}`);
  /* The TV shows the same options as student phones, with nothing marked until the reveal. */
  check('TV shows answer options in Word Flash', (await tv.locator('.cl-option').count()) >= 2);
  check('answer is not marked before reveal', !(await tv.$('#cl-answer')));
  await primary();
  await waitTv(() => SEJ.classDebug.state.revealed === true);
  await tv.waitForTimeout(100);
  check('reveal marks the answer on the TV', (await tv.textContent('#cl-answer')).includes(answerOnTv));
  await tv.screenshot({ path: `${SHOTS}/tv-flash-open.png` });

  /* Scores: teams show on TV; phone shows the number before the TV replies. */
  const plus = phone.locator('.rm-plus');
  await plus.nth(2).click();
  check('phone score moves at once', (await phone.locator('.rm-num').nth(2).textContent()) === '1');
  await waitTv(() => SEJ.classDebug.state.teams[2].score === 1);
  check('TV team score', (await tv.textContent('#cl-team-2 .cl-score')) === '1');
  check('leader crown on TV', await tv.$eval('#cl-team-2', (e) => e.classList.contains('leading')));
  await phone.locator('.rm-minus').nth(2).click();
  await waitTv(() => SEJ.classDebug.state.teams[2].score === 0);

  /* A double tap moves one step only. */
  const before = await tvState();
  await phone.waitForFunction(() => /Next|round/i.test(document.querySelector('#rm-primary').textContent), null, { timeout: 8000 });
  await phone.evaluate(() => { const b = document.querySelector('#rm-primary'); b.click(); b.click(); });
  await waitTv((i) => SEJ.classDebug.state.item === i, before.item + 1);
  await tv.waitForTimeout(1500);
  check('double tap moves once', (await tvState()).item === before.item + 1);

  /* Team count, class mode, names, roster and picks. */
  await phone.click('#rm-more');
  await phone.getByRole('button', { name: '3', exact: true }).click();
  await waitTv(() => SEJ.classDebug.state.teams.length === 3);
  check('TV shows 3 teams', (await tv.locator('.cl-team').count()) === 3);
  await phone.waitForFunction(() => document.querySelectorAll('.rm-plus').length === 3, null, { timeout: 8000 });
  await phone.getByRole('button', { name: 'Change team names' }).click();
  await phone.locator('.rm-names input').first().fill('Tigers');
  await phone.getByRole('button', { name: 'Save' }).click();
  await waitTv(() => SEJ.classDebug.state.teams[0].name === 'Tigers');
  check('rename shows on TV', (await tv.textContent('#cl-team-0 .cl-team-name')) === 'Tigers');
  await phone.getByRole('button', { name: /^Names/ }).click();
  await phone.locator('.rm-area').fill('Rafi\nMim\n<img src=x onerror=alert(1)>\nRafi');
  await phone.getByRole('button', { name: 'Save' }).click();
  await waitTv(() => SEJ.classDebug.state.roster.length === 3);
  const roster = (await tvState()).roster;
  check('roster cleaned and de-duplicated', roster.includes('Rafi') && roster.every((n) => !/[<>=]/.test(n)), JSON.stringify(roster));
  await phone.waitForSelector('#rm-pick-student:not([disabled])', { timeout: 8000 });
  await phone.click('#rm-pick-student');
  await waitTv(() => !!SEJ.classDebug.state.picked);
  check('random student picked', roster.includes((await tvState()).picked.name));
  check('phone offers Try a different game', !!(await phone.$('#rm-change')));
  check('phone offers battle styles', (await phone.locator('.rm-style').count()) === 4);
  await phone.click('#rm-more-close');
  /* Reactions: on the main phone screen, reaching the TV, and the phone says when the TV has no sound yet. */
  for (const kind of ['clap', 'fanfare', 'wow', 'oops']) check(`${kind} reaction on phone`, !!(await phone.$(`.rm-reaction[data-reaction="${kind}"]`)));
  check('TV has no Controls button', !(await tv.$('#cl-controls')));
  await tv.evaluate(() => { window.__cheer = 0; const pow = SEJ.fx.pow; SEJ.fx.pow = function (t, k) { window.__cheer++; window.__said = t; return pow.call(this, t, k); }; });
  await phone.locator('.rm-reaction[data-reaction="wow"]').click();
  await tv.waitForFunction(() => window.__said === 'WOW!', null, { timeout: 8000 });
  check('Wow reaches the TV', true);
  await phone.click('#rm-more');

  /* Battle round with timer on the TV. */
  await phone.getByRole('button', { name: 'Team Battle' }).click();
  await waitTv(() => SEJ.classDebug.state.stage === 1);
  await phone.waitForSelector('#rm-timer', { timeout: 8000 });
  const battleKind = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[SEJ.classDebug.round('Team Battle')].kind);
  await tv.waitForTimeout(150);
  await tv.screenshot({ path: `${SHOTS}/tv-battle-${battleKind}.png` });
  await phone.screenshot({ path: `${SHOTS}/phone-battle.png`, fullPage: true });
  await phone.click('#rm-timer');
  await waitTv(() => SEJ.classDebug.state.timer.running);
  const t0 = (await tvState()).left;
  await tv.waitForTimeout(1200);
  check('timer counts down', (await tvState()).left < t0);
  await phone.waitForFunction(() => /Pause/.test(document.querySelector('#rm-timer').getAttribute('aria-label')), null, { timeout: 8000 });
  await phone.click('#rm-timer');
  await waitTv(() => !SEJ.classDebug.state.timer.running);

  /* The speaking round, then the podium. */
  await phone.click('#rm-more');
  await phone.getByRole('button', { name: 'Speak', exact: true }).click();
  await waitTv(() => SEJ.classDebug.state.stage === 2);
  await tv.waitForTimeout(150);
  await tv.screenshot({ path: `${SHOTS}/tv-speak-start.png` });

  /* 4. Lost messages: a third of relay calls fail, and every command must still arrive once. */
  await tv.request.get(`${BASE}/__drop?rate=0.33`);
  await phone.waitForFunction(() => document.querySelectorAll('.rm-plus').length === 3, null, { timeout: 8000 });
  const start = (await tvState()).teams[1];
  for (let i = 0; i < 6; i++) { await plus.nth(1).click(); await phone.waitForTimeout(150); }
  await waitTv((n) => SEJ.classDebug.state.teams[1].score === n, start + 6);
  await tv.waitForTimeout(2000);
  check('six points arrive exactly once through a bad network', (await tvState()).teams[1] === start + 6, JSON.stringify(await tvState()));
  await tv.request.get(`${BASE}/__drop?rate=0`);

  /* 5. If the TV page reloads, the game and scores come back on the same code. */
  await tv.reload();
  await tv.waitForFunction(() => window.SEJ && SEJ.classDebug);
  const again = await tv.evaluate(() => SEJ.classDebug.state);
  check('TV reload keeps code', again.code === code);
  check('TV reload keeps scores', again.teams[1].score === start + 6);
  await plus.nth(1).click();
  await waitTv((n) => SEJ.classDebug.state.teams[1].score === n, start + 7);

  /* 6. End from the phone needs two taps. */
  await phone.click('#rm-more');
  await phone.getByRole('button', { name: '🏁 End' }).click();
  await tv.waitForTimeout(800);
  check('one tap does not end the game', (await tvState()).screen === 'stage');
  await phone.getByRole('button', { name: 'Tap again: end' }).click();
  await waitTv(() => SEJ.classDebug.state.screen === 'podium');
  await tv.waitForTimeout(250);
  await tv.screenshot({ path: `${SHOTS}/tv-podium.png` });
  await phone.waitForFunction(() => /finished/.test(document.querySelector('.rm-title').textContent), null, { timeout: 8000 });
  await phone.screenshot({ path: `${SHOTS}/phone-podium.png`, fullPage: true });

  /* 7. Screens for each speaking style and battle style. */
  for (const [lesson, label] of [['1.1', 'a'], ['1.2', 'b'], ['1.3', 'c'], ['1.4', 'd']]) {
    await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
    await tv.goto(`${BASE}/index.html?test=1#/class/${lesson}`);
    await tv.reload();
    await tv.waitForSelector('.cl-lobby');
    await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'start' }));
    await tv.waitForTimeout(100);
    await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'goto', stage: SEJ.classDebug.round('Team Battle') }));
    await tv.waitForTimeout(100);
    const kind1 = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[SEJ.classDebug.round('Team Battle')].kind);
    await tv.evaluate(() => { SEJ.$$('.cl-splash').forEach((x) => x.remove()); });
    await tv.screenshot({ path: `${SHOTS}/style-${label}-battle-${kind1}.png` });
    await tv.evaluate(() => { const d = SEJ.classDebug; d.dispatch({ type: 'reveal' }); d.dispatch({ type: 'score', team: 0, delta: 1 }); });
    await tv.waitForTimeout(100);
    await tv.screenshot({ path: `${SHOTS}/style-${label}-battle-${kind1}-open.png` });
    await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'goto', stage: SEJ.classDebug.round('Speak') }));
    await tv.waitForTimeout(100);
    const kind2 = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[SEJ.classDebug.round('Speak')].kind);
    await tv.evaluate(() => { SEJ.$$('.cl-splash').forEach((x) => x.remove()); });
    await tv.screenshot({ path: `${SHOTS}/style-${label}-speak-${kind2}.png` });
    await tv.evaluate((k) => { const d = SEJ.classDebug; if (k === 'wheel') d.dispatch({ type: 'spin' }); else if (k === 'boxes') d.dispatch({ type: 'box', n: 1 }); else { d.dispatch({ type: 'reveal' }); d.dispatch({ type: 'reveal' }); } }, kind2);
    await tv.waitForTimeout(250);
    await tv.evaluate((k) => { if (k !== 'role') SEJ.classDebug.dispatch({ type: 'reveal' }); }, kind2);
    await tv.waitForTimeout(100);
    await tv.screenshot({ path: `${SHOTS}/style-${label}-speak-${kind2}-open.png` });
  }

  /* Build a sentence on the TV: wrong order bounces back, dragging and tapping both work, right order wins. */
  await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
  await tv.goto(`${BASE}/index.html?test=1#/class/1.2`);
  await tv.reload();
  await tv.waitForSelector('.cl-lobby');
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'start' }));
  await tv.evaluate(() => { SEJ.classDebug.dispatch({ type: 'goto', stage: SEJ.classDebug.round('Team Battle') }); SEJ.$$('.cl-splash').forEach((x) => x.remove()); });
  await tv.waitForSelector('.cl-tray .cl-tile');
  await tv.waitForTimeout(150);
  await tv.screenshot({ path: `${SHOTS}/tv-drag-start.png` });
  const orderItem = await tv.evaluate(() => { const it = SEJ.classDebug.getPlan().stages[SEJ.classDebug.round('Team Battle')].items[0]; return { parts: it.parts, tiles: it.tiles }; });
  const dragTo = async (i, sel) => {
    const a = await tv.locator(`.cl-tile[data-tile="${i}"]`).boundingBox();
    const b = await tv.locator(sel).boundingBox();
    await tv.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await tv.mouse.down();
    await tv.mouse.move(a.x + a.width / 2 + 20, a.y - 10, { steps: 3 });
    await tv.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await tv.mouse.up();
    await tv.evaluate(() => SEJ.$$('.cl-splash').forEach((x) => x.remove()));
  };
  await dragTo(0, '#cl-built');
  check('drag puts a tile in the sentence', (await tv.evaluate(() => SEJ.classDebug.state.built.length)) === 1);
  await tv.screenshot({ path: `${SHOTS}/tv-drag-one.png` });
  await tv.locator('.cl-tile.placed').first().click();
  check('tap takes a tile back', (await tv.evaluate(() => SEJ.classDebug.state.built.length)) === 0);
  /* A wrong sentence shakes and clears. */
  const used = new Set();
  const correct = orderItem.parts.map((p) => { const i = orderItem.tiles.findIndex((t, n) => t === p && !used.has(n)); used.add(i); return i; });
  const wrongOrder = correct.slice().reverse();
  for (const i of wrongOrder) await tv.locator(`.cl-tray .cl-tile[data-tile="${i}"]`).click();
  await tv.waitForFunction(() => SEJ.classDebug.state.built.length === 0 && !SEJ.classDebug.state.revealed, null, { timeout: 5000 });
  check('wrong order clears', true);
  /* Dropping onto a placed tile inserts before it. */
  await dragTo(correct[1], '#cl-built');
  await dragTo(correct[0], `.cl-tile.placed[data-tile="${correct[1]}"]`);
  check('drop on a tile inserts before it', JSON.stringify(await tv.evaluate(() => SEJ.classDebug.state.built)) === JSON.stringify([correct[0], correct[1]]));
  for (const i of correct.slice(2)) await tv.locator(`.cl-tray .cl-tile[data-tile="${i}"]`).click();
  check('right order reveals', await tv.evaluate(() => SEJ.classDebug.state.revealed));
  await tv.waitForTimeout(120);
  await tv.screenshot({ path: `${SHOTS}/tv-drag-done.png` });

  /* Tapping answers on the TV: wrong is crossed out, right reveals. */
  await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
  await tv.goto(`${BASE}/index.html?test=1#/class/1.1`);
  await tv.reload();
  await tv.waitForSelector('.cl-lobby');
  await tv.evaluate(() => { const d = SEJ.classDebug; d.dispatch({ type: 'start' }); d.dispatch({ type: 'goto', stage: d.round('Team Battle') }); SEJ.$$('.cl-splash').forEach((x) => x.remove()); });
  await tv.waitForSelector('button.cl-option');
  await tv.waitForTimeout(200);
  const q = await tv.evaluate(() => { const it = SEJ.classDebug.getPlan().stages[SEJ.classDebug.round('Team Battle')].items[0]; return { answer: it.answer, wrong: it.options.find((o) => o !== it.answer) }; });
  await tv.locator('button.cl-option', { hasText: q.wrong }).first().click();
  check('wrong tap is crossed out', await tv.evaluate(() => SEJ.classDebug.state.wrongs.length === 1 && !SEJ.classDebug.state.revealed));
  await tv.locator('button.cl-option', { hasText: q.answer }).first().click();
  check('right tap reveals', await tv.evaluate(() => SEJ.classDebug.state.revealed));

  /* New games: Memory Match by tapping on the TV, Listen & Choose, Missing Letters, True or False, and changing a game. */
  const byKind = (kind) => plans.find((p) => p.plan.stages.some((x) => x.kind === kind));
  const openKind = async (kind) => {
    const p = byKind(kind);
    await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
    await tv.goto(`${BASE}/index.html?test=1#/class/${p.code}`);
    await tv.reload();
    await tv.waitForSelector('.cl-lobby');
    await tv.evaluate((k) => { const d = SEJ.classDebug; d.dispatch({ type: 'start' }); d.dispatch({ type: 'goto', stage: d.getPlan().stages.findIndex((x) => x.kind === k) }); SEJ.$$('.cl-splash').forEach((x) => x.remove()); }, kind);
    await tv.waitForTimeout(150);
    return p.code;
  };
  await openKind('memory');
  const memCards = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[SEJ.classDebug.state.stage].items[0].cards);
  const firstPair = memCards.map((c, n) => [c, n]).filter(([c]) => c.p === memCards[0].p).map(([, n]) => n);
  const other = memCards.findIndex((c) => c.p !== memCards[0].p);
  await tv.locator(`.cl-mem-card[data-card="0"]`).click();
  await tv.locator(`.cl-mem-card[data-card="${other}"]`).click();
  await tv.waitForFunction(() => SEJ.classDebug.state.mem.open.length === 0, null, { timeout: 5000 });
  check('Memory: two different cards turn back over', await tv.evaluate(() => SEJ.classDebug.state.mem.done.length === 0));
  await tv.locator(`.cl-mem-card[data-card="${firstPair[0]}"]`).click();
  await tv.locator(`.cl-mem-card[data-card="${firstPair[1]}"]`).click();
  check('Memory: a pair stays open', await tv.evaluate(() => SEJ.classDebug.state.mem.done.length === 2));
  await tv.screenshot({ path: `${SHOTS}/tv-memory.png` });
  for (let p = 0; p < memCards.length / 2; p++) {
    const pair = memCards.map((c, n) => [c, n]).filter(([c]) => c.p === p).map(([, n]) => n);
    for (const n of pair) await tv.evaluate((x) => SEJ.classDebug.dispatch({ type: 'flip', n: x }), n);
  }
  check('Memory: all pairs finish the round', await tv.evaluate(() => SEJ.classDebug.state.revealed));
  for (const kind of ['listen', 'letters', 'tf', 'riddle', 'complete', 'matchup']) {
    await openKind(kind);
    const it = await tv.evaluate(() => { const st = SEJ.classDebug.getPlan().stages[SEJ.classDebug.state.stage]; const x = st.items[0]; return { right: x.answer || x.en, options: x.options }; });
    const sel = kind === 'matchup' ? 'button.cl-mu-word' : 'button.cl-option';
    check(`${kind}: options on the TV`, (await tv.locator(sel).count()) === it.options.length, `${await tv.locator(sel).count()} / ${it.options.length}`);
    await tv.screenshot({ path: `${SHOTS}/tv-${kind}.png` });
    await tv.locator(sel, { hasText: new RegExp(`^\\s*([A-D]\\s*)?${it.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }).first().click().catch(async () => { await tv.evaluate((v) => SEJ.classDebug.dispatch({ type: 'tap', value: v }), it.right); });
    check(`${kind}: right answer reveals`, await tv.evaluate(() => SEJ.classDebug.state.revealed));
  }
  /* Try a different game: the round changes to another game of the same kind. */
  const gameBefore = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[SEJ.classDebug.state.stage].name);
  const roundBefore = await tv.evaluate(() => SEJ.classDebug.getPlan().stages[SEJ.classDebug.state.stage].round);
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'change' }));
  await tv.waitForTimeout(150);
  const gameAfter = await tv.evaluate(() => ({ name: SEJ.classDebug.getPlan().stages[SEJ.classDebug.state.stage].name, round: SEJ.classDebug.getPlan().stages[SEJ.classDebug.state.stage].round, item: SEJ.classDebug.state.item, revealed: SEJ.classDebug.state.revealed }));
  check('Try a different game changes the game', gameAfter.name !== gameBefore && gameAfter.round === roundBefore && !gameAfter.revealed, `${gameBefore} -> ${JSON.stringify(gameAfter)}`);

  /* Speaking Cards: deal, then the card shows a prompt. */
  await openKind('cards');
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'box' }));
  await tv.waitForTimeout(150);
  check('Speaking Cards deals a prompt', await tv.evaluate(() => SEJ.classDebug.state.item >= 0 && !!document.querySelector('.cl-speak-q')));
  await tv.screenshot({ path: `${SHOTS}/tv-cards.png` });

  /* Battle styles: each one draws, points move the runner, jar and rope, and Tug of War uses 2 teams. */
  for (const style of ['race', 'jar', 'tug', 'score']) {
    await tv.evaluate((x) => { const d = SEJ.classDebug; d.dispatch({ type: 'style', style: x }); d.state.teams.forEach((t) => { t.score = 0; }); d.dispatch({ type: 'score', team: 0, delta: 1 }); d.dispatch({ type: 'score', team: 0, delta: 1 }); d.dispatch({ type: 'score', team: 0, delta: 1 }); }, style);
    await tv.waitForTimeout(900);
    const info = await tv.evaluate(() => ({
      cls: document.querySelector('.cl-teams').className, teams: SEJ.classDebug.state.teams.length,
      runner: (document.querySelector('#cl-team-0 .cl-runner') || {}).style, fill: (document.querySelector('#cl-team-0 .cl-jar-fill') || {}).style, knot: (document.querySelector('.cl-knot') || {}).style,
      overflow: document.documentElement.scrollHeight > innerHeight + 1,
    }));
    check(`${style} style draws`, info.cls.includes(`style-${style}`), info.cls);
    check(`${style} style fits the screen`, !info.overflow);
    if (style === 'race') check('race runner moves with points', info.runner && info.runner.left === '30%', JSON.stringify(info.runner && info.runner.left));
    if (style === 'jar') check('jar fills with points', info.fill && /scaleY\(0\.3\)/.test(info.fill.transform), info.fill && info.fill.transform);
    if (style === 'tug') { check('tug uses 2 teams', info.teams === 2); check('rope moves toward the leader', info.knot && parseFloat(info.knot.left) < 50, info.knot && info.knot.left); }
    await tv.screenshot({ path: `${SHOTS}/tv-style-${style}.png` });
  }

  /* A lesson without enough Bangla on its slides starts at Team Battle. */
  await tv.evaluate(() => localStorage.removeItem('sej-class-v1'));
  await tv.goto(`${BASE}/index.html?test=1#/class/4.2`);
  await tv.reload();
  await tv.waitForSelector('.cl-lobby');
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'start' }));
  await tv.waitForTimeout(100);
  check('lesson 4.2 has no Word Flash', !(await tv.evaluate(() => SEJ.classDebug.getPlan().stages.some((x) => x.kind === 'flash'))));
  check('voice has its clip list', await tv.evaluate(() => Array.isArray(window.SEJ_VOICE)));

  /* 8. Nothing on the TV controls the game: no buttons, no drawer, no control keys. */
  await tv.mouse.move(300, 300);
  await tv.mouse.move(320, 320);
  await tv.mouse.click(640, 10);
  await tv.waitForTimeout(300);
  check('TV has no control buttons', !(await tv.$('#cl-controls, .cl-tools, .cl-drawer')));
  const before8 = await tv.evaluate(() => JSON.stringify([SEJ.classDebug.state.item, SEJ.classDebug.state.revealed, SEJ.classDebug.state.teams.map((t) => t.score)]));
  for (const k of [' ', 'Enter', 'ArrowRight', '1', 't', 'r', 'm', 'c']) await tv.keyboard.press(k);
  await tv.waitForTimeout(300);
  check('keys on the TV change nothing', (await tv.evaluate(() => JSON.stringify([SEJ.classDebug.state.item, SEJ.classDebug.state.revealed, SEJ.classDebug.state.teams.map((t) => t.score)]))) === before8);
  check('no PIN pad on the TV', !(await tv.$('.pin-card')));
  await tv.screenshot({ path: `${SHOTS}/tv-clean.png` });

  /* Sound warning. The TV page must not be touched first: Playwright's page probes count as a click, so its code is read from its traffic. */
  const quietCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await quietCtx.addInitScript(() => { localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ onboarded: true, sound: true, music: false, stars: {}, custom: {} })); });
  const quietTv = await quietCtx.newPage();
  let quietCode = '';
  quietTv.on('request', (r) => { const m = r.url().match(/api\/room\?code=([A-Z0-9]{6})&side=tv/); if (m) quietCode = m[1]; });
  await quietTv.goto(`${BASE}/?class=1.2`);
  for (let i = 0; i < 50 && !quietCode; i++) await new Promise((r) => setTimeout(r, 100));
  const quietPhone = await phoneCtx.newPage();
  await quietPhone.goto(`${BASE}/?remote=${quietCode}`);
  await quietPhone.waitForSelector('.pin-card', { timeout: 8000 });
  for (const d of '1010') await quietPhone.locator(`.pin-key[data-key="${d}"]`).click();
  await quietPhone.waitForSelector('#rm-sound-note', { timeout: 8000 });
  check('phone warns the TV has no sound yet', /click or touch the TV/.test(await quietPhone.textContent('#rm-sound-note')));
  await quietPhone.screenshot({ path: `${SHOTS}/phone-sound-note.png` });
  await quietTv.mouse.click(640, 30);
  await quietPhone.waitForFunction(() => !document.querySelector('#rm-sound-note'), null, { timeout: 8000 });
  check('warning clears once the TV is clicked', true);
  await quietPhone.close();
  await quietCtx.close();

  /* 9. The relay refuses bad input. */
  const api = tvCtx.request;
  check('bad code refused', (await api.get(`${BASE}/api/room?code=abc&side=tv`)).status() === 400);
  check('bad body refused', (await api.post(`${BASE}/api/room`, { data: { code: 'ABCDEF', side: 'nope' } })).status() === 400);
  check('big body refused', (await api.post(`${BASE}/api/room`, { data: { code: 'ABCDEF', side: 'tv', state: { x: 'y'.repeat(70000) } } })).status() === 413);

  if (problems.length) { failed += problems.length; console.error(problems.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
