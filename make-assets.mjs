// builds the profile art. usage: node make-assets.mjs [outDir]
// env: GITHUB_TOKEN (optional, for the API), SKY=dawn|morning|afternoon|golden|dusk|night to force a sky
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve(process.argv[2] || 'assets');
mkdirSync(out, { recursive: true });

const TZ = 'America/Toronto';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const MONO = "Consolas, 'SF Mono', Menlo, 'DejaVu Sans Mono', monospace";

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = (n) => +n.toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------- live data ---------------- */
async function gh(path) {
  const headers = { 'User-Agent': 'tuhronto-profile', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
async function release(repo) {
  try {
    const all = await gh(`repos/tuhronto/${repo}/releases?per_page=100`);
    const live = all.filter((r) => !r.draft);
    const downloads = live.flatMap((r) => r.assets)
      .filter((a) => !/\.(json|sig)$/.test(a.name))
      .reduce((n, a) => n + a.download_count, 0);
    const latest = live.find((r) => !r.prerelease) || live[0];
    return { tag: latest?.tag_name, date: latest?.published_at, downloads };
  } catch (e) {
    console.warn(String(e));
    return {};
  }
}
async function kaedeVersion() {
  try {
    const js = await (await fetch('https://playkaede.vercel.app/js/ui.js')).text();
    return js.match(/VERSION\s*=\s*['"]([^'"]+)/)?.[1];
  } catch { return undefined; }
}
const [versedRel, zzRel, kaedeV] = await Promise.all([release('versed'), release('zzboard-public'), kaedeVersion()]);
const short = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ }).toLowerCase();
const tag = (t) => (t ? (t.startsWith('v') ? t : `v${t}`) : null);

/* ---------------- time of day ---------------- */
const hour = +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date());
const period = process.env.SKY || (hour < 5 ? 'night' : hour < 7 ? 'dawn' : hour < 11 ? 'morning' : hour < 16 ? 'afternoon' : hour < 18 ? 'golden' : hour < 20 ? 'dusk' : 'night');

// sky top/mid/horizon, mountain top/base, snow lit/shade, cloud, tint (rgb multipliers for the foreground), glow
const SKIES = {
  dawn: { sky: ['#27336a', '#9c6a96', '#f3b08e'], mt: ['#6b6a9e', '#3a3f74'], snow: ['#fff1ea', '#d9c3d6'], cloud: ['#ffd9cf', .8], tint: [.95, .8, .84], glow: ['#ffb08a', 140, 330, .55], stars: .25 },
  morning: { sky: ['#1f5fd0', '#4f8be0', '#a9c6ee'], mt: ['#5a76b4', '#26396b'], snow: ['#ffffff', '#c9d6ea'], cloud: ['#ffffff', .85], tint: [1, 1, 1] },
  afternoon: { sky: ['#2466dc', '#5b9be8', '#c8ddf6'], mt: ['#6280bd', '#2b4074'], snow: ['#ffffff', '#d3deef'], cloud: ['#ffffff', .9], tint: [1.04, 1.03, 1.01] },
  golden: { sky: ['#3459a8', '#c99a78', '#f7cf92'], mt: ['#6d6290', '#3a3566'], snow: ['#fff3dc', '#e2c7b4'], cloud: ['#ffe2b8', .85], tint: [1.07, .9, .72], glow: ['#ffc06a', 1080, 300, .6] },
  dusk: { sky: ['#191c48', '#6a3c78', '#e0785c'], mt: ['#4a3c6c', '#231f45'], snow: ['#f6c9cf', '#a98aa8'], cloud: ['#f2a090', .55], tint: [.78, .6, .7], glow: ['#ff7a4a', 180, 340, .55], stars: .45 },
  night: { sky: ['#050918', '#0e1836', '#22305a'], mt: ['#1d2849', '#0d1428'], snow: ['#c4d0e8', '#7d8db0'], cloud: ['#8a9ac0', .25], tint: [.36, .42, .62], stars: 1, moon: true },
};
const P = SKIES[period];

/* ---------------- header ---------------- */
const L = (t) => [690 - 470 * t, 92 + 252 * (1 - (1 - t) ** 2.2)];
const R = (t) => [770 + 470 * t, 92 + 232 * (1 - (1 - t) ** 2.2)];
const peak = [[690, 92], [704, 88], [721, 93], [739, 86], [756, 91], [770, 92]];

function mountainPath() {
  const pts = [];
  for (let t = 1; t >= 0; t -= 0.02) pts.push(L(t));
  pts.push(...peak);
  for (let t = 0; t <= 1; t += 0.02) pts.push(R(t));
  return `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} L1240,372 L200,372 Z`;
}
function snow() {
  const tl = 0.3, tr = 0.32;
  const pts = [];
  for (let t = tl; t >= 0; t -= 0.02) pts.push(L(t));
  pts.push(...peak);
  for (let t = 0; t <= tr; t += 0.02) pts.push(R(t));
  const [x1, y1] = R(tr), [x0, y0] = L(tl);
  const streaks = [];
  // a wavy snowline with ragged teeth; the odd tooth runs long and thin down a gully
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  const wave = (k) => Math.sin(k * 7 + ph[0]) * 9 + Math.sin(k * 17 + ph[1]) * 5 + Math.sin(k * 41 + ph[2]) * 2.5;
  let x = x1;
  while (x > x0) {
    const k = (x1 - x) / (x1 - x0);
    const base = y1 + (y0 - y1) * k + wave(k) - Math.sin(k * Math.PI) * 6;
    const gully = rnd() < 0.1;
    const w = gully ? 3 + rnd() * 3 : 4 + rnd() * 14;
    const len = gully ? 24 + rnd() * 26 : 2 + 22 * rnd() ** 2;
    const lean = (rnd() - 0.5) * (gully ? 10 : 4);
    pts.push([x, base], [x - w * 0.3, base + len * 0.55], [x - w * 0.5 + lean, base + len], [x - w * 0.7, base + len * 0.4], [x - w, base + rnd() * 4 - 2]);
    if (gully) streaks.push([x - w * 0.5 + lean, base + len, 8 + rnd() * 22]);
    x -= w + rnd() * 2;
  }
  return { d: `M${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' L')} Z`, streaks };
}
function treeline() {
  let d = 'M0,380 ';
  for (let x = 0; x <= 1200; x += 9) {
    const y = 344 + Math.sin(x / 70) * 6 + rnd() * 12;
    d += `L${x},${f(y)} L${x + 4.5},${f(y + 6 + rnd() * 4)} `;
  }
  return d + 'L1200,380 Z';
}
function grass() {
  const cols = ['#c9b17c', '#a48d5e', '#8a744a', '#d8c494', '#7a6a48'];
  let s = '';
  for (let i = 0; i < 620; i++) {
    const x = rnd() * 1200, y = 372 + rnd() * 22, h = 10 + rnd() * 22 * ((y - 360) / 34);
    s += `<path d="M${f(x)},${f(y)} q${f(rnd() * 6 - 3)},-${f(h / 2)} ${f(rnd() * 10 - 5)},-${f(h)}" stroke="${cols[i % 5]}" stroke-width="${f(1.2 + rnd() * 1.4)}" opacity="${f(0.55 + rnd() * 0.45)}"/>`;
  }
  return s;
}
// gravel: small and sharp near the grass, bigger and softer toward the lens
function pebbles() {
  const cols = ['#8f877c', '#a69e92', '#6f685f', '#c2bbb0', '#9a8f80'];
  let far = '', near = '';
  for (let i = 0; i < 260; i++) {
    const y = 392 + rnd() ** 0.8 * 68, k = (y - 392) / 68;
    const x = rnd() * 1200, r = 1 + k * 4.5 + rnd() * 2;
    const p = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.3)}" ry="${f(r * 0.8)}" fill="${cols[i % 5]}"/><ellipse cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" rx="${f(r * 0.6)}" ry="${f(r * 0.3)}" fill="#fff" opacity=".25"/>`;
    if (k < 0.45) far += p; else near += p;
  }
  return `<g opacity=".7">${far}</g><g opacity=".75" filter="url(#pebblur)">${near}</g>`;
}
// big out-of-focus blades in the right corner, for depth
function fgGrass() {
  let s = '';
  for (let i = 0; i < 22; i++) {
    const x = 930 + rnd() * 290, h = 50 + rnd() * 90, bend = (rnd() - 0.3) * 50;
    s += `<path d="M${f(x)},470 q${f(bend * 0.3)},-${f(h * 0.6)} ${f(bend)},-${f(h)}" stroke="${['#8c774f', '#6f5f40', '#a8915f'][i % 3]}" stroke-width="${f(4 + rnd() * 5)}" opacity=".85"/>`;
  }
  return s;
}
function forest() {
  let s = '';
  for (let i = 0; i < 700; i++) {
    const x = 220 + rnd() * 1020, y = 262 + rnd() * 80;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(2 + rnd() * 3)}" ry="${f(3 + rnd() * 4)}"/>`;
  }
  return s;
}
const mtPath = mountainPath();
function stars() {
  if (!P.stars) return '';
  let s = '';
  for (let i = 0; i < 110; i++) {
    const x = rnd() * 1200, y = rnd() * 290, r = 0.5 + rnd() * 1.3;
    const tw = rnd() < 0.4 ? ` class="tw" style="animation-delay:${f(-rnd() * 4)}s;animation-duration:${f(2.5 + rnd() * 3)}s"` : '';
    s += `<circle${tw} cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff" opacity="${f((0.4 + rnd() * 0.6) * P.stars)}"/>`;
  }
  return `<g>${s}</g>`;
}
const sn = snow();
function ridges() {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x0 = 700 + rnd() * 66, a = -0.85 + (i / 8) * 1.7 + (rnd() - 0.5) * 0.12;
    const x1 = x0 + Math.sin(a) * 220, y1 = 92 + Math.cos(a) * 200;
    s += `<path d="M${f(x0)},92 Q${f((x0 + x1) / 2 + (rnd() - 0.5) * 20)},${f(150)} ${f(x1)},${f(y1)}" stroke-width="${f(5 + rnd() * 7)}" opacity="${f(0.3 + rnd() * 0.5)}"/>`;
  }
  return s;
}
const tint = P.tint.join(' ');

