/* Teacher Mode: the game builder. Edits use one simple line format per template,
   are saved in this browser, and can be published to everyone as js/custom-content.js. */
(function () {
  'use strict';
  const { h, sfx, store } = SEJ;
  const LIST = ';';
  const splitList = (s) => (s || '').split(LIST).map((x) => x.trim()).filter(Boolean);
  const cells = (line) => line.split('|').map((x) => x.trim());
  const lines = (text) => text.split('\n').map((x) => x.trim()).filter(Boolean);
  const yes = (s) => /^(y|yes|true|t|1|pair)$/i.test(s || '');

  /* Each format: how to write it as text, how to read it back, and what a line looks like. */
  const simple = (help, sample, write, read) => ({ help, sample, write, read });
  const F = {
    unjumble: simple('emoji | sentence', '🏫 | I study at school.',
      (g) => g.items.map((s) => (s.includes('|') ? s.split('|').join(' | ') : ' | ' + s)).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); const s = c.length > 1 ? c.slice(1).join(' ') : c[0]; if (s.trim().split(/\s+/).length < 2) throw new Error(`"${l}" needs at least 2 words.`); return (c.length > 1 && c[0] ? c[0] + '|' : '') + s; }) })),
    sort: simple('# group name | emoji (one line per group, 2 or 3)\ncard text | group number | emoji', '# Polite | 😊\n# Impolite | 😠\nCould you help me? | 1 | 🙋\nHurry up! | 2 | 🏃',
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
      }),
    blank: simple('sentence with the {answer} in braces | wrong; wrong | emoji', 'I {play} in the park. | playing | ⚽',
      (g) => g.items.map((i) => `${i[0]} | ${i[1].join(LIST + ' ')} | ${i[2] || ''}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (!/\{.+\}/.test(c[0])) throw new Error(`"${l}" needs the answer in {braces}.`); const w = splitList(c[1]); if (!w.length) throw new Error(`"${l}" needs at least one wrong word.`); return [c[0], w, c[2] || '']; }) })),
    match: simple('left card | right card', '🍳 Kitchen | We cook food here',
      (g) => g.pairs.map((p) => `${p[0]} | ${p[1]}`).join('\n'),
      (t) => ({ pairs: lines(t).map((l) => { const c = cells(l); if (c.length < 2 || !c[1]) throw new Error(`"${l}" needs a | and a match.`); return [c[0], c[1]]; }) })),
    find: simple('clue | answer', 'the first meal of the day | Breakfast',
      (g) => g.items.map((p) => `${p[0]} | ${p[1]}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (c.length < 2 || !c[1]) throw new Error(`"${l}" needs a | and an answer.`); return [c[0], c[1]]; }) })),
    pair: simple('first | second (can be empty) | yes or no | emoji 1 | emoji 2', 'Round | Ball | yes | ⭕ | 🏀',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2] ? 'yes' : 'no'} | ${i[3] || ''} | ${i[4] || ''}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (c.length < 3) throw new Error(`"${l}" needs first | second | yes or no.`); return [c[0], c[1], yes(c[2]), c[3] || '', c[4] || '']; }) })),
    tf: simple('# first label | second label (optional, default True | False)\nstatement | yes or no (yes = first label) | emoji | why (optional)', 'Red means stop. | yes | 🔴',
      (g) => (g.labels ? [`# ${g.labels[0]} | ${g.labels[1]}`] : []).concat(g.items.map((i) => `${i[0]} | ${i[1] ? 'yes' : 'no'} | ${i[2] || ''} | ${i[3] || ''}`)).join('\n'),
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
    quiz: simple('question | right answer | wrong; wrong; wrong | emoji', 'Who is the master of math? | MathMan | Ms Bhasha; Innovara | 🔢',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2].join(LIST + ' ')} | ${i[3] || ''}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); const w = splitList(c[2]); if (c.length < 3 || !w.length || w.length > 3) throw new Error(`"${l}" needs an answer and 1 to 3 wrong answers.`); return [c[0], c[1], w, c[3] || '']; }) })),
    whack: simple('# instruction for the child\n+ a right phrase\n- a wrong phrase', '# Tap only the polite words!\n+ Thank you\n- Go away',
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
    plane: simple('prompt | right answer | wrong; wrong', 'Past tense of GO | went | goes; going',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2].join(LIST + ' ')}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); const w = splitList(c[2]); if (c.length < 3 || w.length !== 2) throw new Error(`"${l}" needs an answer and exactly 2 wrong answers.`); return [c[0], c[1], w]; }) })),
    talk: simple('question | sentence starter | example answer', 'What is your name? | My name is ___. | My name is Robin.',
      (g) => g.items.map((i) => `${i[0]} | ${i[1]} | ${i[2]}`).join('\n'),
      (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (c.length < 3) throw new Error(`"${l}" needs question | starter | example.`); return [c[0], c[1], c[2]]; }) })),
  };
  const letters = simple('word | clue | emoji', 'pencil | We write with it | ✏️',
    (g) => g.items.map((i) => `${i[0]} | ${i[1] || ''} | ${i[2] || ''}`).join('\n'),
    (t) => ({ items: lines(t).map((l) => { const c = cells(l); if (!/^[A-Za-z]{2,14}( [A-Za-z]{1,14})*$/.test(c[0])) throw new Error(`"${c[0]}" must be letters only, up to 14 per word.`); return [c[0], c[1] || '', c[2] || '']; }) }));
  F.boxes = F.quiz;
  F.anagram = letters;
  F.spell = letters;
  SEJ.formats = F;

  /* Reads text into a finished game and checks it can be played. */
  function parseGame(t, title, text, extra = {}) {
    const body = F[t].read(text);
    const count = (body.items || body.cards || body.pairs || body.good || []).length;
    if (count < 2) throw new Error('Add at least 2 items.');
    if (t === 'find') {
      const distinct = new Set(body.items.map((i) => i[1]));
      if (distinct.size < 2) throw new Error('Balloon Pop needs at least 2 different answers.');
    }
    const game = Object.assign({ t, title: title.trim() || SEJ.TEMPLATES[t].name }, extra, body);
    if (game.labels === undefined) delete game.labels;
    return game;
  }
  SEJ.parseGame = parseGame;

  /* ---------- screens ---------- */
  let code = '1.1';
  const saveLesson = (lesson, patch) => {
    store.state.custom[lesson.code] = Object.assign({ games: lesson.games, talk: lesson.talk }, store.state.custom[lesson.code] || {}, patch);
    store.save();
  };
  const download = (name, text) => {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const toast = (msg) => {
    const t = h('div', { class: 'toast', role: 'status', text: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  };

  function render(root, lessonCode) {
    if (lessonCode) code = lessonCode;
    const lessons = SEJ.lessonsRaw();
    const lesson = lessons.find((l) => l.code === code) || lessons[0];
    const links = (window.SEJ_LINKS || {})[lesson.code] || {};
    const custom = store.state.custom;
    const editedCount = Object.keys(custom).length;

    const side = h('nav', { class: 'b-side', 'aria-label': 'Lessons' }, SEJ.UNITS.map((u) => [
      h('h3', { text: `Unit ${u.n}: ${u.title}` }),
      lessons.filter((l) => l.unit === u.n).map((l) => h('a', {
        class: `b-lesson ${l.code === lesson.code ? 'on' : ''}`, href: `#/teacher/${l.code}`,
      }, h('span', { 'aria-hidden': 'true', text: l.emoji }), `${l.code} ${l.title}`, custom[l.code] ? h('em', { text: 'edited' }) : null)),
    ]));

    const gameRow = (g, i, isTalk) => {
      const t = SEJ.TEMPLATES[g.t];
      const ref = !isTalk && links.games && links.games[i];
      return h('article', { class: 'b-game' },
        h('span', { class: 'b-icon', 'aria-hidden': 'true', text: t.icon }),
        h('div', { class: 'b-game-body' },
          h('strong', { text: g.title }),
          h('small', { text: `${t.name} · ${SEJ.itemCount(g)} items${isTalk ? '' : ` · reference mechanic: ${t.ref}`}` }),
          ref && h('a', { href: ref, target: '_blank', rel: 'noopener' }, 'Open reference game ↗'),
          h('a', { href: `?game=${lesson.code}-${isTalk ? 'talk' : i + 1}`, target: '_blank', rel: 'noopener', title: 'Direct link that opens this game straight away' }, 'Direct link ↗')),
        h('div', { class: 'b-actions' },
          h('a', { class: 'soft-btn', href: `#/play/${lesson.code}/${isTalk ? 'talk' : i}` }, '▶ Play'),
          h('button', { class: 'soft-btn', onclick: () => editor(root, lesson, isTalk ? 'talk' : i, g) }, '✏️ Edit'),
          !isTalk && h('button', { class: 'soft-btn', disabled: i === 0, 'aria-label': 'Move up', onclick: () => {
            const list = lesson.games.slice();
            [list[i - 1], list[i]] = [list[i], list[i - 1]];
            saveLesson(lesson, { games: list });
            render(root);
          } }, '↑'),
          !isTalk && h('button', { class: 'soft-btn danger', 'aria-label': `Delete ${g.title}`, onclick: (e) => {
            /* A second tap confirms, so one slip can't lose a game. */
            const btn = e.currentTarget;
            if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Tap again'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = '🗑️'; } }, 2500); return; }
            saveLesson(lesson, { games: lesson.games.filter((_, n) => n !== i) });
            render(root);
          } }, '🗑️')));
    };

    root.replaceChildren(h('div', { class: 'builder' },
      h('header', { class: 'b-top' },
        h('a', { class: 'soft-btn', href: '#/map' }, '← Back to game'),
        h('h1', { text: '🛠️ Game Builder' }),
        h('span', { class: 'spacer' }),
        h('button', { class: 'soft-btn', title: 'Download a backup of this browser’s edits', onclick: () => download('sej-edits-backup.json', JSON.stringify(custom, null, 1)) }, '⬇️ Backup'),
        h('label', { class: 'soft-btn', title: 'Load a backup file' }, '⬆️ Restore', h('input', { type: 'file', accept: '.json', class: 'visually-hidden', onchange: async (e) => {
          try {
            const data = JSON.parse(await e.target.files[0].text());
            store.state.custom = Object.assign(store.state.custom, data);
            store.save();
            toast('Backup restored');
            render(root);
          } catch (err) { toast('That file couldn’t be read'); }
        } })),
        h('button', { class: 'cta', title: 'Downloads custom-content.js. Replace the file in the js folder to share your edits with everyone.', disabled: !editedCount && !Object.keys(window.SEJ_CUSTOM || {}).length, onclick: () => {
          const all = Object.assign({}, window.SEJ_CUSTOM || {}, custom);
          download('custom-content.js', `/* Teacher-published changes. Replace js/custom-content.js with this file. */\nwindow.SEJ_CUSTOM = ${JSON.stringify(all, null, 1)};\n`);
          toast('Now replace js/custom-content.js with the downloaded file');
        } }, `🚀 Publish file${editedCount ? ` (${editedCount})` : ''}`)),
      h('div', { class: 'b-layout' }, side,
        h('main', { class: 'b-main' },
          h('section', { class: 'b-head' },
            h('h2', {}, h('span', { 'aria-hidden': 'true', text: lesson.emoji + ' ' }), `${lesson.code} ${lesson.title}`),
            h('p', { text: lesson.mission.en }),
            h('div', { class: 'b-links' },
              links.deck && h('a', { href: links.deck, target: '_blank', rel: 'noopener' }, 'Slides ↗'),
              links.plan && h('a', { href: links.plan, target: '_blank', rel: 'noopener' }, 'Lesson plan ↗'),
              custom[lesson.code] && h('button', { class: 'link-btn', onclick: (e) => {
                const btn = e.currentTarget;
                if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Tap again to undo all edits in this lesson'; return; }
                delete store.state.custom[lesson.code];
                store.save();
                render(root);
              } }, '↩ Reset this lesson'))),
          h('section', { 'aria-label': 'Games in this lesson' }, lesson.games.map((g, i) => gameRow(g, i, false))),
          lesson.talk && lesson.talk.length ? gameRow({ t: 'talk', title: 'Speak Like a Hero', items: lesson.talk }, 0, true) : null,
          h('section', { class: 'b-add' }, h('h3', { text: 'Add a new game' }), h('div', { class: 'b-templates' },
            Object.entries(SEJ.TEMPLATES).filter(([k]) => k !== 'talk').map(([k, t]) => h('button', {
              class: 'template-btn', onclick: () => { sfx.tap(); editor(root, lesson, 'new', { t: k, title: '' }); },
            }, h('span', { 'aria-hidden': 'true', text: t.icon }), h('b', { text: t.name }), h('small', { text: t.en })))))))));
  }

  function editor(root, lesson, slot, game) {
    const isNew = slot === 'new';
    const f = F[game.t], t = SEJ.TEMPLATES[game.t];
    const title = h('input', { class: 'b-input', value: game.title || '', placeholder: t.name, 'aria-label': 'Game title', disabled: slot === 'talk' });
    const area = h('textarea', { class: 'b-text', rows: '12', spellcheck: 'false', 'aria-label': 'Game content' });
    area.value = isNew ? f.sample : f.write(game);
    const show = h('input', { type: 'checkbox', checked: !!game.show });
    const audioOpt = h('input', { type: 'checkbox', checked: !!game.audio });
    const status = h('p', { class: 'b-status', role: 'status' });
    const extras = () => {
      const x = {};
      if (game.t === 'quiz' && show.checked) x.show = true;
      if (game.t === 'anagram' && audioOpt.checked) x.audio = true;
      return x;
    };
    const check = () => {
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
    area.addEventListener('input', check);
    const apply = () => {
      const g = check();
      if (!g) return false;
      if (slot === 'talk') saveLesson(lesson, { talk: g.items });
      else {
        const list = lesson.games.slice();
        if (isNew) list.push(g); else list[slot] = g;
        saveLesson(lesson, { games: list });
      }
      return true;
    };
    root.replaceChildren(h('div', { class: 'builder' },
      h('header', { class: 'b-top' },
        h('button', { class: 'soft-btn', onclick: () => render(root) }, '← Cancel'),
        h('h1', { text: `${t.icon} ${isNew ? 'New' : 'Edit'} ${t.name}` })),
      h('main', { class: 'b-editor' },
        h('p', { class: 'b-crumb', text: `Lesson ${lesson.code}: ${lesson.title}` }),
        h('label', { class: 'b-label' }, 'Title', title),
        game.t === 'quiz' && h('label', { class: 'b-check' }, show, ' Quiz Show mode (timer and power-ups)'),
        game.t === 'anagram' && h('label', { class: 'b-check' }, audioOpt, ' Read each word aloud'),
        h('label', { class: 'b-label' }, 'Content: one item per line', area),
        h('div', { class: 'b-help' }, h('b', { text: 'Format' }), h('pre', { text: f.help }), h('b', { text: 'Example' }), h('pre', { text: f.sample })),
        status,
        h('div', { class: 'b-save' },
          h('button', { class: 'cta', onclick: () => { if (apply()) { toast('Saved'); render(root); } } }, '💾 Save'),
          h('button', { class: 'soft-btn', onclick: () => {
            if (!apply()) return;
            const updated = SEJ.lessonRaw(lesson.code);
            location.hash = `#/play/${lesson.code}/${slot === 'talk' ? 'talk' : isNew ? updated.games.length - 1 : slot}`;
          } }, '▶ Save and test')))));
    check();
  }

  SEJ.builder = { render };
})();
