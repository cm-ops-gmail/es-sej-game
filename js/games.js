/* The game host (scoring, cheering, hints, results) and the 14 game templates. */
(function () {
  'use strict';
  const { h, shuffle, pick, sfx, fx, buzz, voice, clean } = SEJ;
  const CHEERS = ['AWESOME!', 'SUPER!', 'WOW!', 'GREAT!', 'BRILLIANT!', 'HERO MOVE!', 'YES!', 'AMAZING!', 'BOOM!', 'FANTASTIC!'];
  const NUDGES = ['Almost!', 'Try again!', 'You can do it!', 'So close!', 'One more try!'];
  const GUMMY = ['g-pink', 'g-blue', 'g-green', 'g-orange', 'g-violet', 'g-aqua'];
  const speed = () => (SEJ.testMode ? 0.04 : 1);
  /* Long reference games show a fresh mix each time, so a round stays short for juniors. */
  const CAP = { sort: 12, anagram: 8, spell: 8, tf: 10, blank: 10, unjumble: 8, quiz: 10, match: 10, boxes: 8 };
  const stag = (list, base = 0) => { list.forEach((el, i) => el.style.setProperty('--i', base + i)); return list; };

  /* ---------- how each template is presented ---------- */
  SEJ.TEMPLATES = {
    unjumble: { name: 'Sentence Train', icon: '🚂', theme: 'hills', en: 'Put the words on the train in the right order!', bn: 'শব্দগুলো সঠিক ক্রমে সাজাও!', ref: 'Unjumble' },
    sort: { name: 'Sort Party', icon: '🧺', theme: 'party', en: 'Which basket does it go in?', bn: 'কার্ডটি কোন ঝুড়িতে যাবে?', ref: 'Group sort' },
    anagram: { name: 'Magic Letters', icon: '🔮', theme: 'space', en: 'Tap the letters to build the word!', bn: 'অক্ষরগুলো সাজিয়ে শব্দ তৈরি করো!', ref: 'Anagram' },
    spell: { name: 'Listen & Spell', icon: '👂', theme: 'candy', en: 'Listen, then spell the word!', bn: 'শোনো, তারপর বানান করো!', ref: 'Spell the word' },
    blank: { name: 'Missing Word', icon: '🧩', theme: 'beach', en: 'Pick the word that fits!', bn: 'সঠিক শব্দটি বেছে নাও!', ref: 'Complete the sentence' },
    match: { name: 'Match Makers', icon: '🔗', theme: 'ocean', en: 'Tap a card, then tap its match!', bn: 'কার্ডে চাপ দাও, তারপর তার জোড়ায় চাপ দাও!', ref: 'Match up' },
    find: { name: 'Balloon Pop', icon: '🎈', theme: 'sky', en: 'Pop the balloon that matches!', bn: 'মিলে যাওয়া বেলুনটি ফাটাও!', ref: 'Find the match' },
    pair: { name: 'Pair or No Pair', icon: '🤝', theme: 'garden', en: 'Do these two go together?', bn: 'এরা দুটি কি একসাথে যায়?', ref: 'Pair or no pair' },
    tf: { name: 'Quick Check', icon: '⚡', theme: 'jungle', en: 'Choose fast, before time runs out!', bn: 'সময় শেষ হওয়ার আগে বেছে নাও!', ref: 'True or false' },
    quiz: { name: 'Hero Quiz', icon: '❓', theme: 'sky', en: 'Choose the right answer!', bn: 'সঠিক উত্তরটি বেছে নাও!', ref: 'Quiz / Gameshow quiz' },
    whack: { name: 'Pop-Up Chicks', icon: '🐥', theme: 'garden', en: 'Tap the right words when they pop up!', bn: 'সঠিক কথাগুলো দেখা দিলেই চাপ দাও!', ref: 'Whack-a-mole' },
    boxes: { name: 'Mystery Boxes', icon: '🎁', theme: 'fiesta', en: 'Open a box and answer the question!', bn: 'একটি বাক্স খোলো আর উত্তর দাও!', ref: 'Open the box' },
    plane: { name: 'Sky Pilot', icon: '✈️', theme: 'sky', en: 'Fly into the cloud with the right answer!', bn: 'সঠিক উত্তরের মেঘে বিমান চালাও!', ref: 'Airplane' },
    talk: { name: 'Hero Talk', icon: '🎤', theme: 'fiesta', en: 'Listen, then say it in English!', bn: 'শোনো, তারপর ইংরেজিতে বলো!', ref: 'Speaking round' },
  };

  /* ---------- host ---------- */
  function createHost(root, lesson, slot, game, opts) {
    const meta = SEJ.TEMPLATES[game.t];
    const heroId = SEJ.store.state.hero || lesson.hero;
    const timers = new Set();
    let alive = true, total = 1, done = 0, score = 0, shown = 0, combo = 0, best = 0, perfect = 0, itemMisses = 0, doubleNext = false;

    const stage = h('main', { class: 'stage', id: 'stage' });
    const fill = h('span', { class: 'progress-fill' });
    const runner = SEJ.heroFace(heroId, 'progress-runner');
    const scoreEl = h('span', { class: 'score-num', text: '0' });
    const scoreBox = h('div', { class: 'score', 'aria-label': 'Score' }, h('span', { class: 'score-star', 'aria-hidden': 'true', text: '⭐' }), scoreEl);
    const comboEl = h('div', { class: 'combo', 'aria-hidden': 'true' });
    const buddyImg = SEJ.heroImg(heroId);
    const buddy = h('div', { class: 'buddy', 'aria-hidden': 'true' }, buddyImg);
    /* No hints: a clock instead. Quick, careful answers earn the most points. */
    const clockNum = h('b', { text: '0:00' });
    const clock = h('div', { class: 'game-clock', 'aria-label': 'Time', title: 'Faster answers earn more points' }, h('span', { 'aria-hidden': 'true', text: '⏱' }), clockNum);
    const began = performance.now();
    let itemBegan = began;
    const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const screen = h('div', { class: 'game-screen', 'data-template': game.t },
      SEJ.scene(game.show ? 'stage' : meta.theme),
      buddy,
      h('header', { class: 'game-bar' },
        h('button', { class: 'bar-btn', 'aria-label': 'Leave the game', title: 'Leave', onclick: opts.onExit }, '✕'),
        h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Game progress' }, fill, runner),
        scoreBox,
        clock,
        SEJ.ui.soundButton('bar-btn')),
      h('div', { class: 'game-title' },
        h('h1', { text: game.title }),
        h('p', { class: 'how' }, h('span', { text: game.prompt || meta.en }), ' ', h('span', { class: 'bn', lang: 'bn', text: game.bn || meta.bn }))),
      stage, comboEl);
    root.replaceChildren(screen);

    const countUp = () => {
      const start = shown, end = score, t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 420);
        scoreEl.textContent = Math.round(start + (end - start) * k);
        if (k < 1 && alive) requestAnimationFrame(tick);
      };
      shown = score;
      requestAnimationFrame(tick);
    };
    const heroMood = (cls) => {
      buddy.classList.remove('joy', 'sad');
      void buddy.offsetWidth;
      buddy.classList.add(cls);
      clearTimeout(api._bt);
      api._bt = setTimeout(() => buddy.classList.remove('joy', 'sad'), 1100);
    };

    const api = {
      stage, game, lesson, heroId, screen, target: () => null,
      after(ms, fn) {
        const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms * speed());
        timers.add(id);
        return id;
      },
      every(ms, fn) {
        const id = setInterval(() => { if (alive) fn(); }, ms * speed());
        timers.add(id);
        return id;
      },
      clear(id) { clearTimeout(id); clearInterval(id); timers.delete(id); },
      get alive() { return alive; },
      setTotal(n) { total = Math.max(1, n); api.syncProgress(); },
      syncProgress() {
        const pct = Math.round((done / total) * 100);
        fill.style.width = pct + '%';
        runner.style.left = pct + '%';
      },
      cheer(text, mood = 'up') {
        const name = SEJ.store.state.name;
        if (mood === 'up' && name && name.length <= 10 && /^[A-Z ]+!$/.test(text) && text.length <= 11 && Math.random() < 0.4) text = `${text.slice(0, -1)}, ${name.toUpperCase()}!`;
        fx.pow(text, mood === 'up' ? 'good' : 'soft');
        heroMood(mood === 'up' ? 'joy' : 'sad');
      },
      /* A correct tap inside a multi-tap item (a letter, a word). */
      hit(el, step = 0) {
        sfx.tick(step);
        buzz(14);
        fx.burstAt(el, 7);
        fx.play(el, 'is-hit');
      },
      /* A wrong tap costs 2 points and breaks the streak. There are no hints: the child tries again. */
      miss(el) {
        itemMisses++;
        if (score > 0) { score = Math.max(0, score - 2); countUp(); }
        sfx.wrong();
        buzz([80, 50, 80]);
        fx.play(el, 'is-wrong');
        combo = 0;
        comboEl.classList.remove('on');
        api.cheer(pick(NUDGES), 'down');
      },
      showHint() { /* Hints were removed: every answer is the child's own. */ },
      /* Finishes one item: awards points, cheers, says the English line, then moves on. */
      itemDone(el, line, next, { wait = 900 } = {}) {
        const first = itemMisses === 0;
        if (first) { perfect++; combo++; best = Math.max(best, combo); } else combo = 0;
        /* Points: 10 for a first try, 5 after one miss, 2 after more. Up to 10 more for speed (gone after 15 seconds),
           and a streak bonus for first tries in a row. So fewer mistakes and less time both put a student higher. */
        const misses = itemMisses, now = performance.now();
        const quick = Math.max(0, Math.round(10 * (1 - (now - itemBegan) / 15000)));
        itemBegan = now;
        itemMisses = 0;
        done++;
        let pts = (first ? 10 : misses === 1 ? 5 : 2) + (first ? quick : Math.round(quick / 2)) + (first ? Math.min(combo, 5) * 2 : 0);
        if (doubleNext) { pts *= 2; doubleNext = false; }
        score += pts;
        countUp();
        fx.flyStars(el, scoreBox, first ? 3 : 1);
        api.after(620, () => fx.play(scoreBox, 'jelly'));
        api.syncProgress();
        sfx.correct(combo);
        sfx.sparkle();
        if (first) sfx.coin();
        buzz([30, 30, 60]);
        fx.play(el, 'is-right');
        fx.burstAt(el, 26, first ? ['⭐', '✨'] : null);
        api.cheer(combo >= 3 ? `${combo} IN A ROW!` : pick(CHEERS));
        if (combo >= 3) {
          comboEl.textContent = `🔥 ${combo} streak`;
          comboEl.classList.add('on');
          fx.play(comboEl, 'jelly');
          if (combo % 3 === 0) { fx.heroFly(heroId); sfx.streak(); fx.fireworks(2, 260); }
        }
        /* Like the reference games, a right answer isn't read aloud. Sound and motion celebrate it. */
        void line;
        if (next) api.after(wait, next);
      },
      /* Moves on after a question that can't be retried (time ran out, true/false). */
      itemFailed(next, wait = 1500) {
        done++;
        itemMisses = 0;
        itemBegan = performance.now() + wait;
        api.syncProgress();
        api.after(wait, next);
      },
      doubleNext() { doubleNext = true; },
      finish() {
        if (!alive) return;
        const ratio = perfect / Math.max(1, done);
        const stars = ratio >= 0.85 ? 3 : ratio >= 0.5 ? 2 : 1;
        api.destroy();
        voice.stop();
        opts.onFinish({ stars, score, best, perfect, total: done, time: Math.round((performance.now() - began) / 1000) });
      },
      destroy() {
        alive = false;
        timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
        timers.clear();
        if (api.cleanup) api.cleanup();
      },
    };
    const tickClock = setInterval(() => { if (!alive || !clockNum.isConnected) return clearInterval(tickClock); clockNum.textContent = mmss((performance.now() - began) / 1000); }, 500);
    SEJ.music.setTheme(game.show ? 'stage' : meta.theme);
    return api;
  }

  /* ---------- reusable bits ---------- */
  const speakBtn = (text, label = 'Hear it') => h('button', {
    class: 'speak-btn', 'aria-label': label, title: label,
    onclick: (e) => { sfx.tap(); fx.play(e.currentTarget, 'jelly'); voice.say(typeof text === 'function' ? text() : text); },
  }, '🔊');
  const art = (e, cls = 'big-art') => (e ? SEJ.sticker(e, cls) : null);

  /* Runs a list of items one at a time. */
  function sequence(host, items, showItem) {
    let i = 0;
    host.setTotal(items.length);
    const next = () => {
      if (i >= items.length) return host.finish();
      const item = items[i++];
      host.stage.replaceChildren();
      showItem(item, next);
    };
    next();
  }
  const sample = (t, list) => {
    const cap = CAP[t];
    return cap && list.length > cap ? shuffle(list).slice(0, cap) : list;
  };

  /* ---------- 1. Sentence Train (Unjumble) ---------- */
  function unjumble(host) {
    sequence(host, sample('unjumble', host.game.items), (raw, next) => {
      const parts = raw.includes('|') ? raw.split('|') : ['', raw];
      const emoji = parts[0].trim(), sentence = parts.slice(1).join('|').trim();
      const stop = (sentence.match(/[.?!]+$/) || [''])[0];
      const tokens = sentence.slice(0, sentence.length - stop.length).split(/\s+/);
      let pos = 0;
      const slots = stag(tokens.map((_, n) => h('span', { class: `car car${n % 6}` }, h('span', { class: 'car-word', text: '' }))));
      const train = h('div', { class: 'train drop-train' },
        h('span', { class: 'engine', 'aria-hidden': 'true' }, '🚂', h('span', { class: 'smoke s1' }), h('span', { class: 'smoke s2' })),
        slots, h('span', { class: 'stop-mark', text: stop }));
      const pool = h('div', { class: 'chip-pool' });
      let order = shuffle(tokens.map((t, i) => ({ t, i })));
      if (tokens.length > 1 && order.every((o, i) => o.i === i)) order = order.reverse();
      const use = (chip, word) => {
        if (word !== tokens[pos]) return host.miss(chip);
        slots[pos].classList.add('full');
        slots[pos].firstChild.textContent = word;
        fx.play(slots[pos], 'jelly');
        chip.disabled = true;
        chip.classList.add('used');
        host.hit(slots[pos], pos);
        pos++;
        if (pos === tokens.length) {
          train.classList.add('chug');
          sfx.whoosh();
          host.itemDone(train, sentence, next, { wait: 1300 });
        }
      };
      const chips = order.map(({ t }, n) => {
        const chip = h('button', { class: `chip gummy ${GUMMY[n % GUMMY.length]} enter`, text: t });
        chip.style.setProperty('--i', n);
        SEJ.tapOrDrag(chip, '.drop-train', () => { if (!chip.disabled) use(chip, t); });
        pool.append(chip);
        return chip;
      });
      host.target = () => (pos < tokens.length ? chips.find((c) => !c.disabled && c.textContent === tokens[pos]) : null);
      host.stage.append(h('div', { class: 'train-panel enter' }, art(emoji), h('div', { class: 'rail' }, train)), pool);
    });
  }

  /* ---------- 2. Sort Party (Group sort) ---------- */
  function balanced(cards, groups, cap) {
    if (cards.length <= cap) return cards;
    const per = Math.floor(cap / groups.length);
    return groups.flatMap((_, g) => shuffle(cards.filter((c) => c[1] === g)).slice(0, per));
  }
  function sort(host) {
    const groups = host.game.groups;
    const cards = shuffle(balanced(host.game.cards, groups, CAP.sort));
    const counts = groups.map(() => 0);
    const bins = stag(groups.map((g, i) => h('button', { class: `bin gummy ${GUMMY[i % GUMMY.length]} enter`, 'data-bin': i, 'aria-label': `Put in ${g.n}` },
      art(g.e || '🧺', 'bin-art'),
      h('span', { class: 'bin-name', text: g.n }),
      h('span', { class: 'bin-count', text: '0' }))));
    const slot = h('div', { class: 'sort-slot' });
    const left = h('p', { class: 'cards-left' });
    host.stage.append(slot, left, h('div', { class: `bins bins-${groups.length}` }, bins));
    host.setTotal(cards.length);
    let i = 0, cur = null, curEl = null, locked = false;
    const place = (binIdx, binEl) => {
      if (locked) return;
      if (binIdx !== cur[1]) return host.miss(curEl);
      locked = true;
      counts[binIdx]++;
      binEl.querySelector('.bin-count').textContent = counts[binIdx];
      fx.play(binEl, 'jelly');
      const a = curEl.getBoundingClientRect(), b = binEl.getBoundingClientRect();
      curEl.style.transition = `transform ${0.36 * Math.max(speed(), 0.1)}s cubic-bezier(.5,-.3,.7,1), opacity .36s`;
      curEl.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top - a.top}px) scale(.25) rotate(25deg)`;
      curEl.style.opacity = '.2';
      host.itemDone(binEl, cur[0], show, { wait: 640 });
    };
    function show() {
      if (i >= cards.length) return host.finish();
      cur = cards[i++];
      locked = false;
      left.textContent = cards.length - i === 0 ? 'Last card!' : `${cards.length - i + 1} cards left`;
      curEl = h('div', { class: 'sort-card enter-pop', tabindex: '-1' }, art(cur[2], 'sort-art'), h('span', { text: cur[0] }));
      slot.replaceChildren(curEl);
      const holder = curEl, data = cur;
      SEJ.tapOrDrag(holder, '[data-bin]', (t) => { if (t) place(+t.dataset.bin, t); });
    }
    bins.forEach((b, idx) => b.addEventListener('click', () => place(idx, b)));
    host.target = () => bins[cur[1]];
    show();
  }

  /* ---------- 3 and 4. Magic Letters (Anagram) / Listen & Spell ---------- */
  function letterGame(host, hearFirst) {
    const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
    sequence(host, sample(hearFirst ? 'spell' : 'anagram', host.game.items), (item, next) => {
      const [phrase, clue, emoji] = item;
      const target = phrase.toLowerCase();
      const words = target.split(' ');
      let wordIdx = 0, pos = 0;
      const groups = words.map((w) => w.split('').map(() => h('span', { class: 'slot' })));
      const slotsEl = h('div', { class: 'slots' }, groups.map((g) => h('span', { class: 'slot-word' }, g)));
      const pool = h('div', { class: 'tile-pool' });
      let tiles = [];
      const dealWord = () => {
        const word = words[wordIdx];
        let letters = word.split('');
        if (hearFirst) {
          const n = Math.min(4, Math.max(2, 10 - letters.length));
          for (let i = 0; i < n; i++) letters.push(pick(ABC.filter((c) => !word.includes(c))));
        }
        let order = shuffle(letters);
        if (order.join('') === word && word.length > 1) order = order.reverse();
        pos = 0;
        tiles = order.map((l, idx) => {
          const tile = h('button', { class: `tile gummy ${GUMMY[idx % GUMMY.length]} enter`, text: l, 'aria-label': `Letter ${l}` });
          tile.style.setProperty('--i', idx);
          tile.addEventListener('click', () => pressed(tile, l));
          return tile;
        });
        pool.replaceChildren(...tiles);
      };
      const pressed = (tile, l) => {
        if (tile.disabled) return;
        const word = words[wordIdx];
        if (l !== word[pos]) return host.miss(tile);
        const slot = groups[wordIdx][pos];
        slot.textContent = l;
        slot.classList.add('full');
        fx.play(slot, 'jelly');
        tile.disabled = true;
        tile.classList.add('used');
        host.hit(slot, pos);
        pos++;
        if (pos < word.length) return;
        groups[wordIdx].forEach((s, n) => { s.style.setProperty('--i', n); s.classList.add('wave-up'); });
        wordIdx++;
        if (wordIdx < words.length) {
          sfx.star(wordIdx % 3);
          host.after(420, dealWord);
          return;
        }
        pool.replaceChildren();
        slotsEl.classList.add('solved');
        host.itemDone(slotsEl, target, next, { wait: 1000 });
      };
      host.target = () => (wordIdx < words.length && tiles.find((t) => !t.disabled && t.textContent === words[wordIdx][pos])) || null;
      const canHear = hearFirst || host.game.audio;
      dealWord();
      host.stage.append(
        h('div', { class: 'card letter-card enter' },
          h('div', { class: 'clue-row' }, art(emoji), canHear && speakBtn(target, 'Hear the word')),
          clue && h('p', { class: 'clue', lang: /[ঀ-৿]/.test(clue) ? 'bn' : 'en', text: clue }),
          slotsEl),
        pool);
      if (canHear) host.after(350, () => voice.say(target));
    });
  }

  /* ---------- 5. Missing Word (Complete the sentence) ---------- */
  function blank(host) {
    sequence(host, sample('blank', host.game.items), (item, next) => {
      const [text, wrongs, emoji] = item;
      const m = text.match(/^(.*)\{(.+)\}(.*)$/);
      const answer = m[2];
      const full = m[1] + answer + m[3];
      const gap = h('span', { class: 'gap drop-gap', 'aria-label': 'missing word' }, ' ');
      const sentence = h('p', { class: 'fill-sentence' }, m[1], gap, m[3]);
      const opts = shuffle([answer, ...wrongs]).map((w, i) => {
        const b = h('button', { class: `option gummy ${GUMMY[(i * 2) % GUMMY.length]} enter tingle`, text: w });
        b.style.setProperty('--i', i + 1);
        SEJ.tapOrDrag(b, '.drop-gap', () => {
          if (b.disabled || gap.classList.contains('filled')) return;
          if (w !== answer) { b.disabled = true; b.classList.add('out'); return host.miss(b); }
          gap.textContent = answer;
          gap.classList.add('filled');
          fx.play(gap, 'jelly');
          b.classList.add('right');
          host.itemDone(gap, full, next, { wait: 1100 });
        });
        return b;
      });
      host.target = () => opts.find((b) => b.textContent === answer);
      host.stage.append(
        h('div', { class: 'card fill-card enter' }, art(emoji), sentence, speakBtn(m[1] + ' blank ' + m[3], 'Hear the sentence')),
        h('div', { class: 'option-row' }, opts));
    });
  }

  /* ---------- 6. Match Makers (Match up) ---------- */
  const LINE_COLORS = ['#ff2e93', '#ffb300', '#00d4ff', '#7bdc00', '#ff7a00', '#b061ff'];
  function match(host) {
    const all = sample('match', shuffle(host.game.pairs));
    const size = 5;
    const rounds = [];
    for (let i = 0; i < all.length; i += size) rounds.push(all.slice(i, i + size));
    host.setTotal(all.length);
    let r = 0, colorIdx = 0;
    const showRound = () => {
      if (r >= rounds.length) return host.finish();
      const pairs = rounds[r++];
      let selected = null, left = pairs.length;
      const emojiOnly = pairs.every((p) => clean(p[0]) === '');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'match-lines');
      svg.setAttribute('aria-hidden', 'true');
      const grid = h('div', { class: 'match-grid' }, svg);
      const drawLine = (a, b, color) => {
        const box = grid.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const x1 = ra.right - box.left, y1 = ra.top + ra.height / 2 - box.top, x2 = rb.left - box.left, y2 = rb.top + rb.height / 2 - box.top;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', `M${x1} ${y1} C${x1 + 24} ${y1} ${x2 - 24} ${y2} ${x2} ${y2}`);
        p.setAttribute('stroke', color);
        p.setAttribute('class', 'match-line');
        svg.append(p);
      };
      const finishPair = (a, b, pair) => {
        const color = LINE_COLORS[colorIdx++ % LINE_COLORS.length];
        [a, b].forEach((el) => {
          el.classList.add('matched');
          el.style.setProperty('--match', color);
          el.classList.remove('selected');
          el.disabled = true;
          fx.play(el, 'jelly');
        });
        drawLine(a, b, color);
        selected = null;
        left--;
        host.itemDone(b, emojiOnly ? pair[1] : `${clean(pair[0])}. ${pair[1]}`, left ? null : () => { sfx.whoosh(); showRound(); }, { wait: 1000 });
      };
      const tryPair = (a, b) => {
        const la = a.dataset.side === 'l' ? a : b, rb = a.dataset.side === 'l' ? b : a;
        if (la.dataset.key === rb.dataset.key) finishPair(la, rb, pairs[+la.dataset.key]);
        else { host.miss(b); a.classList.remove('selected'); selected = null; }
      };
      const choose = (el) => {
        if (el.disabled) return;
        sfx.tap();
        if (!selected) { selected = el; el.classList.add('selected'); return; }
        if (selected === el) { el.classList.remove('selected'); selected = null; return; }
        if (selected.dataset.side === el.dataset.side) { selected.classList.remove('selected'); selected = el; el.classList.add('selected'); return; }
        tryPair(selected, el);
      };
      const mk = (text, side, key, i) => {
        const el = h('button', { class: `match-card ${side === 'l' ? 'side-l' : 'side-r'} ${emojiOnly && side === 'l' ? 'emoji-card' : ''} enter`, 'data-side': side, 'data-key': key, text });
        el.style.setProperty('--i', i);
        SEJ.tapOrDrag(el, side === 'l' ? '[data-side="r"]' : '[data-side="l"]', (t) => {
          if (el.disabled) return;
          if (!t) return choose(el);
          if (t.disabled) return;
          if (selected) selected.classList.remove('selected');
          selected = null;
          tryPair(el, t);
        });
        return el;
      };
      const lefts = shuffle(pairs.map((p, i) => i)).map((k, i) => mk(pairs[k][0], 'l', k, i));
      const rights = shuffle(pairs.map((p, i) => i)).map((k, i) => mk(pairs[k][1], 'r', k, i));
      host.target = () => {
        if (selected) {
          const col = selected.dataset.side === 'l' ? rights : lefts;
          return col.find((e) => e.dataset.key === selected.dataset.key);
        }
        return lefts.find((e) => !e.disabled);
      };
      grid.append(h('div', { class: 'match-col col-left' }, lefts), h('div', { class: 'match-col col-right' }, rights));
      host.stage.replaceChildren(grid);
    };
    showRound();
  }

  /* ---------- 7. Balloon Pop (Find the match) ---------- */
  function find(host) {
    const items = host.game.items;
    const answers = items.map((i) => i[1]);
    sequence(host, shuffle(items), (item, next) => {
      const [clue, answer] = item;
      const others = shuffle(answers.filter((a) => a !== answer)).slice(0, 4);
      let locked = false;
      const balloons = shuffle([answer, ...others]).map((a, i) => {
        const b = h('button', { class: `balloon b${i}`, style: { animationDelay: `${-i * 0.7}s` } }, h('span', { text: a }));
        b.addEventListener('click', () => {
          if (locked || b.disabled) return;
          if (a !== answer) { b.disabled = true; b.classList.add('out'); return host.miss(b); }
          locked = true;
          b.classList.add('popped');
          sfx.pop();
          fx.burstAt(b, 30);
          host.itemDone(b, `${a}: ${clue}`, next, { wait: 1000 });
        });
        return b;
      });
      host.target = () => balloons.find((b) => b.textContent === answer);
      host.stage.append(
        h('div', { class: 'card clue-card enter' }, h('p', { class: 'clue-big', text: clue }), speakBtn(clue)),
        h('div', { class: 'balloon-field' }, balloons));
    });
  }

  /* ---------- shared two-choice round for Pair or No Pair and Quick Check ---------- */
  function twoChoice(host, { labels, isFirst, line, why, onRight, seconds, next }) {
    let locked = false, timer = null;
    const decide = (choiceFirst, btn) => {
      if (locked) return;
      locked = true;
      if (timer) host.clear(timer);
      if (choiceFirst === isFirst) {
        btn.classList.add('right');
        if (onRight) onRight();
        host.itemDone(btn, line, next, { wait: 1100 });
      } else {
        host.miss(btn);
        btn.classList.add('wrong');
        btns[isFirst ? 0 : 1].classList.add('right');
        host.itemFailed(next, why ? 2600 : 1600);
      }
    };
    const btns = [
      h('button', { class: 'choice gummy g-green enter', style: { '--i': 1 }, onclick: (e) => decide(true, e.currentTarget) }, labels[0]),
      h('button', { class: 'choice gummy g-pink enter', style: { '--i': 2 }, onclick: (e) => decide(false, e.currentTarget) }, labels[1]),
    ];
    host.target = () => btns[isFirst ? 0 : 1];
    let bar = null;
    if (seconds) {
      bar = h('div', { class: 'time-bar' }, h('span', { style: { animationDuration: `${seconds * speed()}s` } }));
      timer = host.after(seconds * 1000, () => {
        if (locked) return;
        locked = true;
        host.miss(bar);
        btns[isFirst ? 0 : 1].classList.add('right');
        host.cheer("Time's up!", 'down');
        host.itemFailed(next, 1800);
      });
    }
    return { bar, row: h('div', { class: 'choice-row' }, btns) };
  }

  /* ---------- 8. Pair or No Pair ---------- */
  function pair(host) {
    sequence(host, shuffle(host.game.items), (item, next) => {
      const [a, b, yes, ea, eb] = item;
      const cardA = h('div', { class: 'pair-card pc-a flip-in' }, art(ea, 'pair-art'), a && h('strong', { text: a }));
      const cardB = h('div', { class: 'pair-card pc-b flip-in', style: { animationDelay: '.1s' } }, art(eb, 'pair-art'), b && h('strong', { text: b }));
      const wrap = h('div', { class: 'pair-wrap' }, cardA, h('span', { class: 'pair-plus', 'aria-hidden': 'true', text: '+' }), cardB);
      const { row } = twoChoice(host, {
        labels: ['🤝 Pair', '✖ No pair'], isFirst: !!yes, line: b ? `${a} and ${b}` : a, next,
        onRight: () => { wrap.classList.add(yes ? 'hug' : 'apart'); },
      });
      host.stage.append(wrap, row);
    });
  }

  /* ---------- 9. Quick Check (True or false, or any two labels) ---------- */
  function tf(host) {
    const labels = host.game.labels || ['True', 'False'];
    const icons = host.game.labels ? ['🎩', '😎'] : ['✅', '❌'];
    sequence(host, sample('tf', shuffle(host.game.items)), (item, next) => {
      const [text, first, emoji, why] = item;
      const { bar, row } = twoChoice(host, { labels: [`${icons[0]} ${labels[0]}`, `${icons[1]} ${labels[1]}`], isFirst: !!first, line: text, why, seconds: 25, next });
      host.stage.append(
        bar,
        h('div', { class: 'card flag-card' }, art(emoji), h('p', { class: 'clue-big', text }), speakBtn(text)),
        row);
    });
  }

  /* ---------- quiz question, shared by Hero Quiz and Mystery Boxes ---------- */
  function answerTiles(host, q, answer, wrongs, onRight) {
    let locked = false;
    const tiles = shuffle([answer, ...wrongs]).map((a, i) => {
      const t = h('button', { class: `answer gummy ${GUMMY[i % GUMMY.length]} enter`, style: { '--i': i + 1 } }, h('b', { text: 'ABCD'[i] }), h('span', { text: a }));
      t._answer = a;
      t.addEventListener('click', () => {
        if (locked || t.disabled) return;
        if (a !== answer) { t.disabled = true; t.classList.add('out'); return host.miss(t); }
        locked = true;
        t.classList.add('right');
        onRight(t, a);
      });
      return t;
    });
    return { tiles, isLocked: () => locked, lock: () => { locked = true; } };
  }

  /* ---------- 10. Hero Quiz (with Quiz Show mode: timer and power-ups) ---------- */
  function quiz(host) {
    const show = host.game.show;
    const power = { half: true, time: true, double: true };
    const toolbar = show ? h('div', { class: 'power-row' }) : null;
    sequence(host, sample('quiz', shuffle(host.game.items)), (item, next) => {
      const [q, answer, wrongs, emoji] = item;
      let seconds = 40, clock = null;
      const { tiles, isLocked, lock } = answerTiles(host, q, answer, wrongs, (t, a) => {
        if (clock) host.clear(clock);
        host.itemDone(t, a, next, { wait: 1100 });
      });
      host.target = () => tiles.find((t) => t._answer === answer);
      const qEl = h('div', { class: `card quiz-q enter ${show ? 'marquee' : ''}` }, art(emoji), h('p', { class: 'clue-big', text: q }), speakBtn(q, 'Hear the question'));
      const grid = h('div', { class: `answers answers-${tiles.length}` }, tiles);
      host.stage.append(qEl);
      if (show) {
        const clockEl = h('span', { class: 'clock', text: seconds });
        const tool = (key, label, fn, disabled) => h('button', {
          class: 'power gummy g-yellow', disabled: !power[key] || disabled,
          onclick: (e) => { if (isLocked()) return; power[key] = false; e.currentTarget.disabled = true; sfx.star(1); fn(); },
        }, label);
        toolbar.replaceChildren(
          h('span', { class: 'clock-wrap' }, '⏱️', clockEl),
          tool('half', '50:50', () => {
            shuffle(tiles.filter((t) => t._answer !== answer && !t.disabled)).slice(0, Math.floor(tiles.length / 2)).forEach((t) => { t.disabled = true; t.classList.add('out'); });
          }, tiles.length < 3),
          tool('double', '×2 Score', () => { host.doubleNext(); host.cheer('DOUBLE POINTS!'); }),
          tool('time', '+15 Time', () => { seconds += 15; clockEl.textContent = seconds; fx.play(clockEl, 'jelly'); }));
        host.stage.append(toolbar);
        clock = host.every(1000, () => {
          seconds--;
          clockEl.textContent = Math.max(0, seconds);
          clockEl.classList.toggle('low', seconds <= 8);
          if (seconds > 0 || isLocked()) return;
          lock();
          host.clear(clock);
          host.miss(clockEl);
          tiles.find((t) => t._answer === answer).classList.add('right');
          host.cheer("Time's up!", 'down');
          host.itemFailed(next, 1800);
        });
      }
      host.stage.append(grid);
    });
  }

  /* ---------- 11. Pop-Up Chicks (Whack-a-mole) ---------- */
  function whack(host) {
    const { good, bad } = host.game;
    const left = new Set(good);
    let holes = [], busy = new Set();
    host.setTotal(good.length);
    const field = h('div', { class: 'holes' });
    for (let i = 0; i < 6; i++) {
      const hole = h('div', { class: 'hole' });
      holes.push(hole);
      field.append(hole);
    }
    host.stage.append(field);
    const pop = (text, isGood) => {
      const free = holes.filter((x) => !busy.has(x));
      if (!free.length) return null;
      const hole = pick(free);
      busy.add(hole);
      const b = h('button', { class: 'chick' }, h('span', { class: 'chick-text', text }), h('span', { class: 'chick-body', 'aria-hidden': 'true', text: pick(['🐥', '🐤', '🐣']) }));
      b._good = isGood;
      b._text = text;
      const remove = () => { b.classList.add('hide'); host.after(220, () => { b.remove(); busy.delete(hole); }); };
      const life = host.after(3800, remove);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        b.disabled = true;
        host.clear(life);
        if (!isGood) {
          host.miss(b);
          remove();
          return;
        }
        left.delete(text);
        sfx.pop();
        b.classList.add('caught');
        host.itemDone(b, text, null);
        remove();
        if (!left.size) { host.clear(loop); host.after(1000, () => host.finish()); }
      });
      hole.append(b);
      return b;
    };
    const spawn = () => {
      if (busy.size >= 3) return;
      const showing = new Set(holes.map((x) => x.querySelector('.chick')).filter(Boolean).map((c) => c._text));
      const goods = [...left].filter((t) => !showing.has(t));
      const bads = bad.filter((t) => !showing.has(t));
      if (goods.length && (Math.random() < 0.55 || !bads.length)) pop(pick(goods), true);
      else if (bads.length) pop(pick(bads), false);
    };
    host.target = () => {
      const live = holes.map((x) => x.querySelector('.chick:not([disabled])')).filter((c) => c && c._good);
      if (live.length) return live[0];
      const showing = new Set(holes.map((x) => x.querySelector('.chick')).filter(Boolean).map((c) => c._text));
      const t = [...left].find((g) => !showing.has(g));
      return t ? pop(t, true) : null;
    };
    spawn();
    host.after(450, spawn);
    const loop = host.every(1300, spawn);
  }

  /* ---------- 12. Mystery Boxes (Open the box) ---------- */
  function boxes(host) {
    const items = sample('boxes', host.game.items);
    host.setTotal(items.length);
    const grid = h('div', { class: 'box-grid' });
    let left = items.length;
    const nextBox = () => btns.find((b) => !b.classList.contains('open'));
    const btns = items.map((item, i) => {
      const b = h('button', { class: `gift gift${i % 6} enter`, style: { '--i': i }, 'aria-label': `Open box ${i + 1}` }, h('span', { class: 'lid' }), h('b', { text: i + 1 }));
      b.addEventListener('click', () => {
        if (b.classList.contains('open')) return;
        sfx.pop();
        fx.burstAt(b, 18);
        const [q, answer, wrongs, emoji] = item;
        const { tiles } = answerTiles(host, q, answer, wrongs, (t, a) => {
          host.itemDone(t, a, () => {
            overlay.remove();
            b.classList.add('open');
            b.disabled = true;
            b.replaceChildren(SEJ.sticker(emoji || '⭐', 'gift-done'));
            left--;
            host.target = nextBox;
            if (!left) host.after(500, () => host.finish());
          }, { wait: 1000 });
        });
        const overlay = h('div', { class: 'box-overlay' }, h('div', { class: 'card box-q enter-pop' }, art(emoji), h('p', { class: 'clue-big', text: q }), speakBtn(q), h('div', { class: 'answers answers-2 in-box' }, tiles)));
        host.target = () => tiles.find((t) => t._answer === answer);
        host.stage.append(overlay);
      });
      grid.append(b);
      return b;
    });
    host.target = nextBox;
    host.stage.append(grid);
  }

  /* ---------- 13. Sky Pilot (Airplane) ---------- */
  function plane(host) {
    const lanes = [0, 1, 2];
    const promptEl = h('p', { class: 'clue-big', text: '' });
    const laneEls = lanes.map((i) => h('button', { class: 'lane', 'aria-label': `Fly to lane ${i + 1}`, onclick: () => setLane(i) }));
    const jet = h('div', { class: 'jet', 'aria-hidden': 'true' }, h('span', { class: 'jet-trail' }), h('span', { class: 'jet-body', text: '✈️' }));
    const sky = h('div', { class: 'skyway', tabindex: '0', 'aria-label': 'Use the up and down arrows, or tap a lane' }, h('div', { class: 'sky-scroll' }), laneEls, jet);
    host.stage.append(h('div', { class: 'card clue-card plane-q enter' }, promptEl), sky);
    let lane = 1, raf = 0, clouds = [], x = 0, right = 0, cur = null, advance = null;
    function setLane(i) {
      lane = Math.max(0, Math.min(2, i));
      jet.style.top = `${(lane * 100) / 3 + 100 / 6}%`;
      laneEls.forEach((l, n) => l.classList.toggle('on', n === lane));
      sfx.tap();
    }
    const onKey = (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); setLane(lane - 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setLane(lane + 1); }
    };
    addEventListener('keydown', onKey);
    host.cleanup = () => { removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
    const launch = () => {
      const [, answer, wrongs] = cur;
      const words = shuffle([answer, ...wrongs.slice(0, 2)]);
      right = words.indexOf(answer);
      clouds.forEach((c) => c.remove());
      clouds = words.map((w, i) => {
        const c = h('div', { class: 'cloud', style: { top: `${(i * 100) / 3 + 100 / 6}%` } }, h('span', { text: w }));
        sky.append(c);
        return c;
      });
      x = 100;
      let last = performance.now();
      const rate = SEJ.testMode ? 90 : 10.5; /* percent of the sky per second */
      const step = (now) => {
        const dt = Math.min(60, now - last) / 1000;
        last = now;
        x -= rate * dt;
        clouds.forEach((c) => { c.style.left = x + '%'; });
        if (x <= 17) {
          if (lane === right) {
            clouds[right].classList.add('hit');
            jet.classList.add('zoom');
            host.after(350, () => jet.classList.remove('zoom'));
            const said = cur[0].replace(/_+/, answer);
            host.itemDone(clouds[right], said, advance, { wait: 900 });
            return;
          }
          host.miss(jet);
          clouds.forEach((c) => c.remove());
          clouds = [];
          host.after(700, launch);
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    host.target = () => laneEls[right];
    sequence({ setTotal: host.setTotal, stage: { replaceChildren() {} }, finish: host.finish }, shuffle(host.game.items), (item, next) => {
      cur = item;
      advance = next;
      promptEl.textContent = item[0];
      fx.play(promptEl, 'jelly');
      host.after(300, launch);
    });
    setLane(1);
  }

  /* ---------- 14. Hero Talk (speaking round for every lesson) ---------- */
  function talk(host) {
    sequence(host, host.game.items, (item, next) => {
      const [prompt, frame, example] = item;
      let finished = false;
      const heard = h('p', { class: 'heard', role: 'status', 'aria-live': 'polite' });
      const doneBtn = h('button', { class: 'cta gummy g-green', onclick: () => finish() }, '✅ I said it!');
      const finish = () => {
        if (finished) return;
        finished = true;
        host.itemDone(doneBtn, null, next, { wait: 750 });
      };
      const exampleEl = h('p', { class: 'example', hidden: true, text: example });
      const showExample = h('button', {
        class: 'soft-btn',
        onclick: (e) => { sfx.tap(); exampleEl.hidden = false; e.currentTarget.hidden = true; voice.say(example); fx.play(exampleEl, 'jelly'); },
      }, '💡 Show me an example');
      const eq = h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('i'));
      const micBtn = SEJ.mic.available && h('button', {
        class: 'cta gummy g-pink mic-btn',
        onclick: async (e) => {
          const btn = e.currentTarget;
          btn.classList.add('listening');
          btn.replaceChildren(eq, ' Listening...');
          heard.textContent = '';
          const said = await SEJ.mic.listen();
          if (!host.alive) return;
          btn.classList.remove('listening');
          btn.textContent = '🎤 Say it again';
          if (!said) { heard.textContent = 'I couldn’t hear you. Try once more, or tap “I said it!”.'; return; }
          const close = SEJ.mic.match(said, example);
          heard.textContent = `I heard: “${said}”`;
          host.cheer(close >= 0.5 ? 'PERFECT!' : 'NICE TRY!');
          fx.burstAt(btn, 18, ['⭐']);
          host.after(1200, finish);
        },
      }, '🎤 Tap and speak');
      host.target = () => doneBtn;
      host.stage.append(h('div', { class: 'card talk-card enter' },
        h('div', { class: 'talk-top' }, SEJ.heroFace(host.heroId, 'talk-face'), h('p', { class: 'talk-q', text: prompt }), speakBtn(prompt)),
        h('p', { class: 'frame', text: frame }),
        exampleEl, showExample, heard,
        h('div', { class: 'talk-actions' }, micBtn, doneBtn)));
      voice.say(prompt, { max: 4500 });
    });
  }

  /* Shared with js/games2.js, which adds the other Wordwall game types. */
  const ENGINES = { unjumble, sort, anagram: (x) => letterGame(x, false), spell: (x) => letterGame(x, true), blank, match, find, pair, tf, quiz, whack, boxes, plane, talk };

  /* Item count, used on cards and by the checks. */
  SEJ.itemCount = (g) => (g.items || g.cards || g.pairs || g.good || []).length;

  SEJ.ENGINES = ENGINES;
  SEJ.gameKit = { sequence, sample, answerTiles, twoChoice, speakBtn, art, stag, GUMMY, speed, letterGame };

  SEJ.playGame = function (root, lesson, slot, game, opts) {
    const host = createHost(root, lesson, slot, game, opts);
    SEJ.current = host;
    ENGINES[game.t](host);
    return host;
  };
})();
