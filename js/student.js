/* Student Play: a student scans the QR, types a name, picks a team and answers on their own phone.
   The TV checks every answer. This page never receives the right answer before the reveal. */
(function () {
  'use strict';
  const { h, sfx, fx } = SEJ;
  const API = 'api/room';
  const POLL = 2500;

  const makeClient = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('');
  const loadMe = (join) => {
    try {
      const saved = JSON.parse(localStorage.getItem(`sej-join-${join}`) || 'null');
      if (saved && saved.client) return saved;
    } catch (e) { /* new player */ }
    return { client: makeClient(), name: SEJ.store.state.name || '', team: null, answers: {} };
  };
  const saveMe = (join, me) => {
    try { localStorage.setItem(`sej-join-${join}`, JSON.stringify(me)); } catch (e) { /* storage blocked */ }
  };

  function codeEntry(root, message) {
    const input = h('input', { class: 'rm-input rm-code', maxlength: '6', placeholder: 'ABC234', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Code on the TV' });
    root.replaceChildren(h('div', { class: 'st-page st-center' }, h('form', { class: 'st-card', onsubmit: (e) => {
      e.preventDefault();
      const code = SEJ.relay.cleanCode(input.value);
      if (code.length === 6) location.hash = `#/join/${code}`;
    } },
      h('h1', { class: 'st-title', text: '🙋 Join the game' }),
      h('p', { class: 'st-note', text: message || 'Type the code on the class TV.' }),
      input,
      h('button', { class: 'cta gummy g-green st-wide', type: 'submit' }, 'Join'))));
  }

  SEJ.studentPage = function (root, rawCode) {
    const join = SEJ.relay.cleanCode(rawCode);
    if (join.length !== 6) { codeEntry(root); return () => {}; }
    if (!SEJ.relay.available) { codeEntry(root, 'Student Play only works on the live website.'); return () => {}; }
    const me = loadMe(join);
    let feed = null, alive = true, timer = 0, sending = false, lastSig = '', online = true, celebrated = '', order = [];
    const body = h('main', { class: 'st-body' });
    const netNote = h('p', { class: 'st-net', hidden: true, role: 'status', text: 'Reconnecting…' });
    const page = h('div', { class: 'st-page' }, netNote, body);
    root.replaceChildren(page);

    const mine = () => (feed && feed.players ? feed.players[me.client] : null);
    const message = () => {
      const msg = { name: me.name, team: me.team };
      if (feed && feed.qid && me.answers[feed.qid] !== undefined) { msg.qid = feed.qid; msg.value = me.answers[feed.qid]; }
      return msg;
    };
    /* Still needs sending: the TV hasn't confirmed this player or this answer. */
    const unconfirmed = () => {
      if (!feed || !feed.open || !me.name || (feed.mode === 'teams' && me.team === null)) return false;
      const p = mine();
      if (!p || p.t !== (feed.mode === 'teams' ? me.team : p.t)) return true;
      return !!feed.qid && !feed.revealed && me.answers[feed.qid] !== undefined && !p.a;
    };
    const take = (res) => {
      online = true;
      netNote.hidden = true;
      if (res.feed) feed = res.feed;
      paint();
    };
    const offline = () => { if (online) { online = false; netNote.hidden = false; } };
    const send = async () => {
      if (sending || !alive) return;
      sending = true;
      try {
        const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: join, side: 'student', client: me.client, msg: message() }) });
        if (!r.ok) throw new Error(`relay ${r.status}`);
        take(await r.json());
      } catch (e) { offline(); }
      sending = false;
    };
    const loop = async () => {
      if (!alive) return;
      if (!document.hidden) {
        try {
          const r = await fetch(`${API}?code=${join}&side=feed`);
          if (!r.ok) throw new Error(`relay ${r.status}`);
          take(await r.json());
        } catch (e) { offline(); }
        if (unconfirmed()) await send();
      }
      /* A little random, so a whole class doesn't send at the same moment. */
      if (alive) timer = setTimeout(loop, (SEJ.testMode ? 300 : POLL) + Math.random() * (SEJ.testMode ? 200 : 900));
    };
    const answer = (value) => {
      if (!feed || !feed.qid || me.answers[feed.qid] !== undefined || feed.revealed) return;
      me.answers = { [feed.qid]: value };
      saveMe(join, me);
      sfx.pop();
      SEJ.buzz(25);
      paint();
      send();
    };

    /* ---------- screens ---------- */
    function nameForm() {
      const input = h('input', { class: 'onb-input', id: 'st-name', maxlength: '14', placeholder: 'Type your name', value: me.name, autocomplete: 'off', 'aria-label': 'Your name', enterkeyhint: 'next' });
      const form = h('form', { class: 'st-card enter-pop', onsubmit: (e) => {
        e.preventDefault();
        const name = SEJ.cleanName(input.value);
        if (!name) { fx.play(form, 'shake'); input.focus(); return; }
        me.name = name;
        saveMe(join, me);
        sfx.correct(1);
        lastSig = '';
        paint();
        send();
      } },
        h('h1', { class: 'st-title', text: 'What’s your name?' }),
        h('p', { class: 'st-note', lang: 'bn', text: 'তোমার নাম লেখো' }),
        input,
        h('button', { class: 'cta gummy g-green st-wide', type: 'submit' }, 'Next ▶'));
      return form;
    }
    function teamPicker() {
      return h('div', { class: 'st-stack' },
        h('h1', { class: 'st-title st-light', text: `Hi ${me.name}! Pick a team` }),
        feed.teams.map((t, i) => h('button', {
          class: 'st-team-btn enter-pop', style: { '--team': t.color }, 'data-team': i,
          onclick: () => { me.team = i; saveMe(join, me); sfx.fanfare(); lastSig = ''; paint(); send(); },
        }, h('span', { class: 'st-team-dot' }), t.name)));
    }
    function scoreBar() {
      const p = mine();
      const team = feed.mode === 'teams' && feed.teams[me.team];
      return h('header', { class: 'st-bar', style: { '--team': team ? team.color : '#7b2ff7' } },
        h('b', { text: team ? `Team ${team.name}` : me.name }),
        h('span', { class: 'st-my-score' }, `⭐ ${p ? p.s : 0}`));
    }
    function waiting(title, note) {
      return h('div', { class: 'st-card st-wait' }, SEJ.sticker('📺', 'st-art'), h('h1', { class: 'st-title', text: title }), note && h('p', { class: 'st-note', text: note }));
    }
    function result(chosen) {
      const heard = chosen !== undefined;
      const right = heard && chosen === feed.right;
      const key = `${feed.qid}`;
      if (celebrated !== key) {
        celebrated = key;
        if (right) { sfx.correct(2); SEJ.buzz([40, 40, 80]); fx.confetti(50); } else if (heard) { sfx.boing(); }
      }
      return h('div', { class: `st-card st-result ${right ? 'good' : ''}`, role: 'status' },
        SEJ.sticker(right ? '🎉' : heard ? '💪' : '👀', 'st-art'),
        h('h1', { class: 'st-title', text: right ? 'Correct! +1' : heard ? 'Good try!' : 'Answer' }),
        h('p', { class: 'st-right', text: feed.right }));
    }
    function orderInput() {
      const tiles = feed.tiles;
      const finish = () => {
        lastSig = '';
        if (order.length === tiles.length) answer(order.map((i) => tiles[i]).join(feed.joiner || ''));
        else paint();
      };
      const place = (i, before) => {
        order = order.filter((x) => x !== i);
        const at = order.indexOf(before);
        if (at >= 0) order.splice(at, 0, i); else order.push(i);
        sfx.tap();
        finish();
      };
      const tile = (i, placed) => {
        const el = h('button', { class: `st-tile ${placed ? 'placed' : ''}`, 'data-tile': i, text: tiles[i] });
        SEJ.tapOrDrag(el, placed ? '.st-built,.st-tiles,.st-tile.placed' : '.st-built,.st-tile.placed', (target) => {
          if (placed && (!target || target.classList.contains('st-tiles'))) {
            order = order.filter((x) => x !== i);
            sfx.tap();
            lastSig = '';
            return paint();
          }
          return place(i, target && target.classList.contains('st-tile') ? Number(target.dataset.tile) : undefined);
        });
        return el;
      };
      const left = tiles.map((_, i) => i).filter((i) => !order.includes(i));
      return h('div', { class: 'st-stack' },
        h('p', { class: 'st-note st-light', text: feed.joiner ? 'Drag or tap the words in order' : 'Drag or tap the letters in order' }),
        h('div', { class: 'st-built', 'aria-label': 'Your answer' }, order.map((i) => tile(i, true))),
        h('div', { class: 'st-tiles' }, left.map((i) => tile(i, false))));
    }
    function stageScreen() {
      const chosen = me.answers[feed.qid];
      const parts = [scoreBar()];
      if (feed.speak) {
        parts.push(h('div', { class: 'st-card' },
          SEJ.sticker('🗣️', 'st-art'),
          feed.prompt ? h('h1', { class: 'st-title', text: feed.prompt }) : h('h1', { class: 'st-title', text: 'Look at the TV!' }),
          feed.frame && h('p', { class: 'st-frame', text: feed.frame }),
          h('p', { class: 'st-note', text: 'Say it out loud!' })));
        return parts;
      }
      if (feed.revealed) { parts.push(result(chosen)); return parts; }
      if (chosen !== undefined) {
        parts.push(waiting('Answer locked! ✓', 'Watch the TV for the answer.'));
        return parts;
      }
      parts.push(h('p', { class: `st-prompt ${feed.kind === 'flash' ? 'bn' : ''} ${feed.kind === 'letters' ? 'st-letters' : ''}`, text: feed.prompt || '' }));
      if (feed.kind === 'order') parts.push(orderInput());
      else {
        const colors = ['g-pink', 'g-blue', 'g-orange', 'g-green'];
        parts.push(h('div', { class: 'st-options' }, (feed.options || []).map((o, i) => h('button', {
          class: `st-option gummy ${colors[i % 4]}`, hidden: (feed.hidden || []).includes(o), onclick: () => answer(o),
        }, o))));
      }
      return parts;
    }
    function podium() {
      const p = mine();
      const ranked = feed.mode === 'teams' ? feed.teams.slice().sort((a, b) => b.score - a.score) : [];
      return h('div', { class: 'st-card' },
        SEJ.sticker('🏆', 'st-art'),
        h('h1', { class: 'st-title', text: 'Well played!' }),
        h('p', { class: 'st-right', text: `You scored ${p ? p.s : 0} ⭐` }),
        ranked.length ? h('ol', { class: 'st-rank' }, ranked.map((t) => h('li', {}, h('b', { text: t.name }), ` ${t.score}`))) : null);
    }
    function screen() {
      if (!feed) return waiting('Connecting…', 'Looking for your class game.');
      if ((feed.kicked || []).includes(me.client)) return waiting('You’ve left this game', 'Ask your teacher if this is a mistake.');
      if (!feed.open) return waiting('Not open yet', 'Your teacher will open the game soon.');
      if (!me.name) return nameForm();
      if (feed.mode === 'teams' && (me.team === null || !feed.teams[me.team])) return teamPicker();
      if (feed.full && !mine()) return waiting('This game is full', 'Play along with a friend!');
      if (feed.screen === 'podium') return podium();
      if (feed.screen === 'stage') return stageScreen();
      const team = feed.mode === 'teams' ? feed.teams[me.team] : null;
      return h('div', { class: 'st-card st-wait' },
        SEJ.sticker('🎉', 'st-art'),
        h('h1', { class: 'st-title', text: mine() ? `You’re in, ${me.name}!` : 'Joining…' }),
        team && h('p', { class: 'st-right', style: { color: team.color }, text: `Team ${team.name}` }),
        h('p', { class: 'st-note', text: 'Watch the TV. The game starts soon.' }));
    }
    function paint() {
      const p = mine();
      const sig = JSON.stringify([
        feed && [feed.open, feed.screen, feed.mode, feed.qid, feed.revealed, feed.hidden, feed.teams, feed.prompt, (feed.kicked || []).includes(me.client), feed.full],
        p && [p.s, p.a, p.t], me.name, me.team, feed && feed.qid ? me.answers[feed.qid] : null,
      ]);
      if (sig === lastSig) return;
      /* Don't clear what a student is typing, or a half-built answer, on a score update. */
      const typing = document.activeElement && document.activeElement.id === 'st-name';
      if (typing && !me.name) return;
      if (feed && feed.qid !== page.dataset.qid) { order = []; page.dataset.qid = feed.qid || ''; }
      lastSig = sig;
      const out = screen();
      body.replaceChildren(...[].concat(out).filter(Boolean));
    }
    paint();
    loop();
    const wake = SEJ.keepAwake();
    if (SEJ.testMode) SEJ.studentDebug = { me, getFeed: () => feed };
    return () => { alive = false; clearTimeout(timer); wake(); };
  };
})();
