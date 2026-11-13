/* Auto-format: turns content pasted in almost any shape into the line format of the chosen game type.
   No AI. It only rearranges what was pasted: numbering and bullets are dropped, table columns, dashes
   and colons become " | ", multiple-choice blocks (a) b) c) with "Answer: b") become one line, and so on.
   SEJ.autoFormat(type, text) returns { text, notes } where notes say what it had to decide by itself. */
(function () {
  'use strict';
  const EMOJI = /^(?:\p{Extended_Pictographic}|️|‍|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[0-9#*]️?⃣)+$/u;
  const tidy = (s) => String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim();
  const same = (a, b) => tidy(a).toLowerCase() === tidy(b).toLowerCase();
  const words = (s) => tidy(s).split(' ').filter(Boolean).length;
  const BULLET = /^\s*(?:(?:Q(?:uestion)?\s*)?\d{1,3}\s*[.):]\s*|Q\s*[:.)]\s*|[•●▪◦‣·]\s*|[-–—*]\s+)/i;
  const unbullet = (s) => tidy(String(s).replace(BULLET, ''));
  const OPTION = /^\s*(?:[\[(]([A-Ea-e])[\])]\.?|([A-Ea-e])[.)])\s+(.*)$/;
  const ANSWER = /^\s*(?:the\s+)?(?:correct\s+)?(?:ans(?:wer)?|key)\s*(?:is)?\s*[:=-]\s*(.+)$/i;
  const MARK_START = /^\s*(?:\*+|✓|✔|✅|\[x\])\s*/i;
  const MARK_END = /\s*(?:\*+|✓|✔|✅|\((?:correct|right|answer)\)|\[(?:correct|right|answer)\])\s*$/i;
  const GAP = /_{2,}|\.{3,}|…+|-{3,}/;
  const YES = /^(?:true|t|yes|y|correct|right|pair|match|✓|✔|✅|👍)$/i;
  const NO = /^(?:false|f|no|n|incorrect|wrong|no pair|not a pair|no match|✗|✘|❌|x|👎)$/i;

  /* Lines of the paste, with "Explanation: ..." lines folded into the line above as a >> note. Blank lines are kept. */
  function pre(text) {
    const out = [];
    for (const raw of String(text).replace(/\r/g, '').replace(/[   ]/g, ' ').replace(/[｜¦]/g, '|').split('\n')) {
      const m = raw.match(/^\s*(?:explanation|reason|because|note|hint)\s*[:-]\s*(.+)$/i);
      const last = out.length - 1;
      if (m && last >= 0 && out[last].trim() && !out[last].includes('>>')) out[last] = `${out[last]} >> ${tidy(m[1])}`;
      else out.push(raw);
    }
    return out;
  }
  const cut = (line) => { const i = line.indexOf('>>'); return i < 0 ? [line, ''] : [line.slice(0, i), tidy(line.slice(i + 2))]; };
  /* One line as cells. Tabs (from a table) and | split everywhere; otherwise the first " - ", ":" or arrow splits once. */
  function cellsOf(main) {
    let c;
    if (main.includes('\t')) c = main.split(/\t+/);
    else if (main.includes('|')) c = main.split('|');
    else {
      const body = main.replace(BULLET, '');
      const q = body.indexOf('?');
      const after = q > 0 ? body.slice(q + 1).replace(/^[\s:=–—-]+/, '') : '';
      if (after.trim()) c = [body.slice(0, q + 1), after];
      else {
        const m = body.match(/\s+(?:[-–—=]+>?|→|⇒)\s+|\s*(?:→|=>|->|⇒)\s*|\s*:\s+|\s+=\s*/);
        c = m && m.index > 0 ? [body.slice(0, m.index), body.slice(m.index + m[0].length)] : [body];
      }
    }
    c = c.map(tidy);
    c[0] = unbullet(c[0]);
    while (c.length > 1 && !c[c.length - 1]) c.pop();
    return c;
  }
  const rowsOf = (lines) => lines.filter((l) => l.trim()).map((l) => { const [main, note] = cut(l); return { cells: cellsOf(main), note, raw: tidy(l) }; }).filter((r) => r.cells[0] || r.cells.length > 1);
  const line = (cells, note) => `${cells.map((x) => tidy(x)).join(' | ').replace(/(?: \| )+$/, '')}${note ? ` >> ${note}` : ''}`;
  const popEmoji = (list) => (list.length > 1 && (EMOJI.test(list[list.length - 1]) || /^img:[a-z0-9]{10}$/.test(list[list.length - 1])) ? list.pop() : '');
  const splitList = (s) => { const a = s.split(/\s*;\s*/).filter(Boolean); return a.length > 1 ? a : s.split(/\s*,\s*|\s+\/\s+/).filter(Boolean); };

  /* ---------- multiple-choice blocks ---------- */
  function unmark(s) {
    let t = String(s), on = false;
    if (MARK_START.test(t)) { on = true; t = t.replace(MARK_START, ''); }
    if (MARK_END.test(t)) { on = true; t = t.replace(MARK_END, ''); }
    return [tidy(t), on];
  }
  /* Finds questions written over several lines with options, or with the options inline: "… ? a) x b) y". */
  function blocks(lines) {
    const has = lines.some((l) => OPTION.test(l.replace(MARK_START, '')) || ANSWER.test(l));
    const inline = lines.some((l) => /\s[\[(]?[aA][\])]\s+\S.*\s[\[(]?[bB][\])]\s+\S/.test(l));
    const groups = [];
    let g = [];
    lines.forEach((l) => { if (l.trim()) g.push(l); else if (g.length) { groups.push(g); g = []; } });
    if (g.length) groups.push(g);
    const stacked = !has && !inline && groups.length >= 2 && groups.every((x) => x.length >= 3 && !x.some((l) => /[|\t]/.test(l)));
    if (!has && !inline && !stacked) return null;
    const items = [];
    let cur = null;
    const start = (q, note) => { cur = { q: unbullet(q), options: [], right: -1, answer: '', note: note || '' }; items.push(cur); };
    const add = (text) => { const [t, on] = unmark(text); if (!t) return; cur.options.push(t); if (on) cur.right = cur.options.length - 1; };
    for (const group of stacked ? groups : [lines.filter((l) => l.trim())]) {
      if (stacked) cur = null;
      for (const raw of group) {
        const [main, note] = cut(raw);
        const a = main.match(ANSWER);
        if (a && cur) { cur.answer = tidy(a[1]).replace(/[.)]+$/, ''); if (note) cur.note = note; continue; }
        const marked = MARK_START.test(main);
        const o = main.replace(MARK_START, '').match(OPTION);
        if (o && cur) { add((marked ? '*' : '') + o[3]); if (note) cur.note = note; continue; }
        if (stacked && cur) { add(main); if (note) cur.note = note; continue; }
        if (/\s[\[(]?[aA][\])]\s+\S.*\s[\[(]?[bB][\])]\s+\S/.test(main)) {
          const parts = main.split(/\s+[\[(]?[A-Ea-e][\])]\s+/);
          start(parts[0], note);
          const tail = parts[parts.length - 1].match(/^(.*?)\s*(?:ans(?:wer)?|key)\s*[:=-]\s*(.+)$/i);
          if (tail) { parts[parts.length - 1] = tail[1]; cur.answer = tidy(tail[2]); }
          parts.slice(1).forEach(add);
          continue;
        }
        start(main, note);
      }
    }
    const out = [];
    for (const it of items) {
      if (!it.q) continue;
      if (it.answer) {
        const letter = it.answer.match(/^[\[(]?([A-Ea-e])[\])]?\.?$/);
        if (letter && it.options.length) it.right = letter[1].toLowerCase().charCodeAt(0) - 97;
        else { const k = it.options.findIndex((x) => same(x, it.answer.replace(/^[\[(]?[A-Ea-e][\]).]\s+/, ''))); if (k >= 0) it.right = k; else { it.options.unshift(it.answer); it.right = 0; } }
      }
      const guessed = it.right < 0 || it.right >= it.options.length;
      if (guessed) it.right = 0;
      out.push({ q: it.q, right: it.options[it.right] || '', wrong: it.options.filter((_, k) => k !== it.right), note: it.note, emoji: '', guessed: guessed && it.options.length > 1 });
    }
    return out.length ? out : null;
  }
  /* Question, right answer and wrong answers from any shape of line. */
  function questions(lines, notes) {
    const b = blocks(lines);
    if (b) { if (b.some((i) => i.guessed)) notes.push('No answer was marked for some questions, so the first choice is used as the right answer. Check them.'); return b; }
    return rowsOf(lines).map((r) => {
      const c = r.cells.slice();
      const q = c.shift();
      const emoji = popEmoji(c);
      let opts = c.flatMap((x) => x.split(/\s*;\s*/)).filter(Boolean);
      if (c.length === 1 && opts.length === 1) { const l = splitList(opts[0]); if (l.length > 1 && l.every((x) => words(x) <= 4)) opts = l; }
      let right = 0;
      opts = opts.map((o, k) => { const [t, on] = unmark(o); if (on) right = k; return t; });
      return { q, right: opts[right] || '', wrong: opts.filter((_, k) => k !== right), note: r.note, emoji };
    }).filter((i) => i.q);
  }
  /* Gives a question wrong answers when it has none (or too few), using the right answers of the other questions. */
  function fillWrong(items, need, max, notes) {
    const pool = [...new Set(items.map((i) => i.right).filter(Boolean))];
    let borrowed = false;
    items.forEach((it) => {
      const seen = new Set([it.right.toLowerCase()]);
      it.wrong = it.wrong.filter((w) => w && !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase()));
      const want = it.wrong.length ? need.min : need.empty;
      const at = pool.indexOf(it.right);
      for (let j = 1; it.wrong.length < want && j <= pool.length; j++) { const c = pool[(at + j) % pool.length]; if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); it.wrong.push(c); borrowed = true; } }
      it.wrong = it.wrong.slice(0, max);
    });
    if (borrowed) notes.push('Some questions had no wrong answers, so answers from the other questions are used as the wrong choices.');
  }

  /* ---------- one formatter per family of game types ---------- */
  const quiz = (need, max, withEmoji) => (lines, notes) => {
    const items = questions(lines, notes).filter((i) => i.right);
    fillWrong(items, need, max, notes);
    return items.map((i) => line([i.q, i.right, i.wrong.join('; '), withEmoji ? i.emoji : ''], i.note));
  };
  function blank(lines, notes) {
    const items = questions(lines, notes).map((i) => {
      let s = i.q, right = i.right, wrong = i.wrong.slice();
      const braces = s.match(/\{(.+?)\}/);
      const hint = s.match(/\s*\(([^()]*[\/,][^()]*)\)\s*([.!?]?)\s*$/);
      if (!braces && hint && GAP.test(s)) { const l = hint[1].split(/\s*[\/,]\s*/).filter(Boolean); s = tidy(s.replace(hint[0], hint[2] || '')); if (!right) right = l.shift(); wrong = wrong.concat(l); }
      if (braces) { wrong = [right, ...wrong].filter(Boolean); right = braces[1]; }
      else {
        const wrapped = s.match(/\[([^\]]+)\]|\*\*(.+?)\*\*|\*(.+?)\*|__(\S.*?\S|\S)__|\(([^()\/,]+)\)/);
        if (wrapped && !GAP.test(s)) { const w = wrapped.slice(1).find(Boolean); wrong = [right, ...wrong].filter(Boolean); right = tidy(w); s = s.replace(wrapped[0], `{${right}}`); }
        else if (GAP.test(s) && right) s = s.replace(GAP, `{${right}}`);
        else if (right) {
          const at = s.search(new RegExp(`(^|[^\\p{L}])${right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu'));
          if (at < 0) return null;
          const from = s.toLowerCase().indexOf(right.toLowerCase(), at);
          s = `${s.slice(0, from)}{${s.slice(from, from + right.length)}}${s.slice(from + right.length)}`;
        } else return null;
      }
      return { q: tidy(s), right: tidy(right), wrong: wrong.map(tidy).filter((w) => w && !same(w, right)), note: i.note, emoji: i.emoji };
    });
    if (items.some((i) => !i)) notes.push('Some lines have no blank and no answer, so they were left out. Write the answer in {braces} or use ___ and add the answer.');
    const ok = items.filter(Boolean);
    fillWrong(ok, { min: 1, empty: 2 }, 3, notes);
    return ok.map((i) => line([i.q, i.wrong.join('; '), i.emoji], i.note));
  }
  /* Types that take a list: "a, b, c" on one line becomes one item per line. */
  function listed(rows) {
    const out = [];
    rows.forEach((r) => {
      const l = r.cells.length === 1 ? splitList(r.cells[0]) : [];
      if (l.length > 2 && l.every((x) => words(x) <= 4)) l.forEach((x) => out.push({ cells: [unbullet(x)], note: '' }));
      else out.push(r);
    });
    return out;
  }
  const lettersOnly = (s) => tidy(String(s).replace(/[^A-Za-z ]+/g, ' '));
  const isWord = (s) => /^[A-Za-z]+$/.test(tidy(s));
  /* columns: how many cells the type reads. kind decides which way round two cells go. */
  const columns = (n, kind) => (lines, notes) => {
    const b = kind !== 'list' && blocks(lines);
    let rows = b ? b.map((i) => ({ cells: [i.q, i.right], note: i.note })) : rowsOf(lines);
    if (kind === 'list' || kind === 'word' || kind === 'letters') rows = listed(rows);
    return rows.map((r) => {
      let c = r.cells.slice();
      const emoji = popEmoji(c);
      if (c.length >= 2) {
        const [a, z] = c;
        if ((kind === 'word' || kind === 'letters') && !isWord(a) && isWord(z)) c = [z, a, ...c.slice(2)];
        if (kind === 'word' && words(a) > 1 && words(z) === 1 && isWord(z)) c = [z, a, ...c.slice(2)];
        if (kind === 'answer' && words(a) === 1 && words(z) > 2) c = [z, a, ...c.slice(2)];
      }
      if (kind === 'word' || kind === 'letters') c[0] = lettersOnly(c[0]);
      if (kind === 'word') c[0] = c[0].replace(/ /g, '');
      c = c.slice(0, emoji ? n - 1 : n);
      if (emoji) { while (c.length < n - 1) c.push(''); c.push(emoji); }
      return c[0] ? line(c, r.note) : '';
    }).filter(Boolean);
  };
  function sentences(lines) {
    const out = [];
    lines.filter((l) => l.trim()).forEach((l) => {
      const [main, note] = cut(l);
      if (main.includes('|')) { out.push(line(main.split('|'), note)); return; }
      const parts = unbullet(main.replace(/\t+/g, ' ')).split(/(?<=[.!?])\s+(?=["“']?[A-Z])/).map(tidy).filter((s) => words(s) >= 2);
      parts.forEach((s, k) => out.push(line([s], k === parts.length - 1 ? note : '')));
    });
    return out;
  }
  function sort(lines, notes) {
    const live = lines.filter((l) => l.trim());
    if (live.some((l) => l.trim().startsWith('#'))) return live.map((l) => { const [m, n] = cut(l); return l.trim().startsWith('#') ? `# ${line(cellsOf(m.replace(/^\s*#\s*/, '')))}` : line(cellsOf(m), n); });
    const emit = (groups) => groups.map((g) => `# ${g.name} | `).concat(groups.flatMap((g, k) => g.items.map((i) => `${i} | ${k + 1}`)));
    const items = (s) => { const l = splitList(s); return (l.length > 1 ? l : [s]).map(unbullet).filter(Boolean); };
    /* "Group: a, b, c" on each line */
    const colon = live.map((l) => l.match(/^\s*([^:|\t]{1,40}?)\s*[:\t|]\s*(.+)$/));
    if (live.length >= 2 && live.length <= 3 && colon.every((m) => m && splitList(m[2]).length > 1)) return emit(colon.map((m) => ({ name: unbullet(m[1]), items: items(m[2]) })));
    /* a heading, then its items, with a blank line between groups */
    const groups = [];
    let g = null;
    lines.forEach((l) => { if (!l.trim()) { g = null; return; } if (!g) { g = { name: unbullet(l).replace(/\s*:\s*$/, ''), items: [] }; groups.push(g); } else g.items.push(...items(l)); });
    if (groups.length >= 2 && groups.length <= 3 && groups.every((x) => x.items.length)) return emit(groups);
    /* "item | group" on each line */
    const rows = rowsOf(lines).filter((r) => r.cells.length >= 2);
    const names = [...new Set(rows.map((r) => r.cells[1].toLowerCase()))];
    if (rows.length >= 2 && names.length >= 2 && names.length <= 3) {
      const numeric = names.every((n) => /^[1-3]$/.test(n));
      const order = numeric ? names.slice().sort() : names;
      const label = (n) => (numeric ? `Group ${n}` : rows.find((r) => r.cells[1].toLowerCase() === n).cells[1]);
      if (numeric) notes.push('The groups had no names, so they are called Group 1, Group 2. Rename them on the # lines.');
      return order.map((n) => `# ${label(n)} | `).concat(rows.map((r) => line([r.cells[0], order.indexOf(r.cells[1].toLowerCase()) + 1, r.cells[2] || ''], r.note)));
    }
    return null;
  }
  const verdict = (cells) => {
    const c = cells.slice();
    const emoji = popEmoji(c);
    let v = null;
    if (c.length > 1 && (YES.test(c[c.length - 1]) || NO.test(c[c.length - 1]))) v = YES.test(c.pop());
    else if (c.length === 1) {
      const m = c[0].match(/^(.*?)[\s(\[:–—-]+(true|false|yes|no|correct|incorrect|right|wrong|t|f|✓|✔|✅|✗|✘|❌)[)\].]*$/i);
      if (m && words(m[1]) >= 1) { c[0] = tidy(m[1]); v = YES.test(m[2]); }
    }
    return { c, v, emoji };
  };
  function trueFalse(lines, notes) {
    let missing = false;
    const out = lines.filter((l) => l.trim()).map((l) => {
      if (l.trim().startsWith('#')) return tidy(l);
      const [main, note] = cut(l);
      const { c, v, emoji } = verdict(cellsOf(main).length > 1 ? cellsOf(main) : [unbullet(main)]);
      if (v === null) { missing = true; return ''; }
      return line([c.join(' '), v ? 'yes' : 'no', emoji], note);
    }).filter(Boolean);
    if (missing) notes.push('Some lines didn’t say true or false, so they were left out. Add “| yes” or “| no”.');
    return out;
  }
  function pair(lines) {
    return rowsOf(lines).map((r) => {
      /* Already "first | second | yes or no | emoji | emoji": keep it. */
      if (r.cells.length >= 3 && (YES.test(r.cells[2]) || NO.test(r.cells[2]))) return line([r.cells[0], r.cells[1], YES.test(r.cells[2]) ? 'yes' : 'no', ...r.cells.slice(3, 5)], r.note);
      let { c, v, emoji } = verdict(r.cells);
      if (c.length === 1) c = c[0].split(/\s*(?:\+|&|\/)\s*|\s+and\s+/i).map(tidy).filter(Boolean);
      if (c.length < 2) return '';
      return line([c[0], c[1], v === false ? 'no' : 'yes', ...(emoji ? [emoji] : c.slice(2, 4))], r.note);
    }).filter(Boolean);
  }
  function whack(lines) {
    const out = [];
    let sign = '', prompt = '';
    const GOOD = /^(?:right|correct|good|yes|true|tap(?: these)?|hit|polite|✓|✔|✅)\b/i, BAD = /^(?:wrong|incorrect|bad|no|not|false|don[’']?t(?: tap)?|avoid|impolite|✗|✘|❌)\b/i;
    lines.filter((l) => l.trim()).forEach((l) => {
      const s = l.trim();
      if (s[0] === '#') { prompt = tidy(s.slice(1)); return; }
      if (/^[+]\s*\S/.test(s)) { out.push(`+ ${tidy(s.slice(1))}`); return; }
      if (/^[-–—]\s+\S/.test(s) && !sign) { out.push(`- ${tidy(s.slice(1))}`); return; }
      const mark = s.match(/^(✓|✔|✅|✗|✘|❌)\s*(.+)$/);
      if (mark) { out.push(`${/[✓✔✅]/.test(mark[1]) ? '+' : '-'} ${tidy(mark[2])}`); return; }
      const head = s.match(/^([^:|\t]{1,40}?)\s*:\s*(.*)$/);
      if (head && (GOOD.test(head[1]) || BAD.test(head[1]))) {
        sign = BAD.test(head[1]) ? '-' : '+';
        splitList(head[2]).map(unbullet).filter(Boolean).forEach((x) => out.push(`${sign} ${x}`));
        return;
      }
      const c = cellsOf(s);
      if (c.length > 1 && (YES.test(c[1]) || NO.test(c[1]))) { out.push(`${YES.test(c[1]) ? '+' : '-'} ${c[0]}`); return; }
      if (GOOD.test(s) || BAD.test(s)) { if (words(s) <= 3) { sign = BAD.test(s) ? '-' : '+'; return; } }
      if (!sign && !out.length && !prompt && /[!:]$|^(?:tap|hit|whack|find|choose)\b/i.test(s)) { prompt = s.replace(/:$/, ''); return; }
      if (sign) splitList(unbullet(s)).forEach((x) => out.push(`${sign} ${x}`));
    });
    return out.length ? (prompt ? [`# ${prompt}`] : []).concat(out) : null;
  }
  function talk(lines) {
    return rowsOf(lines).map((r) => {
      const c = r.cells.slice();
      if (c.length >= 3) return line(c.slice(0, 3), r.note);
      if (c.length === 2) { const w = c[1].replace(/[.!?]+$/, '').split(' '); return line([c[0], w.length > 1 ? `${w.slice(0, -1).join(' ')} ___.` : '___.', c[1]], r.note); }
      return '';
    }).filter(Boolean);
  }
  function rank(lines) {
    const out = [];
    lines.filter((l) => l.trim()).forEach((l) => {
      if (l.trim()[0] === '#') { out.push(tidy(l)); return; }
      const [main, note] = cut(l);
      const steps = main.split(/\s*(?:→|=>|->|⇒|>)\s*/).filter((x) => x.trim());
      const parts = steps.length > 2 ? steps : (() => { const s = splitList(unbullet(main)); return s.length > 2 ? s : [main]; })();
      parts.forEach((x, k) => out.push(line([unbullet(x)], k === parts.length - 1 ? note : '')));
    });
    return out;
  }
  function labelled(lines, notes) {
    const live = lines.filter((l) => l.trim());
    let pic = '';
    const rows = [];
    live.forEach((l) => {
      const s = l.trim();
      if (s[0] === '#') { pic = tidy(s.slice(1)); return; }
      if (!pic && (/^(https?:\/\/\S+|img:[a-z0-9]{10})$/.test(s) || EMOJI.test(s))) { pic = s; return; }
      rows.push(...listed(rowsOf([l])));
    });
    const need = rows.filter((r) => !(Number(r.cells[1]) >= 0 && r.cells[1] !== '' && Number(r.cells[2]) >= 0 && r.cells[2] !== undefined && r.cells[2] !== ''));
    if (need.length) notes.push('The labels had no positions, so they are spread over the picture. Change the two numbers (across, down: 0 to 100) to move each one.');
    if (!pic) { pic = '🖼️'; notes.push('No picture was given. Put an emoji or a picture link after # on the first line.'); }
    return [`# ${pic}`].concat(rows.map((r, k) => {
      if (!need.includes(r)) return line(r.cells.slice(0, 3), r.note);
      const n = Math.max(rows.length, 2);
      return line([r.cells[0], k % 2 ? 72 : 28, Math.round(18 + (64 * k) / (n - 1))], r.note);
    }));
  }
  function maths(lines) {
    const s = lines.join(' ').toLowerCase();
    if (/operations\s*:/.test(s)) return lines.filter((l) => l.trim()).map((l) => `# ${tidy(l.replace(/^\s*#\s*/, ''))}`);
    const ops = [[/add|plus|sum|\+/, '+'], [/subtract|minus|take away|(?:^|\s)-(?:\s|$)/, '-'], [/multipl|times|×|(?:^|\s)[x*](?:\s|$)/, 'x'], [/divi|÷|(?:^|\s)\/(?:\s|$)/, '÷']].filter(([r]) => r.test(s)).map(([, o]) => o);
    const range = s.match(/(\d{1,3})\s*(?:to|-|–|and)\s*(\d{1,3})/);
    const upto = s.match(/(?:up to|under|within|below)\s*(\d{1,3})/);
    const count = s.match(/(\d{1,2})\s*(?:questions|sums|problems|items)/);
    const from = range ? Number(range[1]) : 1, to = Math.min(100, range ? Number(range[2]) : upto ? Number(upto[1]) : 10);
    return [`# operations: ${(ops.length ? ops : ['+']).join(' ')}`, `# numbers: ${Math.min(from, to)} ${to}`, `# questions: ${count ? Math.min(30, Math.max(2, Number(count[1]))) : 8}`, `# answers in words: ${/in words|as words/.test(s) ? 'yes' : 'no'}`];
  }

  const FAMILY = {
    quiz: quiz({ min: 1, empty: 2 }, 3, true), boxes: quiz({ min: 1, empty: 2 }, 3, true), winlose: quiz({ min: 1, empty: 2 }, 3, true),
    imagequiz: quiz({ min: 1, empty: 2 }, 3, false), maze: quiz({ min: 1, empty: 2 }, 3, false), plane: quiz({ min: 2, empty: 2 }, 2, false),
    blank, sort, speedsort: sort, tf: trueFalse, pair, whack, talk, rank, labelled, maths,
    unjumble: sentences, magnets: sentences,
    match: columns(2), pairs: columns(2), fliptiles: columns(2), flash: columns(3),
    find: columns(2, 'answer'), type: columns(3, 'answer'), fruit: columns(3, 'answer'),
    balloonpop: columns(2, 'word1'), crossword: columns(2, 'word'), wordsearch: columns(2, 'word'),
    anagram: columns(3, 'letters'), spell: columns(3, 'letters'), hangman: columns(3, 'letters'),
    speakcards: columns(2, 'list'), wheel: columns(2, 'list'), memorize: columns(2, 'list'),
  };

  SEJ.autoFormat = function (type, text) {
    const notes = [];
    try {
      const out = FAMILY[type] && FAMILY[type](pre(text), notes);
      if (out && out.length) return { text: out.join('\n'), notes };
    } catch (e) { /* content it can't read is left as it was */ }
    return { text: String(text), notes: [] };
  };
})();
