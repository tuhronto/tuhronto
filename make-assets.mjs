import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('./assets', import.meta.url));
mkdirSync(out, { recursive: true });

// deterministic random
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif";
const MONO = "Consolas, 'SF Mono', Menlo, monospace";

/* ---------------- header ---------------- */
function treeline() {
  let d = 'M0,372 ';
  for (let x = 0; x <= 1200; x += 9) {
    const y = 344 + Math.sin(x / 70) * 6 + rnd() * 12;
    d += `L${x},${y.toFixed(1)} L${x + 4.5},${(y + 6 + rnd() * 4).toFixed(1)} `;
  }
  return d + 'L1200,372 Z';
}
function grass() {
  let s = '';
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 1200, y = 366 + rnd() * 16, h = 8 + rnd() * 16;
    s += `<path d="M${x.toFixed(1)},${y.toFixed(1)} q${(rnd() * 6 - 3).toFixed(1)},-${(h / 2).toFixed(1)} ${(rnd() * 8 - 4).toFixed(1)},-${h.toFixed(1)}"/>`;
  }
  return s;
}

const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 460" width="1200" height="460">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1f5fd0"/><stop offset=".55" stop-color="#4f8be0"/><stop offset="1" stop-color="#a9c6ee"/>
  </linearGradient>
  <linearGradient id="mt" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a76b4"/><stop offset=".6" stop-color="#34508f"/><stop offset="1" stop-color="#26396b"/>
  </linearGradient>
  <linearGradient id="snow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f3f6fb"/><stop offset="1" stop-color="#c9d6ea"/>
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b9b2a6"/><stop offset="1" stop-color="#7d766c"/>
  </linearGradient>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
    <stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/>
  </linearGradient>
  <filter id="grit" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 .2  0 0 0 0 .19  0 0 0 0 .17  0 0 0 1.4 -.55"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="cloud" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="bokeh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>
  <filter id="haze"><feGaussianBlur stdDeviation="2"/></filter>
  <clipPath id="frame"><rect width="1200" height="460" rx="26"/></clipPath>
  <clipPath id="belly"><path d="M40,470 C20,398 110,338 250,332 C390,326 480,352 528,384 C566,410 566,452 546,470 Z"/></clipPath>
  <style>
    .drift{animation:drift 70s linear infinite}
    .drift2{animation:drift 110s linear infinite}
    @keyframes drift{from{transform:translateX(-260px)}to{transform:translateX(1300px)}}
    .breathe{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 4.2s ease-in-out infinite}
    @keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.045)}}
    .ear{transform-box:fill-box;transform-origin:0% 50%;animation:twitch 9s ease-in-out infinite}
    @keyframes twitch{0%,88%,100%{transform:rotate(0)}90%{transform:rotate(-9deg)}92%{transform:rotate(3deg)}94%{transform:rotate(-6deg)}96%{transform:rotate(0)}}
    .z{transform-box:fill-box;transform-origin:50% 50%;font-family:${SERIF};font-style:italic;fill:#fff;opacity:0;animation:z 6s ease-out infinite}
    .z2{animation-delay:2s}.z3{animation-delay:4s}
    @keyframes z{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:.95}100%{opacity:0;transform:translate(60px,-120px) scale(1.25)}}
    .wire{animation:sway 7s ease-in-out infinite}
    @keyframes sway{0%,100%{d:path("M-10,286 Q600,302 1210,262")}50%{d:path("M-10,286 Q600,306 1210,262")}}
    .rise{animation:rise 1.6s cubic-bezier(.2,.7,.2,1) both}
    .rise2{animation-delay:.25s}
    @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  </style>
