/* Class Battle: one teacher-led engagement for every lesson.
   Runs on the class TV, built from the lesson's own words, games and speaking prompts:
   Warm-up, then Team Battle, then Speak. The teacher controls it from a phone. */
(function () {
  'use strict';
  const { h, $, sfx, fx, voice, store } = SEJ;
  const SAVE_KEY = 'sej-class-v1';
  const ROSTER_KEY = 'sej-class-roster-v1';
  const SAVE_HOURS = 4;
  const speed = () => (SEJ.testMode ? 0.02 : 1);

  /* ---------- turning a lesson into a three-round plan ---------- */
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const mix = (list, r) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const uniq = (list) => Array.from(new Set(list));
  const BATTLE_ITEMS = 6;

  const quizItem = (q, answer, wrongs, emoji, r) => {
    const options = mix(uniq([answer, ...mix(wrongs.filter((w) => w !== answer), r).slice(0, 3)]), r);
    return { q, answer, options, emoji: emoji || '' };
  };
  const scramble = (parts, r) => {
    if (uniq(parts).length < 2) return parts.slice();
    let out = mix(parts, r);
    for (let i = 0; i < 6 && out.join('\u0001') === parts.join('\u0001'); i++) out = mix(parts, r);
    return out;
  };
  const orderItem = (text, joiner, emoji, hint, r) => {
    const parts = joiner ? text.split(/\s+/).filter(Boolean) : Array.from(text.toUpperCase());
    return { parts, tiles: scramble(parts, r), answer: text, joiner, emoji: emoji || '', hint: hint || '' };
  };

  /* Each kind of lesson game becomes a live version the whole class can play together. */
  const CONVERT = {
    quiz: { group: 'quiz', make: (g, r) => ({ items: g.items.map((i) => quizItem(i[0], i[1], i[2], i[3], r)) }) },
    boxes: { group: 'quiz', make: (g, r) => ({ items: g.items.map((i) => quizItem(i[0], i[1], i[2], i[3], r)) }) },
    plane: { group: 'quiz', make: (g, r) => ({ items: g.items.map((i) => quizItem(i[0], i[1], i[2], i[3], r)) }) },
    blank: {
      group: 'quiz',
      make: (g, r) => ({
        items: g.items.map((i) => {
          const m = i[0].match(/\{(.+?)\}/);
          return m ? quizItem(i[0].replace(m[0], '___'), m[1], i[1], i[2], r) : null;
        }).filter(Boolean),
      }),
    },
    match: {
      group: 'quiz',
      make: (g, r) => {
        const rights = g.pairs.map((p) => p[1]);
        return { items: g.pairs.map((p) => quizItem(`${p[0]} ___`, p[1], rights, '', r)) };
      },
    },
    find: {
      group: 'quiz',
      make: (g, r) => {
        const words = g.items.map((i) => i[1]);
        return { items: g.items.map((i) => quizItem(`Which one? ${i[0]}`, i[1], words, '', r)) };
      },
    },
    tf: {
      group: 'quiz',
      make: (g) => {
        const labels = g.labels || ['True', 'False'];
        return { items: g.items.map((i) => ({ q: i[0], answer: i[1] ? labels[0] : labels[1], options: labels.slice(), emoji: i[2] || '' })) };
      },
    },
    pair: {
      group: 'quiz',
      make: (g) => ({ items: g.items.filter((i) => i[1]).map((i) => ({ q: `${i[0]} and ${i[1]}: do they go together?`, answer: i[2] ? 'Yes' : 'No', options: ['Yes', 'No'], emoji: `${i[3] || ''}${i[4] || ''}` })) }),
    },
    sort: { group: 'sort', make: (g) => ({ groups: g.groups, items: g.cards.map((c) => ({ text: c[0], group: c[1], emoji: c[2] || '' })) }) },
    whack: {
      group: 'sort',
      make: (g) => ({
        groups: [{ n: 'Yes, say it', e: '✅' }, { n: 'No, don’t', e: '🚫' }],
        items: g.good.map((text) => ({ text, group: 0, emoji: '' })).concat(g.bad.map((text) => ({ text, group: 1, emoji: '' }))),
        note: g.prompt,
      }),
    },
    unjumble: {
      group: 'order',
      make: (g, r) => ({
        items: g.items.map((line) => {
          const [emoji, text] = line.includes('|') ? line.split('|') : ['', line];
          return orderItem(text.trim(), ' ', emoji, '', r);
        }),
      }),
    },
    anagram: { group: 'order', make: (g, r) => ({ items: g.items.map((i) => orderItem(i[0], /\s/.test(i[0]) ? ' ' : '', i[2], i[1], r)) }) },
    spell: { group: 'order', make: (g, r) => ({ items: g.items.map((i) => orderItem(i[0], /\s/.test(i[0]) ? ' ' : '', i[2], i[1], r)) }) },
  };
  const BATTLE_INFO = {
    quiz: { name: 'Team Quiz', timer: 20, tip: 'Start the timer. Pick a team to answer, reveal, then give points.' },
    sort: { name: 'Group Sort', timer: 15, tip: 'Teams vote for the right group. Reveal drops the card in.' },
    order: { name: 'Put It in Order', timer: 30, tip: 'A team says it in the right order. Reveal shows the answer.' },
  };
  const SPEAK_INFO = {
    wheel: { name: 'Spin and Speak', tip: 'Spin, pick a student, and start the timer.' },
    boxes: { name: 'Mystery Boxes', tip: 'A student calls a number. Open that box and let them answer.' },
    role: { name: 'Role-play', tip: 'Two students act it out, one line at a time. Then swap.' },
  };

  /* Lessons take turns between battle styles, so the class doesn't see the same game each time. */
  function chooseBattle(lesson, index) {
    const wanted = ['quiz', 'sort', 'order'];
    for (let step = 0; step < wanted.length; step++) {
      const group = wanted[(index + step) % wanted.length];
      const game = lesson.games.find((g) => CONVERT[g.t] && CONVERT[g.t].group === group);
      if (game) return { game, group };
    }
    return null;
  }

  SEJ.classPlan = function (code, seed) {
    const raw = SEJ.lessonsRaw();
    const index = raw.findIndex((l) => l.code === code);
    const lesson = raw[index];
    if (!lesson) return null;
    const r = seeded(seed);
    const stages = [];
    /* Word Flash only shows Bangla that is on the lesson slides. A lesson without enough of it reads the English words instead. */
    const onSlides = (lesson.words || []).filter((w) => w[2]);
    const words = mix(onSlides, r).slice(0, 6);
    if (onSlides.length < 3) {
      stages.push({
        kind: 'read', round: 'Warm-up', name: 'Read and Say', timer: 0, scene: 'sky',
        tip: 'The class reads the word together. Reveal to hear it.',
        items: mix(lesson.words || [], r).slice(0, 6).map(([en]) => ({ en })),
      });
    } else if (words.length) {
      stages.push({
        kind: 'flash', round: 'Warm-up', name: 'Word Flash', timer: 0, scene: 'sky',
        tip: 'Show the Bangla word. Students say it in English, then reveal.',
        items: words.map(([en, bn]) => ({
          en, bn, options: mix(uniq([en, ...mix((lesson.words || []).map((w) => w[0]).filter((w) => w !== en), r).slice(0, 3)]), r),
        })),
      });
    }
    const pickedBattle = chooseBattle(lesson, index);
    if (pickedBattle) {
      const built = CONVERT[pickedBattle.game.t].make(pickedBattle.game, r);
      const info = BATTLE_INFO[pickedBattle.group];
      const items = mix(built.items, r).slice(0, BATTLE_ITEMS);
      if (items.length) stages.push({ kind: pickedBattle.group, round: 'Team Battle', name: info.name, gameTitle: pickedBattle.game.title, timer: info.timer, tip: info.tip, scene: 'stage', groups: built.groups, note: built.note, items });
    }
    if ((lesson.talk || []).length) {
      const kind = ['wheel', 'boxes', 'role'][index % 3];
      stages.push({
        kind, round: 'Speak', name: SPEAK_INFO[kind].name, timer: 45, tip: SPEAK_INFO[kind].tip, scene: 'fiesta', pick: kind !== 'role',
        items: mix(lesson.talk, r).map((t) => ({ q: t[0], frame: t[1], sample: t[2] })),
      });
    }
    return { lesson, stages };
  };

  /* ---------- teams ---------- */
  const TEAM_LOOKS = [
    { name: 'MathMan', hero: 'mathman', color: '#ff7a00' },
    { name: 'Bhasha', hero: 'bhasha', color: '#ff2e93' },
    { name: 'Knight', hero: 'knight', color: '#17c964' },
    { name: 'Innovara', hero: 'innovara', color: '#00b2ff' },
    { name: 'Star', hero: '', color: '#7b2ff7' },
  ];
  const makeTeams = (n, old = []) => TEAM_LOOKS.slice(0, n).map((look, i) => Object.assign({}, look, old[i] ? { name: old[i].name, score: old[i].score } : { score: 0 }));
  const loadRoster = () => {
    try { return JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]'); } catch (e) { return []; }
  };
  const saveRoster = (list) => {
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
  };

  function newState(code, lessonCode) {
    return {
      v: 4, code, lesson: lessonCode, seed: Math.floor(Math.random() * 1e9), rev: 1, screen: 'lobby',
      stage: 0, item: 0, revealed: false, line: 0, hidden: [], used: [], spinning: false, wheelDeg: 0,
      timer: { total: 0, left: 0, running: false }, mode: 'teams', teams: makeTeams(4), classScore: 0,
      picked: null, picking: false, roster: loadRoster(), qr: true, phone: false, sound: store.state.sound !== false, acks: {},
      students: false, join: '', joinQr: true, players: {}, kicked: [], answers: {}, scored: [], built: [], wrongs: [],
    };
  }

  const MAX_PLAYERS = 60;
  /* The answer a student's phone must send for this item. Speaking rounds have none. */
  function rightOf(st, it) {
    if (!st || !it) return null;
    if (st.kind === 'flash') return it.en;
    if (st.kind === 'quiz') return it.answer;
    if (st.kind === 'sort') return st.groups[it.group].n;
    if (st.kind === 'order') return it.parts.join(it.joiner || '');
    return null;
  }

  /* ---------- the game rules: every button press and key comes through here ---------- */
  function createGame(s, getPlan) {
    const stage = () => getPlan().stages[s.stage];
    const resetTimer = () => { const t = stage() ? stage().timer : 0; s.timer = { total: t, left: t, running: false }; };
    const clearItem = () => { s.revealed = false; s.line = 0; s.hidden = []; s.picked = null; s.answers = {}; s.built = []; s.wrongs = []; resetTimer(); s.rev++; };
    const enterStage = (i, fxs) => {
      s.stage = i; s.used = []; s.spinning = false;
      s.item = stage().pick ? -1 : 0;
      clearItem();
      s.screen = 'stage';
      fxs.push({ fx: 'round' });
    };
    const finish = (fxs) => { s.screen = 'podium'; s.timer.running = false; s.picked = null; s.rev++; fxs.push({ fx: 'podium' }); };
    const stageDone = () => (stage().pick ? s.used.length >= stage().items.length : s.item >= stage().items.length - 1);
    const advance = (fxs) => {
      const st = stage();
      if (stageDone()) {
        if (s.stage < getPlan().stages.length - 1) enterStage(s.stage + 1, fxs);
        else finish(fxs);
        return;
      }
      s.item = st.pick ? -1 : s.item + 1;
      clearItem();
      fxs.push({ fx: 'next' });
    };
    const reveal = (fxs) => {
      const st = stage();
      if (st.kind === 'role' && s.line < 2) {
        s.line++;
        if (s.line === 2) s.revealed = true;
        else { s.rev++; fxs.push({ fx: 'line' }); return; }
      } else {
        if (s.revealed || (st.pick && s.item < 0)) return;
        s.revealed = true;
      }
      s.timer.running = false;
      s.rev++;
      fxs.push({ fx: 'reveal' });
      scoreStudents(fxs);
    };
    /* At the reveal, each right answer earns one point. It counts once, even if the teacher goes back. */
    const scoreStudents = (fxs) => {
      const st = stage(), right = rightOf(st, st.items[s.item]);
      const qid = `${s.seed}:${s.stage}:${s.item}`;
      if (!s.students || right === null || s.scored.includes(qid)) return;
      s.scored.push(qid);
      if (s.scored.length > 60) s.scored.shift();
      const gains = {};
      let total = 0;
      Object.entries(s.answers).forEach(([id, value]) => {
        const p = s.players[id];
        if (!p || value !== right) return;
        p.score++;
        total++;
        if (s.mode === 'class') s.classScore++;
        else if (s.teams[p.team]) { s.teams[p.team].score++; gains[p.team] = (gains[p.team] || 0) + 1; }
      });
      if (total) fxs.push({ fx: 'tally', total, gains });
    };
    const openItem = (n, fxs) => {
      s.item = n; s.used.push(n); s.revealed = false; s.picked = null; resetTimer(); s.rev++;
      fxs.push({ fx: 'open', n });
    };
    const back = (fxs) => {
      const st = stage();
      if (st.pick) {
        if (s.item >= 0) { s.used = s.used.filter((x) => x !== s.item); s.item = -1; clearItem(); fxs.push({ fx: 'next' }); return; }
        if (s.used.length) { s.item = s.used[s.used.length - 1]; clearItem(); fxs.push({ fx: 'next' }); return; }
      } else if (s.item > 0) { s.item--; clearItem(); fxs.push({ fx: 'next' }); return; }
      if (s.stage > 0) { enterStage(s.stage - 1, fxs); }
    };
    const NAV = { reveal: 1, next: 1, prev: 1, spin: 1, box: 1, goto: 1, start: 1 };

    function apply(cmd) {
      const fxs = [];
      if (!cmd || typeof cmd.type !== 'string') return fxs;
      /* A press made on an older screen is ignored: it was a double tap. */
      if (NAV[cmd.type] && typeof cmd.rev === 'number' && cmd.rev !== s.rev) return fxs;
      if (s.spinning && NAV[cmd.type]) return fxs;
      switch (cmd.type) {
        case 'hello': s.phone = true; s.qr = false; fxs.push({ fx: 'phone' }); break;
        case 'students':
          s.students = !s.students;
          /* The teacher's QR goes away first, so students can only scan their own. */
          if (s.students) { s.qr = false; s.joinQr = true; }
          break;
        case 'joinqr': s.joinQr = !s.joinQr; break;
        case 'kick':
          if (s.players[cmd.client]) { delete s.players[cmd.client]; delete s.answers[cmd.client]; s.kicked.push(cmd.client); }
          break;
        case 'start': if (s.screen === 'lobby') enterStage(0, fxs); break;
        case 'reveal': if (s.screen === 'stage') reveal(fxs); break;
        case 'next': if (s.screen === 'stage') advance(fxs); break;
        case 'prev': if (s.screen === 'stage') back(fxs); break;
        case 'goto': {
          const i = Number(cmd.stage);
          if (s.screen === 'stage' && Number.isInteger(i) && getPlan().stages[i] && i !== s.stage) enterStage(i, fxs);
          break;
        }
        case 'spin': {
          const st = stage();
          if (s.screen !== 'stage' || st.kind !== 'wheel') break;
          const free = st.items.map((_, i) => i).filter((i) => !s.used.includes(i));
          if (!free.length) break;
          const n = free[Math.floor(Math.random() * free.length)];
          const slice = 360 / st.items.length;
          s.spinTo = n;
          s.spinning = true;
          s.item = -1; s.revealed = false; s.picked = null;
          s.wheelDeg = Math.ceil(s.wheelDeg / 360) * 360 + 1800 + (360 - (n + 0.5) * slice);
          s.rev++;
          fxs.push({ fx: 'spin' });
          break;
        }
        case 'spinDone':
          if (s.spinning) { s.spinning = false; openItem(s.spinTo, fxs); }
          break;
        case 'box': {
          const st = stage();
          if (s.screen !== 'stage' || st.kind !== 'boxes') break;
          const free = st.items.map((_, i) => i).filter((i) => !s.used.includes(i));
          const n = cmd.n === undefined ? free[Math.floor(Math.random() * free.length)] : Number(cmd.n);
          if (free.includes(n)) openItem(n, fxs);
          break;
        }
        case 'timer':
          if (cmd.op === 'start' && s.timer.total) { if (s.timer.left <= 0) s.timer.left = s.timer.total; s.timer.running = true; }
          else if (cmd.op === 'pause') s.timer.running = false;
          else if (cmd.op === 'reset') resetTimer();
          fxs.push({ fx: 'timer' });
          break;
        case 'fifty': {
          const st = stage();
          if (s.screen !== 'stage' || st.kind !== 'quiz' || s.revealed || s.hidden.length) break;
          const it = st.items[s.item];
          if (it.options.length < 3) break;
          const wrong = it.options.filter((o) => o !== it.answer).sort(() => Math.random() - 0.5);
          s.hidden = wrong.slice(0, it.options.length === 3 ? 1 : 2);
          fxs.push({ fx: 'fifty' });
          break;
        }
        case 'score': {
          const delta = cmd.delta === -1 ? -1 : 1;
          const team = Number(cmd.team);
          if (team === -1 || s.mode === 'class') {
            s.classScore = Math.max(0, s.classScore + delta);
            fxs.push({ fx: 'score', team: -1, delta });
          } else if (s.teams[team]) {
            s.teams[team].score = Math.max(0, s.teams[team].score + delta);
            fxs.push({ fx: 'score', team, delta });
          }
          break;
        }
        case 'teams': {
          const n = Number(cmd.n);
          if (n === 0) s.mode = 'class';
          else if (n >= 2 && n <= 5) {
            s.mode = 'teams';
            s.teams = makeTeams(n, s.teams);
            Object.values(s.players).forEach((p) => { p.team %= n; });
          }
          fxs.push({ fx: 'teams' });
          break;
        }
        case 'rename': {
          const name = SEJ.cleanName(cmd.name);
          if (name && s.teams[cmd.team]) s.teams[cmd.team].name = name;
          break;
        }
        case 'roster':
          if (Array.isArray(cmd.names)) {
            s.roster = uniq(cmd.names.map((x) => SEJ.cleanName(x)).filter(Boolean)).slice(0, 60);
            saveRoster(s.roster);
          }
          break;
        case 'pick': {
          const pool = cmd.what === 'team' ? (s.mode === 'class' ? [] : s.teams.map((t) => t.name)) : s.roster;
          if (!pool.length || s.picking) break;
          const name = pool[Math.floor(Math.random() * pool.length)];
          s.picked = { name, what: cmd.what === 'team' ? 'team' : 'student' };
          fxs.push({ fx: 'pick', name, pool });
          break;
        }
        case 'place': {
          /* A tile moves into the sentence, in front of another tile if dropped on one. */
          const st = stage();
          if (s.screen !== 'stage' || st.kind !== 'order' || s.revealed) break;
          const it = st.items[s.item], i = Number(cmd.i);
          if (!it.tiles[i]) break;
          s.built = s.built.filter((x) => x !== i);
          const at = s.built.indexOf(Number(cmd.before));
          if (cmd.before !== undefined && at >= 0) s.built.splice(at, 0, i);
          else s.built.push(i);
          fxs.push({ fx: 'place' });
          if (s.built.length === it.tiles.length) {
            if (s.built.map((x) => it.tiles[x]).join('\u0001') === it.parts.join('\u0001')) reveal(fxs);
            else { fxs.push({ fx: 'wrongOrder' }); }
          }
          break;
        }
        case 'unplace':
          if (!s.revealed) { s.built = s.built.filter((x) => x !== Number(cmd.i)); fxs.push({ fx: 'place' }); }
          break;
        case 'clearBuilt': s.built = []; break;
        case 'tap': {
          /* Someone answers on the TV itself. Right reveals; wrong stays on screen, crossed out, so the class tries again. */
          const st = stage();
          if (s.screen !== 'stage' || s.revealed || s.students || !['flash', 'quiz', 'sort'].includes(st.kind)) break;
          const right = rightOf(st, st.items[s.item]), value = String(cmd.value);
          if (value === right) reveal(fxs);
          else {
            if (!s.wrongs.includes(value)) s.wrongs.push(value);
            fxs.push({ fx: 'wrongTap' });
          }
          break;
        }
        case 'cheer': fxs.push({ fx: 'cheer', kind: cmd.kind }); break;
        case 'sound':
          s.sound = !s.sound;
          store.state.sound = s.sound;
          store.save();
          if (!s.sound) voice.stop();
          break;
        case 'qr': s.qr = !s.qr; break;
        case 'shuffle':
          if (s.screen !== 'stage') break;
          s.seed = Math.floor(Math.random() * 1e9);
          s.item = stage().pick ? -1 : 0;
          s.used = [];
          clearItem();
          fxs.push({ fx: 'plan' }, { fx: 'next' });
          break;
        case 'restart':
          s.teams.forEach((t) => { t.score = 0; });
          Object.values(s.players).forEach((p) => { p.score = 0; });
          s.scored = [];
          s.classScore = 0; s.screen = 'lobby'; s.qr = !s.phone && !s.students; s.stage = 0; s.item = 0; s.used = []; s.spinning = false;
          s.seed = Math.floor(Math.random() * 1e9);
          fxs.push({ fx: 'plan' });
          clearItem();
          break;
        case 'end': if (s.screen === 'stage') finish(fxs); break;
        default: break;
      }
      return fxs;
    }
    return { apply, stageDone };
  }

  /* What the teacher's panel needs for the current screen, including the answer. */
  function teacherView(s, plan) {
    const base = { lesson: plan.lesson.title, emoji: plan.lesson.emoji };
    if (s.screen === 'lobby') {
      return Object.assign(base, {
        sub: 'Ready to start', tip: 'Choose the teams, then start when the class is ready.',
        primary: { label: '🚀 Start the game', type: 'start', nav: true },
      });
    }
    if (s.screen === 'podium') return Object.assign(base, { sub: 'Game finished', tip: 'Well played! Use Restart to play again.' });
    const st = plan.stages[s.stage];
    const count = st.items.length;
    const it = s.item >= 0 ? st.items[s.item] : null;
    const last = s.stage === plan.stages.length - 1;
    const doneHere = st.pick ? s.used.length >= count : s.item >= count - 1;
    const nextLabel = !doneHere ? 'Next ➡️' : last ? '🏁 Finish the game' : '➡️ Next round';
    const answer = !it ? '' : it.answer || it.en || (st.kind === 'sort' ? `${st.groups[it.group].n}` : it.sample || '');
    let primary;
    const go = (label, type) => ({ label, type, nav: true });
    if (st.kind === 'wheel') {
      if (s.spinning) primary = { label: '🎡 Spinning…', type: 'spin', nav: true, disabled: true };
      else if (it && !s.revealed) primary = go('👁 Show the example', 'reveal');
      else if (doneHere) primary = go(nextLabel, 'next');
      else primary = go('🎡 SPIN', 'spin');
    } else if (st.kind === 'boxes') {
      if (it && !s.revealed) primary = go('👁 Show the example', 'reveal');
      else if (doneHere) primary = go(nextLabel, 'next');
      else primary = go('🎁 Open a random box', 'box');
    } else if (st.kind === 'role') {
      primary = s.line < 2 ? go('💬 Next line', 'reveal') : go(nextLabel, 'next');
    } else {
      primary = s.revealed ? go(nextLabel, 'next') : go('👁 Reveal answer', 'reveal');
    }
    const shown = st.pick ? s.used.length : s.item + 1;
    return Object.assign(base, {
      sub: `${st.round}: ${st.name} · ${shown} of ${count}`,
      step: shown, total: count,
      tip: st.tip, answer, primary,
      canBack: s.stage > 0 || (st.pick ? s.used.length > 0 : s.item > 0),
      canFifty: st.kind === 'quiz' && !s.revealed && it && it.options.length > 2,
      boxes: st.kind === 'boxes' ? st.items.map((_, n) => ({ n, used: s.used.includes(n) })) : null,
      rounds: plan.stages.map((x) => x.round),
    });
  }

  /* ---------- the class TV ---------- */
  const readSave = (lessonCode) => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && saved.state && saved.state.lesson === lessonCode && saved.state.v === 4 && Date.now() - saved.at < SAVE_HOURS * 3600000) return saved.state;
    } catch (e) { /* start fresh */ }
    return null;
  };

  SEJ.classPage = function (root, lessonCode) {
    if (!SEJ.lessonRaw(lessonCode)) { location.hash = '#/map'; return () => {}; }
    SEJ.music.stop();
    const s = readSave(lessonCode) || newState(SEJ.relay.newCode(), lessonCode);
    s.spinning = false;
    s.picking = false;
    s.timer.running = false;
    store.state.sound = s.sound;
    let plan = SEJ.classPlan(lessonCode, s.seed);
    const game = createGame(s, () => plan);
    let alive = true, linkOk = null, link = null, drawer = null, panel = null;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms * speed()); timers.add(t); return t; };

    const publicState = () => {
      const copy = Object.assign({}, s, { view: teacherView(s, plan), answered: Object.keys(s.answers).length });
      delete copy.spinTo;
      delete copy.answers;
      delete copy.scored;
      return copy;
    };
    /* What student phones receive. It holds no answer until the reveal and no teacher code. */
    const studentFeed = () => {
      const players = {};
      Object.entries(s.players).forEach(([id, p]) => { players[id] = { s: p.score, t: p.team, a: id in s.answers ? 1 : 0 }; });
      const feed = {
        open: s.students, screen: s.screen, mode: s.mode, lesson: plan.lesson.title, full: Object.keys(s.players).length >= MAX_PLAYERS,
        teams: s.teams.map((t) => ({ name: t.name, color: t.color, score: t.score })), players, kicked: s.kicked,
      };
      if (s.screen !== 'stage') return feed;
      const st = plan.stages[s.stage], it = s.item >= 0 ? st.items[s.item] : null;
      Object.assign(feed, { kind: st.kind, round: st.round });
      if (['wheel', 'boxes', 'role', 'read'].includes(st.kind)) {
        feed.speak = true;
        if (it) { feed.prompt = it.q || it.en; feed.frame = it.frame; }
        return feed;
      }
      Object.assign(feed, { qid: `${s.seed}:${s.stage}:${s.item}`, revealed: s.revealed, hidden: s.hidden });
      if (st.kind === 'flash') Object.assign(feed, { prompt: it.bn, options: it.options });
      if (st.kind === 'quiz') Object.assign(feed, { prompt: it.q, options: it.options });
      if (st.kind === 'sort') Object.assign(feed, { prompt: it.text, options: st.groups.map((g) => g.n) });
      if (st.kind === 'order') Object.assign(feed, { prompt: it.joiner ? 'Put the words in order!' : 'Spell the word!', tiles: it.tiles, joiner: it.joiner });
      if (s.revealed) feed.right = rightOf(st, it);
      return feed;
    };
    /* Student messages. Names are cleaned, the game has a size limit, and each student gets one answer per question. */
    function onPlayers(list) {
      let changed = false;
      const st = s.screen === 'stage' ? plan.stages[s.stage] : null;
      const qid = st ? `${s.seed}:${s.stage}:${s.item}` : '';
      const canAnswer = st && !s.revealed && s.item >= 0 && rightOf(st, st.items[s.item]) !== null;
      list.forEach(({ client, msg }) => {
        if (!client || !msg || s.kicked.includes(client) || !s.students) return;
        const name = SEJ.cleanName(msg.name);
        const wanted = Number(msg.team);
        const team = s.mode === 'teams' ? (Number.isInteger(wanted) && s.teams[wanted] ? wanted : null) : 0;
        if (!name || team === null) return;
        let p = s.players[client];
        if (!p) {
          if (Object.keys(s.players).length >= MAX_PLAYERS) return;
          p = s.players[client] = { name, team, score: 0 };
          changed = true;
        } else if (p.team !== team || p.name !== name) { p.team = team; p.name = name; changed = true; }
        if (canAnswer && msg.qid === qid && typeof msg.value === 'string' && !(client in s.answers)) {
          s.answers[client] = msg.value.slice(0, 200);
          changed = true;
        }
      });
      if (changed) { draw(); persist(); if (link) link.changed(); }
    }

    /* ---------- screen skeleton ---------- */
    const stageArea = h('main', { class: 'cl-stage' });
    const topInfo = h('div', { class: 'cl-top-info' });
    const timerNum = h('b', { class: 'cl-clock-num' });
    const timerBar = h('i', { class: 'cl-clock-bar' });
    const timerBox = h('div', { class: 'cl-clock', role: 'timer' }, SEJ.sticker('⏱️', 'cl-clock-art'), timerNum, h('span', { class: 'cl-clock-track' }, timerBar));
    const teamBar = h('footer', { class: 'cl-teams' });
    const teacherQr = h('div', { class: 'cl-qr' });
    const studentQr = h('div', { class: 'cl-qr cl-qr-students' });
    const sideBar = h('aside', { class: 'cl-side' }, teacherQr, studentQr);
    const answeredChip = h('span', { class: 'cl-chip cl-answered', role: 'status', hidden: true });
    const soundChip = h('button', { class: 'cl-chip cl-sound-chip', id: 'cl-sound-on', onclick: () => { sfx.fanfare(); soundChip.hidden = true; } }, '🔊 Click once to turn on sound');
    const codeChip = h('button', { class: 'cl-chip', onclick: () => dispatch({ type: 'qr' }), title: 'Show or hide the QR code' });
    const linkWarn = h('span', { class: 'cl-chip cl-chip-warn', role: 'status', hidden: true }, '⚠️ Phone link lost. Reconnecting…');
    /* The class only sees the game. The teacher's tools appear when the mouse moves or the screen is touched. */
    const tools = h('div', { class: 'cl-tools', id: 'cl-tools', hidden: true },
      codeChip,
      h('button', { class: 'cl-chip', id: 'cl-controls', onclick: () => toggleDrawer(), 'aria-label': 'Open teacher controls' }, '🎛️ Controls'),
      h('button', { class: 'cl-chip cl-icon', onclick: () => toggleFullscreen(), 'aria-label': 'Full screen', title: 'Full screen (F)' }, '⛶'),
      h('a', { class: 'cl-chip cl-icon', href: `#/lesson/${lessonCode}`, 'aria-label': 'Leave Class Battle', title: 'Leave' }, '✕'));
    let toolsTimer = 0;
    const showTools = () => {
      tools.hidden = false;
      clearTimeout(toolsTimer);
      toolsTimer = setTimeout(() => { if (drawerHost.hidden) tools.hidden = true; }, 3000);
    };
    const drawerHost = h('div', { class: 'cl-drawer', hidden: true });
    const sceneHost = h('div', { class: 'cl-scene' });
    const page = h('div', { class: 'cl-tv' },
      sceneHost,
      h('header', { class: 'cl-top' },
        topInfo,
        h('span', { class: 'spacer' }),
        timerBox,
        soundChip,
        answeredChip,
        linkWarn,
        tools),
      stageArea, sideBar, teamBar, drawerHost);
    root.replaceChildren(page);
    page.addEventListener('mousemove', showTools);
    page.addEventListener('pointerdown', showTools);
    soundChip.hidden = !(navigator.userActivation && !navigator.userActivation.hasBeenActive);
    const soundReady = () => { soundChip.hidden = true; };
    addEventListener('pointerdown', soundReady, { once: true });
    addEventListener('keydown', soundReady, { once: true });

    function toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    }
    let tvUnlocked = !SEJ.relay.available || SEJ.testMode;
    let drawerUnlocked = !SEJ.relay.available;
    function toggleDrawer(force) {
      const show = force !== undefined ? force : drawerHost.hidden;
      drawerHost.hidden = !show;
      if (show && !drawerUnlocked) {
        drawerHost.replaceChildren(SEJ.pinPad({
          code: s.code, title: 'Teacher PIN', note: 'Enter the PIN to use the controls.',
          onCancel: () => { drawerHost.replaceChildren(); drawerHost.hidden = true; },
          onOk: () => { drawerUnlocked = true; tvUnlocked = true; drawerHost.replaceChildren(); toggleDrawer(true); },
        }));
        return;
      }
      if (show && !panel) {
        drawerHost.append(h('button', { class: 'cl-drawer-close', onclick: () => toggleDrawer(false), 'aria-label': 'Close controls' }, '✕ Close controls'));
        panel = SEJ.controlPanel(drawerHost, (cmd) => dispatch(cmd));
      }
      if (show) panel.update(publicState());
    }

    /* ---------- drawing ---------- */
    let sceneName = '', lastSig = '', shownDeg = s.wheelDeg;
    function setScene(name) {
      if (name === sceneName) return;
      sceneName = name;
      sceneHost.replaceChildren(SEJ.scene(name));
    }
    function faceOf(team, cls = '') {
      return team.hero ? SEJ.heroFace(team.hero, `cl-face ${cls}`) : h('span', { class: `face cl-face cl-star-face ${cls}`, style: { background: team.color } }, '⭐');
    }
    function drawTeams() {
      if (s.mode === 'class') {
        if (!teamBar.querySelector('.cl-class-score')) teamBar.replaceChildren(h('div', { class: 'cl-class-score', id: 'cl-score-class' }, SEJ.sticker('⭐', 'cl-class-star'), h('span', { text: 'Class score' }), h('b', { class: 'cl-score' })));
        teamBar.querySelector('.cl-score').textContent = s.classScore;
        return;
      }
      const top = Math.max(...s.teams.map((t) => t.score));
      const cards = teamBar.querySelectorAll('.cl-team');
      if (cards.length !== s.teams.length) {
        teamBar.replaceChildren(...s.teams.map((t, i) => h('div', { class: 'cl-team', id: `cl-team-${i}`, style: { '--team': t.color } },
          faceOf(t), h('span', { class: 'cl-team-name' }), h('b', { class: 'cl-score' }), h('span', { class: 'cl-crown', 'aria-hidden': 'true' }, '👑'))));
      }
      s.teams.forEach((t, i) => {
        const el = teamBar.children[i];
        el.querySelector('.cl-team-name').textContent = t.name;
        el.querySelector('.cl-score').textContent = t.score;
        el.classList.toggle('leading', top > 0 && t.score === top);
      });
    }
    function drawTimer() {
      const t = s.timer;
      const show = s.screen === 'stage' && t.total > 0;
      timerBox.hidden = !show;
      if (!show) return;
      timerNum.textContent = SEJ.clock(t.left);
      timerBar.style.transform = `scaleX(${t.total ? Math.max(0, t.left / t.total) : 0})`;
      timerBox.classList.toggle('low', t.running && t.left <= 5);
    }
    function drawTop() {
      const v = teacherView(s, plan);
      const st = s.screen === 'stage' ? plan.stages[s.stage] : null;
      topInfo.replaceChildren(
        SEJ.sticker(plan.lesson.emoji, 'cl-top-art'),
        h('div', { class: 'cl-top-text' }, h('b', { text: plan.lesson.title }), h('small', { text: st ? v.sub : `Lesson ${plan.lesson.code} · Class Battle` })));
      const ok = !SEJ.relay.available ? null : linkOk;
      codeChip.textContent = `📱 ${s.code}`;
      codeChip.hidden = !SEJ.relay.available;
      linkWarn.hidden = !(s.phone && ok === false);
    }
    function drawQr() {
      const playing = s.screen === 'stage';
      teacherQr.hidden = !(s.qr && SEJ.relay.available && playing);
      if (!teacherQr.hidden && !teacherQr.firstChild) fillQr(teacherQr);
      studentQr.hidden = !(s.students && s.join && s.joinQr && playing);
      if (!studentQr.hidden && !studentQr.firstChild) fillStudentQr(studentQr);
      sideBar.hidden = teacherQr.hidden && studentQr.hidden;
      const total = Object.keys(s.players).length;
      /* Only this line changes when someone joins, so the QR stays still for those still scanning. */
      const joinedLine = $('#cl-joined', stageArea);
      if (joinedLine) {
        const names = Object.values(s.players);
        joinedLine.textContent = names.length ? `${names.length} joined: ${names.slice(-8).map((p) => p.name).join(', ')}` : 'Waiting for students…';
      }
      answeredChip.hidden = !s.students || s.screen === 'podium';
      answeredChip.textContent = playing && !s.revealed && Object.keys(s.answers).length ? `🙋 ${Object.keys(s.answers).length} of ${total} answered` : `🙋 ${total} joined`;
    }
    function joinUrl() {
      return `${location.origin}${location.pathname.replace(/index\.html$/, '')}?join=${s.join}${SEJ.testMode ? '&test=1' : ''}`;
    }
    function fillStudentQr(host) {
      host.replaceChildren(
        qrImage(joinUrl()),
        h('div', { class: 'cl-qr-text' }, h('small', { text: 'Students: scan to play' }), h('b', { class: 'cl-qr-code', text: s.join }), h('small', { class: 'cl-qr-url', text: `${location.host}/?join=${s.join}` })));
    }
    function remoteUrl() {
      return `${location.origin}${location.pathname.replace(/index\.html$/, '')}?remote=${s.code}${SEJ.testMode ? '&test=1' : ''}`;
    }
    function fillQr(host) {
      host.replaceChildren(
        qrImage(remoteUrl()),
        h('div', { class: 'cl-qr-text' }, h('small', { text: 'Teacher: scan and enter PIN' }), h('b', { class: 'cl-qr-code', text: s.code }), h('small', { class: 'cl-qr-url', text: `${location.host}/?remote=${s.code}` })));
    }

    function drawLobby() {
      setScene('magic');
      const rounds = plan.stages.map((st, i) => h('li', { class: 'cl-round enter', style: { '--i': i } },
        h('span', { class: 'cl-round-n', text: i + 1 }),
        h('span', {}, h('b', { text: st.round }), h('small', { text: st.name }))));
      stageArea.replaceChildren(h('div', { class: 'cl-lobby' },
        h('div', { class: 'cl-lobby-main' },
          h('h1', { class: 'logo-word cl-lobby-title', text: 'Class Battle!' }),
          h('p', { class: 'cl-lobby-lesson' }, SEJ.sticker(plan.lesson.emoji, 'cl-lobby-art'), ' ', plan.lesson.title),
          h('p', { class: 'cl-lobby-mission', text: plan.lesson.mission.en }),
          h('ol', { class: 'cl-rounds' }, rounds),
          h('p', { class: `cl-lobby-wait ${s.phone ? 'ready' : ''}`, role: 'status', text: s.phone ? '✅ Teacher connected. Starting soon!' : 'Waiting for the teacher…' })),
        SEJ.relay.available
          ? h('div', { class: 'cl-lobby-qr enter-pop', id: 'cl-lobby-qr' })
          : h('div', { class: 'cl-lobby-qr enter-pop' }, h('p', { class: 'cl-qr-note', text: 'The phone remote works on the live website. Here, move the mouse and use Controls, or your keyboard.' }))));
      const box = $('#cl-lobby-qr', stageArea);
      if (box) {
        if (s.students && s.join) {
          box.replaceChildren(
            h('p', { class: 'cl-qr-head', text: 'Students: scan and pick a team' }),
            qrImage(joinUrl()),
            h('b', { class: 'cl-qr-code', text: s.join }),
            h('small', { class: 'cl-qr-url', text: `${location.host}/?join=${s.join}` }),
            h('p', { class: 'cl-joined', id: 'cl-joined' }));
        } else {
          box.replaceChildren(
            h('p', { class: 'cl-qr-head', text: 'Teacher: scan, then enter your PIN' }),
            s.phone ? h('p', { class: 'cl-qr-done', text: '✅ Phone connected!' }) : qrImage(remoteUrl()),
            h('b', { class: 'cl-qr-code', text: s.code }),
            h('small', { class: 'cl-qr-url', text: `${location.host}/?remote=${s.code}` }));
        }
      }
    }
    function qrImage(text) {
      const el = h('div', { class: 'cl-qr-img', role: 'img', 'aria-label': 'QR code for the teacher remote' });
      if (window.qrcode) {
        const q = window.qrcode(0, 'M');
        q.addData(text);
        q.make();
        el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      }
      return el;
    }

    const OPTION_COLORS = ['g-pink', 'g-blue', 'g-orange', 'g-green'];
    /* The same answer buttons as the students' phones. They can be tapped on a touch screen. */
    function optionButtons(options, right) {
      const live = !s.revealed && !s.students;
      return h('div', { class: `cl-options n${options.length}` }, options.map((o, i) => {
        const isRight = o === right;
        const wrong = s.wrongs.includes(o);
        return h(live && !wrong ? 'button' : 'div', {
          class: `cl-option gummy ${OPTION_COLORS[i % 4]} ${s.hidden.includes(o) ? 'gone' : ''} ${wrong ? 'crossed' : ''} ${s.revealed ? (isRight ? 'right answer-pop' : 'dim') : ''}`,
          id: isRight && s.revealed ? 'cl-answer' : null,
          onclick: live && !wrong ? () => dispatch({ type: 'tap', value: o }) : null,
        }, h('span', { class: 'cl-letter', text: 'ABCD'[i] }), h('span', { class: 'cl-option-text', text: o }), s.revealed && isRight && h('span', { class: 'cl-tick', text: '✓' }), wrong && h('span', { class: 'cl-tick', text: '✕' }));
      }));
    }
    function drawFlash(st) {
      const it = st.items[s.item];
      return h('div', { class: 'cl-quiz' },
        h('div', { class: 'cl-card cl-question cl-flash-q-card' },
          h('small', { class: 'cl-ask', text: 'How do we say this in English?' }),
          h('p', { class: 'cl-flash-bn', lang: 'bn', text: it.bn })),
        optionButtons(it.options, it.en));
    }
    function drawQuiz(st) {
      const it = st.items[s.item];
      return h('div', { class: 'cl-quiz' },
        h('div', { class: 'cl-card cl-question' },
          s.revealed && it.emoji && SEJ.sticker(it.emoji, 'cl-q-art'),
          h('p', { text: it.q })),
        optionButtons(it.options, it.answer));
    }
    function drawSort(st) {
      const it = st.items[s.item];
      const placed = st.items.slice(0, s.item + (s.revealed ? 1 : 0));
      const live = !s.revealed && !s.students;
      const card = !s.revealed
        ? h(live ? 'button' : 'div', { class: 'cl-card cl-sort-card', 'data-card': '1' }, it.emoji && SEJ.sticker(it.emoji, 'cl-q-art'), h('p', { text: it.text }))
        : h('div', { class: 'cl-card cl-sort-card is-open' }, h('p', {}, it.text, ' ', h('b', { class: 'cl-to', text: `→ ${st.groups[it.group].n}` })));
      if (live) SEJ.tapOrDrag(card, '.cl-bin', (target) => { if (target) dispatch({ type: 'tap', value: target.dataset.group }); });
      return h('div', { class: 'cl-sort' },
        h('p', { class: 'cl-note', text: st.note || (live ? 'Drag the card or tap the right group!' : 'Which group is it?') }),
        card,
        h('div', { class: 'cl-bins' }, st.groups.map((g, gi) => h('div', {
          class: `cl-bin ${s.revealed && it.group === gi ? 'hot' : ''} ${s.wrongs.includes(g.n) ? 'crossed' : ''}`, id: s.revealed && it.group === gi ? 'cl-answer' : null, 'data-group': g.n,
          role: live ? 'button' : null, tabindex: live ? '0' : null, onclick: live ? () => dispatch({ type: 'tap', value: g.n }) : null,
        },
          h('h3', {}, SEJ.sticker(g.e || '📦', 'cl-bin-art'), ' ', g.n),
          h('div', { class: 'cl-bin-list' }, placed.filter((p) => p.group === gi).map((p) => h('span', { class: `cl-bin-chip ${p === it ? 'answer-pop' : ''}`, text: `${p.emoji || ''} ${p.text}`.trim() })))))));
    }
    function drawOrder(st) {
      const it = st.items[s.item];
      const head = h('div', { class: 'cl-card cl-order-card' },
        h('small', { class: 'cl-ask', text: s.revealed ? 'Well done!' : s.students ? 'Answer on your phone!' : it.joiner ? 'Drag the words to make the sentence!' : 'Drag the letters to spell the word!' }),
        it.hint && !/সাজাও/.test(it.hint) && h('p', { class: 'cl-order-hint', lang: 'bn', text: it.hint }),
        s.revealed && it.emoji && SEJ.sticker(it.emoji, 'cl-q-art'));
      const letters = it.joiner ? '' : 'letters';
      if (s.revealed) {
        return h('div', { class: 'cl-order' }, head,
          h('div', { class: `cl-tiles ${letters} solved`, id: 'cl-answer' }, it.parts.map((w) => h('span', { class: 'cl-tile answer-pop', text: w }))));
      }
      const tile = (i, placed) => {
        const el = h('button', { class: `cl-tile ${placed ? 'placed' : ''}`, 'data-tile': i, text: it.tiles[i] });
        if (s.students) { el.disabled = true; return el; }
        SEJ.tapOrDrag(el, placed ? '.cl-built,.cl-tray,.cl-tile.placed' : '.cl-built,.cl-tile.placed', (target) => {
          if (placed && target && target.classList.contains('cl-tray')) return dispatch({ type: 'unplace', i });
          if (placed && !target) return dispatch({ type: 'unplace', i });
          if (target && target.classList.contains('cl-tile')) return dispatch({ type: 'place', i, before: Number(target.dataset.tile) });
          return dispatch({ type: 'place', i });
        });
        return el;
      };
      const left = it.tiles.map((_, i) => i).filter((i) => !s.built.includes(i));
      return h('div', { class: 'cl-order' }, head,
        !s.students && h('div', { class: `cl-built ${letters}`, id: 'cl-built', 'aria-label': 'Your sentence' },
          s.built.length ? s.built.map((i) => tile(i, true)) : h('span', { class: 'cl-built-hint', text: 'Drop here' })),
        h('div', { class: `cl-tiles cl-tray ${letters}`, 'aria-label': 'Words to use' }, left.map((i) => tile(i, false))));
    }
    function speakCard(it) {
      return h('div', { class: 'cl-card cl-speak' },
        SEJ.sticker('🗣️', 'cl-q-art'),
        h('p', { class: 'cl-speak-q', text: it.q }),
        h('p', { class: 'cl-speak-frame', text: it.frame }),
        s.revealed && h('p', { class: 'cl-speak-sample answer-pop', id: 'cl-answer' }, '⭐ ', it.sample));
    }
    function drawWheel(st) {
      const n = st.items.length;
      const slice = 360 / n;
      const colors = ['#ff2e93', '#00b2ff', '#ff7a00', '#17c964', '#7b2ff7', '#ffd60a'];
      const stops = st.items.map((_, i) => `${s.used.includes(i) && i !== s.item ? '#cfc6e8' : colors[i % colors.length]} ${i * slice}deg ${(i + 1) * slice}deg`).join(',');
      const wheel = h('div', { class: 'cl-wheel', id: 'cl-wheel', style: { background: `conic-gradient(${stops})`, transform: `rotate(${shownDeg}deg)` } },
        st.items.map((_, i) => h('span', { class: 'cl-wheel-n', style: { transform: `rotate(${(i + 0.5) * slice}deg) translateY(-34cqw) rotate(${-(i + 0.5) * slice}deg)` }, text: i + 1 })));
      const it = s.item >= 0 ? st.items[s.item] : null;
      return h('div', { class: 'cl-spin' },
        h('div', { class: 'cl-wheel-wrap' }, h('span', { class: 'cl-pointer', 'aria-hidden': 'true' }, '🔻'), wheel),
        it ? speakCard(it) : h('div', { class: 'cl-card cl-speak cl-ready' }, h('p', { class: 'cl-speak-q', text: s.spinning ? 'Round and round…' : 'Ready to spin?' }), SEJ.sticker('🎡', 'big-art')));
    }
    function drawBoxes(st) {
      const it = s.item >= 0 ? st.items[s.item] : null;
      if (it) return h('div', { class: 'cl-box-open' }, h('p', { class: 'cl-box-tag', text: `Box ${s.item + 1}` }), speakCard(it));
      return h('div', { class: 'cl-boxes' },
        h('p', { class: 'cl-note', text: 'Pick a number!' }),
        h('div', { class: 'cl-box-grid' }, st.items.map((_, i) => h('div', { class: `cl-gift ${s.used.includes(i) ? 'used' : ''}`, 'data-box': i },
          SEJ.sticker(s.used.includes(i) ? '✨' : '🎁', 'cl-gift-art'), h('b', { text: i + 1 })))));
    }
    function drawRole(st) {
      const it = st.items[s.item];
      const [a, b] = [plan.lesson.hero, Object.keys(SEJ.HEROES).find((x) => x !== plan.lesson.hero)];
      return h('div', { class: 'cl-role' },
        h('div', { class: 'cl-actor' }, SEJ.heroImg(a, 'cl-actor-img'), h('span', { class: 'cl-actor-tag', text: 'Student A' })),
        h('div', { class: 'cl-lines' },
          h('p', { class: 'cl-bubble left enter-pop', text: it.q }),
          s.line >= 1 && h('p', { class: 'cl-bubble right enter-pop', text: it.frame }),
          s.line >= 2 && h('p', { class: 'cl-bubble right sample answer-pop', id: 'cl-answer' }, '⭐ ', it.sample)),
        h('div', { class: 'cl-actor' }, SEJ.heroImg(b, 'cl-actor-img'), h('span', { class: 'cl-actor-tag', text: 'Student B' })));
    }
    function drawRead(st) {
      const it = st.items[s.item];
      return h('div', { class: `cl-card cl-flash ${s.revealed ? 'is-open' : ''}` },
        h('small', { class: 'cl-ask', text: s.revealed ? 'Well done!' : 'Read it together!' }),
        h('p', { class: `cl-flash-en ${s.revealed ? 'answer-pop' : ''}`, id: s.revealed ? 'cl-answer' : null, text: it.en }));
    }
    const DRAW = { read: drawRead, flash: drawFlash, quiz: drawQuiz, sort: drawSort, order: drawOrder, wheel: drawWheel, boxes: drawBoxes, role: drawRole };

    function topPlayers() {
      const top = Object.values(s.players).filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
      if (!s.students || !top.length) return null;
      return h('p', { class: 'cl-top-players', id: 'cl-top-players' }, '🌟 Top players: ', top.map((p) => `${p.name} (${p.score})`).join(', '));
    }
    function drawPodium() {
      setScene('party');
      if (s.mode === 'class') {
        stageArea.replaceChildren(h('div', { class: 'cl-podium' },
          h('h1', { class: 'logo-word cl-win-title', text: 'Amazing Class!' }),
          h('div', { class: 'cl-class-final enter-pop' }, SEJ.sticker('🏆', 'cl-trophy'), h('b', { text: s.classScore }), h('span', { text: 'points together!' })), topPlayers()));
        return;
      }
      const ranked = s.teams.slice().sort((x, y) => y.score - x.score);
      const top = ranked[0].score;
      const winners = ranked.filter((t) => t.score === top);
      const title = top === 0 ? 'Well Played!' : winners.length > 1 ? 'It’s a Tie!' : `Team ${winners[0].name} Wins!`;
      let rank = 0, prev = null;
      const places = ranked.map((t, i) => {
        if (t.score !== prev) { rank = i + 1; prev = t.score; }
        return h('div', { class: `cl-place p${rank} enter-pop`, style: { '--team': t.color, '--i': i } },
          rank === 1 && top > 0 && h('span', { class: 'cl-place-crown', text: '👑' }),
          t.hero ? SEJ.heroImg(t.hero, 'cl-place-hero') : SEJ.sticker('⭐', 'cl-place-star'),
          h('div', { class: 'cl-place-block' }, h('strong', { text: t.name }), h('b', { text: t.score }), top > 0 && h('small', { text: `${['1st', '2nd', '3rd', '4th', '5th'][rank - 1]} place` })));
      });
      stageArea.replaceChildren(h('div', { class: 'cl-podium' }, h('h1', { class: 'logo-word cl-win-title', text: title }), h('div', { class: 'cl-places' }, places), topPlayers()));
    }

    function signature() {
      return JSON.stringify([s.screen, s.stage, s.item, s.revealed, s.line, s.built, s.wrongs, s.hidden, s.used, s.spinning, s.seed, s.phone, s.students, s.join, s.screen === 'podium' ? Object.values(s.players).map((p) => p.score) : 0, s.screen === 'podium' ? s.teams : 0, s.screen === 'podium' ? s.mode + s.classScore : 0]);
    }
    function draw() {
      if (!alive) return;
      const sig = signature();
      if (sig !== lastSig) {
        const moved = !lastSig || JSON.parse(lastSig).slice(0, 3).join() !== JSON.parse(sig).slice(0, 3).join();
        lastSig = sig;
        if (s.screen === 'lobby') drawLobby();
        else if (s.screen === 'podium') drawPodium();
        else {
          const st = plan.stages[s.stage];
          setScene(st.scene);
          stageArea.replaceChildren(h('div', { class: `cl-round-view ${moved ? 'enter-pop' : ''}` }, DRAW[st.kind](st)));
        }
      }
      drawTop(); drawTeams(); drawTimer(); drawQr();
      if (panel && !drawerHost.hidden) panel.update(publicState());
    }

    /* ---------- moments of celebration ---------- */
    function say(line) { if (s.sound) voice.say(line); }
    /* Reads out what's on screen, except the answer. */
    function readItem() {
      if (s.screen !== 'stage') return;
      const st = plan.stages[s.stage], it = s.item >= 0 ? st.items[s.item] : null;
      if (!it) return;
      const line = st.kind === 'quiz' ? it.q : st.kind === 'sort' ? it.text : st.kind === 'read' ? it.en : st.kind === 'role' ? it.q : '';
      if (line) say(line);
    }
    function splash(top, title, heroId) {
      $$('.cl-splash').forEach((x) => x.remove());
      const el = h('div', { class: 'cl-splash', role: 'status' }, heroId && SEJ.heroImg(heroId, 'cl-splash-hero'), h('small', { text: top }), h('strong', { class: 'logo-word', text: title }));
      page.append(el);
      later(() => el.remove(), 1900);
    }
    const $$ = SEJ.$$;
    function showPick(name, pool) {
      $$('.cl-pick').forEach((x) => x.remove());
      const nameEl = h('strong', { class: 'logo-word', text: pool[0] });
      const el = h('div', { class: 'cl-pick', role: 'status' }, h('small', { text: 'It’s your turn!' }), nameEl);
      page.append(el);
      s.picking = true;
      const steps = SEJ.testMode ? 1 : 14;
      for (let i = 0; i < steps; i++) later(() => { nameEl.textContent = SEJ.pick(pool); sfx.tick(i % 8); }, 70 * i + i * i * 3);
      later(() => {
        s.picking = false;
        nameEl.textContent = name;
        el.classList.add('landed');
        sfx.fanfare();
        fx.burstAt(nameEl, 40, ['⭐', '✨']);
        say(`${name}, it's your turn!`);
      }, 70 * steps + steps * steps * 3);
      later(() => el.remove(), 70 * steps + steps * steps * 3 + 2600);
    }
    function runEffect(e) {
      switch (e.fx) {
        case 'round': {
          const st = plan.stages[s.stage];
          sfx.whoosh(); sfx.fanfare();
          splash(`Round ${s.stage + 1}: ${st.round}`, st.name, plan.lesson.hero);
          say(st.round);
          voice.prepare(st.items.flatMap((x) => [x.q, x.answer, x.en, x.sample, x.text]));
          later(readItem, 1900);
          break;
        }
        case 'next': sfx.whoosh(); voice.stop(); readItem(); break;
        case 'line': sfx.pop(); say(plan.stages[s.stage].items[s.item].frame); break;
        case 'plan': plan = SEJ.classPlan(s.lesson, s.seed); lastSig = ''; break;
        case 'phone': sfx.correct(1); fx.pow('PHONE READY!'); break;
        case 'open': {
          sfx.pop(); sfx.correct(0);
          const it = plan.stages[s.stage].items[s.item];
          later(() => { fx.burst(innerWidth / 2, innerHeight / 2, 28, ['⭐', '✨']); }, 60);
          say(it.q);
          break;
        }
        case 'spin': {
          const duration = 3400 * speed();
          later(() => {
            const w = $('#cl-wheel');
            if (w) {
              w.style.transition = `transform ${duration}ms cubic-bezier(.12,.72,.14,1)`;
              w.style.transform = `rotate(${s.wheelDeg}deg)`;
            }
            shownDeg = s.wheelDeg;
          }, 20);
          for (let i = 0; i < 12; i++) later(() => sfx.tick(i % 5), 90 + i * i * 22);
          later(() => dispatch({ type: 'spinDone' }), 3450);
          break;
        }
        case 'reveal': {
          sfx.correct(2);
          SEJ.buzz(30);
          later(() => { const a = $('#cl-answer'); if (a) fx.burstAt(a, 30, ['⭐', '✨']); }, 40);
          const st = plan.stages[s.stage], it = st.items[s.item];
          say(it.en || it.answer || it.sample || (st.kind === 'sort' ? `${it.text}. ${st.groups[it.group].n}` : ''));
          break;
        }
        case 'place': sfx.pop(); break;
        case 'wrongTap': sfx.wrong(); SEJ.buzz(40); break;
        case 'wrongOrder': {
          sfx.wrong();
          const row = $('#cl-built');
          if (row) fx.play(row, 'shake');
          later(() => dispatch({ type: 'clearBuilt' }), 900);
          break;
        }
        case 'tally':
          sfx.cheer();
          fx.pow(`${e.total} RIGHT!`);
          Object.entries(e.gains).forEach(([team, n]) => {
            const el = $(`#cl-team-${team}`);
            if (el) { fx.play(el, 'jelly'); fx.burstAt(el, 12 + n * 2, ['⭐', '✨']); }
          });
          break;
        case 'fifty': sfx.boing(); break;
        case 'timer': if (s.timer.running) sfx.tick(3); break;
        case 'score': {
          const el = e.team < 0 ? $('#cl-score-class') : $(`#cl-team-${e.team}`);
          if (e.delta > 0) {
            sfx.correct(1); sfx.cheer();
            const from = $('#cl-answer') || stageArea;
            fx.flyStars(from, el, 3);
            fx.burstAt(el, 26, ['⭐', '✨']);
            fx.pow(e.team < 0 ? '+1!' : `+1 ${s.teams[e.team].name.toUpperCase()}!`);
          } else sfx.boing();
          fx.play(el, 'jelly');
          break;
        }
        case 'pick': showPick(e.name, e.pool); break;
        case 'cheer':
          if (e.kind === 'clap') { sfx.applause(2.2); fx.confetti(70); }
          else if (e.kind === 'fanfare') { sfx.fanfare(); fx.fireworks(4); }
          else if (e.kind === 'wow') { sfx.cheer(); fx.pow('WOW!'); fx.burst(innerWidth / 2, innerHeight / 2, 40, ['🤩', '⭐']); }
          else if (e.kind === 'oops') { sfx.wrong(); fx.pow('OOPS!', 'soft'); }
          break;
        case 'podium': {
          sfx.fanfare(); sfx.applause(3.2);
          fx.confetti(280); fx.fireworks(10);
          later(() => fx.confetti(180), 1600);
          let line = 'Amazing work, everyone!';
          if (s.mode === 'teams') {
            const top = Math.max(...s.teams.map((t) => t.score));
            const winners = s.teams.filter((t) => t.score === top);
            if (top > 0) line = winners.length > 1 ? 'It is a tie! Well played!' : `Team ${winners[0].name} wins! Well done!`;
          }
          say(line);
          break;
        }
        default: break;
      }
    }

    function persist() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ at: Date.now(), state: s })); } catch (e) { /* storage blocked */ }
    }
    function dispatch(cmd) {
      if (!alive) return;
      if (cmd.type === 'students' && !s.join && SEJ.relay.available) {
        SEJ.relay.joinCode(s.code).then((join) => { s.join = join; dispatch(cmd); }).catch(() => {});
        return;
      }
      const fxs = game.apply(cmd);
      fxs.filter((e) => e.fx === 'plan').forEach(runEffect);
      draw();
      fxs.filter((e) => e.fx !== 'plan').forEach(runEffect);
      persist();
      if (link) link.changed();
    }

    /* The timer runs on the TV only. */
    let lastTick = performance.now();
    const clock = setInterval(() => {
      const now = performance.now(), dt = (now - lastTick) / 1000;
      lastTick = now;
      if (!s.timer.running) return;
      const before = s.timer.left;
      s.timer.left = Math.max(0, s.timer.left - dt);
      if (Math.ceil(before) !== Math.ceil(s.timer.left) && s.timer.left > 0 && s.timer.left <= 5) sfx.tick(Math.ceil(s.timer.left));
      if (s.timer.left <= 0) {
        s.timer.running = false;
        sfx.wrong();
        fx.pow('TIME’S UP!', 'soft');
        persist();
        if (link) link.changed();
      }
      drawTimer();
    }, 200);

    /* Keyboard: handy when the TV is run from a laptop. */
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const v = teacherView(s, plan);
      const k = e.key;
      if (k === 'f' || k === 'F') { toggleFullscreen(); return; }
      if (k === 'm' || k === 'M') { toggleDrawer(); return; }
      if (!tvUnlocked) return;
      if (k === ' ' || k === 'Enter') {
        if (e.target && e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        if (v.primary && !v.primary.disabled) dispatch({ type: v.primary.type });
      } else if (k === 'ArrowRight') dispatch({ type: s.screen === 'lobby' ? 'start' : 'next' });
      else if (k === 'ArrowLeft') dispatch({ type: 'prev' });
      else if (/^[1-5]$/.test(k)) dispatch({ type: 'score', team: s.mode === 'class' ? -1 : Number(k) - 1, delta: 1 });
      else if (k === 't' || k === 'T') dispatch({ type: 'timer', op: s.timer.running ? 'pause' : 'start' });
      else if (k === 'r' || k === 'R') dispatch({ type: 'pick', what: s.roster.length ? 'student' : 'team' });
      else if (k === 'c' || k === 'C') dispatch({ type: 'qr' });
    };
    addEventListener('keydown', onKey);

    /* ---------- link to the phone ---------- */
    const wake = SEJ.keepAwake();
    if (SEJ.relay.available) {
      link = SEJ.relay.tv({
        code: s.code,
        getState: publicState,
        getFeed: () => (s.join ? studentFeed() : null),
        wantsPlayers: () => s.students && !!s.join,
        onPlayers,
        onStatus: (ok) => { if (ok !== linkOk) { linkOk = ok; drawTop(); } },
        onCmds: ({ client, list }) => {
          if (!client || !Array.isArray(list)) return false;
          let done = s.acks[client] || 0, any = false;
          list.filter((c) => c && c.seq > done).sort((a, b) => a.seq - b.seq).forEach((c) => {
            done = c.seq;
            s.acks[client] = done;
            any = true;
            dispatch(c);
          });
          const ids = Object.keys(s.acks);
          if (ids.length > 6) delete s.acks[ids[0]];
          return any;
        },
      });
    }
    draw();
    persist();
    if (SEJ.testMode) SEJ.classDebug = { state: s, dispatch, getPlan: () => plan };

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      clearInterval(clock);
      removeEventListener('keydown', onKey);
      removeEventListener('pointerdown', soundReady);
      removeEventListener('keydown', soundReady);
      if (link) link.stop();
      wake();
      voice.stop();
      clearTimeout(toolsTimer);
      SEJ.$$('.cl-splash,.cl-pick').forEach((x) => x.remove());
    };
  };
})();