const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 460" width="1200" height="460">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${P.sky[0]}"/><stop offset=".58" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/>
  </linearGradient>
  <linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.mt[0]}"/><stop offset="1" stop-color="${P.mt[1]}"/></linearGradient>
  <linearGradient id="snow" x1="0" y1="0" x2="1" y2="0"><stop offset=".3" stop-color="${P.snow[0]}"/><stop offset=".7" stop-color="${P.snow[0]}"/><stop offset="1" stop-color="${P.snow[1]}"/></linearGradient>
  <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[2]}" stop-opacity="0"/><stop offset="1" stop-color="${P.sky[2]}" stop-opacity=".55"/></linearGradient>
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0a1230" stop-opacity="0"/><stop offset=".35" stop-color="#0a1230" stop-opacity=".22"/><stop offset="1" stop-color="#0a1230" stop-opacity=".3"/></linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bdb6aa"/><stop offset="1" stop-color="#7b746a"/></linearGradient>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
  <radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
  ${P.glow ? `<radialGradient id="glow" cx="${P.glow[1] / 1200}" cy="${P.glow[2] / 460}" r=".55"><stop offset="0" stop-color="${P.glow[0]}" stop-opacity="${P.glow[3]}"/><stop offset="1" stop-color="${P.glow[0]}" stop-opacity="0"/></radialGradient>` : ''}
  <filter id="grit" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 .2  0 0 0 0 .19  0 0 0 0 .17  0 0 0 1.4 -.55"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.35"/>
  </filter>
  <filter id="light"><feColorMatrix values="${P.tint[0]} 0 0 0 0  0 ${P.tint[1]} 0 0 0  0 0 ${P.tint[2]} 0 0  0 0 0 1 0"/></filter>
  <filter id="cloud" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="fur" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency=".03 .06" numOctaves="1" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="4.2"/>
  </filter>
  <filter id="ridgeblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.3"/></filter>
  <filter id="haze2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="moonglow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="shadow" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity=".28"/></filter>
  <mask id="crescent"><circle cx="1070" cy="78" r="20" fill="#fff"/><circle cx="1079" cy="72" r="18" fill="#000"/></mask>
  <clipPath id="snowclip"><path d="${sn.d}"/></clipPath>
  <clipPath id="frame"><rect width="1200" height="460" rx="26"/></clipPath>
  <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e5f40"/><stop offset="1" stop-color="#b09a6a"/></linearGradient>
  <radialGradient id="catbody" cx=".55" cy=".85" r=".7"><stop offset="0" stop-color="#f8f6f2"/><stop offset=".7" stop-color="#ebe7e0"/><stop offset="1" stop-color="#d2cbc1"/></radialGradient>
  <radialGradient id="cathead" cx=".45" cy=".3" r=".75"><stop offset="0" stop-color="#f6f3ee"/><stop offset=".75" stop-color="#e2ddd5"/><stop offset="1" stop-color="#b8b0a4"/></radialGradient>
  <linearGradient id="forestfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <mask id="forestmask"><rect y="240" width="1240" height="140" fill="url(#forestfade)"/></mask>
  <clipPath id="mtclip"><path d="${mtPath}"/></clipPath>
  <filter id="blades" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="1"/></filter>
  <filter id="pebblur" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="fgblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="lens" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="2.6"/></filter>
  <filter id="cirrus" x="-20%" y="-400%" width="140%" height="900%"><feGaussianBlur stdDeviation="4"/></filter>
  <clipPath id="belly"><path d="M40,470 C20,398 110,338 250,332 C390,326 480,352 528,384 C566,410 566,452 546,470 Z"/></clipPath>
  <clipPath id="headc"><circle cx="596" cy="412" r="92"/></clipPath>
  <style>
    .drift{animation:drift 80s linear infinite}
    .drift2{animation:drift 120s linear infinite}
    @keyframes drift{from{transform:translateX(-300px)}to{transform:translateX(1300px)}}
    .breathe{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 4.2s ease-in-out infinite}
    @keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.045)}}
    .ear{transform-box:fill-box;transform-origin:0% 50%;animation:twitch 9s ease-in-out infinite}
    @keyframes twitch{0%,88%,100%{transform:rotate(0)}90%{transform:rotate(-9deg)}92%{transform:rotate(3deg)}94%{transform:rotate(-6deg)}96%{transform:rotate(0)}}
    .z{transform-box:fill-box;transform-origin:50% 50%;font-family:${SERIF};font-style:italic;fill:#fff;opacity:0;animation:z 6s ease-out infinite}
    .z2{animation-delay:2s}.z3{animation-delay:4s}
    @keyframes z{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:.9}100%{opacity:0;transform:translate(60px,-120px) scale(1.3)}}
    .wire{animation:sway 7s ease-in-out infinite}
    @keyframes sway{0%,100%{d:path("M-10,286 Q600,302 1210,262")}50%{d:path("M-10,286 Q600,307 1210,262")}}
    .tw{animation:tw 3s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}
    .lens{animation:lens 24s ease-in-out infinite}
    @keyframes lens{0%,100%{transform:translateX(-8px)}50%{transform:translateX(10px)}}
    .m{display:none}
    @media (max-width:600px){.d{display:none}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.z{opacity:0}}
  </style>
