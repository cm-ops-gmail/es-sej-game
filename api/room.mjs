/* Phone-to-TV relay for Class Battle.
   A room has a teacher code and a student code worked out from it, so a student can't get from theirs to the teacher's.
     teacher code: state (written by the TV, read by the teacher) and cmds (the reverse)
     student code: feed (written by the TV, has no answers until reveal) and player slots (written by students)
   Senders repeat a message until the TV confirms it, so a lost write or an emptied cache
   only causes a short delay. No database or setup is needed. */
import { createHash } from 'node:crypto';
import { getCache } from '@vercel/functions';

const TTL = 4 * 60 * 60;
const MAX_BODY = 64 * 1024;
const MAX_STUDENT_BODY = 1024;
const CODE = /^[A-HJKMNP-Z2-9]{6}$/;
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SLOTS = 24;

const joinCode = (code) => Array.from(createHash('sha256').update(`join:${code}`).digest().subarray(0, 6), (b) => CHARS[b % CHARS.length]).join('');
const slotOf = (client) => {
  let n = 0;
  for (const ch of client) n = (n * 31 + ch.charCodeAt(0)) % 9973;
  return n % SLOTS;
};
const reply = (body, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': cache, 'x-robots-tag': 'noindex' },
});

export default {
  async fetch(request) {
    const cache = getCache({ namespace: 'class-battle' });
    const now = Date.now();
    const readState = async (code) => (await cache.get(`${code}:state`)) || { state: null, at: 0 };
    const readFeed = async (code) => (await cache.get(`${code}:feed`)) || null;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const code = url.searchParams.get('code') || '';
      const side = url.searchParams.get('side');
      if (!CODE.test(code)) return reply({ error: 'bad code' }, 400);
      if (side === 'tv') return reply({ cmds: (await cache.get(`${code}:cmds`)) || null, now });
      /* However many students are watching, the server only does this read about once a second. */
      if (side === 'feed') return reply({ feed: await readFeed(code), now }, 200, 'public, max-age=0, s-maxage=1');
      if (side === 'players') {
        const slots = await Promise.all(Array.from({ length: SLOTS }, (_, i) => cache.get(`${joinCode(code)}:p${i}`)));
        return reply({ players: slots.filter(Boolean), now });
      }
      return reply({ ...(await readState(code)), now });
    }

    if (request.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
    const text = await request.text();
    if (text.length > MAX_BODY) return reply({ error: 'too large' }, 413);
    let body;
    try { body = JSON.parse(text); } catch (e) { return reply({ error: 'bad json' }, 400); }
    const code = body && body.code;
    if (typeof code !== 'string' || !CODE.test(code)) return reply({ error: 'bad code' }, 400);

    if (body.side === 'tv') {
      if (!body.state || typeof body.state !== 'object') return reply({ error: 'bad state' }, 400);
      await cache.set(`${code}:state`, { state: body.state, at: now }, { ttl: TTL });
      /* The student feed can only be written with the teacher code. */
      if (body.feed && typeof body.feed === 'object') await cache.set(`${joinCode(code)}:feed`, body.feed, { ttl: TTL });
      return reply({ ok: true, now });
    }
    if (body.side === 'phone') {
      if (typeof body.client !== 'string' || !Array.isArray(body.cmds) || body.cmds.length > 40) return reply({ error: 'bad cmds' }, 400);
      await cache.set(`${code}:cmds`, { client: body.client.slice(0, 16), list: body.cmds }, { ttl: TTL });
      return reply({ ...(await readState(code)), now });
    }
    if (body.side === 'student') {
      if (text.length > MAX_STUDENT_BODY) return reply({ error: 'too large' }, 413);
      if (typeof body.client !== 'string' || !/^[a-z0-9]{4,16}$/.test(body.client) || !body.msg || typeof body.msg !== 'object') return reply({ error: 'bad message' }, 400);
      await cache.set(`${code}:p${slotOf(body.client)}`, { client: body.client, msg: body.msg }, { ttl: TTL });
      return reply({ feed: await readFeed(code), now });
    }
    return reply({ error: 'bad side' }, 400);
  },
};
