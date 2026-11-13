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
  SEJ.loadShared = function () {
    if (!/^https?:$/.test(location.protocol)) return Promise.resolve();
    const ctrl = window.AbortController ? new AbortController() : null;
    const stop = setTimeout(() => ctrl && ctrl.abort(), 3000);
    return fetch('api/content', { cache: 'no-store', signal: ctrl && ctrl.signal })
      .then((r) => r.json().catch(() => null))
      .then((res) => {
        if (!res) return;
        SEJ.sharedInfo = { shared: !!res.shared && !res.error, at: res.at || 0, error: res.error || '' };
        if (res.content && typeof res.content === 'object') window.SEJ_CUSTOM = res.content;
      })
      .catch(() => {})
      .then(() => clearTimeout(stop));
  };
  SEJ.lessonRaw = (code) => SEJ.lessonsRaw().find((l) => l.code === code);
  /* The same lessons with the child's own name filled in (used for playing). */
  SEJ.lessons = function () {
    const raw = SEJ.lessonsRaw();
    return state.name ? raw.map((l) => swapName(l, state.name)) : raw;
  };
  SEJ.lesson = (code) => SEJ.lessons().find((l) => l.code === code);

  /* ---------- sound (everything is synthesised, so no audio files are needed) ---------- */
  let ctx = null, master = null, musicGain = null, musicTimer = null;
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.5;
      musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, { type = 'triangle', vol = 0.22, to = null, dest = null } = {}) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(start, dur, { vol = 0.12, freq = 2500, q = 0.7 } = {}) {
    const c = audio();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + start;
    src.buffer = buf;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }
  const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568];
  const on = () => state.sound !== false;
  SEJ.sfx = {
    tap() { if (on()) tone(620, 0, 0.07, { vol: 0.12, to: 760 }); },
    select() { if (on()) { tone(880, 0, 0.05, { type: 'sine', vol: 0.1, to: 1180 }); tone(1320, 0.04, 0.05, { type: 'sine', vol: 0.05 }); } },
    tick(step = 0) { if (on()) tone(SCALE[Math.min(step, SCALE.length - 1)], 0, 0.14, { vol: 0.18 }); },
    correct(combo = 0) {
      if (!on()) return;
      const b = Math.min(combo, 4);
      [0, 2, 4].forEach((n, i) => tone(SCALE[n + b], i * 0.075, 0.2, { vol: 0.22 }));
      tone(SCALE[4 + b] * 2, 0.22, 0.28, { type: 'sine', vol: 0.12 });
    },
    /* A soft two-note "uh-oh": clear, but never harsh. */
    wrong() { if (on()) { tone(330, 0, 0.14, { type: 'sine', vol: 0.2, to: 300 }); tone(247, 0.15, 0.24, { type: 'sine', vol: 0.2, to: 220 }); } },
    /* A bell-like shimmer after a right answer. */
    sparkle() { if (on()) [0, 1, 2, 3].forEach((i) => tone(1568 + i * 262, 0.18 + i * 0.05, 0.22, { type: 'sine', vol: 0.07 })); },
    /* Points landing in the score. */
    coin() { if (on()) { tone(988, 0.5, 0.07, { type: 'square', vol: 0.06 }); tone(1319, 0.57, 0.22, { type: 'square', vol: 0.06 }); } },
    /* Three in a row: a rising run. */
    streak() { if (on()) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.2, { type: 'triangle', vol: 0.16 })); },
    /* A drum roll before the stars. */
    drumroll(seconds = 0.5) { if (on()) for (let t = 0; t < seconds; t += 0.045) noise(t, 0.04, { vol: 0.05 + t * 0.08, freq: 420, q: 1.4 }); },
    pop() { if (on()) { tone(900, 0, 0.09, { type: 'square', vol: 0.09, to: 240 }); noise(0, 0.07, { vol: 0.12, freq: 3200 }); } },
    whoosh() { if (on()) noise(0, 0.32, { vol: 0.09, freq: 900, q: 0.4 }); },
    star(i = 0) { if (on()) { tone(SCALE[4 + i], 0, 0.3, { vol: 0.24 }); tone(SCALE[6 + i], 0.05, 0.34, { type: 'sine', vol: 0.12 }); } },
    applause(seconds = 2.2) {
      if (!on()) return;
      for (let i = 0; i < seconds * 34; i++) {
        const t = Math.random() * seconds;
        noise(t, 0.05 + Math.random() * 0.05, { vol: 0.05 + Math.random() * 0.1 * (1 - t / (seconds * 1.4)), freq: 1400 + Math.random() * 2600, q: 1.2 });
      }
      [0.05, 0.3, 0.62].forEach((t, i) => tone(740 + i * 120, t, 0.34, { type: 'sawtooth', vol: 0.025, to: 1100 + i * 140 }));
    },
    boing() { if (on()) tone(320, 0, 0.22, { type: 'sine', vol: 0.22, to: 620 }); },
    wow() { if (on()) { tone(330, 0, 0.5, { type: 'triangle', vol: 0.24, to: 990 }); tone(495, 0.08, 0.5, { type: 'sine', vol: 0.16, to: 1320 }); noise(0.1, 0.6, { vol: 0.08, freq: 2600, q: 0.5 }); } },
    cheer() {
      if (!on()) return;
      [0, 0.06, 0.12].forEach((t, i) => tone(520 + i * 170, t, 0.42, { type: 'sawtooth', vol: 0.03, to: 980 + i * 170 }));
      noise(0, 0.55, { vol: 0.08, freq: 2300, q: 0.5 });
    },
    fanfare() {
      if (!on()) return;
      [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.39], [784, 0.56], [1047, 0.69]].forEach(([f, t]) => tone(f, t, 0.3, { type: 'square', vol: 0.09 }));
      [0.39, 0.69].forEach((t) => tone(262, t, 0.42, { type: 'triangle', vol: 0.2 }));
    },
  };

  /* Background sound that fits the scene, kept very soft so it never competes with the teacher or the game:
     water and bubbles under the sea, a breeze and far-off birds outdoors, slow twinkles in space, and a
     gentle hum of soft notes elsewhere. It dips further while a voice is talking. */
  const AMBIENCE = {
    ocean: { wash: [320, 0.16, 9], bits: 'bubbles' }, beach: { wash: [650, 0.13, 7], bits: 'bubbles' },
    hills: { wash: [1500, 0.035, 11], bits: 'birds' }, garden: { wash: [1500, 0.035, 11], bits: 'birds' }, jungle: { wash: [1100, 0.05, 8], bits: 'birds' },
    space: { bits: 'twinkle', pad: true }, magic: { bits: 'twinkle', pad: true }, stage: { pad: true },
    sky: { wash: [900, 0.03, 12], pad: true }, candy: { pad: true }, party: { pad: true }, fiesta: { pad: true }, map: { pad: true },
  };
  const PAD = [262, 330, 392, 440, 523, 587];
  let theme = 'map', washNodes = null, beat = 0;
  /* A soft note with a slow fade in and out. */
  function soft(freq, dur, vol, start = 0, to = null) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.4));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  /* Water or wind: deep, smooth noise that slowly swells and fades like a wave. */
  function startWash([cutoff, vol, period]) {
    const c = audio();
    if (!c || washNodes) return;
    const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    /* The end is blended into the start so the loop has no click. */
    for (let i = 0; i < 2000; i++) { const k = i / 2000; d[len - 2000 + i] = d[len - 2000 + i] * (1 - k) + d[i] * k; }
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
    src.buffer = buf; src.loop = true;
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.3;
    g.gain.value = vol * 0.6;
    lfo.type = 'sine'; lfo.frequency.value = 1 / period;
    depth.gain.value = vol * 0.4;
    lfo.connect(depth).connect(g.gain);
    src.connect(f).connect(g).connect(musicGain);
    src.start(); lfo.start();
    washNodes = [src, lfo, g];
  }
  function stopWash() {
    if (!washNodes) return;
    const [src, lfo, g] = washNodes;
    washNodes = null;
    try { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2); src.stop(ctx.currentTime + 0.8); lfo.stop(ctx.currentTime + 0.8); } catch (e) { /* already stopped */ }
  }
  const BITS = {
    /* A few bubbles rising. */
    bubbles() { const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { const f = 280 + Math.random() * 380; soft(f, 0.16, 0.045, i * 0.19 + Math.random() * 0.05, f * 2.1); } },
    /* A bird far away. */
    birds() { const f = 1900 + Math.random() * 900, n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) soft(f * (1 + (i % 2) * 0.12), 0.11, 0.022, i * 0.15, f * 1.18); },
    /* A star twinkling. */
    twinkle() { const f = PAD[Math.floor(Math.random() * PAD.length)] * 4; soft(f, 1.3, 0.02); soft(f * 1.5, 1.1, 0.012, 0.18); },
  };
  SEJ.music = {
    start() {
      if (musicTimer || SEJ.noMusic || state.music === false || state.sound === false || SEJ.testMode) return;
      if (!audio()) return;
      const a = AMBIENCE[theme] || AMBIENCE.map;
      if (a.wash) startWash(a.wash);
      musicTimer = setInterval(() => {
        if (document.hidden) return;
        beat++;
        /* Soft, slow notes: one every few seconds, sometimes two together. */
        if (a.pad && beat % 3 === 0) {
          const n = PAD[(beat / 3 * 2 + (beat % 5)) % PAD.length | 0];
          soft(n / 2, 3.2, 0.05);
          if (beat % 6 === 0) soft(n * 0.75, 3.4, 0.03, 0.3);
        }
        if (a.bits && Math.random() < (a.bits === 'bubbles' ? 0.4 : 0.22)) BITS[a.bits]();
      }, 1000);
    },
    stop() { clearInterval(musicTimer); musicTimer = null; stopWash(); },
    /* Called when the scene changes, so the sound follows it. */
    setTheme(name) {
      const next = AMBIENCE[name] ? name : 'map';
      if (next === theme) return;
      theme = next;
      if (musicTimer) { this.stop(); this.start(); }
    },
    get theme() { return theme; },
    duck(down) { if (musicGain && ctx) musicGain.gain.setTargetAtTime(down ? 0.12 : 0.5, ctx.currentTime, 0.08); },
    sync() { if (state.music !== false && state.sound !== false) this.start(); else this.stop(); },
  };

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
  addEventListener('pointerdown', (e) => { if (e.isPrimary && !(e.target.closest && e.target.closest('.builder, .admin-login, .ho-overlay'))) SEJ.fx.burst(e.clientX, e.clientY, 5); }, { passive: true });
  addEventListener('pointerdown', () => SEJ.voice.flushPending(), { once: true });
  /* Picking any game piece gives a soft click, before the right or wrong sound. */
  const PIECES = '.game-screen button:not(.bar-btn):not(.speak-btn):not(:disabled), .cl-option, .cl-mu-word, .cl-rain-word, .cl-mem-card, .cl-tile, .st-option, .st-tile, .st-team-btn';
  addEventListener('pointerdown', (e) => { const el = e.target.closest && e.target.closest(PIECES); if (el && !el.disabled) { SEJ.sfx.select(); el.classList.add('is-picked'); setTimeout(() => el.classList.remove('is-picked'), 160); } }, { passive: true });
  SEJ.heroImg = (id, cls = '') => SEJ.h('img', { class: 'hero-img ' + cls, src: `assets/heroes/${id}.webp`, alt: SEJ.HEROES[id].name, draggable: 'false' });
  SEJ.heroFace = (id, cls = '') => SEJ.h('span', { class: 'face ' + cls, style: { background: SEJ.HEROES[id].color } },
    SEJ.h('img', { src: `assets/heroes/${id}-face.webp`, alt: '', draggable: 'false' }));
})();
