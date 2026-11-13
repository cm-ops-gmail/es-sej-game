/* Screens and navigation: quest map, lesson hub, hero picker, game results. */
(function () {
  'use strict';
  const { h, $, sfx, fx, voice, store } = SEJ;
  const root = () => $('#app');
  const UNITS = [
    { n: 1, title: 'Me, Myself, & Hi!', bn: 'নিজেদের বিভিন্ন বিষয় নিয়ে কথা বলা', cls: 'u1', hero: 'bhasha' },
    { n: 2, title: 'School Buzz', bn: 'School-এর বিভিন্ন বিষয় নিয়ে কথা বলা', cls: 'u2', hero: 'innovara' },
    { n: 3, title: 'Kith and Kin', bn: 'বাড়ি এবং পরিবার নিয়ে কথা বলা', cls: 'u3', hero: 'mathman' },
    { n: 4, title: 'World Around Me', bn: 'চারপাশের বিভিন্ন বিষয় নিয়ে কথা বলা', cls: 'u4', hero: 'knight' },
  ];
  SEJ.UNITS = UNITS;
  let activeHost = null;

  /* ---------- shared UI ---------- */
  SEJ.ui = {
    soundButton(cls = 'bar-btn') {
      const render = (b) => {
        const s = store.state;
        b.textContent = s.sound === false ? '🔇' : s.music === false ? '🔉' : '🎵';
        b.setAttribute('aria-label', s.sound === false ? 'Sound off. Tap to turn on' : s.music === false ? 'Music off. Tap to mute all sound' : 'Music on. Tap to turn music off');
        b.title = s.sound === false ? 'Sound off' : s.music === false ? 'Sounds only' : 'Sound and music';
      };
      const b = h('button', {
        class: cls,
        onclick: () => {
          const s = store.state;
          /* cycles: music + sounds → sounds only → silent */
          if (s.sound === false) { s.sound = true; s.music = true; } else if (s.music !== false) { s.music = false; } else { s.sound = false; voice.stop(); }
          store.save();
          SEJ.music.sync();
          sfx.tap();
          render(b);
        },
      });
      render(b);
      return b;
    },
  };
  const go = (hash) => { location.hash = hash; };
  const starRow = (n, max = 3) => h('span', { class: 'stars', 'aria-label': `${n} of ${max} stars` },
    Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'star on' : 'star', 'aria-hidden': 'true', text: '★' })));

  function slotsFor(lesson) {
    const slots = lesson.games.map((g, i) => ({ key: String(i), game: g }));
    /* Each lesson has exactly its 3 reference games. Speaking prompts are used in Class Battle. */
    return slots;
  }
  function lessonStars(lesson) {
    const slots = slotsFor(lesson);
    const got = slots.reduce((a, s) => a + store.starsFor(lesson.code, s.key), 0);
    return { got, max: slots.length * 3, played: slots.filter((s) => store.starsFor(lesson.code, s.key) > 0).length, slots: slots.length };
  }

  /* ---------- first visit: name, then hero, then the map ---------- */
  const tapDevice = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;
  function onbPage(...kids) {
    return h('div', { class: 'onb' }, SEJ.scene('magic'), h('div', { class: 'onb-inner' }, ...kids));
  }
  function nameStep() {
    const input = h('input', { class: 'onb-input', id: 'player-name', maxlength: '14', placeholder: 'Type your name', value: store.state.name || '', autocomplete: 'off', 'aria-label': 'Your name', enterkeyhint: 'next' });
    const form = h('form', { class: 'onb-card enter-pop', onsubmit: (e) => {
      e.preventDefault();
      const name = SEJ.setName(input.value);
      if (!name) { fx.play(form, 'shake'); input.focus(); return; }
      sfx.correct(2);
      fx.burstAt(form, 30, ['⭐', '✨']);
      go('#/welcome/hero');
    } },
      h('p', { class: 'onb-step', text: 'Step 1 of 2' }),
      h('p', { class: 'onb-q', text: 'What’s your name?' }),
      h('p', { class: 'onb-q-bn', lang: 'bn', text: 'তোমার নাম লেখো' }),
      input,
      h('button', { class: 'cta gummy g-green cta-big', type: 'submit' }, 'Next ▶'),
      h('button', { class: 'link-skip', type: 'button', onclick: () => go('#/welcome/hero') }, 'Skip for now'));
    const page = onbPage(
      h('img', { class: 'onb-logo', src: 'assets/logo.webp', alt: 'Spoken English Junior' }),
      h('h1', { class: 'logo-word big onb-title' }, 'Hero Quest'),
      form);
    page.append(h('div', { class: 'onb-squad', 'aria-hidden': 'true' }, ['knight', 'bhasha', 'mathman', 'innovara'].map((id, i) => SEJ.heroImg(id, `squad-hero sq${i}`))));
    root().replaceChildren(page);
    if (!tapDevice()) input.focus({ preventScroll: true });
  }

  /* changeMode: opened later from your picture, so the name can be edited here too. */
  function heroStep(changeMode) {
    const s = store.state;
    let chosen = s.hero;
    const input = changeMode && !SEJ.batch.on ? h('input', { class: 'onb-input onb-input-small', id: 'player-name', maxlength: '14', placeholder: 'Type your name', value: s.name || '', autocomplete: 'off', 'aria-label': 'Your name' }) : null;
    const start = () => {
      if (input) SEJ.setName(input.value);
      store.state.hero = chosen;
      store.state.onboarded = true;
      store.save();
      sfx.fanfare();
      fx.confetti(110);
      fx.fireworks(5);
      SEJ.music.start();
      go('#/map');
    };
    const cards = Object.entries(SEJ.HEROES).map(([id, hero], i) => {
      const card = h('button', {
        class: `hero-pick enter hp${i} ${chosen === id ? 'picked' : ''}`, style: { '--i': i }, 'aria-pressed': chosen === id ? 'true' : 'false',
        onclick: () => {
          chosen = id;
          SEJ.$$('.hero-pick').forEach((c) => { c.classList.remove('picked'); c.setAttribute('aria-pressed', 'false'); });
          card.classList.add('picked');
          card.setAttribute('aria-pressed', 'true');
          sfx.correct(1);
          fx.burstAt(card, 24, ['⭐', '✨']);
          SEJ.music.start();
        },
      }, h('span', { class: 'hero-stage' }, SEJ.heroImg(id)), h('strong', { text: hero.name }), h('small', { lang: 'bn', text: hero.bn }));
      return card;
    });
    root().replaceChildren(onbPage(
      !changeMode && h('p', { class: 'onb-step onb-step-light', text: 'Step 2 of 2' }),
      h('h1', { class: 'logo-word onb-title2' }, 'Pick Your Hero!'),
      h('div', { class: 'hero-grid' }, cards),
      h('div', { class: 'onb-actions' },
        input,
        h('button', { class: 'cta gummy g-green cta-big', onclick: start }, 'Let’s Go! 🚀'),
        !changeMode && !SEJ.batch.on && h('button', { class: 'link-skip link-skip-light', type: 'button', onclick: () => go('#/welcome') }, '← Change my name'))));
  }

  /* ---------- quest map ---------- */
  /* Typing a name saves it, says hello, and refreshes the screen so every sentence uses it. */
  function nameForm(cls, big) {
    const input = h('input', { class: 'name-field', maxlength: '14', placeholder: 'Type your name', autocomplete: 'off', 'aria-label': 'Type your name', enterkeyhint: 'done' });
    const form = h('form', { class: `name-form ${cls}`, onsubmit: (e) => {
      e.preventDefault();
      const name = SEJ.setName(input.value);
      if (!name) { fx.play(form, 'shake'); input.focus(); return; }
      sfx.fanfare();
      fx.confetti(70);
      route();
    } }, input, h('button', { class: `gummy g-green name-go${big ? ' name-go-big' : ''}`, type: 'submit', 'aria-label': 'Save my name' }, big ? 'That’s me! ✓' : '✓'));
    return form;
  }

  function topBar() {
    const s = store.state;
    return h('header', { class: 'top-bar' },
      h('a', { class: 'top-logo', href: '#/map', 'aria-label': 'Quest map' }, h('img', { src: 'assets/logo.webp', alt: 'Spoken English Junior' })),
      h('span', { class: 'spacer' }),
      h('div', { class: 'star-total', 'aria-label': `${store.totalStars()} stars collected` }, h('span', { class: 'spin-star', 'aria-hidden': 'true', text: '⭐' }), h('b', { text: store.totalStars() })),
      SEJ.ui.soundButton(),
      SEJ.batch.on
        ? h('a', { class: 'bar-btn board-btn', href: '#/board', id: 'board-btn', 'aria-label': 'Leaderboard', title: 'Leaderboard' }, '🏆', h('span', { class: 'board-word', text: 'Leaderboard' }))
        : h('a', { class: 'bar-btn admin-btn', href: '#/admin', id: 'admin-btn' }, 'Admin'),
      s.name
        ? h('a', { class: 'player', href: '#/heroes', 'aria-label': `${s.name}. Change your name or hero` }, SEJ.heroFace(s.hero), h('span', { class: 'player-name', text: s.name }))
        : h('a', { class: 'player', href: '#/heroes', 'aria-label': 'Change your hero' }, SEJ.heroFace(s.hero)));
  }

  /* A batch student's place on the leaderboard, right on the map, with a button to see everyone. */
  function boardCard() {
    const line = h('span', { class: 'map-board-line', id: 'map-board-line', text: 'See who is on top!' });
    const top = h('span', { class: 'map-board-top' });
    SEJ.batch.board().then((data) => {
      if (!data || !line.isConnected) return;
      const rows = data.rows || [], me = rows.find((r) => r.id === (store.state.batch || {}).id);
      line.textContent = me ? `You are number ${me.rank} of ${rows.length} · ${me.score} points${me.time ? ` · ⏱ ${Math.floor(me.time / 60)}:${String(me.time % 60).padStart(2, '0')}` : ''}` : rows.length ? `${rows.length} ${rows.length === 1 ? 'friend is' : 'friends are'} playing. Finish a game to join!` : 'Finish a game to be the first!';
      top.replaceChildren(...rows.slice(0, 3).map((r, i) => h('span', {}, `${['🥇', '🥈', '🥉'][i]} ${r.name}`)));
    });
    return h('a', { class: 'map-board enter-pop', href: '#/board', id: 'map-board' },
      h('span', { class: 'map-board-cup', 'aria-hidden': 'true', text: '🏆' }),
      h('span', { class: 'map-board-text' }, h('b', { text: 'Leaderboard' }), line, top),
      h('span', { class: 'map-board-go', 'aria-hidden': 'true', text: '▶' }));
  }

  function map() {
    const lessons = SEJ.lessons();
    const nextUp = lessons.find((l) => SEJ.batch.isOpen(l.code) && lessonStars(l).played < lessonStars(l).slots);
    const hero = store.state.hero;
    const body = h('main', { class: 'map-body' });
    body.append(h('section', { class: 'map-hero' },
      SEJ.scene('sky'),
      h('div', { class: 'map-hero-inner' },
        h('h1', { class: 'logo-word big' }, 'Hero Quest'),
        store.state.name
          ? h('p', { class: 'tagline' }, SEJ.batch.joined && SEJ.batch.name ? `Hello, ${store.state.name}! Welcome to ${SEJ.batch.name}.` : `Hello, ${store.state.name}! Ready to be an English superhero?`)
          : h('div', { class: 'name-card enter-pop' }, h('p', { class: 'name-q' }, 'What’s your name? ', h('small', { lang: 'bn', text: 'তোমার নাম লেখো' })), nameForm('name-form-big', true)),
        SEJ.batch.joined && boardCard(),
        h('div', { class: 'squad', 'aria-hidden': 'true' }, ['knight', 'bhasha', 'mathman', 'innovara'].map((id, i) => SEJ.heroImg(id, `squad-hero sq${i}`))))));
    UNITS.forEach((u) => {
      const inUnit = lessons.filter((l) => l.unit === u.n);
      const got = inUnit.reduce((a, l) => a + lessonStars(l).got, 0);
      const max = inUnit.reduce((a, l) => a + lessonStars(l).max, 0);
      const path = h('div', { class: 'path' });
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'path-line');
      svg.setAttribute('aria-hidden', 'true');
      path.append(svg);
      inUnit.forEach((l, i) => {
        const st = lessonStars(l);
        const isNext = nextUp && nextUp.code === l.code;
        const locked = !SEJ.batch.isOpen(l.code);
        path.append(h(locked ? 'div' : 'a', {
          class: `node pos${i % 4} ${st.played === st.slots ? 'complete' : ''} ${isNext ? 'next' : ''} ${locked ? 'locked' : ''}`,
          href: locked ? null : `#/lesson/${l.code}`,
          'aria-label': locked ? `Lesson ${l.code}: ${l.title}. Locked. Your teacher will open it.` : `Lesson ${l.code}: ${l.title}. ${st.got} of ${st.max} stars`,
          'data-code': l.code,
        },
        h('span', { class: 'node-circle' }, SEJ.sticker(l.emoji, 'node-art'), locked && h('span', { class: 'node-lock', 'aria-hidden': 'true', text: '🔒' }), isNext && h('span', { class: 'node-flag' }, SEJ.heroImg(hero, 'node-hero'), h('span', { class: 'play-tag', text: 'PLAY!' }))),
        h('span', { class: 'node-label' }, h('small', { text: `Lesson ${l.code}` }), h('strong', { text: l.title })),
        h('span', { class: 'node-progress' }, '⭐ ', `${st.got}/${st.max}`)));
      });
      const decor = h('div', { class: 'decor-layer', 'aria-hidden': 'true' });
      decor.innerHTML = SEJ.unitDecor(u.n, inUnit.length + 3);
      body.append(h('section', { class: `unit ${u.cls}` },
        decor,
        h('div', { class: 'unit-banner' },
          SEJ.heroImg(u.hero, 'unit-hero'),
          h('div', { class: 'unit-text' },
            h('small', { text: `UNIT ${u.n}` }),
            h('h2', { text: u.title }),
            h('p', { lang: 'bn', class: 'bn', text: u.bn }),
            h('span', { class: 'unit-stars' }, `⭐ ${got} / ${max}`))),
        path));
    });
    root().replaceChildren(h('div', { class: 'map-page' }, topBar(), body));
    const draw = () => SEJ.$$('.path').forEach(drawPath);
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if ($('.map-page')) draw(); });
    addEventListener('resize', draw);
    cleanupRoute = () => removeEventListener('resize', draw);
    /* Only the part of the map on screen keeps moving. */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((list) => list.forEach((e) => e.target.classList.toggle('offscreen', !e.isIntersecting)), { rootMargin: '120px' });
      SEJ.$$('.unit, .map-hero').forEach((el) => io.observe(el));
      const previous = cleanupRoute;
      cleanupRoute = () => { io.disconnect(); previous(); };
    }
    /* The teacher may have unlocked a lesson since the last visit. */
    if (SEJ.batch.on) SEJ.batch.load().then((changed) => { if (changed && $('.map-page')) route(); });
    const n = $('.node.next');
    if (n && store.totalStars() > 0) n.scrollIntoView({ block: 'center' });
  }
  function drawPath(path) {
    const svg = path.querySelector('svg');
    const box = path.getBoundingClientRect();
    const pts = SEJ.$$('.node-circle', path).map((c) => {
      const r = c.getBoundingClientRect();
      return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
    });
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    let d = '';
    pts.forEach((p, i) => {
      if (!i) { d = `M${p[0]} ${p[1]}`; return; }
      const q = pts[i - 1], my = (p[1] + q[1]) / 2;
      d += ` C${q[0]} ${my} ${p[0]} ${my} ${p[0]} ${p[1]}`;
    });
    svg.innerHTML = `<path d="${d}" class="road-edge"/><path d="${d}" class="road"/><path d="${d}" class="road-dash"/>`;
  }

  /* ---------- lesson hub ---------- */
  function lessonPage(code) {
    const l = SEJ.lesson(code);
    if (!l) return go('#/map');
    const unit = UNITS.find((u) => u.n === l.unit);
    const slots = slotsFor(l);
    const st = lessonStars(l);
    const first = slots.findIndex((x) => store.starsFor(code, x.key) === 0);
    const COLORS = ['g-pink', 'g-blue', 'g-orange', 'g-violet', 'g-green', 'g-aqua'];
    const cards = slots.map((s, i) => {
      const t = SEJ.TEMPLATES[s.game.t];
      const stars = store.starsFor(code, s.key);
      return h('a', {
        class: `game-card gummy ${COLORS[i % COLORS.length]} enter ${stars ? 'played' : ''} ${i === first ? 'up-next' : ''}`, style: { '--i': i }, href: `#/play/${code}/${s.key}`,
        'aria-label': `${s.game.title}, ${t.name}. ${stars} of 3 stars`, onclick: () => sfx.tap(),
      },
      SEJ.sticker(t.icon, 'game-art'),
      h('span', { class: 'game-card-body' }, h('small', { text: t.name }), h('strong', { text: s.game.title }), starRow(stars)),
      h('span', { class: 'play-pill', 'aria-hidden': 'true', text: stars ? '↻' : '▶' }));
    });
    const words = h('div', { class: 'word-strip' }, (l.words || []).map(([en, bn], i) => h('button', {
      class: `word-chip wc${i % 6}`, onclick: (e) => { sfx.tap(); voice.say(en); fx.play(e.currentTarget, 'jelly'); }, 'aria-label': `Hear ${en}`,
    }, h('b', { text: `🔊 ${en}` }), h('span', { lang: 'bn', text: bn }))));
    root().replaceChildren(h('div', { class: `lesson-page ${unit.cls}` },
      h('div', { class: 'rays rays-soft', 'aria-hidden': 'true' }),
      topBar(),
      h('main', { class: 'lesson-main' },
        h('a', { class: 'back-link', href: '#/map' }, '← Quest map'),
        !store.state.name && h('div', { class: 'name-card name-card-lesson' }, h('p', { class: 'name-q' }, 'Type your name so the games can say it! ', h('small', { lang: 'bn', text: 'তোমার নাম লেখো' })), nameForm('name-form-big', true)),
        h('section', { class: 'mission' },
          SEJ.heroImg(l.hero, 'mission-hero'),
          h('div', { class: 'mission-bubble enter' },
            h('small', { text: `Unit ${l.unit} · Lesson ${l.code}` }),
            h('h1', {}, SEJ.sticker(l.emoji, 'title-art'), ' ', l.title),
            h('p', { class: 'mission-en', text: l.mission.en }),
            h('p', { class: 'bn', lang: 'bn', text: l.mission.bn }),
            h('div', { class: 'mission-progress' }, '⭐ ', `${st.got} of ${st.max} stars`))),
        h('section', { 'aria-label': 'Games' }, h('h2', { class: 'section-title', text: 'Your Missions' }), h('div', { class: 'game-list' }, cards)),
        h('section', { 'aria-label': 'Class Battle' }, h('h2', { class: 'section-title' }, 'In Class ', h('small', { text: 'with your teacher' })),
          h('a', { class: 'class-card gummy g-violet', id: 'class-battle-link', href: `#/class/${code}`, onclick: () => sfx.tap() },
            SEJ.sticker('🏆', 'class-art'),
            h('span', {}, h('strong', { text: 'Class Battle' }), h('small', { text: 'Teachers: play on the class TV and control it from your phone' })),
            h('span', { class: 'play-pill', 'aria-hidden': 'true', text: '▶' }))),
        (l.words || []).length ? h('section', { 'aria-label': 'Power words' }, h('h2', { class: 'section-title' }, 'Power Words ', h('small', { lang: 'bn', text: 'চাপ দিয়ে শোনো' })), words) : null)));
  }

  /* ---------- playing and results ---------- */
  function play(code, key) {
    const l = SEJ.lesson(code);
    if (!l || !SEJ.batch.isOpen(code)) return go('#/map');
    const slots = slotsFor(l);
    const slot = slots.find((s) => s.key === key);
    if (!slot) return go(`#/lesson/${code}`);
    SEJ.music.sync();
    SEJ.voice.prepare(JSON.stringify(slot.game).match(/"[^"]{2,120}"/g).map((x) => x.slice(1, -1)));
    if (activeHost) activeHost.destroy();
    activeHost = SEJ.playGame(root(), l, key, slot.game, {
      onExit: () => go(`#/lesson/${code}`),
      onFinish: (res) => results(l, slots, key, res),
    });
    cleanupRoute = () => { if (activeHost) activeHost.destroy(); activeHost = null; voice.stop(); };
  }

  function results(l, slots, key, res) {
    const wasComplete = lessonStars(l).played === lessonStars(l).slots;
    store.setStars(l.code, key, res.stars);
    const nowComplete = lessonStars(l).played === lessonStars(l).slots;
    const idx = slots.findIndex((s) => s.key === key);
    const next = slots[idx + 1];
    const name = store.state.name;
    const heroId = store.state.hero || l.hero;
    const big = nowComplete && !wasComplete;
    const titles = { 3: 'SUPERSTAR!', 2: 'GREAT WORK!', 1: 'NICE TRY!' };
    const stars = [0, 1, 2].map(() => h('span', { class: 'result-star', 'aria-hidden': 'true', text: '★' }));
    const heading = big ? 'MISSION COMPLETE!' : titles[res.stars];
    const line = big ? `You finished ${l.title}!` : res.stars === 3 ? 'Perfect hero moves!' : res.stars === 2 ? 'You are getting so good!' : 'Play again to win more stars!';
    const scoreNum = h('b', { text: '0' });
    /* In a batch, the first try at each game goes on the leaderboard. */
    const slotGame = (slots.find((s) => s.key === key) || {}).game || {};
    const gameId = slotGame.id || `d${key}`;
    const boardLine = SEJ.batch.joined ? h('p', { class: 'result-board', id: 'result-board', role: 'status', text: SEJ.batch.isDone(l.code, gameId) ? '🔁 Practice try. Your first score is on the leaderboard.' : '🏆 Sending your score to the leaderboard…' }) : null;
    if (SEJ.batch.joined && !SEJ.batch.isDone(l.code, gameId)) {
      SEJ.batch.submit(l.code, gameId, slotGame.title || '', res).then((r) => {
        if (!boardLine.isConnected) return;
        boardLine.textContent = r.counted ? '🏆 Your score is on the leaderboard!' : r.counted === false ? '🔁 Practice try. Your first score is on the leaderboard.' : r.error === 'locked' ? '🔒 This lesson is locked, so this score wasn’t counted.' : '⚠️ No internet, so this score wasn’t sent. Play again when you’re online.';
        if (r.counted) { boardLine.classList.add('counted'); fx.play(boardLine, 'jelly'); }
      });
    }
    root().replaceChildren(h('div', { class: `results ${big ? 'mission-done' : ''}` },
      h('div', { class: 'rays', 'aria-hidden': 'true' }),
      h('div', { class: 'result-card enter-pop', role: 'status' },
        h('div', { class: 'result-top' }, SEJ.heroImg(heroId, 'result-hero'), big && SEJ.sticker('🏅', 'medal')),
        h('h1', { class: 'logo-word', text: heading }),
        h('div', { class: 'result-stars', role: 'img', 'aria-label': `${res.stars} of 3 stars` }, stars),
        h('p', { class: 'result-line', text: line }),
        h('div', { class: 'result-stats' },
          h('span', { class: 'stat' }, '⭐ ', scoreNum, ' points'),
          res.time !== undefined && h('span', { class: 'stat' }, '⏱ ', h('b', { text: `${Math.floor(res.time / 60)}:${String(res.time % 60).padStart(2, '0')}` })),
          h('span', { class: 'stat' }, '🔥 ', h('b', { text: res.best }), ' streak'),
          h('span', { class: 'stat' }, '🎯 ', h('b', { text: `${res.perfect}/${res.total}` }), ' first try')),
        boardLine,
        h('div', { class: 'result-actions' },
          next
            ? h('a', { class: 'cta gummy g-green cta-big', href: `#/play/${l.code}/${next.key}`, id: 'next-game' }, 'Next Game ▶')
            : h('a', { class: 'cta gummy g-green cta-big', href: `#/lesson/${l.code}`, id: 'next-game' }, 'Finish 🎉'),
          h('button', { class: 'soft-btn', onclick: () => play(l.code, key) }, '↻ Play again'),
          SEJ.batch.joined && h('a', { class: 'soft-btn', href: '#/board', id: 'see-board' }, '🏆 Leaderboard'),
          h('a', { class: 'soft-btn', href: `#/lesson/${l.code}` }, '🗺️ All missions')))));
    /* A drum roll, then stars stamp on one at a time, then the crowd cheers. */
    sfx.drumroll(0.45);
    const speed = SEJ.testMode ? 0.02 : 1;
    const t0 = performance.now();
    const count = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      scoreNum.textContent = Math.round(res.score * k);
      if (k < 1 && scoreNum.isConnected) requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    stars.forEach((s, i) => {
      if (i < res.stars) setTimeout(() => {
        s.classList.add('on');
        sfx.star(i);
        SEJ.buzz(40);
        fx.burstAt(s, 28, ['⭐', '✨']);
      }, (500 + i * 420) * speed);
    });
    setTimeout(() => {
      sfx.fanfare();
      sfx.cheer();
      sfx.applause(big ? 3.2 : 2);
      SEJ.buzz([60, 50, 60, 50, 140]);
      fx.confetti(big ? 280 : res.stars === 3 ? 180 : 100);
      fx.fireworks(big ? 10 : res.stars === 3 ? 6 : 2);
    }, (500 + res.stars * 420) * speed);
  }

  /* ---------- router ---------- */
  let cleanupRoute = null;
  function route() {
    if (cleanupRoute) { cleanupRoute(); cleanupRoute = null; }
    voice.stop();
    const hash = location.hash.replace(/^#\/?/, '');
    const [page, a, b] = hash.split('/');
    window.scrollTo(0, 0);
    /* Class Battle runs without background music: the teacher is talking. */
    SEJ.noMusic = page === 'class' || page === 'remote' || page === 'join';
    if (page !== 'play') SEJ.music.setTheme('map');
    if (SEJ.noMusic) SEJ.music.stop();
    if (page === 'class') { cleanupRoute = SEJ.classPage(root(), a); return; }
    if (page === 'remote') { cleanupRoute = SEJ.remotePage(root(), a); return; }
    if (page === 'join') { cleanupRoute = SEJ.studentPage(root(), a); return; }
    if (page === 'teacher') { history.replaceState(null, '', `#/admin${a ? `/${a}` : ''}`); return SEJ.builder.render(root(), a); }
    if (page === 'admin') return SEJ.builder.render(root(), a, b);
    if (page === 'board') { cleanupRoute = SEJ.boardPage(root(), a); return; }
    /* A student who opened a batch link says who they are first: name and student ID. */
    const afterJoin = () => { if (store.state.onboarded) go('#/map'); else go('#/welcome/hero'); route(); };
    if (page === 'enter' || (SEJ.batch.on && (SEJ.batch.missing || !SEJ.batch.joined) && !['heroes'].includes(page))) return SEJ.batchJoinPage(root(), afterJoin);
    if (page === 'heroes') return heroStep(true);
    if (page === 'welcome') return a === 'hero' ? heroStep(false) : SEJ.batch.on ? SEJ.batchJoinPage(root(), afterJoin) : nameStep();
    /* The home page greets a first-time visitor with name, then hero, then the map.
       Direct game and lesson links skip this and open straight away. */
    if ((!page || page === 'map') && !(store.state.onboarded || store.state.name)) {
      history.replaceState(null, '', location.pathname + location.search + '#/welcome');
      return nameStep();
    }
    if (page === 'lesson') return SEJ.batch.isOpen(a) ? lessonPage(a) : (history.replaceState(null, '', '#/map'), map());
    if (page === 'play') return play(a, b);
    return map();
  }
  /* Short links from the curriculum sheet:
     ?game=1.3-2 opens the second game of Lesson 1.3 straight away, ?game=1.3-talk its speaking round,
     ?class=1.3 its Class Battle on the TV, ?remote=CODE the teacher's phone remote, ?join=CODE a student's phone. */
  function openShortLink() {
    const q = new URLSearchParams(location.search);
    const game = q.get('game');
    const lesson = q.get('lesson');
    const battle = q.get('class');
    const remote = q.get('remote');
    const join = q.get('join');
    const batch = q.get('batch');
    const board = q.get('board');
    if (board && /^[A-Za-z0-9]{6}$/.test(board)) {
      /* A leaderboard link: anyone with it can watch that batch's leaderboard. */
      history.replaceState(null, '', `${location.pathname}${q.get('test') ? '?test=1' : ''}#/board/${board.toUpperCase()}`);
      return;
    }
    if (batch && SEJ.batch.use(batch)) {
      /* A batch link: remember the batch and show a clean address. */
      history.replaceState(null, '', location.pathname + (q.get('test') ? '?test=1' : '') + (location.hash || '#/map'));
      return;
    }
    if (!game && !lesson && !battle && remote === null && join === null) return;
    const keep = q.get('test') ? '?test=1' : '';
    let target = battle ? `#/class/${battle}` : remote !== null ? `#/remote/${remote}` : join !== null ? `#/join/${join}` : `#/lesson/${lesson}`;
    if (game) {
      const [code, slot] = game.split('-');
      target = `#/play/${code}/${slot === 'talk' ? 'talk' : Math.max(0, parseInt(slot, 10) - 1)}`;
    }
    history.replaceState(null, '', location.pathname + keep + target);
  }
  store.save();
  addEventListener('hashchange', route);
  /* Browsers only allow sound after a first tap. */
  addEventListener('pointerdown', () => { SEJ.music.sync(); }, { once: true });
  document.addEventListener('DOMContentLoaded', () => { openShortLink(); Promise.all([SEJ.loadShared(), SEJ.batch.load()]).then(route); });
})();