</defs>
<g clip-path="url(#frame)">
  <rect width="1200" height="460" fill="url(#sky)"/>

  <g opacity=".85" filter="url(#cloud)">
    <g class="drift"><ellipse cx="200" cy="60" rx="120" ry="18" fill="#fff"/><ellipse cx="260" cy="52" rx="60" ry="14" fill="#fff"/></g>
    <g class="drift2" style="animation-delay:-55s"><ellipse cx="300" cy="120" rx="160" ry="12" fill="#fff" opacity=".7"/></g>
    <g class="drift" style="animation-delay:-30s"><ellipse cx="100" cy="30" rx="90" ry="12" fill="#fff" opacity=".8"/></g>
  </g>

  <!-- fuji -->
  <path d="M230,336 C390,300 560,196 676,98 L694,92 L716,96 L738,90 L760,95 C882,196 1040,286 1200,304 L1200,350 L230,350 Z" fill="url(#mt)"/>
  <path d="M676,98 L694,92 L716,96 L738,90 L760,95 C812,140 866,182 918,214 L896,206 L884,236 L870,210 L850,222 L838,262 L824,216 L806,226 L798,198 L780,218 L768,252 L756,208 L742,218 L734,190 L716,232 L706,202 L694,214 L684,186 L664,210 L652,192 L630,204 L618,188 L596,198 C626,170 652,124 676,98 Z" fill="url(#snow)"/>
  <g stroke="#e9eef7" stroke-linecap="round" fill="none" opacity=".75">
    <path d="M838,262 l6,26" stroke-width="2.5"/><path d="M768,252 l-2,34" stroke-width="2"/><path d="M884,236 l12,30" stroke-width="2"/>
    <path d="M716,232 l-4,22" stroke-width="1.6"/><path d="M806,226 l3,40" stroke-width="1.4"/><path d="M652,192 l-10,22" stroke-width="1.6"/>
    <path d="M934,232 l18,26" stroke-width="1.4"/><path d="M560,236 l-18,24" stroke-width="1.2"/>
  </g>
  <path d="M760,95 C812,140 866,182 918,214 L1200,330 L1200,350 L800,350 Z" fill="#0b1a40" opacity=".13"/>

  <path d="M0,338 C200,322 420,330 640,326 C840,322 1020,312 1200,318 L1200,372 L0,372 Z" fill="#26386a" filter="url(#haze)"/>
  <path d="${treeline()}" fill="#141a2c" filter="url(#haze)"/>
  <g stroke="#9c8a62" stroke-width="2" fill="none" opacity=".8" filter="url(#haze)">${grass()}</g>

  <path class="wire" d="M-10,286 Q600,302 1210,262" stroke="#8a6b4a" stroke-width="1.6" fill="none" opacity=".8" filter="url(#soft)"/>

  <rect y="372" width="1200" height="88" fill="url(#ground)"/>
  <rect y="372" width="1200" height="88" fill="#fff" filter="url(#grit)"/>

  <!-- the cat, out of focus -->
  <g filter="url(#bokeh)">
    <ellipse cx="300" cy="470" rx="290" ry="30" fill="#3c3631" opacity=".45"/>
    <g class="breathe">
      <path d="M40,470 C20,398 110,338 250,332 C390,326 480,352 528,384 C566,410 566,452 546,470 Z" fill="#ece8e2"/>
      <g clip-path="url(#belly)" stroke="#7f776d" stroke-width="16" fill="none" stroke-linecap="round" opacity=".55">
        <path d="M120,470 C130,430 150,400 190,380"/><path d="M200,470 C205,440 225,410 260,392"/>
        <path d="M300,470 C300,446 318,420 350,404"/><path d="M400,470 C396,446 410,422 440,408"/>
        <path d="M60,420 C90,410 110,390 120,370" opacity=".6"/>
      </g>
      <ellipse cx="320" cy="455" rx="160" ry="22" fill="#fbfaf7" opacity=".7"/>
    </g>
    <ellipse cx="268" cy="330" rx="62" ry="42" fill="#f3f0eb" transform="rotate(-14 268 330)"/>
    <ellipse cx="236" cy="322" rx="22" ry="18" fill="#fff" opacity=".8"/>
    <ellipse cx="72" cy="372" rx="44" ry="36" fill="#e2ddd6"/>
    <path d="M512,360 C530,390 534,430 520,468" stroke="#a32c3c" stroke-width="12" fill="none"/>
    <circle cx="596" cy="412" r="92" fill="#e7e2db"/><ellipse cx="560" cy="352" rx="40" ry="26" fill="#f6f3ee"/><ellipse cx="612" cy="350" rx="38" ry="24" fill="#f6f3ee"/>
    <g stroke="#6f675d" stroke-width="11" stroke-linecap="round" opacity=".55" fill="none">
      <path d="M600,470 C602,450 600,438 596,428"/><path d="M622,466 C624,448 620,438 614,428"/><path d="M578,468 C578,452 580,440 584,430"/>
    </g>
    <g class="ear"><path d="M650,446 L716,454 L684,396 Z" fill="#b9b1a6"/><path d="M660,442 L700,446 L682,410 Z" fill="#e8b0ad" opacity=".8"/></g>
    <path d="M534,452 L556,500 L588,478 Z" fill="#b9b1a6"/>
    <ellipse cx="578" cy="346" rx="15" ry="10" fill="#e48791"/>
    <path d="M548,394 q12,8 26,0" stroke="#3a332d" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M608,384 q12,8 26,0" stroke="#3a332d" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
  <g stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".85" filter="url(#soft)">
    <path d="M590,342 C610,300 630,268 648,248"/><path d="M596,346 C624,312 650,290 672,276"/>
    <path d="M600,352 C632,330 664,318 690,312"/><path d="M584,340 C592,300 600,270 606,250"/>
    <path d="M566,346 C556,316 548,296 540,282"/>
  </g>

  <text class="z" x="660" y="300" font-size="30">z</text>
  <text class="z z2" x="660" y="300" font-size="30">z</text>
  <text class="z z3" x="660" y="300" font-size="30">z</text>

  <rect width="1200" height="460" fill="url(#fade)"/>

  <g >
    <text x="72" y="150" font-family="${SERIF}" font-style="italic" font-size="92" fill="#fff" letter-spacing="-2">tuhronto</text>
  </g>
  <g >
    <text x="78" y="196" font-family="${MONO}" font-size="15" fill="#fff" opacity=".82" letter-spacing="5">VERSED  ·  KAEDE  ·  ZZBOARD</text>
  </g>
