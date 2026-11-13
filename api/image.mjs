/* Pictures for games, kept in the Google Sheet (tab SEJ_Images) so every student sees the same picture.
   GET  ?id=abc123            the picture itself (cached for a long time; a picture never changes).
   POST { pin, data }         admin only: data is a data:image/…;base64 URL, already made small by the editor. Returns { id }. */
import crypto from 'node:crypto';
import { available, append, findRow, reply, adminBody } from '../lib/sheets.mjs';

const T = 'SEJ_Images';
const CELL = 45000; /* a sheet cell holds up to 50,000 characters */
const MAX = CELL * 4;
const ID = /^[a-z0-9]{10}$/;
const DATA = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+=*)$/;

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      const id = new URL(request.url).searchParams.get('id') || '';
      if (!ID.test(id)) return reply({ error: 'bad id' }, 400);
      if (!available) return reply({ error: 'no store' }, 501);
      try {
        const row = await findRow(T, id);
        if (!row) return reply({ error: 'not found' }, 404, 'public, max-age=60');
        return new Response(Buffer.from(row.slice(3).join(''), 'base64'), { headers: { 'content-type': row[1], 'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable', 'x-content-type-options': 'nosniff' } });
      } catch (e) { return reply({ error: 'read failed' }, 503); }
    }
    if (request.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
    const { body, error } = await adminBody(request, MAX + 2000);
    if (error) return error;
    if (!available) return reply({ error: 'no store', shared: false }, 501);
    const m = DATA.exec(String(body.data || ''));
    if (!m) return reply({ error: 'bad image' }, 400);
    if (m[2].length > MAX) return reply({ error: 'too large' }, 413);
    try {
      const id = crypto.randomBytes(8).toString('hex').replace(/[^a-z0-9]/g, '').slice(0, 10).padEnd(10, '0');
      await append(T, [id, m[1], Date.now(), ...(m[2].match(new RegExp(`.{1,${CELL}}`, 'g')) || [])]);
      return reply({ ok: true, id });
    } catch (e) { return reply({ error: e.status === 403 ? 'sheet not shared' : 'save failed' }, 503); }
  },
};