</defs>
<g clip-path="url(#frame)">
  <rect width="1200" height="460" fill="url(#sky)"/>
  ${P.glow ? '<rect width="1200" height="460" fill="url(#glow)"/>' : ''}
  ${stars()}
  ${P.moon ? `<circle cx="1070" cy="78" r="26" fill="#dfe7ff" opacity=".35" filter="url(#moonglow)"/><rect x="1040" y="50" width="60" height="60" fill="#f4f1e6" mask="url(#crescent)"/>` : ''}

  <g filter="url(#cloud)" fill="${P.cloud[0]}" opacity="${P.cloud[1]}">
    <g class="drift"><ellipse cx="200" cy="60" rx="120" ry="18"/><ellipse cx="260" cy="52" rx="60" ry="14"/></g>
    <g class="drift2" style="animation-delay:-60s"><ellipse cx="300" cy="120" rx="160" ry="12" opacity=".7"/></g>
    <g class="drift" style="animation-delay:-35s"><ellipse cx="100" cy="30" rx="90" ry="12" opacity=".8"/></g>
    <g class="drift2" style="animation-delay:-95s"><ellipse cx="160" cy="210" rx="140" ry="10" opacity=".5"/></g>
  </g>

  <path d="${mtPath}" fill="url(#mt)"/>
  <path d="${sn.d}" fill="url(#snow)"/>
  <g clip-path="url(#snowclip)" stroke="${P.snow[1]}" fill="none" stroke-linecap="round" opacity=".4" filter="url(#ridgeblur)">${ridges()}</g>
  <g stroke="${P.snow[0]}" stroke-linecap="round" fill="none" opacity=".35">
    ${sn.streaks.map(([x, y, l]) => `<path d="M${f(x)},${f(y)} l${f((rnd() - 0.5) * 8)},${f(l)}" stroke-width="${f(1 + rnd() * 1.6)}"/>`).join('')}
  </g>
  <path d="M756,91 C790,150 812,220 860,372 L1240,372 L1240,320 C1080,300 900,220 770,92 Z" fill="url(#shade)"/>
  <g clip-path="url(#mtclip)" mask="url(#forestmask)">
    <rect y="240" width="1240" height="140" fill="${P.mt[1]}" opacity=".55"/>
    <g fill="#0b1426" opacity=".28">${forest()}</g>
  </g>
  <path d="M${L(0.62).map(f).join(',')} ${Array.from({ length: 32 }, (_, i) => L(0.62 - (i + 1) * 0.0194).map(f).join(',')).map((p) => `L${p}`).join(' ')}" stroke="${P.snow[0]}" stroke-width="2" fill="none" opacity=".35" filter="url(#soft)"/>
  <g class="lens" fill="${P.cloud[0]}" opacity="${f(P.cloud[1] * 0.85)}" filter="url(#lens)">
    <ellipse cx="732" cy="70" rx="118" ry="8"/><ellipse cx="736" cy="60" rx="92" ry="7" opacity=".85"/><ellipse cx="730" cy="51" rx="62" ry="5" opacity=".7"/>
  </g>
  <g fill="${P.cloud[0]}" opacity="${f(P.cloud[1] * 0.45)}" filter="url(#cirrus)">
    <ellipse class="drift2" style="animation-delay:-20s" cx="400" cy="26" rx="230" ry="3" transform="rotate(-3 400 26)"/>
    <ellipse class="drift2" style="animation-delay:-80s" cx="500" cy="44" rx="180" ry="2.5" transform="rotate(-2 500 44)"/>
  </g>
  <rect y="240" width="1200" height="110" fill="url(#haze)"/>

  <g filter="url(#light)">
    <path d="M0,338 C200,322 420,330 640,326 C840,322 1020,312 1200,318 L1200,380 L0,380 Z" fill="#26386a" filter="url(#haze2)"/>
    <path d="${treeline()}" fill="#141a2c" filter="url(#haze2)"/>
    <path d="M0,356 C300,350 700,354 1200,350 L1200,396 L0,396 Z" fill="url(#field)" filter="url(#haze2)"/>
    <g fill="none" stroke-linecap="round" filter="url(#blades)">${grass()}</g>
    <path class="wire" d="M-10,286 Q600,302 1210,262" stroke="#8a6b4a" stroke-width="1.6" fill="none" opacity=".8" filter="url(#soft)"/>
    <path d="M0,390 C200,383 420,389 640,385 C860,381 1040,387 1200,383 L1200,460 L0,460 Z" fill="url(#ground)"/>
    <path d="M0,390 C200,383 420,389 640,385 C860,381 1040,387 1200,383 L1200,460 L0,460 Z" fill="#fff" filter="url(#grit)"/>
    ${pebbles()}

    <g filter="url(#fur)">
      <ellipse cx="320" cy="474" rx="320" ry="34" fill="#2e2924" opacity=".5"/>
      <path d="M70,452 C30,446 0,420 -20,392" stroke="#e4dfd8" stroke-width="34" fill="none" stroke-linecap="round"/>
      <path d="M70,452 C30,446 0,420 -20,392" stroke="#6e665c" stroke-width="34" fill="none" stroke-dasharray="12 16" opacity=".6"/>
      <path d="M206,372 L252,318" stroke="#e9e4dd" stroke-width="64" stroke-linecap="round"/>
      <g class="breathe">
        <path d="M40,470 C20,398 110,338 250,332 C390,326 480,352 528,384 C566,410 566,452 546,470 Z" fill="url(#catbody)"/>
        <g clip-path="url(#belly)" stroke="#6e665c" fill="none" stroke-linecap="round" opacity=".6">
          <path d="M120,470 C130,430 150,400 190,380" stroke-width="18"/><path d="M190,470 C196,440 218,410 252,392" stroke-width="16"/>
          <path d="M268,470 C270,446 288,420 318,404" stroke-width="12"/><path d="M340,470 C340,446 356,424 384,410" stroke-width="12"/>
          <path d="M420,470 C418,446 432,424 458,412" stroke-width="15"/><path d="M490,470 C490,448 500,428 516,416" stroke-width="13"/>
          <path d="M60,420 C90,410 110,390 120,370" stroke-width="16" opacity=".7"/><path d="M150,350 C190,338 230,336 270,338" stroke-width="10" opacity=".5"/>
        </g>
        <ellipse cx="330" cy="448" rx="176" ry="30" fill="#fbfaf7" opacity=".8"/>
        <g fill="#7a7268" opacity=".35"><ellipse cx="260" cy="446" rx="9" ry="6"/><ellipse cx="320" cy="456" rx="8" ry="5"/><ellipse cx="384" cy="444" rx="9" ry="6"/><ellipse cx="440" cy="454" rx="7" ry="5"/></g>
      </g>
      <ellipse cx="270" cy="306" rx="46" ry="34" fill="#f4f1ec" transform="rotate(-30 270 306)"/>
      <g fill="#f4f1ec"><circle cx="284" cy="276" r="12"/><circle cx="302" cy="286" r="12"/><circle cx="306" cy="306" r="11"/></g>
      <ellipse cx="72" cy="380" rx="40" ry="32" fill="#e8e3dc"/>
      <path d="M512,360 C530,390 534,430 520,468" stroke="#a32c3c" stroke-width="12" fill="none"/>
      <circle cx="534" cy="420" r="9" fill="#e2b04a"/><circle cx="531" cy="417" r="3" fill="#fff3c4"/>
      <g transform="translate(486,352) rotate(-20)"><ellipse rx="24" ry="19" fill="#f4f1ec"/><g fill="#e8a0a6" opacity=".55" transform="scale(.8)"><ellipse cx="0" cy="5" rx="9" ry="7"/><circle cx="-12" cy="-7" r="4"/><circle cx="-3" cy="-12" r="4"/><circle cx="7" cy="-11" r="4"/><circle cx="14" cy="-4" r="4"/></g></g>
      <circle cx="596" cy="412" r="92" fill="url(#cathead)"/>
      <g clip-path="url(#headc)">
        <g stroke="#6a6258" stroke-width="11" stroke-linecap="round" opacity=".6" fill="none">
          <path d="M600,500 C602,462 600,444 596,428"/><path d="M626,496 C628,462 622,444 614,430"/><path d="M574,498 C574,462 578,446 584,432"/>
          <path d="M664,438 C678,424 686,408 690,390" opacity=".7"/><path d="M528,438 C516,424 508,408 506,390" opacity=".7"/>
          <path d="M652,408 C664,400 676,398 688,400" stroke-width="7" opacity=".55"/><path d="M540,408 C528,402 516,402 504,404" stroke-width="7" opacity=".55"/>
        </g>
        <ellipse cx="572" cy="344" rx="34" ry="24" fill="#f9f7f3"/><ellipse cx="616" cy="342" rx="34" ry="24" fill="#f9f7f3"/>
        <ellipse cx="594" cy="320" rx="22" ry="12" fill="#fbfaf7"/>
      </g>
      <g class="ear"><path d="M650,446 L716,454 L684,396 Z" fill="#a9a196"/><path d="M660,442 L700,446 L682,410 Z" fill="#e8b0ad" opacity=".85"/><path d="M700,452 L716,454 L708,440 Z" fill="#5e574e"/></g>
      <path d="M534,452 L556,500 L588,478 Z" fill="#a9a196"/><path d="M546,462 L558,488 L576,476 Z" fill="#e8b0ad" opacity=".7"/>
      <path d="M580,360 L604,360 L592,346 Z" fill="#e48791" stroke="#e48791" stroke-width="6" stroke-linejoin="round"/>
      <path d="M576,332 q8,-7 16,0 q8,-7 16,0" stroke="#8a6f6a" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>
      <path d="M592,346 L592,334" stroke="#8a6f6a" stroke-width="2.2" opacity=".6"/>
      <path d="M546,392 q14,-8 28,0" stroke="#3a332d" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M610,390 q14,-8 28,0" stroke="#3a332d" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85" filter="url(#soft)">
      <path d="M604,340 C626,300 646,270 664,250"/><path d="M610,344 C636,314 660,292 684,278"/>
      <path d="M614,350 C644,330 674,320 700,314"/><path d="M598,336 C606,298 612,270 618,248"/>
      <path d="M572,340 C560,312 552,292 544,278"/><path d="M566,344 C546,324 528,310 512,302"/>
      <path d="M570,350 C546,340 526,336 506,334"/>
    </g>
    <g filter="url(#fgblur)" fill="none" stroke-linecap="round">${fgGrass()}</g>
  </g>

  <text class="z" x="660" y="300" font-size="30">z</text>
  <text class="z z2" x="660" y="300" font-size="30">z</text>
  <text class="z z3" x="660" y="300" font-size="30">z</text>

  <rect width="1200" height="460" fill="url(#fade)"/>
  <rect width="1200" height="460" fill="url(#vig)"/>
  <rect width="1200" height="460" filter="url(#grain)" opacity=".05"/>

  <g filter="url(#shadow)">
    <text x="72" y="150" font-family="${SERIF}" font-style="italic" font-size="96" fill="#fff" letter-spacing="-2">tuhronto</text>
    <text class="d" x="78" y="196" font-family="${MONO}" font-size="15" fill="#fff" opacity=".85" letter-spacing="5">VERSED  ·  KAEDE  ·  ZZBOARD</text>
  </g>
  <g class="d" font-family="'Hiragino Mincho ProN', 'Yu Mincho', 'MS Mincho', serif" font-size="20" fill="#fff" opacity=".6" text-anchor="middle">
    <text x="1150" y="56">富</text><text x="1150" y="82">士</text><text x="1150" y="108">山</text>
  </g>