</g>
</svg>`;
writeFileSync(`${out}/header.svg`, header);

/* ---------------- shared card frame ---------------- */
const card = (id, bg, body, extraDefs = '', style = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" width="1200" height="320">
<defs>
  <clipPath id="${id}c"><rect width="1200" height="320" rx="26"/></clipPath>
  ${extraDefs}
  <style>
    .rise{animation:rise 1.4s cubic-bezier(.2,.7,.2,1) both}
    @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    ${style}
  </style>
</defs>
<g clip-path="url(#${id}c)">
  ${bg}
  ${body}
</g>
<rect x=".5" y=".5" width="1199" height="319" rx="26" fill="none" stroke="#fff" stroke-opacity=".08"/>
</svg>`;

/* ---------------- versed ---------------- */
const lyrics = [
  'left the porch light on for you',
  'the radio keeps humming low',
  'we drove until the city blurred',
  'and every song was ours to know',
];
const lines = [...lyrics, ...lyrics, ...lyrics.slice(0, 3)];
const LH = 48;
const lyricText = lines.map((l, i) => `<text x="0" y="${i * LH}">${l}</text>`).join('');
const n = lyrics.length;
// hold, then glide one line, repeating; whole loop = n lines
const kf = [];
for (let i = 0; i <= n; i++) {
  const p = (i / n) * 100;
  kf.push(`${p.toFixed(2)}%{transform:translateY(${-i * LH}px)}`);
  if (i < n) kf.push(`${(p + (100 / n) * 0.78).toFixed(2)}%{transform:translateY(${-i * LH}px)}`);
}
const bars = [64, 46, 28, 46, 64].map((h, i) =>
  `<rect class="bar" style="animation-delay:${(i * 0.18).toFixed(2)}s" x="${i * 15}" y="0" width="9" height="${h}" rx="4.5" fill="#fff"/>`).join('');

