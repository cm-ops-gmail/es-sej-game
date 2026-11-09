/* Student Play check: a TV, a teacher phone, real student phones and a crowd of simulated students, all through the relay.
   Usage: node tests/students.js <url> <screenshot-dir>   (needs playwright; run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:8124';
const SHOTS = process.argv[3] || 'shots';
fs.mkdirSync(SHOTS, { recursive: true });
let failed = 0, passed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };
const CROWD = 27;

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const open = async (w, h, url, label) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500 });
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('sej-hero-quest-v1')) localStorage.setItem('sej-hero-quest-v1', JSON.stringify({ onboarded: true, sound: false, music: false, stars: {}, custom: {} }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => problems.push(`${label}: ${e.message}`));
    await p.goto(url);
    return p;
  };

  /* Lesson 1.1: Word Flash, then a quiz, then speaking. */
  const tv = await open(1280, 720, `${BASE}/?class=1.1&test=1`, 'tv');
  await tv.waitForSelector('#cl-start');
  const waitTv = (fn, arg) => tv.waitForFunction(fn, arg, { timeout: 15000 });
  const code = await tv.evaluate(() => SEJ.classDebug.state.code);

  /* The teacher's QR stays beside the game until they connect, and covers nothing. */
  await tv.click('#cl-start');
  await tv.waitForTimeout(200);
  await tv.evaluate(() => { SEJ.$$('.cl-splash').forEach((x) => x.remove()); SEJ.classDebug.dispatch({ type: 'goto', stage: 1 }); SEJ.$$('.cl-splash').forEach((x) => x.remove()); });
  await tv.waitForTimeout(600);
  const overlap = await tv.evaluate(() => {
    const qr = document.querySelector('.cl-side').getBoundingClientRect();
    return { shown: !document.querySelector('.cl-side').hidden && qr.width > 0, hits: SEJ.$$('.cl-option,.cl-question,.cl-tile,.cl-card').filter((e) => { const r = e.getBoundingClientRect(); return r.right > qr.left + 1 && r.left < qr.right && r.bottom > qr.top && r.top < qr.bottom; }).length };
  });
  check('teacher QR shows in battle', overlap.shown);
  check('QR covers no game content', overlap.hits === 0, JSON.stringify(overlap));
  await tv.screenshot({ path: `${SHOTS}/battle-teacher-qr.png` });
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'restart' }));

  const teacher = await open(390, 780, `${BASE}/?remote=${code}&test=1`, 'teacher');
  await teacher.waitForSelector('#rm-students-toggle', { timeout: 15000 });
  await teacher.waitForTimeout(600);
  await teacher.screenshot({ path: `${SHOTS}/teacher-setup.png`, fullPage: true });
  await waitTv(() => SEJ.classDebug.state.phone === true);
  check('teacher QR goes once connected', await tv.evaluate(() => SEJ.classDebug.state.qr === false));

  /* Student phones are refused until the teacher opens the game. */
  const join = await tv.evaluate((c) => SEJ.relay.joinCode(c), code);
  check('student code differs from teacher code', join !== code);
  const early = await open(390, 780, `${BASE}/?join=${join}&test=1`, 'early');
  await early.waitForTimeout(1500);
  check('closed game asks students to wait', !(await early.$('#st-name')));
  await early.context().close();

  await teacher.click('#rm-students-toggle');
  await waitTv(() => SEJ.classDebug.state.students && !!SEJ.classDebug.state.join);
  check('TV and server agree on student code', (await tv.evaluate(() => SEJ.classDebug.state.join)) === join);
  await tv.waitForSelector('#cl-joined');
  await tv.screenshot({ path: `${SHOTS}/lobby-students.png` });

  /* Three real student phones. */
  const phones = [];
  for (const [i, [name, team]] of [['Rafi', 0], ['Mim', 1], ['Tuli', 2]].entries()) {
    const p = await open(390, 780, `${BASE}/?join=${join}&test=1`, name);
    await p.waitForSelector('#st-name', { timeout: 15000 });
    await p.fill('#st-name', name);
    await p.click('.st-card button[type=submit]');
    await p.waitForSelector(`[data-team="${team}"]`, { timeout: 15000 });
    if (!i) await p.screenshot({ path: `${SHOTS}/student-team.png` });
    await p.click(`[data-team="${team}"]`);
    phones.push({ p, name, team });
  }
  await waitTv(() => Object.keys(SEJ.classDebug.state.players).length === 3);
  await phones[0].p.waitForFunction(() => /You’re in/.test(document.body.innerText), null, { timeout: 15000 });
  await phones[0].p.screenshot({ path: `${SHOTS}/student-wait.png` });

  /* A crowd sending at the same time, repeating until the TV confirms, like the real page. */
  const api = tv.context().request;
  const clients = Array.from({ length: CROWD }, (_, i) => ({ client: `sim${String(i).padStart(3, '0')}abc`, name: `Kid ${String.fromCharCode(65 + i)}`, team: i % 4, done: {} }));
  const getFeed = async () => (await (await api.get(`${BASE}/api/room?code=${join}&side=feed`)).json()).feed;
  let crowdOn = true, crowdRight = false;
  const crowdLoop = Promise.all(clients.map(async (c, i) => {
    await new Promise((r) => setTimeout(r, i * 17));
    while (crowdOn) {
      const feed = await getFeed().catch(() => null);
      if (feed && feed.open) {
        const me = feed.players[c.client];
        const canAnswer = feed.qid && !feed.revealed && feed.options;
        if (canAnswer) c.pick = c.pick && c.pick.q === feed.qid ? c.pick : { q: feed.qid, v: feed.options[i % feed.options.length] };
        if (!me || (canAnswer && !me.a)) {
          const msg = { name: c.name, team: c.team };
          if (canAnswer) { msg.qid = feed.qid; msg.value = c.pick.v; }
          await api.post(`${BASE}/api/room`, { data: { code: join, side: 'student', client: c.client, msg } }).catch(() => {});
        }
      }
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    }
  }));
  void crowdRight;
  const t0 = Date.now();
  await tv.waitForFunction((n) => Object.keys(SEJ.classDebug.state.players).length === n, CROWD + 3, { timeout: 60000 });
  console.log(`${CROWD + 3} students joined in ${Date.now() - t0} ms`);
  check('whole class joined', true);
  await tv.screenshot({ path: `${SHOTS}/lobby-crowd.png` });

  /* Start: Word Flash. Students answer on their phones; the answer must not reach them first. */
  await teacher.waitForSelector('#rm-primary:not([disabled])');
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'start' }));
  await waitTv(() => SEJ.classDebug.state.screen === 'stage');
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'goto', stage: 1 }));
  const quiz = await tv.evaluate(() => { const d = SEJ.classDebug; const st = d.getPlan().stages[1]; return { kind: st.kind, it: st.items[0] }; });
  check('lesson 1.1 battle is a quiz', quiz.kind === 'quiz', quiz.kind);
  await phones[0].p.waitForSelector('.st-option', { timeout: 15000 });
  await phones[0].p.waitForTimeout(600);
  await phones[0].p.screenshot({ path: `${SHOTS}/student-quiz.png` });

  const feed = await getFeed();
  check('feed before reveal has no answer', feed.right === undefined && !JSON.stringify(feed).includes('"answer"'));
  check('feed has no teacher code', !JSON.stringify(feed).includes(code));
  check('feed has no roster or names', !JSON.stringify(feed).includes('Rafi'));
  const wrong = quiz.it.options.find((o) => o !== quiz.it.answer);
  const tap = (p, text) => p.locator('.st-option', { hasText: text }).first().click();
  await tap(phones[0].p, quiz.it.answer);
  await tap(phones[1].p, wrong);
  await phones[0].p.waitForFunction(() => /Answer locked/.test(document.body.innerText), null, { timeout: 15000 });
  await phones[0].p.screenshot({ path: `${SHOTS}/student-locked.png` });

  /* Wait for every student's answer. */
  const t1 = Date.now();
  await tv.waitForFunction((n) => Object.keys(SEJ.classDebug.state.answers).length >= n, CROWD + 2, { timeout: 60000 });
  console.log(`${CROWD + 2} answers arrived in ${Date.now() - t1} ms`);
  check('every answer arrived', true);
  await tv.screenshot({ path: `${SHOTS}/tv-answering.png` });

  const beforeReveal = await tv.evaluate(() => { const s = SEJ.classDebug.state; return { answers: { ...s.answers }, teams: s.teams.map((t) => t.score), players: JSON.parse(JSON.stringify(s.players)) }; });
  const expectRight = Object.values(beforeReveal.answers).filter((v) => v === quiz.it.answer).length;
  await tv.evaluate(() => SEJ.classDebug.dispatch({ type: 'reveal' }));
  const after = await tv.evaluate(() => { const s = SEJ.classDebug.state; return { teams: s.teams.map((t) => t.score), players: JSON.parse(JSON.stringify(s.players)) }; });
  const gained = after.teams.reduce((a, b) => a + b, 0) - beforeReveal.teams.reduce((a, b) => a + b, 0);
  check('each right answer scores one team point', gained === expectRight, `${gained} / ${expectRight}`);
  check('right student scored', Object.values(after.players).find((p) => p.name === 'Rafi').score === 1);
  check('wrong student did not', Object.values(after.players).find((p) => p.name === 'Mim').score === 0);

  await phones[0].p.waitForFunction(() => /Correct/.test(document.body.innerText), null, { timeout: 15000 });
  await phones[1].p.waitForFunction(() => /Good try/.test(document.body.innerText), null, { timeout: 15000 });
  await phones[0].p.screenshot({ path: `${SHOTS}/student-right.png` });

  /* Going back and revealing again does not score twice. */
  await tv.evaluate(() => { const d = SEJ.classDebug; d.dispatch({ type: 'next' }); d.dispatch({ type: 'prev' }); d.dispatch({ type: 'reveal' }); });
  check('no double score', (await tv.evaluate(() => SEJ.classDebug.state.teams.reduce((a, t) => a + t.score, 0))) === after.teams.reduce((a, b) => a + b, 0));

  /* The teacher's +1 still works beside automatic points. */
  await teacher.waitForSelector('.rm-plus');
  const b4 = await tv.evaluate(() => SEJ.classDebug.state.teams[3].score);
  await teacher.locator('.rm-plus').nth(3).click();
  await waitTv((n) => SEJ.classDebug.state.teams[3].score === n, b4 + 1);
  check('teacher can still give points', true);
  await teacher.screenshot({ path: `${SHOTS}/teacher-play.png`, fullPage: true });
  await teacher.click('#rm-more');
  await teacher.waitForSelector('#rm-students');
  await teacher.screenshot({ path: `${SHOTS}/teacher-more.png` });
  await teacher.click('#rm-more-close');

  crowdOn = false;
  await crowdLoop;

  /* A student can't spoof the feed, reach the teacher's state, or send a huge message. */
  const spoof = await api.post(`${BASE}/api/room`, { data: { code: join, side: 'tv', state: { fake: 1 }, feed: { open: true, right: 'hacked' } } });
  check('student code cannot write the real feed', spoof.status() === 200 && !JSON.stringify(await getFeed()).includes('hacked'));
  const big = await api.post(`${BASE}/api/room`, { data: { code: join, side: 'student', client: 'abcd1234', msg: { name: 'x'.repeat(5000) } } });
  check('oversize student message refused', big.status() === 413);

  /* Rude names can be removed: the student is told and can't score. */
  const victim = phones[2];
  const id = await victim.p.evaluate(() => SEJ.studentDebug.me.client);
  await tv.evaluate((c) => SEJ.classDebug.dispatch({ type: 'kick', client: c }), id);
  await victim.p.waitForFunction(() => /left this game/.test(document.body.innerText), null, { timeout: 15000 });
  check('removed student is told', true);
  await tv.waitForTimeout(1500);
  check('removed student stays out', await tv.evaluate((c) => !(c in SEJ.classDebug.state.players), id));

  /* Order and speaking screens, using a lesson with those rounds. */
  const tv2 = await open(1280, 720, `${BASE}/?class=1.2&test=1`, 'tv2');
  await tv2.waitForTimeout(100);
  await tv2.waitForSelector('#cl-students');
  await tv2.click('#cl-students');
  await tv2.waitForSelector('#cl-joined', { timeout: 15000 });
  const join2 = await tv2.evaluate(() => SEJ.classDebug.state.join);
  const s2 = await open(390, 780, `${BASE}/?join=${join2}&test=1`, 'order');
  await s2.waitForSelector('#st-name', { timeout: 15000 });
  await s2.fill('#st-name', 'Nabil');
  await s2.click('.st-card button[type=submit]');
  await s2.waitForSelector('[data-team="1"]', { timeout: 15000 });
  await s2.click('[data-team="1"]');
  await tv2.waitForFunction(() => Object.keys(SEJ.classDebug.state.players).length === 1, null, { timeout: 15000 });
  await tv2.evaluate(() => { const d = SEJ.classDebug; d.dispatch({ type: 'start' }); d.dispatch({ type: 'goto', stage: 1 }); });
  const it2 = await tv2.evaluate(() => { const st = SEJ.classDebug.getPlan().stages[1]; return { kind: st.kind, it: st.items[0] }; });
  check('lesson 1.2 battle is order', it2.kind === 'order', it2.kind);
  await s2.waitForSelector('.st-tile', { timeout: 15000 });
  await s2.screenshot({ path: `${SHOTS}/student-order.png` });
  for (const part of it2.it.parts) await s2.locator('.st-tiles .st-tile', { hasText: new RegExp(`^${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();
  await s2.waitForFunction(() => /Answer locked/.test(document.body.innerText), null, { timeout: 15000 });
  await tv2.waitForFunction(() => Object.keys(SEJ.classDebug.state.answers).length === 1, null, { timeout: 15000 });
  await tv2.evaluate(() => SEJ.classDebug.dispatch({ type: 'reveal' }));
  check('right order scores', (await tv2.evaluate(() => SEJ.classDebug.state.teams[1].score)) === 1);
  await s2.waitForFunction(() => /Correct/.test(document.body.innerText), null, { timeout: 15000 });
  await tv2.evaluate(() => SEJ.classDebug.dispatch({ type: 'goto', stage: 2 }));
  await s2.waitForFunction(() => /Look at the TV|Say it out loud/.test(document.body.innerText), null, { timeout: 15000 });
  await tv2.evaluate(() => { SEJ.classDebug.dispatch({ type: 'box', n: 0 }); });
  await s2.waitForFunction(() => /Say it out loud/.test(document.body.innerText) && !/Look at the TV/.test(document.body.innerText), null, { timeout: 15000 });
  await s2.screenshot({ path: `${SHOTS}/student-speak.png` });
  await tv2.evaluate(() => SEJ.classDebug.dispatch({ type: 'end' }));
  await tv2.waitForTimeout(300);
  await tv2.screenshot({ path: `${SHOTS}/podium-players.png` });
  check('top players on podium', (await tv2.textContent('#cl-top-players')).includes('Nabil'));
  await s2.waitForFunction(() => /Well played/.test(document.body.innerText), null, { timeout: 15000 });
  await s2.screenshot({ path: `${SHOTS}/student-podium.png` });

  if (problems.length) { failed += problems.length; console.error(problems.join('\n')); }
  console.log(`${passed} checks passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
