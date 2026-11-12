/* Shared lesson content for the admin panel, kept in the Google Sheet (tab SEJ_Content, one row per lesson).
   GET  returns every lesson's saved changes.
   POST { side: 'login', pin }                 checks the admin PIN.
   POST { side: 'save', pin, code, change }    saves one lesson's changes (change: null resets the lesson).
   POST { side: 'setup', pin }                 checks the sheet: creates missing tabs, repairs header rows, counts rows. */
import { available, rows, append, update, reply, adminBody, setup } from '../lib/sheets.mjs';

const T = 'SEJ_Content';
const CHUNK = 40000; /* a sheet cell holds up to 50,000 characters */
const CODE = /^\d\.\d$/;

async function readAll() {
  const content = {};
  let at = 0;
  for (const r of await rows(T)) {
    if (!CODE.test(r[0] || '')) continue;
    try { content[r[0]] = JSON.parse(r.slice(2).join('')); at = Math.max(at, Number(r[1]) || 0); } catch (e) { /* a broken row is skipped */ }
  }
  return { content, at };
}

export default {
  async fetch(request) {
    if (request.method === 'GET') {
      if (!available) return reply({ shared: false, content: null });
      try {
        const all = await readAll();
        return reply({ shared: true, content: all.content, at: all.at }, 200, 'public, max-age=0, s-maxage=5');
      } catch (e) {
        return reply({ shared: true, content: null, error: e.status === 403 ? 'sheet not shared' : 'read failed' }, 503);
      }
    }
    if (request.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
    const { body, error } = await adminBody(request);
    if (error) return error;
    if (body.side === 'login') return reply({ ok: true, shared: available });
    if (body.side === 'setup') {
      if (!available) return reply({ error: 'no store', shared: false }, 501);
      try { return reply(Object.assign({ ok: true }, await setup())); } catch (e) { return reply({ error: e.status === 403 ? 'sheet not shared' : 'setup failed' }, 503); }
    }
    if (body.side === 'save') {
      if (!available) return reply({ error: 'no store', shared: false }, 501);
      if (!CODE.test(body.code || '')) return reply({ error: 'bad code' }, 400);
      if (body.change !== null && (typeof body.change !== 'object' || Array.isArray(body.change))) return reply({ error: 'bad content' }, 400);
      try {
        const json = body.change ? JSON.stringify(body.change) : '';
        if (json.length > CHUNK * 6) return reply({ error: 'too large' }, 413);
        const chunks = json.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) || [];
        const existing = (await rows(T)).find((r) => r[0] === body.code);
        const at = Date.now();
        const row = body.change ? [body.code, at, ...chunks] : ['', at];
        if (existing) await update(T, existing._n, row);
        else if (body.change) await append(T, row);
        return reply({ ok: true, at });
      } catch (e) {
        return reply({ error: e.status === 403 ? 'sheet not shared' : 'save failed' }, 503);
      }
    }
    return reply({ error: 'bad side' }, 400);
  },
};
