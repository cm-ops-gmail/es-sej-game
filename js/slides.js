/* Slides for teachers: a PowerPoint deck in the Spoken English Junior template look, made in the browser
   from a lesson's games or from an uploaded Word file. No AI: it lays out the content it is given. */
(function () {
  'use strict';
  const FONT = 'Anek Bangla';
  const RED = 'DC2728', DARK = '990000', INK = '111111', TEAL = '31859B', YELLOW = 'FFD966', GREEN = '9FD3A3';
  const STRIPS = ['F4CCCC', 'D9EAD3', 'FFF2CC', 'CFE2F3', 'EAD1DC'];
  const HEROES = { mathman: [413, 640], bhasha: [520, 624], knight: [466, 640], innovara: [520, 515] };
  const W = 13.333, H = 7.5;
  const clean = (t) => String(t === undefined || t === null ? '' : t).trim();
  const shuffle = (list) => SEJ.shuffle(list);

  let loading = null;
  function loadLib() {
    if (window.PptxGenJS) return Promise.resolve();
    if (!loading) loading = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'js/vendor/pptxgen.bundle.js'; s.onload = ok; s.onerror = () => { loading = null; bad(new Error('The slide maker couldn’t load. Check the internet.')); }; document.head.append(s); });
    return loading;
  }

  /* ---------- the deck and its slide kinds ---------- */
  function newDeck(title) {
    const pptx = new window.PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = title;
    pptx.defineSlideMaster({ title: 'SEJ', background: { path: 'assets/slides/bg.jpg' }, objects: [{ image: { path: 'assets/slides/10ms.png', x: 11.55, y: 0.38, w: 1.32, h: 0.36 } }] });
    let heroTurn = 0;
    const add = () => pptx.addSlide({ masterName: 'SEJ' });
    const text = (s, t, o) => s.addText(t, Object.assign({ fontFace: FONT, color: INK, bold: true, valign: 'middle', fit: 'shrink', margin: 4 }, o));
    const band = (s, color = YELLOW, h = 1.25) => {
      s.addShape(pptx.ShapeType.rtTriangle, { x: 0, y: H - h, w: W, h: h * 0.45, fill: { color }, line: { color, width: 0 }, flipH: true });
      s.addShape(pptx.ShapeType.rect, { x: 0, y: H - h * 0.56, w: W, h: h * 0.56, fill: { color }, line: { color, width: 0 } });
    };
    const hero = (s, x, height, name) => {
      const id = name || Object.keys(HEROES)[heroTurn++ % 4];
      const [w, h] = HEROES[id];
      s.addImage({ path: `assets/slides/${id}.png`, x, y: H - height - 0.12, w: height * w / h, h: height });
    };
    const deck = {
      pptx,
      cover() {
        const s = add();
        band(s, YELLOW, 3.4);
        s.addImage({ path: 'assets/slides/sej.png', x: 5.05, y: 0.55, w: 3.2, h: 1.74 });
        [['knight', 2.6, 3.3], ['innovara', 4.3, 3.6], ['bhasha', 8.4, 3.7], ['mathman', 5.7, 4.6]].forEach(([id, x, hh]) => hero(s, x, hh, id));
      },
      title(main, sub) {
        const s = add();
        text(s, main, { x: 1, y: 2.5, w: W - 2, h: 1.4, fontSize: 54, color: TEAL, align: 'center' });
        if (sub) text(s, sub, { x: 1, y: 3.9, w: W - 2, h: 0.6, fontSize: 20, color: '7F7F7F', bold: false, align: 'center' });
      },
      section(main, sub) {
        const s = add();
        text(s, main, { x: 1, y: 2.6, w: W - 2, h: 1.6, fontSize: 44, color: RED, align: 'center' });
        if (sub) text(s, sub, { x: 1, y: 4.2, w: W - 2, h: 0.5, fontSize: 18, align: 'center' });
      },
      intro(main, accent, color = GREEN) {
        const s = add();
        band(s, color, 3.2);
        text(s, [{ text: `${main} ` }, { text: accent, options: { color: RED } }], { x: 0.9, y: 1.7, w: 7.4, h: 3, fontSize: 54, align: 'left' });
        hero(s, 8.9, 5.6, 'mathman');
      },
      /* A list of points on pastel strips, like the template's activity rules. */
      points(head, accent, lines) {
        const s = add();
        text(s, [{ text: `${head} ` }, { text: accent || '', options: { color: RED } }], { x: 1, y: 0.7, w: W - 2.6, h: 0.9, fontSize: 34, align: 'center' });
        const list = lines.slice(0, 6);
        const rowH = Math.min(0.95, 5 / Math.max(1, list.length));
        list.forEach((line, i) => text(s, line, { x: 1.6, y: 1.9 + i * (rowH + 0.12), w: W - 3.2, h: rowH, fontSize: 22, align: 'center', fill: { color: STRIPS[i % STRIPS.length] } }));
      },
      /* A question with a hero on a yellow band; options sit on pastel strips. */
      question({ head, q, options, footer, big }) {
        const s = add();
        band(s);
        hero(s, 0.5, 4.3);
        if (head) text(s, head, { x: 3.6, y: 0.75, w: W - 5.6, h: 0.7, fontSize: 26, align: 'left' });
        text(s, q, { x: 3.6, y: 1.5, w: W - 4.4, h: options && options.length ? 1.3 : 2.6, fontSize: big ? 48 : 30, color: DARK, align: 'left', valign: 'top' });
        (options || []).slice(0, 5).forEach((o, i) => text(s, `${'ABCDE'[i]}.  ${o}`, { x: 3.6, y: 2.95 + i * 0.68, w: W - 4.6, h: 0.58, fontSize: 22, align: 'left', fill: { color: STRIPS[i % STRIPS.length] } }));
        if (footer) text(s, footer, { x: 3.6, y: 5.75, w: W - 4.4, h: 0.45, fontSize: 16, align: 'left' });
      },
      /* The answer on its own slide with a tick, and the explanation if the content gave one. */
      answer(a, note) {
        const s = add();
        text(s, `${a} ✅`, { x: 0.8, y: note ? 1.5 : 2.2, w: W - 1.6, h: 2.6, fontSize: String(a).length > 40 ? 44 : 72, align: 'center' });
        if (note) text(s, [{ text: 'Why?  ', options: { color: RED } }, { text: note, options: { bold: false } }], { x: 1.6, y: 4.5, w: W - 3.2, h: 1.5, fontSize: 24, align: 'center', fill: { color: 'FFF2CC' } });
      },
      table(head, rows) {
        const s = add();
        if (head) text(s, head, { x: 1, y: 0.7, w: W - 2.6, h: 0.8, fontSize: 30, align: 'left' });
        const body = rows.slice(0, 8).map((r, i) => r.map((c) => ({ text: clean(c), options: { bold: i === 0, fill: { color: i === 0 ? 'F4CCCC' : 'FFFFFF' }, fontFace: FONT, fontSize: 18, color: INK } })));
        s.addTable(body, { x: 1.2, y: 1.7, w: W - 2.4, border: { type: 'dash', color: '444444', pt: 1 }, valign: 'middle' });
      },
      closing() {
        const s = add();
        band(s, GREEN, 3.2);
        text(s, [{ text: 'Great job, ' }, { text: 'heroes!', options: { color: RED } }], { x: 0.9, y: 1.9, w: 7.4, h: 2.4, fontSize: 60, align: 'left' });
        hero(s, 8.9, 5.6, 'bhasha');
      },
      save(name) { return pptx.writeFile({ fileName: `${name.replace(/[^\w .-]+/g, ' ').trim() || 'slides'}.pptx` }); },
    };
    return deck;
  }

  /* ---------- a game's content as question and answer pairs ---------- */
  const noteFor = (game, key) => { const n = (game.notes || []).find(([line]) => key && line.includes(key)); return n ? n[1] : ''; };
  function cardsOf(game) {
    const t = game.t, items = game.items || [];
    const qa = (q, a, extra = {}) => Object.assign({ q: clean(q), a: clean(a), note: noteFor(game, clean(q)) || noteFor(game, clean(a)) }, extra);
    if (['quiz', 'boxes', 'plane', 'maze', 'winlose'].includes(t)) return items.map((i) => qa(i[0], i[1], { options: shuffle([i[1], ...i[2]]) }));
    if (t === 'imagequiz') return items.map((i) => qa(/^https?:/.test(i[0]) ? 'What is in the picture?' : `What is this?  ${i[0]}`, i[1], { options: shuffle([i[1], ...i[2]]), note: noteFor(game, i[1]) }));
    if (t === 'blank') return items.map((i) => { const m = i[0].match(/\{(.+?)\}/); return qa(i[0].replace(m[0], '______'), i[0].replace(m[0], m[1]), { options: shuffle([m[1], ...i[1]]), note: noteFor(game, i[0]) }); });
    if (t === 'unjumble' || t === 'magnets') return items.map((s) => { const x = String(s).split('|').pop().trim(); return qa(shuffle(x.split(/\s+/)).join('   /   '), x, { head: 'Put the words in order', note: noteFor(game, x) }); });
    if (t === 'sort' || t === 'speedsort') return game.cards.map((c) => qa(c[0], game.groups[c[1]].n, { head: 'Which group?', options: game.groups.map((g) => g.n) }));
    if (t === 'match' || t === 'pairs' || t === 'flash' || t === 'fliptiles') return (game.pairs || items).map((p) => qa(SEJ.clean(p[0]) || p[0], p[1], { head: 'What matches this?' }));
    if (t === 'find' || t === 'type' || t === 'fruit') return items.map((i) => qa(i[0], i[1]));
    if (t === 'balloonpop' || t === 'crossword' || t === 'wordsearch') return items.filter((i) => i[1]).map((i) => qa(i[1], i[0], { head: 'Which word is it?' }));
    if (t === 'anagram' || t === 'spell' || t === 'hangman') return items.map((i) => qa(i[1] || 'Spell the word', i[0], { head: `Spell the word  ${i[2] || ''}` }));
    if (t === 'tf') { const l = game.labels || ['True', 'False']; return items.map((i) => qa(i[0], i[1] ? l[0] : l[1], { options: l, note: i[3] || noteFor(game, i[0]) })); }
    if (t === 'pair') return items.map((i) => qa(`${i[3] || ''} ${i[0]}   +   ${i[1]} ${i[4] || ''}`, i[2] ? 'Pair' : 'No pair', { head: 'Do they go together?', options: ['Pair', 'No pair'], note: noteFor(game, i[0]) }));
    if (t === 'talk') return items.map((i) => qa(i[0], i[2], { footer: i[1] }));
    if (t === 'speakcards' || t === 'wheel') return items.map((i) => ({ q: `${i[1] || ''} ${i[0]}`.trim(), a: '', note: '' }));
    if (t === 'maths') return SEJ.makeMaths(game.settings).map((i) => qa(i[0], i[1], { options: shuffle([i[1], ...i[2]]) }));
    return [];
  }
  function addGame(deck, game) {
    const meta = SEJ.TEMPLATES[game.t] || {};
    deck.section(game.title, `${meta.ref || 'Game'}  |  ${SEJ.itemCount(game)} items`);
    const how = [game.prompt || meta.en, game.bn || meta.bn].filter(Boolean);
    if (game.t === 'whack') {
      deck.points('Which ones are', 'right?', shuffle(game.good.concat(game.bad)).slice(0, 6));
      deck.points('These are', 'right ✅', game.good.slice(0, 6));
      return;
    }
    if (game.t === 'rank') {
      deck.points(game.prompt || 'Put these in the', game.prompt ? '' : 'right order', shuffle(game.items.map((i) => i[0])).slice(0, 6));
      deck.points('The right order', '✅', game.items.map((i, n) => `${n + 1}.  ${i[0]}`).slice(0, 6));
      return;
    }
    if (game.t === 'memorize') { deck.points('Look and', 'remember!', game.items.map((i) => `${i[1] || ''} ${i[0]}`.trim()).slice(0, 6)); return; }
    if (game.t === 'labelled') { deck.points('Name the', 'parts', game.items.map((i) => i[0]).slice(0, 6)); return; }
    if (how.length) deck.points('How to', 'play', how);
    for (const c of cardsOf(game)) {
      deck.question({ head: c.head || game.title, q: c.q, options: c.options, footer: c.footer || (c.a ? 'Answer in the chat box quickly! 💬' : 'Say it out loud! 🗣️'), big: !c.options && c.q.length < 30 });
      if (c.a) deck.answer(c.a, c.note);
    }
  }

  /* ---------- a Word file as blocks: headings, lines, questions, answers, tables ---------- */
  async function readDocx(file) {
    if (!window.JSZip) throw new Error('This browser can’t open Word files here.');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const part = zip.file('word/document.xml');
    if (!part) throw new Error('That doesn’t look like a Word (.docx) file.');
    const doc = new DOMParser().parseFromString(await part.async('string'), 'application/xml');
    const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const kids = (el, name) => Array.from(el.children).filter((c) => c.localName === name);
    const textOf = (p) => Array.from(p.getElementsByTagNameNS(NS, '*')).map((n) => (n.localName === 't' ? n.textContent : n.localName === 'tab' ? ' ' : n.localName === 'br' ? '\n' : '')).join('').replace(/[ \t]+/g, ' ').trim();
    const blocks = [];
    const body = doc.getElementsByTagNameNS(NS, 'body')[0];
    for (const el of Array.from(body ? body.children : [])) {
      if (el.localName === 'tbl') {
        const rows = kids(el, 'tr').map((tr) => kids(tr, 'tc').map((tc) => kids(tc, 'p').map(textOf).filter(Boolean).join(' ')));
        if (rows.length) blocks.push({ kind: 'table', rows });
        continue;
      }
      if (el.localName !== 'p') continue;
      const t = textOf(el);
      if (!t) continue;
      const pPr = kids(el, 'pPr')[0];
      const style = pPr && kids(pPr, 'pStyle')[0] ? kids(pPr, 'pStyle')[0].getAttributeNS(NS, 'val') || '' : '';
      const runs = kids(el, 'r').filter((r) => r.textContent.trim());
      const allBold = runs.length > 0 && runs.every((r) => { const rPr = kids(r, 'rPr')[0]; const b = rPr && kids(rPr, 'b')[0]; return b && b.getAttributeNS(NS, 'val') !== '0' && b.getAttributeNS(NS, 'val') !== 'false'; });
      const level = /^title$/i.test(style) ? 1 : (style.match(/^heading\s*(\d)/i) || [])[1] ? Number(style.match(/^heading\s*(\d)/i)[1]) : allBold && t.length <= 70 && !/[.?!:]$/.test(t) ? 2 : 0;
      blocks.push({ kind: level ? 'heading' : 'text', level, text: t, list: !!(pPr && kids(pPr, 'numPr')[0]) });
    }
    return blocks;
  }
  function addBlocks(deck, blocks, fallbackTitle) {
    let head = fallbackTitle, lines = [], lastQ = false;
    const flush = () => { while (lines.length) deck.points(head, '', lines.splice(0, 6)); };
    const first = blocks.find((b) => b.kind === 'heading');
    deck.title(first ? first.text : fallbackTitle, 'Spoken English Junior');
    for (const b of blocks) {
      if (b === first) continue;
      if (b.kind === 'table') { flush(); deck.table(head, b.rows); lastQ = false; continue; }
      if (b.kind === 'heading') { flush(); head = b.text; if (b.level === 1) deck.section(b.text); lastQ = false; continue; }
      const ans = b.text.match(/^(answer|ans|উত্তর)\s*[:：-]\s*(.+)$/i);
      const why = b.text.match(/^(explanation|why|reason|ব্যাখ্যা)\s*[:：-]\s*(.+)$/i);
      if (ans) { flush(); deck.answer(ans[2]); lastQ = false; continue; }
      if (why) { flush(); deck.points('Why?', '', [why[2]]); lastQ = false; continue; }
      if (/\?$/.test(b.text) && !b.list) {
        flush();
        const options = [];
        let i = blocks.indexOf(b) + 1;
        while (blocks[i] && blocks[i].kind === 'text' && (blocks[i].list || /^[A-Da-d][.)]\s+/.test(blocks[i].text)) && options.length < 5) { options.push(blocks[i].text.replace(/^[A-Da-d][.)]\s+/, '')); blocks[i].used = true; i++; }
        deck.question({ head, q: b.text.replace(/^(q(uestion)?\s*\d*\s*[:.)-]\s*)/i, ''), options, footer: 'Answer in the chat box quickly! 💬' });
        lastQ = true;
        continue;
      }
      if (b.used) continue;
      lines.push(b.text);
      lastQ = false;
    }
    flush();
    void lastQ;
  }

  SEJ.slides = {
    cardsOf,
    /* All the games on a lesson's map, as one deck. */
    async lesson(lesson, games) {
      await loadLib();
      const deck = newDeck(`${lesson.code} ${lesson.title}`);
      deck.cover();
      deck.title(lesson.title, `Unit 0${lesson.unit}  |  Lesson ${lesson.code}`);
      deck.intro('Let us begin with a', 'Fun Activity!');
      if (lesson.mission && lesson.mission.en) deck.points('In today’s class, we will', 'learn-', [lesson.mission.en, lesson.mission.bn].filter(Boolean));
      games.forEach((g) => addGame(deck, g));
      deck.closing();
      return deck.save(`${lesson.code} ${lesson.title}`);
    },
    async game(lesson, game) {
      await loadLib();
      const deck = newDeck(game.title);
      deck.title(game.title, `${lesson.title}  |  Lesson ${lesson.code}`);
      addGame(deck, game);
      deck.closing();
      return deck.save(`${lesson.code} ${game.title}`);
    },
    async docx(file) {
      await loadLib();
      const blocks = await readDocx(file);
      if (!blocks.length) throw new Error('No text was found in that file.');
      const name = file.name.replace(/\.docx$/i, '');
      const deck = newDeck(name);
      deck.cover();
      addBlocks(deck, blocks, name);
      deck.closing();
      return deck.save(name);
    },
    /* For tests: the slide count without saving a file. */
    async count(make) { await loadLib(); const deck = newDeck('t'); make(deck, { addGame, addBlocks }); return deck.pptx.slides ? deck.pptx.slides.length : deck.pptx._slides.length; },
    readDocx,
  };
})();
