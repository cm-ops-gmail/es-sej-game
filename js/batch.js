/* Batches: a student opens their batch's link, enters a name and student ID, and plays.
   The teacher unlocks lessons for the batch. Each game's first score goes on the batch's leaderboard. */
(function () {
  'use strict';
  const { h, sfx, fx, store } = SEJ;
  const API = 'api/batch';
  const CODE = /^[A-HJKMNP-Z2-9]{6}$/;
  const post = (body) => fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => Object.assign({ status: r.status }, await r.json().catch(() => ({}))));
  const st = () => store.state.batch || null;

  SEJ.batch = {
    get on() { return !!(st() && st().code); },
    get joined() { return this.on && !!st().id; },
    get name() { return (st() && st().name) || ''; },
    get code() { return (st() && st().code) || ''; },
    /* Outside a batch every lesson is open. Inside one, only the lessons the teacher unlocked. */
    isOpen(lesson) { return !this.on || (st().open || []).includes(lesson); },
    isDone(lesson, game) { return this.on && (st().done || []).includes(`${lesson}:${game}`); },
    /* A batch link was opened: remember the batch, and ask who the student is if it's a new batch. */
    use(code) {
      const c = String(code || '').toUpperCase();
      if (!CODE.test(c)) return false;
      if (!st() || st().code !== c) { store.state.batch = { code: c, name: '', id: '', open: [], done: [] }; store.save(); }
      return true;
    },
    leave() { delete store.state.batch; store.save(); },
    /* Fetches the batch's name and unlocked lessons. Resolves true when something changed. */
    load() {
      if (!this.on || !/^https?:$/.test(location.protocol)) return Promise.resolve(false);
      return fetch(`${API}?code=${st().code}`, { cache: 'no-store' }).then(async (r) => {
        if (r.status === 404) { SEJ.batch.missing = true; return true; }
        if (!r.ok) return false;
        const j = await r.json();
        const before = JSON.stringify([st().name, st().open]);
        st().name = j.name; st().open = j.open || [];
        store.save();
        return before !== JSON.stringify([st().name, st().open]);
      }).catch(() => false);
    },
    async join(name, id) {
      const res = await post({ side: 'join', code: st().code, name, id });
      if (!res.ok) return res;
      Object.assign(st(), { id: String(id).toUpperCase(), name: res.batch.name, open: res.batch.open, done: res.done || [] });
      store.state.name = SEJ.cleanName(res.name || name);
      store.save();
      return res;
    },
    /* Sends a finished game's score. Only the first try at each game counts. */
    async submit(lesson, game, title, result) {
      if (!this.joined) return { skipped: true };
      const key = `${lesson}:${game}`;
      if (st().done.includes(key)) return { counted: false };
      const send = () => post({ side: 'score', code: st().code, id: st().id, name: store.state.name, hero: store.state.hero, lesson, game, title, score: result.score, stars: result.stars, time: result.time || 0 });
      let res = await send().catch(() => ({ status: 0 }));
      if (res.status === 0 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500)); res = await send().catch(() => ({ status: 0 })); }
      if (res.counted !== undefined) { st().done.push(key); store.save(); }
      return res;
    },
    board(code) { return fetch(`${API}?code=${code || st().code}&side=board`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null); },
    admin: (pin, body) => post(Object.assign({ pin }, body)),
  };

  /* ---------- "Who are you?" for a batch ---------- */
  SEJ.batchJoinPage = function (root, onDone) {
    const b = SEJ.batch;
    if (b.missing) {
      root.replaceChildren(h('div', { class: 'onb' }, SEJ.scene('magic'), h('div', { class: 'onb-inner' }, h('div', { class: 'onb-card' },
        h('p', { class: 'onb-q', text: 'This link isn’t active' }), h('p', { class: 'onb-q-bn', text: 'Ask your teacher for a new link.' }),
        h('button', { class: 'cta gummy g-green', onclick: () => { b.leave(); b.missing = false; location.hash = '#/map'; } }, 'Play without a batch')))));
      return;
    }
    const name = h('input', { class: 'onb-input', id: 'batch-name', maxlength: '14', placeholder: 'Your name', value: store.state.name || '', autocomplete: 'off', 'aria-label': 'Your name' });
    const sid = h('input', { class: 'onb-input', id: 'batch-id', maxlength: '20', placeholder: 'Your student ID', value: (st() && st().id) || '', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Your student ID' });
    const msg = h('p', { class: 'onb-msg', role: 'status' });
    const btn = h('button', { class: 'cta gummy g-green cta-big', type: 'submit' }, 'Start ▶');
    const form = h('form', { class: 'onb-card enter-pop', onsubmit: async (e) => {
      e.preventDefault();
      const n = SEJ.cleanName(name.value), id = sid.value.trim();
      if (!n) { fx.play(name, 'shake'); name.focus(); return; }
      if (!/^[A-Za-z0-9-]{1,20}$/.test(id)) { fx.play(sid, 'shake'); msg.textContent = 'Use the letters and numbers of your student ID.'; sid.focus(); return; }
      btn.disabled = true;
      msg.textContent = 'Joining…';
      const res = await b.join(n, id).catch(() => ({ status: 0 }));
      btn.disabled = false;
      if (!res.ok) { msg.textContent = res.status === 404 ? 'This link isn’t active. Ask your teacher.' : res.error === 'full' ? 'This batch is full. Ask your teacher.' : 'Couldn’t join. Check the internet and try again.'; sfx.wrong(); return; }
      sfx.fanfare();
      fx.confetti(60);
      onDone();
    } },
      b.name && h('p', { class: 'onb-step', text: b.name }),
      h('p', { class: 'onb-q', text: 'Who is playing?' }),
      h('p', { class: 'onb-q-bn', lang: 'bn', text: 'তোমার নাম ও আইডি লেখো' }),
      name, sid, msg, btn);
    root.replaceChildren(h('div', { class: 'onb' }, SEJ.scene('magic'), h('div', { class: 'onb-inner' },
      h('img', { class: 'onb-logo', src: 'assets/logo.webp', alt: 'Spoken English Junior' }),
      h('h1', { class: 'logo-word big onb-title' }, 'Hero Quest'),
      form)));
  };

  /* ---------- leaderboard ---------- */
  const MEDAL = ['🥇', '🥈', '🥉'];
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  SEJ.boardPage = function (root, viewCode) {
    const b = SEJ.batch;
    const code = viewCode && CODE.test(viewCode) ? viewCode : b.code;
    const mine = !viewCode || viewCode === b.code ? (st() && st().id) : '';
    let isAdmin = false;
    try { isAdmin = !!sessionStorage.getItem('sej-admin-pin'); } catch (e) { /* private mode */ }
    const back = viewCode && isAdmin ? '#/admin/batches' : '#/map';
    const title = h('p', { class: 'lb-batch', text: viewCode ? '' : b.name });
    const podium = h('div', { class: 'lb-podium' });
    const list = h('ol', { class: 'lb-list' });
    const note = h('p', { class: 'lb-note', role: 'status', text: 'Loading the leaderboard…' });
    root.replaceChildren(h('div', { class: 'lb-page' }, SEJ.scene('party'),
      h('div', { class: 'lb-inner' },
        h('a', { class: 'back-link', href: back }, viewCode && isAdmin ? '← Batches' : '← Quest map'),
        h('h1', { class: 'logo-word lb-title' }, '🏆 Leaderboard'), title, podium, list, note,
        h('p', { class: 'lb-rule', text: 'Your first try at each game counts. Fewer mistakes and less time give more points. On a tie, the faster player is ahead.' }))));
    if (!code) { note.textContent = 'Open your batch link to see a leaderboard.'; return () => {}; }
    const face = (r, cls) => (SEJ.HEROES[r.hero] ? SEJ.heroImg(r.hero, cls) : h('span', { class: `lb-initial ${cls}`, text: (r.name || '?')[0].toUpperCase() }));
    let first = true, alive = true;
    const paint = (data) => {
      if (!alive) return;
      if (!data) { note.textContent = 'Couldn’t load. Trying again…'; return; }
      title.textContent = data.name;
      const rows = data.rows;
      note.textContent = rows.length ? '' : 'No scores yet. Be the first!';
      const top = rows.slice(0, 3);
      /* Second, first, third: the winner stands in the middle. */
      podium.replaceChildren(...[1, 0, 2].filter((i) => top[i]).map((i) => {
        const r = top[i];
        return h('div', { class: `lb-step p${i + 1} ${r.id === mine ? 'me' : ''} ${first ? 'enter-pop' : ''}`, style: { '--i': i } },
          h('span', { class: 'lb-medal', text: MEDAL[i] }), face(r, 'lb-hero'),
          h('div', { class: 'lb-block' }, h('strong', { text: r.name }), h('b', { text: r.score }), h('small', { text: `⭐ ${r.stars} · ${r.games} ${r.games === 1 ? 'game' : 'games'}${r.time ? ` · ⏱ ${clock(r.time)}` : ''}` })));
      }));
      list.replaceChildren(...rows.slice(3).map((r) => h('li', { class: `lb-row ${r.id === mine ? 'me' : ''}` },
        h('span', { class: 'lb-rank', text: r.rank }), face(r, 'lb-face'), h('span', { class: 'lb-name', text: r.name }),
        h('span', { class: 'lb-stars', text: `⭐ ${r.stars}${r.time ? ` · ⏱ ${clock(r.time)}` : ''}` }), h('b', { class: 'lb-score', text: r.score }))));
      const me = rows.find((r) => r.id === mine);
      if (me && me.rank > 3) note.textContent = `You are number ${me.rank} of ${rows.length}. Keep going!`;
      if (first && rows.length) { fx.confetti(90); sfx.fanfare(); }
      first = false;
    };
    const tick = () => b.board(code).then(paint);
    tick();
    const timer = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(timer); };
  };
})();