</g>
</svg>`;
writeFileSync(`${out}/header.svg`, header);

/* ---------------- shared card frame ---------------- */
// d = desktop copy, m = phone copy (shown when the image is drawn under 600px wide)
function card({ id, bg, body, defs = '', style = '', title, titleFont, titleColor, lines, meta, mLines, mMeta, sub, metaColor }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320">
<defs>
  <clipPath id="${id}c"><rect width="1200" height="320" rx="26"/></clipPath>
  <linearGradient id="${id}sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="${id}grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="5"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.35"/>
  </filter>
  ${defs}
  <style>
    .m{display:none}
    @media (max-width:600px){.d{display:none}.m{display:inline}.vis{opacity:.55}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
    ${style}
  </style>
</defs>
<g clip-path="url(#${id}c)">
  ${bg}
  <g class="vis">${body}</g>
  <rect width="1200" height="320" filter="url(#${id}grain)" opacity=".035"/>
  <g class="d">
    <text x="72" y="150" font-family="${titleFont}" font-size="${title[1]}" fill="${titleColor}" letter-spacing="${title[2]}"${title[3] || ''}>${title[0]}</text>
    ${lines.map((l, i) => `<text x="76" y="${196 + i * 28}" font-family="${SANS}" font-size="20" fill="${sub}">${esc(l)}</text>`).join('')}
    <text x="76" y="278" font-family="${MONO}" font-size="12.5" fill="${metaColor}" letter-spacing="2.5">${esc(meta)}</text>
  </g>
  <g class="m">
    <text x="64" y="140" font-family="${titleFont}" font-size="${title[1] * 1.45}" fill="${titleColor}" letter-spacing="${title[2]}"${title[3] || ''}>${title[0]}</text>
    ${mLines.map((l, i) => `<text x="68" y="${206 + i * 46}" font-family="${SANS}" font-size="40" font-weight="600" fill="${sub}">${esc(l)}</text>`).join('')}
    ${mMeta ? `<text x="1130" y="58" text-anchor="end" font-family="${MONO}" font-size="30" fill="${metaColor}">${esc(mMeta)}</text>` : ''}
  </g>
  <rect width="1200" height="320" fill="url(#${id}sheen)"/>
</g>
<rect x=".5" y=".5" width="1199" height="319" rx="26" fill="none" stroke="#fff" stroke-opacity=".09"/>
</svg>`;
}

/* ---------------- versed ---------------- */
const lyrics = ['left the porch light on for you', 'the radio keeps humming low', 'we drove until the city blurred', 'and every song was ours to know'];
const LYR = 3.2;
const lyricLines = lyrics.map((l, i) => `<text class="ly" style="animation-delay:${f(i * LYR)}s" x="0" y="0">${esc(l)}</text>`).join('');
const bars = [64, 46, 28, 46, 64].map((h, i) => `<rect class="bar" style="animation-delay:${f(i * 0.18)}s" x="${i * 15}" y="0" width="9" height="${h}" rx="4.5" fill="#fff"/>`).join('');
const vMeta = [tag(versedRel.tag), versedRel.downloads ? `${short(versedRel.downloads)} downloads` : null, 'windows · macos · linux'].filter(Boolean).join('  ·  ').toUpperCase();

