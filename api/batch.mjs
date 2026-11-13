/* Batches: a teacher's group of students with its own link, unlocked lessons and leaderboard.
   Stored in the Google Sheet (tabs SEJ_Batches, SEJ_Students, SEJ_Scores).
   Students:  GET ?code=X            the batch's name and unlocked lessons
              GET ?code=X&side=board the leaderboard
              POST join / score
   Admin (PIN): POST create / list / open / remove
   Only a student's first try at each game counts on the leaderboard. */
import { getCache } from '@vercel/functions';
import { available, rows, append, update, reply, adminBody } from '../lib/sheets.mjs';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE = /^[A-HJKMNP-Z2-9]{6}$/;
const SID = /^[A-Za-z0-9-]{1,20}$/;
const LESSON = /^\d\.\d$/;
const cleanName = (raw) => String(raw || '').replace(/[^\p{L}\p{M}' .-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);
const cache = () => getCache({ namespace: 'sej-batch' });
const fail = (e) => reply({ error: e.status === 403 ? 'sheet not shared' : 'database failed' }, 503);

async function findBatch(code) {
  const r = (await rows('SEJ_Batches')).find((x) => x[0] === code && x[4] !== '0');
  if (!r) return null;
  let open = [];
  try { open = JSON.parse(r[2] || '[]'); } catch (e) { /* treated as all locked */ }
  return { code: r[0], name: r[1], open, createdAt: Number(r[3]) || 0, _n: r._n };
}
/* First tries only, added up per student. More points ranks higher; on equal points, less total time does. */
async function board(code) {
  const seen = new Set();
  const by = new Map();
  const all = (await rows('SEJ_Scores')).filter((r) => r[0] === code).sort((a, b) => Number(a[9]) - Number(b[9]));
  for (const r of all) {
    const key = `${r[1]}|${r[4]}|${r[5]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = by.get(r[1]) || { id: r[1], name: r[2], hero: r[3], score: 0, stars: 0, games: 0, time: 0, last: 0 };
    s.name = r[2] || s.name;
    s.hero = r[3] || s.hero;
    s.score += Number(r[7]) || 0;
    s.stars += Number(r[8]) || 0;
    s.games += 1;
    s.time += Number(r[10]) || 0;
    s.last = Math.max(s.last, Number(r[9]) || 0);
    by.set(r[1], s);
  }
  /* Students who joined but haven't played yet appear with 0. */
  for (const r of (await rows('SEJ_Students')).filter((x) => x[0] === code)) if (!by.has(r[1])) by.set(r[1], { id: r[1], name: r[2], hero: '', score: 0, stars: 0, games: 0, time: 0, last: 0 });
  return [...by.values()].sort((a, b) => b.score - a.score || (b.games > 0) - (a.games > 0) || a.time - b.time || a.last - b.last).map(({ last, ...s }, i) => ({ ...s, rank: i + 1 }));
}

export default {
  async fetch(request) {
    if (!available) return reply({ error: 'no database' }, 501);
    try {
      if (request.method === 'GET') {
        const url = new URL(request.url);
        const code = url.searchParams.get('code') || '';
        if (!CODE.test(code)) return reply({ error: 'bad code' }, 400);
        const batch = await findBatch(code);
        if (!batch) return reply({ error: 'not found' }, 404);
        if (url.searchParams.get('side') === 'board') return reply({ name: batch.name, rows: await board(code), at: Date.now() }, 200, 'public, max-age=0, s-maxage=4');
        return reply({ code, name: batch.name, open: batch.open }, 200, 'public, max-age=0, s-maxage=4');
      }
      if (request.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
      const peek = await request.clone().text();
      if (peek.length > 20000) return reply({ error: 'too large' }, 413);
      let body;
      try { body = JSON.parse(peek); } catch (e) { return reply({ error: 'bad json' }, 400); }

      /* ---------- students ---------- */
      if (body.side === 'join' || body.side === 'score') {
        const name = cleanName(body.name);
        if (!CODE.test(body.code || '') || !SID.test(body.id || '') || !name) return reply({ error: 'bad student' }, 400);
        const batch = await findBatch(body.code);
        if (!batch) return reply({ error: 'not found' }, 404);
        const id = String(body.id).toUpperCase();
        if (body.side === 'join') {
          const students = (await rows('SEJ_Students')).filter((r) => r[0] === batch.code);
          const mine = students.find((r) => r[1] === id);
          if (!mine) {
            if (students.length >= 300) return reply({ error: 'full' }, 409);
            await append('SEJ_Students', [batch.code, id, name, Date.now()]);
          }
          const done = (await rows('SEJ_Scores')).filter((r) => r[0] === batch.code && r[1] === id).map((r) => `${r[4]}:${r[5]}`);
          return reply({ ok: true, name: mine ? mine[2] : name, batch: { code: batch.code, name: batch.name, open: batch.open }, done: [...new Set(done)] });
        }
        const game = String(body.game || '').slice(0, 24);
        if (!LESSON.test(body.lesson || '') || !/^[a-z0-9]{1,24}$/i.test(game)) return reply({ error: 'bad game' }, 400);
        if (!batch.open.includes(body.lesson)) return reply({ error: 'locked' }, 403);
        const key = `done:${batch.code}:${id}:${body.lesson}:${game}`;
        if (await cache().get(key)) return reply({ counted: false });
        const already = (await rows('SEJ_Scores')).some((r) => r[0] === batch.code && r[1] === id && r[4] === body.lesson && r[5] === game);
        if (!already) {
          const score = Math.max(0, Math.min(5000, Math.round(Number(body.score) || 0)));
          const stars = Math.max(0, Math.min(3, Math.round(Number(body.stars) || 0)));
          const hero = ['mathman', 'bhasha', 'knight', 'innovara'].includes(body.hero) ? body.hero : '';
          await append('SEJ_Scores', [batch.code, id, name, hero, body.lesson, game, String(body.title || '').slice(0, 60), score, stars, Date.now(), Math.max(0, Math.min(36000, Math.round(Number(body.time) || 0)))]);
        }
        await cache().set(key, 1, { ttl: 86400 });
        return reply({ counted: !already });
      }

      /* ---------- admin ---------- */
      const { body: admin, error } = await adminBody(request);
      if (error) return error;
      if (admin.side === 'list') {
        const students = await rows('SEJ_Students');
        const list = (await rows('SEJ_Batches')).filter((r) => r[4] !== '0' && CODE.test(r[0])).map((r) => {
          let open = [];
          try { open = JSON.parse(r[2] || '[]'); } catch (e) { /* all locked */ }
          return { code: r[0], name: r[1], open, createdAt: Number(r[3]) || 0, students: students.filter((s) => s[0] === r[0]).length };
        });
        return reply({ batches: list.sort((a, b) => b.createdAt - a.createdAt) });
      }
      if (admin.side === 'create') {
        const name = String(admin.name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (!name) return reply({ error: 'name needed' }, 400);
        const taken = new Set((await rows('SEJ_Batches')).map((r) => r[0]));
        let code = '';
        do { code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CHARS[b % CHARS.length]).join(''); } while (taken.has(code));
        const open = Array.isArray(admin.open) ? admin.open.filter((c) => LESSON.test(c)) : ['1.1'];
        await append('SEJ_Batches', [code, name, JSON.stringify(open), Date.now(), '1']);
        return reply({ ok: true, batch: { code, name, open, students: 0 } });
      }
      if (admin.side === 'open' || admin.side === 'remove') {
        const batch = CODE.test(admin.code || '') && await findBatch(admin.code);
        if (!batch) return reply({ error: 'not found' }, 404);
        if (admin.side === 'remove') await update('SEJ_Batches', batch._n, [batch.code, batch.name, JSON.stringify(batch.open), batch.createdAt, '0']);
        else {
          const open = [...new Set((Array.isArray(admin.open) ? admin.open : []).filter((c) => LESSON.test(c)))].sort();
          await update('SEJ_Batches', batch._n, [batch.code, batch.name, JSON.stringify(open), batch.createdAt, '1']);
        }
        return reply({ ok: true });
      }
      return reply({ error: 'bad side' }, 400);
    } catch (e) {
      return fail(e);
    }
  },
};
