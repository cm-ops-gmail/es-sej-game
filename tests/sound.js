/* Checks the music and sound effects: every song and every effect makes sound, none of them clips,
   the music sits under the effects, and no page errors. Saves each one as a .wav to listen to.
   Usage: node tests/sound.js <url> <output-dir>   (run tests/dev-server.js first) */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8124';
const OUT = process.argv[3] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name} ${extra}`); } };

/* 16-bit stereo WAV from two channels of floats. */
function wav(l, r, rate = 44100) {
  const n = l.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), 44 + i * 4); b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), 46 + i * 4); }
  return b;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/index.html?test=1`);
  await p.waitForFunction(() => window.SEJ && SEJ.musicRender);
  const measure = (fn, args) => p.evaluate(async ([fn, args]) => {
    const [l, r] = await SEJ[fn](...args);
    let peak = 0, sum = 0, bad = false;
    for (let i = 0; i < l.length; i++) { const v = Math.max(Math.abs(l[i]), Math.abs(r[i])); if (!Number.isFinite(v)) bad = true; if (v > peak) peak = v; sum += l[i] * l[i]; }
    return { peak, rms: Math.sqrt(sum / l.length), bad, l: Array.from(l), r: Array.from(r) };
  }, [fn, args]);

  const songs = await p.evaluate(() => SEJ.musicSongs());
  check('there are songs', songs.length >= 4, songs.join(','));
  const musicRms = [];
  for (const s of songs) {
    const m = await measure('musicRender', [s, 14]);
    fs.writeFileSync(`${OUT}/music-${s}.wav`, wav(m.l, m.r));
    console.log(`song ${s.padEnd(8)} peak ${m.peak.toFixed(2)}  rms ${m.rms.toFixed(3)}`);
    check(`song ${s} makes sound`, m.rms > 0.01, m.rms);
    check(`song ${s} does not clip`, m.peak < 0.98 && !m.bad, m.peak);
    musicRms.push(m.rms);
  }
  const effects = ['tap', 'select', 'tick', 'correct', 'wrong', 'sparkle', 'coin', 'streak', 'drumroll', 'pop', 'whoosh', 'star', 'applause', 'boing', 'wow', 'cheer', 'fanfare'];
  let peaks = [];
  for (const e of effects) {
    const m = await measure('sfxRender', [e, [], 2.6]);
    fs.writeFileSync(`${OUT}/sfx-${e}.wav`, wav(m.l, m.r));
    console.log(`sfx  ${e.padEnd(9)} peak ${m.peak.toFixed(2)}`);
    check(`effect ${e} makes sound`, m.peak > 0.02, m.peak);
    check(`effect ${e} does not clip`, m.peak < 0.98 && !m.bad, m.peak);
    peaks.push(m.peak);
  }
  const loudest = Math.max(...musicRms), quietSfx = peaks.filter((x) => x > 0.07).length;
  check('the music sits under the effects', loudest < 0.12, loudest);
  check('most effects are clearly heard', quietSfx === effects.length, quietSfx);
  check('no page errors', errors.length === 0, errors.join(' | '));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
  await b.close();
})();
