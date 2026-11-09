/* Animated illustrated worlds. Each one is inline SVG, so it stays sharp and needs no image files. */
(function () {
  'use strict';
  const cloud = (x, y, s, cls = 'drift', fill = '#fff', o = 1) =>
    `<g class="${cls}" style="--dur:${38 + (x % 30)}s;--delay:-${x % 37}s"><g transform="translate(${x} ${y}) scale(${s})" fill="${fill}" opacity="${o}"><ellipse cx="0" cy="0" rx="74" ry="34"/><circle cx="-34" cy="-18" r="30"/><circle cx="12" cy="-34" r="42"/><circle cx="50" cy="-14" r="26"/></g></g>`;
  const sun = (x, y, r, c1 = '#fff27a', c2 = '#ffb300') => {
    const rays = Array.from({ length: 12 }, (_, i) => `<rect x="-9" y="${-r * 1.75}" width="18" height="${r * 0.55}" rx="9" transform="rotate(${i * 30})" fill="${c2}"/>`).join('');
    return `<g transform="translate(${x} ${y})"><g class="spin-slow">${rays}</g><circle r="${r}" fill="url(#sunG)"/></g><defs><radialGradient id="sunG"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>`;
  };
  const hill = (d, c1, c2, id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="${d}" fill="url(#${id})"/>`;
  const sky = (id, stops) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect width="1600" height="1000" fill="url(#${id})"/>`;
  const tree = (x, y, s, c = '#1fae55') => `<g class="sway" style="--delay:-${x % 5}s" transform-origin="${x} ${y}"><g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-40" width="16" height="44" rx="6" fill="#8a5a2b"/><circle cy="-70" r="42" fill="${c}"/><circle cx="-26" cy="-46" r="28" fill="${c}"/><circle cx="26" cy="-46" r="28" fill="${c}"/><circle cx="-12" cy="-84" r="12" fill="#fff" opacity=".28"/></g></g>`;
  const flower = (x, y, s, c) => `<g class="sway" style="--delay:-${x % 4}s"><g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C-4 -28 4 -44 0 -70" stroke="#159a4a" stroke-width="7" fill="none"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-90" rx="12" ry="19" fill="${c}" transform="rotate(${a} 0 -72)"/>`).join('')}<circle cy="-72" r="11" fill="#ffd60a"/></g></g>`;
  const lolly = (x, y, s, c1, c2) => `<g class="sway" style="--delay:-${x % 5}s"><g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-110" width="12" height="116" rx="6" fill="#fff"/><circle cy="-150" r="58" fill="${c1}"/><path d="M0 -150 m-40 0 a40 40 0 1 1 40 40 a26 26 0 1 1 -26 -26 a12 12 0 1 1 12 12" fill="none" stroke="${c2}" stroke-width="11" stroke-linecap="round"/></g></g>`;
  const star = (x, y, r, d) => `<circle class="twinkle" style="--delay:-${d}s" cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`;
  const stars = (n) => Array.from({ length: n }, (_, i) => star((i * 379) % 1600, (i * 211) % 1000, 1.8 + (i % 3) * 1.3, (i * 0.37) % 3)).join('');
  const bubbles = () => Array.from({ length: 16 }, (_, i) => `<circle class="rise" style="--dur:${7 + (i % 6)}s;--delay:-${(i * 1.3) % 9}s" cx="${70 + i * 97}" cy="1040" r="${6 + (i % 4) * 6}" fill="rgba(255,255,255,.28)" stroke="#fff" stroke-width="2.5"/>`).join('');
  const bunting = (y) => {
    const colors = ['#ff2e93', '#ffd60a', '#00d4ff', '#9ef01a', '#ff7a00', '#9a5cff'];
    return `<path d="M0 ${y} Q800 ${y + 130} 1600 ${y}" fill="none" stroke="#fff" stroke-width="5"/>` + Array.from({ length: 21 }, (_, i) => {
      const x = 30 + i * 76, t = x / 1600, py = y + 260 * t * (1 - t);
      return `<g class="sway" style="--delay:-${i % 4}s"><path d="M${x - 24} ${py} L${x + 24} ${py} L${x} ${py + 50} Z" fill="${colors[i % 6]}" stroke="#fff" stroke-width="3"/></g>`;
    }).join('');
  };
  const svgWrap = (inner) => `<svg class="scene-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${inner}</svg>`;
  const emoji = (list) => list.map(([e, x, y, s, cls = 'bob', d = 0]) => `<span class="scene-emoji ${cls}" style="left:${x}%;top:${y}%;font-size:${s}px;--delay:-${d}s">${e}</span>`).join('');

  const WORLDS = {
    /* Sentence Train: a sunny valley */
    hills: () => svgWrap(sky('s1', ['#29b8ff', '#7fdcff', '#fff3b8']) + sun(1340, 170, 78) + cloud(240, 190, 1.2) + cloud(760, 120, 0.9) + cloud(1180, 300, 0.7) +
      hill('M0 640 C260 520 500 560 760 640 S1280 720 1600 560 V1000 H0Z', '#7fe56a', '#2fc15a', 'h1') + tree(190, 650, 1.1) + tree(1380, 640, 1.25, '#17a34a') + tree(1470, 670, 0.9) +
      hill('M0 780 C320 680 640 820 960 760 S1400 690 1600 760 V1000 H0Z', '#4fd35a', '#14a24a', 'h2') + flower(90, 860, 0.7, '#ff4fa3') + flower(1530, 870, 0.75, '#ffd60a') + flower(1450, 900, 0.6, '#fff')),
    /* Sort Party: spinning sunburst */
    party: () => `<div class="burst-bg"></div>` + svgWrap(bunting(-10)) + emoji([['🎈', 5, 30, 70], ['🎉', 91, 26, 66, 'bob', 1], ['🎊', 6, 72, 62, 'bob', 2], ['🎈', 92, 68, 74, 'bob', 1.5], ['⭐', 14, 52, 38, 'twinkle-e'], ['⭐', 85, 48, 42, 'twinkle-e', 1]]),
    /* Magic Letters: outer space */
    space: () => svgWrap(sky('s3', ['#14063f', '#3a0ca3', '#7209b7']) + stars(70) +
      `<g class="bob-svg"><circle cx="210" cy="240" r="88" fill="url(#p1)"/><ellipse cx="210" cy="240" rx="150" ry="28" fill="none" stroke="#ffd60a" stroke-width="12" transform="rotate(-18 210 240)"/></g><g class="bob-svg" style="--delay:-2s"><circle cx="1400" cy="760" r="130" fill="url(#p2)"/><circle cx="1350" cy="710" r="22" fill="#fff" opacity=".22"/><circle cx="1450" cy="800" r="30" fill="#000" opacity=".12"/></g><circle cx="1320" cy="170" r="46" fill="#ffe27a"/><defs><linearGradient id="p1" x2="1" y2="1"><stop stop-color="#ff7ac6"/><stop offset="1" stop-color="#ff2e93"/></linearGradient><linearGradient id="p2" x2="1" y2="1"><stop stop-color="#00e5ff"/><stop offset="1" stop-color="#0077ff"/></linearGradient></defs>`) +
      emoji([['🚀', 5, 66, 74, 'orbit'], ['🛸', 88, 22, 62, 'bob', 1.2], ['☄️', 72, 8, 46, 'bob', 2]]),
    /* Listen & Spell: candy land */
    candy: () => svgWrap(sky('s4', ['#ff8bd0', '#ffb5e0', '#ffe3a3']) + cloud(280, 170, 1.1, 'drift', '#fff', 0.95) + cloud(1200, 130, 1, 'drift', '#ffe7f6') +
      hill('M0 690 C300 560 620 620 880 700 S1360 740 1600 600 V1000 H0Z', '#c77dff', '#9a5cff', 'h3') + lolly(170, 760, 1.15, '#ff2e93', '#fff') + lolly(1440, 730, 1.3, '#00d4ff', '#fff') + lolly(1320, 790, 0.85, '#ffd60a', '#ff7a00') +
      hill('M0 830 C300 750 640 880 980 810 S1420 770 1600 830 V1000 H0Z', '#ff77c8', '#ff2e93', 'h4')) + emoji([['🍭', 7, 40, 54], ['🍩', 89, 40, 60, 'bob', 1], ['🧁', 92, 76, 58, 'bob', 2], ['🍬', 4, 78, 50, 'bob', 1.5]]),
    /* Missing Word: sunset beach */
    beach: () => svgWrap(sky('s5', ['#ff5f6d', '#ff9a4d', '#ffd86b']) + sun(800, 520, 150, '#fff6a8', '#ff8c2b') + cloud(240, 200, 1, 'drift', '#ffe2cc', 0.9) + cloud(1300, 140, 1.2, 'drift', '#ffe2cc', 0.9) +
      `<g class="wave"><path d="M-200 640 q100 -38 200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 V1000 H-200Z" fill="#0ea5e9"/></g><g class="wave wave2"><path d="M-200 710 q100 -30 200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 V1000 H-200Z" fill="#0284c7"/></g>` +
      hill('M0 870 C400 800 900 900 1600 830 V1000 H0Z', '#ffe08a', '#ffc24a', 'h5') +
      `<g class="sway"><g transform="translate(150 880)"><path d="M0 0 C24 -150 8 -270 70 -380" stroke="#8a5a2b" stroke-width="26" fill="none" stroke-linecap="round"/><g fill="#16a34a"><path d="M70 -380 C10 -440 -90 -420 -140 -360 C-60 -390 10 -380 70 -380Z"/><path d="M70 -380 C140 -450 240 -420 280 -350 C210 -390 130 -380 70 -380Z"/><path d="M70 -380 C60 -470 0 -510 -60 -510 C0 -470 40 -430 70 -380Z"/><path d="M70 -380 C110 -470 180 -500 240 -490 C180 -460 110 -430 70 -380Z"/></g></g></g>`) + emoji([['🦀', 88, 85, 52, 'scuttle'], ['🐚', 12, 90, 42], ['⛱️', 92, 72, 66, 'bob', 1]]),
    /* Match Makers: under the sea */
    ocean: () => svgWrap(sky('s6', ['#00c6ff', '#0072ff', '#0a2fa8']) +
      `<g fill="#fff" opacity=".12"><path class="ray" d="M240 0 L420 0 L120 1000 L-120 1000Z"/><path class="ray" style="--delay:-2s" d="M780 0 L940 0 L800 1000 L520 1000Z"/><path class="ray" style="--delay:-4s" d="M1300 0 L1460 0 L1560 1000 L1240 1000Z"/></g>` + bubbles() +
      hill('M0 900 C400 840 900 930 1600 860 V1000 H0Z', '#ffd98a', '#e0a64a', 'h6') +
      Array.from({ length: 9 }, (_, i) => `<g class="sway" style="--delay:-${i}s"><path d="M${40 + i * 45 + (i > 4 ? 1040 : 0)} 960 q-30 -70 0 -130 q30 -60 0 -130" stroke="${i % 2 ? '#10b981' : '#059669'}" stroke-width="18" fill="none" stroke-linecap="round"/></g>`).join('')) +
      emoji([['🐠', 3, 28, 64, 'swim'], ['🐟', 88, 44, 56, 'swim-r'], ['🐙', 92, 78, 74, 'bob', 1], ['🐡', 4, 64, 54, 'swim', 3], ['🐢', 88, 14, 58, 'swim-r', 4]]),
    /* Balloon Pop, Hero Quiz, Sky Pilot */
    sky: () => svgWrap(sky('s7', ['#0ea5ff', '#49c6ff', '#c6f1ff']) + sun(190, 170, 70) + cloud(520, 180, 1.3) + cloud(1120, 110, 1) + cloud(1400, 340, 0.8) + cloud(120, 460, 0.8) + cloud(800, 560, 1.4, 'drift', '#fff', 0.8) + cloud(1300, 760, 1.5, 'drift', '#fff', 0.9) + cloud(200, 840, 1.6, 'drift', '#fff', 0.95)) +
      emoji([['🎈', 92, 26, 60, 'bob', 1], ['🐦', 5, 42, 40, 'bob', 2], ['🕊️', 90, 60, 44, 'bob', 2.5]]),
    /* Pair or No Pair, Pop-Up Chicks: flower garden */
    garden: () => svgWrap(sky('s8', ['#5ad1ff', '#b9f0ff', '#fff6c9']) + sun(1380, 150, 66) + cloud(320, 130, 1) + cloud(900, 200, 0.8) +
      hill('M0 500 C300 420 600 470 900 520 S1400 560 1600 470 V1000 H0Z', '#a4ec62', '#55c955', 'h7') + tree(120, 520, 1.1) + tree(1500, 500, 1.2, '#17a34a') +
      hill('M0 690 C400 620 800 730 1200 670 S1500 640 1600 680 V1000 H0Z', '#6ddc55', '#22b04f', 'h8') +
      [[60, 800, '#ff4fa3'], [150, 860, '#ffd60a'], [1490, 820, '#fff'], [1560, 880, '#ff7a00'], [250, 910, '#9a5cff'], [1380, 910, '#ff2e93'], [40, 930, '#00d4ff']].map(([x, y, c]) => flower(x, y, 0.85, c)).join('')) +
      emoji([['🦋', 6, 42, 46, 'flutter'], ['🦋', 90, 54, 40, 'flutter', 1.5], ['🐝', 84, 34, 34, 'flutter', 0.7], ['🐞', 7, 74, 30, 'bob']]),
    /* Quick Check: jungle */
    jungle: () => svgWrap(sky('s9', ['#00b894', '#00a86b', '#0a7b4f']) +
      `<g fill="#fff" opacity=".1"><path class="ray" d="M300 0 L480 0 L160 1000 L-80 1000Z"/><path class="ray" style="--delay:-3s" d="M1100 0 L1260 0 L1420 1000 L1120 1000Z"/></g>` +
      hill('M0 740 C300 660 700 800 1000 730 S1400 680 1600 740 V1000 H0Z', '#067a4c', '#04533a', 'h9') + tree(110, 760, 1.5, '#0fa968') + tree(1500, 740, 1.6, '#12b76a') + tree(1360, 790, 1, '#0a9d5c') + tree(270, 800, 1, '#0a9d5c') +
      Array.from({ length: 7 }, (_, i) => `<g class="sway" style="--delay:-${i}s"><path d="M${i * 250 + 40} -10 q${i % 2 ? 40 : -40} 90 0 ${130 + (i % 3) * 60}" stroke="#057a4a" stroke-width="10" fill="none"/><ellipse cx="${i * 250 + 40}" cy="${130 + (i % 3) * 60}" rx="24" ry="13" fill="#34d399"/></g>`).join('')) +
      emoji([['🦜', 6, 30, 62], ['🐒', 90, 22, 66, 'bob', 1.5], ['🦋', 7, 62, 38, 'flutter']]),
    /* Quiz Show: a TV studio */
    stage: () => svgWrap(sky('s10', ['#1b0a5a', '#3a0ca3', '#240046']) +
      `<g class="spot"><path d="M300 -20 L600 900 L60 900Z" fill="#ffd60a" opacity=".2"/></g><g class="spot spot2"><path d="M1300 -20 L1540 900 L1000 900Z" fill="#00d4ff" opacity=".2"/></g><g class="spot spot3"><path d="M800 -20 L1060 900 L540 900Z" fill="#ff2e93" opacity=".17"/></g>` +
      `<path d="M0 0 H300 C260 240 180 500 70 1000 H0Z" fill="#d6004d"/><path d="M40 0 C60 300 30 600 10 1000" stroke="#a3003a" stroke-width="10" fill="none"/><path d="M160 0 C140 320 90 640 40 1000" stroke="#a3003a" stroke-width="10" fill="none"/><path d="M1600 0 H1300 C1340 240 1420 500 1530 1000 H1600Z" fill="#d6004d"/><path d="M1560 0 C1540 300 1570 600 1590 1000" stroke="#a3003a" stroke-width="10" fill="none"/><path d="M1440 0 C1460 320 1510 640 1560 1000" stroke="#a3003a" stroke-width="10" fill="none"/>` +
      `<ellipse cx="800" cy="1010" rx="880" ry="120" fill="#7b2ff7"/><ellipse cx="800" cy="1010" rx="640" ry="84" fill="#ffd60a" opacity=".85"/>`),
    /* Mystery Boxes, Hero Talk: birthday fiesta */
    fiesta: () => `<div class="burst-bg burst-violet"></div>` + svgWrap(bunting(-10)) + emoji([['🥳', 5, 34, 66], ['🎁', 91, 34, 68, 'bob', 1], ['🎵', 7, 66, 48, 'bob', 2], ['🎶', 90, 68, 50, 'bob', 1.5], ['✨', 14, 18, 38, 'twinkle-e'], ['✨', 84, 16, 42, 'twinkle-e', 1]]),
  };

  SEJ.scene = function (name) {
    const div = document.createElement('div');
    div.className = `scene scene-${name}`;
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = (WORLDS[name] || WORLDS.sky)();
    return div;
  };

  /* Floating scenery for each unit of the quest map. */
  const UNIT_DECOR = {
    1: ['🎒', '👋', '🍳', '🏕️', '🤝', '📔', '🌻', '💭', '🍉', '🎈'],
    2: ['🏫', '✏️', '📚', '⏰', '⚽', '🎨', '🧮', '🔔', '🎒', '🚌'],
    3: ['🏡', '💌', '❤️', '🧹', '🛋️', '🎂', '🌷', '🍰', '🪴', '🤗'],
    4: ['🌍', '🦁', '🚌', '🎨', '🌦️', '🧸', '🚦', '🎆', '🐘', '👕'],
  };
  SEJ.unitDecor = function (unit, rows) {
    const list = UNIT_DECOR[unit] || UNIT_DECOR[1];
    const out = [];
    for (let i = 0; i < rows; i++) {
      const left = i % 2 === 0;
      out.push(`<span class="map-decor bob" style="${left ? 'left' : 'right'}:${2 + (i * 7) % 9}%;top:${(100 / rows) * i + 3}%;--delay:-${i * 0.6}s;font-size:${42 + (i * 13) % 34}px">${list[i % list.length]}</span>`);
    }
    return out.join('');
  };
})();
