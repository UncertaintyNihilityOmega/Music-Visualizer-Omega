// Icon generator:  node engine/icons.js [chosenNumber]
// Writes ten candidate icons to icons/options/ and a gallery page that
// shows each one large and at favicon sizes. With a number (1-10) it also
// copies that candidate to icons/icon.svg, the icon the app uses.
// Shapes are computed, not hand-typed: the sound wave is the silhouette
// from inspiration/sound-wave.jpg rebuilt as five lobes on a tapering line.
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'icons');
const S = 512;

/* ---------- the sound-wave silhouette ---------- */
// half-height (0..1) of the wave at x in [-1, 1]
function waveHalf(x){
  const ax = Math.abs(x);
  if (ax >= 1) return 0;
  const neck = 0.085 * Math.pow(Math.min(1, (1 - ax) / 0.27), 2.2);
  const lobes = [[0, 0.215, 0.64], [0.41, 0.17, 0.40], [0.69, 0.105, 0.135]];
  let y = neck;
  for (const [c, w, a] of lobes){
    const u = (ax - c) / w;
    if (Math.abs(u) < 1) y += a * Math.pow(Math.cos(u * Math.PI / 2), 2);
  }
  return y;
}
// closed path of the silhouette centred on (cx, cy), total width w, peak half-height h
function wavePath(cx, cy, w, h, scaleY = 1){
  const n = 160, top = [], bot = [];
  for (let i = 0; i <= n; i++){
    const x = -1 + 2 * i / n, y = waveHalf(x) / 0.725 * h * scaleY;
    top.push(`${(cx + x * w / 2).toFixed(1)},${(cy - y).toFixed(1)}`);
    bot.push(`${(cx + x * w / 2).toFixed(1)},${(cy + y).toFixed(1)}`);
  }
  return 'M' + top.join(' L') + ' L' + bot.reverse().join(' L') + ' Z';
}
/* ---------- the omega, as a stroke path (no font needed) ---------- */
function omegaPath(cx, footY, r){
  const fx = 0.40 * r, out = 0.98 * r;
  return `M${(cx - out).toFixed(1)},${footY} L${(cx - fx).toFixed(1)},${footY} ` +
         `A${r},${r} 0 1 1 ${(cx + fx).toFixed(1)},${footY} L${(cx + out).toFixed(1)},${footY}`;
}
const omega = (cx, footY, r, sw, stroke, extra = '') =>
  `<path d="${omegaPath(cx, footY, r)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">\n<defs>${defs}\n<clipPath id="sq"><rect width="${S}" height="${S}" rx="112"/></clipPath></defs>\n<g clip-path="url(#sq)">${body}\n</g></svg>\n`;
