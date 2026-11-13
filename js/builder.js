/* Admin panel: pick a lesson, choose which games are on the map, and create new games from any
   Wordwall game type by pasting content in a simple line format. Saves go to everyone through
   api/content (the Google Sheet); without it they stay on this device. */
(function () {
  'use strict';
  const { h, sfx, store } = SEJ;
  const LIST = ';';
  const splitList = (s) => (s || '').split(LIST).map((x) => x.trim()).filter(Boolean);
  const cells = (line) => line.split('|').map((x) => x.trim());
  const lines = (text) => text.split('\n').map((x) => x.trim()).filter(Boolean);
  const yes = (s) => /^(y|yes|true|t|1|pair)$/i.test(s || '');
  const LETTERS = /^[A-Za-z]{1,14}( [A-Za-z]{1,14})*$/;

  /* ---------- paste formats: how each game type reads and writes its content ---------- */
  const simple = (help, sample, write, read) => ({ help, sample, write, read });
  const pipeRows = (n, names) => ({
    write: (g) => g.items.map((i) => i.slice(0, n).map((x) => x || '').join(' | ')).join('\n'),
    read: (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (!c[0] || (names[1] && !c[1] && names[1].required)) throw new Error(`"${l}" needs ${names.map((x) => x.name).slice(0, 2).join(' | ')}.`); return names.map((_, k) => c[k] || ''); }) }),
  });
  const req = (name) => ({ name, required: true });
  const opt = (name) => ({ name });
  const quizRead = (min = 1, max = 3) => (t) => ({ items: lines(t).map((l) => { const c = cells(l); const w = splitList(c[2]); if (c.length < 3 || w.length < min || w.length > max) throw new Error(`"${l}" needs a right answer and ${min === max ? min : `${min} to ${max}`} wrong answers after | separated by ;`); return [c[0], c[1], w, c[3] || '']; }) });
  const quizWrite = (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2].join(LIST + ' ')}${i[3] ? ` | ${i[3]}` : ''}`).join('\n');
  const sortFmt = simple('# group name | emoji (one line per group)\ncard text | group number | emoji', '# Polite | 😊\n# Impolite | 😠\nCould you help me? | 1 | 🙋\nHurry up! | 2 | 🏃\nThank you very much. | 1 | 🙏\nMove! | 2 | 😤',
    (g) => g.groups.map((x) => `# ${x.n} | ${x.e || ''}`).concat(g.cards.map((c) => `${c[0]} | ${c[1] + 1} | ${c[2] || ''}`)).join('\n'),
    (t) => {
      const groups = [], cards = [];
      lines(t).forEach((l) => {
        if (l.startsWith('#')) { const c = cells(l.slice(1)); groups.push({ n: c[0], e: c[1] || '' }); return; }
        const c = cells(l);
        const n = parseInt(c[1], 10) - 1;
        if (!(n >= 0)) throw new Error(`"${l}" needs a group number after |`);
        cards.push([c[0], n, c[2] || '']);
      });
      if (groups.length < 2 || groups.length > 3) throw new Error('Add 2 or 3 lines that start with # for the groups.');
      cards.forEach((c) => { if (c[1] >= groups.length) throw new Error(`"${c[0]}" uses group ${c[1] + 1}, which doesn’t exist.`); });
      return { groups, cards };
    });
  const lettersFmt = (sample) => simple('word | clue | emoji', sample,
    (g) => g.items.map((i) => `${i[0]} | ${i[1] || ''} | ${i[2] || ''}`).join('\n'),
    (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (!LETTERS.test(c[0])) throw new Error(`"${c[0]}" must be letters only, up to 14 per word.`); return [c[0], c[1] || '', c[2] || '']; }) }));
  const sentenceFmt = simple('emoji | sentence (one per line)', '🏫 | I study at school.\n🎂 | I am ten years old.\n🏙️ | I live in Dhaka.',
    (g) => g.items.map((s) => (s.includes('|') ? s.split('|').join(' | ') : ` | ${s}`)).join('\n'),
    (t) => ({ items: lines(t).map((l) => { const c = cells(l); const s = c.length > 1 ? c.slice(1).join(' ') : c[0]; if (s.trim().split(/\s+/).length < 2) throw new Error(`"${l}" needs at least 2 words.`); return (c.length > 1 && c[0] ? `${c[0]}|` : '') + s; }) }));

  const F = {
    unjumble: sentenceFmt,
    magnets: sentenceFmt,
    sort: sortFmt,
    speedsort: sortFmt,
    blank: simple('sentence with the {answer} in braces | wrong; wrong | emoji', 'I {play} in the park. | playing | ⚽\nShe {eats} rice. | eat | 🍚\nWe {go} to school. | goes | 🏫',
      (g) => g.items.map((i) => `${i[0]} | ${i[1].join(LIST + ' ')} | ${i[2] || ''}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (!/\{.+\}/.test(c[0])) throw new Error(`"${l}" needs the answer in {braces}.`); const w = splitList(c[1]); if (!w.length) throw new Error(`"${l}" needs at least one wrong word.`); return [c[0], w, c[2] || '']; }) })),
    match: simple('left card | right card', '🍳 Kitchen | We cook food here\n🛏️ Bedroom | We sleep here\n🛁 Bathroom | We take a bath here',
      (g) => g.pairs.map((p) => `${p[0]} | ${p[1]}`).join('\n'),
      (t) => ({ pairs: lines(t).map((l) => { const c = cells(l); if (c.length < 2 || !c[1]) throw new Error(`"${l}" needs a | and a match.`); return [c[0], c[1]]; }) })),
    find: simple('clue | answer', 'the first meal of the day | Breakfast\nthe last meal of the day | Dinner\nwe stir food with them | Spoons', ...Object.values(pipeRows(2, [req('clue'), req('answer')]))),
    pair: simple('first | second | yes or no | emoji 1 | emoji 2', 'Rice | Curry | yes | 🍚 | 🍛\nBread | Butter | yes | 🍞 | 🧈\nRice | Syrup | no | 🍚 | 🍯',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2] ? 'yes' : 'no'} | ${i[3] || ''} | ${i[4] || ''}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (c.length < 3) throw new Error(`"${l}" needs first | second | yes or no.`); return [c[0], c[1], yes(c[2]), c[3] || '', c[4] || '']; }) })),
    tf: simple('# first label | second label (optional, default True | False)\nstatement | yes or no (yes = first label) | emoji', 'Red means stop. | yes | 🔴\nThe sun is cold. | no | ☀️\nCats can fly. | no | 🐱',
      (g) => (g.labels ? [`# ${g.labels[0]} | ${g.labels[1]}`] : []).concat(g.items.map((i) => `${i[0]} | ${i[1] ? 'yes' : 'no'} | ${i[2] || ''}`)).join('\n'),
      (t) => {
        const out = { items: [] };
        lines(t).forEach((l) => {
          if (l.startsWith('#')) { const c = cells(l.slice(1)); out.labels = [c[0], c[1]]; return; }
          const c = cells(l);
          if (c.length < 2) throw new Error(`"${l}" needs | yes or | no.`);
          out.items.push([c[0], yes(c[1]), c[2] || '', c[3] || '']);
        });
        if (!out.labels) out.labels = undefined;
        return out;
      }),
    quiz: simple('question | right answer | wrong; wrong; wrong | emoji', 'Who is the master of math? | MathMan | Ms Bhasha; Innovara | 🔢\nWhat do we sleep on? | A bed | A table; A sink | 🛏️', quizWrite, quizRead()),
    whack: simple('# instruction for the child\n+ a right phrase\n- a wrong phrase', '# Tap only the polite words!\n+ Thank you\n+ Please\n- Go away\n- Hurry up',
      (g) => [`# ${g.prompt || ''}`].concat(g.good.map((x) => `+ ${x}`), g.bad.map((x) => `- ${x}`)).join('\n'),
      (t) => {
        const out = { prompt: '', good: [], bad: [] };
        lines(t).forEach((l) => {
          if (l[0] === '#') out.prompt = l.slice(1).trim();
          else if (l[0] === '+') out.good.push(l.slice(1).trim());
          else if (l[0] === '-') out.bad.push(l.slice(1).trim());
          else throw new Error(`"${l}" must start with +, - or #.`);
        });
        if (!out.good.length || !out.bad.length) throw new Error('Add at least one + line and one - line.');
        return out;
      }),
    plane: simple('prompt | right answer | wrong; wrong', 'Past tense of GO | went | goes; going\nPast tense of EAT | ate | eats; eating',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2].join(LIST + ' ')}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); const w = splitList(c[2]); if (c.length < 3 || w.length !== 2) throw new Error(`"${l}" needs an answer and exactly 2 wrong answers.`); return [c[0], c[1], w]; }) })),
    talk: simple('question | sentence starter | example answer', 'What is your name? | My name is ___. | My name is Robin.',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2]}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (c.length < 3) throw new Error(`"${l}" needs question | starter | example.`); return [c[0], c[1], c[2]]; }) })),
    anagram: lettersFmt('pencil | We write with it | ✏️\neraser | It rubs out mistakes | 🧽\nruler | We draw lines with it | 📏'),
    spell: lettersFmt('pencil | পেন্সিল | ✏️\neraser | ইরেজার | 🧽\nruler | রুলার | 📏'),
    hangman: lettersFmt('pencil | We write with it | ✏️\nelephant | A big grey animal | 🐘\nrainbow | Seven colours in the sky | 🌈'),
    flash: simple('front | back | emoji or picture link', 'Spoon | চামচ | 🥄\nFork | কাঁটাচামচ | 🍴\nKnife | ছুরি | 🔪', ...Object.values(pipeRows(3, [req('front'), req('back'), opt('emoji')]))),
    speakcards: simple('prompt | emoji (one card per line)', 'Talk about your favourite food. | 🍕\nWhat did you do yesterday? | 📅\nDescribe your best friend. | 🧑‍🤝‍🧑', ...Object.values(pipeRows(2, [req('prompt'), opt('emoji')]))),
    wheel: simple('what the wheel can land on | emoji', 'Say a word that starts with B | 🅱️\nName a fruit | 🍎\nSay a colour | 🎨\nName an animal | 🐯', ...Object.values(pipeRows(2, [req('item'), opt('emoji')]))),
    pairs: simple('card | its pair', 'Spoon | চামচ\nFork | কাঁটাচামচ\nKnife | ছুরি\nPlate | প্লেট', ...Object.values(pipeRows(2, [req('card'), req('pair')]))),
    type: simple('question | answer | emoji', 'What do we cut paper with? | scissors | ✂️\nWhat do we write with? | pencil | ✏️', ...Object.values(pipeRows(3, [req('question'), req('answer'), opt('emoji')]))),
    wordsearch: simple('word | clue (optional)', 'pencil | We write with it\nruler | We draw lines with it\nbook | We read it\nbag | We carry books in it', ...Object.values(pipeRows(2, [req('word'), opt('clue')]))),
    crossword: simple('word | clue', 'cat | A pet that says meow\ntiger | A big striped cat\nrat | A small animal with a long tail\nhen | A bird that lays eggs', ...Object.values(pipeRows(2, [req('word'), req('clue')]))),
    fliptiles: simple('front | back', 'Spring | বসন্ত\nSummer | গ্রীষ্ম\nWinter | শীত\nAutumn | শরৎ', ...Object.values(pipeRows(2, [req('front'), req('back')]))),
    maze: simple('question | right answer | wrong; wrong; wrong', 'Which one is a fruit? | Mango | Chair; Pen; Shoe\nWhich one can fly? | Bird | Fish; Cat; Cow', quizWrite, quizRead(1, 3)),
    balloonpop: simple('word | meaning', 'Spoon | We stir with it\nKnife | We cut with it\nPlate | We eat from it\nCup | We drink from it', ...Object.values(pipeRows(2, [req('word'), req('meaning')]))),
    fruit: simple('prompt | answer | emoji', 'Past tense of GO | went | 🏃\nPast tense of EAT | ate | 🍽️\nPast tense of SEE | saw | 👀', ...Object.values(pipeRows(3, [req('prompt'), req('answer'), opt('emoji')]))),
    rank: simple('# instruction (optional)\none item per line, in the right order', '# Put the morning in order\nWake up\nBrush my teeth\nEat breakfast\nGo to school',
      (g) => (g.prompt ? [`# ${g.prompt}`] : []).concat(g.items.map((i) => i[0])).join('\n'),
      (t) => {
        const out = { prompt: '', items: [] };
        lines(t).forEach((l) => { if (l[0] === '#') out.prompt = l.slice(1).trim(); else out.items.push([l]); });
        if (!out.prompt) delete out.prompt;
        return out;
      }),
    imagequiz: simple('picture (emoji or https picture link) | right answer | wrong; wrong; wrong', '🦁 | Lion | Tiger; Cat; Dog\n🐘 | Elephant | Horse; Cow; Rhino', quizWrite, quizRead()),
    winlose: simple('question | right answer | wrong; wrong; wrong | emoji', 'Which one is a vegetable? | Carrot | Apple; Mango | 🥕\nWhat colour is the sky? | Blue | Green; Red | ☁️', quizWrite, quizRead()),
    memorize: simple('item | emoji (6 or more)', 'Apple | 🍎\nBall | ⚽\nCat | 🐱\nDog | 🐶\nEgg | 🥚\nFish | 🐟\nHat | 🎩\nKite | 🪁', ...Object.values(pipeRows(2, [req('item'), opt('emoji')]))),
    labelled: simple('# picture: an emoji or an https picture link\nlabel | across (0 to 100) | down (0 to 100)', '# 🏠\nRoof | 50 | 18\nWindow | 32 | 55\nDoor | 50 | 80',
      (g) => [`# ${g.pic}`].concat(g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2]}`)).join('\n'),
      (t) => {
        let pic = '';
        const items = [];
        lines(t).forEach((l) => {
          if (l[0] === '#') { pic = l.slice(1).trim(); return; }
          const c = cells(l);
          const x = Number(c[1]), y = Number(c[2]);
          if (!c[0] || !(x >= 0 && x <= 100) || !(y >= 0 && y <= 100)) throw new Error(`"${l}" needs label | a number 0 to 100 | a number 0 to 100.`);
          items.push([c[0], x, y]);
        });
        if (!pic) throw new Error('Add a first line like: # 🏠 (or # and a picture link).');
        return { pic, items };
      }),
    maths: simple('# operations: + - x ÷\n# numbers: from to\n# questions: how many\n# answers in words: yes or no', '# operations: + -\n# numbers: 1 10\n# questions: 8\n# answers in words: yes',
      (g) => [`# operations: ${g.settings.ops.join(' ')}`, `# numbers: ${g.settings.from} ${g.settings.to}`, `# questions: ${g.settings.count}`, `# answers in words: ${g.settings.words ? 'yes' : 'no'}`].join('\n'),
      (t) => {
        const get = (k) => { const l = lines(t).find((x) => x.toLowerCase().includes(k)); return l ? l.split(':').slice(1).join(':').trim() : ''; };
        const ops = get('operations').split(/\s+/).map((x) => (x === '*' ? 'x' : x === '/' ? '÷' : x)).filter((x) => ['+', '-', 'x', '÷'].includes(x));
        const [from, to] = get('numbers').split(/\s+/).map(Number);
        const count = Number(get('questions'));
        if (!ops.length) throw new Error('Add operations, for example: # operations: + -');
        if (!(from >= 0 && to >= from && to <= 100)) throw new Error('Add numbers, for example: # numbers: 1 10');
        if (!(count >= 2 && count <= 30)) throw new Error('Add how many questions, 2 to 30, for example: # questions: 8');
        return { settings: { ops, from, to, count, words: yes(get('answers in words')) } };
      }),
  };
  F.boxes = F.quiz;
  SEJ.formats = F;

  /* ---------- the 34 Wordwall game types, grouped by what they practise ---------- */
  const CATALOG = [
    ['Vocabulary', [['Match up', 'match'], ['Anagram', 'anagram'], ['Flash cards', 'flash'], ['Flip tiles', 'fliptiles']]],
    ['Sentence building', [['Unjumble', 'unjumble'], ['Complete the sentence', 'blank'], ['Word magnets', 'magnets']]],
    ['Grammar practice', [['Quiz', 'quiz'], ['True or false', 'tf'], ['Whack-a-mole', 'whack'], ['Pair or No Pair', 'pair']]],
    ['Speaking', [['Speaking cards', 'speakcards'], ['Spin the wheel', 'wheel']]],
    ['Listening and pictures', [['Image quiz', 'imagequiz'], ['Labelled diagram', 'labelled']]],
    ['Thinking and sorting', [['Group sort', 'sort'], ['Speed sorting', 'speedsort'], ['Rank order', 'rank']]],
    ['Memory', [['Matching pairs', 'pairs'], ['Watch and memorize', 'memorize']]],
    ['Quick answers', [['Gameshow quiz', 'quiz', { show: true }], ['Balloon pop', 'balloonpop'], ['Flying fruit', 'fruit'], ['Airplane', 'plane'], ['Maze chase', 'maze'], ['Find the match', 'find'], ['Win or lose quiz', 'winlose']]],
    ['Class games', [['Open the box', 'boxes']]],
    ['Spelling', [['Spell the word', 'spell'], ['Hangman', 'hangman'], ['Type the answer', 'type'], ['Wordsearch', 'wordsearch'], ['Crossword', 'crossword']]],
    ['Numbers', [['Maths generator', 'maths']]],
  ];
  SEJ.CATALOG = CATALOG;
  const wwName = (g) => { for (const [, list] of CATALOG) for (const [n, t, o] of list) if (t === g.t && (!o || o.show === !!g.show) && !(t === 'quiz' && !o && g.show)) return n; return SEJ.TEMPLATES[g.t] ? SEJ.TEMPLATES[g.t].ref : g.t; };

  /* Reads text into a finished game and checks it can be played. */
  /* Any line may end with ">> explanation". Games ignore it; slides show it with the answer. */
  function splitNotes(text) {
    const notes = [];
    const body = String(text).split('\n').map((line) => {
      const i = line.indexOf('>>');
      if (i < 0) return line;
      const main = line.slice(0, i).trim(), note = line.slice(i + 2).trim();
      if (main && note) notes.push([main, note]);
      return main;
    }).join('\n');
    return { body, notes };
  }
  const withNotes = (game, text) => (!game.notes || !game.notes.length ? text : text.split('\n').map((line) => { const n = game.notes.find(([main]) => main === line.trim()); return n ? `${line} >> ${n[1]}` : line; }).join('\n'));
  function parseGame(t, title, rawText, extra = {}) {
    const { body: text, notes } = splitNotes(rawText);
    const body = F[t].read(text);
    if (notes.length) body.notes = notes;
    const count = t === 'maths' ? body.settings.count : (body.items || body.cards || body.pairs || body.good || []).length;
    const min = t === 'memorize' ? 6 : t === 'wheel' || t === 'rank' || t === 'pairs' ? 3 : 2;
    if (count < min) throw new Error(`Add at least ${min} items.`);
    if (t === 'find' && new Set(body.items.map((i) => i[1])).size < 2) throw new Error('This game needs at least 2 different answers.');
    if ((t === 'wordsearch' || t === 'crossword') && body.items.some((i) => !/^[A-Za-z]{2,10}$/.test(i[0]))) throw new Error('Words must be one word of 2 to 10 letters, letters only.');
    if (t === 'balloonpop' || t === 'fruit' || t === 'pairs') {
      const k = t === 'fruit' ? 1 : 0;
      if (new Set(body.items.map((i) => i[k])).size < Math.min(2, body.items.length)) throw new Error('Answers must be different from each other.');
    }
    const game = Object.assign({ t, title: title.trim() || SEJ.TEMPLATES[t].name }, extra, body);
    if (game.labels === undefined) delete game.labels;
    return game;
  }
  SEJ.parseGame = parseGame;
  SEJ.itemCount = (g) => (g.t === 'maths' ? g.settings.count : (g.items || g.cards || g.pairs || g.good || []).length);

  /* ---------- saving: shared for everyone, or this device only ---------- */
  const PIN_KEY = 'sej-admin-pin';
  const getPin = () => { try { return sessionStorage.getItem(PIN_KEY) || ''; } catch (e) { return ''; } };
  const setPin = (p) => { try { if (p) sessionStorage.setItem(PIN_KEY, p); else sessionStorage.removeItem(PIN_KEY); } catch (e) { /* not kept */ } };
  /* All lessons' changes: what is shared, with anything saved on this device on top. */
  const allChanges = () => Object.assign({}, window.SEJ_CUSTOM || {}, store.state.custom);
  const SHEET_HELP = 'The Google Sheet isn’t shared with the app yet. Share it with the service account as Editor.';
  /* Two sets of games: "batch" is what students see through a batch link, "base" is the plain site address. */
  const scope = () => SEJ.adminScope();
  const setScope = (v) => { try { sessionStorage.setItem('sej-admin-scope', v); } catch (e) { /* not kept */ } };
  const keyOf = (code) => (scope() === 'base' ? `base:${code}` : code);
  async function saveLessonChange(lessonCode, change) {
    const code = keyOf(lessonCode);
    const shared = SEJ.sharedInfo && SEJ.sharedInfo.shared;
    if (shared) {
      const r = await fetch('api/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ side: 'save', pin: getPin(), code, change }) });
      const res = await r.json().catch(() => ({}));
      if (r.status === 401) { setPin(''); throw new Error('Please log in again.'); }
      if (!r.ok) throw new Error(res.error === 'sheet not shared' ? SHEET_HELP : res.error === 'too large' ? 'This lesson has too much content to save. Remove a game or shorten one.' : 'The save didn’t reach the server. Check the internet and try again.');
      const next = Object.assign({}, window.SEJ_CUSTOM || {});
      if (change) next[code] = change; else delete next[code];
      window.SEJ_CUSTOM = next;
      delete store.state.custom[code];
      store.save();
      return 'everyone';
    }
    if (change) store.state.custom[code] = change; else delete store.state.custom[code];
    store.save();
    return 'device';
  }

  /* A lesson's admin view: default games, created games, and which are on the map. */
  function lessonState(code) {
    const base = window.SEJ_LESSONS.find((l) => l.code === code);
    const o = allChanges()[keyOf(code)] || {};
    const created = (o.created || []).slice();
    const edits = Object.assign({}, o.edits || {});
    let map;
    if (Array.isArray(o.map)) map = o.map.slice();
    else if (Array.isArray(o.games)) {
      /* Older device edits stored the whole game list: keep them as created games. */
      map = o.games.map((g, i) => { const id = `n${i}`; created.push(Object.assign({}, g, { id })); return id; });
    } else map = base.games.map((_, i) => `d${i}`);
    return { base, created, edits, map, talk: o.talk };
  }
  const gameOf = (st, id) => (id[0] === 'd' ? st.edits[id] || st.base.games[Number(id.slice(1))] : st.created.find((g) => g.id === id));
  const changeOf = (st) => {
    const isDefault = st.map.join() === st.base.games.map((_, i) => `d${i}`).join() && !st.created.length && !Object.keys(st.edits).length && !st.talk;
    return isDefault ? null : { map: st.map, created: st.created, edits: st.edits, ...(st.talk ? { talk: st.talk } : {}) };
  };

  /* ---------- small helpers ---------- */
  async function makeSlides(fn) {
    toast('Making your slides…');
    try { await fn(); toast('Slides downloaded. Open the file in PowerPoint or Google Slides.'); } catch (e) { toast(e.message || 'The slides couldn’t be made.', true); }
  }
  const toast = (msg, bad) => {
    const t = h('div', { class: `toast ${bad ? 'toast-bad' : ''}`, role: 'status', text: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 3200);
  };
  const twoTap = (label, armed, fn, cls = 'soft-btn danger') => h('button', {
    class: cls, onclick: (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; const was = b.textContent; b.textContent = armed; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = was; } }, 2600); return; }
      fn();
    },
  }, label);

  /* ---------- login ---------- */
  function login(root, next) {
    if (!SEJ.relay || !SEJ.relay.available) {
      root.replaceChildren(h('div', { class: 'admin-login' }, h('div', { class: 'pin-card' }, h('h1', { class: 'pin-title', text: 'Admin' }), h('p', { class: 'pin-msg', text: 'The admin panel works on the live website.' }), h('a', { class: 'pin-cancel', href: '#/map' }, '← Back to the map'))));
      return;
    }
    let busy = false;
    const msg = h('p', { class: 'pin-msg', role: 'status', text: 'Enter the admin password to manage lessons and batches.' });
    const pass = h('input', { class: 'b-input', id: 'admin-pass', type: 'password', autocomplete: 'current-password', placeholder: 'Password', 'aria-label': 'Admin password', maxlength: '64' });
    const eye = h('button', { class: 'pass-eye', type: 'button', 'aria-label': 'Show password', 'aria-pressed': 'false', onclick: () => { const on = pass.type === 'password'; pass.type = on ? 'text' : 'password'; eye.textContent = on ? 'Hide' : 'Show'; eye.setAttribute('aria-pressed', String(on)); pass.focus(); } }, 'Show');
    const btn = h('button', { class: 'cta', id: 'admin-login', type: 'submit' }, 'Log in');
    const form = h('form', { class: 'pin-card pass-card', onsubmit: async (e) => {
      e.preventDefault();
      if (busy) return;
      const entry = pass.value;
      if (!entry) { msg.textContent = 'Type the password first.'; pass.focus(); return; }
      busy = true; btn.disabled = true;
      msg.className = 'pin-msg';
      msg.textContent = 'Checking…';
      let res = {};
      try { const r = await fetch('api/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ side: 'login', pin: entry }) }); res = Object.assign({ status: r.status }, await r.json().catch(() => ({}))); } catch (err) { res = { offline: true }; }
      busy = false; btn.disabled = false;
      if (res.ok) { setPin(entry); sfx.tap(); next(); return; }
      pass.value = '';
      pass.focus();
      SEJ.fx.play(pass, 'shake');
      msg.className = 'pin-msg bad';
      msg.textContent = res.offline ? 'No internet. Try again.' : res.wait ? `Too many tries. Wait ${res.wait} seconds.` : 'Wrong password. Try again.';
    } },
      h('div', { class: 'pin-lock', 'aria-hidden': 'true', text: '🔒' }),
      h('h1', { class: 'pin-title', text: 'Admin login' }),
      msg,
      h('label', { class: 'b-label pass-field' }, 'Password', h('div', { class: 'pass-wrap' }, pass, eye)),
      btn,
      h('a', { class: 'pin-cancel', href: '#/map' }, '← Back to the map'));
    root.replaceChildren(h('div', { class: 'admin-login' }, form));
    pass.focus();
  }

  /* ---------- the panel ---------- */
  let code = '1.1';
  function render(root, lessonCode, screen) {
    if (!getPin()) return login(root, () => render(root, lessonCode, screen));
    if (lessonCode && lessonCode !== 'batches') code = lessonCode;
    if (!window.SEJ_LESSONS.some((l) => l.code === code)) code = '1.1';
    if (lessonCode === 'batches') return batches(root);
    if (screen === 'new') return picker(root);
    const st = lessonState(code);
    const links = (window.SEJ_LINKS || {})[code] || {};
    const shared = SEJ.sharedInfo && SEJ.sharedInfo.shared;
    const changes = allChanges();

    const commit = async (msg) => {
      try {
        const where = await saveLessonChange(code, changeOf(st));
        toast(where === 'everyone' ? `${msg}. Students see it now.` : `${msg} on this device only.`);
      } catch (e) { toast(e.message, true); }
      render(root);
    };

    const row = (id, g, actions) => {
      const t = SEJ.TEMPLATES[g.t] || { icon: '🎮', name: g.t };
      return h('article', { class: 'b-game', 'data-id': id },
        h('span', { class: 'b-icon', 'aria-hidden': 'true', text: t.icon }),
        h('div', { class: 'b-game-body' }, h('strong', { text: g.title }), h('small', { text: `${wwName(g)} · ${SEJ.itemCount(g)} items` })),
        h('span', { class: 'cms-badge', text: wwName(g) }),
        h('div', { class: 'b-actions' }, actions));
    };
    const onMap = st.map.map((id, i) => {
      const g = gameOf(st, id);
      if (!g) return null;
      return row(id, g, [
        h('a', { class: 'soft-btn', href: `#/play/${code}/${i}`, title: 'Play it as a student' }, '▶ Play'),
        h('button', { class: 'soft-btn', onclick: () => editor(root, st, id, g) }, '✏️ Edit'),
        h('button', { class: 'soft-btn', title: 'Slides for this game', onclick: () => makeSlides(() => SEJ.slides.game(st.base, g)) }, '📑 Slides'),
        h('button', { class: 'soft-btn', title: 'Flashcards, quick tips or a practice sheet from this game, as a PDF', onclick: () => SEJ.handouts.open(st.base, [g], false) }, '🖨️ Handouts'),
        h('button', { class: 'soft-btn', disabled: i === 0, 'aria-label': 'Move up', onclick: () => { [st.map[i - 1], st.map[i]] = [st.map[i], st.map[i - 1]]; commit('Order saved'); } }, '↑'),
        h('button', { class: 'soft-btn', disabled: i === st.map.length - 1, 'aria-label': 'Move down', onclick: () => { [st.map[i + 1], st.map[i]] = [st.map[i], st.map[i + 1]]; commit('Order saved'); } }, '↓'),
        h('button', { class: 'soft-btn', disabled: st.map.length <= 1, title: st.map.length <= 1 ? 'A lesson needs at least one game' : 'Take it off the map', onclick: () => { st.map = st.map.filter((x) => x !== id); commit('Removed from the map'); } }, '➖ Remove'),
      ]);
    });
    const defaults = st.base.games.map((g0, i) => {
      const id = `d${i}`, g = gameOf(st, id), on = st.map.includes(id);
      const ref = links.games && links.games[i];
      const el = row(id, g, [
        on ? h('span', { class: 'b-tag on', text: '✓ On the map' }) : h('button', { class: 'soft-btn ok', onclick: () => { st.map.push(id); commit('Added to the map'); } }, '➕ Add to map'),
        ref && h('a', { class: 'soft-btn', href: ref, target: '_blank', rel: 'noopener' }, 'Reference ↗'),
        h('button', { class: 'soft-btn', onclick: () => editor(root, st, id, g) }, '✏️ Edit'),
        st.edits[id] && twoTap('↩ Undo edits', 'Tap again', () => { delete st.edits[id]; commit('Back to the original'); }),
      ]);
      /* What the curriculum sheet calls this game. */
      if (links.types && links.types[i]) el.querySelector('.b-game-body').append(h('small', { class: 'b-sheet-type', text: `Curriculum sheet: ${links.types[i]}` }));
      return el;
    });
    const created = st.created.map((g) => {
      const on = st.map.includes(g.id);
      return row(g.id, g, [
        on ? h('span', { class: 'b-tag on', text: '✓ On the map' }) : h('button', { class: 'soft-btn ok', onclick: () => { st.map.push(g.id); commit('Added to the map'); } }, '➕ Add to map'),
        h('button', { class: 'soft-btn', onclick: () => editor(root, st, g.id, g) }, '✏️ Edit'),
        twoTap('🗑️ Delete', 'Tap again to delete', () => { st.created = st.created.filter((x) => x.id !== g.id); st.map = st.map.filter((x) => x !== g.id); if (!st.map.length) st.map = ['d0']; commit('Deleted'); }),
      ]);
    });

    const onMapGames = () => st.map.map((id) => gameOf(st, id)).filter(Boolean);
    const card = (label, title, note, body, extra) => h('section', { class: 'b-section cms-card', 'aria-label': label },
      h('div', { class: 'cms-card-head' }, h('div', {}, h('h3', { text: title }), h('p', { class: 'b-note', text: note })), extra), body);
    shell(root, 'lessons', [['Lessons', '#/admin'], [`${code} ${st.base.title}`]],
      h('main', { class: 'b-main' },
        h('section', { class: 'b-head cms-page-head' },
          h('div', {},
            h('h2', {}, h('span', { 'aria-hidden': 'true', text: `${st.base.emoji} ` }), `${code} ${st.base.title}`),
            h('p', { text: st.base.mission.en })),
          h('button', { class: 'cta create-btn', id: 'create-game', onclick: () => { sfx.tap(); location.hash = `#/admin/${code}/new`; } }, '+ Create game')),
        h('div', { class: 'b-links cms-tools' },
          h('button', { class: 'link-btn', id: 'lesson-slides', title: 'A PowerPoint with every game on the map: each question, then its answer', onclick: () => makeSlides(() => SEJ.slides.lesson(st.base, onMapGames())) }, '📑 Download slides'),
          h('button', { class: 'link-btn', id: 'lesson-handouts', title: 'Flashcards, quick tips and a practice sheet for students, as a PDF', onclick: () => SEJ.handouts.open(st.base, onMapGames(), true, window.SEJ_LESSONS.filter((l) => l.unit === st.base.unit).map((l) => { const x = l.code === code ? st : lessonState(l.code); return { lesson: x.base, games: x.map.map((id) => gameOf(x, id)).filter(Boolean) }; })) }, '🖨️ Handouts (PDF)'),
          h('label', { class: 'link-btn', title: 'Turn a Word file into slides in the same template' }, '📄 Word file to slides', h('input', { type: 'file', accept: '.docx', class: 'visually-hidden', id: 'docx-file', onchange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) makeSlides(() => SEJ.slides.docx(f)); } })),
          h('a', { class: 'link-btn', href: `?class=${code}`, target: '_blank', rel: 'noopener' }, '🏆 Class Battle ↗'),
          links.deck && h('a', { class: 'link-btn', href: links.deck, target: '_blank', rel: 'noopener' }, 'Class slides ↗'),
          links.plan && h('a', { class: 'link-btn', href: links.plan, target: '_blank', rel: 'noopener' }, 'Lesson plan ↗'),
          changeOf(st) && twoTap('↩ Reset this lesson to its default games', 'Tap again to reset everything in this lesson', async () => {
            try { await saveLessonChange(code, null); toast('Lesson reset'); } catch (e) { toast(e.message, true); }
            render(root);
          }, 'link-btn danger')),
        card('On the map', `On the map (${st.map.length})`, 'Students play these, in this order.', onMap),
        card('Default games', 'Default games', 'The games from the curriculum sheet.', defaults),
        card('Created games', `Created games (${st.created.length})`, 'Games you made for this lesson.', created.length ? created : h('p', { class: 'cms-empty', text: 'Nothing created yet. Press Create game.' })),
        st.base.talk && card('Speaking prompts', 'Speaking prompts', 'Used in Class Battle’s Speak round.',
          row('talk', { t: 'talk', title: 'Speaking prompts', items: st.talk || st.base.talk }, [h('button', { class: 'soft-btn', onclick: () => editor(root, st, 'talk', { t: 'talk', title: 'Speaking prompts', items: st.talk || st.base.talk }) }, '✏️ Edit')]))));
  }

  /* ---------- the CMS frame: sidebar, breadcrumb and where saves go ---------- */
  function saveState() {
    const info = SEJ.sharedInfo || {};
    const state = info.shared ? ['ok', 'Saves for everyone', 'Changes are saved in the Google Sheet for every student.']
      : info.error === 'sheet not shared' ? ['warn', 'Google Sheet not shared', SHEET_HELP]
        : ['warn', 'Saves on this device only', 'Add the Google Sheet settings in Vercel to share changes with every student.'];
    return h('span', { class: `b-save-state ${state[0]}`, title: state[2] }, h('i', { 'aria-hidden': 'true' }), state[1]);
  }
  function sidebar(here) {
    const changes = allChanges();
    const units = SEJ.UNITS.map((u) => h('details', { class: 'cms-unit', ...(here === 'lessons' && window.SEJ_LESSONS.some((l) => l.unit === u.n && l.code === code) ? { open: '' } : {}) },
      h('summary', {}, `Unit ${u.n}`, h('span', { text: u.title })),
      window.SEJ_LESSONS.filter((l) => l.unit === u.n).map((l) => h('a', {
        class: `b-lesson ${here === 'lessons' && l.code === code ? 'on' : ''}`, href: `#/admin/${l.code}`, 'data-find': `${l.code} ${l.title}`.toLowerCase(),
      }, h('span', { class: 'cms-code', text: l.code }), h('span', { class: 'cms-lesson-name', text: l.title }), changes[keyOf(l.code)] ? h('em', { text: 'edited' }) : null))));
    const find = h('input', { class: 'cms-find', type: 'search', placeholder: 'Find a lesson…', 'aria-label': 'Find a lesson', oninput: (e) => {
      const q = e.target.value.trim().toLowerCase();
      units.forEach((u) => {
        let any = false;
        u.querySelectorAll('.b-lesson').forEach((a) => { const hit = !q || a.dataset.find.includes(q); a.hidden = !hit; any = any || hit; });
        u.hidden = !any;
        if (q) u.open = true;
      });
    } });
    const item = (key, href, icon, label, id) => h('a', { class: `cms-nav ${here === key ? 'on' : ''}`, href, id }, h('span', { 'aria-hidden': 'true', text: icon }), label);
    return h('aside', { class: 'cms-side' },
      h('a', { class: 'cms-brand', href: '#/admin' }, h('img', { src: 'assets/slides/sej.png', alt: '' }), h('div', {}, h('strong', { text: 'Hero Quest' }), h('small', { text: 'Content manager' }))),
      h('nav', { class: 'cms-menu-list', 'aria-label': 'Admin sections' },
        item('home', '#/admin', '▦', 'Overview', 'tab-home'),
        item('batches', '#/admin/batches', '👥', 'Batches', 'tab-batches')),
      h('div', { class: 'cms-scope', role: 'group', 'aria-label': 'Which games to edit' },
        h('p', { class: 'cms-group', text: 'Games for' }),
        h('div', { class: 'cms-seg' },
          ...[['batch', 'Batches', 'Games students see through a batch link. Scores go to the batch leaderboard.'], ['base', 'Open site', 'Games on the plain site address, for anyone. No leaderboard.']].map(([v, label, tip]) => h('button', { class: `cms-seg-btn ${scope() === v ? 'on' : ''}`, id: `scope-${v}`, 'aria-pressed': String(scope() === v), title: tip, onclick: () => { if (scope() === v) return; setScope(v); toast(v === 'base' ? 'Now editing the open site games (the plain address).' : 'Now editing the batch games.'); window.dispatchEvent(new HashChangeEvent('hashchange')); } }, label))),
        h('small', { class: 'cms-scope-note', text: scope() === 'base' ? 'The plain site address. No leaderboard.' : 'Batch links. Scores count.' })),
      h('p', { class: 'cms-group', text: 'Lessons' }),
      find,
      h('nav', { class: 'b-side', 'aria-label': 'Lessons' }, units),
      h('div', { class: 'cms-side-foot' },
        h('a', { class: 'cms-nav', href: '#/map' }, h('span', { 'aria-hidden': 'true', text: '↗' }), 'View the site'),
        h('button', { class: 'cms-nav', onclick: () => { setPin(''); location.hash = '#/map'; } }, h('span', { 'aria-hidden': 'true', text: '⎋' }), 'Log out')));
  }
  function shell(root, here, crumbs, main) {
    const el = h('div', { class: 'builder cms' },
      sidebar(here),
      h('div', { class: 'cms-main' },
        h('header', { class: 'b-top' },
          h('button', { class: 'cms-burger', 'aria-label': 'Menu', onclick: () => el.classList.toggle('nav-open') }, '☰'),
          h('nav', { class: 'cms-crumbs', 'aria-label': 'Breadcrumb' }, [['Admin', '#/admin'], ...crumbs].map((c, i, all) => [i ? h('span', { class: 'cms-sep', 'aria-hidden': 'true', text: '›' }) : null, c[1] && i < all.length - 1 ? h('a', { href: c[1] }, c[0]) : h('b', { text: c[0] })])),
          h('span', { class: 'spacer' }),
          h('span', { class: `cms-badge scope-badge ${scope() === 'base' ? 'warn' : ''}`, id: 'scope-badge', text: scope() === 'base' ? 'Editing: open site games' : 'Editing: batch games' }),
          saveState()),
        main),
      h('div', { class: 'cms-scrim', onclick: () => el.classList.remove('nav-open') }));
    root.replaceChildren(el);
    const on = el.querySelector('.b-lesson.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Overview: every lesson at a glance ---------- */
  function home(root) {
    if (!getPin()) return login(root, () => home(root));
    const changes = allChanges();
    const rows = window.SEJ_LESSONS.map((l) => {
      const st = lessonState(l.code);
      return { l, on: st.map.length, made: st.created.length, edited: !!changes[keyOf(l.code)] };
    });
    const stat = (n, label) => h('div', { class: 'cms-stat' }, h('b', { text: n }), h('span', { text: label }));
    const body = h('tbody', {}, rows.map((r) => h('tr', { 'data-find': `${r.l.code} ${r.l.title} unit ${r.l.unit}`.toLowerCase(), onclick: () => { location.hash = `#/admin/${r.l.code}`; } },
      h('td', {}, h('span', { class: 'cms-code', text: r.l.code })),
      h('td', {}, h('a', { href: `#/admin/${r.l.code}` }, h('span', { 'aria-hidden': 'true', text: `${r.l.emoji} ` }), r.l.title)),
      h('td', { text: `Unit ${r.l.unit}` }),
      h('td', { text: r.on }),
      h('td', { text: r.made || '–' }),
      h('td', {}, h('span', { class: `cms-badge ${r.edited ? 'warn' : ''}`, text: r.edited ? 'Edited' : 'Default' })),
      h('td', {}, h('a', { class: 'soft-btn', href: `#/admin/${r.l.code}` }, 'Manage')))));
    const find = h('input', { class: 'b-input cms-search', type: 'search', placeholder: 'Search lessons…', 'aria-label': 'Search lessons', oninput: (e) => { const q = e.target.value.trim().toLowerCase(); body.querySelectorAll('tr').forEach((tr) => { tr.hidden = !!q && !tr.dataset.find.includes(q); }); } });
    shell(root, 'home', [['Overview']],
      h('main', { class: 'b-main' },
        h('section', { class: 'cms-page-head' }, h('div', {}, h('h2', { text: 'Overview' }), h('p', { text: 'Pick a lesson to choose its games, create new ones, or make slides and handouts.' })),
          h('a', { class: 'cta create-btn', href: '#/admin/batches' }, 'Manage batches')),
        h('div', { class: 'cms-stats' },
          stat(rows.length, 'Lessons'), stat(rows.reduce((n, r) => n + r.on, 0), 'Games on the map'),
          stat(rows.reduce((n, r) => n + r.made, 0), 'Games you created'), stat(rows.filter((r) => r.edited).length, 'Lessons edited')),
        h('section', { class: 'cms-card' },
          h('div', { class: 'cms-card-head' }, h('div', {}, h('h3', { text: 'Lessons' }), h('p', { class: 'b-note', text: 'All 24 lessons of the SEJ Live Batch.' })), find),
          h('div', { class: 'cms-table-wrap' }, h('table', { class: 'cms-table', id: 'lesson-table' },
            h('thead', {}, h('tr', {}, ['Code', 'Lesson', 'Unit', 'On the map', 'Created', 'Status', ''].map((t) => h('th', { text: t })))), body)))));
  }

  /* ---------- Batches: a link, unlocked lessons and a leaderboard for each group of students ---------- */
  async function batches(root) {
    const wrap = h('main', { class: 'b-picker' }, h('p', { class: 'b-note', text: 'Loading batches…' }));
    shell(root, 'batches', [['Batches']], wrap);
    const call = (body) => SEJ.batch.admin(getPin(), body).catch(() => ({ status: 0 }));
    const res = await call({ side: 'list' });
    if (res.status === 401) { setPin(''); return render(root, 'batches'); }
    if (!res.batches) {
      wrap.replaceChildren(h('p', { class: 'b-status bad', text: res.status === 501 ? 'Batches need the Google Sheet. Add the Google Sheet settings in Vercel.' : res.error === 'sheet not shared' ? SHEET_HELP : 'Couldn’t load the batches. Check the internet and try again.' }));
      return;
    }
    const lessons = window.SEJ_LESSONS;
    const linkOf = (c) => `${location.origin}${location.pathname.replace(/index\.html$/, '')}?batch=${c}`;
    const name = h('input', { class: 'b-input', id: 'batch-new-name', placeholder: 'Batch name, for example: SEJ Batch 12 (Sat-Mon)', maxlength: '40', 'aria-label': 'Batch name' });
    const create = h('form', { class: 'b-batch-new', onsubmit: async (e) => {
      e.preventDefault();
      if (!name.value.trim()) { SEJ.fx.play(name, 'shake'); name.focus(); return; }
      const r = await call({ side: 'create', name: name.value });
      if (!r.ok) return toast('Couldn’t create the batch. Try again.', true);
      toast('Batch created. Copy its link for your students.');
      batches(root);
    } }, name, h('button', { class: 'cta create-btn', id: 'batch-create', type: 'submit' }, '+ Create batch link'));
    const card = (b) => {
      const open = new Set(b.open);
      const count = h('small', { text: '' });
      const paintCount = () => { count.textContent = `${open.size} of ${lessons.length} lessons unlocked · ${b.students} students`; };
      const saveOpen = async () => { paintCount(); const r = await call({ side: 'open', code: b.code, open: [...open] }); if (!r.ok) toast('That change wasn’t saved. Try again.', true); };
      const chips = lessons.map((l) => {
        const chip = h('button', { class: `lock-chip ${open.has(l.code) ? 'open' : ''}`, 'data-lesson': l.code, 'aria-pressed': open.has(l.code) ? 'true' : 'false', title: l.title }, h('span', { class: 'lock-icon', text: open.has(l.code) ? '🔓' : '🔒' }), l.code);
        chip.addEventListener('click', () => {
          if (open.has(l.code)) open.delete(l.code); else open.add(l.code);
          const on = open.has(l.code);
          chip.classList.toggle('open', on);
          chip.setAttribute('aria-pressed', on ? 'true' : 'false');
          chip.firstChild.textContent = on ? '🔓' : '🔒';
          sfx.tap();
          saveOpen();
        });
        return chip;
      });
      const setAll = (on) => { lessons.forEach((l, i) => { if (on) open.add(l.code); else open.delete(l.code); chips[i].classList.toggle('open', on); chips[i].setAttribute('aria-pressed', on ? 'true' : 'false'); chips[i].firstChild.textContent = on ? '🔓' : '🔒'; }); saveOpen(); };
      const link = h('input', { class: 'b-input b-link', readonly: true, value: linkOf(b.code), 'aria-label': 'Batch link', onclick: (e) => e.currentTarget.select() });
      paintCount();
      return h('article', { class: 'b-batch', 'data-batch': b.code },
        h('div', { class: 'b-batch-head' }, h('div', {}, h('strong', { text: b.name }), count),
          h('a', { class: 'soft-btn ok', href: `#/board/${b.code}` }, '🏆 Leaderboard'),
          h('button', { class: 'soft-btn', title: 'A link that opens only this batch’s leaderboard. Share it with students or show it in class.', onclick: async () => { const url = linkOf(b.code).replace('?batch=', '?board='); try { await navigator.clipboard.writeText(url); toast('Leaderboard link copied'); } catch (e) { toast(url); } } }, '🔗 Copy leaderboard link'),
          twoTap('🗑️ Remove', 'Tap again to remove', async () => { await call({ side: 'remove', code: b.code }); toast('Batch removed'); batches(root); })),
        h('div', { class: 'b-batch-link' }, link,
          h('button', { class: 'soft-btn', onclick: async () => { try { await navigator.clipboard.writeText(link.value); toast('Link copied'); } catch (e) { link.select(); toast('Select the link and copy it'); } } }, '📋 Copy link')),
        h('p', { class: 'b-note', text: 'Tap a lesson to lock or unlock it for this batch. Students see the change the next time they open the map.' }),
        h('div', { class: 'lock-grid' }, chips),
        h('div', { class: 'b-links' }, h('button', { class: 'link-btn', onclick: () => setAll(true) }, 'Unlock all'), h('button', { class: 'link-btn', onclick: () => setAll(false) }, 'Lock all')));
    };
    wrap.replaceChildren(
      h('section', { class: 'cms-page-head' }, h('div', {}, h('h2', { text: 'Batches' }), h('p', { text: 'Each batch gets its own link and its own leaderboard. Students open the link, type their name and student ID, and play the lessons you unlock. Only their first try at each game counts.' }))),
      create,
      ...(res.batches.length ? res.batches.map(card) : [h('p', { class: 'b-note', text: 'No batches yet. Create the first one above.' })]),
      dbCheck());
  }
  /* Checks the Google Sheet: makes any missing tab, repairs header rows and shows how many rows each tab holds. */
  function dbCheck() {
    const out = h('p', { class: 'b-note', id: 'db-status', role: 'status', text: 'Scores, students, batches and your games are kept in the Google Sheet.' });
    const btn = h('button', { class: 'link-btn', id: 'db-check', onclick: async () => {
      btn.disabled = true;
      out.textContent = 'Checking the Google Sheet…';
      const r = await fetch('api/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ side: 'setup', pin: getPin() }) }).then((x) => x.json()).catch(() => ({}));
      btn.disabled = false;
      if (!r.ok) { out.textContent = r.error === 'sheet not shared' ? SHEET_HELP : r.error === 'no store' ? 'The Google Sheet settings are missing in Vercel.' : 'Couldn’t check the sheet. Try again.'; return; }
      const c = r.counts || {};
      const did = [r.created.length && `made ${r.created.join(', ')}`, r.fixed.length && `repaired the headers of ${r.fixed.join(', ')}`].filter(Boolean).join(' and ');
      out.textContent = `✅ The database is ready${did ? ` (${did})` : ''}. ${c.SEJ_Batches || 0} batches · ${c.SEJ_Students || 0} students · ${c.SEJ_Scores || 0} scores · ${c.SEJ_Content || 0} changed lessons.`;
    } }, '🔧 Check the database');
    return h('section', { class: 'b-db' }, out, btn);
  }

  /* ---------- Create game: choose a Wordwall game type ---------- */
  function picker(root) {
    const st = lessonState(code);
    shell(root, 'lessons', [['Lessons', '#/admin'], [`${code} ${st.base.title}`, `#/admin/${code}`], ['Create game']],
      h('main', { class: 'b-picker' },
        h('section', { class: 'cms-page-head' }, h('div', {}, h('h2', { text: 'Step 1 of 2: choose a game type' }), h('p', { text: 'Next you paste the content, and you’ll see an example of how to write it.' })),
          h('a', { class: 'soft-btn', href: `#/admin/${code}` }, '← Back')),
        CATALOG.map(([group, list]) => h('section', { class: 'b-type-group' }, h('h3', { text: group }), h('div', { class: 'b-templates' },
          list.map(([name, t, options]) => {
            const meta = SEJ.TEMPLATES[t];
            return h('button', { class: 'template-btn', 'data-type': name, onclick: () => { sfx.tap(); editor(root, st, 'new', Object.assign({ t, title: '' }, options || {})); } },
              h('span', { 'aria-hidden': 'true', text: meta.icon }), h('b', { text: name }), h('small', { text: meta.en }));
          }))))));
  }

  /* ---------- paste content ---------- */
  function editor(root, st, id, game) {
    const isNew = id === 'new';
    const f = F[game.t], t = SEJ.TEMPLATES[game.t];
    const title = h('input', { class: 'b-input', value: game.title || '', placeholder: t.name, 'aria-label': 'Game title', disabled: id === 'talk' });
    const area = h('textarea', { class: 'b-text', rows: '12', spellcheck: 'false', 'aria-label': 'Game content', placeholder: `Paste your content here, one item per line.\n\nExample:\n${f.sample}` });
    if (!isNew) area.value = withNotes(game, f.write(game));
    const show = h('input', { type: 'checkbox', checked: !!game.show });
    const audioOpt = h('input', { type: 'checkbox', checked: !!game.audio });
    const bn = h('input', { class: 'b-input', value: game.bn || '', placeholder: t.bn, lang: 'bn', 'aria-label': 'Instruction in Bangla' });
    const status = h('p', { class: 'b-status', role: 'status' });
    const undo = h('button', { class: 'link-btn', hidden: true, onclick: () => { area.value = area.dataset.before || ''; undo.hidden = true; autoNote.hidden = true; check(); } }, '↩ Undo auto-format');
    const autoNote = h('p', { class: 'b-auto-note', role: 'status', hidden: true });
    const extras = () => {
      const x = {};
      if (game.t === 'quiz' && show.checked) x.show = true;
      if (game.t === 'anagram' && audioOpt.checked) x.audio = true;
      if (bn.value.trim() && id !== 'talk') x.bn = bn.value.trim();
      return x;
    };
    const check = () => {
      if (!area.value.trim()) { status.textContent = 'Paste or type your content. The example on the right shows how.'; status.className = 'b-status'; return null; }
      try {
        const g = parseGame(game.t, title.value, area.value, extras());
        status.textContent = `✅ Looks good: ${SEJ.itemCount(g)} items`;
        status.className = 'b-status ok';
        return g;
      } catch (e) {
        status.textContent = `⚠️ ${e.message}`;
        status.className = 'b-status bad';
        return null;
      }
    };
    /* Rearranges pasted content into this game's line format (no AI). Content that already reads fine is left alone,
       and a result that doesn't read is never applied unless the teacher asked for it with the button. */
    const reads = (text) => { try { parseGame(game.t, title.value, text, extras()); return true; } catch (e) { return false; } };
    const arrange = (asked) => {
      const before = area.value;
      if (!before.trim() || reads(before)) return false;
      const r = SEJ.autoFormat(game.t, before);
      if (r.text === before || (!asked && !reads(r.text))) return false;
      area.dataset.before = before;
      area.value = r.text;
      undo.hidden = false;
      autoNote.hidden = !r.notes.length;
      autoNote.textContent = r.notes.length ? `ℹ️ ${r.notes.join(' ')}` : '';
      toast(check() ? 'Arranged for this game. Read it through, then save.' : 'Arranged, but something still needs fixing. See the message below.');
      return true;
    };
    /* Pictures: paste one (from a document or a screenshot), drop it, or choose a file. The picture is made small,
       saved in the Google Sheet, and a short code (img:…) is put in the text where the picture should be. */
    const pics = h('div', { class: 'b-pics', hidden: true });
    const paintPics = () => {
      const codes = [...new Set(area.value.match(/img:[a-z0-9]{10}/g) || [])];
      pics.hidden = !codes.length;
      pics.replaceChildren(...codes.map((c) => h('span', { class: 'b-pic' }, h('img', { src: SEJ.picSrc(c), alt: '' }), h('code', { text: c }))));
    };
    const insert = (text) => { const s = area.selectionStart, e = area.selectionEnd; area.value = area.value.slice(0, s) + text + area.value.slice(e); area.selectionStart = area.selectionEnd = s + text.length; };
    const shrink = (src) => new Promise((ok, bad) => {
      const img = new Image();
      img.onload = () => {
        let side = 480, q = 0.82, out = '';
        for (let n = 0; n < 7; n++) {
          const k = Math.min(1, side / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          const g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q);
          if (out.length < 170000) break;
          side *= 0.8; q -= 0.08;
        }
        ok(out);
      };
      img.onerror = () => bad(new Error('That picture couldn’t be read.'));
      img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    });
    const addPictures = async (list) => {
      toast(list.length > 1 ? `Adding ${list.length} pictures…` : 'Adding the picture…');
      let added = 0;
      for (const item of list) {
        try {
          const data = await shrink(item);
          const r = await fetch('api/image', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: getPin(), data }) });
          const j = await r.json().catch(() => ({}));
          if (!j.id) throw new Error(r.status === 501 ? 'Pictures need the Google Sheet settings in Vercel.' : r.status === 401 ? 'Please log in again.' : 'The picture couldn’t be saved. Try again.');
          insert(`${added ? '\n' : ''}img:${j.id}`);
          added++;
        } catch (e) { toast(e.message, true); }
      }
      if (added) { toast(added > 1 ? `${added} pictures added. Each img: code stands for one picture.` : 'Picture added. The img: code stands for the picture.'); paintPics(); check(); area.focus(); }
    };
    area.addEventListener('paste', (e) => {
      const cd = e.clipboardData;
      const files = cd ? [...cd.files].filter((f) => /^image\//.test(f.type)) : [];
      const inDoc = cd ? [...cd.getData('text/html').matchAll(/<img[^>]+src=["'](data:image\/[^"']+)["']/g)].map((m) => m[1]) : [];
      if (files.length || inDoc.length) {
        if (!cd.getData('text/plain').trim()) e.preventDefault();
        setTimeout(() => addPictures(files.length ? files : inDoc), 0);
      }
      setTimeout(() => arrange(false), 0);
    });
    area.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    area.addEventListener('drop', (e) => { const files = [...(e.dataTransfer ? e.dataTransfer.files : [])].filter((f) => /^image\//.test(f.type)); if (files.length) { e.preventDefault(); addPictures(files); } });
    area.addEventListener('input', paintPics);
    area.addEventListener('input', check);
    title.addEventListener('input', check);
    /* Saves, then returns where the game now is on the map (or -1). */
    const apply = async () => {
      let g = check();
      if (!g && arrange(false)) g = check();
      if (!g) { SEJ.fx.play(status, 'shake'); return null; }
      if (id === 'talk') st.talk = g.items;
      else if (isNew) {
        g.id = `n${Date.now().toString(36)}`;
        st.created.push(g);
        st.map.push(g.id);
      } else if (id[0] === 'd') st.edits[id] = g;
      else st.created = st.created.map((x) => (x.id === id ? Object.assign(g, { id }) : x));
      try {
        const where = await saveLessonChange(code, changeOf(st));
        toast(where === 'everyone' ? 'Saved. Students see it now.' : 'Saved on this device only.');
      } catch (e) { toast(e.message, true); return null; }
      return st.map.indexOf(isNew ? g.id : id);
    };
    const wwType = wwName(game);
    shell(root, 'lessons', [['Lessons', '#/admin'], [`${code} ${st.base.title}`, `#/admin/${code}`], [isNew ? 'Create game' : 'Edit game']],
      h('main', { class: 'b-editor' },
        h('section', { class: 'cms-page-head' }, h('div', {}, h('h2', { text: `${t.icon} ${isNew ? 'Step 2 of 2: ' : 'Edit: '}${wwType}` }), h('p', { class: 'b-crumb', text: `Lesson ${code}: ${st.base.title} · plays as ${t.name}` })),
          h('button', { class: 'soft-btn', onclick: () => render(root) }, '← Cancel')),
        h('label', { class: 'b-label' }, 'Title', title),
        id !== 'talk' && h('label', { class: 'b-label' }, 'Instruction in Bangla (optional)', bn),
        game.t === 'quiz' && h('label', { class: 'b-check' }, show, ' Gameshow mode: timer and power-ups'),
        game.t === 'anagram' && h('label', { class: 'b-check' }, audioOpt, ' Read each word aloud'),
        h('div', { class: 'b-paste' },
          h('div', { class: 'b-content' }, h('label', { class: 'b-label' }, 'Content: one item per line', area),
            h('div', { class: 'b-pic-row' },
              h('label', { class: 'soft-btn' }, '🖼️ Add a picture', h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'visually-hidden', id: 'pic-file', onchange: (e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) addPictures(f); } })),
              h('small', { class: 'b-note', text: 'Or paste a picture from a document, or drop it on the box. Use its img: code where the format asks for an emoji or picture.' })),
            pics),
          h('aside', { class: 'b-help' },
            h('b', { text: 'How to write it' }), h('pre', { text: f.help }),
            h('b', { text: 'Example' }), h('pre', { class: 'b-sample', text: f.sample }),
            h('button', { class: 'soft-btn', id: 'use-example', onclick: () => { area.value = f.sample; check(); area.focus(); } }, '📋 Use this example'),
            h('p', { class: 'b-tip', text: 'Tip: add  >> and an explanation at the end of a line. It appears on the answer slide.' }))),
        h('div', { class: 'b-ai' },
          h('button', { class: 'soft-btn ai-btn', id: 'auto-format', onclick: () => {
            if (!area.value.trim()) { toast('Paste your content first, in any shape.', true); return; }
            if (!arrange(true)) toast(check() ? 'It is already in the right shape.' : 'This couldn’t be arranged by itself. Follow the example on the right.', !check());
          } }, '✨ Auto-format'),
          undo,
          h('small', { class: 'b-note', text: 'Paste content in any shape: a numbered list, a table from Word or Excel, questions with a) b) c) and “Answer: b”. It is arranged for this game by itself. Nothing is rewritten, and you check it before saving.' })),
        autoNote,
        status,
        h('div', { class: 'b-save' },
          h('button', { class: 'cta', id: 'save-game', onclick: async () => { if ((await apply()) !== null) render(root); } }, '💾 Save'),
          id !== 'talk' && h('button', { class: 'soft-btn', id: 'save-test', onclick: async () => {
            const at = await apply();
            if (at === null) return;
            if (at >= 0) location.hash = `#/play/${code}/${at}`;
            else { toast('Saved. It isn’t on the map, so add it to the map to play it.'); render(root); }
          } }, '▶ Save and play'))));
    check();
    paintPics();
  }

  SEJ.builder = { render: (root, a, b) => (a ? render(root, a, b) : home(root)) };
})();
