/* Class Battle teacher controls and the link between phone and TV.
   The same control panel runs on the teacher's phone and in the TV's Controls drawer. */
(function () {
  'use strict';
  const { h, sfx } = SEJ;
  const API = 'api/room';
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  const post = (body) => fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => { if (!r.ok) throw new Error(`relay ${r.status}`); return r.json(); });
  const get = (code, side) => fetch(`${API}?code=${code}&side=${side}`, { cache: 'no-store' })
    .then((r) => { if (!r.ok) throw new Error(`relay ${r.status}`); return r.json(); });

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

    /* TV side: sends its state and collects commands from the phone. */
    tv({ code, getState, getFeed, onCmds, onPlayers, wantsPlayers, onStatus }) {
      let alive = true, timer = 0, pushTimer = 0, pushing = false, dirty = true, lastCmd = 0, lastPush = 0;
      const push = async () => {
        if (!alive || pushing) return;
        pushing = true; dirty = false; lastPush = Date.now();
        try { await post({ code, side: 'tv', state: getState(), feed: getFeed() }); onStatus(true); } catch (e) { dirty = true; onStatus(false); }
        pushing = false;
        if (dirty && alive) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 800); }
      };
      const loop = async () => {
        if (!alive) return;
        try {
          const res = await get(code, 'tv');
          onStatus(true);
          if (res.cmds && onCmds(res.cmds)) lastCmd = Date.now();
          if (wantsPlayers()) {
            const list = await get(code, 'players');
            if (list.players) onPlayers(list.players);
            lastCmd = Date.now();
          }
        } catch (e) { onStatus(false); }
        if (Date.now() - lastPush > 15000) push();
        if (!alive) return;
        const idle = Date.now() - lastCmd;
        timer = setTimeout(loop, idle < 30000 ? 500 : idle < 600000 ? 1000 : 2500);
      };
      loop();
      return {
        changed() { dirty = true; clearTimeout(pushTimer); pushTimer = setTimeout(push, 90); },
        stop() { alive = false; clearTimeout(timer); clearTimeout(pushTimer); },
      };
    },

    /* Phone side: keeps sending each command until the TV confirms it. */
    phone({ code, onState, onStatus }) {
      const client = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(36)).join('').slice(0, 10);
      let alive = true, timer = 0, seq = 0, pending = [], sending = false, tvAt = 0, skew = 0, lastJson = '';
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
      const flush = async () => {
        if (sending || !pending.length || !alive) return;
        sending = true;
        try { receive(await post({ code, side: 'phone', client, cmds: pending })); } catch (e) { onStatus({ net: false, tv: false }); }
        sending = false;
      };
      const loop = async () => {
        if (!alive) return;
        if (!document.hidden) {
          if (pending.length) await flush();
          else {
            try { receive(await get(code, 'phone')); } catch (e) { onStatus({ net: false, tv: false }); }
          }
        }
        if (alive) timer = setTimeout(loop, pending.length ? 450 : 1300);
      };
      loop();
      return {
        send(cmd) {
          pending.push(Object.assign({ seq: ++seq }, cmd));
          onState(null, pending);
          flush();
        },
        stop() { alive = false; clearTimeout(timer); },
      };
    },
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

  /* ---------- the control panel ---------- */
  SEJ.controlPanel = function (container, send) {
    let state = null, pending = [], armed = null, armTimer = 0, navTimer = 0, sheet = null, sentRev = -1, timerAt = 0;
    const body = h('div', { class: 'rm-body' });
    container.append(body);

    const tapSend = (cmd) => { SEJ.buzz(12); sfx.tap(); send(cmd); };
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
    function scores() {
      const panel = h('section', { class: 'rm-card' },
        h('div', { class: 'rm-head' }, h('h2', { text: '⭐ Scores' }), teamChooser()));
      if (state.mode === 'class') {
        panel.append(h('div', { class: 'rm-team' },
          h('span', { class: 'rm-team-name', text: 'Whole class' }),
          h('button', { class: 'rm-minus', 'aria-label': 'Take one point from the class', onclick: () => tapSend({ type: 'score', team: -1, delta: -1 }) }, '−'),
          h('b', { class: 'rm-num', text: scoreShown(-1) }),
          h('button', { class: 'rm-plus', 'aria-label': 'Give the class one point', onclick: () => tapSend({ type: 'score', team: -1, delta: 1 }) }, '+1')));
      } else {
        state.teams.forEach((t, i) => panel.append(h('div', { class: 'rm-team', style: { '--team': t.color } },
          h('span', { class: 'rm-team-name' }, h('i', { class: 'rm-dot' }), t.name),
          h('button', { class: 'rm-minus', 'aria-label': `Take one point from ${t.name}`, onclick: () => tapSend({ type: 'score', team: i, delta: -1 }) }, '−'),
          h('b', { class: 'rm-num', text: scoreShown(i) }),
          h('button', { class: 'rm-plus', 'aria-label': `Give ${t.name} one point`, onclick: () => tapSend({ type: 'score', team: i, delta: 1 }) }, '+1'))));
        panel.append(h('button', { class: 'rm-link', onclick: namesSheet }, '✏️ Change team names'));
      }
      return panel;
    }
    function studentsCard() {
      const list = Object.entries(state.players || {});
      return h('section', { class: 'rm-card', id: 'rm-students' },
        h('div', { class: 'rm-head' }, h('h2', { text: '🙋 Students play on phones' }),
          h('button', { class: `rm-btn rm-toggle ${state.students ? 'rm-go' : ''}`, id: 'rm-students-toggle', 'aria-pressed': state.students ? 'true' : 'false', onclick: () => tapSend({ type: 'students' }) }, state.students ? 'On' : 'Off')),
        state.students
          ? h('div', { class: 'rm-names' },
            h('p', { class: 'rm-note', text: `${list.length} joined. Student code: ${state.join || ''}. Right answers score by themselves. You can still use +1 and −.` }),
            h('button', { class: 'rm-link', onclick: () => tapSend({ type: 'joinqr' }) }, state.joinQr ? 'Hide student QR on TV' : 'Show student QR on TV'),
            h('div', { class: 'rm-players' }, list.map(([id, p]) => h('span', { class: 'rm-player' }, `${p.name} · ${p.score}`,
              h('button', { 'aria-label': `Remove ${p.name}`, onclick: () => tapSend({ type: 'kick', client: id }) }, '✕')))))
          : h('p', { class: 'rm-note', text: 'Turn on to show a QR for students. They pick a team and answer on their own phones.' }));
    }
    function timerText() {
      if (!state.timer) return '';
      const left = state.timer.running ? state.timer.left - (Date.now() - timerAt) / 1000 : state.timer.left;
      return SEJ.clock(left);
    }
    function paint() {
      if (!state) { body.replaceChildren(h('p', { class: 'rm-wait', text: 'Connecting to the class TV…' })); return; }
      const v = state.view;
      const kids = [];
      kids.push(h('header', { class: 'rm-top' },
        h('div', { class: 'rm-title' }, h('b', {}, `${v.emoji} ${v.lesson}`), h('small', { text: v.sub })),
        v.tip && h('p', { class: 'rm-tip' }, '💡 ', v.tip)));
      if (v.answer) kids.push(h('section', { class: 'rm-answer' }, h('small', { text: 'Answer (only you can see this)' }), h('b', { text: v.answer })));
      if (v.primary) {
        const locked = sentRev === state.rev && v.primary.nav;
        kids.push(h('button', {
          class: 'rm-primary', id: 'rm-primary', disabled: v.primary.disabled || locked,
          onclick: () => (v.primary.nav ? nav(v.primary.type) : tapSend({ type: v.primary.type })),
        }, v.primary.label));
      }
      if (state.screen === 'stage') {
        kids.push(h('div', { class: 'rm-row' },
          h('button', { class: 'rm-btn', id: 'rm-back', disabled: !v.canBack, onclick: () => nav('prev') }, '⬅️ Back'),
          h('button', { class: 'rm-btn', id: 'rm-next', onclick: () => nav('next') }, 'Next ➡️')));
        if (v.boxes) {
          kids.push(h('section', { class: 'rm-card' }, h('h2', { text: '🎁 Boxes' }), h('div', { class: 'rm-boxes' },
            v.boxes.map((b) => h('button', { class: `rm-box ${b.used ? 'used' : ''}`, disabled: b.used, onclick: () => nav('box', { n: b.n }) }, String(b.n + 1))))));
        }
        if (state.timer && state.timer.total) {
          const run = state.timer.running;
          kids.push(h('section', { class: 'rm-card rm-timer' },
            h('b', { class: 'rm-clock', 'data-clock': '1', text: timerText() }),
            h('button', { class: `rm-btn ${run ? '' : 'rm-go'}`, id: 'rm-timer', onclick: () => tapSend({ type: 'timer', op: run ? 'pause' : 'start' }) }, run ? '⏸ Pause' : '▶️ Start'),
            h('button', { class: 'rm-btn rm-small', 'aria-label': 'Reset the timer', onclick: () => tapSend({ type: 'timer', op: 'reset' }) }, '↺'),
            v.canFifty && h('button', { class: 'rm-btn rm-fifty', id: 'rm-fifty', disabled: state.hidden.length > 0, onclick: () => tapSend({ type: 'fifty' }) }, '✂️ 50:50')));
        }
      }
      kids.push(scores());
      kids.push(studentsCard());
      if (state.screen !== 'podium') {
        const n = (state.roster || []).length;
        kids.push(h('section', { class: 'rm-card' },
          h('div', { class: 'rm-head' }, h('h2', { text: '🎤 Who answers?' }), h('button', { class: 'rm-link', onclick: rosterSheet }, `Names (${n})`)),
          h('div', { class: 'rm-row' },
            h('button', { class: 'rm-btn rm-pick', id: 'rm-pick-student', disabled: !n, onclick: () => tapSend({ type: 'pick', what: 'student' }) }, n ? '🎲 Random student' : 'Add names first'),
            state.mode !== 'class' && h('button', { class: 'rm-btn rm-pick', id: 'rm-pick-team', onclick: () => tapSend({ type: 'pick', what: 'team' }) }, '🎲 Random team')),
          state.picked && h('p', { class: 'rm-picked' }, 'Picked: ', h('b', { text: state.picked.name }))));
        kids.push(h('section', { class: 'rm-card' }, h('h2', { text: '🎉 Cheer on the TV' }), h('div', { class: 'rm-row rm-cheers' },
          [['clap', '👏 Clap'], ['fanfare', '🎺 Yay'], ['wow', '🤩 Wow'], ['oops', '😅 Oops']].map(([kind, label]) => h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'cheer', kind }) }, label)))));
      }
      if (state.screen === 'stage') {
        kids.push(h('section', { class: 'rm-card' }, h('h2', { text: '🚩 Jump to a round' }), h('div', { class: 'rm-rounds' }, v.rounds.map((r, i) => h('button', {
          class: `rm-btn ${i === state.stage ? 'rm-go' : ''}`, onclick: () => { if (i !== state.stage) nav('goto', { stage: i }); },
        }, r)))));
      }
      kids.push(h('div', { class: 'rm-row rm-tools' },
        h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'sound' }) }, state.sound ? '🔊 TV sound' : '🔇 TV sound'),
        h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'qr' }) }, state.qr ? 'Hide QR' : 'Show QR'),
        state.screen === 'stage' && h('button', { class: 'rm-btn', onclick: () => tapSend({ type: 'shuffle' }) }, '🔀 Shuffle')));
      kids.push(h('div', { class: 'rm-row rm-tools' },
        twoTap('restart', '🔄 Restart', 'Tap again: restart', { type: 'restart' }),
        state.screen === 'stage' && twoTap('end', '🏁 End', 'Tap again: end', { type: 'end' })));
      body.replaceChildren(...kids.filter(Boolean));
    }
    setInterval(() => {
      if (!container.isConnected || !state || !state.timer || !state.timer.running) return;
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
    const dot = h('span', { class: 'rm-status off', role: 'status' }, 'Connecting…');
    const holder = h('div', { class: 'rm-holder' });
    root.replaceChildren(h('div', { class: 'remote-page' }, h('div', { class: 'rm-bar' }, h('span', { text: `Code ${code}` }), dot), holder));
    const panel = SEJ.controlPanel(holder, (cmd) => link.send(cmd));
    let said = false;
    const link = SEJ.relay.phone({
      code,
      onState(state, pending) {
        panel.update(state, pending);
        if (state && !said) { said = true; link.send({ type: 'hello' }); }
      },
      onStatus({ net, tv }) {
        dot.className = `rm-status ${net && tv ? 'on' : 'off'}`;
        dot.textContent = !net ? 'No internet. Retrying…' : tv ? 'Connected' : 'Waiting for the TV…';
      },
    });
    const wake = SEJ.keepAwake();
    return () => { link.stop(); wake(); };
  };
})();