const versed = card('v',
  `<rect width="1200" height="320" fill="#09090b"/>
  <g filter="url(#vblur)" opacity=".55">
    <circle class="blob a" cx="880" cy="120" r="150" fill="#c2417a"/>
    <circle class="blob b" cx="1060" cy="250" r="140" fill="#3d3fc4"/>
    <circle class="blob c" cx="700" cy="300" r="110" fill="#e0894a"/>
  </g>
  <rect width="1200" height="320" fill="url(#vside)"/>`,
  `<g >
    <g transform="translate(72,74)">${bars}</g>
    <text x="72" y="206" font-family="${SANS}" font-weight="600" font-size="64" fill="#fafafa" letter-spacing="-2">versed</text>
    <text x="74" y="244" font-family="${SANS}" font-size="20" fill="#a1a1aa">your discord status sings along to what you're playing</text>
    <text x="74" y="282" font-family="${MONO}" font-size="12" fill="#71717a" letter-spacing="3">WINDOWS · MACOS · LINUX</text>
  </g>
  <g mask="url(#vmask)">
    <g transform="translate(640,174)" font-family="${SANS}" font-weight="600" font-size="30" fill="#fff">
      <g class="scroll">${lyricText}</g>
    </g>
  </g>
  <g transform="translate(640,44)">
    <rect width="34" height="34" rx="7" fill="url(#vart)"/>
    <text x="48" y="15" font-family="${SANS}" font-size="13" font-weight="600" fill="#e4e4e7">porch light</text>
    <text x="48" y="31" font-family="${SANS}" font-size="12" fill="#a1a1aa">the late drivers</text>
  </g>`,
  `<filter id="vblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
  <linearGradient id="vside" x1="0" x2="1"><stop offset=".3" stop-color="#09090b"/><stop offset=".62" stop-color="#09090b" stop-opacity=".2"/><stop offset="1" stop-color="#09090b" stop-opacity="0"/></linearGradient>
  <linearGradient id="vart" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0894a"/><stop offset=".5" stop-color="#c2417a"/><stop offset="1" stop-color="#3d3fc4"/></linearGradient>
  <linearGradient id="vfade" x1="0" y1="0" x2="0" y2="1">
    <stop offset=".32" stop-color="#fff" stop-opacity="0"/><stop offset=".44" stop-color="#fff" stop-opacity=".28"/>
    <stop offset=".52" stop-color="#fff" stop-opacity="1"/><stop offset=".6" stop-color="#fff" stop-opacity=".3"/>
    <stop offset=".86" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="vmask"><rect width="1200" height="320" fill="url(#vfade)"/></mask>`,
  `.scroll{animation:scroll ${n * 2.6}s cubic-bezier(.55,0,.25,1) infinite}
   @keyframes scroll{${kf.join('')}}
   .bar{transform-box:fill-box;transform-origin:50% 0;animation:eq 1.6s ease-in-out infinite}
   @keyframes eq{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.72)}}
   .blob{transform-box:fill-box;transform-origin:center}
   .a{animation:wa 14s ease-in-out infinite}.b{animation:wb 17s ease-in-out infinite}.c{animation:wa 21s ease-in-out infinite reverse}
   @keyframes wa{0%,100%{transform:translate(0,0)}50%{transform:translate(-90px,40px)}}
   @keyframes wb{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-50px)}}`);
writeFileSync(`${out}/versed.svg`, versed);

/* ---------------- kaede ---------------- */
const leaf = 'M0,-22 L5,-9 L16,-14 L12,-2 L22,0 L11,6 L14,14 L3,10 L1,22 L-1,22 L-3,10 L-14,14 L-11,6 L-22,0 L-12,-2 L-16,-14 L-5,-9 Z';
const leaves = Array.from({ length: 9 }, (_, i) => {
  const x = 40 + rnd() * 1100, s = 0.5 + rnd() * 0.7, dur = 9 + rnd() * 8, delay = -rnd() * 16;
  const col = ['#e8572a', '#f08a3c', '#c7372a', '#f2b04a'][i % 4];
  return `<g transform="translate(${x.toFixed(0)},0)"><g class="leaf" style="animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"><path d="${leaf}" fill="${col}" transform="scale(${s.toFixed(2)})" opacity=".9"/></g></g>`;
}).join('');
const laneX = [760, 864, 968, 1072];
const keys = ['d', 'f', 'j', 'k'];
const notes = [];
const pattern = [0, 2, 1, 3, 0, 1, 2, 3, 1, 2, 0, 3];
pattern.forEach((lane, i) => {
  notes.push(`<rect class="note" style="animation-delay:${(i * 0.3).toFixed(2)}s" x="${laneX[lane] + 8}" y="-30" width="80" height="18" rx="9" fill="#ffe2bf"/>`);
});
const lanes = laneX.map((x, i) => `
  <rect x="${x}" y="0" width="96" height="320" fill="#fff" opacity=".035"/>
  <rect x="${x + 8}" y="246" width="80" height="18" rx="9" fill="none" stroke="#ffe2bf" stroke-opacity=".55" stroke-width="2"/>
  <rect class="flash" style="animation-delay:${(pattern.indexOf(i) * 0.3 + 1.32).toFixed(2)}s" x="${x + 2}" y="200" width="92" height="64" fill="url(#kglow)"/>
  <text x="${x + 48}" y="296" text-anchor="middle" font-family="${MONO}" font-size="15" fill="#ffe2bf" opacity=".6">${keys[i]}</text>`).join('');