const versed = card({
  id: 'v',
  bg: `<rect width="1200" height="320" fill="#09090b"/>
  <g filter="url(#vblur)" opacity=".6">
    <circle class="blob a" cx="880" cy="110" r="160" fill="#c2417a"/>
    <circle class="blob b" cx="1080" cy="250" r="150" fill="#3d3fc4"/>
    <circle class="blob c" cx="720" cy="300" r="120" fill="#e0894a"/>
  </g>
  <rect width="1200" height="320" fill="url(#vside)"/>`,
  body: `<g class="d" transform="translate(72,34) scale(.85)">${bars}</g>
  <g transform="translate(700,40)" filter="url(#vshadow)">
    <rect width="430" height="240" rx="16" fill="#111214"/>
    <rect width="430" height="240" rx="16" fill="none" stroke="#fff" stroke-opacity=".08"/>
    <path d="M0,16 a16,16 0 0 1 16,-16 h398 a16,16 0 0 1 16,16 v44 h-430 Z" fill="url(#vart)" opacity=".85"/>
    <circle cx="58" cy="62" r="36" fill="#111214"/>
    <g clip-path="url(#vava)">
      <rect x="28" y="32" width="60" height="60" fill="url(#vavasky)"/>
      <path d="M28,80 L50,58 L58,54 L64,58 L88,80 Z" fill="#3a5592"/>
      <path d="M50,58 L58,54 L64,58 L60,62 L56,59 L52,63 Z" fill="#fff"/>
      <ellipse cx="44" cy="88" rx="22" ry="10" fill="#e9e5df"/>
    </g>
    <circle cx="83" cy="86" r="9" fill="#111214"/><circle cx="83" cy="86" r="5.5" fill="#23a55a"/>
    <text x="24" y="124" font-family="${SANS}" font-size="20" font-weight="700" fill="#f2f3f5">tuhronto</text>
    <text x="24" y="160" font-family="${SANS}" font-size="11" font-weight="700" fill="#b5bac1" letter-spacing="1">LISTENING TO VERSED</text>
    <rect x="24" y="172" width="52" height="52" rx="8" fill="url(#vart)"/>
    <text x="90" y="188" font-family="${SANS}" font-size="14" font-weight="600" fill="#f2f3f5">porch light</text>
    <g transform="translate(90,207)" font-family="${SANS}" font-size="13" fill="#dbdee1">${lyricLines}</g>
    <rect x="90" y="217" width="310" height="4" rx="2" fill="#4e5058"/>
    <rect class="prog" x="90" y="217" width="310" height="4" rx="2" fill="#f2f3f5"/>
  </g>`,
  defs: `<filter id="vblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
  <filter id="vshadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".55"/></filter>
  <linearGradient id="vside" x1="0" x2="1"><stop offset=".3" stop-color="#09090b"/><stop offset=".6" stop-color="#09090b" stop-opacity=".25"/><stop offset="1" stop-color="#09090b" stop-opacity="0"/></linearGradient>
  <linearGradient id="vart" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0894a"/><stop offset=".5" stop-color="#c2417a"/><stop offset="1" stop-color="#3d3fc4"/></linearGradient>
  <linearGradient id="vavasky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a66d4"/><stop offset="1" stop-color="#9dbdea"/></linearGradient>
  <clipPath id="vava"><circle cx="58" cy="62" r="30"/></clipPath>`,
  style: `.ly{opacity:0;animation:ly ${lyrics.length * LYR}s ease-in-out infinite}
   @keyframes ly{0%{opacity:0;transform:translateY(5px)}4%{opacity:1;transform:none}21%{opacity:1;transform:none}25%{opacity:0;transform:translateY(-5px)}100%{opacity:0}}
   .prog{transform-box:fill-box;transform-origin:0 50%;animation:prog ${lyrics.length * LYR}s linear infinite}
   @keyframes prog{from{transform:scaleX(.08)}to{transform:scaleX(1)}}
   .bar{transform-box:fill-box;transform-origin:50% 0;animation:eq 1.6s ease-in-out infinite}
   @keyframes eq{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.72)}}
   .blob{transform-box:fill-box;transform-origin:center}
   .a{animation:wa 14s ease-in-out infinite}.b{animation:wb 17s ease-in-out infinite}.c{animation:wa 21s ease-in-out infinite reverse}
   @keyframes wa{0%,100%{transform:translate(0,0)}50%{transform:translate(-90px,40px)}}
   @keyframes wb{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-50px)}}`,
  title: ['versed', 64, -2, ' font-weight="600"'],
  titleFont: SANS, titleColor: '#fafafa', sub: '#a1a1aa', metaColor: '#71717a',
  lines: ["your discord status sings along to", "whatever you're playing"],
  meta: vMeta,
  mLines: ['lyrics in your', 'discord status'],
});
writeFileSync(`${out}/versed.svg`, versed);

