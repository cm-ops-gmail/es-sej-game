/* Quiz video: a lesson's games as an animated video with the heroes.
   It plays here in the admin panel, records to a video file in the browser (nothing goes to a server),
   and saves as one HTML file that plays and records on its own, offline.
   VideoEngine, wireControls, loadAssets and loadFonts use nothing outside themselves:
   they are copied as they are into the saved HTML file. */
(function () {
  'use strict';

  /* ---------- the engine: draws any moment of the video on a 1280 x 720 canvas ---------- */
  function VideoEngine(canvas, data, assets, opts) {
    var W = 1280, H = 720;
    var ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    opts = opts || {};
    var TITLE = "'Lilita One', 'Baloo Da 2', 'Trebuchet MS', sans-serif";
    var BODY = "'Fredoka', 'Baloo Da 2', 'Trebuchet MS', sans-serif";
    var HEROES = ['knight', 'bhasha', 'mathman', 'innovara'];
    var INK = '#3b2f6b';
    var PAL = [
      { top: '#d9ccff', bot: '#fdf1ff', hill1: '#c7b5f3', hill2: '#ad97e6', accent: '#6f5aa8' },
      { top: '#bfe7f2', bot: '#eefaf5', hill1: '#9ad8d6', hill2: '#72c4c2', accent: '#1f8f99' },
      { top: '#ffdcc4', bot: '#fff5e6', hill1: '#f6c49b', hill2: '#eda877', accent: '#d9663f' },
      { top: '#cdeccf', bot: '#f4fbea', hill1: '#a9dcae', hill2: '#86c98d', accent: '#2f9e5b' },
    ];
    var IN = 1.5, THINK = Math.max(2, Number(opts.think) || 6), REVEAL = 3.4;
    var CHEERS = ['Well done!', 'Super!', 'You got it!', 'Great job!', 'Brilliant!', 'Yes, that’s it!'];

    /* ----- small helpers ----- */
    var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.max(a, Math.min(b, v)); };
    var lerp = function (a, b, p) { return a + (b - a) * p; };
    var eOut = function (p) { return 1 - Math.pow(1 - clamp(p), 3); };
    var eBack = function (p) { p = clamp(p); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
    var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    function seeded(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function font(size, fam, weight) { ctx.font = (weight ? weight + ' ' : '') + Math.round(size) + 'px ' + fam; }
    function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function shadow(on, blur, dy) { ctx.shadowColor = on ? 'rgba(40, 28, 90, .22)' : 'transparent'; ctx.shadowBlur = on ? (blur || 24) : 0; ctx.shadowOffsetY = on ? (dy === undefined ? 8 : dy) : 0; }
    function wrap(text, maxW) {
      var words = String(text).replace(/\s+/g, ' ').trim().split(' '), lines = [], line = '';
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        if (!line || ctx.measureText(test).width <= maxW) line = test; else { lines.push(line); line = w; }
      });
      if (line) lines.push(line);
      return lines;
    }
    /* The biggest size at which the text fits the box. */
    function fit(text, maxW, maxH, max, min, fam, weight) {
      for (var size = max; size >= min; size -= 2) {
        font(size, fam, weight);
        var lines = wrap(text, maxW);
        var widest = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }).concat([0]));
        if (lines.length * size * 1.18 <= maxH && widest <= maxW) return { size: size, lines: lines };
      }
      font(min, fam, weight);
      var all = wrap(text, maxW), keep = Math.max(1, Math.floor(maxH / (min * 1.18)));
      if (all.length > keep) { all = all.slice(0, keep); all[keep - 1] = all[keep - 1].replace(/.{0,2}$/, '…'); }
      return { size: min, lines: all };
    }
    function lines(f, cx, top, align, fam, weight) {
      font(f.size, fam, weight);
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'top';
      f.lines.forEach(function (l, i) { ctx.fillText(l, cx, top + i * f.size * 1.18); });
    }
    function textBlock(f, cx, top, align, fam, weight, fill, stroke, strokeW) {
      font(f.size, fam, weight);
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      f.lines.forEach(function (l, i) {
        var y = top + i * f.size * 1.18;
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW || 10; ctx.strokeText(l, cx, y); }
        ctx.fillStyle = fill; ctx.fillText(l, cx, y);
      });
    }

    /* ----- the timeline: intro, each game's title, each question, the goodbye ----- */
    var scenes = [], T = 0;
    function add(type, dur, extra) { var s = { type: type, start: T, dur: dur }; for (var k in extra) s[k] = extra[k]; scenes.push(s); T += dur; }
    var fixed = opts.hero && HEROES.indexOf(opts.hero) >= 0 ? opts.hero : null;
    var games = (data.games || []).filter(function (g) { return g.cards && g.cards.length; });
    add('intro', 5.2, { hero: fixed || HEROES[0], pal: PAL[0] });
    games.forEach(function (g, gi) {
      var hero = fixed || HEROES[gi % HEROES.length], pal = PAL[(gi + 1) % PAL.length];
      add('game', 3.4, { g: g, gi: gi, hero: hero, pal: pal });
      g.cards.forEach(function (c, ci) {
        var opt = (c.options || []).filter(Boolean).slice(0, 4);
        if (c.a && opt.length && !opt.some(function (o) { return norm(o) === norm(c.a); })) opt[opt.length - 1] = c.a;
        var reveal = opts.answers !== false && !!c.a;
        add('card', IN + THINK + (reveal ? REVEAL : 0.8), { g: g, gi: gi, c: c, ci: ci, opt: opt, hero: hero, pal: pal, reveal: reveal, total: g.cards.length, right: opt.findIndex(function (o) { return norm(o) === norm(c.a); }) });
      });
    });
    add('outro', 6.5, { pal: PAL[0] });
    var duration = T;

    /* ----- sound cues, at fixed moments so a recording gets them too ----- */
    var cues = [];
    scenes.forEach(function (s) {
      if (s.type === 'intro') cues.push({ t: s.start + 0.3, k: 'whoosh' }, { t: s.start + 1.3, k: 'chime' });
      if (s.type === 'game') cues.push({ t: s.start + 0.15, k: 'whoosh' }, { t: s.start + 0.7, k: 'chime' });
      if (s.type === 'card') {
        s.opt.forEach(function (o, i) { cues.push({ t: s.start + 0.8 + i * 0.16, k: 'pop', n: i }); });
        if (THINK >= 3) for (var k = 3; k >= 1; k--) cues.push({ t: s.start + IN + THINK - k, k: 'tick', n: 3 - k });
        if (s.reveal) cues.push({ t: s.start + IN + THINK, k: 'reveal' });
      }
      if (s.type === 'outro') cues.push({ t: s.start + 0.4, k: 'fanfare' });
    });

    /* ----- gentle synth: music box and soft bells, through a limiter ----- */
    var ac = null, master = null, recDest = null;
    var P = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];
    function audio() {
      if (ac) return ac;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4;
      var soft = ac.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 5200;
      master = ac.createGain(); master.gain.value = 0.7;
      master.connect(soft); soft.connect(comp); comp.connect(ac.destination);
      try { recDest = ac.createMediaStreamDestination(); comp.connect(recDest); } catch (e) { recDest = null; }
      return ac;
    }
    function tone(f, at, vol, dur, type) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.05);
    }
    function bell(f, at, vol, dur) { tone(f, at, vol, dur); tone(f * 2, at, vol * 0.28, dur * 0.6); tone(f * 3.01, at, vol * 0.07, dur * 0.3); }
    var pick = function (i) { return P[Math.max(0, Math.min(P.length - 1, i))]; };
    function cue(k, n) {
      if (!ac || opts.sfx === false) return;
      var t0 = ac.currentTime + 0.01;
      if (k === 'pop') bell(pick(5 + (n % 4)), t0, 0.07, 0.35);
      else if (k === 'tick') tone(pick(9 + n), t0, 0.045, 0.14, 'triangle');
      else if (k === 'reveal') [0, 2, 4, 7].forEach(function (d, i) { bell(pick(5 + d), t0 + i * 0.09, 0.09, 1.1); });
      else if (k === 'chime') [7, 9, 12].forEach(function (d, i) { bell(pick(d), t0 + i * 0.08, 0.06, 0.9); });
      else if (k === 'fanfare') [[5, 0], [7, 0.16], [9, 0.32], [12, 0.48], [9, 0.72], [12, 0.88]].forEach(function (x) { bell(pick(x[0]), t0 + x[1], 0.08, x[1] > 0.8 ? 1.6 : 0.6); });
      else if (k === 'whoosh') {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(320, t0); o.frequency.exponentialRampToValueAtTime(880, t0 + 0.35);
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.035, t0 + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.5);
      }
    }
    var BEAT = 60 / 92, TUNE = [0, 4, 7, 4, 2, 5, 9, 5, 4, 7, 11, 7, 2, 5, 9, 7];
    function beat(i) {
      if (!ac || opts.music === false) return;
      var t0 = ac.currentTime + 0.01;
      tone(pick(TUNE[i % 16]), t0, 0.03, 0.55, 'triangle');
      if (i % 4 === 0) tone(pick(TUNE[i % 16]) / 2, t0, 0.025, 1.4);
    }
    function sounds(from, to) {
      if (to <= from || to - from > 0.5) return;
      cues.forEach(function (c) { if (c.t > from && c.t <= to) cue(c.k, c.n); });
      var a = Math.floor(from / BEAT), b = Math.floor(to / BEAT);
      if (b > a && to < duration - 1) beat(b);
    }

    /* ----- the scenery ----- */
    var rnd = seeded(11);
    var clouds = []; for (var i = 0; i < 7; i++) clouds.push({ x: rnd() * W, y: 50 + rnd() * 200, s: 0.6 + rnd() * 0.8, v: 8 + rnd() * 14 });
    var dots = []; for (i = 0; i < 40; i++) dots.push({ x: rnd() * W, y: rnd() * H * 0.78, r: 1.5 + rnd() * 3, p: rnd() * 6.28 });
    var confetti = []; var COLORS = ['#f2784b', '#f2c94c', '#6f5aa8', '#3fb170', '#3fa4cf', '#d8649c'];
    for (i = 0; i < 150; i++) confetti.push({ x: rnd() * W, y: rnd() * H, v: 90 + rnd() * 140, s: 6 + rnd() * 8, c: COLORS[i % COLORS.length], r: rnd() * 6.28, spin: (rnd() - 0.5) * 8, d: rnd() * 1.2 });
    function cloud(x, y, s) {
      ctx.fillStyle = 'rgba(255, 255, 255, .88)';
      [[0, 0, 62, 26], [40, -14, 44, 30], [-38, -6, 36, 22], [10, -26, 30, 22]].forEach(function (e) { ctx.beginPath(); ctx.ellipse(x + e[0] * s, y + e[1] * s, e[2] * s, e[3] * s, 0, 0, Math.PI * 2); ctx.fill(); });
    }
    function hill(color, base, amp, freq, phase) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 16) ctx.lineTo(x, base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.4);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    function scenery(pal, t) {
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.top); g.addColorStop(1, pal.bot);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var rg = ctx.createRadialGradient(1090, 110, 10, 1090, 110, 240); rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(850, 0, 430, 360);
      dots.forEach(function (d) { ctx.globalAlpha = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + d.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x, d.y + Math.sin(t * 0.6 + d.p) * 6, d.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      clouds.forEach(function (c) { cloud(((c.x + t * c.v) % (W + 300)) - 150, c.y, c.s); });
      hill(pal.hill1, 610, 34, 0.0045, t * 0.15);
      hill(pal.hill2, 655, 26, 0.0065, t * 0.25 + 2);
    }
    function logo(alpha) {
      if (!assets.logo) return;
      var h = 52, w = h * assets.logo.naturalWidth / assets.logo.naturalHeight;
      ctx.globalAlpha = alpha; ctx.drawImage(assets.logo, 28, 22, w, h); ctx.globalAlpha = 1;
    }
    function hero(id, x, base, h, t, o) {
      var img = assets.heroes && assets.heroes[id];
      if (!img) return;
      o = o || {};
      var w = h * img.naturalWidth / img.naturalHeight;
      var lift = o.jump ? Math.abs(Math.sin(t * 7)) * o.jump : (Math.sin(t * 2.4) + 1) * 4;
      ctx.save();
      ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
      ctx.fillStyle = 'rgba(30, 20, 60, .16)'; ctx.beginPath(); ctx.ellipse(x, base + 2, w * 0.3 * (1 - lift / 160), 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(x, base - lift);
      if (o.flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
    }
    function bubble(x, y, text, p, size) {
      if (p <= 0) return;
      size = size || 26;
      font(size, BODY, '600');
      var w = ctx.measureText(text).width + 44, h = size + 30, s = eBack(p);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = clamp(p * 2);
      shadow(true, 16, 5); ctx.fillStyle = '#fff'; rr(0, -h, w, h, h / 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(8, 18); ctx.lineTo(52, -6); ctx.closePath(); ctx.fill(); shadow(false);
      ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, 22, -h / 2 + 1);
      ctx.restore();
    }
    function pill(text, x, y, bg, fg, size, align) {
      font(size, BODY, '700');
      var w = ctx.measureText(text).width + size * 1.4, h = size * 1.9, left = align === 'left' ? x : x - w / 2;
      shadow(true, 12, 4); ctx.fillStyle = bg; rr(left, y, w, h, h / 2); ctx.fill(); shadow(false);
      ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, left + w / 2, y + h / 2 + 1);
      return w;
    }
    function star(x, y, r, rot, color) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath();
      for (var k = 0; k < 10; k++) { var rad = k % 2 ? r * 0.45 : r, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function burst(cx, cy, p, n, seed) {
      if (p <= 0 || p > 1.3) return;
      var r = seeded(seed);
      for (var k = 0; k < n; k++) {
        var a = k / n * Math.PI * 2 + r() * 0.5, d = eOut(p) * (110 + r() * 110);
        ctx.globalAlpha = clamp(1 - p / 1.3);
        star(cx + Math.cos(a) * d, cy + Math.sin(a) * d + p * p * 50, 7 + r() * 7, p * 5 + k, COLORS[k % COLORS.length]);
      }
      ctx.globalAlpha = 1;
    }
    function fadeIn(lt) { if (lt < 0.35) { ctx.fillStyle = 'rgba(255, 255, 255, ' + (1 - lt / 0.35) + ')'; ctx.fillRect(0, 0, W, H); } }

    /* ----- scenes ----- */
    function intro(s, lt, t) {
      scenery(s.pal, t); logo(clamp(lt / 0.6));
      var p = clamp((lt - 0.9) / 0.8), sc = 0.6 + 0.4 * eBack(p);
      if (data.emoji) { font(86, BODY); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = clamp((lt - 0.6) / 0.4); ctx.fillText(data.emoji, 790, 150 + Math.sin(t * 2) * 6); ctx.globalAlpha = 1; }
      ctx.save(); ctx.translate(790, 300); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 2.5);
      var f = fit(data.title || 'Quiz time', 720, 210, 88, 40, TITLE);
      textBlock(f, 0, -f.lines.length * f.size * 0.59, 'center', TITLE, '', '#5a3fb0', '#fff', 14);
      ctx.restore();
      burst(790, 300, lt - 1.4, 20, 3);
      if (data.sub) { ctx.globalAlpha = clamp((lt - 1.7) / 0.4); pill(data.sub, 790, 440, s.pal.accent, '#fff', 26); ctx.globalAlpha = 1; }
      ctx.globalAlpha = clamp((lt - 2.1) / 0.4); pill('Quiz time!', 790, 520, '#f2c94c', INK, 24); ctx.globalAlpha = 1;
      hero(s.hero, lerp(-220, 250, eBack((lt - 0.2) / 1.1)), 700, 480, t, { jump: lt > 1.3 && lt < 2.3 ? 22 : 0 });
      bubble(330, 250, 'Let’s play a quiz!', (lt - 1.9) / 0.5, 28);
      fadeIn(lt);
    }
    function game(s, lt, t) {
      scenery(s.pal, t); logo(1);
      var p = eBack((lt - 0.25) / 0.7);
      ctx.globalAlpha = clamp((lt - 0.2) / 0.3); pill('Game ' + (s.gi + 1), 790, 140, s.pal.accent, '#fff', 26); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(790, 330); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p); ctx.globalAlpha = clamp((lt - 0.25) / 0.3);
      var f = fit(s.g.title, 760, 190, 80, 36, TITLE);
      textBlock(f, 0, -f.lines.length * f.size * 0.59, 'center', TITLE, '', INK, '#fff', 12);
      ctx.restore();
      if (s.g.how) {
        ctx.globalAlpha = clamp((lt - 0.9) / 0.4);
        var hf = fit(s.g.how, 700, 80, 28, 20, BODY, '500');
        ctx.fillStyle = INK; lines(hf, 790, 450, 'center', BODY, '500');
        ctx.globalAlpha = 1;
      }
      hero(s.hero, lerp(-220, 250, eBack(lt / 0.9)), 700, 440, t, { jump: lt > 0.6 && lt < 1.4 ? 20 : 0 });
      bubble(320, 290, 'Get ready!', (lt - 1.1) / 0.5, 28);
      fadeIn(lt);
    }
    function card(s, lt, t) {
      scenery(s.pal, t); logo(1);
      var c = s.c, rt = lt - IN - THINK, revealed = s.reveal && rt >= 0;
      /* The card is as tall as what it holds, and sits in the middle. */
      var rows = Math.ceil(s.opt.length / 2);
      var X = 380, Wc = 860, Hc = Math.max(390, 236 + (s.opt.length ? rows * 110 : 200) + 36 + (c.note && s.reveal ? 64 : 0));
      var Y = lerp(H + 40, Math.max(80, (650 - Hc) / 2 + 6), eBack(lt / 0.7));
      /* the card */
      shadow(true, 30, 10); ctx.fillStyle = '#fffdf9'; rr(X, Y, Wc, Hc, 28); ctx.fill(); shadow(false);
      pill(c.head || s.g.title, X + 28, Y - 22, s.pal.accent, '#fff', 20, 'left');
      /* the countdown */
      var cx = X + Wc - 62, cy = Y + 62, tp = clamp((lt - IN) / THINK), left = Math.ceil(THINK - (lt - IN));
      if (lt >= IN - 0.3 && !revealed) {
        var warn = left <= 3 && lt >= IN, pulse = warn ? 1 + 0.07 * Math.sin(lt * 12) : 1;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
        ctx.fillStyle = '#f3eefc'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = warn ? '#f2784b' : s.pal.accent; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + (1 - tp) * Math.PI * 2); ctx.stroke();
        font(32, TITLE); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.max(0, Math.min(THINK, lt < IN ? THINK : left))), 0, 2);
        ctx.restore();
      }
      if (revealed) { ctx.save(); ctx.translate(cx, cy); ctx.scale(eBack(rt / 0.4), eBack(rt / 0.4)); ctx.fillStyle = '#3fb170'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill(); font(40, BODY, '700'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', 0, 2); ctx.restore(); }
      /* the question, with its picture */
      var qx = X + 44, qw = Wc - 44 - 130, qy = Y + 44;
      var pic = c.pic && assets.pics && assets.pics[c.pic];
      if (pic) {
        var ps = Math.min(180 / pic.naturalWidth, 180 / pic.naturalHeight), pw = pic.naturalWidth * ps, ph = pic.naturalHeight * ps;
        ctx.save(); rr(qx, qy, 180, 180, 18); ctx.clip(); ctx.fillStyle = '#f3eefc'; ctx.fillRect(qx, qy, 180, 180); ctx.drawImage(pic, qx + (180 - pw) / 2, qy + (180 - ph) / 2, pw, ph); ctx.restore();
        qx += 204; qw -= 204;
      }
      var qa = clamp((lt - 0.45) / 0.4);
      ctx.globalAlpha = qa;
      var qf = fit(c.q, qw, 170, 50, 22, BODY, '600');
      ctx.fillStyle = INK; lines(qf, qx, qy + Math.max(0, (170 - qf.lines.length * qf.size * 1.18) / 2), 'left', BODY, '600');
      ctx.globalAlpha = 1;
      /* the choices */
      var oy = Y + 236, ow = (Wc - 88 - 20) / 2, oh = 92;
      s.opt.forEach(function (o, i) {
        var col = i % 2, row = Math.floor(i / 2), x = X + 44 + col * (ow + 20), y = oy + row * (oh + 18);
        var pop = eBack((lt - 0.8 - i * 0.16) / 0.45);
        if (pop <= 0) return;
        var right = revealed && i === s.right, dim = revealed && i !== s.right;
        var bump = right ? 1 + 0.06 * Math.max(0, Math.sin(rt * 6)) * Math.exp(-rt * 1.2) : 1;
        ctx.save(); ctx.translate(x + ow / 2, y + oh / 2); ctx.scale(pop * bump, pop * bump); ctx.globalAlpha = dim ? 0.35 : 1;
        shadow(true, 14, 5); ctx.fillStyle = right ? '#3fb170' : '#f3eefc'; rr(-ow / 2, -oh / 2, ow, oh, 22); ctx.fill(); shadow(false);
        ctx.fillStyle = right ? '#fff' : ['#6f5aa8', '#f2784b', '#1f9e8c', '#e9a92b'][i];
        ctx.beginPath(); ctx.arc(-ow / 2 + 44, 0, 26, 0, Math.PI * 2); ctx.fill();
        font(26, TITLE); ctx.fillStyle = right ? '#3fb170' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(right ? '✓' : 'ABCD'[i], -ow / 2 + 44, 2);
        var of = fit(o, ow - 104, oh - 16, 32, 16, BODY, '600');
        ctx.fillStyle = right ? '#fff' : INK; lines(of, -ow / 2 + 86, -of.lines.length * of.size * 0.59, 'left', BODY, '600');
        ctx.restore();
      });
      /* no choices: the answer appears in a box */
      if (!s.opt.length) {
        var bx = X + 120, bw = Wc - 240, by = oy + 20, bh = 160, ap = revealed ? eBack(rt / 0.5) : 0;
        ctx.globalAlpha = clamp((lt - 0.9) / 0.4);
        if (!revealed) {
          ctx.setLineDash([14, 12]); ctx.strokeStyle = '#c9bdf0'; ctx.lineWidth = 4; rr(bx, by, bw, bh, 24); ctx.stroke(); ctx.setLineDash([]);
          font(34, BODY, '600'); ctx.fillStyle = '#9a8cc8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(c.a ? 'Think… 🤔' : 'Say it out loud! 🗣️', bx + bw / 2, by + bh / 2);
        } else {
          ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(ap, ap);
          shadow(true, 16, 6); ctx.fillStyle = '#3fb170'; rr(-bw / 2, -bh / 2, bw, bh, 24); ctx.fill(); shadow(false);
          var af = fit(c.a, bw - 60, bh - 30, 48, 20, BODY, '700'); ctx.fillStyle = '#fff';
          lines(af, 0, -af.lines.length * af.size * 0.59, 'center', BODY, '700');
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      /* the tip under the answer */
      if (revealed && c.note) {
        ctx.globalAlpha = clamp((rt - 0.7) / 0.4);
        var nf = fit('💡 ' + c.note, Wc - 88, 56, 24, 16, BODY, '500');
        ctx.fillStyle = '#5b4f86'; lines(nf, X + 44, Y + Hc - 70, 'left', BODY, '500');
        ctx.globalAlpha = 1;
      }
      /* sparkles from the right answer */
      if (revealed) {
        var sx = X + Wc / 2, sy = oy + 100;
        if (s.right >= 0) { sx = X + 44 + (s.right % 2) * (ow + 20) + ow / 2; sy = oy + Math.floor(s.right / 2) * (oh + 18) + oh / 2; }
        burst(sx, sy, rt, 22, 17 + s.ci);
      }
      /* where we are */
      var dots = Math.min(s.total, 12), dx = X + Wc / 2 - (dots - 1) * 11;
      ctx.globalAlpha = clamp(lt / 0.5);
      for (var k = 0; k < dots; k++) { ctx.fillStyle = k === s.ci % 12 ? s.pal.accent : 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(dx + k * 22, Y + Hc + 30, k === s.ci % 12 ? 7 : 5, 0, Math.PI * 2); ctx.fill(); }
      font(20, BODY, '600'); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('Question ' + (s.ci + 1) + ' of ' + s.total, X + Wc / 2, Y + Hc + 46);
      ctx.globalAlpha = 1;
      /* the hero cheers the answer */
      var cheer = revealed && rt < 1.6;
      hero(s.hero, lerp(-200, 190, eOut(lt / 0.6)), 705, 340, t, { jump: cheer ? 24 : 0 });
      var say = revealed ? CHEERS[s.ci % CHEERS.length] : !c.a ? 'Say it with me!' : s.opt.length ? 'Can you answer?' : 'What’s the answer?';
      bubble(96, 338, say, revealed ? rt / 0.4 : (lt - 0.6) / 0.4, 24);
      fadeIn(lt);
    }
    function outro(s, lt, t) {
      scenery(s.pal, t); logo(1);
      confetti.forEach(function (p) {
        var age = lt - p.d; if (age <= 0) return;
        var y = (p.y * 0.2 - 40 + age * p.v) % (H + 60);
        ctx.save(); ctx.translate(p.x + Math.sin(age * 2 + p.r) * 18, y); ctx.rotate(p.r + age * p.spin); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      var p = eBack((lt - 0.3) / 0.8);
      ctx.save(); ctx.translate(640, 150); ctx.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p); ctx.globalAlpha = clamp((lt - 0.3) / 0.3);
      var f = fit('Great job, heroes!', 1000, 120, 84, 40, TITLE);
      textBlock(f, 0, -f.size * 0.6, 'center', TITLE, '', '#5a3fb0', '#fff', 14);
      ctx.restore();
      burst(640, 150, lt - 0.7, 24, 5);
      ctx.globalAlpha = clamp((lt - 1.6) / 0.4); pill('See you in the next class!', 640, 240, '#f2c94c', INK, 26); ctx.globalAlpha = 1;
      HEROES.forEach(function (id, k) {
        var e = eBack((lt - 0.8 - k * 0.25) / 0.7);
        if (e <= 0) return;
        hero(id, 250 + k * 260, lerp(H + 300, 705, e), 330, t + k, { jump: lt > 2.2 ? 18 : 0 });
      });
      fadeIn(lt);
    }
    var DRAW = { intro: intro, game: game, card: card, outro: outro };
    function frame(t) {
      var s = scenes[scenes.length - 1];
      for (var k = 0; k < scenes.length; k++) if (t < scenes[k].start + scenes[k].dur) { s = scenes[k]; break; }
      ctx.save(); DRAW[s.type](s, Math.max(0, t - s.start), t); ctx.restore();
      shadow(false); ctx.globalAlpha = 1;
    }

    /* ----- the player and the recorder ----- */
    var now = 0, playing = false, raf = 0, startAt = 0, rec = null, cancelled = false;
    var api = {
      duration: duration,
      count: scenes.filter(function (s) { return s.type === 'card'; }).length,
      onTime: null, onEnd: null,
      get playing() { return playing; },
      get recording() { return !!rec; },
      get time() { return now; },
      seek: function (t) { now = clamp(t, 0, duration); frame(now); if (playing) startAt = performance.now() - now * 1000; if (api.onTime) api.onTime(now); },
      poster: function () { frame(Math.min(2.9, duration)); },
      play: function () {
        if (playing) return;
        if (now >= duration - 0.05) now = 0;
        audio(); if (ac && ac.state === 'suspended') ac.resume();
        playing = true; startAt = performance.now() - now * 1000;
        tick();
      },
      pause: function () { playing = false; cancelAnimationFrame(raf); clearTimeout(raf); },
      record: function () {
        return new Promise(function (resolve, reject) {
          if (!canvas.captureStream || !window.MediaRecorder) return reject(new Error('This browser can’t record video. Please use Chrome or Edge.'));
          audio(); if (ac && ac.state === 'suspended') ac.resume();
          var stream = canvas.captureStream(30);
          if (recDest) recDest.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
          var types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
          var type = types.filter(function (x) { return MediaRecorder.isTypeSupported(x); })[0] || '';
          var mr;
          try { mr = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 4500000 } : { videoBitsPerSecond: 4500000 }); } catch (e) { return reject(new Error('This browser can’t record video. Please use Chrome or Edge.')); }
          var chunks = [];
          mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          mr.onstop = function () {
            stream.getVideoTracks().forEach(function (tr) { tr.stop(); });
            rec = null;
            if (cancelled) { cancelled = false; reject(new Error('cancelled')); return; }
            resolve(new Blob(chunks, { type: (mr.mimeType || type || 'video/webm').split(';')[0] }));
          };
          api.pause(); now = 0; frame(0);
          rec = mr; cancelled = false;
          mr.start(500);
          api.play();
        });
      },
      cancel: function () { if (rec) { cancelled = true; api.pause(); try { rec.stop(); } catch (e) { rec = null; } } },
      destroy: function () { api.cancel(); api.pause(); if (ac) { try { ac.close(); } catch (e) { /* already closed */ } ac = null; } },
    };
    function tick() {
      if (!playing) return;
      var t = Math.min((performance.now() - startAt) / 1000, duration);
      sounds(now, t);
      now = t; frame(now);
      if (api.onTime) api.onTime(now);
      if (now >= duration) {
        playing = false;
        if (rec) { var r = rec; setTimeout(function () { try { r.stop(); } catch (e) { /* stopped */ } }, 400); }
        if (api.onEnd) api.onEnd();
        return;
      }
      /* A hidden tab stops animation frames; timers keep a recording going. */
      raf = document.hidden ? setTimeout(tick, 33) : requestAnimationFrame(tick);
    }
    frame(0);
    return api;
  }

  /* ---------- the buttons under the video: play, seek, record and download ---------- */
  function wireControls(engine, el, fileBase) {
    var fmt = function (s) { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
    var recLabel = el.rec.textContent;
    var sync = function (t) { el.seek.value = String(Math.round(t / engine.duration * 1000)); el.time.textContent = fmt(t) + ' / ' + fmt(engine.duration); };
    engine.onTime = sync;
    engine.onEnd = function () { el.play.textContent = '▶ Play'; };
    el.play.onclick = function () {
      if (engine.recording) return;
      if (engine.playing) { engine.pause(); el.play.textContent = '▶ Play'; } else { engine.play(); el.play.textContent = '⏸ Pause'; }
    };
    el.seek.oninput = function () { if (!engine.recording) engine.seek(Number(el.seek.value) / 1000 * engine.duration); };
    el.rec.onclick = function () {
      if (engine.recording) { engine.cancel(); return; }
      el.rec.textContent = '⏹ Stop recording';
      el.play.disabled = true; el.seek.disabled = true;
      if (el.busy) el.busy(true);
      el.status.textContent = 'Recording… keep this tab open. It takes as long as the video (' + fmt(engine.duration) + ').';
      engine.record().then(function (blob) {
        var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = fileBase + '.' + ext;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        el.status.textContent = 'Video saved: ' + fileBase + '.' + ext + ' (' + (blob.size / 1048576).toFixed(1) + ' MB).';
      }).catch(function (e) {
        el.status.textContent = e.message === 'cancelled' ? 'Recording stopped. Nothing was saved.' : e.message;
      }).then(function () {
        el.rec.textContent = recLabel; el.play.disabled = false; el.seek.disabled = false; el.play.textContent = '▶ Play';
        if (el.busy) el.busy(false);
      });
    };
    sync(0);
  }

  /* ---------- pictures and fonts ---------- */
  function loadAssets(urls) {
    var one = function (src) {
      return new Promise(function (ok) {
        if (!src) { ok(null); return; }
        var im = new Image();
        if (/^https?:/.test(src) && src.indexOf(location.origin) !== 0) im.crossOrigin = 'anonymous';
        im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
        im.src = src;
      });
    };
    var out = { heroes: {}, pics: {}, logo: null }, jobs = [];
    Object.keys(urls.heroes || {}).forEach(function (k) { jobs.push(one(urls.heroes[k]).then(function (im) { out.heroes[k] = im; })); });
    Object.keys(urls.pics || {}).forEach(function (k) { jobs.push(one(urls.pics[k]).then(function (im) { if (im) out.pics[k] = im; })); });
    jobs.push(one(urls.logo).then(function (im) { out.logo = im; }));
    return Promise.all(jobs).then(function () { return out; });
  }
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([['40px "Lilita One"', 'Ab'], ['600 40px Fredoka', 'Ab'], ['40px "Baloo Da 2"', 'অআ']].map(function (f) { return document.fonts.load(f[0], f[1]).catch(function () { return null; }); }));
  }

  /* ---------- in the app ---------- */
  const { h } = SEJ;
  const HERO_IDS = ['knight', 'bhasha', 'mathman', 'innovara'];
  const clean = (t) => String(t === undefined || t === null ? '' : t).replace(/\s+/g, ' ').trim();
  const safeName = (s) => s.replace(/['’]/g, '').replace(/[^\w .-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Quiz video';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const appUrls = (data) => {
    const pics = {};
    data.games.forEach((g) => g.cards.forEach((c) => { if (c.pic) pics[c.pic] = SEJ.picSrc(c.pic); }));
    return { heroes: Object.fromEntries(HERO_IDS.map((id) => [id, `assets/heroes/${id}.webp`])), logo: 'assets/logo.webp', pics };
  };
  const dataUrl = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error('missing'); return r.blob(); })
    .then((b) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }));

  /* One HTML file with everything inside: the questions, the heroes, the fonts and the player. */
  async function standalone(data, opts, title, fileBase) {
    const urls = appUrls(data);
    const inline = async (map) => Object.fromEntries(await Promise.all(Object.entries(map).map(async ([k, u]) => [k, await dataUrl(u).catch(() => '')])));
    const own = { heroes: await inline(urls.heroes), pics: await inline(urls.pics), logo: await dataUrl(urls.logo).catch(() => '') };
    const fonts = await inline({ lilita: 'assets/fonts/lilita-one-latin.woff2', fredoka: 'assets/fonts/fredoka-latin.woff2', baloo: 'assets/fonts/baloo-da-2-bengali.woff2' });
    const json = (x) => JSON.stringify(x).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${fonts.lilita ? `@font-face { font-family: 'Lilita One'; src: url(${fonts.lilita}) format('woff2'); }` : ''}
${fonts.fredoka ? `@font-face { font-family: 'Fredoka'; font-weight: 300 700; src: url(${fonts.fredoka}) format('woff2'); }` : ''}
${fonts.baloo ? `@font-face { font-family: 'Baloo Da 2'; font-weight: 400 800; src: url(${fonts.baloo}) format('woff2'); }` : ''}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; background: radial-gradient(circle at 30% 20%, #4b3f8f, #231d4a); color: #fff; font-family: Fredoka, 'Baloo Da 2', system-ui, sans-serif; }
.wrap { width: min(1120px, 100%); }
h1 { margin: 0 0 12px; font: 400 26px 'Lilita One', system-ui, sans-serif; letter-spacing: .5px; }
canvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; border-radius: 18px; background: #e9e3fb; box-shadow: 0 20px 50px rgba(0, 0, 0, .35); }
.bar { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
button { min-height: 44px; padding: 0 18px; border: 0; border-radius: 999px; background: #fff; color: #3b2f6b; font: 600 16px Fredoka, system-ui, sans-serif; cursor: pointer; }
button.rec { background: #f2784b; color: #fff; }
button:disabled { opacity: .5; cursor: default; }
input[type=range] { flex: 1 1 200px; accent-color: #f2c94c; }
.time { min-width: 100px; font-variant-numeric: tabular-nums; }
.status { margin: 10px 0 0; min-height: 1.3em; font-size: 15px; opacity: .92; }
</style>
</head>
<body>
<div class="wrap">
<h1>${esc(title)}</h1>
<canvas id="v" width="1280" height="720" aria-label="${esc(title)}"></canvas>
<div class="bar">
<button id="play" type="button">▶ Play</button>
<input id="seek" type="range" min="0" max="1000" value="0" aria-label="Video position">
<span class="time" id="time">0:00</span>
<button id="full" type="button">⛶ Full screen</button>
<button id="rec" class="rec" type="button">⏺ Record &amp; download video</button>
</div>
<p class="status" id="status" role="status"></p>
</div>
<script>
${VideoEngine.toString()}
${wireControls.toString()}
${loadAssets.toString()}
${loadFonts.toString()}
(function () {
  var DATA = ${json(data)}, OPTS = ${json(opts)}, URLS = ${json(own)};
  var $ = function (id) { return document.getElementById(id); };
  $('status').textContent = 'Loading…';
  Promise.all([loadAssets(URLS), loadFonts()]).then(function (r) {
    var engine = VideoEngine($('v'), DATA, r[0], OPTS);
    wireControls(engine, { play: $('play'), seek: $('seek'), time: $('time'), rec: $('rec'), status: $('status') }, ${json(fileBase)});
    engine.poster();
    $('status').textContent = '';
    $('full').onclick = function () { var c = $('v'); var f = c.requestFullscreen || c.webkitRequestFullscreen; if (f) f.call(c); };
  });
})();
</script>
</body>
</html>
`;
  }

  /* The video maker: pick games and options, watch, record, or save the HTML file. */
  function open(lesson, games, whole = true) {
    const all = games.filter((g) => SEJ.slides.cardsOf(g).length);
    const state = { picked: new Set(all.map((g, i) => i)), per: whole && all.length > 1 ? 5 : 0, think: 6, hero: 'auto', answers: true, music: true, sfx: true };
    const title = whole ? `${lesson.code} ${lesson.title}` : `${lesson.code} ${all[0] ? all[0].title : lesson.title}`;
    const fileBase = safeName(`${title} - Quiz video`);
    let engine = null, assets = null;

    const canvas = h('canvas', { class: 'vd-canvas', id: 'vd-canvas', width: '1280', height: '720', 'aria-label': 'Quiz video preview' });
    const status = h('span', { class: 'vd-status', id: 'vd-status', role: 'status' });
    const play = h('button', { class: 'cta vd-play', id: 'vd-play', type: 'button' }, '▶ Play');
    const seek = h('input', { class: 'vd-seek', id: 'vd-seek', type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Video position' });
    const time = h('span', { class: 'vd-time', id: 'vd-time', text: '0:00' });
    const rec = h('button', { class: 'cta vd-rec', id: 'vd-rec', type: 'button', title: 'Plays the video once and saves it as a video file you can share or upload' }, '⏺ Record & download video');
    const save = h('button', { class: 'soft-btn', id: 'vd-html', type: 'button', title: 'One HTML file that plays the video in any browser, even offline, and can record it too' }, '⬇️ Download HTML file');
    const length = h('small', { class: 'vd-length', id: 'vd-length' });

    const data = () => ({
      title: whole ? lesson.title : (all[0] ? all[0].title : lesson.title),
      sub: whole ? `Lesson ${lesson.code}` : `Lesson ${lesson.code} · ${lesson.title}`,
      emoji: whole ? (lesson.emoji || '') : '',
      games: all.filter((g, i) => state.picked.has(i)).map((g) => {
        let cards = SEJ.slides.cardsOf(g).filter((c) => clean(c.q));
        if (state.per) cards = cards.slice(0, state.per);
        const meta = SEJ.TEMPLATES[g.t] || {};
        return {
          title: clean(g.title),
          how: clean(g.prompt || meta.en || ''),
          cards: cards.map((c) => ({ head: clean(c.head), q: clean(c.q), options: (c.options || []).map(clean).filter(Boolean), a: clean(c.a), note: clean(c.note), pic: c.pic || '' })),
        };
      }).filter((g) => g.cards.length),
    });
    const opts = () => ({ think: state.think, hero: state.hero, answers: state.answers, music: state.music, sfx: state.sfx });
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    function build() {
      if (engine) engine.destroy();
      play.textContent = '▶ Play';
      const d = data();
      const empty = !d.games.length;
      [play, seek, rec, save].forEach((b) => { b.disabled = empty; });
      if (empty) { status.textContent = 'Pick at least one game with questions.'; engine = null; return; }
      engine = VideoEngine(canvas, d, assets, opts());
      wireControls(engine, { play, seek, time, rec, status, busy: (on) => panel.classList.toggle('vd-busy', on) }, fileBase);
      engine.poster();
      length.textContent = `${engine.count} questions · ${fmt(engine.duration)} long`;
      status.textContent = '';
    }

    const select = (id, label, value, choices, key) => h('label', { class: 'vd-field' }, h('span', { text: label }),
      h('select', { id, onchange: (e) => { state[key] = /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value; build(); } },
        choices.map(([v, t]) => h('option', { value: String(v), selected: String(v) === String(value), text: t }))));
    const check = (id, label, key) => h('label', { class: 'ho-check' },
      h('input', { type: 'checkbox', id, checked: state[key], onchange: (e) => { state[key] = e.target.checked; build(); } }), label);
    const chips = all.length > 1 ? h('div', { class: 'vd-games', role: 'group', 'aria-label': 'Games in the video' },
      all.map((g, i) => h('button', {
        class: 'vd-chip on', type: 'button', 'aria-pressed': 'true',
        onclick: (e) => { const b = e.currentTarget; if (state.picked.has(i)) state.picked.delete(i); else state.picked.add(i); const on = state.picked.has(i); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); build(); },
      }, `${i + 1}. ${g.title}`))) : null;

    const panel = h('div', { class: 'vd-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Quiz video' },
      h('div', { class: 'ho-bar' },
        h('div', {}, h('strong', { text: '🎬 Quiz video' }), h('small', { text: `${title}  ·  ` }), length),
        h('button', { class: 'soft-btn', id: 'vd-close', 'aria-label': 'Close', onclick: () => close() }, '✕')),
      chips,
      h('div', { class: 'vd-options' },
        select('vd-per', 'Questions per game', state.per, [[3, '3'], [5, '5'], [8, '8'], [0, 'All']], 'per'),
        select('vd-think', 'Thinking time', state.think, [[4, '4 seconds'], [6, '6 seconds'], [8, '8 seconds'], [10, '10 seconds']], 'think'),
        select('vd-hero', 'Hero', state.hero, [['auto', 'Take turns'], ...HERO_IDS.map((id) => [id, SEJ.HEROES[id].name])], 'hero'),
        check('vd-answers', 'Show the answers', 'answers'),
        check('vd-music', 'Music', 'music'),
        check('vd-sfx', 'Sound effects', 'sfx')),
      h('div', { class: 'vd-stage' }, canvas),
      h('div', { class: 'vd-controls' }, play, seek, time),
      h('div', { class: 'ho-actions vd-actions' }, status, save, rec));
    const overlay = h('div', { class: 'vd-overlay', onclick: (e) => { if (e.target === overlay) close(); } }, panel);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      if (engine) engine.destroy();
      overlay.remove();
      removeEventListener('keydown', onKey);
    }
    save.onclick = async () => {
      if (!engine) return;
      save.disabled = true; status.textContent = 'Making the HTML file…';
      try {
        const html = await standalone(data(), opts(), title, fileBase);
        const a = h('a', { href: URL.createObjectURL(new Blob([html], { type: 'text/html' })), download: `${fileBase}.html` });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        status.textContent = `Saved ${fileBase}.html. Open it in any browser to play or record the video.`;
      } catch (e) { status.textContent = 'The HTML file couldn’t be made. Check the internet and try again.'; }
      save.disabled = false;
    };
    addEventListener('keydown', onKey);
    document.body.append(overlay);
    if (!all.length) {
      [play, seek, rec, save].forEach((b) => { b.disabled = true; });
      status.textContent = 'These games have no questions to show in a video yet.';
      return;
    }
    status.textContent = 'Loading the heroes…';
    [play, seek, rec, save].forEach((b) => { b.disabled = true; });
    const every = { games: all.map((g) => ({ cards: SEJ.slides.cardsOf(g) })) };
    Promise.all([loadAssets(appUrls(every)), loadFonts()]).then(([a]) => { assets = a; if (overlay.isConnected) build(); });
  }

  SEJ.video = { open, VideoEngine };
})();
