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
    if (lesson.talk && lesson.talk.length) slots.push({ key: 'talk', game: { t: 'talk', title: 'Speak Like a Hero', items: lesson.talk } });
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
      voice.say(`Nice to meet you, ${name}!`);
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
    const input = changeMode ? h('input', { class: 'onb-input onb-input-small', id: 'player-name', maxlength: '14', placeholder: 'Type your name', value: s.name || '', autocomplete: 'off', 'aria-label': 'Your name' }) : null;
    const start = () => {
      if (input) SEJ.setName(input.value);
      store.state.hero = chosen;
      store.state.onboarded = true;
      store.save();
      sfx.fanfare();
      fx.confetti(110);
      fx.fireworks(5);
      SEJ.music.start();
      if (!changeMode && store.state.name) voice.say(`Let's go, ${store.state.name}!`);
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
          voice.say(`Hello! I am ${hero.name}.`);
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
        !changeMode && h('button', { class: 'link-skip link-skip-light', type: 'button', onclick: () => go('#/welcome') }, '← Change my name'))));
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
      voice.say(`Hello, ${name}!`);
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
      h('a', { class: 'bar-btn', href: '#/teacher', 'aria-label': 'Teacher mode', title: 'Teacher mode' }, '🛠️'),
      s.name
        ? h('a', { class: 'player', href: '#/heroes', 'aria-label': `${s.name}. Change your name or hero` }, SEJ.heroFace(s.hero), h('span', { class: 'player-name', text: s.name }))
        : h('a', { class: 'player', href: '#/heroes', 'aria-label': 'Change your hero' }, SEJ.heroFace(s.hero)));
  }

  function map() {
    const lessons = SEJ.lessons();
    const nextUp = lessons.find((l) => lessonStars(l).played < lessonStars(l).slots);
    const hero = store.state.hero;
    const body = h('main', { class: 'map-body' });
    body.append(h('section', { class: 'map-hero' },
      SEJ.scene('sky'),
      h('div', { class: 'map-hero-inner' },
        h('h1', { class: 'logo-word big' }, 'Hero Quest'),
        store.state.name
          ? h('p', { class: 'tagline' }, `Hello, ${store.state.name}! Ready to be an English superhero?`)
          : h('div', { class: 'name-card enter-pop' }, h('p', { class: 'name-q' }, 'What’s your name? ', h('small', { lang: 'bn', text: 'তোমার নাম লেখো' })), nameForm('name-form-big', true)),
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
        path.append(h('a', {
          class: `node pos${i % 4} ${st.played === st.slots ? 'complete' : ''} ${isNext ? 'next' : ''}`,
          href: `#/lesson/${l.code}`,
          'aria-label': `Lesson ${l.code}: ${l.title}. ${st.got} of ${st.max} stars`,
          'data-code': l.code,
        },
        h('span', { class: 'node-circle' }, SEJ.sticker(l.emoji, 'node-art'), isNext && h('span', { class: 'node-flag' }, SEJ.heroImg(hero, 'node-hero'), h('span', { class: 'play-tag', text: 'PLAY!' }))),
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
        (l.words || []).length ? h('section', { 'aria-label': 'Power words' }, h('h2', { class: 'section-title' }, 'Power Words ', h('small', { lang: 'bn', text: 'চাপ দিয়ে শোনো' })), words) : null)));
  }

  /* ---------- playing and results ---------- */
  function play(code, key) {
    const l = SEJ.lesson(code);
    if (!l) return go('#/map');
    const slots = slotsFor(l);
    const slot = slots.find((s) => s.key === key);
    if (!slot) return go(`#/lesson/${code}`);
    SEJ.music.sync();
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
    root().replaceChildren(h('div', { class: `results ${big ? 'mission-done' : ''}` },
      h('div', { class: 'rays', 'aria-hidden': 'true' }),
      h('div', { class: 'result-card enter-pop', role: 'status' },
        h('div', { class: 'result-top' }, SEJ.heroImg(heroId, 'result-hero'), big && SEJ.sticker('🏅', 'medal')),
        h('h1', { class: 'logo-word', text: heading }),
        h('div', { class: 'result-stars', role: 'img', 'aria-label': `${res.stars} of 3 stars` }, stars),
        h('p', { class: 'result-line', text: line }),
        h('div', { class: 'result-stats' },
          h('span', { class: 'stat' }, '⭐ ', scoreNum, ' points'),
          h('span', { class: 'stat' }, '🔥 ', h('b', { text: res.best }), ' streak'),
          h('span', { class: 'stat' }, '🎯 ', h('b', { text: `${res.perfect}/${res.total}` }), ' first try')),
        h('div', { class: 'result-actions' },
          next
            ? h('a', { class: 'cta gummy g-green cta-big', href: `#/play/${l.code}/${next.key}`, id: 'next-game' }, 'Next Game ▶')
            : h('a', { class: 'cta gummy g-green cta-big', href: `#/lesson/${l.code}`, id: 'next-game' }, 'Finish 🎉'),
          h('button', { class: 'soft-btn', onclick: () => play(l.code, key) }, '↻ Play again'),
          h('a', { class: 'soft-btn', href: `#/lesson/${l.code}` }, '🗺️ All missions')))));
    /* Stars stamp on one at a time, then the crowd cheers. */
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
      voice.say(big ? `Mission complete${name ? ', ' + name : ''}! You are a hero!` : `${heading} ${name ? 'Well done, ' + name + '!' : ''}`);
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
    if (page === 'teacher') return SEJ.builder.render(root(), a);
    if (page === 'heroes') return heroStep(true);
    if (page === 'welcome') return a === 'hero' ? heroStep(false) : nameStep();
    /* The home page greets a first-time visitor with name, then hero, then the map.
       Direct game and lesson links skip this and open straight away. */
    if ((!page || page === 'map') && !(store.state.onboarded || store.state.name)) {
      history.replaceState(null, '', location.pathname + location.search + '#/welcome');
      return nameStep();
    }
    if (page === 'lesson') return lessonPage(a);
    if (page === 'play') return play(a, b);
    return map();
  }
  /* Short links from the curriculum sheet:
     ?game=1.3-2 opens the second game of Lesson 1.3 straight away, ?game=1.3-talk its speaking round. */
  function openShortLink() {
    const q = new URLSearchParams(location.search);
    const game = q.get('game');
    const lesson = q.get('lesson');
    if (!game && !lesson) return;
    const keep = q.get('test') ? '?test=1' : '';
    let target = `#/lesson/${lesson}`;
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
  document.addEventListener('DOMContentLoaded', () => { openShortLink(); route(); });
})();