/* ---------------- kaede ---------------- */
const leaf = 'M0,-24 L4,-12 L13,-17 L10,-6 L22,-8 L15,1 L24,6 L12,8 L14,17 L4,11 L1,24 L-1,24 L-4,11 L-14,17 L-12,8 L-24,6 L-15,1 L-22,-8 L-10,-6 L-13,-17 L-4,-12 Z';
const leafCols = [['#f26a2e', '#c4321f'], ['#f6a03e', '#e0602a'], ['#d8382a', '#8f1c1c'], ['#f7c254', '#e8862e']];
const leafDefs = leafCols.map(([a, b], i) => `<linearGradient id="kl${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('');
const leaves = Array.from({ length: 11 }, (_, i) => {
  const x = 30 + rnd() * 1140, s = 0.45 + rnd() * 0.6, dur = 10 + rnd() * 9, delay = -rnd() * 18;
  return `<g transform="translate(${f(x)},0)"><g class="leaf" style="animation-duration:${f(dur)}s;animation-delay:${f(delay)}s"><g class="flip" style="animation-duration:${f(2 + rnd() * 2)}s"><g transform="scale(${f(s)})"><path d="${leaf}" fill="url(#kl${i % 4})"/><path d="M0,24 L0,34" stroke="${leafCols[i % 4][1]}" stroke-width="2"/><path d="M0,22 L0,-14 M0,6 L-12,-4 M0,6 L12,-4" stroke="#000" stroke-opacity=".18" stroke-width="1.2"/></g></g></g></g>`;
}).join('');
const laneX = [744, 846, 948, 1050];
const keys = ['d', 'f', 'j', 'k'];
const pattern = [0, 2, 1, 3, 0, 1, 2, 3, 1, 2, 0, 3];
const STEP = 0.3, FALL = 3.6;
const notes = pattern.map((lane, i) => `<rect class="note" style="animation-delay:${f(i * STEP)}s" x="${laneX[lane] + 10}" y="-30" width="80" height="16" rx="8" fill="url(#knote)" filter="url(#kng)"/>`).join('');
const firstHit = (lane) => pattern.indexOf(lane) * STEP + FALL * 0.3667;
const lanes = laneX.map((x, i) => `
  <rect x="${x + 10}" y="246" width="80" height="16" rx="8" fill="none" stroke="#ffe2bf" stroke-opacity=".45" stroke-width="2"/>
  <rect class="flash" style="animation-delay:${f(firstHit(i))}s" x="${x}" y="150" width="100" height="120" fill="url(#kglow)"/>
  <text class="pf" style="animation-delay:${f(firstHit(i))}s" x="${x + 50}" y="232" text-anchor="middle" font-family="${SANS}" font-size="12" fill="#ffe7c7">perfect</text>
  <rect x="${x + 34}" y="278" width="32" height="26" rx="6" fill="#ffe2bf" fill-opacity=".08" stroke="#ffe2bf" stroke-opacity=".25"/>
  <text x="${x + 50}" y="296" text-anchor="middle" font-family="${MONO}" font-size="13" fill="#ffe2bf" opacity=".75">${keys[i]}</text>`).join('');
const bokeh = Array.from({ length: 14 }, () => `<circle cx="${f(rnd() * 1200)}" cy="${f(rnd() * 320)}" r="${f(10 + rnd() * 40)}" fill="#ffb36b" opacity="${f(0.04 + rnd() * 0.08)}"/>`).join('');
const kMeta = [tag(kaedeV), 'free, in your browser', 'playkaede.vercel.app'].filter(Boolean).join('  ·  ').toUpperCase();

const kaede = card({
  id: 'k',
  bg: `<rect width="1200" height="320" fill="url(#kbg)"/>
  <circle cx="980" cy="20" r="240" fill="#ff9a4d" opacity=".2" filter="url(#kb)"/>
  <g filter="url(#kbk)">${bokeh}</g>`,
  body: `<g mask="url(#kmask)">
    <rect x="734" y="0" width="420" height="320" fill="#120607" fill-opacity=".45"/>
    ${laneX.slice(1).map((x) => `<line x1="${x - 1}" y1="0" x2="${x - 1}" y2="320" stroke="#ffe2bf" stroke-opacity=".08"/>`).join('')}
    <line x1="744" y1="254" x2="1150" y2="254" stroke="#ffcf8a" stroke-opacity=".35"/>
    ${lanes}
    <g>${notes}</g>
  </g>
  <rect x="0" y="0" width="1200" height="320" fill="url(#kside)"/>
  ${leaves}`,
  defs: `<linearGradient id="kbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a0a0c"/><stop offset=".55" stop-color="#3b1314"/><stop offset="1" stop-color="#6e2618"/></linearGradient>
  <linearGradient id="kside" x1="0" x2="1"><stop offset=".35" stop-color="#1a0a0c" stop-opacity=".9"/><stop offset=".58" stop-color="#1a0a0c" stop-opacity="0"/></linearGradient>
  <linearGradient id="knote" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3e2"/><stop offset="1" stop-color="#ffb978"/></linearGradient>
  <linearGradient id="kfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff"/></linearGradient>
  <mask id="kmask"><rect width="1200" height="320" fill="url(#kfade)"/></mask>
  <radialGradient id="kglow" cx=".5" cy=".85" r=".55"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
  <filter id="kb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>
  <filter id="kbk" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="kng" x="-30%" y="-100%" width="160%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ffb978" flood-opacity=".7"/></filter>
  ${leafDefs}`,
  style: `.note{animation:fall ${FALL}s linear infinite}
   @keyframes fall{0%{transform:translateY(0)}36.67%{transform:translateY(284px);opacity:1}38%{transform:translateY(294px);opacity:0}100%{transform:translateY(294px);opacity:0}}
   .flash{opacity:0;animation:flash ${FALL}s ease-out infinite}
   @keyframes flash{0%{opacity:.95}12%{opacity:0}100%{opacity:0}}
   .pf{opacity:0;animation:pf ${FALL}s ease-out infinite}
   @keyframes pf{0%{opacity:0;transform:translateY(4px)}3%{opacity:.9;transform:none}14%{opacity:0;transform:translateY(-8px)}100%{opacity:0}}
   .leaf{animation:leaf 12s linear infinite}
   @keyframes leaf{0%{transform:translate(0,-40px) rotate(0)}50%{transform:translate(60px,160px) rotate(200deg)}100%{transform:translate(-20px,370px) rotate(420deg)}}
   .flip{animation:flip 3s ease-in-out infinite alternate}
   @keyframes flip{from{transform:scaleX(1)}to{transform:scaleX(-.6)}}`,
  title: ['kaede!', 80, -1, ' font-style="italic"'],
  titleFont: SERIF, titleColor: '#fff4e6', sub: '#f3c9a8', metaColor: '#c98f6c',
  lines: ['rhythm game in your browser. drop in any song,', 'it writes the chart for you'],
  meta: kMeta,
  mLines: ['rhythm game that', 'charts any song'],
});
writeFileSync(`${out}/kaede.svg`, kaede);

/* ---------------- zzboard ---------------- */
const cat = [
  '      |\\      _,,,---,,_',
  'ZZZzz /,`.-\'`\'    -.  ;-;;,_',
  '     |,4-  ) )-,_. ,\\ (  `\'-\'',
  '    \'---\'\'(_/--\'  `-\'\\_)',
];
const catText = cat.map((l, i) => `<text x="0" y="${i * 18}" xml:space="preserve">${esc(l)}</text>`).join('');
let sp = [];
for (let i = 0; i <= 100; i++) sp.push([i * 5, f(30 - Math.abs(Math.sin(i * 0.45)) * 14 - rnd() * 10)]);
// repeat the first 20 points after the end so the scroll loops seamlessly
sp = sp.slice(0, 80).concat(sp.slice(0, 21).map(([x, y]) => [x + 400, y]));
const sparkLine = sp.map(([x, y]) => `${x},${y}`).join(' ');
const sparkArea = `M0,36 L${sparkLine.replace(/ /g, ' L')} L${sp.at(-1)[0]},36 Z`;
const cores = Array.from({ length: 8 }, (_, i) => `<rect class="core" style="animation-delay:${f(-rnd() * 2)}s;animation-duration:${f(1.2 + rnd() * 1.4)}s" x="${i * 13}" y="0" width="9" height="30" rx="2" fill="url(#zcore)"/>`).join('');
const ram = Array.from({ length: 22 }, (_, i) => `<rect x="${i * 10}" y="0" width="7" height="11" rx="2" fill="#8b5cf6" opacity="${i < 15 ? 0.9 : 0.18}"/>`).join('');
const zMeta = [tag(zzRel.tag), 'windows', 'open source'].filter(Boolean).join('  ·  ').toUpperCase();

const zz = card({
  id: 'z',
  bg: `<rect width="1200" height="320" fill="#0c0a13"/>
  <circle cx="900" cy="160" r="280" fill="#8b5cf6" opacity=".18" filter="url(#zb)"/>
  <g opacity=".07" stroke="#a78bfa">${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 20 + 10}" x2="1200" y2="${i * 20 + 10}"/>`).join('')}</g>`,
  body: `<g transform="translate(590,26)" filter="url(#zshadow)">
    <rect width="560" height="268" rx="14" fill="#14111d"/>
    <rect width="560" height="268" rx="14" fill="none" stroke="#8b5cf6" stroke-opacity=".4"/>
    <circle cx="22" cy="20" r="5" fill="#ff5f57" opacity=".8"/><circle cx="40" cy="20" r="5" fill="#febc2e" opacity=".8"/><circle cx="58" cy="20" r="5" fill="#28c840" opacity=".8"/>
    <g font-family="${MONO}" font-size="12">
      <text x="96" y="24" fill="#ede9fe">system</text><rect x="96" y="31" width="44" height="2" rx="1" fill="#8b5cf6"/>
      <text x="162" y="24" fill="#6b6189">weather</text><text x="234" y="24" fill="#6b6189">music</text><text x="292" y="24" fill="#6b6189">games</text>
      <text x="536" y="24" text-anchor="end" fill="#6b6189">23:41</text>
    </g>
    <line x1="0" y1="40" x2="560" y2="40" stroke="#8b5cf6" stroke-opacity=".2"/>
    <g font-family="${MONO}" font-size="13">
      <text x="22" y="72" fill="#8b5cf6">cpu</text>
      <svg x="62" y="48" width="300" height="36" viewBox="0 0 300 36">
        <g class="spark"><path d="${sparkArea}" fill="url(#zarea)"/><polyline points="${sparkLine}" fill="none" stroke="#a78bfa" stroke-width="1.6"/></g>
      </svg>
      <g transform="translate(380,48) scale(1,-1) translate(0,-36)">${cores}</g>
      <text x="538" y="72" text-anchor="end" fill="#ede9fe">23%</text>
      <text x="22" y="110" fill="#8b5cf6">ram</text>
      <g transform="translate(62,99)">${ram}</g>
      <text x="538" y="110" text-anchor="end" fill="#ede9fe">11.8 / 16 gb</text>
      <text x="22" y="140" fill="#8b5cf6">sky</text>
      <text x="62" y="140" fill="#c4b5fd">golden hour · 14° · sunset in 0:42</text>
      <text x="22" y="170" fill="#8b5cf6">now</text>
      <text x="62" y="170" fill="#c4b5fd">porch light · the late drivers</text>
      <rect x="352" y="164" width="186" height="3" rx="1.5" fill="#2e2742"/>
      <rect class="zprog" x="352" y="164" width="186" height="3" rx="1.5" fill="#a78bfa"/>
      <line x1="22" y1="186" x2="538" y2="186" stroke="#8b5cf6" stroke-opacity=".15"/>
      <g transform="translate(40,210)" fill="#ddd6fe" font-size="13" class="sleep">${catText}</g>
      <text x="538" y="252" text-anchor="end" fill="#6b6189" font-size="11">mochi is asleep</text>
    </g>
  </g>`,
  defs: `<filter id="zb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
  <filter id="zshadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".5"/></filter>
  <linearGradient id="zarea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".45"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient>
  <linearGradient id="zcore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient>`,
  style: `.spark{animation:spark 8s linear infinite}
   @keyframes spark{from{transform:translateX(0)}to{transform:translateX(-400px)}}
   .core{transform-box:fill-box;transform-origin:50% 0;animation:core 1.6s ease-in-out infinite alternate}
   @keyframes core{from{transform:scaleY(.2)}to{transform:scaleY(.9)}}
   .zprog{transform-box:fill-box;transform-origin:0 50%;animation:zp 14s linear infinite}
   @keyframes zp{from{transform:scaleX(.05)}to{transform:scaleX(1)}}
   .sleep{animation:sleep 4.2s ease-in-out infinite}
   @keyframes sleep{0%,100%{opacity:.95}50%{opacity:.6}}
   .cursor{animation:blink 1.1s steps(1) infinite}
   @keyframes blink{50%{opacity:0}}`,
  title: ['zzboard<tspan class="cursor" fill="#8b5cf6">_</tspan>', 70, -3, ' font-weight="700"'],
  titleFont: MONO, titleColor: '#ede9fe', sub: '#b4a9d6', metaColor: '#7c6fa8',
  lines: ['a terminal dashboard with a cat asleep on it.', 'stats, weather, spotify, snake, tetris'],
  meta: zMeta,
  mLines: ['terminal dashboard,', 'cat included'],
});
writeFileSync(`${out}/zzboard.svg`, zz);

