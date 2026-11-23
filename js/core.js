/* Core services: DOM helper, saved progress, sound, voice, microphone, effects and drag support. */
(function () {
  'use strict';
  const SEJ = (window.SEJ = window.SEJ || {});

  /* ---------- small helpers ---------- */
  SEJ.$ = (s, r = document) => r.querySelector(s);
  SEJ.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  SEJ.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.entries(v).forEach(([p, x]) => { if (p.startsWith('--')) el.style.setProperty(p, x); else el.style[p] = x; });
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };
  SEJ.shuffle = (list) => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  SEJ.pick = (list) => list[Math.floor(Math.random() * list.length)];
  SEJ.clean = (text) => String(text).replace(/\p{Extended_Pictographic}|️|‍|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[0-9]️?⃣/gu, '').trim();
  SEJ.reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  SEJ.testMode = /[?&]test=1/.test(location.search);

  /* ---------- saved progress and teacher edits ---------- */
  const KEY = 'sej-hero-quest-v1';
  const blank = () => ({ name: '', hero: ['mathman', 'bhasha', 'knight', 'innovara'][Math.floor(Math.random() * 4)], sound: true, music: true, stars: {}, custom: {} });
  let state = blank();
  try {
    state = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch (e) { /* private window: progress lasts for this visit only */ }
  SEJ.store = {
    get state() { return state; },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
    },
    starsFor(code, slot) { return state.stars[code + ':' + slot] || 0; },
    setStars(code, slot, n) {
      const k = code + ':' + slot;
      state.stars[k] = Math.max(state.stars[k] || 0, n);
      this.save();
    },
    totalStars() { return Object.values(state.stars).reduce((a, b) => a + b, 0); },
    reset() {
      const { custom } = state;
      state = Object.assign(blank(), { custom });
      this.save();
    },
  };

  /* The name the child types is used in every "My name is ..." sentence, so they say their own name. */
  SEJ.cleanName = (raw) => String(raw || '').replace(/[^\p{L}\p{M}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14)
    .replace(/(^|[ -])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  SEJ.setName = (raw) => { state.name = SEJ.cleanName(raw); SEJ.store.save(); return state.name; };
  const SAMPLE_NAME = /\bRobin\b/g;
  const swapName = (v, name) => (typeof v === 'string' ? v.replace(SAMPLE_NAME, name)
    : Array.isArray(v) ? v.map((x) => swapName(x, name))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swapName(x, name)])) : v);

  /* Built-in lessons + js/custom-content.js + this browser's edits, exactly as stored (used by the builder). */
  /* A lesson with the admin's changes: which games are on the map, in what order, edited or created. */
  SEJ.buildLesson = function (l, o) {
    /* Every game carries an id that stays the same when games are reordered: d0, d1, d2 for the defaults. */
    const tag = (g, id) => Object.assign({}, g, { id });
    const defaults = l.games.map((g, i) => tag(g, `d${i}`));
    if (!o) return Object.assign({}, l, { games: defaults });
    const out = Object.assign({}, l, o);
    if (Array.isArray(o.map)) {
      const created = o.created || [], edits = o.edits || {};
      out.games = o.map.map((id) => { const g = id[0] === 'd' ? edits[id] || l.games[Number(id.slice(1))] : created.find((x) => x.id === id); return g && tag(g, id); }).filter(Boolean);
      if (!out.games.length) out.games = defaults;
    } else if (Array.isArray(o.games)) out.games = o.games.map((g, i) => tag(g, g.id || `n${i}`));
    else out.games = defaults;
    delete out.map; delete out.created; delete out.edits;
    return out;
  };
  /* Who sees the batch games? Students inside a batch, and Class Battle. The plain site address shows its own
     set (the default games unless the admin changed them), and nothing played there reaches a leaderboard. */
  SEJ.usesAdminGames = () => !!(SEJ.batch && SEJ.batch.on) || /^#\/?(class|remote|join)\b/.test(location.hash);
  /* The admin keeps two sets of games: one for batches, one for the plain site address ("base:" keys).
     While logged in, the admin sees whichever set they are editing. */
  SEJ.adminScope = () => { try { return sessionStorage.getItem('sej-admin-scope') === 'base' ? 'base' : 'batch'; } catch (e) { return 'batch'; } };
  SEJ.gameScope = () => (SEJ.isAdmin() && !/^#\/?(class|remote|join)\b/.test(location.hash) ? SEJ.adminScope() : SEJ.usesAdminGames() ? 'batch' : 'base');
  SEJ.lessonsRaw = function () {
    const pre = SEJ.gameScope() === 'base' ? 'base:' : '';
    const published = window.SEJ_CUSTOM || {};
    return window.SEJ_LESSONS.map((l) => SEJ.buildLesson(l, state.custom[pre + l.code] || published[pre + l.code]));
  };
  /* Shared admin content from the server. Pages wait for it briefly, then carry on without it. */
  SEJ.sharedInfo = { shared: false };
  /* One try at reading the shared games. Resolves true when the server answered properly.
     unreachable = the server didn't answer (slow start, no internet); it is not the same as "no database set up". */
  const fetchShared = (ms) => {
    const ctrl = window.AbortController ? new AbortController() : null;
    const stop = setTimeout(() => ctrl && ctrl.abort(), ms);
    return fetch('api/content', { cache: 'no-store', signal: ctrl && ctrl.signal })
      .then((r) => r.json().catch(() => null))
      .then((res) => {
        if (!res) throw new Error('empty');
        SEJ.sharedInfo = { shared: !!res.shared && !res.error, at: res.at || 0, error: res.error || '', unreachable: !!res.error && res.error !== 'sheet not shared' };
        if (res.content && typeof res.content === 'object') window.SEJ_CUSTOM = res.content;
        return !SEJ.sharedInfo.unreachable;
      })
      .catch(() => { SEJ.sharedInfo = Object.assign({}, SEJ.sharedInfo, { shared: false, unreachable: true }); return false; })
      .then((ok) => { clearTimeout(stop); return ok; });
  };
  /* Students: wait up to 3 seconds, then carry on, and keep trying in the background. When the games arrive the
     map or lesson page redraws, so a slow start never leaves a student on stale games. */
  SEJ.loadShared = function () {
    if (!/^https?:$/.test(location.protocol)) return Promise.resolve();
    const retry = (n) => { if (n > 5) return; setTimeout(() => fetchShared(20000).then((ok) => { if (ok) window.dispatchEvent(new Event('sej-shared')); else retry(n + 1); }), 1200 * n); };
    return fetchShared(3000).then((ok) => { if (!ok) retry(1); });
  };
  /* The admin: wait properly (a cold start can take several seconds) so an edit is never built from stale games. */
  SEJ.connectShared = async function () {
    for (let n = 0; n < 3 && !SEJ.sharedInfo.shared; n++) {
      if (await fetchShared(20000) || (SEJ.sharedInfo.error === 'sheet not shared')) break;
      await new Promise((r) => setTimeout(r, 800));
    }
    return SEJ.sharedInfo.shared;
  };
  SEJ.lessonRaw = (code) => SEJ.lessonsRaw().find((l) => l.code === code);
  /* The same lessons with the child's own name filled in (used for playing). */
  SEJ.lessons = function () {
    const raw = SEJ.lessonsRaw();
    return state.name ? raw.map((l) => swapName(l, state.name)) : raw;
  };
  SEJ.lesson = (code) => SEJ.lessons().find((l) => l.code === code);
  /* Site-wide switches from the admin panel (the "settings" row next to the lessons). A change saved on this
     device only (no shared sheet) sits on top of the shared one. */
  SEJ.setting = (name, fallback) => {
    const all = Object.assign({}, (window.SEJ_CUSTOM || {}).settings, (state.custom || {}).settings);
    return name in all ? all[name] : fallback;
  };
  /* Class Battle shows on the lesson pages unless the admin turned it off. */
  SEJ.classBattleOn = () => SEJ.setting('classBattle', true) !== false;

  /* ---------- sound (everything is synthesised, so no audio files are needed) ----------
     Made to be gentle for children: soft music-box, kalimba and marimba voices on a pentatonic scale
     (any notes sound nice together), a warm filter that takes the edge off, a little room echo, and a
     limiter so nothing is ever sudden or loud. No buzzers, no harsh noise. */
  let ctx = null, master = null, musicGain = null, musicTimer = null, sfxBus = null, forceOn = false;
  function roomEcho(c) {
    /* A short, soft room: a decaying cloud of filtered noise used as an impulse response. */
    const len = Math.floor(c.sampleRate * 1.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) { last = last * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = last * Math.pow(1 - i / len, 3.2); }
    }
    const conv = c.createConvolver();
    conv.buffer = ir;
    return conv;
  }
  function buildGraph(c) {
    master = c.createGain();
    master.gain.value = 0.9;
    const limit = c.createDynamicsCompressor();
    limit.threshold.value = -16; limit.knee.value = 12; limit.ratio.value = 6; limit.attack.value = 0.004; limit.release.value = 0.25;
    master.connect(limit).connect(c.destination);
    musicGain = c.createGain();
    musicGain.gain.value = 0.42;
    musicGain.connect(master);
    /* Effects pass through a warm filter, with a little echo mixed in. */
    sfxBus = c.createGain();
    const warm = c.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 5200; warm.Q.value = 0.5;
    sfxBus.connect(warm).connect(master);
    const send = c.createGain(), echo = roomEcho(c), back = c.createGain();
    send.gain.value = 0.22; back.gain.value = 0.55;
    warm.connect(send).connect(echo).connect(back).connect(master);
  }
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      buildGraph(ctx);
    }
    if (ctx.state === 'suspended' && ctx.resume && !(window.OfflineAudioContext && ctx instanceof window.OfflineAudioContext)) ctx.resume().catch(() => {});
    return ctx;
  }
  /* One note with a quick soft attack and a long natural fade, like a struck bar or bell.
     parts: [overtone ratio, loudness, how fast it fades] layered on the main note. */
  function note(freq, start, { vol = 0.1, dur = 0.6, parts = [], attack = 0.008, to = null, dest = null, type = 'sine' } = {}) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + start;
    [[1, 1, 1], ...parts].forEach(([ratio, loud, fade]) => {
      const o = c.createOscillator(), g = c.createGain(), d = dur * fade;
      o.type = type;
      o.frequency.setValueAtTime(freq * ratio, t);
      g.gain.value = 0;
      if (to) o.frequency.exponentialRampToValueAtTime(to * ratio, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * loud, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(dest || sfxBus);
      o.start(t);
      o.stop(t + d + 0.03);
    });
  }
  const musicBox = (f, t, vol = 0.1, dur = 0.9) => note(f, t, { vol, dur, parts: [[2, 0.28, 0.55], [3, 0.07, 0.3], [4.2, 0.03, 0.18]] });
  const kalimba = (f, t, vol = 0.1, dur = 0.7) => note(f, t, { vol, dur, attack: 0.004, parts: [[2.01, 0.18, 0.4], [5.4, 0.04, 0.12]] });
  const marimba = (f, t, vol = 0.1, dur = 0.35) => note(f, t, { vol, dur, attack: 0.005, parts: [[3.99, 0.1, 0.25]] });
  /* Soft air, for a gentle swish. */
  function air(start, dur, vol = 0.03, cutoff = 1300) {
    const c = audio();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + start;
    src.buffer = buf;
    f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff * 0.5, t); f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5); f.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(sfxBus);
    src.start(t);
  }
  /* A short burst of soft noise (for shakers, drum rolls and swishes). One buffer is made once and reused. */
  let noiseBuf = null;
  function noise(start, dur, { vol = 0.03, type = 'bandpass', freq = 2000, q = 0.8, dest = null } = {}) {
    const c = audio();
    if (!c) return;
    if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + Math.max(0, start), src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.006, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest || sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
  /* A bright toy xylophone bar. */
  const xylo = (f, t, vol = 0.1, dur = 0.5, dest = null) => note(f, t, { vol, dur, attack: 0.003, dest, parts: [[3.98, 0.22, 0.18], [9.9, 0.05, 0.06]] });
  /* A cartoon slide whistle: one smooth glide, with a little wobble. */
  function slide(from, to, start, dur, vol = 0.05) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), wob = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    lfo.frequency.value = 7; wob.gain.value = from * 0.012;
    lfo.connect(wob).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    o.connect(g).connect(sfxBus);
    o.start(t); lfo.start(t);
    o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  /* A springy cartoon "boing". */
  function spring(start = 0, vol = 0.07) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), wob = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.4);
    lfo.frequency.setValueAtTime(16, t); lfo.frequency.linearRampToValueAtTime(9, t + 0.4);
    wob.gain.setValueAtTime(45, t); wob.gain.exponentialRampToValueAtTime(4, t + 0.4);
    lfo.connect(wob).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(sfxBus);
    o.start(t); lfo.start(t);
    o.stop(t + 0.46); lfo.stop(t + 0.46);
  }
  /* A soft toy horn (for the "ta-da"). */
  const horn = (f, t, vol = 0.06, dur = 0.3) => note(f, t, { vol, dur, attack: 0.02, type: 'triangle', parts: [[2, 0.35, 0.8], [3, 0.12, 0.6]] });
  /* C major pentatonic: C D E G A, over three octaves. */
  const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  const P = (i) => PENTA[Math.max(0, Math.min(PENTA.length - 1, i))];
  const on = () => forceOn || state.sound !== false;
  /* Playful, cartoon-style effects for children: xylophones, bubble pops, slide whistles and springs.
     Every sound is short, bright and friendly. Nothing harsh, nothing that scolds. */
  SEJ.sfx = {
    /* A little wood-block "tok". */
    tap() { if (on()) { note(1250, 0, { vol: 0.2, dur: 0.07, to: 900, attack: 0.002 }); xylo(P(10), 0, 0.08, 0.12); } },
    /* Picking up a card or word: a bubbly "bloop". */
    select() { if (on()) note(480, 0, { vol: 0.26, dur: 0.11, to: 980, attack: 0.004 }); },
    /* Each letter or word placed climbs one step up the xylophone. */
    tick(step = 0) { if (on()) xylo(P(6 + Math.min(step, 8)), 0, 0.2, 0.35); },
    /* A right answer: a quick happy "ding-ding-DING!" that climbs higher with each answer in a row. */
    correct(combo = 0) {
      if (!on()) return;
      const b = 5 + Math.min(combo, 4);
      [0, 2, 4].forEach((n, i) => xylo(P(b + n), i * 0.07, 0.1, i === 2 ? 0.8 : 0.3));
      musicBox(P(b + 5), 0.2, 0.04, 0.9);
    },
    /* Try again: a friendly cartoon "uh-oh", two soft bouncy notes going down. Never a buzzer. */
    wrong() {
      if (!on()) return;
      note(P(4), 0, { vol: 0.08, dur: 0.2, to: P(4) * 0.96, attack: 0.01, type: 'triangle' });
      note(P(2), 0.19, { vol: 0.08, dur: 0.34, to: P(2) * 0.92, attack: 0.01, type: 'triangle' });
    },
    /* A twinkle after a right answer. */
    sparkle() { if (on()) { musicBox(P(13), 0.24, 0.03, 0.6); musicBox(P(14), 0.31, 0.025, 0.7); } },
    /* Points landing: a bright two-note "bling". */
    coin() { if (on()) { xylo(1318.5, 0.4, 0.04, 0.12); xylo(1760, 0.47, 0.05, 0.5); } },
    /* Three in a row: a slide whistle up and a run up the xylophone. */
    streak() { if (on()) { slide(420, 1250, 0, 0.32, 0.04); [5, 6, 7, 8, 9, 10].forEach((n, i) => xylo(P(n), 0.18 + i * 0.05, 0.06, 0.4)); } },
    /* Before the stars: a soft toy drum roll that grows. */
    drumroll(seconds = 0.5) {
      if (!on()) return;
      const n = Math.max(4, Math.round(seconds / 0.045));
      for (let i = 0; i < n; i++) noise(i * (seconds / n), 0.05, { vol: 0.04 + (i / n) * 0.08, freq: 1800, q: 0.7 });
    },
    /* A bubble popping. */
    pop() { if (on()) note(340, 0, { vol: 0.26, dur: 0.07, to: 1250, attack: 0.002 }); },
    /* A quick swish with a tiny slide whistle. */
    whoosh() { if (on()) { air(0, 0.32, 0.06, 1800); slide(600, 1100, 0.02, 0.2, 0.05); } },
    /* Each star on the results screen rings a little higher, with a sparkle on top. */
    star(i = 0) { if (on()) { xylo(P(9 + i * 2), 0, 0.1, 0.7); musicBox(P(11 + i * 2), 0.06, 0.05, 1.1); } },
    /* A happy shower of chimes and bubbly pops. */
    applause(seconds = 2.2) {
      if (!on()) return;
      const n = Math.round(seconds * 7);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * seconds + Math.random() * 0.08, fade = 1 - (t / seconds) * 0.6;
        if (i % 3 === 0) note(380 + Math.random() * 300, t, { vol: 0.04 * fade, dur: 0.07, to: 1300, attack: 0.002 });
        else musicBox(P(8 + Math.floor(Math.random() * 7)), t, 0.04 * fade, 0.8);
      }
    },
    /* Bumping into a wall, or a pair that doesn't match: a springy cartoon "boing". */
    boing() { if (on()) spring(0, 0.2); },
    /* "Wow!": a slide whistle up, then a sparkly chord. */
    wow() { if (on()) { slide(350, 1050, 0, 0.36, 0.045); [5, 7, 9, 10, 12].forEach((n, i) => xylo(P(n), 0.3 + i * 0.05, 0.06, 0.6)); [7, 9, 10].forEach((n) => musicBox(P(n), 0.56, 0.05, 1.3)); } },
    /* "Yay!": a quick run up the xylophone and a bright chord. */
    cheer() { if (on()) { [5, 6, 7, 8, 9].forEach((n, i) => xylo(P(n), i * 0.045, 0.06, 0.35)); [7, 9, 10].forEach((n) => musicBox(P(n), 0.25, 0.05, 1.2)); } },
    /* The "ta-da!": a little toy-horn tune with the xylophone doubling it. */
    fanfare() {
      if (!on()) return;
      [[3, 0, 0.14], [5, 0.14, 0.14], [7, 0.28, 0.14], [10, 0.44, 1]].forEach(([n, t, d]) => { horn(P(n), t, 0.055, d + 0.12); xylo(P(n), t, 0.07, d + 0.3); });
      note(P(0) / 2, 0.44, { vol: 0.08, dur: 1, parts: [[2, 0.3, 0.6]] });
      [12, 14].forEach((n, i) => musicBox(P(n), 0.6 + i * 0.08, 0.035, 0.9));
    },
  };
  /* Renders one effect to sound data without playing it (used by the test that checks the sounds). */
  SEJ.sfxRender = async function (name, args = [], seconds = 2.5) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const keep = { ctx, master, musicGain, sfxBus };
    const off = new OAC(2, Math.ceil(44100 * seconds), 44100);
    ctx = off; buildGraph(off); forceOn = true;
    try { SEJ.sfx[name](...args); } finally { forceOn = false; ({ ctx, master, musicGain, sfxBus } = keep); }
    const buf = await off.startRendering();
    return [buf.getChannelData(0), buf.getChannelData(1)];
  };

  /* ---------- background music ----------
     Real little songs, made live in the browser: a bouncy bass, ukulele-style chords, a toy xylophone
     tune and soft toy drums. Each scene gets its own song (a bouncy one on the map, a calypso by the
     sea, a music box in space, a party one on the stage). The tune plays, then rests for a round so it
     never nags, and the music dips while a voice is talking. Kept soft under the game sounds. */
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  /* Chords as MIDI notes (around middle C), with the bass note for each. */
  const CH = {
    C: [[60, 64, 67], 48], F: [[60, 65, 69], 41], G: [[59, 62, 67], 43], Am: [[60, 64, 69], 45], Dm: [[62, 65, 69], 50], Em: [[59, 64, 67], 52],
  };
  /* Tunes: one row per bar, each note is [start in eighths, MIDI note, length in eighths]. */
  const TUNES = {
    bouncy: [
      [[0, 72, 1], [1, 76, 1], [2, 79, 2], [4, 76, 1], [5, 79, 1], [6, 81, 2]],
      [[0, 79, 2], [2, 76, 1], [3, 74, 1], [4, 71, 2], [6, 74, 2]],
      [[0, 72, 1], [1, 76, 1], [2, 81, 2], [4, 79, 1], [5, 76, 1], [6, 72, 2]],
      [[0, 77, 2], [2, 76, 1], [3, 74, 1], [4, 72, 4]],
      [[0, 79, 1], [1, 79, 1], [2, 81, 1], [3, 79, 1], [4, 76, 2], [6, 72, 2]],
      [[0, 77, 1], [1, 77, 1], [2, 81, 1], [3, 77, 1], [4, 76, 2], [6, 72, 2]],
      [[0, 74, 1], [1, 76, 1], [2, 79, 2], [4, 83, 1], [5, 81, 1], [6, 79, 2]],
      [[0, 84, 3], [3, 79, 1], [4, 72, 4]],
    ],
    calypso: [
      [[0, 72, 1], [1, 76, 1], [2, 79, 1], [3, 76, 1], [4, 72, 1], [5, 76, 1], [6, 79, 2]],
      [[0, 81, 1], [1, 77, 1], [2, 81, 1], [3, 84, 2], [5, 81, 1], [6, 77, 2]],
      [[0, 79, 1], [1, 74, 1], [2, 79, 1], [3, 83, 2], [5, 79, 1], [6, 74, 2]],
      [[0, 76, 2], [2, 79, 2], [4, 72, 4]],
      [[0, 72, 1], [1, 76, 1], [2, 79, 1], [3, 76, 1], [4, 72, 1], [5, 76, 1], [6, 79, 2]],
      [[0, 81, 1], [1, 77, 1], [2, 81, 1], [3, 84, 2], [5, 81, 1], [6, 77, 2]],
      [[0, 79, 1], [1, 74, 1], [2, 79, 1], [3, 83, 2], [5, 79, 1], [6, 74, 2]],
      [[0, 84, 2], [2, 79, 1], [3, 76, 1], [4, 72, 4]],
    ],
    lullaby: [
      [[0, 79, 2], [2, 84, 2], [4, 83, 2], [6, 79, 2]],
      [[0, 81, 4], [4, 76, 4]],
      [[0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2]],
      [[0, 79, 6], [6, 74, 2]],
      [[0, 76, 2], [2, 79, 2], [4, 84, 4]],
      [[0, 81, 2], [2, 79, 2], [4, 76, 4]],
      [[0, 77, 2], [2, 76, 2], [4, 74, 4]],
      [[0, 74, 4], [4, 79, 4]],
    ],
  };
  /* The songs. swing pushes the off-beats late for a happy bounce; drums: 'pop', 'soft' or none. */
  const SONGS = {
    bouncy: { bpm: 112, swing: 0.3, key: 0, chords: ['C', 'G', 'Am', 'F', 'C', 'F', 'G', 'C'], tune: 'bouncy', lead: 'xylo', comp: 'uke', drums: 'pop' },
    meadow: { bpm: 104, swing: 0.32, key: 5, chords: ['C', 'G', 'Am', 'F', 'C', 'F', 'G', 'C'], tune: 'bouncy', lead: 'marimba', comp: 'uke', drums: 'soft', bits: 'birds' },
    calypso: { bpm: 108, swing: 0.18, key: 0, chords: ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'C'], tune: 'calypso', lead: 'steel', comp: 'uke', drums: 'pop', bits: 'bubbles' },
    stars: { bpm: 80, swing: 0, key: 0, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], tune: 'lullaby', lead: 'box', comp: 'arp', drums: '', bits: 'twinkle' },
    party: { bpm: 122, swing: 0.25, key: 2, chords: ['C', 'G', 'Am', 'F', 'C', 'F', 'G', 'C'], tune: 'bouncy', lead: 'xylo', comp: 'uke', drums: 'pop' },
  };
  const SONG_FOR = {
    map: 'bouncy', hills: 'meadow', garden: 'meadow', jungle: 'meadow', ocean: 'calypso', beach: 'calypso',
    space: 'stars', magic: 'stars', sky: 'stars', stage: 'party', candy: 'party', party: 'party', fiesta: 'calypso',
  };
  let theme = 'map', play = null;
  /* Each song has its own volume knob, so one song can fade out while the next fades in. */
  function inst(kind, m, t, vol, dur, out) {
    const f = mtof(m), at = t - ctx.currentTime;
    if (kind === 'xylo') return xylo(f, at, vol, dur, out);
    if (kind === 'marimba') return note(f, at, { vol, dur: Math.min(dur, 0.6), attack: 0.004, dest: out, parts: [[3.99, 0.12, 0.25]] });
    if (kind === 'steel') return note(f, at, { vol, dur: Math.max(dur, 0.45), attack: 0.006, dest: out, parts: [[2.0, 0.35, 0.5], [3.01, 0.12, 0.3], [4.2, 0.05, 0.2]] });
    if (kind === 'box') return note(f, at, { vol, dur: Math.max(dur, 1.1), dest: out, parts: [[2, 0.28, 0.55], [3, 0.07, 0.3], [4.2, 0.03, 0.18]] });
    if (kind === 'uke') return note(f, at, { vol, dur, attack: 0.004, type: 'triangle', dest: out, parts: [[2, 0.25, 0.4]] });
    if (kind === 'bass') return note(f, at, { vol, dur, attack: 0.006, dest: out, parts: [[2, 0.18, 0.5]], to: f * 0.995 });
  }
  function drumKick(t, vol, out) { note(130, t - ctx.currentTime, { vol, dur: 0.16, to: 48, attack: 0.003, dest: out }); }
  const BITS = {
    /* A few bubbles rising. */
    bubbles(t, out) { for (let i = 0; i < 3; i++) { const f = 300 + Math.random() * 400; note(f, t - ctx.currentTime + i * 0.13, { vol: 0.025, dur: 0.12, to: f * 2.2, attack: 0.004, dest: out }); } },
    /* A little bird. */
    birds(t, out) { const f = 2000 + Math.random() * 700; for (let i = 0; i < 3; i++) note(f * (1 + (i % 2) * 0.14), t - ctx.currentTime + i * 0.12, { vol: 0.014, dur: 0.09, to: f * 1.25, attack: 0.01, dest: out }); },
    /* A star twinkling. */
    twinkle(t, out) { const f = mtof([84, 88, 91, 96][Math.floor(Math.random() * 4)]); note(f, t - ctx.currentTime, { vol: 0.018, dur: 1.4, dest: out, parts: [[2, 0.2, 0.5]] }); },
  };
  /* Plays one sixteenth-note step of the song at time t. */
  function playStep(p, step, t) {
    const s = p.song, k = s.key, out = p.out, bar = Math.floor(step / 16) % 8, pass = Math.floor(step / 128) % 2, i = step % 16;
    const [chord, root] = CH[s.chords[bar]];
    const sixteenth = 60 / s.bpm / 4, eighth = sixteenth * 2;
    /* Bass: a bouncy "boom ... bop" on the beats. */
    if (s.comp === 'arp') { if (i === 0) inst('bass', root + k, t, 0.07, 2.2, out); }
    else if (i === 0 || i === 8) inst('bass', root + k + (i === 8 ? 7 : 0), t, 0.085, eighth * 1.6, out);
    else if (i === 14 && bar % 2 === 1) inst('bass', root + k + 12, t, 0.05, eighth * 0.8, out);
    /* Chords: a strummed "chk" on the off-beats, or a gentle music-box ripple for the slow song. */
    if (s.comp === 'uke' && i % 4 === 2) chord.forEach((m, n) => inst('uke', m + k, t + n * 0.012, 0.026, eighth * 1.1, out));
    if (s.comp === 'arp' && i % 2 === 0) inst('box', chord[(i / 2) % 3] + k + (i >= 8 ? 12 : 0), t, 0.022, 1.2, out);
    /* Soft toy drums. */
    if (s.drums) {
      if (i === 0 || (s.drums === 'pop' && i === 10)) drumKick(t, s.drums === 'pop' ? 0.09 : 0.06, out);
      if (i === 4 || i === 12) noise(t - ctx.currentTime, 0.08, { vol: s.drums === 'pop' ? 0.028 : 0.016, freq: 1700, q: 1.1, dest: out });
      if (i % 2 === 0) noise(t - ctx.currentTime, 0.035, { vol: i % 4 === 2 ? 0.011 : 0.006, type: 'highpass', freq: 7000, q: 0.5, dest: out });
    }
    /* The tune: on the first time round; the second time round it rests and the band just plays. */
    if (pass === 0 && i % 2 === 0) {
      const tune = TUNES[s.tune][bar];
      tune.forEach(([at, m, len]) => { if (at === i / 2) inst(s.lead, m + k, t, ({ box: 0.06, steel: 0.05, marimba: 0.075 })[s.lead] || 0.07, len * eighth, out); });
    }
    /* Little scene sounds now and then. */
    if (s.bits && i === 6 && Math.random() < 0.3) BITS[s.bits](t, out);
  }
  function schedule() {
    if (!play || !ctx) return;
    const s = play.song, sixteenth = 60 / s.bpm / 4, ahead = ctx.currentTime + 0.3;
    /* A hidden tab pauses the song (timers there are slow), and it carries on smoothly when it's back. */
    if (document.hidden || ctx.state !== 'running') { play.next = Math.max(play.next, ctx.currentTime + 0.1); return; }
    if (play.next < ctx.currentTime - 0.2) play.next = ctx.currentTime + 0.05;
    while (play.next < ahead) {
      const swing = play.step % 4 === 2 ? s.swing * sixteenth : 0;
      playStep(play, play.step, play.next + swing);
      play.next += sixteenth;
      play.step++;
    }
  }
  function fadeOut(p) {
    if (!p) return;
    try { p.out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25); setTimeout(() => p.out.disconnect(), 1800); } catch (e) { /* already gone */ }
  }
  SEJ.music = {
    start() {
      if (play || SEJ.noMusic || state.music === false || state.sound === false || SEJ.testMode) return;
      const c = audio();
      if (!c) return;
      const name = SONG_FOR[theme] || 'bouncy', out = c.createGain();
      out.gain.setValueAtTime(0.0001, c.currentTime);
      out.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
      out.connect(musicGain);
      play = { name, song: SONGS[name], out, step: 0, next: c.currentTime + 0.12 };
      schedule();
      musicTimer = setInterval(schedule, 80);
    },
    stop() { clearInterval(musicTimer); musicTimer = null; fadeOut(play); play = null; },
    /* Called when the scene changes. A new song only starts if the scene's song is different. */
    setTheme(name) {
      theme = SONG_FOR[name] ? name : 'map';
      if (play && play.name !== (SONG_FOR[theme] || 'bouncy')) { this.stop(); this.start(); }
    },
    get theme() { return theme; },
    get song() { return play ? play.name : ''; },
    duck(down) { if (musicGain && ctx) musicGain.gain.setTargetAtTime(down ? 0.1 : 0.42, ctx.currentTime, 0.1); },
    sync() { if (state.music !== false && state.sound !== false) this.start(); else this.stop(); },
  };
  /* Renders a stretch of one song to sound data without playing it (used by the test that checks the music). */
  SEJ.musicRender = async function (name, seconds = 12, change = {}) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC || !SONGS[name]) return null;
    const keep = { ctx, master, musicGain, sfxBus };
    const off = new OAC(2, Math.ceil(44100 * seconds), 44100);
    ctx = off; buildGraph(off);
    try {
      const out = off.createGain(), p = { name, song: Object.assign({}, SONGS[name], change), out, step: 0 }, sixteenth = 60 / p.song.bpm / 4;
      out.connect(musicGain);
      for (let t = 0.05; t < seconds - 1; t += sixteenth, p.step++) playStep(p, p.step, t + (p.step % 4 === 2 ? p.song.swing * sixteenth : 0));
    } finally { ({ ctx, master, musicGain, sfxBus } = keep); }
    const buf = await off.startRendering();
    return [buf.getChannelData(0), buf.getChannelData(1)];
  };
  SEJ.musicSongs = () => Object.keys(SONGS);

  /* ---------- voice ----------
     Common lines play from recorded clips in assets/voice, so every device sounds the same.
     Anything else, such as a sentence with a child's name, uses the device's own voice. */
  const synth = window.speechSynthesis;
  let deviceVoice = null, pendingLine = '';
  const clips = new Set(window.SEJ_VOICE || []);
  const player = typeof Audio === 'function' ? new Audio() : null;
  if (player) player.preload = 'auto';
  const voiceKey = (line) => line.toLowerCase().replace(/\s+/g, ' ').trim();
  const clipId = (line) => {
    let x = 0x811c9dc5;
    const text = voiceKey(line);
    for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 0x01000193);
    return (x >>> 0).toString(16).padStart(8, '0');
  };
  const spokenLine = (text) => SEJ.clean(text).replace(/_{2,}/g, ' blank ').replace(/\s+/g, ' ').trim();
  SEJ.voiceLine = { spokenLine, clipId };
  function chooseVoice() {
    if (!synth) return;
    const vs = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
    const score = (v) => (/google|samantha|natural|premium|enhanced/i.test(v.name) ? 3 : 0) + (/en[-_](in|gb)/i.test(v.lang) ? 1 : 0) + (/en[-_]us/i.test(v.lang) ? 1 : 0);
    deviceVoice = vs.sort((a, b) => score(b) - score(a))[0] || null;
  }
  if (synth) {
    chooseVoice();
    if ('onvoiceschanged' in synth) synth.onvoiceschanged = chooseVoice;
  }
  let sayCount = 0;
  const speakOnDevice = (line, rate, pitch, done) => {
    if (!synth) return done();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(line);
    if (deviceVoice) u.voice = deviceVoice;
    u.lang = deviceVoice ? deviceVoice.lang : 'en-US';
    u.rate = rate; u.pitch = pitch;
    u.onend = done; u.onerror = done;
    synth.speak(u);
  };
  /* Whether this page can make sound yet. Browsers keep it silent until someone clicks the page. */
  SEJ.soundAllowed = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
  SEJ.voice = {
    available: !!synth || (!!player && clips.size > 0),
    /* Resolves when speech ends, or after a time limit so games never wait on a stuck voice. */
    say(text, { rate = 0.92, pitch = 1.08, max = 5000 } = {}) {
      return new Promise((resolve) => {
        const line = spokenLine(text);
        if (!on() || !line || SEJ.testMode) return resolve();
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
          /* Browsers block speech before the first tap. Say this line right after that tap. */
          pendingLine = line;
          return resolve();
        }
        const turn = ++sayCount;
        let finished = false;
        const done = () => { if (!finished) { finished = true; if (turn === sayCount) SEJ.music.duck(false); resolve(); } };
        SEJ.voice.quiet();
        SEJ.music.duck(true);
        const id = clipId(line);
        if (player && clips.has(id)) {
          player.onended = done;
          /* A missing or blocked clip falls back to the device voice. */
          player.onerror = () => { if (turn === sayCount) speakOnDevice(line, rate, pitch, done); };
          player.src = `assets/voice/${id}.mp3`;
          const started = player.play();
          if (started && started.catch) started.catch(() => { if (turn === sayCount && !finished) speakOnDevice(line, rate, pitch, done); });
        } else speakOnDevice(line, rate, pitch, done);
        setTimeout(done, Math.max(max, 6000));
      });
    },
    quiet() {
      if (player) { player.onended = null; player.onerror = null; player.pause(); }
      if (synth) synth.cancel();
    },
    stop() { pendingLine = ''; sayCount++; SEJ.voice.quiet(); SEJ.music.duck(false); },
    /* Fetches clips ahead of time so they start without a gap. */
    prepare(texts) {
      if (SEJ.testMode || SEJ.lite || (navigator.connection && navigator.connection.saveData)) return;
      const ids = Array.from(new Set(texts.filter(Boolean).map((t) => clipId(spokenLine(t))))).filter((id) => clips.has(id)).slice(0, 14);
      const fetchNext = () => {
        const id = ids.shift();
        if (!id) return;
        fetch(`assets/voice/${id}.mp3`, { priority: 'low' }).then((r) => r.blob()).catch(() => {}).then(fetchNext);
      };
      (window.requestIdleCallback || setTimeout)(fetchNext);
    },
    flushPending() {
      const line = pendingLine;
      pendingLine = '';
      if (line) setTimeout(() => { if (!SEJ.voice.speaking()) SEJ.voice.say(line); }, 60);
    },
    speaking() { return !!(synth && synth.speaking) || (!!player && !player.paused && !player.ended); },
  };

  /* ---------- microphone ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  SEJ.mic = {
    available: !!SR && !SEJ.testMode,
    listen() {
      return new Promise((resolve) => {
        const r = new SR();
        r.lang = 'en-IN';
        r.interimResults = false;
        r.maxAlternatives = 3;
        let heard = '', settled = false;
        const end = () => { if (!settled) { settled = true; SEJ.music.duck(false); resolve(heard); } };
        r.onresult = (e) => { heard = e.results[0][0].transcript; };
        r.onerror = end;
        r.onend = end;
        SEJ.voice.stop();
        SEJ.music.duck(true);
        try { r.start(); } catch (e) { end(); }
        setTimeout(() => { try { r.stop(); } catch (e) { /* already stopped */ } }, 9000);
      });
    },
    /* Share of the example's words the child said. Used for praise only and never blocks progress. */
    match(heard, target) {
      const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
      const t = words(target), h = new Set(words(heard));
      return t.length ? t.filter((w) => h.has(w)).length / t.length : 0;
    },
  };

  /* ---------- vibration ---------- */
  SEJ.buzz = (p) => { if (navigator.vibrate && on()) { try { navigator.vibrate(p); } catch (e) { /* unsupported */ } } };

  /* ---------- smooth mode ----------
     If a device can't keep up, the moving backgrounds and heavy shadows switch off and effects get smaller. */
  const LITE_KEY = 'sej-lite-v1';
  SEJ.lite = /[?&]lite=1/.test(location.search);
  try { if (localStorage.getItem(LITE_KEY) === '1') SEJ.lite = true; } catch (e) { /* storage blocked */ }
  const setLite = () => {
    SEJ.lite = true;
    document.documentElement.classList.add('lite');
    try { localStorage.setItem(LITE_KEY, '1'); } catch (e) { /* storage blocked */ }
  };
  if (SEJ.lite) document.documentElement.classList.add('lite');
  if (!SEJ.lite && !SEJ.testMode) {
    /* Watches real frame times for the first minute. Short hiccups, such as loading, don't count. */
    let last = 0, slow = 0, total = 0, windows = 0;
    const watch = (t) => {
      if (document.hidden) { last = 0; requestAnimationFrame(watch); return; }
      if (last) {
        const gap = t - last;
        if (gap < 400) { total++; if (gap > 34) slow++; }
        if (total >= 90) {
          if (slow / total > 0.5) { setLite(); return; }
          slow = 0; total = 0;
          if (++windows > 25) return;
        }
      }
      last = t;
      requestAnimationFrame(watch);
    };
    setTimeout(() => requestAnimationFrame(watch), 2500);
  }

  /* ---------- particles ---------- */
  let canvas, g2, parts = [], raf = 0, scale = 1;
  const COLORS = ['#ead56b', '#d8649c', '#3fb7cf', '#9bc950', '#cf843f', '#a27dde', '#ffffff'];
  function ensureCanvas() {
    if (canvas) return;
    canvas = SEJ.h('canvas', { class: 'fx-canvas', 'aria-hidden': 'true' });
    document.body.append(canvas);
    g2 = canvas.getContext('2d');
    const fit = () => {
      scale = Math.min(devicePixelRatio || 1, SEJ.lite ? 1 : 1.5);
      canvas.width = innerWidth * scale; canvas.height = innerHeight * scale;
    };
    addEventListener('resize', fit);
    fit();
  }
  /* Drawing an emoji is slow, so each one is drawn once and then reused. */
  const sprites = new Map();
  function sprite(emoji, size) {
    const s = Math.ceil(size / 6) * 6;
    const key = `${emoji}${s}`;
    let img = sprites.get(key);
    if (!img) {
      img = document.createElement('canvas');
      img.width = img.height = s * 2;
      const c = img.getContext('2d');
      c.font = `${s}px serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(emoji, s, s + s * 0.08);
      sprites.set(key, img);
    }
    return img;
  }
  const maxParts = () => (SEJ.lite ? 120 : 320);
  function frame() {
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    /* The oldest pieces go first when lots of celebrations overlap. */
    if (parts.length > maxParts()) parts = parts.slice(parts.length - maxParts());
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.spin += p.vs; p.life--;
      const cos = Math.cos(p.spin) * scale, sin = Math.sin(p.spin) * scale;
      g2.setTransform(cos, sin, -sin, cos, p.x * scale, p.y * scale);
      g2.globalAlpha = Math.min(1, p.life / 24);
      if (p.emoji) {
        const img = sprite(p.emoji, p.size);
        g2.drawImage(img, -p.size, -p.size, p.size * 2, p.size * 2);
      } else {
        g2.fillStyle = p.c;
        if (p.round) { g2.beginPath(); g2.arc(0, 0, p.size / 2, 0, 7); g2.fill(); }
        else g2.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.62);
      }
    }
    g2.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(frame) : 0;
    if (!parts.length) { g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, canvas.width, canvas.height); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  SEJ.fx = {
    /* Small burst from one spot, used for every correct answer. */
    burst(x, y, n = 16, emojis = null) {
      if (SEJ.reducedMotion()) return;
      ensureCanvas();
      if (SEJ.lite) n = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 2.5 + Math.random() * 6;
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, g: 0.16, drag: 0.985, life: 42 + Math.random() * 24,
          spin: Math.random() * 6, vs: (Math.random() - 0.5) * 0.3, size: emojis ? 18 + Math.random() * 10 : 6 + Math.random() * 7,
          c: SEJ.pick(COLORS), round: Math.random() < 0.4, emoji: emojis && i % 2 === 0 ? SEJ.pick(emojis) : null,
        });
      }
      kick();
    },
    burstAt(el, n, emojis) {
      if (!el || !el.getBoundingClientRect) return;
      const r = el.getBoundingClientRect();
      this.burst(r.left + r.width / 2, r.top + r.height / 2, n, emojis);
    },
    /* Falling confetti, used for wins. */
    confetti(amount = 140) {
      if (SEJ.reducedMotion()) return;
      ensureCanvas();
      amount = Math.min(amount, SEJ.lite ? 60 : 220);
      for (let i = 0; i < amount; i++) {
        parts.push({
          x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.7, vx: (Math.random() - 0.5) * 2.4, vy: 1.8 + Math.random() * 2.8,
          g: 0.015, drag: 0.999, life: 260 + Math.random() * 120, spin: Math.random() * 6, vs: (Math.random() - 0.5) * 0.22,
          size: 7 + Math.random() * 8, c: SEJ.pick(COLORS), round: Math.random() < 0.2,
        });
      }
      kick();
    },
    /* Fireworks across the sky for big wins. */
    fireworks(times = 6, gap = 260) {
      if (SEJ.reducedMotion()) return;
      if (SEJ.lite) times = Math.min(times, 2);
      for (let i = 0; i < times; i++) {
        setTimeout(() => this.burst(innerWidth * (0.12 + Math.random() * 0.76), innerHeight * (0.1 + Math.random() * 0.45), 34), i * gap * (SEJ.testMode ? 0.02 : 1));
      }
    },
    /* Stars fly from an answer up into the score. */
    flyStars(fromEl, toEl, n = 3) {
      if (!fromEl || !toEl || SEJ.reducedMotion() || SEJ.testMode) return;
      const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        const st = document.createElement('span');
        st.className = 'fly-star';
        st.textContent = '⭐';
        st.style.left = a.left + a.width / 2 - 16 + 'px';
        st.style.top = a.top + a.height / 2 - 16 + 'px';
        document.body.append(st);
        const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
        const anim = st.animate([
          { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx * 0.35 + (i - 1) * 50}px, ${dy * 0.35 - 60}px) scale(1.4) rotate(180deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px, ${dy}px) scale(.5) rotate(420deg)`, opacity: 0.8 },
        ], { duration: 620 + i * 90, easing: 'cubic-bezier(.4,0,.5,1)' });
        anim.onfinish = () => st.remove();
      }
    },
    /* Big comic-book word in the middle of the screen. */
    pow(text, kind = 'good') {
      document.querySelectorAll('.pow').forEach((p) => p.remove());
      const el = document.createElement('div');
      el.className = `pow pow-${kind}`;
      el.setAttribute('role', 'status');
      el.innerHTML = '<span class="pow-shape"></span><span class="pow-text"></span>';
      el.querySelector('.pow-text').textContent = text;
      document.body.append(el);
      setTimeout(() => el.remove(), SEJ.testMode ? 30 : kind === 'good' ? 780 : 900);
    },
    /* The player's hero zooms across the screen on a streak. */
    heroFly(heroId) {
      if (SEJ.reducedMotion() || SEJ.testMode) return;
      const el = document.createElement('div');
      el.className = 'hero-fly';
      el.innerHTML = `<span class="hero-trail"></span><img src="assets/heroes/${heroId}.webp" alt="">`;
      document.body.append(el);
      setTimeout(() => el.remove(), 1500);
    },
    /* Restarts a CSS animation class on an element. */
    play(el, cls) {
      if (!el) return;
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
      el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    },
  };

  /* ---------- tap OR drag ----------
     Every game piece works both ways: a tap calls onUse(null); a drag onto a matching
     target calls onUse(target). A real <button> keeps keyboard support. */
  SEJ.tapOrDrag = function (el, targetSelector, onUse) {
    let start = null, ghost = null, moved = false, hot = null;
    const targetAt = (x, y) => {
      if (ghost) ghost.style.visibility = 'hidden';
      const under = document.elementFromPoint(x, y);
      if (ghost) ghost.style.visibility = '';
      return under && under.closest(targetSelector);
    };
    const clearHot = () => { if (hot) hot.classList.remove('drop-hot'); hot = null; };
    const move = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) > 9) {
        moved = true;
        const r = el.getBoundingClientRect();
        ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.width = r.width + 'px';
        ghost.style.left = r.left + 'px';
        ghost.style.top = r.top + 'px';
        document.body.append(ghost);
        el.classList.add('dragging');
        SEJ.sfx.tap();
      }
      if (moved) {
        e.preventDefault();
        ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(-3deg) scale(1.06)`;
        const t = targetAt(e.clientX, e.clientY);
        if (t !== hot) { clearHot(); hot = t; if (hot) hot.classList.add('drop-hot'); }
      }
    };
    const up = (e) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
      if (moved) {
        const t = targetAt(e.clientX, e.clientY);
        ghost.remove(); ghost = null;
        el.classList.remove('dragging');
        clearHot();
        if (t) onUse(t);
        /* Swallow the click that follows the drag. */
        el.addEventListener('click', (ev) => { ev.stopImmediatePropagation(); ev.preventDefault(); }, { once: true, capture: true });
        setTimeout(() => { moved = false; }, 0);
      }
      start = null;
    };
    const cancel = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
      if (ghost) ghost.remove();
      ghost = null; start = null; moved = false;
      el.classList.remove('dragging');
      clearHot();
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      start = { x: e.clientX, y: e.clientY };
      moved = false;
      addEventListener('pointermove', move, { passive: false });
      addEventListener('pointerup', up);
      addEventListener('pointercancel', cancel);
    });
    el.addEventListener('click', () => onUse(null));
    el.classList.add('no-touch-scroll');
  };

  /* ---------- heroes ---------- */
  SEJ.HEROES = {
    mathman: { name: 'MathMan', color: '#cf843f', power: 'Master of math', bn: 'যেকোনো গাণিতিক সমস্যা সমাধান করতে পারে' },
    bhasha: { name: 'Ms Bhasha', color: '#d8649c', power: 'Speaks any language', bn: 'যেকোনো ভাষা বুঝতে পারে' },
    knight: { name: 'Nature Knight', color: '#3fb170', power: 'Talks to plants and animals', bn: 'গাছপালার সাথে কথা বলতে পারে' },
    innovara: { name: 'Innovara', color: '#3fa4cf', power: 'Controls any gadget', bn: 'যেকোনো গ্যাজেট কন্ট্রোল করতে পারে' },
  };
  const SHAPES = {
    circle: '<circle cx="50" cy="50" r="42"/>',
    triangle: '<path d="M50 8 L94 88 H6Z"/>',
    square: '<rect x="12" y="12" width="76" height="76" rx="6"/>',
    rectangle: '<rect x="4" y="24" width="92" height="52" rx="6"/>',
    oval: '<ellipse cx="50" cy="50" rx="46" ry="30"/>',
    trapezium: '<path d="M26 22 H74 L96 78 H4Z"/>',
  };
  /* An emoji or simple shape drawn with a white sticker edge. */
  /* A picture is a web link, or "img:ID" for one pasted into the game editor and kept in the Google Sheet. */
  SEJ.isAdmin = () => { try { return !!sessionStorage.getItem('sej-admin-pin'); } catch (e) { return false; } };
  SEJ.isPic = (x) => /^(https?:\/\/|img:[a-z0-9]{10}$)/.test(String(x || '').trim());
  SEJ.picSrc = (x) => { const s = String(x || '').trim(); return s.startsWith('img:') ? `api/image?id=${s.slice(4)}` : s; };
  SEJ.sticker = function (art, cls = '') {
    const el = SEJ.h('span', { class: 'sticker ' + cls, 'aria-hidden': 'true' });
    if (SEJ.isPic(art)) el.append(SEJ.h('img', { class: 'sticker-pic', src: SEJ.picSrc(art), alt: '', draggable: 'false' }));
    else if (String(art).startsWith('svg:')) el.innerHTML = `<svg viewBox="0 0 100 100" class="shape-svg">${SHAPES[art.slice(4)] || ''}</svg>`;
    else el.textContent = art;
    return el;
  };
  /* Tap sparkles are for the children's screens; the admin panel stays calm. */
  addEventListener('pointerdown', (e) => { if (e.isPrimary && !(e.target.closest && e.target.closest('.builder, .admin-login, .ho-overlay, .vd-overlay'))) SEJ.fx.burst(e.clientX, e.clientY, 5); }, { passive: true });
  addEventListener('pointerdown', () => SEJ.voice.flushPending(), { once: true });
  /* Picking any game piece gives a soft click, before the right or wrong sound. */
  const PIECES = '.game-screen button:not(.bar-btn):not(.speak-btn):not(:disabled), .cl-option, .cl-mu-word, .cl-rain-word, .cl-mem-card, .cl-tile, .st-option, .st-tile, .st-team-btn';
  addEventListener('pointerdown', (e) => { const el = e.target.closest && e.target.closest(PIECES); if (el && !el.disabled) { SEJ.sfx.select(); el.classList.add('is-picked'); setTimeout(() => el.classList.remove('is-picked'), 160); } }, { passive: true });
  SEJ.heroImg = (id, cls = '') => SEJ.h('img', { class: 'hero-img ' + cls, src: `assets/heroes/${id}.webp`, alt: SEJ.HEROES[id].name, draggable: 'false' });
  SEJ.heroFace = (id, cls = '') => SEJ.h('span', { class: 'face ' + cls, style: { background: SEJ.HEROES[id].color } },
    SEJ.h('img', { src: `assets/heroes/${id}-face.webp`, alt: '', draggable: 'false' }));
})();
