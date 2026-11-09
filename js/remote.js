/* Class Battle teacher controls and the link between phone and TV.
   The same control panel runs on the teacher's phone and in the TV's Controls drawer. */
(function () {
  'use strict';
  const { h, sfx } = SEJ;
  const API = 'api/room';
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  const timeout = () => (window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(14000) : undefined);
  const post = (body) => fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: timeout() })
    .then((r) => { if (r.status === 401) { const e = new Error('pin'); e.pin = true; throw e; } if (!r.ok) throw new Error(`relay ${r.status}`); return r.json(); });
  const get = (code, side, since, pin) => fetch(`${API}?code=${code}&side=${side}${since === undefined ? '' : `&since=${since}`}`, { cache: 'no-store', headers: pin ? { 'x-teacher-pin': pin } : {}, signal: timeout() })
    .then((r) => { if (r.status === 401) { const e = new Error('pin'); e.pin = true; throw e; } if (!r.ok) throw new Error(`relay ${r.status}`); return r.json(); });

  SEJ.relay = {
    available: /^https?:$/.test(location.protocol),
    newCode() {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    },
    cleanCode: (raw) => String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
    /* The student code comes from the teacher code one way only. api/room.mjs works it out the same way. */
    async joinCode(code) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`join:${code}`));
      return Array.from(new Uint8Array(hash).slice(0, 6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    },
    /* Only the server knows the PIN. Returns ok, or how many tries are left, or how long to wait. */
    async checkPin(code, pin) {
      const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, side: 'pin', pin }), signal: timeout() });
      const res = await r.json().catch(() => ({}));
      return { ok: r.ok && !!res.ok, left: res.left, wait: res.wait };
    },

    /* TV side: sends its state and collects commands from the phone. */
    tv({ code, getState, getFeed, onCmds, onPlayers, wantsPlayers, onStatus }) {
      let alive = true, timer = 0, playerTimer = 0, pushTimer = 0, beat = 0, pushing = false, dirty = true, stamp = 0;
      const push = async () => {
        if (!alive) return;
        if (pushing) { dirty = true; return; }
        pushing = true; dirty = false;
        try { await post({ code, side: 'tv', state: getState(), feed: getFeed() }); onStatus(true); } catch (e) { dirty = true; onStatus(false); }
        pushing = false;
        if (dirty && alive) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 120); }
      };
      /* Waits on the server until the phone sends something, so taps arrive quickly. */
      const loop = async () => {
        if (!alive) return;
        let delay = 40;
        try {
          const res = await get(code, 'tv', stamp);
          onStatus(true);
          if (res.cmds) {
            stamp = res.cmds.t || 0;
            onCmds(res.cmds);
          }
        } catch (e) { onStatus(false); delay = 1500; }
        if (alive) timer = setTimeout(loop, delay);
      };
      const players = async () => {
        if (!alive) return;
        if (wantsPlayers()) {
          try {
            const list = await get(code, 'players');
            if (list.players) onPlayers(list.players);
          } catch (e) { /* the next round tries again */ }
        }
        if (alive) playerTimer = setTimeout(players, 1000);
      };
      loop();
      players();
      beat = setInterval(push, 15000);
      push();
      return {
        changed() { dirty = true; clearTimeout(pushTimer); pushTimer = setTimeout(push, 40); },
        stop() { alive = false; clearTimeout(timer); clearTimeout(playerTimer); clearTimeout(pushTimer); clearInterval(beat); },
      };
    },

    /* Phone side: keeps sending each command until the TV confirms it. */
    phone({ code, pin, onState, onStatus, onPinRejected }) {
      const client = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(36)).join('').slice(0, 10);
      let alive = true, timer = 0, retry = 0, seq = 0, pending = [], sending = false, tvAt = 0, skew = 0, lastJson = '';
      const receive = (res) => {
        skew = res.now - Date.now();
        tvAt = res.at || 0;
        if (res.state) {
          const acked = (res.state.acks && res.state.acks[client]) || 0;
          pending = pending.filter((c) => c.seq > acked);
          const json = JSON.stringify(res.state);
          if (json !== lastJson) { lastJson = json; onState(res.state, pending); }
          else onState(null, pending);
        }
        onStatus({ net: true, tv: !!tvAt && Date.now() + skew - tvAt < 45000 });
      };
      const failed = (e) => {
        if (e && e.pin) { alive = false; onPinRejected(); return; }
        onStatus({ net: false, tv: false });
      };
      const flush = async () => {
        if (sending || !pending.length || !alive) return;
        sending = true;
        try { receive(await post({ code, side: 'phone', pin, client, cmds: pending })); } catch (e) { failed(e); }
        sending = false;
        clearTimeout(retry);
        if (pending.length && alive) retry = setTimeout(flush, 500);
      };
      const loop = async () => {
        if (!alive) return;
        let delay = 40;
        if (document.hidden) delay = 1500;
        else {
          try { receive(await get(code, 'phone', tvAt, pin)); } catch (e) { failed(e); delay = 1500; }
        }
        if (alive) timer = setTimeout(loop, delay);
      };
      loop();
      return {
        send(cmd) {
          pending.push(Object.assign({ seq: ++seq }, cmd));
          onState(null, pending);
          flush();
        },
        stop() { alive = false; clearTimeout(timer); clearTimeout(retry); },
      };
    },
  };

  /* ---------- teacher PIN ---------- */
  SEJ.pinPad = function ({ code, title, note, onOk, onCancel }) {
    let entry = '', busy = false;
    const dots = h('div', { class: 'pin-dots', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => h('i')));
    const msg = h('p', { class: 'pin-msg', role: 'status', text: note || 'Enter the teacher PIN to control the game.' });
    const box = h('div', { class: 'pin-card' });
    const showDots = () => Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i < entry.length));
    const submit = async () => {
      busy = true;
      msg.textContent = 'Checking…';
      let res;
      try { res = await SEJ.relay.checkPin(code, entry); } catch (e) { res = { ok: false, offline: true }; }
      busy = false;
      if (res.ok) { sfx.correct(1); SEJ.buzz(30); onOk(entry); return; }
      entry = '';
      showDots();
      sfx.wrong();
      SEJ.buzz([40, 40, 40]);
      SEJ.fx.play(dots, 'shake');
      msg.textContent = res.offline ? 'No internet. Check it and try again.' : res.wait ? `Too many tries. Wait ${res.wait} seconds.` : `Wrong PIN.${res.left ? ` ${res.left} tries left.` : ''}`;
    };
    const press = (key) => {
      if (busy) return;
      sfx.tap();
      if (key === 'back') entry = entry.slice(0, -1);
      else if (entry.length < 4) entry += key;
      showDots();
      if (entry.length === 4) submit();
    };
    box.append(
      h('div', { class: 'pin-lock', 'aria-hidden': 'true', text: '🔒' }),
      h('h1', { class: 'pin-title', text: title || 'Teacher PIN' }),
      msg,
      h('div', { role: 'status', 'aria-live': 'polite', class: 'visually-hidden' }),
      dots,
      h('div', { class: 'pin-keys' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((k) => (k
        ? h('button', { class: `pin-key ${k === 'back' ? 'pin-back' : ''}`, 'data-key': k, 'aria-label': k === 'back' ? 'Delete' : k, onclick: () => press(k) }, k === 'back' ? '⌫' : k)
        : h('span')))),
      onCancel && h('button', { class: 'pin-cancel', onclick: onCancel }, 'Cancel'));
    return box;
  };

  /* Keeps the screen on while the class is running. */
  SEJ.keepAwake = function () {
    let lock = null, stopped = false;
    const ask = async () => {
      try { if (navigator.wakeLock && !document.hidden && !stopped) lock = await navigator.wakeLock.request('screen'); } catch (e) { /* not allowed here */ }
    };
    ask();
    document.addEventListener('visibilitychange', ask);
    return () => { stopped = true; document.removeEventListener('visibilitychange', ask); if (lock) lock.release().catch(() => {}); };
  };

  SEJ.clock = (sec) => { const t = Math.max(0, Math.ceil(sec)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

  /* ---------- the control panel ----------
     One screen for running the class: the answer, one big next-step button, and team score tiles.
     Everything else sits behind "More". */
  SEJ.controlPanel = function (container, send) {
    let state = null, pending = [], armed = null, armTimer = 0, navTimer = 0, sheet = null, sentRev = -1, timerAt = 0, moreOpen = false, toastTimer = 0;
    const body = h('div', { class: 'rm-body' });
    const toast = h('div', { class: 'rm-toast', role: 'status', hidden: true });
    container.append(body, toast);

    const tapSend = (cmd) => { SEJ.buzz(12); sfx.tap(); send(cmd); };
    const say = (text) => {
      toast.textContent = text;
      toast.hidden = false;
      SEJ.fx.play(toast, 'jelly');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 1300);
    };
    /* Moving buttons carry the screen they were pressed on, so a double tap can't skip a question. */
    const nav = (type, extra) => {
      if (sentRev === state.rev) return;
      sentRev = state.rev;
      /* If the TV doesn't answer, the button comes back on its own. */
      clearTimeout(navTimer);
      navTimer = setTimeout(() => { sentRev = -1; paint(); }, 4000);
      tapSend(Object.assign({ type, rev: state.rev }, extra));
      paint();
    };
    const twoTap = (id, label, armedLabel, cmd) => h('button', {
      class: `rm-btn ${armed === id ? 'rm-armed' : ''}`,
      onclick: () => {
        if (armed === id) { armed = null; tapSend(cmd); paint(); return; }
        armed = id;
        clearTimeout(armTimer);
        armTimer = setTimeout(() => { armed = null; paint(); }, 3000);
        paint();
      },
    }, armed === id ? armedLabel : label);

    const scoreShown = (team) => {
      const t = team < 0 ? state.classScore : state.teams[team].score;
      return Math.max(0, t + pending.filter((c) => c.type === 'score' && c.team === team).reduce((a, c) => a + c.delta, 0));
    };

    function closeSheet() { if (sheet) sheet.remove(); sheet = null; }
    function openSheet(title, content, onSave) {
      closeSheet();
      sheet = h('div', { class: 'rm-sheet', role: 'dialog', 'aria-label': title },
        h('div', { class: 'rm-sheet-card' },
          h('h2', { text: title }),
          content,
          h('div', { class: 'rm-row' },
            h('button', { class: 'rm-btn', onclick: closeSheet }, 'Cancel'),
            h('button', { class: 'rm-btn rm-go', onclick: () => { onSave(); closeSheet(); } }, 'Save'))));
      container.append(sheet);
    }
    function rosterSheet() {
      const area = h('textarea', { class: 'rm-area', rows: '9', placeholder: 'One name on each line', 'aria-label': 'Student names' });
      area.value = (state.roster || []).join('\n');
      openSheet('Student names', h('div', {}, h('p', { class: 'rm-note', text: 'Saved on the class TV. Used only to pick a student at random.' }), area),
        () => tapSend({ type: 'roster', names: area.value.split('\n') }));
    }
    function namesSheet() {
      const inputs = state.teams.map((t) => h('input', { class: 'rm-input', maxlength: '14', value: t.name, 'aria-label': `Team ${t.name} name` }));
      openSheet('Team names', h('div', { class: 'rm-names' }, inputs), () => inputs.forEach((el, i) => {
        if (el.value.trim() && el.value !== state.teams[i].name) tapSend({ type: 'rename', team: i, name: el.value });
      }));
    }

    function teamChooser() {
      const counts = [[0, 'Class'], [2, '2'], [3, '3'], [4, '4'], [5, '5']];
      const current = state.mode === 'class' ? 0 : state.teams.length;
      return h('div', { class: 'rm-seg', role: 'group', 'aria-label': 'Number of teams' }, counts.map(([n, label]) => h('button', {
        class: current === n ? 'on' : '', 'aria-pressed': current === n ? 'true' : 'false',
        onclick: () => { if (current !== n) tapSend({ type: 'teams', n }); },
      }, label)));
    }
    /* A tile is one big +1 button. The small corner button takes a point back. */
    function scoreTile(team, name, color) {
      return h('div', { class: 'rm-tile', style: { '--team': color } },
        h('button', {
          class: 'rm-plus', 'aria-label': `Give ${name} one point`,
          onclick: () => { tapSend({ type: 'score', team, delta: 1 }); say(`+1 ${name}`); },
        }, h('span', { class: 'rm-tile-name', text: name }), h('b', { class: 'rm-num', text: scoreShown(team) }), h('span', { class: 'rm-tile-add', text: '+1' })),
        h('button', { class: 'rm-minus', 'aria-label': `Take one point from ${name}`, onclick: () => { tapSend({ type: 'score', team, delta: -1 }); say(`−1 ${name}`); } }, '−'));
    }
    function scoreGrid() {
      if (state.mode === 'class') return h('section', { class: 'rm-tiles one' }, scoreTile(-1, 'Whole class', '#7b2ff7'));
      return h('section', { class: `rm-tiles n${state.teams.length}`, 'aria-label': 'Team scores' }, state.teams.map((t, i) => scoreTile(i, t.name, t.color)));
    }
    function studentsCard() {
      const list = Object.entries(state.players || {});
      return h('section', { class: 'rm-card', id: 'rm-students' },
        h('div', { class: 'rm-head' }, h('h2', { text: '🙋 Students play on phones' }),
          h('button', { class: `rm-btn rm-toggle ${state.students ? 'rm-go' : ''}`, id: 'rm-students-toggle', 'aria-pressed': state.students ? 'true' : 'false', onclick: () => tapSend({ type: 'students' }) }, state.students ? 'On' : 'Off')),
        state.students
          ? h('div', { class: 'rm-names' },
            h('p', { class: 'rm-note', text: `${list.length} joined. Code: ${state.join || ''}. Right answers score by themselves.` }),
            h('button', { class: 'rm-link', onclick: () => tapSend({ type: 'joinqr' }) }, state.joinQr ? 'Hide student QR on TV' : 'Show student QR on TV'),
            h('div', { class: 'rm-players' }, list.map(([id, p]) => h('span', { class: 'rm-player' }, `${p.name} · ${p.score}`,
              h('button', { 'aria-label': `Remove ${p.name}`, onclick: () => tapSend({ type: 'kick', client: id }) }, '✕')))))
          : h('p', { class: 'rm-note', text: 'A QR appears on the TV. Students pick a team and answer on their own phones.' }));
    }
    function timerText() {
      if (!state.timer) return '';
      const left = state.timer.running ? state.timer.left - (Date.now() - timerAt) / 1000 : state.timer.left;
      return SEJ.clock(left);
    }
    function pickStudent() { tapSend({ type: 'pick', what: 'student' }); say('Picking on the TV…'); }
    function pickTeam() { tapSend({ type: 'pick', what: 'team' }); say('Picking on the TV…'); }

    function moreSheet() {
      const v = state.view;
      const n = (state.roster || []).length;
      const close = () => { moreOpen = false; paint(); };
      return h('div', { class: 'rm-more', role: 'dialog', 'aria-label': 'More controls' },
        h('div', { class: 'rm-more-card' },
          h('header', { class: 'rm-more-head' }, h('h2', { text: 'More' }), h('button', { class: 'rm-btn rm-small', id: 'rm-more-close', 'aria-label': 'Close', onclick: close }, '✕')),
          state.screen === 'stage' && h('section', { class: 'rm-card' }, h('h2', { text: 'Jump to a round' }), h('div', { class: 'rm-rounds' }, v.rounds.map((r, i) => h('button', {
            class: `rm-btn ${i === state.stage ? 'rm-go' : ''}`, onclick: () => { if (i !== state.stage) { nav('goto', { stage: i }); moreOpen = false; paint(); } },
          }, r)))),
          state.screen !== 'podium' && h('section', { class: 'rm-card' }, h('h2', { text: 'Cheer on the TV' }), h('div', { class: 'rm-row rm-cheers' },
            [['clap', '👏 Clap'], ['fanfare', '🎺 Yay'], ['wow', '🤩 Wow'], ['oops', '😅 Oops']].map(([kind, label]) => h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'cheer', kind }) }, label)))),
          h('section', { class: 'rm-card' },
            h('div', { class: 'rm-head' }, h('h2', { text: 'Teams' }), teamChooser()),
            state.mode === 'teams' && h('button', { class: 'rm-link', onclick: namesSheet }, '✏️ Change team names')),
          state.screen !== 'podium' && h('section', { class: 'rm-card' },
            h('div', { class: 'rm-head' }, h('h2', { text: 'Who answers?' }), h('button', { class: 'rm-link', onclick: rosterSheet }, `Names (${n})`)),
            h('div', { class: 'rm-row' },
              h('button', { class: 'rm-btn rm-pick', id: 'rm-pick-student', disabled: !n, onclick: pickStudent }, n ? '🎲 Random student' : 'Add names first'),
              state.mode !== 'class' && h('button', { class: 'rm-btn rm-pick', id: 'rm-pick-team', onclick: pickTeam }, '🎲 Random team'))),
          studentsCard(),
          h('div', { class: 'rm-row rm-tools' },
            h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'sound' }) }, state.sound ? '🔊 TV sound on' : '🔇 TV sound off'),
            h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'qr' }) }, state.qr ? 'Hide my QR' : 'Show my QR')),
          h('div', { class: 'rm-row rm-tools' },
            state.screen === 'stage' && h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'shuffle' }) }, '🔀 Shuffle'),
            twoTap('restart', '🔄 Restart', 'Tap again: restart', { type: 'restart' }),
            state.screen === 'stage' && twoTap('end', '🏁 End', 'Tap again: end', { type: 'end' }))));
    }

    /* Before the game: three clear steps, then one button. */
    function setupScreen() {
      return [
        h('section', { class: 'rm-card rm-step' }, h('h2', {}, h('span', { class: 'rm-step-n', text: '1' }), 'How many teams?'), teamChooser(),
          state.mode === 'teams' && h('button', { class: 'rm-link', onclick: namesSheet }, '✏️ Change team names')),
        h('section', { class: 'rm-card rm-step' }, h('h2', {}, h('span', { class: 'rm-step-n', text: '2' }), 'How will students answer?'),
          h('div', { class: 'rm-choice' },
            h('button', { class: `rm-btn ${state.students ? '' : 'rm-go'}`, id: 'rm-say-aloud', 'aria-pressed': state.students ? 'false' : 'true', onclick: () => { if (state.students) tapSend({ type: 'students' }); } }, h('b', { text: '🗣️ Out loud' }), h('small', { text: 'You give the points' })),
            h('button', { class: `rm-btn ${state.students ? 'rm-go' : ''}`, id: 'rm-students-toggle', 'aria-pressed': state.students ? 'true' : 'false', onclick: () => { if (!state.students) tapSend({ type: 'students' }); } }, h('b', { text: '🙋 On phones' }), h('small', { text: 'Points add up by themselves' }))),
          state.students && h('p', { class: 'rm-note', id: 'rm-students', text: `${Object.keys(state.players || {}).length} joined. They scan the QR on the TV. Code: ${state.join || ''}` })),
      ];
    }
    function playScreen() {
      const v = state.view;
      const kids = [];
      kids.push(h('div', { class: 'rm-progress', 'aria-hidden': 'true' }, h('i', { style: { width: `${v.total ? Math.round((v.step / v.total) * 100) : 0}%` } })));
      if (v.answer) kids.push(h('section', { class: `rm-answer ${state.revealed ? 'shown' : ''}` }, h('small', { text: state.revealed ? 'Answer on the TV now' : 'Answer (only you can see)' }), h('b', { text: v.answer })));
      else kids.push(h('p', { class: 'rm-tip', text: v.tip }));
      const tools = [];
      if (state.timer && state.timer.total) {
        const run = state.timer.running;
        tools.push(h('button', { class: `rm-btn rm-timer-btn ${run ? 'running' : ''}`, id: 'rm-timer', 'aria-label': run ? 'Pause the timer' : 'Start the timer', onclick: () => tapSend({ type: 'timer', op: run ? 'pause' : 'start' }) },
          run ? '⏸ ' : '⏱️ ', h('b', { class: 'rm-clock', 'data-clock': '1', text: timerText() })));
        tools.push(h('button', { class: 'rm-btn rm-small', 'aria-label': 'Reset the timer', onclick: () => tapSend({ type: 'timer', op: 'reset' }) }, '↺'));
      }
      if (v.canFifty) tools.push(h('button', { class: 'rm-btn rm-fifty', id: 'rm-fifty', disabled: state.hidden.length > 0, onclick: () => tapSend({ type: 'fifty' }) }, '✂️ 50:50'));
      const hasRoster = (state.roster || []).length > 0;
      if (hasRoster || state.mode !== 'class') tools.push(h('button', { class: 'rm-btn rm-pick', id: 'rm-quick-pick', onclick: hasRoster ? pickStudent : pickTeam }, hasRoster ? '🎲 Student' : '🎲 Team'));
      if (tools.length) kids.push(h('div', { class: 'rm-row rm-quick' }, tools));
      if (v.boxes) {
        kids.push(h('div', { class: 'rm-boxes', 'aria-label': 'Boxes' }, v.boxes.map((b) => h('button', { class: `rm-box ${b.used ? 'used' : ''}`, disabled: b.used, onclick: () => nav('box', { n: b.n }) }, String(b.n + 1)))));
      }
      if (state.picked) kids.push(h('p', { class: 'rm-picked' }, '🎤 ', h('b', { text: state.picked.name })));
      if (state.students) kids.push(h('p', { class: 'rm-note rm-count' }, `🙋 ${state.answered || 0} of ${Object.keys(state.players || {}).length} answered`));
      return kids;
    }
    function podiumScreen() {
      const ranked = state.mode === 'teams' ? state.teams.slice().sort((a, b) => b.score - a.score) : [];
      return [
        h('section', { class: 'rm-card rm-final' }, h('h2', { text: '🏆 Final scores' }),
          ranked.length ? ranked.map((t) => h('p', { class: 'rm-final-row' }, h('span', { text: t.name }), h('b', { text: t.score })))
            : h('p', { class: 'rm-final-row' }, h('span', { text: 'Whole class' }), h('b', { text: state.classScore }))),
      ];
    }
    function paint() {
      if (!state) { body.replaceChildren(h('p', { class: 'rm-wait', text: 'Connecting to the class TV…' })); return; }
      const v = state.view;
      const top = h('header', { class: 'rm-top' },
        h('div', { class: 'rm-title' }, h('b', {}, `${v.emoji} ${v.lesson}`), h('small', { text: v.sub })),
        h('button', { class: 'rm-more-btn', id: 'rm-more', onclick: () => { moreOpen = true; paint(); } }, '☰ More'));
      const main = state.screen === 'lobby' ? setupScreen() : state.screen === 'podium' ? podiumScreen() : playScreen();
      const kids = [top, ...main, scoreGrid()];
      const locked = v.primary && v.primary.nav && sentRev === state.rev;
      kids.push(h('div', { class: 'rm-dock' },
        state.screen === 'stage' && h('button', { class: 'rm-dock-btn', id: 'rm-back', disabled: !v.canBack, 'aria-label': 'Back', onclick: () => nav('prev') }, '◀'),
        v.primary
          ? h('button', { class: 'rm-primary', id: 'rm-primary', disabled: v.primary.disabled || locked, onclick: () => (v.primary.nav ? nav(v.primary.type) : tapSend({ type: v.primary.type })) }, v.primary.label)
          : twoTap('restart', '🔄 Play again', 'Tap again: restart', { type: 'restart' }),
        state.screen === 'stage' && h('button', { class: 'rm-dock-btn', id: 'rm-next', 'aria-label': 'Skip to next', onclick: () => nav('next') }, '▶')));
      if (moreOpen) kids.push(moreSheet());
      const scroller = body.querySelector('.rm-more-card');
      const scrollTop = scroller ? scroller.scrollTop : 0;
      body.replaceChildren(...kids.filter(Boolean));
      const again = body.querySelector('.rm-more-card');
      if (again) again.scrollTop = scrollTop;
    }
    const tick = setInterval(() => {
      if (!container.isConnected) { clearInterval(tick); return; }
      if (!state || !state.timer || !state.timer.running) return;
      const el = body.querySelector('[data-clock]');
      if (el) el.textContent = timerText();
    }, 400);

    paint();
    return {
      update(next, nextPending) {
        if (next) {
          state = next;
          timerAt = Date.now();
          if (sentRev !== state.rev) sentRev = -1;
        }
        if (nextPending) pending = nextPending;
        paint();
      },
    };
  };

  /* ---------- the teacher's phone ---------- */
  function codeEntry(root, message) {
    const input = h('input', { class: 'rm-input rm-code', maxlength: '6', placeholder: 'ABC234', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Code on the TV' });
    root.replaceChildren(h('div', { class: 'remote-page rm-enter' },
      h('form', { class: 'rm-card', onsubmit: (e) => {
        e.preventDefault();
        const code = SEJ.relay.cleanCode(input.value);
        if (code.length === 6) location.hash = `#/remote/${code}`;
      } },
        h('h1', { class: 'rm-enter-title', text: '📱 Teacher remote' }),
        h('p', { class: 'rm-note', text: message || 'Type the 6-letter code on the class TV.' }),
        input,
        h('button', { class: 'rm-btn rm-go rm-wide', type: 'submit' }, 'Connect'))));
  }
  SEJ.remotePage = function (root, rawCode) {
    const code = SEJ.relay.cleanCode(rawCode);
    if (code.length !== 6) { codeEntry(root); return () => {}; }
    if (!SEJ.relay.available) { codeEntry(root, 'The phone remote only works on the live website.'); return () => {}; }
    const KEY = `sej-teacher-${code}`;
    let link = null, wake = null, gone = false;
    const askPin = (note) => {
      if (link) { link.stop(); link = null; }
      root.replaceChildren(h('div', { class: 'remote-page pin-page' }, SEJ.pinPad({
        code, note,
        onOk: (pin) => {
          try { sessionStorage.setItem(KEY, pin); } catch (e) { /* asks again next time */ }
          start(pin);
        },
      })));
    };
    const start = (pin) => {
      if (gone) return;
      const dot = h('span', { class: 'rm-status off', role: 'status' }, 'Connecting…');
      const holder = h('div', { class: 'rm-holder' });
      root.replaceChildren(h('div', { class: 'remote-page' }, h('div', { class: 'rm-bar' }, h('span', { text: `Code ${code}` }), dot), holder));
      const panel = SEJ.controlPanel(holder, (cmd) => link.send(cmd));
      let said = false;
      link = SEJ.relay.phone({
        code, pin,
        onState(state, pending) {
          panel.update(state, pending);
          if (state && !said) { said = true; link.send({ type: 'hello' }); }
        },
        onStatus({ net, tv }) {
          dot.className = `rm-status ${net && tv ? 'on' : 'off'}`;
          dot.textContent = !net ? 'No internet. Retrying…' : tv ? 'Connected' : 'Waiting for the TV…';
        },
        onPinRejected() {
          try { sessionStorage.removeItem(KEY); } catch (e) { /* nothing saved */ }
          askPin('Please enter the teacher PIN again.');
        },
      });
      if (!wake) wake = SEJ.keepAwake();
    };
    let saved = '';
    try { saved = sessionStorage.getItem(KEY) || ''; } catch (e) { /* not saved */ }
    if (saved) start(saved); else askPin();
    return () => { gone = true; if (link) link.stop(); if (wake) wake(); };
  };
})();
