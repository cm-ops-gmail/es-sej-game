/* Handouts a teacher can give to students: flashcards, a quick-tips page and a practice sheet.
   They are built from a lesson's games (or from text the teacher pastes), shown as A4 pages,
   and saved as a PDF or printed. No AI: the pages are laid out from the content as it is. */
(function () {
  'use strict';
  const { h } = SEJ;
  const PAGE_W = 794, PAGE_H = 1122;
  const clean = (t) => String(t === undefined || t === null ? '' : t).replace(/\s+/g, ' ').trim();
  const KINDS = {
    cards: { icon: '🃏', label: 'Flashcards', file: 'Flashcards' },
    tips: { icon: '💡', label: 'Quick tips', file: 'Quick tips' },
    sheet: { icon: '📝', label: 'Practice sheet', file: 'Practice sheet' },
  };
  const SAMPLE = 'Mango | আম\nWhich one can fly? | Bird | Fish | Cat >> Birds have wings.\nShe ___ to school every day. | goes | go | going\nAlways say “please” and “thank you”.';

  let loading = null;
  function loadLib() {
    if (window.html2pdf) return Promise.resolve();
    if (!loading) loading = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'js/vendor/html2pdf.bundle.min.js'; s.onload = ok; s.onerror = () => { loading = null; bad(new Error('The PDF maker couldn’t load. Check the internet.')); }; document.head.append(s); });
    return loading;
  }

  /* ---------- the content: words, question and answer cards, tips ---------- */
  function fromGames(lesson, games, whole) {
    const d = { words: whole ? (lesson.words || []).map((w) => [clean(w[0]), clean(w[1])]) : [], cards: [], tips: [], facts: [], talk: whole ? (lesson.talk || []) : [] };
    const seen = new Set();
    const tip = (text, about) => { const t = clean(text); if (t && !seen.has(t)) { seen.add(t); d.tips.push({ tip: t, about: clean(about) }); } };
    for (const g of games) {
      const cards = SEJ.slides.cardsOf(g);
      const lines = [];
      const sentence = g.t === 'unjumble' || g.t === 'magnets' || g.t === 'blank';
      for (const c of cards) {
        const fact = sentence ? c.a : c.a ? `${c.q}  →  ${c.a}` : c.q;
        lines.push({ full: fact, ask: c.q });
        if (c.note) tip(c.note, fact);
        d.cards.push({ q: sentence && g.t !== 'blank' ? c.q : c.q, a: c.a, head: c.head || '', options: c.options, note: c.note || '', game: g.title });
      }
      if (g.t === 'whack') lines.push(...g.good.map((x) => ({ full: `✅  ${x}`, ask: x })), ...g.bad.map((x) => ({ full: '', ask: x })));
      if (g.t === 'rank') lines.push({ full: g.items.map((i, n) => `${n + 1}. ${i[0]}`).join('   '), ask: SEJ.shuffle(g.items.map((i) => i[0])).join('   /   ') });
      if (g.t === 'memorize' || g.t === 'labelled') lines.push(...g.items.map((i) => { const t = clean(`${i[1] && !/^https?:/.test(i[1]) && g.t === 'memorize' ? i[1] : ''} ${i[0]}`); return { full: t, ask: t }; }));
      (g.notes || []).forEach((n) => tip(n[1]));
      if (lines.length) d.facts.push({ title: g.title, lines: lines.slice(0, 12) });
    }
    return d;
  }
  /* Pasted text. "front | back" is a card; more parts are wrong choices; ">> text" is a tip; a plain line is a tip. */
  function fromText(text) {
    const d = { words: [], cards: [], tips: [], facts: [], talk: [] };
    for (const raw of String(text || '').split(/\r?\n/)) {
      const [main, note] = raw.split('>>').map(clean);
      const parts = main.split('|').map(clean).filter(Boolean);
      if (parts.length >= 2) {
        d.cards.push({ q: parts[0], a: parts[1], head: '', options: parts.length > 2 ? SEJ.shuffle(parts.slice(1)) : undefined, note: note || '' });
        if (note) d.tips.push({ tip: note, about: `${parts[0]}  →  ${parts[1]}` });
      } else if (parts[0]) d.tips.push({ tip: parts[0], about: '' });
    }
    if (d.cards.length) d.facts.push({ title: 'Remember these', lines: d.cards.slice(0, 14).map((c) => ({ full: `${c.q}  →  ${c.a}`, ask: c.q })) });
    return d;
  }

  /* ---------- pages ---------- */
  function newPage(d, kind) {
    const body = h('div', { class: 'ho-body' });
    const el = h('section', { class: `ho-page ho-${kind}` },
      h('header', { class: 'ho-top' },
        h('img', { class: 'ho-logo', src: 'assets/slides/sej.png', alt: '' }),
        h('div', { class: 'ho-top-text' }, h('strong', { text: d.title }), h('span', { text: d.sub })),
        h('span', { class: 'ho-kind', text: `${KINDS[kind].icon} ${KINDS[kind].label}` })),
      body,
      h('footer', { class: 'ho-foot' }, h('span', { text: 'Spoken English Junior  ·  10 Minute School' }), h('span', { class: 'ho-num' })));
    el.body = body;
    return el;
  }
  const mount = (host, page) => { host.append(h('div', { class: 'ho-fit' }, h('div', { class: 'ho-scale' }, page))); return page; };
  /* Adds blocks to pages, starting a new page when one is full. A heading never stays alone at the bottom. */
  function flow(host, d, kind, blocks) {
    let p = mount(host, newPage(d, kind));
    for (const b of blocks.filter(Boolean)) {
      p.body.append(b);
      if (p.body.scrollHeight > p.body.clientHeight + 1 && p.body.children.length > 1) {
        const move = [b], prev = b.previousElementSibling;
        if (prev && prev.classList.contains('ho-h') && p.body.children.length > 2) move.unshift(prev);
        p = mount(host, newPage(d, kind));
        p.body.append(...move);
      }
    }
  }
  const size = (t) => { const n = clean(t).length; return n <= 10 ? 38 : n <= 20 ? 30 : n <= 40 ? 24 : n <= 80 ? 19 : 15; };
  const heading = (icon, text) => h('h3', { class: 'ho-h' }, h('span', { 'aria-hidden': 'true', text: `${icon} ` }), text);

  function flashcards(host, d, opt) {
    const all = d.words.map(([en, bn]) => ({ q: en, a: bn, head: 'Power word' })).concat(d.cards).filter((c) => c.q).slice(0, 96);
    if (!all.length) return false;
    const twoSided = opt.answers === 'back', onCard = opt.answers === 'card';
    const face = (c, n, back) => {
      const text = back ? c.a || ' ' : c.q;
      return h('div', { class: `ho-card ${back ? 'is-back' : ''}` },
        h('span', { class: 'ho-card-tag', text: back ? `Answer ${n}` : `${n}${c.head ? `  ·  ${c.head}` : ''}` }),
        h('p', { class: 'ho-card-text', style: { fontSize: `${size(text)}px` }, text }),
        back && c.note ? h('p', { class: 'ho-card-note', text: `💡 ${c.note}` }) : null,
        !back && opt.choices && !onCard && c.options && c.options.length > 1 ? h('p', { class: 'ho-card-choices', text: c.options.map(clean).join('   ·   ') }) : null,
        !back && onCard && c.a ? h('p', { class: 'ho-card-answer' }, h('span', { text: 'Answer: ' }), c.a) : null);
    };
    const hint = twoSided ? '✂️ Print on both sides (flip on the long edge), then cut along the dotted lines.' : onCard ? '✂️ Cut along the dotted lines. Fold the answer back to test yourself.' : '✂️ Cut along the dotted lines. Pick a card and say the answer!';
    for (let i = 0; i < all.length; i += 8) {
      const set = all.slice(i, i + 8);
      const front = mount(host, newPage(d, 'cards'));
      front.body.append(h('p', { class: 'ho-hint', text: hint }), h('div', { class: 'ho-grid' }, set.map((c, k) => face(c, i + k + 1, false))));
      if (twoSided) {
        const back = mount(host, newPage(d, 'cards'));
        back.body.append(h('p', { class: 'ho-hint', text: 'Answers: this page is the back of the page before it.' }),
          h('div', { class: 'ho-grid ho-mirror' }, set.map((c, k) => face(c, i + k + 1, true))));
      }
    }
    return true;
  }

  function tips(host, d, opt) {
    const blocks = [];
    const show = opt.answers !== 'none';
    if (d.mission) blocks.push(h('div', { class: 'ho-mission' }, h('strong', { text: '🎯 Today’s goal' }), h('p', { text: d.mission.en }), d.mission.bn && h('p', { class: 'ho-bn', lang: 'bn', text: d.mission.bn })));
    if (d.words.length) {
      blocks.push(heading('⭐', 'Power words'));
      for (let i = 0; i < d.words.length; i += 3) blocks.push(h('div', { class: 'ho-words' }, d.words.slice(i, i + 3).map(([en, bn]) => h('div', { class: 'ho-word' }, h('strong', { text: en }), h('span', { lang: 'bn', text: bn })))));
    }
    if (d.tips.length) {
      blocks.push(heading('💡', 'Quick tips'));
      d.tips.forEach((t) => blocks.push(h('div', { class: 'ho-tip' }, h('p', { text: t.tip }), show && t.about && h('small', { text: t.about }))));
    }
    d.facts.forEach((f) => {
      const lines = f.lines.map((l) => (show ? l.full : l.ask)).filter(Boolean);
      if (!lines.length) return;
      blocks.push(heading('📌', f.title));
      (show ? lines : SEJ.shuffle(lines)).forEach((line) => blocks.push(h('p', { class: 'ho-fact', text: line })));
    });
    if (d.talk.length) {
      blocks.push(heading('🗣️', show ? 'Say it at home' : 'Ask and answer'));
      d.talk.forEach((t) => blocks.push(h('div', { class: 'ho-talk' }, h('strong', { text: clean(t[0]) }), h('span', { text: clean(show ? t[2] || t[1] : t[1] || '') }))));
    }
    if (!blocks.length) return false;
    flow(host, d, 'tips', blocks);
    return true;
  }

  function sheet(host, d, opt) {
    const qs = d.cards.filter((c) => c.q && c.a).slice(0, 40);
    if (!qs.length) return false;
    const blocks = [h('div', { class: 'ho-who' }, h('span', { text: 'Name: ____________________' }), h('span', { text: 'ID: ____________' }), h('span', { text: 'Date: ____________' })),
      h('p', { class: 'ho-hint', text: opt.choices ? '✏️ Circle the right answer, or write it on the line.' : '✏️ Write the answer on the line.' })];
    qs.forEach((c, i) => blocks.push(h('div', { class: 'ho-q' },
      h('span', { class: 'ho-q-n', text: i + 1 }),
      h('div', { class: 'ho-q-body' },
        c.head && h('small', { text: c.head }),
        h('p', { text: c.q }),
        opt.choices && c.options && c.options.length > 1
          ? h('div', { class: 'ho-opts' }, c.options.map((o, k) => h('span', {}, h('b', { text: 'abcdef'[k] || '•' }), clean(o))))
          : h('div', { class: 'ho-line' })))));
    if (opt.key) {
      blocks.push(h('div', { class: 'ho-break' }), heading('✅', 'Answer key (for the teacher)'));
      for (let i = 0; i < qs.length; i += 2) blocks.push(h('div', { class: 'ho-keys' }, qs.slice(i, i + 2).map((c, k) => h('p', {}, h('b', { text: `${i + k + 1}. ` }), c.a))));
    }
    flow(host, d, 'sheet', blocks);
    return true;
  }
  const BUILD = { cards: flashcards, tips, sheet };

  /* ---------- PDF: each page is drawn to an image, so Bangla and emoji look exactly as on screen ---------- */
  async function savePdf(host, name, onStep) {
    await loadLib();
    const pages = [...host.querySelectorAll('.ho-page')];
    if (!pages.length) throw new Error('There is nothing to save yet.');
    const opt = { margin: 0, filename: `${name.replace(/[^\w .-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'handout'}.pdf`, image: { type: 'jpeg', quality: pages.length > 16 ? 0.86 : 0.93 }, html2canvas: { scale: pages.length > 16 ? 1.5 : 2, backgroundColor: '#ffffff', logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    let job = window.html2pdf().set(opt).from(pages[0]).toPdf();
    pages.slice(1).forEach((p, i) => {
      job = job.get('pdf').then((pdf) => { onStep(i + 2, pages.length); pdf.addPage(); }).from(p).toContainer().toCanvas().toPdf();
    });
    onStep(1, pages.length);
    await job.save();
  }

  /* ---------- the handout maker ---------- */
  /* unit: every lesson of the same unit as { lesson, games }, so one handout can cover several lessons. */
  function open(lesson, games, whole = true, unit = null) {
    const many = whole && unit && unit.length > 1 ? unit : null;
    const state = { kind: 'cards', answers: 'card', choices: true, key: true, own: false, text: '', picked: new Set([lesson.code]) };
    const headOf = (l, g) => ({ title: whole ? `${l.emoji || ''} ${l.title}`.trim() : g[0].title, sub: whole ? `Lesson ${l.code}` : `Lesson ${l.code}  ·  ${l.title}`, mission: whole ? l.mission : null });
    const base = headOf(lesson, games);
    const sources = () => (many ? many.filter((u) => state.picked.has(u.lesson.code)) : [{ lesson, games }]);
    const fileName = () => {
      const src = sources();
      const what = !whole ? `${lesson.code} ${games[0].title}` : src.length > 1 ? `Unit ${lesson.unit} (${src[0].lesson.code} to ${src[src.length - 1].lesson.code})` : `${src[0].lesson.code} ${src[0].lesson.title}`;
      return `${what} - ${KINDS[state.kind].file}${state.answers === 'none' && state.kind !== 'sheet' ? ' (no answers)' : ''}${state.kind === 'sheet' && !state.choices ? ' (no choices)' : ''}`;
    };
    const host = h('div', { class: 'ho-pages' });
    const preview = h('div', { class: 'ho-preview' }, host);
    const status = h('span', { class: 'ho-status', role: 'status' });
    const tabs = h('div', { class: 'ho-tabs', role: 'tablist' });
    const opts = h('div', { class: 'ho-options' });
    const scope = h('div', { class: 'ho-scope', hidden: !many });
    const own = h('textarea', { class: 'ho-own', id: 'ho-own', rows: '5', placeholder: SAMPLE, 'aria-label': 'Your own content' });
    const ownBox = h('div', { class: 'ho-own-box', hidden: true },
      h('p', { class: 'ho-own-help' }, 'One line each. ', h('b', { text: 'Question | Answer' }), ' makes a card. Add wrong choices with more ', h('b', { text: '|' }), '. Add a tip after ', h('b', { text: '>>' }), '. A plain line is a tip.'),
      own,
      h('div', { class: 'ho-own-row' },
        h('button', { class: 'soft-btn', id: 'ho-sample', onclick: () => { own.value = SAMPLE; state.text = SAMPLE; draw(); } }, 'Use this example'),
        h('button', { class: 'soft-btn', id: 'ho-make', onclick: () => { state.text = own.value; draw(); } }, '✨ Make pages')));
    const fit = () => host.style.setProperty('--s', Math.min(1, Math.max(0.3, (preview.clientWidth - 32) / PAGE_W)).toFixed(3));
    function draw() {
      host.replaceChildren();
      let ok = false;
      if (state.own) ok = BUILD[state.kind](host, Object.assign(fromText(state.text), base, { mission: null }), state);
      else sources().forEach((src) => { ok = BUILD[state.kind](host, Object.assign(fromGames(src.lesson, src.games, whole), headOf(src.lesson, src.games)), state) || ok; });
      const pages = host.querySelectorAll('.ho-page');
      pages.forEach((p, i) => { p.querySelector('.ho-num').textContent = `${i + 1} / ${pages.length}`; });
      if (!ok) host.append(h('p', { class: 'ho-empty', text: state.own ? 'Paste your content above, then tap “Make pages”.' : many && !state.picked.size ? 'Choose at least one lesson above.' : 'These games have nothing for this handout. Try another kind, or paste your own content.' }));
      const n = state.own ? 0 : sources().length;
      status.textContent = ok ? `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}${n > 1 ? `  ·  ${n} lessons` : ''}` : '';
      tabs.replaceChildren(...Object.keys(KINDS).map((k) => h('button', { class: `ho-tab ${k === state.kind ? 'on' : ''}`, role: 'tab', 'aria-selected': String(k === state.kind), 'data-kind': k, onclick: () => { state.kind = k; SEJ.sfx.select(); draw(); } }, `${KINDS[k].icon} ${KINDS[k].label}`)));
      const tick = (id, label, key) => h('label', { class: 'ho-check' }, h('input', { type: 'checkbox', id, ...(state[key] ? { checked: '' } : {}), onchange: (e) => { state[key] = e.target.checked; draw(); } }), label);
      const pick = (id, label, key, choices) => h('label', { class: 'ho-check' }, label, h('select', { class: 'ho-select', id, onchange: (e) => { state[key] = e.target.value; draw(); } }, choices.map(([v, t]) => h('option', { value: v, ...(state[key] === v ? { selected: '' } : {}) }, t))));
      if (state.kind !== 'cards' && state.answers === 'back') state.answers = 'card';
      opts.replaceChildren(...[
        state.kind === 'cards' && pick('ho-answers', 'Answers:', 'answers', [['card', 'On the card'], ['back', 'On the back (two-sided print)'], ['none', 'No answers (student copy)']]),
        state.kind === 'tips' && pick('ho-answers', 'Answers:', 'answers', [['card', 'With answers'], ['none', 'Without answers (class activity)']]),
        state.kind !== 'tips' && tick('ho-choices', state.kind === 'sheet' ? 'With answer choices (a, b, c)' : 'Show the answer choices', 'choices'),
        state.kind === 'sheet' && tick('ho-key', 'Add the answer key (for the teacher)', 'key'),
        tick('ho-own-on', 'Use my own content', 'own')].filter(Boolean));
      if (many) {
        scope.hidden = state.own;
        const all = many.every((u) => state.picked.has(u.lesson.code));
        scope.replaceChildren(
          h('span', { class: 'ho-scope-label', text: 'Lessons:' }),
          ...many.map((u) => h('button', { class: `ho-chip ${state.picked.has(u.lesson.code) ? 'on' : ''}`, 'data-lesson': u.lesson.code, 'aria-pressed': String(state.picked.has(u.lesson.code)), title: u.lesson.title, onclick: () => { if (state.picked.has(u.lesson.code)) state.picked.delete(u.lesson.code); else state.picked.add(u.lesson.code); draw(); } }, u.lesson.code)),
          h('button', { class: 'ho-chip ho-chip-all', id: 'ho-unit', onclick: () => { state.picked = new Set(all ? [lesson.code] : many.map((u) => u.lesson.code)); draw(); } }, all ? `Only ${lesson.code}` : `Whole Unit ${lesson.unit}`));
      }
      ownBox.hidden = !state.own;
      preview.scrollTop = 0;
    }
    const busy = (on) => overlay.querySelectorAll('.ho-actions button').forEach((b) => { b.disabled = on; });
    const close = () => { window.removeEventListener('resize', fit); document.removeEventListener('keydown', esc); overlay.remove(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    const overlay = h('div', { class: 'ho-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Handouts' },
      h('div', { class: 'ho-panel' },
        h('div', { class: 'ho-bar' },
          h('div', {}, h('strong', { text: '🖨️ Handouts' }), h('small', { text: `${base.sub}${whole ? `  ·  ${lesson.title}` : `  ·  ${games[0].title}`}` })),
          h('button', { class: 'soft-btn', id: 'ho-close', 'aria-label': 'Close', onclick: close }, '✕')),
        tabs, scope, opts, ownBox, preview,
        h('div', { class: 'ho-actions' }, status,
          h('button', { class: 'soft-btn', id: 'ho-print', onclick: () => { document.body.classList.add('ho-print'); const done = () => { document.body.classList.remove('ho-print'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print(); } }, '🖨️ Print'),
          h('button', { class: 'cta gummy g-green', id: 'ho-pdf', onclick: async () => {
            busy(true);
            try {
              await savePdf(host, fileName(), (n, of) => { status.textContent = `Making the PDF…  page ${n} of ${of}`; });
              status.textContent = '✅ PDF downloaded';
              SEJ.sfx.fanfare();
            } catch (e) { status.textContent = e.message || 'The PDF couldn’t be made.'; SEJ.sfx.wrong(); }
            busy(false);
          } }, '⬇ Download PDF'))));
    document.body.append(overlay);
    window.addEventListener('resize', fit);
    document.addEventListener('keydown', esc);
    fit();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { if (overlay.isConnected) { fit(); draw(); } });
    draw();
  }

  SEJ.handouts = { open, fromGames, fromText };
})();