const lin = (id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</linearGradient>';
const rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">` +
  stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('') + '</radialGradient>';
const glow = (id, dev) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${dev}"/></filter>`;
const bg = fill => `<rect width="${S}" height="${S}" fill="${fill}"/>`;

const ICONS = [];
const add = (name, note, markup) => ICONS.push({ name, note, markup });

// 1. Neon Omega: the closest to the example icon
add('Neon Omega', 'Closest to your example: glowing Ω above a layered wave.', svg(
  bg('url(#b)') +
  [150, 200, 250, 300].map(r => `<circle cx="256" cy="230" r="${r}" fill="none" stroke="#B48CFF" stroke-opacity=".07" stroke-width="2"/>`).join('') +
  omega(256, 250, 84, 30, '#C77DFF', 'filter="url(#g)" opacity=".9"') +
  omega(256, 250, 84, 20, 'url(#o)') +
  `<path d="${wavePath(256, 372, 440, 92)}" fill="#7B4DFF" opacity=".55" filter="url(#g)"/>` +
  `<path d="${wavePath(256, 372, 440, 92)}" fill="url(#w)"/>` +
  `<path d="${wavePath(256, 372, 400, 52)}" fill="#fff" opacity=".22"/>`,
  rad('b', [[0, '#3A1B78'], [1, '#12092B']], 0.5, 0.42, 0.75) + lin('o', [[0, '#E3B8FF'], [1, '#8F5BFF']], 0, 0, 0, 1) +
  lin('w', [[0, '#5B6BFF'], [0.5, '#FF5FD2'], [1, '#5B6BFF']], 0, 0, 1, 0) + glow('g', 14)));

// 2. One line: the wave IS the base of the omega
add('Wave Feet', 'The Ω stands on the sound wave: its feet become the wave.', svg(
  bg('url(#b)') +
  `<path d="${wavePath(256, 356, 452, 70)}" fill="url(#w)"/>` +
  `<path d="M210,330 A112,112 0 1 1 302,330" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"/>`,
  lin('b', [[0, '#1D0F45'], [1, '#090514']], 0, 0, 0, 1) + lin('w', [[0, '#B06BFF'], [0.5, '#FF5FD2'], [1, '#B06BFF']], 0, 0, 1, 0)));

// 3. Bold: big white omega over a wide gradient wave
add('Bold Mark', 'Simple and loud: solid Ω in front of a wide wave. Reads well very small.', svg(
  bg('url(#b)') +
  `<path d="${wavePath(256, 268, 500, 130)}" fill="url(#w)" opacity=".8"/>` +
  omega(256, 342, 106, 26, '#FFFFFF'),
  lin('b', [[0, '#2A1463'], [1, '#0E0722']], 0, 0, 1, 1) + lin('w', [[0, '#6A5CFF'], [0.5, '#FF5FD2'], [1, '#FFB36B']], 0, 0, 1, 0)));

// 4. Black hole: a ring of sound around a dark disc
add('Event Horizon', 'Black-hole look for "Decensus Ad Nihilum": a bright ring of bars around a dark centre.', svg(
  bg('#050308') +
  `<circle cx="256" cy="256" r="230" fill="url(#h)"/>` +
  Array.from({ length: 72 }, (_, i) => {
    const a = i / 72 * Math.PI * 2, f = i / 72, v = waveHalf((f < 0.5 ? f * 4 - 1 : (1 - f) * 4 - 1)) / 0.725;
    const r0 = 150, r1 = 158 + v * 78;
    return `<line x1="${(256 + Math.cos(a) * r0).toFixed(1)}" y1="${(256 + Math.sin(a) * r0).toFixed(1)}" x2="${(256 + Math.cos(a) * r1).toFixed(1)}" y2="${(256 + Math.sin(a) * r1).toFixed(1)}" stroke="url(#f)" stroke-width="7" stroke-linecap="round"/>`;
  }).join('') +
  `<circle cx="256" cy="256" r="140" fill="#000" stroke="#FFE2B8" stroke-width="5"/>` +
  omega(256, 300, 58, 15, '#FFE2B8'),
  rad('h', [[0.55, '#FF9A4A', 0.35], [1, '#FF9A4A', 0]]) + lin('f', [[0, '#FFF1D6'], [1, '#FF7A1A']], 0, 0, 1, 1)));

// 5. Omega made of spectrum bars
add('Bar Omega', 'The Ω itself is drawn with equaliser bars.', (() => {
  const bars = [];
  for (let i = 0; i < 17; i++){
    const x = 96 + i * 20, h = 60 + Math.abs(Math.sin(i * 1.7 + 0.6)) * 250;
    bars.push(`<rect x="${x}" y="${420 - h}" width="12" height="${h}" rx="6"/>`);
  }
  return svg(bg('url(#b)') +
    `<g fill="#fff" opacity=".1">${bars.join('')}</g>` +
    `<g clip-path="url(#oc)"><g fill="url(#w)">${Array.from({ length: 21 }, (_, i) => `<rect x="${76 + i * 18}" y="60" width="11" height="400" rx="5"/>`).join('')}</g></g>`,
    lin('b', [[0, '#081326'], [1, '#03060D']], 0, 0, 0, 1) + lin('w', [[0, '#00F0FF'], [1, '#FF00AA']], 0, 0, 0, 1) +
    `<clipPath id="oc"><path d="${omegaPath(256, 392, 126)}" fill="none" stroke="#000" stroke-width="58" stroke-linecap="round"/></clipPath>`)
    // a stroked path cannot clip, so the same shape is rebuilt as a mask
    .replace(/<clipPath id="oc">.*?<\/clipPath>/, `<mask id="om"><path d="${omegaPath(256, 392, 126)}" fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round"/></mask>`)
    .replace('clip-path="url(#oc)"', 'mask="url(#om)"');
})());

// 6. Light: white tile, rainbow wave
add('Ascensus', 'Light version for "Ascensus ad Incertum": white tile, rainbow wave, dark Ω.', svg(
  bg('#FFFFFF') + `<rect width="${S}" height="${S}" fill="url(#t)"/>` +
  `<path d="${wavePath(256, 370, 452, 96)}" fill="url(#w)"/>` +
  omega(256, 240, 82, 24, '#1C1F2E'),
  lin('t', [[0, '#EEF2FF', 0], [1, '#DDE6FF', 1]], 0, 0, 0, 1) +
  lin('w', [[0, '#FF5F6D'], [0.2, '#FFB347'], [0.4, '#F9F871'], [0.6, '#3DDC97'], [0.8, '#4D96FF'], [1, '#B06BFF']], 0, 0, 1, 0)));

// 7. Synthwave sun
add('Synth Sun', 'Retro sunset: the wave is the horizon under a striped sun, Ω in the sun.', svg(
  bg('url(#b)') +
  `<circle cx="256" cy="232" r="150" fill="url(#s)"/>` +
  [0, 1, 2, 3, 4].map(i => `<rect x="90" y="${262 + i * 26}" width="332" height="${6 + i * 2.5}" fill="#1A0B3B"/>`).join('') +
  omega(256, 250, 70, 20, '#1A0B3B') +
  `<path d="${wavePath(256, 404, 520, 70)}" fill="#12072B"/>` +
  `<path d="${wavePath(256, 404, 520, 70)}" fill="none" stroke="#FF5FD2" stroke-width="5"/>`,
  lin('b', [[0, '#1A0B3B'], [1, '#4A1560']], 0, 0, 0, 1) + lin('s', [[0, '#FFE66D'], [1, '#FF5FA2']], 0, 0, 0, 1)));

// 8. Monogram: one colour, the wave sits inside the omega
add('Monogram', 'One colour: a small wave inside a big Ω. Works as a stamp or a monochrome icon.', svg(
  bg('#0B1430') +
  omega(256, 388, 142, 34, '#F2C55C') +
  `<path d="${wavePath(256, 250, 206, 70)}" fill="#F2C55C"/>`));

// 9. Ring spectrum around the omega
add('Halo', 'A circular visualiser ring around the Ω.', svg(
  bg('url(#b)') +
  Array.from({ length: 60 }, (_, i) => {
    const a = i / 60 * Math.PI * 2 - Math.PI / 2, v = 0.25 + 0.75 * Math.abs(Math.sin(i * 2.3) * Math.cos(i * 0.7));
    const r0 = 168, r1 = 176 + v * 58;
    return `<line x1="${(256 + Math.cos(a) * r0).toFixed(1)}" y1="${(256 + Math.sin(a) * r0).toFixed(1)}" x2="${(256 + Math.cos(a) * r1).toFixed(1)}" y2="${(256 + Math.sin(a) * r1).toFixed(1)}" stroke="hsl(${170 + i * 2.4},85%,62%)" stroke-width="9" stroke-linecap="round"/>`;
  }).join('') +
  omega(256, 312, 86, 26, '#FFFFFF'),
  rad('b', [[0, '#16304A'], [1, '#060B14']], 0.5, 0.5, 0.7)));

// 10. Dotted bars, like the YouTube visualisers that were studied
add('Dotted Spectrum', 'Dotted bars like the visualiser videos in test-songs, with a thin Ω.', (() => {
  const dots = [];
  for (let i = 0; i < 25; i++){
    const x = 64 + i * 16, v = waveHalf((i - 12) / 13) / 0.725, n = 1 + Math.round(v * 9);
    for (let j = 0; j < n; j++) dots.push(`<rect x="${x}" y="${424 - j * 16}" width="10" height="10" rx="3" fill="url(#w)" opacity="${(0.45 + 0.55 * j / Math.max(1, n - 1)).toFixed(2)}"/>`);
  }
  return svg(bg('url(#b)') + dots.join('') + omega(256, 214, 74, 14, '#F4F1E4'),
    lin('b', [[0, '#101626'], [1, '#05070D']], 0, 0, 0, 1) + lin('w', [[0, '#7BD3F7'], [1, '#B57BFF']], 0, 0, 0, 1));
})());

fs.mkdirSync(path.join(OUT, 'options'), { recursive: true });
const pad = n => String(n).padStart(2, '0');
ICONS.forEach((ic, i) => fs.writeFileSync(path.join(OUT, 'options', `icon-${pad(i + 1)}.svg`), ic.markup));

const cards = ICONS.map((ic, i) => `
  <figure>
    <img class="big" src="options/icon-${pad(i + 1)}.svg" alt="">
    <figcaption><b>${i + 1}. ${ic.name}</b><span>${ic.note}</span>
      <span class="small"><img src="options/icon-${pad(i + 1)}.svg" width="64" height="64" alt=""><img src="options/icon-${pad(i + 1)}.svg" width="32" height="32" alt=""><img src="options/icon-${pad(i + 1)}.svg" width="16" height="16" alt=""> 64 · 32 · 16 px</span>
    </figcaption>
  </figure>`).join('');
fs.writeFileSync(path.join(OUT, 'gallery.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Icon options</title>
<style>
  body{ margin:0; padding:24px 16px 40px; background:#14111c; color:#eee9f7; font-family:"Segoe UI",system-ui,sans-serif; }
  h1{ font-size:1.2rem; text-align:center; margin:0 0 4px; }
  p.lead{ text-align:center; color:#a9a2bd; font-size:.85rem; margin:0 0 22px; }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:18px; max-width:1180px; margin:0 auto; }
  figure{ margin:0; background:#1d1929; border:1px solid #2f2942; border-radius:16px; padding:14px; }
  img.big{ width:100%; height:auto; display:block; }
  figcaption{ margin-top:10px; font-size:.78rem; line-height:1.45; color:#a9a2bd; }
  figcaption b{ display:block; color:#eee9f7; font-size:.9rem; margin-bottom:2px; }
  figcaption span{ display:block; }
  .small{ margin-top:8px; display:flex !important; align-items:center; gap:8px; font-size:.68rem; }
</style></head><body>
<h1>Music Visualiser Omega: icon options</h1>
<p class="lead">Each one is shown large and at the sizes a browser tab and a phone home screen use.</p>
<div class="grid">${cards}</div>
</body></html>
`);

const pick = Number(process.argv[2]);
if (pick >= 1 && pick <= ICONS.length){
  fs.copyFileSync(path.join(OUT, 'options', `icon-${pad(pick)}.svg`), path.join(OUT, 'icon.svg'));
  console.log(`icons/icon.svg = option ${pick} (${ICONS[pick - 1].name})`);
}
console.log(`${ICONS.length} icons written to icons/options/, gallery at icons/gallery.html`);