const kaede = card('k',
  `<rect width="1200" height="320" fill="url(#kbg)"/>
  <circle cx="1000" cy="40" r="220" fill="#ff9a4d" opacity=".18" filter="url(#kb)"/>`,
  `${lanes}
  <g>${notes.join('')}</g>
  <rect x="0" y="0" width="1200" height="320" fill="url(#kside)"/>
  ${leaves}
  <g >
    <text x="72" y="150" font-family="${SERIF}" font-style="italic" font-size="78" fill="#fff4e6" letter-spacing="-1">kaede!</text>
    <text x="76" y="196" font-family="${SANS}" font-size="20" fill="#f3c9a8">rhythm game in your browser. drop in any song,</text>
    <text x="76" y="224" font-family="${SANS}" font-size="20" fill="#f3c9a8">it writes the chart for you</text>
    <text x="76" y="276" font-family="${MONO}" font-size="12" fill="#c98f6c" letter-spacing="3">PLAYKAEDE.VERCEL.APP</text>
  </g>`,
  `<linearGradient id="kbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c0c0e"/><stop offset=".55" stop-color="#3e1414"/><stop offset="1" stop-color="#6e2618"/></linearGradient>
  <linearGradient id="kside" x1="0" x2="1"><stop offset=".35" stop-color="#1c0c0e" stop-opacity=".9"/><stop offset=".58" stop-color="#1c0c0e" stop-opacity="0"/></linearGradient>
  <radialGradient id="kglow" cx=".5" cy=".85" r=".6"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
  <filter id="kb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="50"/></filter>`,
  `.note{animation:fall 3.6s linear infinite}
   @keyframes fall{0%{transform:translateY(0)}36.67%{transform:translateY(285px);opacity:1}38%{transform:translateY(296px);opacity:0}100%{transform:translateY(296px);opacity:0}}
   .flash{opacity:0;animation:flash 3.6s ease-out infinite}
   @keyframes flash{0%{opacity:.95}12%{opacity:0}100%{opacity:0}}
   .leaf{animation:leaf 12s linear infinite}
   @keyframes leaf{0%{transform:translate(0,-40px) rotate(0)}50%{transform:translate(60px,160px) rotate(200deg)}100%{transform:translate(-20px,370px) rotate(420deg)}}`);
writeFileSync(`${out}/kaede.svg`, kaede);