/* ---------------- footer ---------------- */
// the header's landscape, seen further off: a small fuji, the same field and gravel,
// and paw prints leading to a red post box with the cat asleep on top
const DISCORD = '@ztuhronto';
const PAWS = 14, STEP_S = 0.4;
const paw = `<path d="M-8,4 C-9,-3 -4,-7 0,-7 C4,-7 9,-3 8,4 C7,9 3,9 0,8 C-3,9 -7,9 -8,4 Z"/>
    <ellipse cx="-10" cy="-10" rx="3.4" ry="4.4" transform="rotate(-25 -10 -10)"/><ellipse cx="-3.6" cy="-15" rx="3.4" ry="4.6"/>
    <ellipse cx="3.6" cy="-15" rx="3.4" ry="4.6"/><ellipse cx="10" cy="-10" rx="3.4" ry="4.4" transform="rotate(25 10 -10)"/>`;
const paws = Array.from({ length: PAWS }, (_, i) => {
  const x = 440 + i * 40, y = 196 + Math.sin(i * 0.45) * 3 + (i % 2 ? -8 : 8);
  return `<g class="paw" style="animation-delay:${f(i * STEP_S)}s" transform="translate(${f(x)},${f(y)}) rotate(${i % 2 ? 84 : 96}) scale(${f(0.8 + i * 0.012)})">${paw}</g>`;
}).join('');
const fStars = P.stars ? Array.from({ length: 60 }, () => {
  const tw = rnd() < 0.4 ? ` class="tw" style="animation-delay:${f(-rnd() * 4)}s"` : '';
  return `<circle${tw} cx="${f(rnd() * 1200)}" cy="${f(rnd() * 120)}" r="${f(0.5 + rnd() * 1.2)}" fill="#fff" opacity="${f((0.4 + rnd() * 0.6) * P.stars)}"/>`;
}).join('') : '';
// fireflies after dark, drifting dust in daylight
const dark = !!P.stars;
const motes = Array.from({ length: dark ? 14 : 10 }, () => {
  const x = 420 + rnd() * 760, y = 90 + rnd() * 90, d = f(5 + rnd() * 6);
  return `<circle class="mote" style="animation-duration:${d}s;animation-delay:${f(-rnd() * 8)}s" cx="${f(x)}" cy="${f(y)}" r="${f(dark ? 1.8 + rnd() * 1.4 : 1.2 + rnd())}" fill="${dark ? '#ffe28a' : '#fff'}" filter="url(#fmote)"/>`;
}).join('');
const chat = `<path d="M0,4 a6,6 0 0 1 6,-6 h16 a6,6 0 0 1 6,6 v10 a6,6 0 0 1 -6,6 h-9 l-6,5 v-5 h-1 a6,6 0 0 1 -6,-6 Z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
  <circle cx="8" cy="9" r="1.8" fill="#fff"/><circle cx="14" cy="9" r="1.8" fill="#fff"/><circle cx="20" cy="9" r="1.8" fill="#fff"/>`;
const miniFuji = (() => {
  const pts = [];
  for (let t = 1; t >= 0; t -= 0.05) pts.push([690 - 150 * t, 84 + 60 * (1 - (1 - t) ** 2.2)]);
  pts.push([694, 83], [702, 85], [712, 82], [720, 84]);
  for (let t = 0; t <= 1; t += 0.05) pts.push([720 + 160 * t, 84 + 58 * (1 - (1 - t) ** 2.2)]);
  return `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L')} Z`;
})();
const miniSnow = 'M690,84 L694,83 L702,85 L712,82 L720,84 L742,100 L736,99 L733,106 L728,100 L722,104 L719,111 L714,102 L708,105 L704,99 L699,106 L695,100 L689,103 L684,98 L678,101 L670,99 Z';

const footer = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 220" width="1200" height="220">
<defs>
  <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset=".55" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>
  ${P.glow ? `<radialGradient id="fglow" cx="${P.glow[1] / 1200}" cy=".7" r=".6"><stop offset="0" stop-color="${P.glow[0]}" stop-opacity="${P.glow[3]}"/><stop offset="1" stop-color="${P.glow[0]}" stop-opacity="0"/></radialGradient>` : ''}
  <linearGradient id="fmt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.mt[0]}"/><stop offset="1" stop-color="${P.mt[1]}"/></linearGradient>
  <linearGradient id="fhaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[2]}" stop-opacity="0"/><stop offset="1" stop-color="${P.sky[2]}" stop-opacity=".6"/></linearGradient>
  <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e5f40"/><stop offset="1" stop-color="#b09a6a"/></linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bdb6aa"/><stop offset="1" stop-color="#7b746a"/></linearGradient>
  <linearGradient id="fdark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".42" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="fbottom" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
  <linearGradient id="box" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f1a1f"/><stop offset=".3" stop-color="#d9363a"/><stop offset=".55" stop-color="#e6474a"/><stop offset="1" stop-color="#7d1418"/></linearGradient>
  <radialGradient id="loafg" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#f6f3ee"/><stop offset=".8" stop-color="#e4dfd7"/><stop offset="1" stop-color="#c7bfb3"/></radialGradient>
  <filter id="grit" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 .2  0 0 0 0 .19  0 0 0 0 .17  0 0 0 1.4 -.55"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="flight"><feColorMatrix values="${P.tint[0]} 0 0 0 0  0 ${P.tint[1]} 0 0 0  0 0 ${P.tint[2]} 0 0  0 0 0 1 0"/></filter>
  <filter id="haze2"><feGaussianBlur stdDeviation="1.5"/></filter>
  <filter id="blades" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation=".8"/></filter>
  <filter id="pebblur" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="fmote" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="${dark ? 1.6 : 0.8}"/></filter>
  <filter id="fsoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>
  <filter id="fshadow" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000" flood-opacity=".3"/></filter>
  <filter id="fcloud" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  <clipPath id="fframe"><rect width="1200" height="220" rx="26"/></clipPath>
  <style>
    .paw{fill:#5a5249;opacity:0;animation:paw ${f(PAWS * STEP_S + 6)}s ease-in-out infinite}
    @keyframes paw{0%{opacity:0}2%{opacity:.65}55%{opacity:.65}70%,100%{opacity:0}}
    .tw{animation:tw 3s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}
    .mote{opacity:0;animation:mote 7s ease-in-out infinite}
    @keyframes mote{0%{opacity:0;transform:translate(0,0)}30%{opacity:${dark ? 0.95 : 0.6}}70%{opacity:${dark ? 0.8 : 0.4}}100%{opacity:0;transform:translate(24px,-22px)}}
    .drift{animation:drift 90s linear infinite}
    @keyframes drift{from{transform:translateX(-300px)}to{transform:translateX(1300px)}}
    .loaf{transform-box:fill-box;transform-origin:50% 100%;animation:loaf 4.2s ease-in-out infinite}
    @keyframes loaf{0%,100%{transform:scale(1,1)}50%{transform:scale(1.01,1.06)}}
    .tail{transform-box:fill-box;transform-origin:50% 0;animation:tail 5s ease-in-out infinite}
    @keyframes tail{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(6deg)}}
    .fz{transform-box:fill-box;transform-origin:50% 50%;font-family:${SERIF};font-style:italic;fill:#fff;opacity:0;animation:fz 6s ease-out infinite}
    .fz2{animation-delay:3s}
    @keyframes fz{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:.85}100%{opacity:0;transform:translate(26px,-56px) scale(1.2)}}
    .chip{animation:chip 5s ease-in-out infinite}
    @keyframes chip{0%,100%{stroke-opacity:.22}50%{stroke-opacity:.45}}
    .m{display:none}
    @media (max-width:600px){.d{display:none}.m{display:inline}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}.paw{opacity:.55}.fz,.mote{opacity:0}}
  </style>
