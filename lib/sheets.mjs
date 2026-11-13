/* A small table store on Google Sheets, used as the app's database.
   Each table is one tab (created on first use, with a header row). Rows are arrays of text.
   With SEJ_MEMORY_STORE=1 the tables live in memory instead, for tests. */
import crypto from 'node:crypto';
import { getCache } from '@vercel/functions';

const SHEET = process.env.GOOGLE_SHEET_ID || '';
const EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
const KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
const MEMORY = process.env.SEJ_MEMORY_STORE === '1';

export const TABLES = {
  SEJ_Content: ['code', 'updatedAt', 'json1', 'json2', 'json3', 'json4', 'json5', 'json6'],
  SEJ_Batches: ['code', 'name', 'open', 'createdAt', 'active'],
  SEJ_Students: ['batch', 'studentId', 'name', 'joinedAt'],
  /* Pictures pasted into the game editor: one row each, the image as base64 text split over d1..d4. */
  SEJ_Images: ['id', 'type', 'at', 'd1', 'd2', 'd3', 'd4'],
  SEJ_Scores: ['batch', 'studentId', 'name', 'hero', 'lesson', 'game', 'title', 'score', 'stars', 'at', 'seconds'],
};
export const available = MEMORY || !!(SHEET && EMAIL && KEY);
export const ADMIN_PIN = process.env.ADMIN_PIN || '1010';

const mem = Object.fromEntries(Object.keys(TABLES).map((t) => [t, []]));
let token = null, tokenUntil = 0, tabsReady = null;

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function getToken() {
  if (token && Date.now() < tokenUntil) return token;
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: EMAIL, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3300 })}`;
  const jwt = `${head}.${crypto.createSign('RSA-SHA256').update(head).sign(KEY).toString('base64url')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('google sign-in failed');
  token = j.access_token;
  tokenUntil = Date.now() + 50 * 60 * 1000;
  return token;
}
async function api(path, method = 'GET', body) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET}${path}`, {
    method, headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const e = new Error(`sheets ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}
/* What each tab is for. Written to the SEJ_Guide tab so anyone opening the sheet understands it. */
const GUIDE = [
  ['Hero Quest database', 'The game site reads and writes these tabs. Please don’t rename tabs, reorder columns or edit the header rows.'],
  ['', ''],
  ['Tab', 'What it holds'],
  ['SEJ_Content', 'One row per lesson that an admin changed: which games are on the map, created games and edits. Clear a row to reset that lesson.'],
  ['SEJ_Batches', 'One row per batch link. "open" lists the unlocked lessons. "active" is 1 while the link works, 0 after the batch is removed.'],
  ['SEJ_Students', 'One row per student who joined a batch, with the name and student ID they typed.'],
  ['SEJ_Scores', 'One row per student per game: the first try only. The leaderboard adds these up; on equal points, fewer seconds ranks higher. Delete a row to let a student score that game again.'],
  ['SEJ_Images', 'Pictures pasted into the game editor, kept as text (base64). Games show them through api/image?id=… Don’t edit these cells by hand.'],
  ['', ''],
  ['Columns', ''],
  ...Object.entries(TABLES).map(([t, cols]) => [t, cols.join('  |  ')]),
];
const HEADER_LOOK = { backgroundColor: { red: 0.31, green: 0.25, blue: 0.53 }, horizontalAlignment: 'LEFT', textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } };

/* Makes the sheet ready: every tab exists, row 1 of each is the right header, and the headers are frozen and styled.
   A tab whose first row is data (no header) gets a header row inserted above it, so nothing is lost.
   Returns what it found and fixed. */