/* ---------------- zzboard ---------------- */
const cat = [
  '      |\\      _,,,---,,_',
  'ZZZzz /,`.-\'`\'    -.  ;-;;,_',
  '     |,4-  ) )-,_. ,\\ (  `\'-\'',
  '    \'---\'\'(_/--\'  `-\'\\_)',
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const catText = cat.map((l, i) => `<text x="0" y="${i * 20}" xml:space="preserve">${esc(l)}</text>`).join('');
let spark = '';
for (let i = 0; i <= 80; i++) spark += `${i * 6},${(26 - Math.abs(Math.sin(i * 0.5) * 14) - rnd() * 10).toFixed(1)} `;
const ram = Array.from({ length: 24 }, (_, i) => `<rect x="${i * 11}" y="0" width="8" height="12" rx="2" fill="#8b5cf6" opacity="${i < 15 ? 0.9 : 0.18}"/>`).join('');

const zz = card('z',
  `<rect width="1200" height="320" fill="#0d0b14"/>
  <circle cx="900" cy="160" r="260" fill="#8b5cf6" opacity=".16" filter="url(#zb)"/>`,
  `<g >
    <text x="72" y="150" font-family="${MONO}" font-weight="700" font-size="70" fill="#ede9fe" letter-spacing="-3">zzboard<tspan class="cursor" fill="#8b5cf6">_</tspan></text>
    <text x="76" y="196" font-family="${SANS}" font-size="20" fill="#b4a9d6">a terminal dashboard with a cat asleep on it.</text>
    <text x="76" y="224" font-family="${SANS}" font-size="20" fill="#b4a9d6">stats, weather, spotify, snake, tetris</text>
    <text x="76" y="276" font-family="${MONO}" font-size="12" fill="#7c6fa8" letter-spacing="3">OPEN SOURCE · NO TELEMETRY</text>
  </g>
  <g transform="translate(600,34)">
    <rect width="540" height="252" rx="14" fill="#14111d" stroke="#8b5cf6" stroke-opacity=".35"/>
    <circle cx="22" cy="20" r="5" fill="#3b3352"/><circle cx="40" cy="20" r="5" fill="#3b3352"/><circle cx="58" cy="20" r="5" fill="#3b3352"/>
    <text x="270" y="25" text-anchor="middle" font-family="${MONO}" font-size="12" fill="#6b6189">zzboard — system</text>
    <line x1="0" y1="40" x2="540" y2="40" stroke="#8b5cf6" stroke-opacity=".2"/>
    <g font-family="${MONO}" font-size="13">
      <text x="24" y="70" fill="#8b5cf6">cpu</text>
      <text x="500" y="70" text-anchor="end" fill="#ede9fe" class="pct">23%</text>
      <svg x="64" y="54" width="380" height="30" viewBox="0 0 380 30"><polyline class="spark" points="${spark}" fill="none" stroke="#a78bfa" stroke-width="1.6"/></svg>
      <text x="24" y="108" fill="#8b5cf6">ram</text>
      <g transform="translate(64,97)">${ram}</g>
      <text x="500" y="108" text-anchor="end" fill="#ede9fe">11.8 / 16 gb</text>
      <text x="24" y="140" fill="#8b5cf6">sky</text>
      <text x="64" y="140" fill="#c4b5fd">golden hour · 14° · sunset in 0:42</text>
      <line x1="24" y1="158" x2="516" y2="158" stroke="#8b5cf6" stroke-opacity=".15"/>
      <g transform="translate(40,186)" fill="#ddd6fe" font-size="14" class="sleep">${catText}</g>
    </g>
  </g>`,
  `<filter id="zb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>`,
  `.cursor{animation:blink 1.1s steps(1) infinite}
   @keyframes blink{50%{opacity:0}}
   .spark{animation:spark 6s linear infinite}
   @keyframes spark{from{transform:translateX(0)}to{transform:translateX(-96px)}}
   .sleep{animation:sleep 4.2s ease-in-out infinite}
   @keyframes sleep{0%,100%{opacity:.95}50%{opacity:.6}}`);
writeFileSync(`${out}/zzboard.svg`, zz);

/* ---------------- footer ---------------- */
const paws = Array.from({ length: 12 }, (_, i) => {
  const x = 90 + i * 88, y = i % 2 ? 54 : 70;
  return `<g class="paw" style="animation-delay:${(i * 0.45).toFixed(2)}s" transform="translate(${x},${y}) rotate(90)">
    <ellipse cx="0" cy="6" rx="9" ry="7.5"/><circle cx="-9" cy="-6" r="3.6"/><circle cx="-3" cy="-11" r="3.6"/><circle cx="4" cy="-11" r="3.6"/><circle cx="10" cy="-5" r="3.6"/></g>`;
}).join('');
const footer = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" width="1200" height="120">
<defs><style>
  .paw{fill:#8a8378;opacity:0;animation:paw 8s ease-in-out infinite}
  @keyframes paw{0%{opacity:0}4%{opacity:.75}55%{opacity:.75}75%,100%{opacity:0}}
</style></defs>
${paws}
</svg>`;
writeFileSync(`${out}/footer.svg`, footer);
console.log('ok');