</defs>
<g clip-path="url(#fframe)">
  <rect width="1200" height="220" fill="url(#fsky)"/>
  ${P.glow ? '<rect width="1200" height="220" fill="url(#fglow)"/>' : ''}
  ${fStars}
  ${P.moon ? '<circle cx="1110" cy="34" r="9" fill="#f4f1e6" opacity=".9"/><circle cx="1114" cy="31" r="8" fill="' + P.sky[0] + '"/>' : ''}
  <g filter="url(#fcloud)" fill="${P.cloud[0]}" opacity="${f(P.cloud[1] * 0.7)}">
    <ellipse class="drift" cx="300" cy="40" rx="110" ry="9"/><ellipse class="drift" style="animation-delay:-50s" cx="200" cy="74" rx="140" ry="7"/>
  </g>

  <path d="${miniFuji}" fill="url(#fmt)"/>
  <path d="${miniSnow}" fill="${P.snow[0]}"/>
  <path d="M0,124 C120,112 220,118 330,112 C430,106 520,124 620,132 C700,138 780,138 860,128 C960,114 1060,118 1200,108 L1200,150 L0,150 Z" fill="${P.mt[1]}" opacity=".75"/>
  <rect y="96" width="1200" height="56" fill="url(#fhaze)"/>

  <g filter="url(#flight)">
    <g transform="translate(0,-212)">
      <path d="${treeline()}" fill="#141a2c" filter="url(#haze2)"/>
      <path d="M0,356 C300,350 700,354 1200,350 L1200,396 L0,396 Z" fill="url(#field)" filter="url(#haze2)"/>
      <g fill="none" stroke-linecap="round" filter="url(#blades)">${grass()}</g>
      <path d="M0,390 C200,383 420,389 640,385 C860,381 1040,387 1200,383 L1200,460 L0,460 Z" fill="url(#ground)"/>
      <path d="M0,390 C200,383 420,389 640,385 C860,381 1040,387 1200,383 L1200,460 L0,460 Z" fill="#fff" filter="url(#grit)"/>
      ${pebbles()}
    </g>
    ${paws}

    <g transform="translate(1046,0)">
      <ellipse cx="0" cy="206" rx="46" ry="7" fill="#000" opacity=".3"/>
      <rect x="-20" y="188" width="40" height="18" fill="#2b2522"/>
      <path d="M-32,108 a32,14 0 0 1 64,0 V190 h-64 Z" fill="url(#box)"/>
      <ellipse cx="0" cy="108" rx="32" ry="14" fill="#e85154"/>
      <ellipse cx="0" cy="106" rx="26" ry="9" fill="#f06a6c" opacity=".6"/>
      <rect x="-20" y="128" width="40" height="7" rx="3.5" fill="#3a0d10"/>
      <rect x="-32" y="186" width="64" height="5" fill="#6d1115"/>
      <g stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".92">
        <path d="M-9,150 h18 M-9,157 h18 M0,157 v14"/>
      </g>
      <g class="tail"><path d="M30,104 C40,114 40,132 34,148" stroke="#ddd7cf" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M30,104 C40,114 40,132 34,148" stroke="#867d72" stroke-width="9" fill="none" stroke-linecap="butt" stroke-dasharray="5 7" opacity=".55"/></g>
      <g filter="url(#fsoft)">
        <g class="loaf">
          <path d="M-30,104 C-32,86 -16,74 4,74 C24,74 36,86 34,102 C33,107 -29,108 -30,104 Z" fill="url(#loafg)"/>
          <g stroke="#867d72" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".5">
            <path d="M-2,76 C2,82 4,88 4,96"/><path d="M10,76 C16,82 18,90 18,98"/><path d="M22,80 C28,86 30,92 30,100"/>
          </g>
        </g>
        <circle cx="-22" cy="94" r="13" fill="#ebe6df"/>
        <path d="M-33,87 L-37,73 L-26,81 Z M-17,81 L-11,71 L-9,85 Z" fill="#cbc4ba"/><path d="M-32,85 L-34,77 L-28,82 Z M-15,82 L-12,76 L-11,84 Z" fill="#e8b0ad"/>
        <path d="M-29,95 q3.5,2.5 7,0 M-19,94 q3.5,2.5 7,0" stroke="#3a332d" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <ellipse cx="-20" cy="100" rx="2" ry="1.4" fill="#e48791"/>
      </g>
    </g>
    <text class="fz" x="1018" y="70" font-size="18">z</text>
    <text class="fz fz2" x="1018" y="70" font-size="18">z</text>
    ${motes}
  </g>
  <rect width="1200" height="220" fill="url(#fbottom)"/>
  <rect width="1200" height="220" fill="url(#fdark)"/>

  <g class="d" filter="url(#fshadow)">
    <text x="72" y="74" font-family="${SERIF}" font-style="italic" font-size="52" fill="#fff" letter-spacing="-1">say hi</text>
    <text x="74" y="104" font-family="${MONO}" font-size="12" fill="#fff" opacity=".75" letter-spacing="3">FIND ME ON DISCORD</text>
    <g transform="translate(72,124)">
      <rect class="chip" width="268" height="54" rx="27" fill="#000" fill-opacity=".32" stroke="#fff" stroke-opacity=".22"/>
      <circle cx="27" cy="27" r="19" fill="#5865f2" opacity=".9"/>
      <g transform="translate(15.5,19) scale(.82)">${chat}</g>
      <text x="58" y="34" font-family="${SANS}" font-size="19" font-weight="600" fill="#fff">${DISCORD}</text>
      <path d="M236,22 l9,5 l-9,5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
    </g>
  </g>
  <g class="m" filter="url(#fshadow)">
    <text x="64" y="94" font-family="${SERIF}" font-style="italic" font-size="84" fill="#fff">say hi</text>
    <text x="68" y="168" font-family="${SANS}" font-size="44" font-weight="600" fill="#fff">${DISCORD} · discord</text>
  </g>
</g>
<rect x=".5" y=".5" width="1199" height="219" rx="26" fill="none" stroke="#fff" stroke-opacity=".09"/>
</svg>`;
writeFileSync(`${out}/footer.svg`, footer);

console.log(`sky: ${period} (${hour}h ${TZ}) · versed ${versedRel.tag} ${versedRel.downloads} · zzboard ${zzRel.tag} · kaede ${kaedeV}`);