async function prepare(force) {
  const report = { created: [], fixed: [], ok: [] };
  const names = Object.keys(TABLES);
  let meta = await api('?fields=sheets.properties(title,sheetId,gridProperties.frozenRowCount)');
  const have = () => new Map(meta.sheets.map((s) => [s.properties.title, s.properties]));
  const missing = names.filter((t) => !have().has(t));
  const wantGuide = force && !have().has('SEJ_Guide');
  if (missing.length || wantGuide) {
    await api(':batchUpdate', 'POST', { requests: [...missing, ...(wantGuide ? ['SEJ_Guide'] : [])].map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) });
    meta = await api('?fields=sheets.properties(title,sheetId,gridProperties.frozenRowCount)');
    report.created = missing;
  }
  const tabs = have();
  const first = await api(`/values:batchGet?${names.map((t) => `ranges=${encodeURIComponent(`${t}!1:1`)}`).join('&')}`);
  const insert = [], write = [], style = [];
  names.forEach((t, i) => {
    const row = ((first.valueRanges[i] || {}).values || [[]])[0].map((x) => String(x).trim());
    const want = TABLES[t];
    const same = want.every((c, k) => row[k] === c);
    const isHeader = row[0] === want[0];
    if (!same) {
      /* Data in row 1 with no header: push it down a row first. */
      if (row.some(Boolean) && !isHeader) insert.push({ insertDimension: { range: { sheetId: tabs.get(t).sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, inheritFromBefore: false } });
      write.push({ range: `${t}!A1`, values: [want] });
      if (!report.created.includes(t)) report.fixed.push(t);
    } else report.ok.push(t);
    if (!same || force || (tabs.get(t).gridProperties || {}).frozenRowCount !== 1) {
      const id = tabs.get(t).sheetId;
      style.push(
        { updateSheetProperties: { properties: { sheetId: id, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        { repeatCell: { range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: want.length }, cell: { userEnteredFormat: HEADER_LOOK }, fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)' } },
        /* Everything is stored as plain text, so IDs like 00123 keep their zeros and long JSON stays on one line. */
        { repeatCell: { range: { sheetId: id, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: want.length }, cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' }, wrapStrategy: 'CLIP' } }, fields: 'userEnteredFormat(numberFormat,wrapStrategy)' } },
        { updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: 0, endIndex: want.length }, properties: { pixelSize: 150 }, fields: 'pixelSize' } });
    }
  });
  if (insert.length) await api(':batchUpdate', 'POST', { requests: insert });
  if (write.length) await api('/values:batchUpdate', 'POST', { valueInputOption: 'RAW', data: write });
  if (force && tabs.has('SEJ_Guide')) {
    const id = tabs.get('SEJ_Guide').sheetId;
    await api('/values:batchUpdate', 'POST', { valueInputOption: 'RAW', data: [{ range: 'SEJ_Guide!A1', values: GUIDE }] });
    style.push(
      { repeatCell: { range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, cell: { userEnteredFormat: HEADER_LOOK }, fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)' } },
      { repeatCell: { range: { sheetId: id, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }, cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } }, fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)' } },
      { updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 170 }, fields: 'pixelSize' } },
      { updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 760 }, fields: 'pixelSize' } });
  }
  if (style.length) await api(':batchUpdate', 'POST', { requests: style });
  return report;
}
/* Runs once per server start, before the first read or write. */
function ensureTabs() {
  if (!tabsReady) tabsReady = prepare(false).catch((e) => { tabsReady = null; throw e; });
  return tabsReady;
}
/* The admin's "Check the database" button: checks and repairs everything, restyles the headers, and counts the rows. */
export async function setup() {
  if (MEMORY) return { created: [], fixed: [], ok: Object.keys(TABLES), counts: Object.fromEntries(Object.keys(TABLES).map((t) => [t, mem[t].length])) };
  const report = await prepare(true);
  tabsReady = Promise.resolve();
  const got = await api(`/values:batchGet?${Object.keys(TABLES).map((t) => `ranges=${encodeURIComponent(`${t}!A2:A`)}`).join('&')}`);
  report.counts = Object.fromEntries(Object.keys(TABLES).map((t, i) => [t, ((got.valueRanges[i] || {}).values || []).filter((r) => r[0]).length]));
  return report;
}

/* All rows of a table, without the header. Each row also carries its sheet row number as row._n. */
export async function rows(table) {
  if (MEMORY) return mem[table].map((r, i) => Object.assign(r.slice(), { _n: i + 2 }));
  await ensureTabs();
  const j = await api(`/values/${table}!A2:Z?majorDimension=ROWS`);
  return (j.values || []).map((r, i) => Object.assign(r.map((x) => String(x)), { _n: i + 2 }));
}
/* One row found by its first cell, without reading the whole table (the picture table is large). */
export async function findRow(table, id) {
  if (MEMORY) return mem[table].find((r) => r[0] === id) || null;
  await ensureTabs();
  const ids = (await api(`/values/${table}!A2:A?majorDimension=COLUMNS`)).values;
  const at = ids && ids[0] ? ids[0].indexOf(id) : -1;
  if (at < 0) return null;
  const got = await api(`/values/${table}!A${at + 2}:Z${at + 2}`);
  return ((got.values || [])[0] || []).map((x) => String(x));
}
export async function append(table, row) {
  const values = row.map((x) => (x === undefined || x === null ? '' : String(x)));
  if (MEMORY) { mem[table].push(values); return; }
  await ensureTabs();
  await api(`/values/${table}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', { values: [values] });
}
/* Replaces one row (n is the sheet row number from rows()). The row is padded so old cells are cleared. */
export async function update(table, n, row) {
  const width = Math.max(TABLES[table].length, row.length);
  const values = Array.from({ length: width }, (_, i) => (row[i] === undefined || row[i] === null ? '' : String(row[i])));
  if (MEMORY) { mem[table][n - 2] = values; return; }
  await ensureTabs();
  await api(`/values/${table}!A${n}?valueInputOption=RAW`, 'PUT', { values: [values] });
}

export const reply = (body, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': cache, 'x-robots-tag': 'noindex' },
});
/* Slows down PIN guessing: 5 wrong tries lock that address for a minute. Returns seconds to wait, or 0. */
export async function pinGuard(request, wrong) {
  const cache = getCache({ namespace: 'sej-admin' });
  const who = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = `tries:${who}`;
  const now = Date.now();
  const t = (await cache.get(key)) || { n: 0, until: 0 };
  if (t.until > now) return Math.ceil((t.until - now) / 1000);
  if (wrong) {
    const n = t.n + 1;
    await cache.set(key, n >= 5 ? { n: 0, until: now + 60000 } : { n, until: 0 }, { ttl: 3600 });
  }
  return 0;
}
/* Reads a JSON body and checks the admin PIN. Returns { body } or { error: Response }. */
export async function adminBody(request, maxBytes = 1024 * 1024) {
  const text = await request.text();
  if (text.length > maxBytes) return { error: reply({ error: 'too large' }, 413) };
  let body;
  try { body = JSON.parse(text); } catch (e) { return { error: reply({ error: 'bad json' }, 400) }; }
  const wait = await pinGuard(request, false);
  if (wait) return { error: reply({ error: 'wait', wait }, 429) };
  if (!body || body.pin !== ADMIN_PIN) {
    const locked = await pinGuard(request, true);
    return { error: reply({ error: 'pin', wait: locked || undefined }, 401) };
  }
  return { body };
}
