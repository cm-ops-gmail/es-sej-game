/* The other Wordwall game types, built on the same host as js/games.js:
   scoring, hints, right and wrong feedback, and results all come from there. */
(function () {
  'use strict';
  const { h, shuffle, pick, sfx, fx, voice } = SEJ;
  const { sequence, sample, answerTiles, speakBtn, art, GUMMY, speed } = SEJ.gameKit;
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const isPic = (x) => /^https?:\/\//.test(x || '');
  /* A picture can be an emoji or an https link to an image. */
  const picture = (x, cls = 'big-art') => (isPic(x) ? h('img', { class: `pic ${cls}`, src: x, alt: '', draggable: 'false' }) : art(x, cls));
  const done = (host) => host.finish();

  Object.assign(SEJ.TEMPLATES, {
    flash: { name: 'Flash Cards', icon: '🃏', theme: 'magic', en: 'Say it, then flip the card!', bn: 'আগে বলো, তারপর কার্ড উল্টাও!', ref: 'Flash cards' },
    speakcards: { name: 'Speaking Cards', icon: '🗣️', theme: 'fiesta', en: 'Take a card and talk about it!', bn: 'একটি কার্ড নাও আর তা নিয়ে কথা বলো!', ref: 'Speaking cards' },
    wheel: { name: 'Spin the Wheel', icon: '🎡', theme: 'party', en: 'Spin the wheel and do what it says!', bn: 'চাকা ঘোরাও আর যা আসে তা করো!', ref: 'Spin the wheel' },
    pairs: { name: 'Matching Pairs', icon: '🎴', theme: 'garden', en: 'Turn two cards to find a pair!', bn: 'দুটি কার্ড উল্টে জোড়া খুঁজে বের করো!', ref: 'Matching pairs' },
    type: { name: 'Type the Answer', icon: '⌨️', theme: 'sky', en: 'Type the answer with the letter keys!', bn: 'অক্ষর চেপে উত্তর লেখো!', ref: 'Type the answer' },
    hangman: { name: 'Save the Balloon', icon: '🎈', theme: 'hills', en: 'Guess the letters before the balloons fly away!', bn: 'বেলুন উড়ে যাওয়ার আগে অক্ষরগুলো খুঁজে বের করো!', ref: 'Hangman' },
    wordsearch: { name: 'Word Hunt', icon: '🔍', theme: 'jungle', en: 'Find the words: tap the first letter, then the last!', bn: 'শব্দ খোঁজো: প্রথম অক্ষর, তারপর শেষ অক্ষরে চাপ দাও!', ref: 'Wordsearch' },
    labelled: { name: 'Label It', icon: '📍', theme: 'garden', en: 'Put each label on the right spot!', bn: 'প্রতিটি লেবেল সঠিক জায়গায় বসাও!', ref: 'Labelled diagram' },
    crossword: { name: 'Crossword', icon: '✏️', theme: 'beach', en: 'Read the clue and fill in the word!', bn: 'সূত্রটি পড়ো আর শব্দটি লেখো!', ref: 'Crossword' },
    fliptiles: { name: 'Flip Tiles', icon: '🔄', theme: 'candy', en: 'Flip every tile and read both sides!', bn: 'প্রতিটি টাইল উল্টে দুই পাশ পড়ো!', ref: 'Flip tiles' },
    maze: { name: 'Maze Chase', icon: '🌀', theme: 'space', en: 'Walk through the maze to the right answer!', bn: 'গোলকধাঁধা পার হয়ে সঠিক উত্তরের দিকে যাও!', ref: 'Maze chase' },
    balloonpop: { name: 'Balloon Drop', icon: '🎈', theme: 'sky', en: 'Pop the balloon that matches the cart!', bn: 'গাড়ির সাথে মিলে যাওয়া বেলুনটি ফাটাও!', ref: 'Balloon pop' },
    fruit: { name: 'Flying Fruit', icon: '🍉', theme: 'beach', en: 'Tap the fruit with the right answer!', bn: 'সঠিক উত্তরের ফলে চাপ দাও!', ref: 'Flying fruit' },
    rank: { name: 'Rank Order', icon: '🔢', theme: 'stage', en: 'Tap them in the right order!', bn: 'সঠিক ক্রমে চাপ দাও!', ref: 'Rank order' },
    imagequiz: { name: 'Picture Quiz', icon: '🖼️', theme: 'stage', en: 'The picture appears bit by bit. Answer fast!', bn: 'ছবি ধীরে ধীরে দেখা যাবে। তাড়াতাড়ি উত্তর দাও!', ref: 'Image quiz' },
    speedsort: { name: 'Speed Sorting', icon: '⚡', theme: 'party', en: 'Sort each card as fast as you can!', bn: 'যত দ্রুত পারো কার্ড সাজাও!', ref: 'Speed sorting' },
    winlose: { name: 'Win or Lose', icon: '💰', theme: 'stage', en: 'Play for the points, or pass!', bn: 'পয়েন্টের জন্য খেলো, নয়তো পাস করো!', ref: 'Win or lose quiz' },
    maths: { name: 'Number Fun', icon: '➗', theme: 'space', en: 'Work it out and choose the answer!', bn: 'হিসাব করে সঠিক উত্তর বেছে নাও!', ref: 'Maths generator' },
    memorize: { name: 'Watch & Remember', icon: '👀', theme: 'magic', en: 'Look carefully, then tap what you saw!', bn: 'ভালো করে দেখো, তারপর যা দেখেছ তাতে চাপ দাও!', ref: 'Watch and memorize' },
    magnets: { name: 'Word Magnets', icon: '🧲', theme: 'candy', en: 'Tap the magnets to build the sentence!', bn: 'ম্যাগনেটে চাপ দিয়ে বাক্য সাজাও!', ref: 'Word magnets' },
  });

  /* ---------- Flash Cards: say it, flip, then say if you knew it ---------- */
  function flash(host) {
    sequence(host, shuffle(host.game.items), (item, next) => {
      const [front, back, emoji] = item;
      let flipped = false;
      const card = h('button', { class: 'flip-card enter-pop', 'aria-label': 'Flip the card' },
        h('span', { class: 'flip-inner' },
          h('span', { class: 'flip-face front' }, picture(emoji), h('b', { text: front })),
          h('span', { class: 'flip-face back' }, h('b', { text: back }))));
      const knew = h('button', { class: 'choice gummy g-green', hidden: true }, '😀 I knew it!');
      const notYet = h('button', { class: 'choice gummy g-orange', hidden: true }, '🤔 Not yet');
      const flip = () => { if (flipped) return; flipped = true; card.classList.add('flipped'); sfx.whoosh(); knew.hidden = false; notYet.hidden = false; };
      card.addEventListener('click', flip);
      knew.addEventListener('click', () => host.itemDone(card, '', next, { wait: 500 }));
      notYet.addEventListener('click', () => { host.cheer('Keep practising!', 'down'); host.itemFailed(next, 500); });
      host.target = () => (flipped ? knew : card);
      host.stage.append(h('p', { class: 'note-pill', text: 'Say it out loud, then tap the card' }), card, h('div', { class: 'choice-row' }, knew, notYet));
    });
  }

  /* ---------- Speaking Cards: deal a card, speak, done ---------- */
  function speakcards(host) {
    const deck = shuffle(host.game.items);
    sequence(host, deck, (item, next) => {
      const [prompt, emoji] = item;
      const deal = h('button', { class: 'deck-btn enter-pop', 'aria-label': 'Take a card' }, h('span', { class: 'deck-stack' }, '🂠'), h('b', { text: 'Take a card' }));
      const said = h('button', { class: 'choice gummy g-green', hidden: true }, '🎤 I said it!');
      deal.addEventListener('click', () => {
        sfx.whoosh();
        deal.replaceWith(h('div', { class: 'card speak-card flip-in' }, picture(emoji), h('p', { class: 'clue-big', text: prompt }), speakBtn(prompt)));
        said.hidden = false;
      });
      said.addEventListener('click', () => host.itemDone(said, '', next, { wait: 500 }));
      host.target = () => (said.hidden ? deal : said);
      host.stage.append(deal, h('div', { class: 'choice-row' }, said));
    });
  }

  /* ---------- Spin the Wheel: spin, then do what it lands on ---------- */
  function wheel(host) {
    let left = shuffle(host.game.items);
    host.setTotal(left.length);
    let deg = 0;
    const colors = ['#d8649c', '#3fa4cf', '#cf843f', '#60bc83', '#8d63d2', '#e9c663'];
    const wheelEl = h('div', { class: 'spin-wheel' });
    const result = h('div', { class: 'card spin-result', hidden: true });
    const spinBtn = h('button', { class: 'cta gummy g-green' }, '🎡 Spin!');
    const doneBtn = h('button', { class: 'choice gummy g-green', hidden: true }, '✅ Done!');
    const draw = () => {
      const n = left.length, slice = 360 / n;
      wheelEl.style.background = `conic-gradient(${left.map((_, i) => `${colors[i % colors.length]} ${i * slice}deg ${(i + 1) * slice}deg`).join(',')})`;
      wheelEl.replaceChildren(...left.map((it, i) => h('span', { class: 'spin-label', style: { transform: `rotate(${(i + 0.5) * slice}deg)` } }, h('span', { text: String(it[0]).slice(0, 18) }))));
    };
    let landed = null;
    spinBtn.addEventListener('click', () => {
      if (landed !== null || !left.length) return;
      const n = Math.floor(Math.random() * left.length), slice = 360 / left.length;
      deg = Math.ceil(deg / 360) * 360 + 1440 + (360 - (n + 0.5) * slice);
      wheelEl.style.transition = `transform ${2.6 * speed()}s cubic-bezier(.12,.72,.14,1)`;
      wheelEl.style.transform = `rotate(${deg}deg)`;
      spinBtn.disabled = true;
      for (let i = 0; i < 10; i++) host.after(80 + i * i * 22, () => sfx.tick(i % 5));
      landed = n;
      host.after(2700, () => {
        const [text, emoji] = left[n];
        result.replaceChildren(picture(emoji), h('p', { class: 'clue-big', text }), speakBtn(text));
        result.hidden = false;
        fx.play(result, 'enter-pop');
        doneBtn.hidden = false;
      });
    });
    doneBtn.addEventListener('click', () => {
      if (landed === null) return;
      host.itemDone(doneBtn, '', null);
      left = left.filter((_, i) => i !== landed);
      landed = null;
      result.hidden = true;
      doneBtn.hidden = true;
      spinBtn.disabled = false;
      if (!left.length) host.after(700, () => done(host));
      else { wheelEl.style.transition = 'none'; deg %= 360; wheelEl.style.transform = `rotate(${deg}deg)`; draw(); }
    });
    host.target = () => (doneBtn.hidden ? (spinBtn.disabled ? null : spinBtn) : doneBtn);
    draw();
    host.stage.append(h('div', { class: 'spin-wrap' }, h('span', { class: 'spin-pointer', 'aria-hidden': 'true' }, '🔻'), wheelEl), spinBtn, result, h('div', { class: 'choice-row' }, doneBtn));
  }

  /* ---------- Matching Pairs: a memory game ---------- */
  function pairs(host) {
    const chosen = sample('match', host.game.items).slice(0, 8);
    host.setTotal(chosen.length);
    const cards = shuffle(chosen.flatMap((p, i) => [{ p: i, text: p[0] }, { p: i, text: p[1] }]));
    let open = [], found = 0, busy = false;
    const els = cards.map((c) => {
      const b = h('button', { class: 'mem-card', 'aria-label': 'Hidden card' }, h('span', { class: 'mem-back', text: '?' }), h('span', { class: 'mem-front', lang: /[ঀ-৿]/.test(c.text) ? 'bn' : null }, isPic(c.text) ? picture(c.text, 'mem-pic') : c.text));
      b.addEventListener('click', () => {
        if (busy || b.classList.contains('up')) return;
        b.classList.add('up');
        sfx.pop();
        open.push(b);
        if (open.length < 2) return;
        const [x, y] = open;
        if (cards[els.indexOf(x)].p === cards[els.indexOf(y)].p) {
          x.classList.add('done'); y.classList.add('done');
          open = [];
          found++;
          host.itemDone(y, '', null);
          if (found === chosen.length) host.after(900, () => done(host));
        } else {
          busy = true;
          host.miss(y);
          host.after(900, () => { x.classList.remove('up'); y.classList.remove('up'); open = []; busy = false; });
        }
      });
      return b;
    });
    host.target = () => {
      if (busy) return null;
      if (open.length === 1) { const p = cards[els.indexOf(open[0])].p; return els.find((e, i) => cards[i].p === p && e !== open[0]); }
      return els.find((e) => !e.classList.contains('up')) || null;
    };
    host.stage.append(h('div', { class: `mem-grid n${cards.length}` }, els));
  }

  /* ---------- an on-screen letter keyboard, shared by typing games ---------- */
  function keyboard(onKey, extra = []) {
    const keys = ABC.concat(extra).map((k) => h('button', { class: 'key', 'data-key': k, 'aria-label': k === ' ' ? 'Space' : k }, k === ' ' ? '␣' : k));
    keys.forEach((k) => k.addEventListener('click', () => onKey(k.dataset.key, k)));
    return { el: h('div', { class: 'keyboard' }, keys), keys };
  }

  /* ---------- Type the Answer ---------- */
  function type(host) {
    sequence(host, sample('quiz', shuffle(host.game.items)), (item, next) => {
      const [q, answer, emoji] = item;
      const want = answer.toUpperCase();
      let typed = '';
      const box = h('div', { class: 'type-box', 'aria-live': 'polite' });
      const paint = () => box.replaceChildren(...Array.from(want).map((c, i) => h('span', { class: `type-cell ${c === ' ' ? 'gap' : ''} ${i < typed.length ? 'full' : ''}`, text: i < typed.length ? typed[i] : '' })));
      const { el, keys } = keyboard((k, keyEl) => {
        if (typed.length >= want.length) return;
        if (k !== want[typed.length]) return host.miss(keyEl);
        typed += k;
        while (typed.length < want.length && !/[A-Z]/.test(want[typed.length])) typed += want[typed.length];
        host.hit(box, typed.length);
        paint();
        if (typed.length === want.length) host.itemDone(box, '', next, { wait: 900 });
      });
      const first = () => { while (typed.length < want.length && !/[A-Z]/.test(want[typed.length])) typed += want[typed.length]; };
      first();
      paint();
      host.target = () => (typed.length < want.length ? keys.find((k) => k.dataset.key === want[typed.length]) : null);
      host.stage.append(h('div', { class: 'card quiz-q enter' }, picture(emoji), h('p', { class: 'clue-big', text: q }), speakBtn(q)), box, el);
    });
  }

  /* ---------- Save the Balloon (Hangman): wrong letters let balloons fly away ---------- */
  function hangman(host) {
    sequence(host, sample('spell', shuffle(host.game.items)), (item, next) => {
      const [word, clue, emoji] = item;
      const want = word.toUpperCase();
      const letters = new Set(Array.from(want).filter((c) => /[A-Z]/.test(c)));
      const got = new Set();
      let lives = 6, over = false;
      const balloons = h('div', { class: 'balloon-bunch', 'aria-label': `${lives} balloons left` }, Array.from({ length: 6 }, (_, i) => h('span', { class: `hb hb${i}` }, '🎈')));
      const box = h('div', { class: 'type-box' });
      const paint = () => box.replaceChildren(...Array.from(want).map((c) => h('span', { class: `type-cell ${c === ' ' ? 'gap' : ''} ${got.has(c) ? 'full' : ''}`, text: got.has(c) || !/[A-Z]/.test(c) ? c : '' })));
      const { el, keys } = keyboard((k, keyEl) => {
        if (over || keyEl.disabled) return;
        keyEl.disabled = true;
        if (letters.has(k)) {
          got.add(k);
          keyEl.classList.add('ok');
          host.hit(box, got.size);
          paint();
          if ([...letters].every((c) => got.has(c))) { over = true; host.itemDone(box, '', next, { wait: 1000 }); }
        } else {
          keyEl.classList.add('no');
          lives--;
          const b = balloons.children[5 - lives];
          if (b) b.classList.add('away');
          host.miss(keyEl);
          if (lives <= 0) {
            over = true;
            letters.forEach((c) => got.add(c));
            paint();
            host.cheer(`It was ${word}!`, 'down');
            host.itemFailed(next, 2200);
          }
        }
      });
      paint();
      host.target = () => (over ? null : keys.find((k) => !k.disabled && letters.has(k.dataset.key) && !got.has(k.dataset.key)));
      host.stage.append(h('div', { class: 'card hang-card enter' }, balloons, picture(emoji), clue && h('p', { class: 'clue', lang: /[ঀ-৿]/.test(clue) ? 'bn' : null, text: clue })), box, el);
    });
  }

  /* ---------- Word Hunt (Wordsearch) ---------- */
  function buildGrid(words, size) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const grid = Array.from({ length: size }, () => Array(size).fill(''));
      const placed = [];
      const dirs = [[0, 1], [1, 0], [1, 1]];
      let ok = true;
      for (const w of words) {
        let put = false;
        for (let t = 0; t < 120 && !put; t++) {
          const [dr, dc] = pick(dirs);
          const r = Math.floor(Math.random() * (size - dr * (w.length - 1)));
          const c = Math.floor(Math.random() * (size - dc * (w.length - 1)));
          if (r < 0 || c < 0) continue;
          if (Array.from(w).every((ch, i) => [ '', ch ].includes(grid[r + dr * i][c + dc * i]))) {
            Array.from(w).forEach((ch, i) => { grid[r + dr * i][c + dc * i] = ch; });
            placed.push({ w, r, c, dr, dc });
            put = true;
          }
        }
        if (!put) { ok = false; break; }
      }
      if (ok) {
        grid.forEach((row) => row.forEach((x, i) => { if (!x) row[i] = pick(ABC); }));
        return { grid, placed };
      }
    }
    return null;
  }
  function wordsearch(host) {
    const words = shuffle(host.game.items).slice(0, 8).map((i) => ({ w: i[0].toUpperCase().replace(/[^A-Z]/g, ''), clue: i[1] || '' })).filter((x) => x.w.length >= 2);
    const size = Math.max(7, Math.min(11, Math.max(...words.map((x) => x.w.length)) + 2));
    const built = buildGrid(words.map((x) => x.w), size);
    host.setTotal(words.length);
    if (!built) { host.stage.append(h('p', { class: 'note-pill', text: 'These words are too long for the grid. Ask your teacher to shorten them.' })); return; }
    let startCell = null, found = 0;
    const cells = [];
    const gridEl = h('div', { class: 'ws-grid', style: { gridTemplateColumns: `repeat(${size}, 1fr)` } });
    built.grid.forEach((row, r) => row.forEach((ch, c) => {
      const b = h('button', { class: 'ws-cell', text: ch, 'data-r': r, 'data-c': c });
      b.addEventListener('click', () => choose(r, c, b));
      cells.push(b);
      gridEl.append(b);
    }));
    const cellAt = (r, c) => cells[r * size + c];
    const list = h('div', { class: 'ws-list' }, words.map((x) => h('span', { class: 'ws-word', 'data-w': x.w, text: x.clue || x.w })));
    const choose = (r, c, b) => {
      if (!startCell) { startCell = { r, c }; b.classList.add('start'); sfx.pop(); return; }
      const s = startCell;
      startCell = null;
      cells.forEach((x) => x.classList.remove('start'));
      const hit = built.placed.find((p) => !p.done && ((p.r === s.r && p.c === s.c && p.r + p.dr * (p.w.length - 1) === r && p.c + p.dc * (p.w.length - 1) === c) || (p.r === r && p.c === c && p.r + p.dr * (p.w.length - 1) === s.r && p.c + p.dc * (p.w.length - 1) === s.c)));
      if (!hit) return host.miss(b);
      hit.done = true;
      Array.from(hit.w).forEach((_, i) => cellAt(hit.r + hit.dr * i, hit.c + hit.dc * i).classList.add('found'));
      const tag = list.querySelector(`[data-w="${hit.w}"]`);
      tag.classList.add('found');
      tag.textContent = hit.w;
      found++;
      host.itemDone(b, '', null);
      if (found === words.length) host.after(1000, () => done(host));
    };
    host.target = () => {
      const p = built.placed.find((x) => !x.done);
      if (!p) return null;
      if (!startCell) return cellAt(p.r, p.c);
      return cellAt(p.r + p.dr * (p.w.length - 1), p.c + p.dc * (p.w.length - 1));
    };
    host.stage.append(list, gridEl);
  }

  /* ---------- Label It (Labelled diagram) ---------- */
  function labelled(host) {
    const { pic: src, items } = host.game;
    host.setTotal(items.length);
    let picked = null, placed = 0;
    const board = h('div', { class: 'diagram' }, picture(src, 'diagram-pic'));
    const pins = items.map((it, i) => {
      const pin = h('button', { class: 'pin', style: { left: `${it[1]}%`, top: `${it[2]}%` }, 'data-i': i, 'aria-label': `Spot ${i + 1}` }, String(i + 1));
      pin.addEventListener('click', () => drop(i, pin));
      board.append(pin);
      return pin;
    });
    const labels = shuffle(items.map((it, i) => ({ text: it[0], i }))).map((x) => {
      const b = h('button', { class: 'label-chip gummy g-blue', 'data-i': x.i, text: x.text });
      SEJ.tapOrDrag(b, '.pin', (t) => { if (t) { picked = b; drop(Number(t.dataset.i), t); } else { picked = b; labelsEl.querySelectorAll('.label-chip').forEach((y) => y.classList.toggle('selected', y === b)); sfx.pop(); } });
      return b;
    });
    const labelsEl = h('div', { class: 'label-row' }, labels);
    const drop = (i, pin) => {
      if (!picked || pin.classList.contains('done')) return;
      if (Number(picked.dataset.i) !== i) { host.miss(pin); return; }
      pin.classList.add('done');
      pin.textContent = picked.textContent;
      picked.remove();
      picked = null;
      placed++;
      host.itemDone(pin, '', null);
      if (placed === items.length) host.after(900, () => done(host));
    };
    host.target = () => {
      if (!picked) return labelsEl.querySelector('.label-chip');
      return pins[Number(picked.dataset.i)];
    };
    host.stage.append(board, labelsEl);
  }

  /* ---------- Crossword ---------- */
  function layoutCrossword(words) {
    const list = words.slice().sort((a, b) => b.w.length - a.w.length);
    const cells = new Map();
    const key = (r, c) => `${r},${c}`;
    const placed = [];
    const fits = (w, r, c, dir) => {
      let cross = 0;
      for (let i = 0; i < w.length; i++) {
        const rr = r + (dir ? i : 0), cc = c + (dir ? 0 : i);
        const at = cells.get(key(rr, cc));
        if (at && at !== w[i]) return -1;
        if (at) cross++;
        else {
          const side = dir ? [[rr, cc - 1], [rr, cc + 1]] : [[rr - 1, cc], [rr + 1, cc]];
          if (side.some(([a, b]) => cells.has(key(a, b)))) return -1;
        }
      }
      const before = dir ? key(r - 1, c) : key(r, c - 1);
      const after = dir ? key(r + w.length, c) : key(r, c + w.length);
      if (cells.has(before) || cells.has(after)) return -1;
      return cross;
    };
    const put = (x, r, c, dir) => { Array.from(x.w).forEach((ch, i) => cells.set(key(r + (dir ? i : 0), c + (dir ? 0 : i)), ch)); placed.push({ ...x, r, c, dir }); };
    list.forEach((x, n) => {
      if (!n) return put(x, 0, 0, 0);
      let best = null;
      placed.forEach((p) => Array.from(p.w).forEach((pc, pi) => Array.from(x.w).forEach((xc, xi) => {
        if (pc !== xc) return;
        const dir = p.dir ? 0 : 1;
        const r = p.dir ? p.r + pi : p.r - xi;
        const c = p.dir ? p.c - xi : p.c + pi;
        const score = fits(x.w, r, c, dir);
        if (score > 0 && (!best || score > best.score)) best = { r, c, dir, score };
      })));
      if (best) put(x, best.r, best.c, best.dir);
      else {
        /* No crossing found: place it below everything, across. */
        const maxR = Math.max(...[...cells.keys()].map((k) => Number(k.split(',')[0])));
        put(x, maxR + 2, 0, 0);
      }
    });
    const rs = placed.flatMap((p) => [p.r, p.r + (p.dir ? p.w.length - 1 : 0)]);
    const cs = placed.flatMap((p) => [p.c, p.c + (p.dir ? 0 : p.w.length - 1)]);
    const r0 = Math.min(...rs), c0 = Math.min(...cs);
    placed.forEach((p, i) => { p.r -= r0; p.c -= c0; p.n = i + 1; });
    return { placed, rows: Math.max(...rs) - r0 + 1, cols: Math.max(...cs) - c0 + 1 };
  }
  function crossword(host) {
    const words = shuffle(host.game.items).slice(0, 8).map((i) => ({ w: i[0].toUpperCase().replace(/[^A-Z]/g, ''), clue: i[1] || i[0] })).filter((x) => x.w.length >= 2);
    const lay = layoutCrossword(words);
    host.setTotal(lay.placed.length);
    const grid = h('div', { class: 'cw-grid', style: { gridTemplateColumns: `repeat(${lay.cols}, 1fr)` } });
    const cellEls = new Map();
    for (let r = 0; r < lay.rows; r++) for (let c = 0; c < lay.cols; c++) {
      const el = h('span', { class: 'cw-cell empty' });
      cellEls.set(`${r},${c}`, el);
      grid.append(el);
    }
    lay.placed.forEach((p) => Array.from(p.w).forEach((_, i) => {
      const el = cellEls.get(`${p.r + (p.dir ? i : 0)},${p.c + (p.dir ? 0 : i)}`);
      el.classList.remove('empty');
      if (!i && !el.dataset.n) { el.dataset.n = p.n; el.append(h('small', { class: 'cw-n', text: p.n })); }
    }));
    let current = null, typed = '';
    const clueEl = h('p', { class: 'clue-big cw-clue' });
    const clues = h('div', { class: 'cw-clues' }, lay.placed.map((p) => {
      const b = h('button', { class: 'cw-clue-btn', 'data-n': p.n }, h('b', { text: `${p.n} ${p.dir ? '↓' : '→'}` }), ' ', p.clue);
      b.addEventListener('click', () => { if (p.done) return; current = p; typed = ''; clues.querySelectorAll('.cw-clue-btn').forEach((x) => x.classList.toggle('on', x === b)); clueEl.textContent = p.clue; sfx.pop(); });
      return b;
    }));
    const cellOf = (p, i) => cellEls.get(`${p.r + (p.dir ? i : 0)},${p.c + (p.dir ? 0 : i)}`);
    const { el, keys } = keyboard((k, keyEl) => {
      if (!current) return host.miss(keyEl);
      if (k !== current.w[typed.length]) return host.miss(keyEl);
      const cell = cellOf(current, typed.length);
      cell.dataset.ch = k;
      cell.classList.add('full');
      cell.textContent = '';
      if (cell.dataset.n) cell.append(h('small', { class: 'cw-n', text: cell.dataset.n }));
      cell.append(document.createTextNode(k));
      typed += k;
      host.hit(cell, typed.length);
      if (typed.length < current.w.length) return;
      current.done = true;
      clues.querySelector(`[data-n="${current.n}"]`).classList.add('done');
      host.itemDone(cell, '', null);
      current = null;
      clueEl.textContent = '';
      if (lay.placed.every((p) => p.done)) host.after(900, () => done(host));
    });
    host.target = () => {
      if (!current) { const p = lay.placed.find((x) => !x.done); return p ? clues.querySelector(`[data-n="${p.n}"]`) : null; }
      return keys.find((k) => k.dataset.key === current.w[typed.length]);
    };
    host.stage.append(h('div', { class: 'cw-wrap' }, grid, clues), clueEl, el);
  }

  /* ---------- Flip Tiles: flip each tile to see the other side ---------- */
  function fliptiles(host) {
    const items = shuffle(host.game.items).slice(0, 12);
    host.setTotal(items.length);
    let flipped = 0;
    const tiles = items.map(([front, back]) => {
      const b = h('button', { class: 'ft-tile' }, h('span', { class: 'flip-inner' }, h('span', { class: 'flip-face front' }, isPic(front) ? picture(front, 'mem-pic') : front), h('span', { class: 'flip-face back', text: back })));
      b.addEventListener('click', () => {
        if (b.classList.contains('flipped')) return;
        b.classList.add('flipped');
        sfx.whoosh();
        flipped++;
        host.itemDone(b, '', null);
        if (flipped === items.length) host.after(1200, () => done(host));
      });
      return b;
    });
    host.target = () => tiles.find((t) => !t.classList.contains('flipped')) || null;
    host.stage.append(h('div', { class: `ft-grid n${tiles.length}` }, tiles));
  }

  /* ---------- Maze Chase: walk to the zone with the right answer ---------- */
  const MAZE = [
    'A.....#.....B',
    '.###.##.###..',
    '.#.........#.',
    '...##.#.##...',
    '.#....S....#.',
    '...##.#.##...',
    '.#.........#.',
    '.###.##.###..',
    'C.....#.....D',
  ];
  function maze(host) {
    const rows = MAZE.length, cols = MAZE[0].length;
    const zones = {};
    let start = null;
    MAZE.forEach((row, r) => Array.from(row).forEach((ch, c) => { if ('ABCD'.includes(ch)) zones[ch] = [r, c]; if (ch === 'S') start = [r, c]; }));
    const wall = (r, c) => r < 0 || c < 0 || r >= rows || c >= cols || MAZE[r][c] === '#';
    sequence(host, sample('quiz', shuffle(host.game.items)), (item, next) => {
      const [q, answer, wrongs] = item;
      const options = shuffle([answer, ...wrongs.slice(0, 3)]);
      const zoneOf = {};
      ['A', 'B', 'C', 'D'].slice(0, options.length).forEach((z, i) => { zoneOf[z] = options[i]; });
      let pos = start.slice(), over = false;
      const grid = h('div', { class: 'maze-grid', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } });
      const cellEls = [];
      MAZE.forEach((row, r) => Array.from(row).forEach((ch, c) => {
        const zone = zoneOf[ch];
        const el = h('span', { class: `mz ${ch === '#' ? 'wall' : ''} ${zone ? 'zone' : ''}` }, zone ? h('b', { text: zone }) : null);
        cellEls.push(el);
        grid.append(el);
      }));
      const hero = SEJ.heroFace(host.heroId, 'mz-hero');
      const place = () => { cellEls[pos[0] * cols + pos[1]].append(hero); };
      place();
      const step = (dr, dc, btn) => {
        if (over) return;
        const r = pos[0] + dr, c = pos[1] + dc;
        if (wall(r, c)) { sfx.boing(); return; }
        pos = [r, c];
        sfx.tick(1);
        place();
        const z = Object.keys(zoneOf).find((k) => zones[k][0] === r && zones[k][1] === c);
        if (!z) return;
        if (zoneOf[z] === answer) { over = true; host.itemDone(cellEls[r * cols + c], '', next, { wait: 900 }); }
        else { host.miss(btn || cellEls[r * cols + c]); pos = start.slice(); place(); }
      };
      const pad = h('div', { class: 'maze-pad' },
        ...[['⬆️', -1, 0, 'up'], ['⬅️', 0, -1, 'left'], ['➡️', 0, 1, 'right'], ['⬇️', 1, 0, 'down']].map(([icon, dr, dc, name]) => {
          const b = h('button', { class: `mz-btn ${name}`, 'aria-label': `Move ${name}`, 'data-d': `${dr},${dc}`, text: icon });
          b.addEventListener('click', () => step(dr, dc, b));
          return b;
        }));
      /* The hint walks one step along the shortest path to the right zone. */
      const goal = zones[Object.keys(zoneOf).find((k) => zoneOf[k] === answer)];
      const nextStep = () => {
        const seen = new Map([[pos.join(), null]]);
        const queue = [pos];
        while (queue.length) {
          const [r, c] = queue.shift();
          if (r === goal[0] && c === goal[1]) break;
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const k = `${r + dr},${c + dc}`;
            const isOtherZone = Object.values(zones).some((z) => z[0] === r + dr && z[1] === c + dc && !(z[0] === goal[0] && z[1] === goal[1]));
            if (wall(r + dr, c + dc) || seen.has(k) || isOtherZone) continue;
            seen.set(k, [r, c, dr, dc]);
            queue.push([r + dr, c + dc]);
          }
        }
        let k = goal.join(), move = null;
        while (seen.get(k)) { const [r, c, dr, dc] = seen.get(k); move = [dr, dc]; k = `${r},${c}`; }
        return move;
      };
      host.target = () => { if (over) return null; const m = nextStep(); return m ? pad.querySelector(`[data-d="${m[0]},${m[1]}"]`) : null; };
      const onKey = (e) => { const m = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]; if (m) { e.preventDefault(); step(m[0], m[1]); } };
      addEventListener('keydown', onKey);
      const prev = host.cleanup;
      host.cleanup = () => { removeEventListener('keydown', onKey); if (prev) prev(); };
      host.stage.append(h('div', { class: 'card quiz-q enter' }, h('p', { class: 'clue-big', text: q }), speakBtn(q)), grid, pad);
    });
  }

  /* ---------- Balloon Drop (Balloon pop): pop the balloon whose word matches the cart ---------- */
  function balloonpop(host) {
    const all = host.game.items;
    sequence(host, sample('quiz', shuffle(all)), (item, next) => {
      const [word, definition] = item;
      const options = shuffle([word, ...shuffle(all.map((x) => x[0]).filter((w) => w !== word)).slice(0, 3)]);
      let locked = false;
      const balloons = options.map((w, i) => {
        const b = h('button', { class: `bp-balloon c${i}`, style: { '--i': i }, 'data-w': w }, h('span', { class: 'bp-skin' }, '🎈'), h('b', { text: w }));
        b.addEventListener('click', () => {
          if (locked || b.disabled) return;
          if (w !== word) { b.disabled = true; b.classList.add('out'); return host.miss(b); }
          locked = true;
          b.classList.add('popped');
          sfx.pop();
          cart.classList.add('filled');
          cart.querySelector('.bp-load').textContent = word;
          host.itemDone(cart, '', next, { wait: 1100 });
        });
        return b;
      });
      const cart = h('div', { class: 'bp-cart' }, h('span', { class: 'bp-load', text: '?' }), h('p', { text: definition }));
      host.target = () => balloons.find((b) => b.dataset.w === word);
      host.stage.append(h('div', { class: 'bp-sky' }, balloons), cart);
    });
  }

  /* ---------- Flying Fruit: tap the fruit with the right answer as it flies past ---------- */
  function fruit(host) {
    const all = host.game.items;
    const FRUIT = ['🍉', '🍎', '🍊', '🍋', '🍇', '🍓', '🍍', '🥝'];
    sequence(host, sample('quiz', shuffle(all)), (item, next) => {
      const [prompt, answer, emoji] = item;
      const options = shuffle([answer, ...shuffle(all.map((x) => x[1]).filter((a) => a !== answer)).slice(0, 4)]);
      let locked = false;
      const lane = h('div', { class: 'fruit-lane' });
      const fruits = options.map((a, i) => {
        const b = h('button', { class: 'fruit', style: { '--i': i, '--row': i % 3 }, 'data-a': a }, h('span', { class: 'fruit-art', text: FRUIT[(i + Math.floor(Math.random() * 8)) % 8] }), h('b', { text: a }));
        b.addEventListener('click', () => {
          if (locked || b.disabled) return;
          if (a !== answer) { b.disabled = true; b.classList.add('out'); return host.miss(b); }
          locked = true;
          b.classList.add('caught');
          host.itemDone(b, '', next, { wait: 1000 });
        });
        return b;
      });
      lane.append(...fruits);
      host.target = () => fruits.find((b) => b.dataset.a === answer);
      host.stage.append(h('div', { class: 'card quiz-q enter' }, picture(emoji), h('p', { class: 'clue-big', text: prompt }), speakBtn(prompt)), lane);
    });
  }

  /* ---------- Rank Order: tap in the right order ---------- */
  function rank(host) {
    const order = host.game.items.map((x) => x[0]);
    host.setTotal(order.length);
    let pos = 0;
    const listEl = h('ol', { class: 'rank-list' });
    const pool = shuffle(order).map((text, i) => {
      const b = h('button', { class: `rank-chip gummy ${GUMMY[i % GUMMY.length]} enter`, style: { '--i': i }, 'data-t': text, text });
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (text !== order[pos]) return host.miss(b);
        b.disabled = true;
        b.classList.add('used');
        listEl.append(h('li', { class: 'rank-done enter-pop', text }));
        pos++;
        host.itemDone(b, '', null);
        if (pos === order.length) host.after(900, () => done(host));
      });
      return b;
    });
    host.target = () => pool.find((b) => !b.disabled && b.dataset.t === order[pos]) || null;
    host.stage.append(host.game.prompt ? h('p', { class: 'note-pill', text: host.game.prompt }) : null, listEl, h('div', { class: 'rank-pool' }, pool));
  }

  /* ---------- Picture Quiz (Image quiz): the picture appears bit by bit ---------- */
  function imagequiz(host) {
    sequence(host, sample('quiz', shuffle(host.game.items)), (item, next) => {
      const [pic, answer, wrongs] = item;
      const covers = shuffle(Array.from({ length: 9 }, (_, i) => i));
      const tiles = Array.from({ length: 9 }, (_, i) => h('span', { class: 'iq-tile', 'data-i': i }));
      const frame = h('div', { class: 'iq-frame' }, picture(pic, 'iq-pic'), h('div', { class: 'iq-cover' }, tiles));
      let opened = 0;
      const timer = host.every(1200, () => { if (opened < 9) tiles[covers[opened++]].classList.add('open'); });
      const { tiles: answers } = answerTiles(host, '', answer, wrongs, (t) => {
        host.clear(timer);
        tiles.forEach((x) => x.classList.add('open'));
        if (opened <= 3) host.doubleNext();
        host.itemDone(t, '', next, { wait: 1200 });
      });
      host.target = () => answers.find((t) => t._answer === answer);
      host.stage.append(frame, h('p', { class: 'note-pill', text: 'Answer early for double points!' }), h('div', { class: `answers answers-${answers.length}` }, answers));
    });
  }

  /* ---------- Speed Sorting: one card at a time, against the clock ---------- */
  function speedsort(host) {
    const { groups, cards } = host.game;
    const list = shuffle(cards).slice(0, 16);
    host.setTotal(list.length);
    let i = 0, seconds = 60;
    const clock = h('span', { class: 'clock', text: seconds });
    const cardEl = h('div', { class: 'card ss-card' });
    const bins = groups.map((g, gi) => {
      const b = h('button', { class: `ss-bin gummy ${GUMMY[gi % GUMMY.length]}`, 'data-g': gi }, h('span', { class: 'ss-art', text: g.e || '📦' }), h('b', { text: g.n }), h('small', { class: 'ss-count', text: '0' }));
      b.addEventListener('click', () => choose(gi, b));
      return b;
    });
    const show = () => { const [text, , emoji] = list[i]; cardEl.replaceChildren(picture(emoji), h('p', { class: 'clue-big', text })); fx.play(cardEl, 'enter-pop'); };
    const choose = (gi, b) => {
      if (i >= list.length) return;
      if (list[i][1] !== gi) return host.miss(b);
      const count = b.querySelector('.ss-count');
      count.textContent = Number(count.textContent) + 1;
      host.itemDone(b, '', null, { wait: 0 });
      i++;
      if (i >= list.length) { host.clear(tick); host.after(700, () => done(host)); } else show();
    };
    const tick = host.every(1000, () => {
      seconds--;
      clock.textContent = Math.max(0, seconds);
      clock.classList.toggle('low', seconds <= 10);
      if (seconds <= 0) { host.clear(tick); host.cheer("Time's up!", 'down'); i = list.length; host.after(1200, () => done(host)); }
    });
    host.target = () => (i < list.length ? bins[list[i][1]] : null);
    show();
    host.stage.append(h('span', { class: 'clock-wrap' }, '⏱️', clock), cardEl, h('div', { class: `ss-bins n${bins.length}` }, bins));
  }

  /* ---------- Win or Lose: each question is worth points; play or pass ---------- */
  function winlose(host) {
    sequence(host, sample('quiz', shuffle(host.game.items)), (item, next) => {
      const [q, answer, wrongs, emoji] = item;
      const value = pick([100, 200, 300, 500]);
      const playBtn = h('button', { class: 'choice gummy g-green' }, `💪 Play for ${value}`);
      const passBtn = h('button', { class: 'choice gummy g-orange' }, '🙈 Pass');
      const qEl = h('div', { class: 'card quiz-q enter' }, h('span', { class: 'wl-value', text: `${value} points` }), picture(emoji), h('p', { class: 'clue-big', text: q }), speakBtn(q));
      const row = h('div', { class: 'choice-row' }, playBtn, passBtn);
      let tiles = [];
      playBtn.addEventListener('click', () => {
        row.remove();
        const t = answerTiles(host, q, answer, wrongs, (tile) => { if (value >= 300) host.doubleNext(); host.itemDone(tile, '', next, { wait: 1100 }); });
        tiles = t.tiles;
        tiles.forEach((tile) => tile.addEventListener('click', () => {
          if (tile._answer !== answer && !t.isLocked()) { t.lock(); host.cheer(`−${value}`, 'down'); tiles.find((x) => x._answer === answer).classList.add('right'); host.itemFailed(next, 1600); }
        }));
        host.stage.append(h('div', { class: `answers answers-${tiles.length}` }, tiles));
      });
      passBtn.addEventListener('click', () => { host.cheer('Passed', 'down'); host.itemFailed(next, 600); });
      host.target = () => (tiles.length ? tiles.find((t) => t._answer === answer) : playBtn);
      host.stage.append(qEl, row);
    });
  }

  /* ---------- Number Fun (Maths generator) ---------- */
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const say = (n, words) => (words && n >= 0 && n <= 20 ? WORDS[n] : String(n));
  SEJ.makeMaths = function ({ ops, from, to, count, words }) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const op = pick(ops);
      let a = from + Math.floor(Math.random() * (to - from + 1));
      let b = from + Math.floor(Math.random() * (to - from + 1));
      let ans;
      if (op === '-') { if (b > a) [a, b] = [b, a]; ans = a - b; }
      else if (op === 'x') ans = a * b;
      else if (op === '÷') { b = Math.max(1, b); ans = a; a = a * b; }
      else ans = a + b;
      const name = { '+': 'plus', '-': 'minus', x: 'times', '÷': 'divided by' }[op];
      const wrong = shuffle([ans + 1, ans - 1, ans + 2, ans + 10].filter((x) => x >= 0 && x !== ans)).slice(0, 3);
      out.push([`What is ${say(a, words)} ${name} ${say(b, words)}?`, say(ans, words), wrong.map((x) => say(x, words)), '🔢']);
    }
    return out;
  };
  function maths(host) {
    host.game = Object.assign({}, host.game, { items: SEJ.makeMaths(host.game.settings) });
    SEJ.ENGINES.quiz(host);
  }

  /* ---------- Watch & Remember (Watch and memorize) ---------- */
  function memorize(host) {
    const all = shuffle(host.game.items);
    const rounds = [];
    for (let i = 0; i + 4 <= all.length && rounds.length < 3; i += 4) rounds.push(all.slice(i, i + 4));
    if (!rounds.length) rounds.push(all.slice(0, Math.max(2, all.length - 2)));
    sequence(host, rounds, (seen, next) => {
      const extra = shuffle(all.filter((x) => !seen.includes(x))).slice(0, 2);
      const watch = h('div', { class: 'mz-show' }, seen.map((x) => h('div', { class: 'card mz-item enter-pop' }, picture(x[1]), h('b', { text: x[0] }))));
      const count = h('span', { class: 'clock', text: '5' });
      host.stage.append(h('p', { class: 'note-pill' }, 'Remember these! ', count), watch);
      let left = 5;
      host.target = () => null;
      const t = host.every(1000, () => {
        left--;
        count.textContent = left;
        if (left > 0) return;
        host.clear(t);
        host.stage.replaceChildren();
        let found = 0;
        const choices = shuffle(seen.concat(extra)).map((x) => {
          const b = h('button', { class: 'card mz-item mz-choice', 'data-seen': seen.includes(x) ? '1' : '' }, picture(x[1]), h('b', { text: x[0] }));
          b.addEventListener('click', () => {
            if (b.disabled) return;
            b.disabled = true;
            if (!b.dataset.seen) { b.classList.add('out'); return host.miss(b); }
            b.classList.add('right');
            found++;
            host.hit(b, found);
            if (found === seen.length) host.itemDone(b, '', next, { wait: 900 });
          });
          return b;
        });
        host.target = () => choices.find((b) => b.dataset.seen && !b.disabled) || null;
        host.stage.append(h('p', { class: 'note-pill', text: 'Tap everything you saw!' }), h('div', { class: 'mz-show' }, choices));
      });
    });
  }

  /* ---------- Word Magnets: scattered magnets on a board, tap them in order ---------- */
  function magnets(host) {
    sequence(host, sample('unjumble', shuffle(host.game.items)), (item, next) => {
      const sentence = String(item).split('|').pop().trim();
      const words = sentence.split(/\s+/);
      let pos = 0;
      const line = h('div', { class: 'mag-line' });
      const board = h('div', { class: 'mag-board' });
      const mags = shuffle(words.map((w, i) => ({ w, i }))).map((x, n) => {
        const b = h('button', { class: `magnet c${n % 6}`, 'data-w': x.w, style: { '--x': `${6 + ((n * 37) % 74)}%`, '--y': `${8 + ((n * 53) % 64)}%`, '--r': `${(n % 5) * 4 - 8}deg` }, text: x.w });
        b.addEventListener('click', () => {
          if (b.disabled) return;
          if (x.w !== words[pos]) return host.miss(b);
          b.disabled = true;
          b.classList.add('used');
          line.append(h('span', { class: 'magnet placed', text: x.w }));
          pos++;
          host.hit(line, pos);
          if (pos === words.length) host.itemDone(line, '', next, { wait: 1100 });
        });
        return b;
      });
      board.append(...mags);
      host.target = () => mags.find((b) => !b.disabled && b.dataset.w === words[pos]) || null;
      host.stage.append(line, board);
    });
  }

  Object.assign(SEJ.ENGINES, { flash, speakcards, wheel, pairs, type, hangman, wordsearch, labelled, crossword, fliptiles, maze, balloonpop, fruit, rank, imagequiz, speedsort, winlose, maths, memorize, magnets });
  void voice;
})();
