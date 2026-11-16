// Redemption City: Light Run 3D — main game
import { RIM, SWAY_T, swayMats, SHOP_OUTFITS, aoBake } from './toon.js';
export const WATER_T = { value: 0 };
import * as LK from './look.js';
import { THREE, toon, VC, outline, P, G, merge, mergedMesh, canvasTex, signTex, signMesh, SOFT, CLOUD, Particles, makeHuman, poseHuman, randomLook, PLAYER_OUTFITS, SKINS, bakedHuman, stepBaked, setExpression, disposeHuman, setCharTier } from './toon.js';
import { danfo, truck, okada, cones, pothole, hawker, palmGeo, treeGeo, building, billboard, stall, streetLightGeo, bridge, setBridgeSign, gateArch, lanternMesh, textSprite, rampMesh, okadaRamp, railMesh, barMesh, lowSign, beamMesh, cow, herder, flyover, roadProp } from './props.js';
import * as M from './meta.js';
import * as C from './content.js';
import * as BK from './books.js';
import * as VW from './worlds.js';

const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const params = new URLSearchParams(location.search);
const TIME_SCALE = clamp(+params.get('speed') || 1, 1, 8);
const LITE = params.has('lite');
const NOVIS = params.has('novision');   // v10 test switch: journey without the vision gate
const AUTO = params.has('autopilot'), AUTO_MIX = params.get('autopilot') === 'mix', AUTO_FUN = AUTO;
// v11: autopilot is a test helper only (explicit ?autopilot in the address); it is never stored and always shows a badge
if (AUTO) { const addB = () => { const d = document.createElement('div'); d.id = 'autoBadge'; d.textContent = 'TEST AUTOPILOT'; document.body.appendChild(d); }; document.readyState === 'loading' ? addEventListener('DOMContentLoaded', addB) : addB(); }

/* ---------------- WebGL check ---------------- */
function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) { $('#loading').remove(); $('#nogl').classList.add('show'); throw new Error('WebGL unavailable'); }

/* ---------------- Renderer / scene ---------------- */
const canvas = $('#c3d');
/* ---------------- Settings + device tier ---------------- */
const SET_KEY = 'lr3d_settings';
const SET = Object.assign({ gfx: 'auto', sound: localStorage.getItem('lr_sound') !== 'off', music: true, haptics: true, reduceMotion: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) }, (() => { try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch (e) { return {}; } })());
const saveSettings = () => { localStorage.setItem(SET_KEY, JSON.stringify(SET)); localStorage.setItem('lr_sound', SET.sound ? 'on' : 'off'); };
const DPR = window.devicePixelRatio || 1;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: DPR < 2, powerPreference: 'high-performance', stencil: false });
function gpuName() { try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { return ''; } }
const GPU = gpuName();
function detectTier() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (/swiftshader|llvmpipe|software|mali-4|mali-t[67]|adreno \(tm\) [34]\d\d|powervr sgx/i.test(GPU) || mem <= 2 || cores <= 4) return 'low';
  if (mem >= 6 && cores >= 8 && !/mali-g[5-6]\d|adreno \(tm\) 5\d\d/i.test(GPU)) return 'high';
  return 'med';
}
const QUALITY = {
  high: { prMax: Math.min(DPR, 1.5), prMin: 0.9, shadows: true, shadowSize: 1024, sceneryOutlines: true, fx: 1, cap: 60 },
  med: { prMax: Math.min(DPR, 1.25), prMin: 0.75, shadows: true, shadowSize: 512, sceneryOutlines: false, fx: 0.75, cap: 60 },
  low: { prMax: Math.min(DPR, 1), prMin: 0.6, shadows: false, shadowSize: 512, sceneryOutlines: false, fx: 0.5, cap: 30 },
};
const AUTO_TIER = detectTier();
const pickTier = () => LITE ? 'low' : params.get('gfx') ? ({ high: 'high', balanced: 'med', battery: 'low' }[params.get('gfx')] || 'med') : SET.gfx === 'auto' ? AUTO_TIER : ({ high: 'high', balanced: 'med', battery: 'low' }[SET.gfx] || 'med');
let TIER = pickTier(), Q = QUALITY[TIER]; setCharTier(TIER);
let PR = Q.prMax;
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.08;   // gentle filmic grade that keeps cartoon colours
renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 700);
scene.fog = new THREE.Fog(0xbfe6ff, 70, 250);
const hemi = new THREE.HemisphereLight(0xfff4dd, 0x6a8a3a, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.4); sun.castShadow = Q.shadows;
// one tight shadow map that follows the player
sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize); Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 14, bottom: -12, near: 1, far: 80 }); sun.shadow.bias = -0.0015;
scene.add(sun, sun.target);
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0.0 ? mix(mid, top, pow(clamp(h*1.4,0.0,1.0),0.7)) : mix(mid, bot, clamp(-h*5.0,0.0,1.0)); gl_FragColor=vec4(c,1.0);\n#include <colorspace_fragment>\n}',
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), skyMat); sky.renderOrder = -10; scene.add(sky);
const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0xffe2a0, fog: false, depthWrite: false, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })); sunHalo.scale.set(300, 300, 1); sky.add(sunHalo);
const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0xfff3c0, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); sunDisc.scale.set(70, 70, 1); sky.add(sunDisc);
const clouds = new THREE.Group(); scene.add(clouds);
for (let i = 0; i < 11; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD, fog: false, depthWrite: false, transparent: true }));
  const a = i / 11 * Math.PI * 2 + rand(-0.2, 0.2), r = rand(260, 340); s.position.set(Math.cos(a) * r, rand(45, 110), Math.sin(a) * r); const k = rand(70, 120); s.scale.set(k, k * 0.5, 1); clouds.add(s);
}
const PRESETS = {
  day: { top: '#1569ff', mid: '#a6e1ff', bot: '#d8f0c0', fog: '#bfe6ff', sun: '#fff1d0', sunI: 2.5, hemiS: '#fff4dd', hemiG: '#6a8a3a', hemiI: 1.6, sunPos: [0.5, 0.35, -1] },
  dusk: { top: '#35297a', mid: '#ff9150', bot: '#6b4a40', fog: '#f2a676', sun: '#ffb070', sunI: 1.9, hemiS: '#ffd2b0', hemiG: '#5a5a3a', hemiI: 1.3, sunPos: [0.2, 0.06, -1] },
  storm: { top: '#070a1a', mid: '#1c2438', bot: '#131a26', fog: '#1e2636', sun: '#7d93b8', sunI: 0.55, hemiS: '#7086b0', hemiG: '#1c242c', hemiI: 0.6, sunPos: [0.1, 0.5, -1] },
  evening: { top: '#2a3a96', mid: '#ffae74', bot: '#4c6b3a', fog: '#f7c093', sun: '#ffc690', sunI: 2.0, hemiS: '#ffe6c8', hemiG: '#5e7a3a', hemiI: 1.45, sunPos: [-0.6, 0.12, -1] },
};
const _ca = new THREE.Color(), _cb = new THREE.Color();
function blendPreset(a, b, t) {
  const A = PRESETS[a], B = PRESETS[b], o = {};
  for (const k in A) o[k] = typeof A[k] === 'string' ? '#' + _ca.set(A[k]).lerp(_cb.set(B[k]), t).getHexString() : Array.isArray(A[k]) ? A[k].map((v, i) => lerp(v, B[k][i], t)) : lerp(A[k], B[k], t);
  return o;
}
function setSky(a, b, t, fogMul = 1) {
  const A = PRESETS[a], B = PRESETS[b];
  const mix = (k) => _ca.set(A[k]).lerp(_cb.set(B[k]), t).clone();
  skyMat.uniforms.top.value.copy(mix('top')); skyMat.uniforms.mid.value.copy(mix('mid')); skyMat.uniforms.bot.value.copy(mix('bot'));
  scene.fog.color.copy(mix('fog')); sun.color.copy(mix('sun')); sun.intensity = lerp(A.sunI, B.sunI, t);
  hemi.color.copy(mix('hemiS')); hemi.groundColor.copy(mix('hemiG')); hemi.intensity = lerp(A.hemiI, B.hemiI, t);
  const sp = A.sunPos.map((v, i) => lerp(v, B.sunPos[i], t)); sunDisc.position.set(sp[0], sp[1], sp[2]).normalize().multiplyScalar(450); sunHalo.position.copy(sunDisc.position).multiplyScalar(0.98); sunHalo.material.color.copy(mix('sun'));
  sunDisc.material.color.copy(mix('sun'));
  scene.fog.near = 60 / fogMul; scene.fog.far = 250 / fogMul;
}
setSky('day', 'day', 0);
const fx = new Particles(Math.round(420 * Q.fx)); scene.add(fx.points);
const halos = new Particles(90); halos.mat.blending = THREE.AdditiveBlending; scene.add(halos.points);
for (const pm of [fx.mat, halos.mat]) pm.fragmentShader = pm.fragmentShader.replace('t.a*vA); }', 't.a*vA);\n#include <colorspace_fragment>\n}');
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const px = 0.5 * renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  fx.mat.uniforms.uPx.value = px; halos.mat.uniforms.uPx.value = px;
}
window.addEventListener('resize', resize); resize();

/* ---------------- Sound ---------------- */
let soundOn = SET.sound, actx = null;
function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); }
function beep(f, d = 0.08, type = 'sine', v = 0.12, delay = 0) {
  if (!soundOn || !actx) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
}
let noiseBuf = null;
function noiseAt(t, d, v, hp = 6000) {
  if (!soundOn || !actx) return;
  if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f); f.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + d + 0.02);
}
function toneAt(f, t, d, type, v, f2) {
  if (!soundOn || !actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d * 0.8);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
}
// adaptive run music: tempo + layers rise with speed
const MUS = { next: 0, step: 0 };
const BASS = [55, 55, 65.4, 73.4, 49, 49, 58.3, 65.4];   // A A C D G G Bb C (warm minor-pentatonic groove)
const ARP = [440, 523, 659, 784, 659, 523];
function musicTick() {
  if (!soundOn || !SET.music || !actx || S.mode !== 'run' || S.paused || !R) { MUS.next = 0; return; }
  const boss = R.boss ? R.boss.id : null;
  const bpm = Math.min(168, 104 + (R.speed - 20) * 1.15 + (R.fire > 0 || R.burst > 0 ? 12 : 0) + (boss ? 10 : 0)), stepDur = 60 / bpm / 2;
  const lvl = R.fire > 0 ? 4 : boss ? 3 : R.speed < 26 ? 1 : R.speed < 38 ? 2 : 3;
  const now = actx.currentTime; if (MUS.next < now) MUS.next = now + 0.05;
  while (MUS.next < now + 0.14) {
    const t = MUS.next, st = MUS.step % 8, bar = Math.floor(MUS.step / 8) % 8;
    if (st === 0 || st === 4 || (lvl >= 3 && st === 7)) toneAt(150, t, 0.16, 'sine', 0.22, 42);
    if (lvl >= 1 && (st === 2 || st === 6)) noiseAt(t, 0.09, 0.07, 1800);
    if (lvl >= 2) noiseAt(t, 0.035, st % 2 ? 0.03 : 0.045, 7000);
    if (lvl >= 3) noiseAt(t + stepDur / 2, 0.025, 0.022, 8000);
    if (st % 2 === 0) toneAt(BASS[bar] * (st === 6 ? 1.5 : 1), t, stepDur * 1.6, 'triangle', 0.09);
    if (lvl >= 4 || (lvl >= 3 && st % 2 === 0)) toneAt(ARP[(MUS.step) % ARP.length] * (R.fire > 0 ? 1.5 : 1), t, stepDur * 0.9, 'square', 0.022);
    if (R.dark > 0 && st === 0) toneAt(41, t, stepDur * 8, 'sawtooth', 0.03);
    if (boss) { if (st === 3 || st === 7) toneAt(boss === 'storm' ? 98 : 130, t, stepDur, 'square', 0.035, 60); if (st === 0 && bar % 2 === 0) toneAt(BASS[bar] * 2, t, stepDur * 7, 'sawtooth', 0.025); if (bar % 4 === 3 && st >= 4) toneAt(200 - st * 12, t, stepDur * 0.8, 'triangle', 0.06, 90); }
    MUS.next += stepDur; MUS.step++;
  }
}
const sfx = {
  orb: () => beep(880 + Math.random() * 200, 0.07, 'triangle', 0.07),
  jump: () => beep(420, 0.1, 'square', 0.05),
  hit: () => { beep(140, 0.25, 'sawtooth', 0.12); beep(90, 0.3, 'square', 0.06, 0.05); },
  good: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'triangle', 0.1, i * 0.09)),
  soft: () => [392, 330].forEach((f, i) => beep(f, 0.2, 'sine', 0.08, i * 0.12)),
  stop: () => [660, 880].forEach((f, i) => beep(f, 0.12, 'square', 0.06, i * 0.1)),
  tap: () => beep(600, 0.04, 'triangle', 0.06),
  horn: () => { beep(330, 0.18, 'square', 0.05); beep(415, 0.18, 'square', 0.04); },
  crash: () => { beep(110, 0.5, 'sawtooth', 0.14); beep(70, 0.6, 'square', 0.08, 0.06); if (actx) noiseAt(actx.currentTime, 0.4, 0.12, 400); },
  whoosh: () => { if (actx) noiseAt(actx.currentTime, 0.18, 0.06, 2500); },
  power: () => [392, 523, 659, 784, 1046].forEach((f, i) => beep(f, 0.14, 'square', 0.05, i * 0.06)),
  shield: () => { beep(784, 0.2, 'sine', 0.1); beep(1175, 0.3, 'sine', 0.06, 0.08); },
  grind: () => { if (actx) noiseAt(actx.currentTime, 0.25, 0.05, 3500); beep(1320, 0.12, 'square', 0.03); },
  boss: () => { if (!actx) return; const t = actx.currentTime; [0, 0.18, 0.36].forEach((d, i) => toneAt([110, 98, 82][i], t + d, 0.4, 'sawtooth', 0.09)); noiseAt(t, 0.6, 0.06, 300); },
  thunder: () => { if (!actx) return; const t = actx.currentTime; noiseAt(t, 1.2, 0.16, 120); toneAt(48, t, 1.0, 'sawtooth', 0.06, 30); },
};
const sndBtn = $('#snd');
const paintSnd = () => sndBtn.textContent = soundOn ? '🔊' : '🔇';
sndBtn.addEventListener('click', e => { e.stopPropagation(); ensureAudio(); soundOn = SET.sound = !soundOn; saveSettings(); paintSnd(); sfx.tap(); });
paintSnd();

/* ---------------- haptics ---------------- */
let buzzT = 0;
function buzz(ms, minGap = 0) { if (!SET.haptics || !navigator.vibrate) return; const now = performance.now(); if (now - buzzT < minGap) return; buzzT = now; try { navigator.vibrate(ms); } catch (e) {} }
/* ---------------- UI helpers ---------------- */
const show = id => $('#' + id).classList.add('show');
const hide = id => $('#' + id).classList.remove('show');
let toastT = 0;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { sfx.tap(); hide(b.dataset.close); }));
const verseHTML = v => `<div class="verse">“${esc(v[0])}”<b>${esc(v[1])} (KJV)</b></div>`;

/* ---------------- Save ---------------- */
const SAVE_KEY = 'lr3d_save';
function storedLook() { try { return JSON.parse(localStorage.getItem(LK.LOOK_KEY) || 'null'); } catch (e) { return null; } }
function freshSave() { const l = storedLook(); return { name: localStorage.getItem('lr_name') || 'Pilgrim', gender: l ? l.gender : 'm', outfit: 0, skin: 1, chapter: 1, totals: {}, lantern: 50, totalScore: 0, used: {}, look: l || undefined }; }
let save = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
const persist = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));
function totalVirtues() { return Object.values(save.totals).reduce((a, b) => a + b, 0); }
function lanternLevel() { return 1 + Math.floor(totalVirtues() / 6); }
function drawPool(name, arr, n, key) {
  save.used[name] = save.used[name] || [];
  const used = new Set(save.used[name]);
  let avail = arr.filter((a, i) => !used.has(key(a, i)));
  if (avail.length < n) { save.used[name] = []; avail = arr.slice(); }
  const chosen = shuffle(avail).slice(0, n);
  save.used[name].push(...chosen.map(a => key(a, arr.indexOf(a))));
  return chosen;
}

/* ---------------- Chapter state ---------------- */
const S = { mode: 'title', paused: false, t: 0, score: 0, lantern: 50, floor: 15, orbs: 0, hits: 0, quizRight: 0, quizTotal: 0, helpedRun: 0, virtues: {}, log: [], plan: null };
function addLantern(d) { S.lantern = clamp(S.lantern + d, S.floor, 100); }
const VERSES_KEY = 'lr3d_verses', STUDY_KEY = 'lr3d_study';
const myVerses = () => { try { return JSON.parse(localStorage.getItem(VERSES_KEY) || '[]'); } catch (e) { return []; } };
function pickVerse(ch) {
  const have = myVerses().map(v => v.ref), n = C.MEMORY.length;
  for (let k = 0; k < n; k++) { const v = C.MEMORY[(ch - 1 + k) % n]; if (!have.includes(v.ref)) return v; }
  return C.MEMORY[(ch - 1) % n];
}
function verseHUD(pop) {
  if (!S.plan || !R) return;
  const v = R.vis ? R.vis.verse : S.plan.verse, got = R.vis ? R.vis.vGot : R.vGot, el = $('#hVerse');
  el.innerHTML = `<span class="vi">📜</span> ${v.parts.map((p, i) => i < got ? `<b>${esc(p)}</b>` : '<i>▢</i>').join(' ')} <span class="ref">${esc(v.ref)}</span>`;
  if (pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

/* ---------------- Player ---------------- */
let player = null, lantern = null, lanternLight = null;
const ownedId = id => M.wallet().owned.includes(id);
function lookOf(sv) {
  let l = sv.look || storedLook() || LK.legacyLook(sv, ownedId);
  if (l.preset && l.preset.startsWith('o_') && !ownedId(l.preset)) l = { ...l, ...LK.presetFields(LK.presetsFor(l.gender)[0].of), preset: 'base0' };
  return LK.fixLook(l);
}
function lookFromSave(sv) { return LK.toHuman(lookOf(sv)); }
function nameTagSprite(name) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = '900 30px system-ui, sans-serif'; const w = Math.min(244, x.measureText(name).width + 34);
  x.fillStyle = 'rgba(20,14,6,.82)'; x.beginPath(); x.roundRect((256 - w) / 2, 8, w, 46, 23); x.fill(); x.strokeStyle = '#ffd23f'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 128, 32, 220);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(1.6, 0.4, 1); sp.renderOrder = 12; return sp;
}
let nameTag = null;
function setNameTag(name) {
  if (!player) return; if (nameTag) { nameTag.parent && nameTag.parent.remove(nameTag); nameTag.material.map.dispose(); nameTag.material.dispose(); nameTag = null; }
  if (!name) return; nameTag = nameTagSprite(name); nameTag.position.y = player.topY + 0.45; player.root.add(nameTag); nameTag.visible = S.mode !== 'run';
}
function buildPlayer(sv = save || freshSave(), lant) {
  if (player && player.root.parent) player.root.parent.remove(player.root);
  if (player) { player.root.traverse(o => { if (o.isMesh && o.geometry.userData.own) o.geometry.dispose(); }); if (player.mesh && player.mesh.skeleton) player.mesh.skeleton.dispose(); }
  player = makeHuman(lookFromSave(sv), true); player.root.scale.setScalar(1.1);
  player.root.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
  lantern = lanternMesh(LANTERN_KIND[lant || M.wallet().lantern] || 'hurricane'); lantern.position.set(0, -0.31, 0.03); lantern.scale.setScalar(0.85); player.R.hand.add(lantern);
  lanternLight = new THREE.PointLight(0xffd27a, 0, 9, 1.6); lantern.add(lanternLight);
  scene.add(player.root); player.root.visible = true; nameTag = null;
  setNameTag(sv.name && sv.name !== 'Pilgrim' ? sv.name : (localStorage.getItem('lr_name') || ''));
}

/* =========================================================
   EXPRESSWAY WORLD
   ========================================================= */
let groundMat = null;
const RW = new THREE.Group(); scene.add(RW);
const LANES = [-3.2, 0, 3.2];
const roadTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#c9763a'; x.fillRect(0, 0, w, h);
  const a0 = w / 12, a1 = w * 11 / 12;
  const gr = x.createLinearGradient(a0, 0, a1, 0); gr.addColorStop(0, '#454a56'); gr.addColorStop(0.5, '#50566282'.slice(0, 7)); gr.addColorStop(1, '#454a56');
  x.fillStyle = gr; x.fillRect(a0, 0, a1 - a0, h);
  for (let i = 0; i < 4200; i++) { const v = Math.random(); x.fillStyle = v < 0.45 ? 'rgba(255,255,255,.06)' : v < 0.9 ? 'rgba(0,0,0,.09)' : 'rgba(255,230,180,.08)'; const s = Math.random() < 0.85 ? 2 : 3; x.fillRect(a0 + Math.random() * (a1 - a0), Math.random() * h, s, s); }
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(30,32,38,.35)'; const px = a0 + Math.random() * (a1 - a0 - 70), py = Math.random() * h; x.beginPath(); x.roundRect(px, py, 40 + Math.random() * 50, 30 + Math.random() * 60, 8); x.fill(); }
  x.strokeStyle = 'rgba(20,20,25,.45)'; x.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { let cx = a0 + Math.random() * (a1 - a0), cy = Math.random() * h; x.beginPath(); x.moveTo(cx, cy); for (let k = 0; k < 6; k++) { cx += (Math.random() - 0.5) * 22; cy += 6 + Math.random() * 12; x.lineTo(cx, cy); } x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.13)'; for (const lx of [-3.2, 0, 3.2]) { x.fillRect((lx + 6) / 12 * w - 26, 0, 14, h); x.fillRect((lx + 6) / 12 * w + 12, 0, 14, h); }
  x.fillStyle = '#ffd23f'; x.fillRect(a0 + 8, 0, 9, h); x.fillRect(a1 - 17, 0, 9, h);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(a0, 0, 5, h); x.fillRect(a1 - 5, 0, 5, h);
  for (const lx of [-1.6, 1.6]) { const cx = (lx + 6) / 12 * w; x.fillStyle = '#f4f4ee'; x.fillRect(cx - 6, 0, 12, h * 0.5); x.fillStyle = 'rgba(80,86,98,.55)'; for (let k = 0; k < 40; k++) x.fillRect(cx - 6 + Math.random() * 12, Math.random() * h * 0.5, 2 + Math.random() * 3, 2 + Math.random() * 4); }
}, true);
roadTex.repeat.set(1, 40);
const grassTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#69c13f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { x.fillStyle = pick(['#7fd34c', '#5aaa36', '#8fdc5a', '#c9a05a']); x.fillRect(Math.random() * w, Math.random() * h, 3, 5); } }, true);
grassTex.repeat.set(60, 60);
{
  const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 320), toon('#ffffff', { map: roadTex })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -140); road.receiveShadow = true; RW.add(road);
  const road2 = road.clone(); road2.position.x = -13; RW.add(road2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), groundMat = toon('#ffffff', { map: grassTex })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -150); ground.receiveShadow = true; RW.add(ground);
  RW.add(mergedMesh([P(G.box, '#eceff1', -6.5, 0.45, -140, 0, 0, 0, 0.7, 0.9, 320), P(G.box, '#ffd23f', -6.5, 0.93, -140, 0, 0, 0, 0.74, 0.08, 320)], 0.04, false));
}
function swayInst(geo, n, th) { const [m, o] = swayMats(th); const im = new THREE.InstancedMesh(geo, m, n); outline(im, th); im.children[0].material = o; return im; }
const kerbTex = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#e53935'; x.fillRect(0, 0, w, h / 2); x.fillStyle = '#f5f5f5'; x.fillRect(0, h / 2, w, h / 2); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, h - 6, w, 6); }, true);
kerbTex.repeat.set(1, 110);
for (const kx of [6.15, -6.15]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 320), toon('#ffffff', { map: kerbTex })); k.position.set(kx, 0.11, -140); k.receiveShadow = true; RW.add(k); }
const BLOB = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.55, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
const blobMat = new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false, fog: false });
const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function addBlob(obj, w, l) { const b = new THREE.Mesh(blobGeo, blobMat); b.scale.set(w, 1, l); b.position.y = 0.03; b.renderOrder = 1; obj.add(b); return b; }
const blobP = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); blobP.rotation.x = -Math.PI / 2; blobP.renderOrder = 1; scene.add(blobP);
const palms = swayInst(palmGeo(), 70, 0.06); palms.userData.tag = 'palms'; RW.add(palms);
const palmData = [];
for (let i = 0; i < 70; i++) { const right = i % 3 !== 0; palmData.push({ x: right ? (Math.random() < 0.6 ? rand(7.5, 12) : rand(26, 60)) : rand(-21, -60), z: rand(-300, 25), s: rand(0.8, 1.25), r: rand(0, 6.28) }); }
const lamps = new THREE.InstancedMesh(streetLightGeo(), VC, 11); outline(lamps, 0.05); lamps.userData.tag = 'lamps'; RW.add(lamps);
const lampData = Array.from({ length: 11 }, (_, i) => ({ x: -6.5, z: 25 - i * 30, s: 1, r: 0 }));
// fake-bloom lamp glows: one additive Points draw call, fades in at dusk / storm
const glowPos = new Float32Array(22 * 3), glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
const lampGlow = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: SOFT, color: 0xffd27a, size: 4.2, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
lampGlow.frustumCulled = false; lampGlow.visible = false; RW.add(lampGlow);
function updateGlow() {
  const k = clamp((2.25 - sun.intensity) / 1.3, 0, 1); lampGlow.visible = k > 0.04; if (!lampGlow.visible) return;
  lampGlow.material.opacity = 0.85 * k;
  for (let i = 0; i < 11; i++) { const d = lampData[i], j = i * 6, y = d.z > -14 ? -999 : 7.6; glowPos[j] = d.x + 2.4; glowPos[j + 1] = y; glowPos[j + 2] = d.z; glowPos[j + 3] = d.x - 2.4; glowPos[j + 4] = y; glowPos[j + 5] = d.z; }
  glowGeo.attributes.position.needsUpdate = true;
}
const _mtx = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sv = new THREE.Vector3(), _pv = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function writeInst(mesh, data) {
  for (let i = 0; i < data.length; i++) { const d = data[i]; _q.setFromAxisAngle(_up, d.r); _mtx.compose(_pv.set(d.x, 0, d.z), _q, _sv.setScalar(d.hide ? 0 : d.s)); mesh.setMatrixAt(i, _mtx); }
  mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
}
const roadside = [];
function addSide(obj, x, z, ry, span = 330, kind = 'building') { obj.userData.tag = obj.userData.tag || kind; if (kind === 'building' || kind === 'stall' || kind === 'prop') aoBake(obj); obj.position.set(x, 0, z); obj.rotation.y = ry; RW.add(obj); roadside.push({ obj, span, kind }); return obj; }
for (let i = 0; i < 10; i++) addSide(building(), rand(15, 20), -300 + i * 33, -Math.PI / 2);
for (let i = 0; i < 8; i++) addSide(building(), rand(-24, -28), -300 + i * 41, Math.PI / 2);
for (let i = 0; i < 5; i++) addSide(billboard(), rand(12, 14), -290 + i * 66, -0.45, 330, 'billboard');
for (let i = 0; i < 3; i++) addSide(billboard(), -22, -250 + i * 110, 0.45, 330, 'billboard');
for (let i = 0; i < 7; i++) addSide(stall(), rand(8.6, 10.5), -300 + i * 47, rand(0, 6), 330, 'stall');
for (let i = 0; i < 8; i++) addSide(roadProp(['kiosk', 'tyres', 'tank', 'gen'][i % 4]), i % 2 ? rand(8.8, 10.5) : rand(-20.5, -23), -296 + i * 41 + rand(0, 10), i % 2 ? -Math.PI / 2 + rand(-0.3, 0.3) : Math.PI / 2 + rand(-0.3, 0.3), 330, 'prop');
// zone-only scenery: Kara cattle + herders, Mowe market stalls + traders
for (let i = 0; i < 18; i++) addSide(cow(), i % 3 === 2 ? rand(-21, -27) : rand(8.6, 14), -300 + i * 18 + rand(0, 8), rand(0, 6.28), 330, 'cow');
const herders = []; for (let i = 0; i < 3; i++) herders.push(addSide(herder(), rand(8.6, 11), -260 + i * 110, rand(-1, 1), 330, 'cow'));
for (let i = 0; i < 12; i++) addSide(stall(), i % 2 ? rand(8.4, 10.2) : rand(-21, -23.5), -300 + i * 27.5, rand(0, 6), 330, 'market');
const traders = []; for (let i = 0; i < 5; i++) traders.push(addSide(bakedHuman(randomLook({ gender: pick(['m', 'f']) }), 'wave', 6), rand(7.4, 8.2), -280 + i * 66, rand(-2, -1), 330, 'market'));
/* ---- journey scale + zones ---- */
const UPK = 200;                                   // world units per km (game scale: Lagos → KM 46)
const KM = d => d / UPK;
const zoneIdx = km => { let k = 0; const Z = C.ZONES; for (let i = 0; i < Z.length; i++) if (km >= Z[i].km) k = i; return k; };
const zoneAt = km => C.ZONES[zoneIdx(km)];
const zoneEnd = id => { const i = C.ZONES.findIndex(z => z.id === id); return C.ZONES[i + 1] ? C.ZONES[i + 1].km : C.TOTAL_KM; };
const SIDE_RULE = { building: z => !z.water && !z.cows, billboard: z => !z.water, stall: z => !z.water && !z.cows, cow: z => !!z.cows, market: z => !!z.market, prop: z => !z.water };
const curDist = () => (R && (S.mode === 'run')) ? R.dist : 0;
// Long Bridge lagoon + parapets
const BR0 = C.ZONES.find(z => z.water).km * UPK, BR1 = zoneEnd('bridge') * UPK, BRL = BR1 - BR0;
const waterTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#2b8fd0'; x.fillRect(0, 0, w, h); for (let i = 0; i < 110; i++) { x.fillStyle = pick(['rgba(255,255,255,.35)', 'rgba(170,225,255,.5)', 'rgba(15,80,140,.35)']); x.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 16, 2); } }, true);
waterTex.repeat.set(40, BRL / 8);
const lagoon = new THREE.Group(); lagoon.visible = false; RW.add(lagoon);
{
  // lagoon water: vertex swell + two cross-scrolling ripple layers + sparkle glints (one material, one pass)
  const wBase = toon('#ffffff', { map: waterTex }), wm = wBase.clone(), wPrev = wBase.onBeforeCompile;
  wm.onBeforeCompile = (sh, r) => { if (wPrev) wPrev.call(wm, sh, r);
    sh.uniforms.uWT = WATER_T;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += sin(position.x * 0.21 + uWT * 1.5) * 0.08 + cos(position.y * 0.27 - uWT * 1.15) * 0.07;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWT;').replace('#include <map_fragment>', `
      vec4 t1 = texture2D(map, vMapUv); vec4 t2 = texture2D(map, vMapUv * 1.63 + vec2(uWT * 0.011, -uWT * 0.017));
      diffuseColor *= mix(t1, t2, 0.5) * vec4(0.92, 1.0, 1.06, 1.0);
      float gl = pow(max(0.0, sin(vMapUv.x * 37.0 + uWT * 2.1) * sin(vMapUv.y * 29.0 - uWT * 1.7)), 14.0);
      diffuseColor.rgb += gl * 0.75;`);
  };
  wm.customProgramCacheKey = () => 'lagoonWater';
  const wR = new THREE.Mesh(new THREE.PlaneGeometry(300, BRL + 40, 30, Math.min(220, Math.ceil(BRL / 8))), wm); wR.rotation.x = -Math.PI / 2; wR.position.set(6.6 + 150, 0.2, 0);
  const wL = wR.clone(); wL.position.x = -19.6 - 150; lagoon.add(wR, wL);
  const parT = canvasTex(64, 32, (x, w, h) => { x.fillStyle = '#eceff1'; x.fillRect(0, 0, w, h); x.fillStyle = '#78909c'; for (let i = 4; i < w; i += 16) x.fillRect(i, 9, 6, h - 12); x.fillStyle = '#ffd23f'; x.fillRect(0, 0, w, 5); }, true); parT.repeat.set(BRL / 2.5, 1);
  for (const px of [6.55, -19.65]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.0, BRL + 40), toon('#ffffff', { map: parT })); p.position.set(px, 0.2, 0); lagoon.add(p); }
  for (let i = 0; i < 10; i++) { const c = mergedMesh([P(G.box, '#6d4c41', 0, 0.18, 0, 0, 0, 0, 1.0, 0.36, 4.2), P(G.box, '#8d6e63', 0, 0.38, 0, 0, 0, 0, 0.8, 0.06, 3.6)], 0.03, false); c.position.set(i % 2 ? rand(18, 70) : rand(-30, -80), 0.12, rand(-BRL / 2, BRL / 2)); c.rotation.y = rand(0, 6); lagoon.add(c); }
}
// Ojota interchange flyovers
const FLY_D = [1.1 * UPK, 3.3 * UPK]; const flyovers = FLY_D.map(() => { const f = flyover(); f.visible = false; RW.add(f); return f; });
const DUST = { kara: ['#c9a46a', 0.72], mowe: ['#bf9f6e', 0.5] };
const walkers = [];
for (let i = 0; i < 4; i++) { const g = bakedHuman(randomLook({ gender: pick(['m', 'f']) }), 'walk', 6); const h = { root: g }; g.position.set(rand(7, 7.8), 0, -60 * i); g.userData.tag = "walker"; RW.add(g); walkers.push(h); }
const oncoming = [];
for (let i = 0; i < 4; i++) { const v = i % 3 === 2 ? truck() : danfo(); v.rotation.y = Math.PI; v.position.set(i % 2 ? -10.6 : -15.2, 0, -80 * i); v.userData.tag = "oncoming"; RW.add(v); oncoming.push(v); }
const bridges = [bridge(), bridge()]; bridges.forEach(b => { b.visible = false; b.userData.tag = 'bridge'; RW.add(b); });
const roadGate = gateArch(14.5); roadGate.visible = false; RW.add(roadGate);
const ORB_N = 150;
const orbMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: 0xffe14a }), ORB_N); orbMesh.frustumCulled = false; RW.add(orbMesh);
const orbs = Array.from({ length: ORB_N }, () => ({ on: false, x: 0, y: 1, z: 0 }));
// v10: in the Leviticus vision the light orbs become golden oil lamps and silver coins
const lampMesh = new THREE.InstancedMesh(VW.lampGeo(), new THREE.MeshBasicMaterial({ vertexColors: true }), ORB_N); lampMesh.frustumCulled = false; lampMesh.visible = false; RW.add(lampMesh);
const coinMesh = new THREE.InstancedMesh(VW.coinGeo(), new THREE.MeshBasicMaterial({ vertexColors: true }), ORB_N); coinMesh.frustumCulled = false; coinMesh.visible = false; RW.add(coinMesh);
const _zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
function hideOrbs() { const m = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < ORB_N; i++) orbMesh.setMatrixAt(i, m); orbMesh.instanceMatrix.needsUpdate = true; }
hideOrbs();

/* ---- answer gates (one glowing arch per lane) ---- */
const GATE_COLS = ['#1e88e5', '#8e24aa', '#2e9e4f'];
const answerGate = new THREE.Group(); answerGate.visible = false; RW.add(answerGate);
function drawGateLabel(lab, text, col, state) {
  const x = lab.cv.getContext('2d'), w = lab.cv.width, h = lab.cv.height;
  x.clearRect(0, 0, w, h);
  x.fillStyle = '#1a1206'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 26); x.fill();
  x.fillStyle = state === 'ok' ? '#ffd23f' : state === 'dim' ? '#6d6d6d' : col; x.beginPath(); x.roundRect(12, 12, w - 24, h - 24, 20); x.fill();
  x.fillStyle = state === 'ok' ? '#1a1206' : '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = 46; x.font = `900 ${fs}px system-ui, sans-serif`;
  while (x.measureText(text).width > w - 44 && fs > 22) { fs -= 2; x.font = `900 ${fs}px system-ui, sans-serif`; }
  x.fillText(text, w / 2, h / 2 + 2);
  lab.tex.needsUpdate = true;
}
const gateLanes = LANES.map((lx, i) => {
  const g = new THREE.Group(); g.position.x = lx;
  const frame = mergedMesh([P(G.box, '#ffd23f', -1.38, 1.7, 0, 0, 0, 0, 0.24, 3.4, 0.24), P(G.box, '#ffd23f', 1.38, 1.7, 0, 0, 0, 0, 0.24, 3.4, 0.24), P(G.box, '#ffd23f', 0, 3.4, 0, 0, 0, 0, 3.0, 0.26, 0.26)], 0.04, false);
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 3.25), new THREE.MeshBasicMaterial({ color: GATE_COLS[i], transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  curtain.position.y = 1.65;
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 110;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.03), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, fog: false }));
  panel.position.y = 4.15;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: GATE_COLS[i], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8, fog: false })); glow.scale.set(5.2, 5.2, 1); glow.position.y = 2.2;
  g.add(glow, frame, curtain, panel); answerGate.add(g);
  return { g, curtain, lab: { cv, tex }, panel };
});
const gateDist = i => stopDist(i) - 14;
const gateGD = g => (g.vi != null && R.vis ? R.vis.gates[g.vi] - R.vis.d : gateDist(g.idx) - R.dist);

/* ---- verse scrolls ---- */
const scrolls = [];
for (let i = 0; i < 3; i++) {
  const m = VW.scrollMesh();   // v10: cream parchment with a red wax seal
  m.visible = false; RW.add(m); scrolls.push({ obj: m, on: false, lane: 1 });
}
function hideScrolls() { scrolls.forEach(s => { s.on = false; s.obj.visible = false; }); }

/* ---- power-ups (Biblically framed) ---- */
const POWERS = {
  fire: { icon: '🔥', name: 'Holy Ghost Fire', ref: 'Acts 2:3', dur: 5, col: [1, 0.5, 0.15], line: 'cloven tongues like as of fire' },
  shield: { icon: '🛡️', name: 'Shield of Faith', ref: 'Ephesians 6:16', dur: 20, col: [0.4, 0.8, 1], line: 'quench all the fiery darts' },
  lamp: { icon: '🏮', name: 'Lamp unto my feet', ref: 'Psalm 119:105', dur: 8, col: [1, 0.85, 0.35], line: 'Thy word is a lamp unto my feet' },
  wings: { icon: '👼', name: 'Angel wings', ref: 'Psalm 91:11', dur: 6, col: [1, 0.86, 0.94], line: 'He shall give his angels charge over thee' },   // v10
};
const powerUps = Object.keys(POWERS).map(k => {
  const g = new THREE.Group(); const ic = k === 'wings' ? VW.wingsMesh(1.25) : textSprite(POWERS[k].icon, 1.5); if (ic.material) { ic.material.depthTest = true; ic.renderOrder = 0; }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 8, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(...POWERS[k].col), toneMapped: false }));
  const pg = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: new THREE.Color(...POWERS[k].col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pg.scale.set(4, 4, 1);
  g.add(pg, ic, ring); g.visible = false; RW.add(g); return { k, g, ring, on: false, lane: 1 };
});
// v10: golden shield-of-faith bubble with an engraved cross
const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.45, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe9a8, map: VW.SHIELD_TEX, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
{ const rim = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide })); shieldBubble.add(rim); }
const playerWings = VW.wingsMesh(0.95); playerWings.position.set(0, 1.42, -0.32); playerWings.visible = false;
shieldBubble.visible = false; scene.add(shieldBubble);
const FALL_VERSES = [
  ['For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.', 'Proverbs 24:16'],
  ['Rejoice not against me, O mine enemy: when I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.', 'Micah 7:8'],
  ['Though he fall, he shall not be utterly cast down: for the LORD upholdeth him with his hand.', 'Psalm 37:24'],
  ['Persecuted, but not forsaken; cast down, but not destroyed.', '2 Corinthians 4:9'],
];

const OBS = {
  pothole: { make: pothole, rel: 1, jump: true, len: 1.6 },
  cone: { make: cones, rel: 1, jump: true, len: 0.9 },
  danfo: { make: danfo, rel: 0.78, jump: false, len: 4.6, surf: 2.08, big: true },
  truck: { make: truck, rel: 0.8, jump: false, len: 8, surf: 3.45, big: true },
  okada: { make: okada, rel: 0.7, jump: false, len: 2.2, big: true },
  hawker: { make: hawker, rel: 1, jump: false, len: 0.9 },
  hawkerX: { make: hawker, rel: 1, jump: false, len: 0.9, cross: true },
  danfoP: { make: danfo, rel: 1, jump: false, len: 4.6, surf: 2.08, big: true, parked: true },
  truckP: { make: truck, rel: 1, jump: false, len: 8, surf: 3.45, big: true, parked: true },
  danfoR: { make: () => withRamp(danfo(), 4.6, 5.2, 2.08), rel: 1, jump: false, len: 4.6, surf: 2.08, ramp: 5.2, big: true, parked: true },
  truckR: { make: () => withRamp(truck(), 8, 7.5, 3.45), rel: 1, jump: false, len: 8, surf: 3.45, ramp: 7.5, big: true, parked: true },
  kramp: { make: okadaRamp, rel: 1, jump: false, len: 0.2, surf: 1.1, ramp: 3.2, launch: true },
  rail: { make: null, rel: 1, jump: false, len: 30, surf: 0.85, ramp: 2.2, grind: true },
  bar: { make: barMesh, rel: 1, slide: true, len: 0.5, over: 1.85 },
  sign: { make: lowSign, rel: 1, slide: true, len: 0.4, over: 3.3 },
  beam: { make: beamMesh, rel: 1, slide: true, len: 0.8, over: 2.05, wide: true },
};
// v11: storm hazard: wind-blown roofing sheets + a crate land in one telegraphed lane (jump them or change lane)
function debrisMesh() { const p = [P(G.box, '#9aa4ad', 0, 0.42, 0, 0.35, 0.3, 0.12, 2.1, 0.07, 1.2), P(G.box, '#7e8890', 0.15, 0.25, 0.3, -0.2, -0.4, 0.2, 1.7, 0.07, 1.0), P(G.box, '#a8743d', -0.6, 0.35, -0.2, 0, 0.5, 0, 0.7, 0.7, 0.7), P(G.box, '#8a5a2b', -0.6, 0.71, -0.2, 0, 0.5, 0, 0.74, 0.04, 0.74)]; for (let i = 0; i < 5; i++) p.push(P(G.box, '#c3ccd3', -0.8 + i * 0.4, 0.46, 0, 0.35, 0.3, 0.12, 0.05, 0.09, 1.2)); const g = new THREE.Group(); g.add(mergedMesh(p, 0.03)); return g; }
OBS.debris = { make: debrisMesh, rel: 1, jump: true, len: 1.2 };
Object.assign(OBS, VW.VOBS);   // v10: vision-world obstacles (lion statues, pillars, logs, arches, fallen columns…)
function withRamp(v, len, L, H) { const r = rampMesh(L, H); r.position.z = len / 2; v.add(r); return v; }
const freeObs = {}, active = [];
function spawnObs(type, lane, z, len) {
  const D = OBS[type], key = type === 'rail' ? 'rail' + len : type;
  freeObs[key] = freeObs[key] || [];
  let obj = freeObs[key].pop();
  if (!obj) {
    obj = type === 'rail' ? railMesh(len) : D.make();
    if (type !== 'pothole' && type !== 'rail') { obj.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; }); if (!D.slide && type !== 'kramp') addBlob(obj, type === 'cone' ? 1.6 : type.startsWith('hawker') ? 1.3 : 2.9, Math.max(1.4, D.len * 1.15)); }
  }
  obj.userData.tag = 'obs-' + type; obj.position.set(D.wide ? 0 : LANES[lane], 0, z); obj.rotation.set(0, 0, 0); RW.add(obj);
  if (obj.userData.bar) obj.userData.bar.position.y = 1.55;
  const a = { type, key, lane, obj, hit: false, ex: 0, ...D, len: type === 'rail' ? len : D.len };
  active.push(a); return a;
}
function prewarm() {
  try {
    const tmp = [];
    for (const t of Object.keys(OBS)) { if (t === 'rail') continue; for (let k = 0; k < 2; k++) tmp.push(spawnObs(t, k % 3, -60 - k * 9, 0)); }
    lampGlow.visible = true; lagoon.visible = true;
    renderer.compile(scene, camera);
    clearObs(); lampGlow.visible = false; lagoon.visible = false;
  } catch (e) { console.warn('prewarm', e); }
}
function clearObs(filter = () => true) {
  for (let i = active.length - 1; i >= 0; i--) { const a = active[i]; if (filter(a)) { RW.remove(a.obj); freeObs[a.key].push(a.obj); active.splice(i, 1); } }
}
function spawnOrb(x, y, z) { const o = orbs.find(o => !o.on); if (o) Object.assign(o, { on: true, x, y, z }); }

const SPAWN_Z = -150;
const STOP_D = C.STOP_KM.map(k => k * UPK);
const stopDist = i => STOP_D[i];
const RUN_LEN = STOP_D[STOP_D.length - 1];
let R = null;
function moveProps(move) {
  const d0 = curDist();
  for (const d of palmData) { d.z += move; if (d.z > 25) d.z -= 330; d.hide = !!zoneAt(KM(d0 - d.z)).water; }
  for (const d of lampData) { d.z += move; if (d.z > 25) d.z -= 330; }
  writeInst(palms, palmData); writeInst(lamps, lampData); updateGlow();
  const fogCut = -(scene.fog.far + 6);   // anything past the fog wall is invisible anyway: skip its draw calls
  for (const r of roadside) { const o = r.obj; o.position.z += move; if (o.position.z > 30) o.position.z -= r.span; o.visible = o.position.z > fogCut && SIDE_RULE[r.kind](zoneAt(KM(d0 - o.position.z))); }
  for (const h of walkers) { h.root.position.z += move * 1.05; if (h.root.position.z > 25) h.root.position.z -= 300; h.root.visible = h.root.position.z > fogCut && !zoneAt(KM(d0 - h.root.position.z)).water; }
  roadTex.offset.y += move / 8; grassTex.offset.y += move / 10; kerbTex.offset.y += move * 110 / 320;
  lagoon.position.z = -((BR0 + BR1) / 2 - d0); lagoon.visible = d0 + 330 > BR0 && d0 - 40 < BR1; if (lagoon.visible) waterTex.offset.x = S.t * 0.02;
  flyovers.forEach((f, i) => { const z = -(FLY_D[i] - d0); f.position.z = z; f.visible = z > -330 && z < 40; });
}
function resetGround() { groundMat.color.setScalar(1); groundMat.emissive.setScalar(0); }
function startRun(opt = {}) {
  if (R && R.vis) leaveVisionWorld();
  try { localStorage.setItem('lr_runs', String((+localStorage.getItem('lr_runs') || 0) + 1)); } catch (e) {}
  fadeFlash();
  S.mode = 'run'; S.paused = false;
  RW.visible = true; CW.visible = false; scene.add(player.root); player.root.visible = true; player.root.position.set(0, 0, 0); player.root.rotation.set(0, Math.PI, 0);
  clearObs(); orbs.forEach(o => o.on = false); fx.clear(); resetGround();
  R = { combo: 0, comboT: 0, fire: 0, shield: false, shieldT: 0, magnet: 0, stumble: 0, lastStumble: -99, dark: 0, revived: false, nextPowerD: 380, popT: 0, dist: 0, t: 0, speed: START_SPEED, lane: 1, px: 0, pv: 0, camX: 0, py: 0, vy: 0, g: 50, onGround: true, coyote: 0, jbuf: 0, sbuf: 0, sl: 0, burst: 0, grind: false, grindM: 0, grindRun: 0, slides: 0, roofs: 0, inv: 0, shake: 0, nextRow: 40, stopIdx: 0, moralIdx: 0, dustT: 0, trailT: 0, ev: S.plan.event, gate: null, vGot: 0, nextScrollD: 120, autoT: 0, flash: 0, signFlash: null, zone: -1, boss: null, bossDone: {}, kmInt: 0, earn: 0, orbBuf: 0, dustK: 0, dustCol: '#c9a46a', traffic: 1, jamFree: 1, jamRows: 3, tightGap: false, startT: performance.now() };
  R.scrollGap = (RUN_LEN - 600) / (S.plan.verse.parts.length + 1.5);
  // v10: a vision gate opens past Ojota once per chapter (journey runs only)
  R.wings = 0; R.vis = null; R.visSkip = false; R.visTold = false; playerWings.visible = false; Object.values(portals).forEach(p => p.visible = false);
  R.visBook = NOVIS || opt.vision || save.visCh === save.chapter ? null : journeyBook(); if (R.visBook) warmWorld(R.visBook);
  hideScrolls(); answerGate.visible = false; hideGateUI();
  R.cp0 = R.cp = snapCP(0, 0, 'Lagos (the start)');
  hudMode('run'); verseHUD(); powerHUD(); buildMap();
  const st = M.markPlayed(); if (st) setTimeout(() => toast(`🔥 Day ${st.n} streak! +${st.reward} 💡 light`, 2400), 3600);
  if (opt.vision) {} else if (needTutorial()) startTutorial(); else toast('Swipe ⬅️ ➡️ lanes · ⬆️ jump · ⬇️ slide · Run Lagos → KM 46!', 3400);
}
const START_SPEED = 22, MAX_SPEED = 72, JUMP_H = 2.4;   // v9: a touch quicker off the line (was 20)
// v9 gentle start: early in chapter 1 (or a new player's first runs) big vehicle hits only stumble you
const GENTLE_KM = 3;
function isGentle() { return !!R && !R.boss && !R.vis && KM(R.dist) < GENTLE_KM && (save.chapter === 1 || (+localStorage.getItem('lr_runs') || 0) < 3); }
const airT = () => clamp(0.62 - (R.speed - 20) * 0.0022, 0.5, 0.62);
const slideT = () => clamp(0.72 - (R.speed - 20) * 0.004, 0.5, 0.72);
const act = k => { const A = R.acts || (R.acts = { move: 0, jump: 0, slide: 0, ramp: 0 }); A[k]++; };   // v11: every player action is counted (the no-input tests assert these stay 0)
function runMove(d) { act('move'); const n = clamp(R.lane + d, 0, 2); if (S.tut) tutAct(d < 0 ? 'left' : 'right'); if (n !== R.lane) { R.lane = n; R.moveT = R.t; sfx.tap(); buzz(8); if (R.grind) endGrind(); } }
function runJump() { act('jump');
  if (S.tut) tutAct('up');
  if (R.onGround || R.coyote > 0) { const T = airT(); R.g = 8 * JUMP_H / (T * T); R.vy = 4 * JUMP_H / T; R.onGround = false; R.coyote = 0; R.sl = 0; R.jbuf = 0; sfx.jump(); if (R.grind) endGrind(); }
  else R.jbuf = 0.2;     // buffered: jump the moment you land
}
function runSlide() { act('slide');
  if (S.tut) tutAct('down');
  if (!R.onGround) { R.vy = Math.min(R.vy, -30); R.sbuf = 0.35; }   // slam down, then slide on landing
  else if (R.sl <= 0.1) { R.sl = slideT(); sfx.whoosh(); if (R.grind) endGrind(); }
}
function runSpeed() {
  const ch = save.chapter, p = clamp(R.dist / RUN_LEN, 0, 1);
  const s0 = START_SPEED + Math.min(8, (ch - 1) * 1.0);
  return Math.min(MAX_SPEED, s0 * Math.min(1, 0.7 + R.t * 0.3) + (MAX_SPEED - s0) * Math.pow(p, 0.7));
}
function rowGap() { const T = Math.max(0.62, lerp(1.05, 0.66, clamp(R.dist / RUN_LEN, 0, 1)) / Math.sqrt(R.traffic * R.ev.mod.traffic)); return Math.max(16, R.speed * T); }
// v11: questions appear ~6 s ahead at any speed (≈7 s with the gentle question ease), never under 140 units
const readDist = () => Math.max(140, R.speed * 5.8);
function gateZone(arrive) {   // 2 = quiet, 1 = jumpables only, 0 = normal
  let z = 0;
  for (const i of [R.stopIdx, R.stopIdx + 1]) { if (i >= C.STOPS.length - 1) continue; const gz = gateDist(i); if (arrive > gz - readDist() - 30 && arrive < stopDist(i) + 8) z = 2; }   // v11: the whole question window is clear road (light only)
  return z;
}
const inGateZone = arrive => gateZone(arrive) > 0;
function groundAt(px) {
  let h = 0, top = null;
  for (const a of active) {
    if (!a.surf || a.fly || Math.abs(a.obj.position.x - px) > 1.25) continue;
    const z = a.obj.position.z, half = a.len / 2; let y = -1;
    if (Math.abs(z) <= half + 0.15) y = a.surf;
    else if (a.ramp) { const e = -(z + half); if (e >= 0 && e <= a.ramp) y = a.surf * (1 - e / a.ramp); }
    if (y > h) { h = y; top = a; }
  }
  return [h, top];
}
/* ---- obstacle patterns ---- */
function busyLane(l) { return active.some(a => (a.wide || a.lane === l) && (a.rel < 1 ? a.obj.position.z < -20 : a.obj.position.z - a.len / 2 - (a.ramp || 0) * 0 < SPAWN_Z + 8)); }
function pickPattern() {
  const km = KM(R.dist), b = R.boss && R.boss.id;
  let W;
  if (b === 'storm') W = { basic: 3, slide: 3.5 };
  else if (b === 'goslow') W = { jam: 8, basic: 0.4 };
  else if (b === 'market') W = { market: 5, slide: 1.2, basic: 0.8 };
  else if (km < 1.0) W = { basic: 6, slide: 1, grind: 0.6 };
  else W = { basic: 5, slide: 1.5, roof: 1.4, grind: 1.3, launch: km > 3 ? 0.8 : 0 };
  if (FORCE.pattern) { const k = FORCE.pattern; FORCE.pattern = null; return k; }
  let t = Object.values(W).reduce((a, b) => a + b, 0) * Math.random();
  for (const k in W) { t -= W[k]; if (t <= 0) return k; }
  return 'basic';
}
const FORCE = { pattern: null };
function freeLanes() { return shuffle([0, 1, 2]).filter(l => !busyLane(l)); }
function rowBasic(light) {
  const sp = R.speed, ch = save.chapter, tr = R.traffic * R.ev.mod.traffic, easy = ch === 1 && KM(R.dist) < 2.0;
  const pool = light ? ['pothole', 'cone'] : easy ? ['pothole', 'cone', 'danfo', 'pothole'] : sp < 40 ? ['pothole', 'cone', 'danfo', 'okada', 'hawker', 'danfo', 'bar'] : ['pothole', 'cone', 'danfo', 'okada', 'truck', 'hawker', 'danfo', 'okada', 'bar'];
  if (!light && tr > 1.25) pool.push('danfo', 'truck');
  if (R.ev.mod.rain) pool.push('pothole', 'pothole');
  const lanes = freeLanes(); if (!lanes.length) return 0;
  const two = !light && Math.random() < Math.min(0.7, (easy ? 0 : 0.25) + Math.max(0, sp - 24) * 0.012 + (tr - 1) * 0.3);
  const n = lanes.length === 3 ? (two ? 2 : 1) : lanes.length === 2 ? 1 : 0;
  for (let i = 0; i < n; i++) spawnObs(pick(pool), lanes[i], SPAWN_Z - i * rand(0, 3));
  const free = lanes[n] ?? lanes[0], cnt = 4 + Math.floor(Math.random() * 3);
  for (let k = 0; k < cnt; k++) spawnOrb(LANES[free], 1.0, SPAWN_Z - 4 - k * 2.6);
  const first = active[active.length - n];
  if (n && first && first.jump && Math.random() < 0.6) for (let k = -1; k <= 1; k++) spawnOrb(LANES[first.lane], 2.5 - Math.abs(k) * 0.5, SPAWN_Z + k * 1.8);
  return 0;
}
function rowSlide() {
  const lanes = freeLanes(); if (!lanes.length) return 0;
  const storm = R.boss && R.boss.id === 'storm';
  if (lanes.length === 3 && Math.random() < (storm ? 0.25 : 0.4)) {
    spawnObs('beam', 1, SPAWN_Z); const l = pick([0, 1, 2]); for (let k = -2; k <= 2; k++) spawnOrb(LANES[l], 0.55, SPAWN_Z + k * 2.2); return 2;
  }
  const n = lanes.length >= 2 && Math.random() < 0.55 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const a = spawnObs(R.boss && R.boss.id === 'market' ? 'sign' : Math.random() < 0.25 ? 'sign' : 'bar', lanes[i], SPAWN_Z);
    if (storm && a.obj.userData.bar) { a.drop = true; a.dropV = 0; a.obj.userData.bar.position.y = 7.5; }
  }
  if (lanes[n] !== undefined) { if (Math.random() < 0.4) spawnObs('cone', lanes[n], SPAWN_Z - rand(0, 4)); else for (let k = 0; k < 5; k++) spawnOrb(LANES[lanes[n]], 1.0, SPAWN_Z - k * 2.6); }
  for (let k = -2; k <= 2; k++) spawnOrb(LANES[lanes[0]], 0.55, SPAWN_Z + k * 2.0);
  return 2;
}
function rowRoof() {
  const lanes = freeLanes(); if (lanes.length < 2) return rowBasic();
  const L = lanes[0], type = R.speed > 32 && Math.random() < 0.3 ? 'truckR' : 'danfoR', D = OBS[type];
  const z0 = SPAWN_Z - D.len / 2 - D.ramp; spawnObs(type, L, z0);
  for (let z = z0 + D.len / 2 - 0.5; z > z0 - D.len / 2; z -= 2.2) spawnOrb(LANES[L], D.surf + 1.0, z);
  let far = z0 - D.len / 2;
  if (Math.random() < 0.6) { const D2 = OBS.danfoP, zz = far - rand(1.5, 3.5) - D2.len / 2; spawnObs('danfoP', L, zz); for (let z = zz + 2; z > zz - 2.3; z -= 2.2) spawnOrb(LANES[L], D2.surf + 1.0, z); far = zz - D2.len / 2; }
  for (const l of lanes.slice(1)) { const r = Math.random(); if (r < 0.45) spawnObs(Math.random() < 0.75 ? 'danfoP' : 'truckP', l, SPAWN_Z - rand(2, 8) - 2.3); else if (r < 0.7) spawnObs('cone', l, SPAWN_Z - rand(0, 6)); }
  return SPAWN_Z - far;
}
function rowGrind() {
  const lanes = freeLanes(); if (lanes.length < 2) return rowBasic();
  const L = lanes[0], len = pick([24, 32, 40]);
  spawnObs('rail', L, SPAWN_Z - 2.2 - len / 2, len);
  for (let k = 0; k < len; k += 3) spawnOrb(LANES[L], 1.95, SPAWN_Z - 2.2 - k);
  for (const l of lanes.slice(1)) for (let k = 4; k < len; k += rand(10, 15)) if (Math.random() < 0.55) spawnObs(pick(['cone', 'pothole', 'bar']), l, SPAWN_Z - k);
  return len + 2.2;
}
function rowLaunch() {
  const lanes = freeLanes(); if (lanes.length < 2) return rowBasic();
  const L = lanes[0], D = OBS.kramp, zt = SPAWN_Z - D.ramp;
  spawnObs('kramp', L, zt - D.len / 2);
  for (let k = 1; k <= 9; k++) { const t = k * 0.085; spawnOrb(LANES[L], 1.1 + 17 * t - 25 * t * t + 0.9, zt - R.speed * t); }
  if (Math.random() < 0.6) spawnObs('danfoP', lanes[1], SPAWN_Z - 3 - rand(0, 6));
  return 6;
}
function rowJam() {
  const lanes = [0, 1, 2].filter(l => !busyLane(l)); if (lanes.length < 3) return rowBasic(true);
  let change = false;
  if (--R.jamRows <= 0) { R.jamFree = clamp(R.jamFree + pick([-1, 1]), 0, 2); R.jamRows = 3 + Math.floor(Math.random() * 3); change = true; }
  const rampL = Math.random() < 0.5 ? pick([0, 1, 2].filter(l => l !== R.jamFree)) : -1;
  let far = SPAWN_Z;
  for (const l of lanes) {
    if (l === R.jamFree) { for (let k = 0; k < 4; k++) spawnOrb(LANES[l], 1.0, SPAWN_Z - k * 2.6); continue; }
    const type = l === rampL ? 'danfoR' : 'danfoP', D = OBS[type], z = SPAWN_Z - (D.ramp || rand(0, 3)) - D.len / 2;
    spawnObs(type, l, z); far = Math.min(far, z - D.len / 2);
    if (Math.random() < 0.5) spawnOrb(LANES[l], D.surf + 1.0, z);
  }
  if (Math.random() < 0.3) sfx.horn();
  R.tightGap = !change;
  return SPAWN_Z - far;
}
function rowMarket() {
  const lanes = freeLanes(); if (lanes.length < 2) return rowBasic(true);
  const r = Math.random();
  if (r < 0.4) { const a = spawnObs('hawkerX', lanes[0], SPAWN_Z); a.vx = (lanes[0] === 2 ? -1 : lanes[0] === 0 ? 1 : pick([-1, 1])) * rand(1.4, 2.4); }
  else if (r < 0.7) spawnObs('sign', lanes[0], SPAWN_Z);
  else spawnObs(pick(['cone', 'pothole', 'hawker']), lanes[0], SPAWN_Z);
  if (lanes.length === 3 && Math.random() < 0.5) spawnObs(pick(['cone', 'hawker', 'sign']), lanes[1], SPAWN_Z - rand(4, 9));
  const fl = lanes[lanes.length - 1]; for (let k = 0; k < 7; k++) spawnOrb(LANES[fl], 1.0, SPAWN_Z - k * 2.4);
  return 3;
}
const ROWS = { basic: () => rowBasic(), slide: rowSlide, roof: rowRoof, grind: rowGrind, launch: rowLaunch, jam: rowJam, market: rowMarket };
function spawnRow(light) { return light ? rowBasic(true) : ROWS[pickPattern()](); }

let moralNPC = null;
function setMoralNPC(m) {
  if (moralNPC) RW.remove(moralNPC.root);
  if (!m) { moralNPC = null; return; }
  moralNPC = makeHuman(randomLook(m.look), false);
  const mk = textSprite('❗', 1.4); mk.position.y = moralNPC.topY + 0.9; moralNPC.root.add(mk); moralNPC.mark = mk;
  moralNPC.root.position.set(6.6, 0, -999); RW.add(moralNPC.root);
}
const MORAL_AFTER = [1, 4];
// v9: a roadside encounter never lands in a boss intro or fight; push it past the boss if needed
function bossWindow(d) { const km = KM(d); for (const id in C.BOSSES) { const B = C.BOSSES[id]; if (km > B.km0 - 0.6 && km < B.km1 + 0.15) return B; } return null; }
function moralDist(i) { let d = stopDist(MORAL_AFTER[i]) + 40; for (let k = 0; k < 3; k++) { const B = bossWindow(d); if (!B) break; d = (B.km1 + 0.2) * UPK; } return d; }
/* ---- grind ---- */
function startGrind() { R.grind = true; R.grindRun = 0; sfx.grind(); popText('⚙️ Grind!', ''); }
function endGrind() {
  if (!R.grind) return; R.grind = false;
  const m = Math.round(R.grindRun); if (m >= 3) { const p = Math.round(m * 1.5) * comboMult(); S.score += p; addCombo(3); popText(`⚙️ Grind ${m} m +${p}`, 'big'); scorePop(); dstat('grindM', m); }
}
function dstat(stat, v = 1, mode) { const done = M.dailyStat(stat, v, mode); for (const c of done) { setTimeout(() => { popText(`📅 ${c.t} ✓ +${c.r} 💡`, 'big'); sfx.good(); }, 300); } }
/* ---- zones + bosses ---- */
function enterZone(i) {
  const z = C.ZONES[i]; R.zone = i; R.traffic = z.traffic || 1;
  if (S.mode === 'run') { R.zoneMsg = { txt: `🗺️ ${z.name} · KM ${Math.round(z.km)}`, t: 2.6 }; hudT = 0; }   // v8: announced in the HUD pill, never over the road
  if (z.id === 'bridge') dstat('reachBridge', 1, 'max');
  if (z.id === 'mowe') dstat('reachMowe', 1, 'max');
}
function zoneCard(t, sub, km, cls = '') {
  const el = $('#zoneCard'); el.className = cls; el.innerHTML = `<small>${esc(km)}</small><b>${esc(t)}</b><span>${esc(sub)}</span>`;
  void el.offsetWidth; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2300);
}
function bossStart(id) {
  const B = C.BOSSES[id]; R.boss = { id, crashes: 0, gustT: 3.5, boltT: 1.2, warn: null };
  clearTimeout($('#zoneCard')._t); $('#zoneCard').classList.remove('show');
  const el = $('#bossCard'); el.className = 'boss ' + id; el.innerHTML = `<div class="bi">${B.icon}</div><b>${esc(B.title)}</b><span>${esc(B.sub)}</span>`; void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1900);
  sfx.boss(); shakeDOM(); document.body.classList.add('boss-' + id);
  const hb = $('#hBoss'); hb.className = 'boss-' + id; hb.querySelector('span').textContent = B.icon; hb.querySelector('em').textContent = B.title.replace(/^(STORM ON |)/, ''); setW(hb.querySelector('b'), 0);
}
function bossEnd(win) {
  const b = R.boss; if (!b) return; const B = C.BOSSES[b.id];
  document.body.classList.remove('boss-' + b.id); $('#gust').classList.remove('show'); $('#hBoss').className = 'hidden'; laneWarn.visible = false; b.warn = null;
  R.boss = null; if (!win) return;
  R.bossDone[b.id] = true;
  const pts = b.crashes ? Math.round(B.reward / 2) : B.reward;
  S.score += pts; addLantern(10); R.earn += Math.round(pts / 5); sfx.good(); scorePop();
  if (b.id === 'storm') dstat('storm', 1, 'max'); if (b.id === 'goslow') dstat('goslow', 1, 'max');
  const el = $('#bossCard'); el.className = 'boss win'; el.innerHTML = `<b>${esc(B.winTitle)} +${pts}</b><span>“${esc(B.win[0])}”</span><small>${esc(B.win[1])} (KJV)</small>`; void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3400);
  for (let k = 0; k < 40; k++) fx.emit(R.px + rand(-3, 3), rand(0.5, 4), rand(-4, 0), rand(-3, 3), rand(1, 5), rand(-2, 2), 1.0, 0.6, pick(['#fff3a0', '#ffd23f', '#ffffff']), 0.5);
}
const LANE_NAMES = ['left', 'middle', 'right'];
const qActive = () => !!(R && R.gate && R.gate.shown && !R.gate.done);
// v11: a telegraphed lane hazard (storm debris, flood waves): warn strip + banner, then a jumpable obstacle lands in that lane ahead.
// Nothing here ever changes the player's lane; no new hazard starts while a question is up.
function laneHazard(b, dt, type, msg, warnT, gap) {
  const g = $('#gust');
  if (!b.warn && !qActive() && (b.gustT -= dt) <= 0) {
    const lane = Math.random() < 0.6 ? R.lane : pick([0, 1, 2]); b.warn = { lane, t: warnT };
    laneWarn.visible = true; laneWarn.position.set(LANES[lane], 0.05, -24); g.textContent = msg(lane); g.classList.add('show'); sfx.whoosh(); buzz(10);
  }
  if (b.warn) {
    laneWarn.material.opacity = 0.36 + 0.22 * Math.sin(S.t * 20);
    if ((b.warn.t -= dt) <= 0) {
      const l = b.warn.lane, z = -Math.max(34, R.speed * 1.15);
      if (!active.some(a => (a.wide || a.lane === l) && Math.abs(a.obj.position.z - z) < 8)) { const a = spawnObs(type, l, z); a.hazard = true; }
      b.warn = null; b.gustT = rand(gap[0], gap[1]); laneWarn.visible = false; g.classList.remove('show');
    }
  }
}
function updateBoss(dt) {
  const km = KM(R.dist);
  for (const id in C.BOSSES) { const B = C.BOSSES[id]; if (km >= B.km0 && km < B.km1 && !R.bossDone[id] && (!R.boss || R.boss.id !== id)) bossStart(id); }
  const b = R.boss; if (!b) return;
  const B = C.BOSSES[b.id];
  setW(el$('hBoss').querySelector('b'), clamp((km - B.km0) / (B.km1 - B.km0), 0, 1) * 100);
  if (km >= B.km1) { bossEnd(true); return; }
  if (km < B.km0) { bossEnd(false); return; }
  if (b.id === 'storm') {
    for (let i = 0; i < 5; i++) fx.emit(R.px + rand(-14, 14), rand(7, 13), rand(-34, 4), rand(-4, -1), -30, 0, 0.45, 0.16, '#cfe8ff', 0);
    R.dark = Math.max(R.dark, 0.6);
    if ((b.boltT -= dt) <= 0) { b.boltT = rand(3, 5.5); const f = $('#bolt'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); hemi.intensity = 3.2; setTimeout(() => sfx.thunder(), 180); }
    hemi.intensity += (PRESETS.storm.hemiI - hemi.intensity) * Math.min(1, dt * 6);
    // v11: the wind never moves the runner. It flings debris into one telegraphed lane: jump it or change lane.
    laneHazard(b, dt, 'debris', l => `💨 Debris in the ${LANE_NAMES[l]} lane!`, 1.25, [3.2, 5.0]);
  }
}
function updateZoneFX(dt, km) {
  const zi = zoneIdx(km); if (zi !== R.zone) enterZone(zi);
  const z = C.ZONES[zi], du = DUST[z.id]; if (du) R.dustCol = du[0];
  R.dustK += ((du ? du[1] : 0) - R.dustK) * Math.min(1, dt * 0.7);
  groundMat.color.setScalar(1 - R.dustK); groundMat.emissive.set(R.dustCol).multiplyScalar(R.dustK * 0.8);
  for (const h of traders) if (h.visible) stepBaked(h, dt, 9);
  for (const h of walkers) if (h.root.visible) stepBaked(h.root, dt, 10);
  const k = Math.floor(km); if (k > R.kmInt) { R.kmInt = k; dstat('km', 1); if (k % 5 === 0) popText(`📍 ${k} km`, 'dim'); }
}
function emitTrails(dt) {
  const w = M.wallet(); if ((R.trailT -= dt) > 0) return; R.trailT = 0.035;
  const L = M.shopItem(w.lantern); if (lantern) { lantern.getWorldPosition(_pv); const c = L ? L.trail : '#ffd27a'; const k = w.lantern;
    fx.emit(_pv.x + rand(-0.05, 0.05), _pv.y, _pv.z + 0.1, rand(-0.2, 0.2), k === 'l_flame' ? rand(1, 2) : rand(-0.2, 0.4), rand(0.5, 1.5), k === 'l_dove' ? 0.9 : 0.5, k === 'l_star' ? 0.32 : 0.2, c, k === 'l_dove' ? 0.5 : 1); }
  const t = w.trail, fy = R.py + 0.1;
  if (t === 't_gold') fx.emit(R.px + rand(-0.25, 0.25), fy, 0.4, 0, rand(0.1, 0.4), 0, 0.7, 0.35, pick(['#ffd23f', '#fff3a0']), 0.6);
  else if (t === 't_rainbow') { const cols = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9']; cols.forEach((c, i) => fx.emit(R.px - 0.5 + i * 0.2, fy + 0.15, 0.4, 0, 0.05, 0, 0.6, 0.28, c, 0.2)); }
  else if (t === 't_wings') for (const s of [-1, 1]) fx.emit(R.px + s * 0.55, R.py + 1.35, 0.3, s * rand(0.5, 1.4), rand(0.2, 0.8), 0.6, 0.6, 0.36, '#ffffff', 0.8);
}
/* =========================================================
   v10 · BIBLE VISIONS: a bus stop opens a vision gate into a world from a book of the Bible
   ========================================================= */
const BIBLE_KEY = 'lr3d_bible';
function bible() { try { const b = JSON.parse(localStorage.getItem(BIBLE_KEY) || 'null'); if (b && b.books) return b; } catch (e) {} return { books: {} }; }
function bibleSave(b) { try { localStorage.setItem(BIBLE_KEY, JSON.stringify(b)); } catch (e) {} }
function bookRec(b, id) { return b.books[id] || (b.books[id] = { done: false, plays: 0, best: 0, stars: 0, q: {}, v: [] }); }
function bookUnlocked(id, b = bible()) { if (!BK.PLAYABLE.includes(id)) return false; const pre = BK.UNLOCK_AFTER[id]; return !pre || !!(b.books[pre] && b.books[pre].done); }
// the journey shows the first unfinished open book; once all three are done it rotates by chapter
function journeyBook() { const b = bible(); return BK.PLAYABLE.find(id => bookUnlocked(id, b) && !(b.books[id] && b.books[id].done)) || BK.PLAYABLE[((save ? save.chapter : 1) - 1) % BK.PLAYABLE.length]; }
const VIS_LEN = 2000, VIS_GATES = [430, 900, 1330], VIS_BOSS = [1420, 1930];
const visPortalD = () => stopDist(0) + 70;   // the vision gate opens just past Ojota; you come back out before Berger
const worlds = {}, portals = {};
PRESETS.vis_exodus_b = { top: '#061a33', mid: '#1f5a78', bot: '#0b3040', fog: '#1d4f63', sun: '#b8d8ff', sunI: 1.1, hemiS: '#8fc0e0', hemiG: '#1c3a44', hemiI: 1.0, sunPos: [0.0, 0.8, -0.5] };
function getWorld(id) {
  if (!worlds[id]) { const W = VW.buildWorld(id, TIER); worlds[id] = W; scene.add(W.group); PRESETS['vis_' + id] = W.sky; }
  return worlds[id];
}
function warmWorld(id) {   // build + compile shaders up front so the gate never hitches mid-run
  const W = getWorld(id); if (W.warm) return W; W.warm = true;
  try { W.group.visible = true; renderer.compile(scene, camera); } catch (e) {} W.group.visible = !!(R && R.vis && R.vis.id === id);
  return W;
}
function getPortal(id) {
  if (!portals[id]) { const WD = BK.WORLDS[id]; const p = VW.portalMesh(`📖 ${WD.name.toUpperCase()}`); p.visible = false; scene.add(p); portals[id] = p; }
  return portals[id];
}
const visExit = VW.portalMesh('', 'rgba(170,235,255,.85)', 'rgba(80,160,255,.35)'); visExit.visible = false; scene.add(visExit);
const laneWarn = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 34), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
laneWarn.rotation.x = -Math.PI / 2; laneWarn.position.set(0, 0.05, -6); laneWarn.visible = false; scene.add(laneWarn);
const chariots = [];
function chariotFree() { let c = chariots.find(c => !c.on); if (!c) { const obj = VW.chariotMesh(); obj.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; }); scene.add(obj); c = { obj, on: false }; chariots.push(c); } return c; }
let visHidden = [];
function hideRoadWorld(on) {
  const keep = new Set([answerGate, orbMesh, lampMesh, coinMesh, ...scrolls.map(s => s.obj), ...powerUps.map(p => p.g)]);
  if (on) { visHidden = []; for (const o of RW.children) { if (keep.has(o) || String(o.userData.tag || '').startsWith('obs-')) continue; if (o.visible) { visHidden.push(o); o.visible = false; } } lampGlow.visible = false; }
  else { for (const o of visHidden) o.visible = true; visHidden = []; }
}
function visQuiz(id, rec) {
  const Q = BK.WORLDS[id].quiz;
  return ['e', 'm', 'h'].map(l => { const pool = Q.filter(q => q[4] === l), fresh = pool.filter(q => !rec.q[q[0]]); return pick(fresh.length ? fresh : pool); });
}
function pickBookVerse(id, rec) { const vs = BK.WORLDS[id].verses, fresh = vs.filter(v => !rec.v.includes(v.ref)); return fresh.length ? fresh[0] : pick(vs); }
function visSpeed() { const V = R.vis; return Math.min(MAX_SPEED, V.s0 + (V.d / V.len) * 9 + (V.boss ? 2 : 0)); }
function visGateZone(arrive) {
  let z = 0; const V = R.vis, rd = readDist();
  for (let i = V.gi; i < V.gates.length; i++) { const gd = V.gates[i]; if (arrive > gd - rd - 30 && arrive < gd + 8) z = 2; }
  return z;
}
function enterVision(id, journey) {
  const W = warmWorld(id), WD = BK.WORLDS[id], b = bible(), rec = bookRec(b, id);
  fadeFlash(); sfx.power(); buzz(30); shakeDOM();
  if (R.boss) bossEnd(false);
  clearObs(); orbs.forEach(o => o.on = false); hideScrolls(); powerUps.forEach(p => { p.on = false; p.g.visible = false; }); hideGateUI(); answerGate.visible = false;
  Object.values(portals).forEach(p => p.visible = false);
  hideRoadWorld(true); W.group.visible = true;
  const verse = pickBookVerse(id, rec), bi = BK.PLAYABLE.indexOf(id);
  R.vis = { id, W, WD, d: 0, len: VIS_LEN, journey, gi: 0, gates: VIS_GATES.slice(), quiz: visQuiz(id, rec), verse, vGot: 0, nextScrollD: 150, scrollGap: (VIS_GATES[2] - 150) / (verse.parts.length + 0.3),
    right: 0, total: 0, boss: null, bossDone: false, bossK: 0, crashes: 0, score0: S.score, orbs0: S.orbs, nextPowerD: 220, wingsGiven: false, s0: Math.max(26, Math.min(40, R.speed)) + bi * 2 };
  R.nextRow = 40; R.gate = null; R.inv = 1.2; R.zoneMsg = null;
  orbMesh.visible = !W.lamps; lampMesh.visible = coinMesh.visible = W.lamps;
  visExit.visible = false; visExit.userData.lab !== journey && (visExit.userData.lab = journey);
  document.body.classList.add('invis', 'vis-' + id);
  zoneCard(WD.name.toUpperCase(), WD.place, journey ? '✨ VISION GATE' : '📖 BIBLE VISION', 'vision');
  setTimeout(() => { if (R && R.vis && R.vis.id === id && R.vis.d < 200) toast(WD.intro, 3400); }, 1300);
  rec.plays++; bibleSave(b);
  verseHUD(); powerHUD(); hudT = 0;
}
function leaveVisionWorld() { document.body.classList.remove('vfin');
  const V = R && R.vis; if (!V) return;
  if (V.boss) visBossEnd(false);
  V.W.group.visible = false; hideRoadWorld(false); visExit.visible = false; laneWarn.visible = false; chariots.forEach(c => { c.on = false; c.obj.visible = false; });
  orbMesh.visible = true; lampMesh.visible = coinMesh.visible = false;
  document.body.classList.remove('invis', 'vis-' + V.id); $('#gust').classList.remove('show');
  R.vis = null; R.gate = null; answerGate.visible = false; hideGateUI();
  clearObs(); orbs.forEach(o => o.on = false); hideScrolls(); powerUps.forEach(p => { p.on = false; p.g.visible = false; });
  verseHUD();
}
// journey: the golden vision gate across the expressway just past Ojota
function journeyPortal() {
  const id = R.visBook; if (!id || R.visSkip) return;
  const P0 = getPortal(id), pd = visPortalD() - R.dist;
  P0.visible = pd < 330 && pd > -3; P0.position.z = -pd; if (P0.visible) { P0.userData.disc.rotation.z = S.t * 0.8; P0.userData.disc.material.opacity = 0.36 + 0.1 * Math.sin(S.t * 4); }
  if (!R.visTold && pd < readDist() + 40) { R.visTold = true; toast(`✨ A vision gate is opening: ${BK.WORLDS[id].name}! Run through it`, 2600); sfx.stop(); }
  if (pd <= 0 && pd > -30) enterVision(id, true);   // (a debug jump far past the gate skips it)
}
function visionRow(light) {
  const V = R.vis, O = V.boss ? V.W.bossObs : V.W.obs, lanes = freeLanes(), z = SPAWN_Z;
  if (lanes.length < 3) return 6;
  const trail = (l, n = 5, y = 1.0, z0 = z) => { for (let k = 0; k < n; k++) spawnOrb(LANES[l], y, z0 - k * 2.6); };
  const r = Math.random();
  if (light) { spawnObs(pick(O.jump), lanes[0], z); trail(lanes[1], 4); return 4; }
  if (O.wide.length && r < 0.14) { spawnObs(pick(O.wide), 1, z); const l = pick([0, 1, 2]); for (let k = 0; k < 5; k++) { const t = (k - 2) * 0.09; spawnOrb(LANES[l], 1.0 + 2.2 - 40 * t * t, z + (k - 2) * 2.4); } return 5; }
  if (r < 0.34) { spawnObs(pick(O.slide), lanes[0], z); for (let k = 0; k < 3; k++) spawnOrb(LANES[lanes[0]], 0.7, z - 1.5 - k * 2.2); if (Math.random() < 0.45) spawnObs(pick(O.slide), lanes[1], z); else spawnObs(pick(O.dodge), lanes[1], z - 1); trail(lanes[2], 4); return 4; }
  if (r < 0.64) { spawnObs(pick(O.dodge), lanes[0], z); spawnObs(pick(O.jump), lanes[1], z - rand(0, 4)); trail(lanes[2], 6); return 6; }
  spawnObs(Math.random() < 0.55 ? pick(O.dodge) : pick(O.jump), lanes[0], z); trail(lanes[1], 5);
  if (Math.random() < 0.35) spawnObs(pick(O.jump), lanes[2], z - 10);
  return 10;
}
function visGates(dt) {
  const V = R.vis;
  if (V.gi < V.gates.length) {
    const gi = V.gi;
    if (!R.gate || R.gate.vi !== gi) { R.gate = prepGate(100 + gi, V.quiz[gi]); R.gate.vi = gi; }
    const g = R.gate, gd = V.gates[gi] - V.d, rd = readDist();
    answerGate.visible = gd < rd + 60 && gd > -1.5; answerGate.position.z = -gd;
    if (!g.shown && gd < rd) { g.shown = true; showGateQ(g); clearForQuestion(); }
    gateLanes.forEach((L, i) => { if (!g.done) L.curtain.material.opacity = 0.26 + 0.12 * Math.sin(S.t * 5 + i); else if (i === g.correctLane) L.curtain.material.opacity = 0.45 + 0.3 * Math.sin(S.t * 14); });
    if (!g.done && gd <= 0) {
      const ok = R.lane === g.correctLane; judgeGate(g); V.total++;
      if (ok) { V.right++; dstat('bookq'); const b = bible(); bookRec(b, V.id).q[g.q[0]] = 1; bibleSave(b); }
    }
    if (g.shown && !g.done) placeGateLabels();
    if (g.done && gd < -2) V.gi++;
  } else answerGate.visible = false;
  const ed = V.len - V.d; visExit.visible = ed < 330; visExit.position.z = -ed; if (visExit.visible) visExit.userData.disc.rotation.z = -S.t * 0.8;
}
function visSky(dt) {
  const V = R.vis, bid = V.WD.boss.id, k = V.bossK;
  const b = bid === 'flood' ? ['storm', 0.82] : bid === 'chariots' ? ['vis_exodus_b', 0.75] : ['dusk', 0.45];
  setSky('vis_' + V.id, b[0], k * b[1], V.W.fogMul * (1 + k * 0.35));
  lanternLight.intensity = (0.5 + k * 1.6) * S.lantern / 100;
}
function visBossStart() {
  const V = R.vis, B = V.WD.boss; V.boss = { t: 2.4, warn: null, crashes: 0 };
  clearTimeout($('#zoneCard')._t); $('#zoneCard').classList.remove('show');
  const el = $('#bossCard'); el.className = 'boss vis ' + B.id; el.innerHTML = `<div class="bi">${B.icon}</div><b>${esc(B.title)}</b><span>${esc(B.sub)}</span>`; void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2100);
  sfx.boss(); shakeDOM(); document.body.classList.add('boss-v-' + B.id);
  const hb = $('#hBoss'); hb.className = 'boss-' + B.id; hb.querySelector('span').textContent = B.icon; hb.querySelector('em').textContent = B.title; setW(hb.querySelector('b'), 0);
}
function visBossEnd(win) {
  const V = R.vis, b = V && V.boss; if (!b) return; const B = V.WD.boss;
  document.body.classList.remove('boss-v-' + B.id); $('#gust').classList.remove('show'); $('#hBoss').className = 'hidden'; laneWarn.visible = false;
  V.boss = null; if (!win) return;
  V.bossDone = true;
  const pts = b.crashes ? 120 : 250; S.score += pts; addLantern(10); R.earn += Math.round(pts / 5); sfx.good(); scorePop(); dstat('vboss', 1, 'max');
  const el = $('#bossCard'); el.className = 'boss win'; el.innerHTML = `<b>${esc(B.winTitle)} +${pts}</b><span>“${esc(B.win[0])}”</span><small>${esc(B.win[1])} (KJV)</small>`; void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3400);
  for (let k = 0; k < 40; k++) fx.emit(R.px + rand(-3, 3), rand(0.5, 4), rand(-4, 0), rand(-3, 3), rand(1, 5), rand(-2, 2), 1.0, 0.6, pick(['#fff3a0', '#ffd23f', '#ffffff']), 0.5);
  if (B.id === 'flood') { const rb = textSprite('🌈', 26); rb.position.set(0, 16, -90); rb.material.opacity = 0.9; scene.add(rb); setTimeout(() => scene.remove(rb), 4200); }
}
// returns true when the boss ended the run this frame
function visBoss(dt, move) {
  const V = R.vis;
  if (!V.boss && !V.bossDone && V.d >= VIS_BOSS[0]) visBossStart();
  V.bossK += ((V.boss ? 1 : 0) - V.bossK) * Math.min(1, dt * 1.2);
  for (const c of chariots) if (c.on) {
    c.obj.position.z -= c.v * dt; c.obj.position.y = Math.abs(Math.sin(S.t * 14)) * 0.06;
    if (Math.random() < 0.6) fx.emit(c.obj.position.x + rand(-1, 1), 0.3, c.obj.position.z + 1.5, rand(-1, 1), rand(0.5, 1.5), rand(1, 3), 0.7, 0.8, '#d6c6a0', 2.4);
    if (!c.hit && Math.abs(c.obj.position.z) < 2.0 && Math.abs(c.obj.position.x - R.px) < 1.5) {
      if (R.py > 2.0) { if (!c.nm) { c.nm = true; nearMiss('🦘 Leapt over a chariot!', 30, true); } }
      else if (R.inv <= 0 || R.fire > 0) { c.hit = true; if (onHit({ type: 'chariot', big: true, obj: c.obj, lane: c.lane })) return true; }
    }
    if (!c.hit && !c.nm && c.obj.position.z < -2.5 && Math.abs(c.obj.position.x - R.px) < 4 && Math.abs(c.obj.position.x - R.px) > 1.5) { c.nm = true; nearMiss('🐎 Dodged the chariot!', 20, true); }
    if (c.obj.position.z < -120) { c.on = false; c.obj.visible = false; }
  }
  const b = V.boss; if (!b) return false;
  const B = V.WD.boss;
  setW(el$('hBoss').querySelector('b'), clamp((V.d - VIS_BOSS[0]) / (VIS_BOSS[1] - VIS_BOSS[0]), 0, 1) * 100);
  if (V.d >= VIS_BOSS[1]) { visBossEnd(true); return false; }
  const g = $('#gust');
  if (B.id === 'flood') {
    for (let i = 0; i < 5; i++) fx.emit(R.px + rand(-14, 14), rand(7, 13), rand(-34, 4), rand(-3, -1), -30, 0, 0.45, 0.16, '#cfe8ff', 0);
    // v11: waves never carry the runner: a wave rolls down one telegraphed lane (jump it or change lane)
    if (b.gustT == null) b.gustT = b.t;
    laneHazard(b, dt, 'vWave', l => `🌊 Wave in the ${LANE_NAMES[l]} lane!`, 1.15, [2.6, 4.0]);
  } else if (B.id === 'chariots') {
    if (!b.warn && !qActive() && (b.t -= dt) <= 0) { const lane = Math.random() < 0.6 ? R.lane : pick([0, 1, 2]); b.warn = { lane, t: 1.3 }; laneWarn.position.z = -6; laneWarn.visible = true; laneWarn.position.x = LANES[lane]; g.textContent = `🐎 Chariot behind you! Leave the ${['left', 'middle', 'right'][lane]} lane!`; g.classList.add('show'); sfx.whoosh(); buzz(12); }
    if (b.warn) {
      laneWarn.material.opacity = 0.28 + 0.22 * Math.sin(S.t * 22);
      if ((b.warn.t -= dt) <= 0) { const c = chariotFree(); c.on = true; c.hit = false; c.nm = false; c.lane = b.warn.lane; c.v = 34; c.obj.visible = true; c.obj.position.set(LANES[c.lane], 0, 15); sfx.thunder(); shakeDOM(); b.warn = null; b.t = rand(1.5, 2.5); laneWarn.visible = false; g.classList.remove('show'); }
    }
  } else if (B.id === 'collapse') {
    R.shake = Math.max(R.shake, 0.08);
    if (!qActive() && (b.t -= dt) <= 0) {
      b.t = rand(1.2, 1.9); const l = Math.random() < 0.55 ? R.lane : pick([0, 1, 2]);
      if (!busyLane(l)) { const a = spawnObs('vDrop', l, -Math.max(36, R.speed * 1.45)); a.fallY = 17; a.obj.position.y = 17; a.blob = a.obj.children.find(c => c.material === blobMat); if (a.blob) a.blob.position.y = 0.03 - 17; }
      if (!b.told) { b.told = true; g.textContent = '⚠️ Watch the shadows: stones are falling!'; g.classList.add('show'); setTimeout(() => g.classList.remove('show'), 2200); }
    }
  }
  return false;
}
function finishVision() {
  const V = R.vis, b = bible(), rec = bookRec(b, V.id), WD = V.WD;
  const verseDone = V.vGot >= V.verse.parts.length, stars = BK.starsFor(V.right, V.gates.length, verseDone);
  const bonus = 150 + stars * 50; S.score += bonus; R.earn += 30 + stars * 15; addLantern(8);
  const pts = S.score - V.score0, first = !rec.done;
  rec.done = true; rec.stars = Math.max(rec.stars || 0, stars); rec.best = Math.max(rec.best || 0, pts);
  if (verseDone && !rec.v.includes(V.verse.ref)) {
    rec.v.push(V.verse.ref);
    const full = V.verse.text, list = myVerses().filter(x => x.ref !== V.verse.ref); list.unshift({ ref: V.verse.ref, text: full, ch: save.chapter, book: WD.name, at: new Date().toISOString().slice(0, 10) }); localStorage.setItem(VERSES_KEY, JSON.stringify(list));
  }
  bibleSave(b); dstat('vision', 1);
  const nextId = BK.PLAYABLE.find(id => BK.UNLOCK_AFTER[id] === V.id), unlocked = first && nextId ? BK.WORLDS[nextId].name : null;
  const res = { id: V.id, stars, pts, right: V.right, total: V.total, verseDone, verse: V.verse, unlocked, journey: V.journey, orbs: S.orbs - V.orbs0 };
  R.lastVision = res;
  for (let k = 0; k < 40; k++) fx.emit(R.px + rand(-3, 3), rand(0.5, 4), rand(-4, 0), rand(-3, 3), rand(1, 5), rand(-2, 2), 1.0, 0.6, pick(['#fff3a0', '#ffd23f', '#ffffff']), 0.5);
  if (V.journey) {
    leaveVisionWorld(); fadeFlash(); sfx.good();
    R.dist = Math.max(R.dist, stopDist(1) - readDist() - 90); R.stopIdx = 1; R.zone = -1; R.kmInt = Math.floor(KM(R.dist)); R.inv = 1.5; R.nextRow = 30; R.nextScrollD = R.dist + 80; R.nextPowerD = R.dist + 300;
    R.cp = snapCP(R.dist, 1, 'Berger'); R.visBook = null; save.visCh = save.chapter; persist();
    toast(`🌈 Vision complete! ${WD.name} ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} +${bonus}${unlocked ? ` · ${unlocked} unlocked on the Bible map` : ''} · back on the expressway near Berger`, 3600);
  } else {
    settleRunner(); S.paused = true; bankRun(false); V.finished = true; document.body.classList.add('vfin'); hideGateUI(); clearTimeout($('#bossCard')._t); $('#bossCard').classList.remove('show'); $('#gust').classList.remove('show'); showVisionResult(res);   // the vision world stays behind the results card
  }
}
function starsHTML(n, max = 3) { return `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(max - n)}</i></span>`; }
function showVisionResult(r) {
  const WD = BK.WORLDS[r.id], m = $('#modalBody');
  m.innerHTML = `<div class="banner vis vis-${r.id}"><div class="km">📖 ${esc(WD.name.toUpperCase())} · VISION COMPLETE</div><div class="name">${esc(WD.place)}</div></div>
    <div class="vstars">${starsHTML(r.stars)}</div>
    <div class="chips"><span class="chip">✨ ${r.pts} light</span><span class="chip">📖 ${r.right}/${r.total} questions</span><span class="chip">🪙 ${r.orbs} collected</span></div>
    ${r.verseDone ? `<div class="vmem"><div class="vt">📜 VERSE SAVED TO MY VERSES</div><div class="vx">“${esc(r.verse.text)}”</div><b>${esc(r.verse.ref)} (KJV)</b></div>` : `<p class="small">📜 Collect every scroll to save <b>${esc(r.verse.ref)}</b> to My Verses.</p>`}
    ${r.unlocked ? `<p class="unl">🔓 <b>${esc(r.unlocked)}</b> is now open on the Bible map!</p>` : ''}
    <p class="small">★ finish · ★★ two questions right · ★★★ all three right and the whole verse</p>
    <button class="btn primary" id="vrAgain">🔁 Play ${esc(WD.name)} again</button>
    <button class="btn" id="vrMap">📖 Bible map</button>
    <button class="btn ghost" id="vrHome">🏠 Main menu</button>`;
  show('modal'); m.scrollTop = 0;
  $('#vrAgain').onclick = () => { sfx.tap(); hide('modal'); startVisionRun(r.id); };
  $('#vrMap').onclick = () => { sfx.tap(); hide('modal'); enterTitle(); openBibleMap(); };
  $('#vrHome').onclick = () => { sfx.tap(); hide('modal'); enterTitle(); };
}
function startVisionRun(id) {
  ensureAudio(); hide('bible'); hide('title'); hide('modal');
  if (!save) { save = freshSave(); persist(); }
  buildPlayer();
  S.plan = { event: C.EVENTS[0], enc: [], quiz: C.GATE_Q.slice(0, 9), road: [], door: null, quest: null, verse: pickVerse(save.chapter), story: null };
  Object.assign(S, { score: 0, orbs: 0, hits: 0, quizRight: 0, quizTotal: 0, helpedRun: 0, virtues: {}, log: [], vGot: 0, verseDone: false });
  S.floor = 15; S.lantern = 60;
  setMoralNPC(null); startRun({ vision: id }); enterVision(id, false);
}
function restartVision() {
  const V = R.vis; if (!V) return; const id = V.id, j = V.journey;
  if (j) { restartFrom(R.cp); return; }   // the journey checkpoint is Ojota, right before the vision gate
  restartFrom(R.cp0); enterVision(id, false);
}
function leaveVisionEarly() {   // journey only: skip the vision and carry on along the expressway
  hide('modal'); leaveVisionWorld(); R.visSkip = true; R.dist = visPortalD() + 5; settleRunner(); R.inv = 2; R.nextRow = 30; S.paused = false; R.zone = -1;
  toast('🛣️ Back on the expressway. The vision gate will open again next chapter.', 2400);
}
function showFallenVision(cause) {
  const V = R.vis, v = pick(FALL_VERSES), m = $('#modalBody'), cost = 200;
  $('#toast').classList.remove('show');
  m.innerHTML = `<div class="banner dark"><div class="km">${esc(cause)}</div><div class="name">FALLEN IN THE VISION</div></div>
    ${verseHTML(v)}
    <div class="reach"><div class="rk">${esc(V.WD.name)}: <b>${Math.round(V.d / V.len * 100)}%</b> of the vision</div><div class="rbar"><i style="width:${(V.d / V.len * 100).toFixed(1)}%"></i></div></div>
    <div class="chips"><span class="chip">✨ ${S.score} light</span><span class="chip">📖 ${V.right}/${V.total} questions</span><span class="chip">📜 ${V.vGot}/${V.verse.parts.length} scrolls</span></div>
    ${!R.revived ? `<p class="small" style="margin:4px 0">You can <b>rise again</b> once:</p>
      <button class="btn green" id="riseQ">🙏 Rise again · answer a ${esc(V.WD.name)} question</button>
      <button class="btn primary" id="riseL" ${S.score < cost ? 'disabled' : ''}>✨ Rise again · spend ${cost} light${S.score < cost ? ' (not enough yet)' : ''}</button>` : '<p class="small">You have already risen once this run.</p>'}
    <button class="btn" id="rVis">🔁 Restart the vision</button>
    ${V.journey ? '<button class="btn ghost" id="rSkip">🛣️ Leave the vision · back to the expressway</button>' : '<button class="btn ghost" id="rMap">📖 Back to the Bible map</button>'}`;
  show('modal'); m.scrollTop = 0;
  if (!R.revived) {
    $('#riseQ').onclick = () => { sfx.tap(); riseQuestion(); };
    $('#riseL').onclick = () => { if (S.score < cost) return; S.score -= cost; sfx.good(); revive('✨ You spent 200 light and rose again!'); };
  }
  $('#rVis').onclick = () => { sfx.tap(); hide('modal'); R.revived = false; restartVision(); };
  if ($('#rSkip')) $('#rSkip').onclick = () => { sfx.tap(); leaveVisionEarly(); };
  if ($('#rMap')) $('#rMap').onclick = () => { sfx.tap(); hide('modal'); leaveVisionWorld(); enterTitle(); openBibleMap(); };
}
/* ---- the Bible map screen ---- */
function bibleTotals(b = bible()) { let stars = 0, done = 0; for (const id of BK.PLAYABLE) { const r = b.books[id]; if (r) { stars += r.stars || 0; if (r.done) done++; } } return { stars, done }; }
function openBibleMap() {
  ensureAudio(); const b = bible(), t = bibleTotals(b), el = $('#bibleBody');
  const tile = bk => {
    const play = BK.PLAYABLE.includes(bk.id), open = play && bookUnlocked(bk.id, b), r = b.books[bk.id];
    const cls = !play ? 'soon' : open ? 'play' + (r && r.done ? ' done' : '') : 'lock';
    const sub = !play ? 'Soon' : !open ? '🔒' : r && r.done ? starsHTML(r.stars) : 'Play ▶';
    return `<button class="btile ${cls}" data-id="${bk.id}" aria-label="${esc(bk.name)}"><i>${bk.icon}</i><b>${esc(bk.name)}</b><em>${sub}</em></button>`;
  };
  el.innerHTML = `<div class="bmhead"><h2>📖 The Bible Map</h2><button class="iconbtn bmx" id="bmClose" aria-label="Close">✕</button></div>
    <p class="small">66 books · enter a book through its <b>vision gate</b> · <b>${t.done}/${BK.PLAYABLE.length}</b> visions done · <b>${t.stars}/${BK.PLAYABLE.length * 3}</b> ★</p>
    <div class="bprog"><i style="width:${(t.done / 66 * 100).toFixed(1)}%"></i><span>${t.done}/66 books</span></div>
    ${BK.SECTIONS.map(([sid, name, icon]) => { const list = BK.BOOKS.filter(x => x.sec === sid); return `<h3 class="bsec">${icon} ${esc(name)} <small>${list.length}</small></h3><div class="bgrid">${list.map(tile).join('')}</div>`; }).join('')}
    <p class="small">Wave 1: Genesis, Exodus and Leviticus are open. More books arrive in later waves. Questions and verses are KJV.</p>
    <button class="btn ghost" id="bmClose2">Close</button>`;
  show('bible'); el.scrollTop = 0;
  const close = () => { sfx.tap(); hide('bible'); };
  $('#bmClose').onclick = close; $('#bmClose2').onclick = close;
  el.querySelectorAll('.btile').forEach(x => x.onclick = () => {
    sfx.tap(); const id = x.dataset.id, bk = BK.bookById(id);
    if (!BK.PLAYABLE.includes(id)) { toast(`📖 ${bk.name}: this vision arrives in a later wave`, 1800); return; }
    if (!bookUnlocked(id, b)) { toast(`🔒 Finish ${BK.WORLDS[BK.UNLOCK_AFTER[id]].name} to open ${bk.name}`, 2000); return; }
    openBookCard(id);
  });
}
function openBookCard(id) {
  const WD = BK.WORLDS[id], b = bible(), r = bookRec(b, id), el = $('#bibleBody'), qRight = WD.quiz.filter(q => r.q[q[0]]).length;
  el.innerHTML = `<div class="banner vis vis-${id}"><div class="km">${WD.icon} ${esc(WD.name.toUpperCase())} · VISION ${BK.PLAYABLE.indexOf(id) + 1}</div><div class="name">${esc(WD.place)}</div></div>
    <p class="btag">${esc(WD.tag)}</p>
    <div class="vstars">${starsHTML(r.stars || 0)}</div>
    <div class="chips"><span class="chip">🏆 Best ${r.best || 0}</span><span class="chip">📜 Verses ${r.v.length}/${WD.verses.length}</span><span class="chip">📖 Questions ${qRight}/${WD.quiz.length}</span><span class="chip">▶ Played ${r.plays || 0}</span></div>
    <div class="bboss"><span>${WD.boss.icon}</span><div><b>${esc(WD.boss.title)}</b><small>${esc(WD.boss.sub)}</small></div></div>
    <button class="btn primary" id="bkGo">▶ Enter the vision</button>
    <h3>📜 Verses from ${esc(WD.name)}</h3>
    ${WD.verses.map(v => r.v.includes(v.ref) ? `<div class="verse">“${esc(v.text)}”<b>${esc(v.ref)} (KJV)</b></div>` : `<div class="verse locked">🔒 ${esc(v.ref)} · collect its scrolls in the vision</div>`).join('')}
    <button class="btn ghost" id="bkBack">← Bible map</button>`;
  el.scrollTop = 0;
  $('#bkGo').onclick = () => { sfx.good(); startVisionRun(id); };
  $('#bkBack').onclick = () => { sfx.tap(); openBibleMap(); };
}
function updateRun(dt) {
  const ch = save.chapter, ev = R.ev, V = R.vis;
  R.t += dt;
  if (R.stumble > 0) R.stumble -= dt;
  if (R.forceDark) R.dark = Math.max(R.dark, R.forceDark);   // test hook (LR.dark): night-like darkness
  if (R.burst > 0) R.burst -= dt;
  R.qk = (R.qk || 0) + ((qActive() ? 1 : 0) - (R.qk || 0)) * Math.min(1, dt * 1.5);   // v11: ease off ~14% while reading (never a stop)
  R.speed = (1 - 0.14 * R.qk) * Math.min(92, (V ? visSpeed() : runSpeed()) * (R.stumble > 0 ? 1 - 0.5 * (R.stumble / 0.9) : 1) * Math.min(1.38, (R.fire > 0 ? 1.3 : 1) * (R.burst > 0 ? 1.25 : 1)));
  if (AUTO) autoSteer(dt);
  if (FAIR_CHECK && (R.fairT = (R.fairT || 0) - dt) <= 0) { R.fairT = 0.25; fairScan(); }
  updatePowers(dt);
  const move = R.speed * dt; if (V) V.d += move; else R.dist += move;
  const km = KM(R.dist);
  if (V) { V.W.move(move, dt, S.t, fx, V.bossK); if (visBoss(dt, move)) return; }
  else { moveProps(move); updateZoneFX(dt, km); updateBoss(dt); }
  if (!V) for (const v of oncoming) { v.position.z += move + 18 * dt; if (v.position.z > 30) { v.position.z = -300 - rand(0, 60); v.position.x = Math.random() < 0.5 ? -10.6 : -15.2; } v.visible = v.position.z > -(scene.fog.far + 8); }
  // critically damped spring toward the target lane: smooth, frame-rate independent, no snapping
  { const w = 30, T = LANES[R.lane]; R.pv = (R.pv || 0) + (w * w * (T - R.px) - 2 * w * (R.pv || 0)) * dt; R.px += R.pv * dt; if (Math.abs(T - R.px) < 0.002 && Math.abs(R.pv) < 0.02) { R.px = T; R.pv = 0; } }
  // vertical: jumps, ramps, roofs, rails
  const [gy, surfA] = groundAt(R.px);
  if (R.wings > 0) { R.py += (3.6 - R.py) * Math.min(1, dt * 5); R.vy = 0; R.onGround = false; R.coyote = 0; R.sl = 0; }   // v10: angel wings: glide above everything
  else {
  if (R.onGround) {
    if (gy <= R.py + 1.25 && gy >= R.py - 0.08) R.py = gy;
    else if (gy < R.py - 0.08) {
      R.onGround = false; R.coyote = 0.09;
      if (R.surfA && R.surfA.launch) { act('ramp'); R.vy = 17; R.g = 50; R.burst = 2.2; R.coyote = 0; const p = 30 * comboMult(); S.score += p; addCombo(3); popText(`🚀 Okada ramp boost! +${p}`, 'big'); sfx.power(); for (let k = 0; k < 18; k++) fx.emit(R.px + rand(-0.6, 0.6), R.py, 0.5, rand(-2, 2), rand(0, 2), rand(1, 4), 0.5, 0.6, '#ffb74d', 1); }
      else R.vy = 0;
    }
  }
  if (!R.onGround) {
    R.vy -= R.g * dt; R.py += R.vy * dt; if (R.coyote > 0) R.coyote -= dt;
    if (R.vy <= 0 && R.py <= gy && (R.py >= gy - 0.6 || gy < 0.01)) {
      R.py = gy; R.onGround = true; R.vy = 0;
      if (gy < 0.3) for (let i = 0; i < 8; i++) fx.emit(R.px + rand(-0.3, 0.3), gy + 0.15, rand(-0.2, 0.4), rand(-2, 2), rand(0.3, 1), rand(-1, 1), 0.6, 0.7, '#e2c39a', 2);
      if (R.jbuf > 0) runJump(); else if (R.sbuf > 0) { R.sbuf = 0; R.sl = slideT(); sfx.whoosh(); }
    } else if (R.py < 0) { R.py = 0; R.vy = 0; R.onGround = true; }
  }
  }
  R.surfA = R.onGround ? surfA : null;
  if (R.jbuf > 0) R.jbuf -= dt; if (R.sbuf > 0) R.sbuf -= dt; if (R.sl > 0) R.sl -= dt;
  const onTop = R.onGround && surfA && R.py > 0.5 ? surfA : null;
  if (onTop && onTop.grind) {
    if (!R.grind) startGrind(); R.grindRun += move; R.grindM += move;
    if ((R.grindPts = (R.grindPts || 0) + move) > 6) { R.grindPts = 0; S.score += 4 * comboMult(); }
    for (let k = 0; k < 2; k++) fx.emit(R.px + rand(-0.2, 0.2), R.py + 0.05, 0.3, rand(-2.5, 2.5), rand(1, 3), rand(1, 4), 0.25, 0.18, pick(['#ffd54f', '#ff9800', '#ffffff']), 0.2);
  } else if (R.grind) endGrind();
  if (onTop && onTop.surf > 1.5 && !onTop.roofed) { onTop.roofed = true; R.roofs++; const p = 25 * comboMult(); S.score += p; addCombo(2); popText(`🚐 Roof run! +${p}`); dstat('roofs'); }
  if (R.inv > 0) R.inv -= dt; if (R.shake > 0) R.shake -= dt;
  player.root.position.set(R.px, R.py, 0);
  player.root.rotation.z = clamp(-(R.pv || 0) * 0.016, -0.28, 0.28);   // lean into the lane change
  player.root.visible = !(R.inv > 0 && R.fire <= 0 && Math.floor(S.t * 14) % 2 === 0);
  const animS = Math.min(2.3, 0.75 + R.speed / 38);
  if (R.sl > 0) poseHuman(player, 'slide', dt);
  else if (R.grind) { poseHuman(player, 'idle', dt); player.L.sh.rotation.z = 1.25; player.R.sh.rotation.z = -1.25; player.spine.rotation.x = 0.15; }
  else poseHuman(player, !R.onGround ? 'jump' : 'run', dt, animS);
  player.root.rotation.y = Math.PI + (R.grind ? 0.9 : clamp(-(R.pv || 0) * 0.012, -0.22, 0.22));
  if (R.stumble > 0.4) player.root.rotation.x = Math.sin((0.9 - R.stumble) * 9) * 0.35; else player.root.rotation.x = 0;
  R.dustT -= dt; if (R.dustT <= 0 && R.onGround && !R.grind && R.py < 0.3) { R.dustT = 0.05; fx.emit(R.px + rand(-0.2, 0.2), R.py + 0.12, 0.35, rand(-0.6, 0.6), rand(0.4, 1.0), rand(0.5, 1.5), 0.55, 0.45, '#e6c9a0', 2.2); }
  emitTrails(dt);
  if (ev.mod.rain && !V) for (let i = 0; i < 3; i++) fx.emit(R.px + rand(-14, 14), rand(8, 14), rand(-30, 4), 0, -26, 0, 0.5, 0.18, '#cfe8ff', 0);
  const nextStop = stopDist(R.stopIdx), moral = V ? null : S.plan.road[R.moralIdx];
  const moralD = moral ? moralDist(R.moralIdx) : Infinity;
  R.nextRow -= move;
  if (V && R.nextRow <= 0) {
    const arrive = V.d - SPAWN_Z, gz = visGateZone(arrive), quiet = gz === 2 || arrive > V.len - 50 || V.d < 30;
    let depth = 0;
    if (!quiet) depth = visionRow(gz === 1);
    else if (arrive < V.len - 50 && Math.random() < 0.5) { const l = Math.floor(Math.random() * 3); for (let k = 0; k < 4; k++) spawnOrb(LANES[l], 1.0, SPAWN_Z - k * 2.6); }
    R.nextRow = depth + Math.max(16, R.speed * (V.boss ? 0.72 : 0.9)) + rand(0, 6);
  } else if (R.nextRow <= 0) {
    const arrive = R.dist - SPAWN_Z, gz = gateZone(arrive);
    const quiet = gz === 2 || (arrive > moralD - 45 && arrive < moralD + 8) || arrive > RUN_LEN - 40;
    let depth = 0;
    if (!quiet) { depth = spawnRow(gz === 1);
      // v9: the first ~2.5 km get extra light trails in a free lane so the opening never feels empty
      if (KM(R.dist) < 2.5 && Math.random() < 0.6) { const fl = freeLanes(); if (fl.length) { const x = LANES[fl[0]], n = 4 + (Math.random() * 3 | 0); for (let k = 0; k < n; k++) spawnOrb(x, 1.0, SPAWN_Z - depth - 6 - k * 2.6); } }
    }
    else if (arrive < RUN_LEN - 40 && Math.random() < 0.5) { const l = Math.floor(Math.random() * 3); for (let k = 0; k < 4; k++) spawnOrb(LANES[l], 1.0, SPAWN_Z - k * 2.6); }
    R.nextRow = depth + (R.tightGap ? rand(3, 6) : rowGap() + rand(0, 6)); R.tightGap = false;
  }
  const px = R.px;
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i]; a.obj.position.z += move * a.rel;
    if (a.type === 'okada') a.obj.position.x = LANES[a.lane] + Math.sin(S.t * 2 + i) * 0.25;
    if (a.cross) { a.obj.position.x += a.vx * dt; if (Math.abs(a.obj.position.x) > 4.0) { a.vx *= -1; a.obj.position.x = clamp(a.obj.position.x, -4, 4); } a.lane = clamp(Math.round(a.obj.position.x / 3.2) + 1, 0, 2); a.obj.rotation.y = a.vx > 0 ? Math.PI / 2 : -Math.PI / 2; poseHuman(a.obj.userData.human, 'carry', dt, 1.2); }
    else if (a.type === 'hawker') poseHuman(a.obj.userData.human, 'carry', dt, 0.6);
    if (a.drop && a.obj.position.z > -60) { const b = a.obj.userData.bar; if (b.position.y > 1.55) { a.dropV += 30 * dt; b.position.y = Math.max(1.55, b.position.y - a.dropV * dt); if (b.position.y === 1.55) { a.drop = false; if (Math.abs(a.obj.position.z) < 60) { sfx.hit(); for (let k = 0; k < 8; k++) fx.emit(a.obj.position.x + rand(-1, 1), 1.5, a.obj.position.z, rand(-2, 2), rand(1, 3), 0, 0.5, 0.5, '#cfd8dc', 1); } } } }
    if (a.obj.userData.exhaust && (a.ex -= dt) <= 0) { a.ex = 0.07; const e = a.obj.userData.exhaust; fx.emit(a.obj.position.x + e[0], e[1], a.obj.position.z + e[2], rand(-0.3, 0.3), rand(0.6, 1.2), 1.5, 0.9, 0.55, '#8d8d8d', 2.5); }
    if (a.fallY > 0) { a.fallY = Math.max(0, a.fallY - 26 * dt); a.obj.position.y = a.fallY; if (a.blob) a.blob.position.y = 0.03 - a.fallY; if (!a.fallY) { R.shake = Math.max(R.shake, 0.3); sfx.hit(); for (let k = 0; k < 14; k++) fx.emit(a.obj.position.x + rand(-1, 1), 0.3, a.obj.position.z + rand(-1, 1), rand(-3, 3), rand(0.5, 2.5), rand(-2, 2), 0.9, 0.9, '#d8b585', 2.4); } }
    if (a.fly) { a.obj.position.y += a.fly * dt; a.fly -= 22 * dt; a.obj.rotation.x += dt * 7; a.obj.position.x += a.fx * dt; if (a.obj.position.y < -3) a.obj.position.z = 99; }
    const z = a.obj.position.z, dx = a.wide ? 0 : Math.abs(a.obj.position.x - px);
    if (!a.hit && !(a.fallY > 1.2) && Math.abs(z) < a.len / 2 + 0.45 && dx < 1.4) {
      let blocked;
      if (a.slide) blocked = !(R.sl > 0) && R.py < a.over && !(a.drop && a.obj.userData.bar.position.y > 3.5);
      else if (a.surf) blocked = R.py < a.surf - 0.9;
      else blocked = !(a.jump && R.py > 0.6) && R.py < 1.6;
      if (blocked && (R.inv <= 0 || R.fire > 0)) { a.hit = true; if (onHit(a)) return; }
      else if (a.slide && R.sl > 0 && !a.slid) { a.slid = true; R.slides++; dstat('slides'); nearMiss('🛝 Slid under!', 12); }
    }
    if (!a.hit && !a.nm && z > -0.3 && z < a.len / 2 + 0.6) {
      if (!a.wide && !a.slide && !a.surf && R.t - (R.moveT || -9) < 0.45 && dx > 1.6 && dx < 3.9 && R.py < 0.8) { a.nm = true; nearMiss('⚡ Last-second dodge!', 25, true); }   // v9: dodged at the last moment
      else if (a.big && !a.parked && dx > 1.6 && dx < 3.9 && R.py < 0.8) { a.nm = true; nearMiss('😮 Close one!', 15); }
      else if (a.jump && dx < 1.4 && R.py > 0.6) { a.nm = true; nearMiss('🦘 Leap of faith!', 10); }
    }
    if (z > 22 + a.len / 2) { RW.remove(a.obj); freeObs[a.key].push(a.obj); active.splice(i, 1); }
  }
  let hi = 0; const lampMode = !!(V && V.W.lamps);
  orbs.forEach((o, i) => {
    if (o.on) {
      o.z += move;
      if (R.magnet > 0 && o.z > -24 && o.z < 0.5) { o.x += (px - o.x) * Math.min(1, dt * 8); o.y += (R.py + 1 - o.y) * Math.min(1, dt * 8); }
      if (Math.abs(o.z) < 1.0 + move && Math.abs(o.x - px) < 1.3 && Math.abs(o.y - (R.py + 1.0)) < 1.4) {
        o.on = false; S.orbs++; R.earn++; addCombo(1); S.score += 10 * comboMult(); addLantern(1.2); sfx.orb(); scorePop(); setExpression(player, 'happy', 0.6);
        if (++R.orbBuf >= 10) { dstat('orbs', R.orbBuf); R.orbBuf = 0; }
        for (let k = 0; k < 6; k++) fx.emit(o.x, o.y, o.z, rand(-2, 2), rand(0, 3), rand(-1, 1), 0.5, 0.35, '#fff3a0', 0.5);
      }
      if (o.z > 15) o.on = false;
    }
    const s = o.on ? 1 + Math.sin(S.t * 6 + i) * 0.1 : 0;
    _q.setFromAxisAngle(_up, S.t * 2 + i); _mtx.compose(_pv.set(o.x, o.y + Math.sin(S.t * 4 + i) * 0.12, o.z), _q, _sv.setScalar(s));
    if (lampMode) { const coin = i % 3 === 0; lampMesh.setMatrixAt(i, coin ? _zeroM : _mtx); coinMesh.setMatrixAt(i, coin ? _mtx : _zeroM); } else orbMesh.setMatrixAt(i, _mtx);
    if (o.on && hi < halos.n - 1 && o.z > -90) { halos.pos.set([o.x, o.y, o.z], hi * 3); halos.col.set([1, 0.82, 0.3], hi * 3); halos.size[hi] = 2.8; halos.alpha[hi] = 0.85; hi++; }
  });
  if (lampMode) lampMesh.instanceMatrix.needsUpdate = coinMesh.instanceMatrix.needsUpdate = true; else orbMesh.instanceMatrix.needsUpdate = true;
  // verse scrolls (v10: a vision collects a verse from its own book)
  const VS = V || R, vdist = V ? V.d : R.dist, vp = V ? V.verse.parts : S.plan.verse.parts;
  if (VS.vGot < vp.length && vdist >= VS.nextScrollD && !(V ? visGateZone(vdist - SPAWN_Z) || V.boss || vdist - SPAWN_Z > V.len - 80 : inGateZone(R.dist - SPAWN_Z) || R.boss || R.dist - SPAWN_Z >= RUN_LEN - 60)) {
    const sc = scrolls.find(s => !s.on);
    const lanes = shuffle([0, 1, 2]).filter(l => !active.some(a => (a.wide || a.lane === l) && Math.abs(a.obj.position.z - SPAWN_Z) < 14 + a.len / 2));
    if (sc && lanes.length) { sc.on = true; sc.lane = lanes[0]; sc.obj.visible = true; sc.obj.position.set(LANES[sc.lane], 1.3, SPAWN_Z); VS.nextScrollD = vdist + VS.scrollGap; }
    else VS.nextScrollD = vdist + 8;
  }
  for (const sc of scrolls) {
    if (!sc.on) continue;
    sc.obj.position.z += move; if (R.magnet > 0 && sc.obj.position.z > -24) sc.obj.position.x += (px - sc.obj.position.x) * Math.min(1, dt * 6); sc.obj.rotation.y = Math.sin(S.t * 2) * 0.5; sc.obj.position.y = 1.3 + Math.sin(S.t * 4) * 0.15;
    if (hi < halos.n - 1) { halos.pos.set([sc.obj.position.x, sc.obj.position.y, sc.obj.position.z], hi * 3); halos.col.set([1, 0.95, 0.6], hi * 3); halos.size[hi] = 3.4; halos.alpha[hi] = 0.9; hi++; }
    if (Math.abs(sc.obj.position.z) < 1.2 + move && Math.abs(sc.obj.position.x - px) < 1.4 && Math.abs(R.py + 0.9 - sc.obj.position.y) < 1.8) {
      sc.on = false; sc.obj.visible = false; VS.vGot++; S.score += 25; addLantern(2); sfx.orb(); setTimeout(() => sfx.orb(), 90); dstat('scrolls');
      for (let k = 0; k < 16; k++) fx.emit(sc.obj.position.x, 1.3, 0, rand(-2.5, 2.5), rand(0, 3.5), rand(-1, 1), 0.7, 0.45, '#fff1a8', 0.5);
      verseHUD(true);
      if (VS.vGot >= vp.length) { sfx.good(); toast(V ? `📜 Verse complete! ${V.verse.ref} · saved to your Bible map` : `📜 Verse complete! ${S.plan.verse.ref} · bonus light at the camp gate`, 2600); }
    }
    if (sc.obj.position.z > 15) { sc.on = false; sc.obj.visible = false; }
  }
  lanternHalo(hi);
  // answer gates
  const NG = C.STOPS.length - 1;
  if (V) visGates(dt);
  else if (R.stopIdx < NG) {
    const gi = R.stopIdx;
    if (!R.gate || R.gate.idx !== gi) R.gate = prepGate(gi);
    const g = R.gate, gd = gateDist(gi) - R.dist, rd = readDist();
    answerGate.visible = gd < rd + 60 && gd > -1.5; answerGate.position.z = -gd;
    if (!g.called && gd < rd + 40) { g.called = true; toast(`🚌 “${C.STOPS[gi].replace(/ \(.*\)/, '')}! ${C.STOPS[gi].replace(/ \(.*\)/, '')}! Enter with your change!”`, 1800); }
    if (!g.shown && gd < rd) { g.shown = true; showGateQ(g); clearForQuestion(); }
    gateLanes.forEach((L, i) => { if (!g.done) L.curtain.material.opacity = 0.26 + 0.12 * Math.sin(S.t * 5 + i); else if (i === g.correctLane) L.curtain.material.opacity = 0.45 + 0.3 * Math.sin(S.t * 14); });
    if (!g.done && gd <= 0) judgeGate(g);
    if (g.shown && !g.done) placeGateLabels();
  } else answerGate.visible = false;
  if (R.signFlash) { R.signFlash.t -= dt; const k = Math.max(0, R.signFlash.t) / 1.2, on = Math.floor(R.signFlash.t * 8) % 2 === 0; R.signFlash.mat.color.setRGB(1 + (on ? 0.9 : 0.2) * k, 1 + (on ? 0.9 : 0.2) * k, 1 + (on ? 0.1 : 0) * k); if (R.signFlash.t <= 0) { R.signFlash.mat.color.setRGB(1, 1, 1); R.signFlash = null; } }
  if (R.flash > 0) R.flash -= dt;
  if (R.zoneMsg && R.zoneMsg.t > 0) R.zoneMsg.t -= dt;
  if (!V) for (let k = 0; k < 2; k++) {
    const idx = R.stopIdx + k; const b = bridges[idx % 2];
    if (idx < C.STOPS.length - 1) { b.visible = stopDist(idx) - R.dist < 340; b.position.z = -(stopDist(idx) - R.dist) - 2; if (b.userData.idx !== idx) { setBridgeSign(b, C.STOPS[idx], C.STOP_REGION[idx] + ' · KM ' + C.STOP_KM[idx]); b.userData.idx = idx; } }
    else b.visible = false;
  }
  if (!V) { roadGate.visible = RUN_LEN - R.dist < 300; roadGate.position.z = -(RUN_LEN - R.dist) - 2; journeyPortal(dt); }
  if (moralNPC && moral) { moralNPC.root.position.z = -(moralD - R.dist); moralNPC.root.rotation.y = 0; poseHuman(moralNPC, 'wave', dt); moralNPC.mark.position.y = moralNPC.topY + 0.9 + Math.sin(S.t * 6) * 0.15; }
  const prog = V ? clamp(V.d / V.len, 0, 1) : clamp(R.dist / RUN_LEN, 0, 1);
  if (V) visSky(dt);
  else {
  // sky: day → evening → dusk along the journey, storm on Long Bridge
  const stormK = R.boss && R.boss.id === 'storm' ? 1 : 0; R.stormK = (R.stormK || 0) + (stormK - (R.stormK || 0)) * Math.min(1, dt * 1.5);
  PRESETS._base = prog < 0.6 ? blendPreset('day', 'evening', clamp((prog - 0.25) / 0.35, 0, 1)) : blendPreset('evening', 'dusk', clamp((prog - 0.6) / 0.4, 0, 1));
  setSky('_base', 'storm', R.stormK, ev.mod.fog * (1 + R.stormK * 0.6));
  if (R.stormK > 0.01 || R.cloudTint) { R.cloudTint = R.stormK > 0.01; const c = 1 - R.stormK * 0.62; clouds.children.forEach(o => o.material.color.setRGB(c, c, c * 1.05)); }
  lanternLight.intensity = Math.max(prog, R.stormK) * 2.2 * S.lantern / 100;
  }
  const sh = R.shake > 0 && !SET.reduceMotion ? R.shake * 0.6 : 0;
  R.camX += (R.px - R.camX) * (1 - Math.exp(-11 * dt));   // camera X has its own lag
  R.camH = lerp(R.camH || 0, Math.max(0, R.py), Math.min(1, dt * 6));
  const camY = 3.3 + R.camH * 0.95 - (R.sl > 0 ? 0.35 : 0);
  camera.position.set(R.camX + rand(-sh, sh), camY + rand(-sh, sh), 7.6 + R.camH * 0.5 + Math.min(1.2, Math.max(0, R.speed - 30) * 0.03));
  camera.lookAt(R.camX, 1.25 + R.py * 0.45, -9);
  if (window.__camDbg) { const c = window.__camDbg; camera.position.set(c[0], c[1], c[2]); camera.lookAt(c[3], c[4], c[5]); }
  // during a roadside bottom sheet, slide the view up so the runner stays visible above it

  if (R.kick > 0) R.kick = Math.max(0, R.kick - dt * 9);
  const tf = (R.fire > 0 || R.burst > 0 ? 76 : 62 + clamp((R.speed - 22) * 0.22, 0, 11)) + (R.kick || 0);
  if (Math.abs(camera.fov - tf) > 0.05) { camera.fov += (tf - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  speedFX(dt);
  sunFollow(R.px, 0);
  fx.update(dt, R.speed, 0);
  if (V) { if (V.d >= V.len) finishVision(); else hud(prog); return; }
  if (moral && R.dist >= moralD - 1 && !R.boss && !bossWindow(R.dist) && !qActive() && !inGateZone(R.dist + 40)) {
    R.moralIdx++; clearObs(a => a.obj.position.z > -45); settleRunner();
    openDialog(moral, true, () => { R.inv = 1.2; setMoralNPC(S.plan.road[R.moralIdx]); });
    return;
  }
  if (R.dist >= nextStop) {
    const idx = R.stopIdx; R.stopIdx++; sfx.stop();
    if (idx >= C.STOPS.length - 1) { clearObs(a => a.obj.position.z > -50); arriveGate(); return; }
    passStop(idx);
  }
  hud(prog);
}
function lanternHalo(start) {
  let hi = start;
  halos.mat.depthTest = S.mode !== 'camp'; // v8: camp camera looks down, so the ground used to slice the lantern glow into a hard-edged square
  if (player && lantern) {
    lantern.getWorldPosition(_pv);
    halos.pos.set([_pv.x, _pv.y, _pv.z], hi * 3); halos.col.set([1, 0.8, 0.35], hi * 3); halos.size[hi] = 1.2 + S.lantern / 40; halos.alpha[hi] = 0.9; hi++;
  }
  for (let i = hi; i < halos.n; i++) halos.alpha[i] = 0;
  const a = halos.geo.attributes; a.position.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = a.color.needsUpdate = true;
}
const _sd = new THREE.Vector3();
function sunFollow(x, z) {
  _sd.copy(sunDisc.position).normalize();
  sun.position.set(x + _sd.x * 30 + 8, Math.max(14, _sd.y * 60 + 14), z + _sd.z * 30 + 14); sun.target.position.set(x, 0, z - 4);
}

/* ---- HUD ---- */
let hudT = 0;
function hudMode(m) { document.body.classList.toggle('inrun', m === 'run'); document.body.classList.remove('vfin'); el$('btnPause').classList.toggle('hidden', m !== 'run' && m !== 'camp'); if (nameTag) nameTag.visible = m !== 'run'; if (m !== 'run') { document.body.classList.remove('boss-storm', 'boss-goslow', 'boss-market'); ['zoneCard', 'bossCard', 'gust'].forEach(id => $('#' + id).classList.remove('show')); $('#hBoss').className = 'hidden'; } if (m !== 'run') { setOp(el$('darkV'), 0); setOp(el$('speedLines'), 0); $('#hCombo').classList.add('hidden'); $('#hPow').classList.add('hidden'); shieldBubble.visible = false; if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); } } $('#hud').classList.toggle('hidden', !m); $('#prompt').classList.add('hidden'); $('#hVerse').classList.toggle('hidden', m !== 'run'); hideGateUI(); }
function hud(prog, info) {
  if ((hudT -= 1) > 0) return; hudT = 6;
  setTxt(el$('hScore'), String(S.score)); setTxt(el$('hCoins'), String(S.orbs)); setW(el$('hLant'), S.lantern); setL(el$('hFloor'), S.floor);
  if (S.mode === 'run' && R.vis) {
    const V = R.vis, zm = R.zoneMsg && R.zoneMsg.t > 0 ? R.zoneMsg.txt : null;
    setTxt(el$('hInfo'), zm || `📖 ${V.WD.name} · ${V.boss ? V.WD.boss.icon + ' ' + V.WD.boss.title.toLowerCase().replace(/^the /, '') : V.gi < V.gates.length ? `❓ ${V.gi + 1}/${V.gates.length}` : '✨ exit ahead'} · ${Math.round(R.speed * 3.6)} km/h`);
  } else if (S.mode === 'run') {
    const i = Math.min(R.stopIdx, C.STOPS.length - 1);
    const km = KM(R.dist);
    const zm = R.zoneMsg && R.zoneMsg.t > 0 && !(R.flash > 0) ? R.zoneMsg.txt : null;
    setTxt(el$('hInfo'), zm ? zm : R.flash > 0 ? `📍 ${C.STOPS[R.stopIdx - 1]} ✓ · ${Math.round(R.speed * 3.6)} km/h` : `➜ ${C.STOPS[i].replace(/ \(.*\)/, '')} ${Math.max(0, C.STOP_KM[i] - km).toFixed(1)} km${R.combo >= 3 && (R.fire > 0 || R.magnet > 0 || R.shield) ? '' : ` · ${Math.round(R.speed * 3.6)} km/h`}` /* v8: shorter so it never truncates beside combo/power chips (the map strip shows total KM) */);
    const fl = R.flash > 0 || !!zm; if (el$('hInfo')._fl !== fl) { el$('hInfo')._fl = fl; el$('hInfo').classList.toggle('flash', fl); }
    const pc = km / C.TOTAL_KM * 100; setL(el$('mapMe'), pc); setW(el$('mapFill'), pc);
  } else if (info) setTxt(el$('hInfo'), info);
  setW(el$('hProg'), prog * 100);
}
function setTxt(el, t) { if (el._t !== t) { el._t = t; el.textContent = t; } }
function setW(el, pc) { const v = pc.toFixed(1); if (el._w !== v) { el._w = v; el.style.width = v + '%'; } }
function setL(el, pc) { const v = pc.toFixed(1); if (el._l !== v) { el._l = v; el.style.left = v + '%'; } }
function buildMap() {
  const st = $('#mapStops'); if (!st.dataset.built) {
    st.dataset.built = 1;
    const seg = Object.values(C.BOSSES).map(B => `<s class="bseg" style="left:${B.km0 / C.TOTAL_KM * 100}%;width:${(B.km1 - B.km0) / C.TOTAL_KM * 100}%"></s>`).join('');
    st.innerHTML = seg + C.STOP_KM.map((k, i) => `<span class="mst ${i % 2 ? 'dn' : 'up'}${i === C.STOP_KM.length - 1 ? ' end' : ''}" style="left:${k / C.TOTAL_KM * 100}%"><i></i><em>${esc(C.MAP_LABELS[i])}</em></span>`).join('');
  }
  const b = M.bestKm(); $('#mapBest').style.left = (b / C.TOTAL_KM * 100) + '%'; $('#mapBest').classList.toggle('hidden', b < 0.5);
}

/* ---- quiz, gate ---- */
function settleRunner() {
  if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); } player.root.rotation.x = 0;
  if (R.grind) endGrind(); R.vy = 0; R.onGround = true; R.sl = 0; R.jbuf = 0; R.sbuf = 0; R.py = 0; R.px = LANES[R.lane]; R.pv = 0; R.camX = R.px; R.inv = 0;
  player.root.position.set(R.px, 0, 0); player.root.rotation.z = 0; player.root.visible = true; poseHuman(player, 'idle', 0.016);
  // lift the view so the runner sits above the dialog sheet while paused
  camera.position.set(R.camX, 3.0, 7.6); camera.lookAt(R.camX, -1.9, -9);
}
const comboMult = () => 1 + Math.min(4, Math.floor(R.combo / 8));
const COMBO_MILES = [[10, 'Faithful!'], [25, 'Steadfast!'], [50, 'More than a conqueror!'], [100, 'Hallelujah!'], [200, 'Unstoppable grace!']];
function comboMilestone(m, word, mult) {   // v9: celebrate combo milestones (bonus, burst, FOV kick, haptic)
  const bonus = m * 5; S.score += bonus; addLantern(2); R.kick = SET.reduceMotion ? 0 : 7; buzz([10, 40, 18]); sfx.power(); scorePop();
  popText(`🎉 ${m} combo · ${word} +${bonus}${mult ? ` · x${mult}` : ''}`, 'big');
  for (let k = 0; k < 30; k++) fx.emit(R.px, 1.4, 0, rand(-5, 5), rand(1, 6), rand(-4, 2), 0.8, 0.55, pick(['#ffd23f', '#fff3a0', '#ff8a3d']), 0.6);
  const el = $('#hCombo'); el.classList.remove('mile'); void el.offsetWidth; el.classList.add('mile');
}
function addCombo(n) {
  const before = comboMult(), c0 = R.combo; R.combo += n; R.comboT = 2.8;
  let mile = false; for (const [m, w] of COMBO_MILES) if (c0 < m && R.combo >= m) { comboMilestone(m, w, comboMult() > before ? comboMult() : 0); mile = true; }
  if (comboMult() > before && mile) { sfx.stop(); if (comboMult() >= 4) dstat('combo4', 1, 'max'); }
  else if (comboMult() > before) { popText(`🔥 Combo x${comboMult()}!`, 'big'); sfx.stop(); if (comboMult() >= 4) dstat('combo4', 1, 'max'); }
  comboHUD();
}
function loseCombo() { if (R.combo >= 8) popText('Combo lost', 'dim'); R.combo = 0; R.comboT = 0; comboHUD(); }
function comboHUD() { const el = $('#hCombo'); if (R.combo >= 3) { el.classList.remove('hidden'); el.textContent = `x${comboMult()} · ${R.combo}`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } else el.classList.add('hidden'); }
function nearMiss(txt, pts, big) { const p = pts * comboMult(); S.score += p; addCombo(2); addLantern(0.5); popText(`${txt} +${p}`, big ? 'big' : ''); sfx.whoosh(); scorePop(); buzz(big ? 14 : 6); R.nearN = (R.nearN || 0) + 1; }
function popText(txt, cls = '') {
  const el = document.createElement('div'); el.className = 'popt ' + cls; el.textContent = txt;
  el.style.left = (50 + rand(-18, 18)) + '%'; $('#pops').appendChild(el); if ($('#pops').children.length > 3) $('#pops').firstElementChild.remove(); setTimeout(() => el.remove(), 1100);
}
function scorePop() { const el = $('#hScore'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function shakeDOM(big) { if (SET.reduceMotion) return; const c = $('#c3d'); c.classList.remove('shake', 'shake2'); void c.offsetWidth; c.classList.add(big ? 'shake2' : 'shake'); }
function snapCP(dist, stopIdx, name) { return { dist, stopIdx, name, vGot: R.vGot, S: { score: S.score, orbs: S.orbs, quizRight: S.quizRight, quizTotal: S.quizTotal, lantern: S.lantern, hits: S.hits } }; }
function knock(a) { a.fly = 9; a.fx = (a.obj.position.x - R.px >= 0 ? 1 : -1) * 6; }
const BIG_NAMES = { ...VW.VOBS_NAMES, danfo: 'A danfo no gree brake!', truck: 'Trailer wahala!', okada: 'An okada swerved into you!', danfoP: 'You ran into a parked danfo!', danfoR: 'You missed the ramp and hit the danfo!', truckP: 'A stalled trailer blocked the way!', truckR: 'You missed the ramp and hit the trailer!' };
function onHit(a) {
  if (R.god) return false;   // test hook (LR.god)
  const big = !!a.big;
  if (R.fire > 0) { knock(a); S.score += 20; popText('🔥 Smashed through! +20'); sfx.hit(); for (let k = 0; k < 14; k++) fx.emit(R.px + rand(-1, 1), rand(0.5, 2), -1, rand(-4, 4), rand(1, 4), rand(-3, 0), 0.6, 0.7, '#ff8a3d', 1); return false; }
  setExpression(player, 'ouch', 0.9);
  if (R.shield) {
    R.shield = false; R.inv = 1.2; knock(a); sfx.shield(); shakeDOM();
    for (let k = 0; k < 22; k++) fx.emit(R.px, 1.2, 0, rand(-4, 4), rand(-1, 4), rand(-3, 3), 0.6, 0.6, '#9be7ff', 0.5);
    popText('🛡️ The Shield of Faith held!', 'big'); powerHUD(); return false;
  }
  for (let k = 0; k < 16; k++) fx.emit(R.px + rand(-0.6, 0.6), rand(0.3, 1.5), rand(-0.5, 0.5), rand(-3, 3), rand(1, 3), rand(-2, 2), 0.7, 0.8, '#d9b38c', 2);
  buzz(big ? 45 : 22);
  const gentle = isGentle();
  if (big && gentle) {   // v9: early on, a danfo/truck knock is a hard stumble, not the end of the run
    knock(a); R.lastStumble = R.t; R.stumble = 0.9; R.inv = 1.6; R.shake = 0.6; R.dark = 2.5; S.hits++;
    loseCombo(); S.score = Math.max(0, S.score - 40); addLantern(-8); sfx.hit(); shakeDOM(true);
    popText('Bumped! −40', 'bad');
    toast(R.gentleTold ? '🚐 Ouch! Keep going, pilgrim!' : '🚐 Ouch! Near Lagos a bump only slows you. After KM 3, big vehicles end the run!', R.gentleTold ? 1400 : 2600); R.gentleTold = true;
    return false;
  }
  if (big || (!gentle && R.t - R.lastStumble < (R.boss && R.boss.id === 'storm' ? 7 : 4))) { crash(big ? BIG_NAMES[a.type] : 'You stumbled twice and the darkness caught up.'); return true; }
  R.lastStumble = R.t; R.stumble = 0.9; R.inv = 1.0; R.shake = 0.45; R.dark = 4; S.hits++;
  loseCombo(); S.score = Math.max(0, S.score - 30); addLantern(-6); sfx.hit(); shakeDOM();
  popText('Stumbled! −30', 'bad');
  toast(pick(['☁️ The darkness is right behind you. Steady now!', '☁️ Stumbled! One more and the darkness catches you.', '☁️ Watch your step, pilgrim. Don\'t stumble again!']), 1600);
  return false;
}
function updatePowers(dt) {
  if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0 && R.combo) { R.combo = 0; comboHUD(); } }
  if (R.fire > 0) { R.fire -= dt; R.inv = Math.max(R.inv, 0.05); for (let k = 0; k < 3; k++) fx.emit(R.px + rand(-0.4, 0.4), rand(0.2, 1.8), rand(0.2, 1.2), rand(-0.6, 0.6), rand(1.5, 3), rand(1, 4), 0.45, 0.55, pick(['#ff5722', '#ffb300', '#ffd54f']), 1.6); if (R.fire <= 0) { R.inv = 0.8; powerHUD(); } }
  if (R.magnet > 0) { R.magnet -= dt; if (R.magnet <= 0) powerHUD(); }
  if (R.shield) { R.shieldT -= dt; if (R.shieldT <= 0) { R.shield = false; powerHUD(); } }
  shieldBubble.visible = R.shield; if (R.shield) { shieldBubble.position.set(R.px, R.py + 1.2, 0); shieldBubble.material.opacity = 0.26 + 0.08 * Math.sin(S.t * 6); shieldBubble.rotation.y = Math.sin(S.t * 0.8) * 0.25; }
  if (R.wings > 0) { R.wings -= dt; if (playerWings.parent !== player.root) player.root.add(playerWings); playerWings.visible = true; VW.flapWings(playerWings, S.t, 1); if (Math.random() < 0.5) fx.emit(R.px + rand(-1, 1), R.py + 1.4, 0.4, rand(-1, 1), rand(-0.5, 0.5), 1.5, 0.7, 0.3, pick(['#ffffff', '#ffd6e8']), 0.4); if (R.wings <= 0) { R.wings = 0; R.inv = Math.max(R.inv, 0.9); R.onGround = false; R.vy = 0; R.g = 50; powerHUD(); } }
  else if (playerWings.visible) playerWings.visible = false;
  if (R.dark > 0) { R.dark -= dt; for (let k = 0; k < 2; k++) fx.emit(R.px + rand(-5, 5), rand(0, 3), rand(2.5, 5), rand(-0.5, 0.5), rand(0, 0.6), rand(-2, -0.5), 0.9, 1.6, pick(['#2b2140', '#1d1830', '#3a2d55']), 1.4); }
  const dv = el$('darkV'), dk = R.dark > 0 ? Math.min(1, R.dark / 1.2) * (R.boss && R.boss.id === 'storm' && R.dark < 1 ? 0.55 : 1) : 0; setOp(dv, dk);
  if ((R.popT -= dt) <= 0) { R.popT = 0.25; powerHUD(true); }
  // spawn power-ups now and then
  const V = R.vis, PD = V || R, pdist = V ? V.d : R.dist;
  if (pdist >= PD.nextPowerD && !(V ? visGateZone(pdist - SPAWN_Z) || V.d - SPAWN_Z > V.len - 80 : inGateZone(R.dist - SPAWN_Z) || R.dist - SPAWN_Z >= RUN_LEN - 60)) {
    const k = V && !V.wingsGiven ? 'wings' : V ? pick(['wings', 'shield', 'lamp', 'shield', 'fire', 'wings']) : pick(KM(R.dist) > 4 ? ['shield', 'shield', 'lamp', 'lamp', 'fire', 'wings'] : ['shield', 'shield', 'lamp', 'lamp', 'fire']), pu = powerUps.find(p => p.k === k);
    const lanes = shuffle([0, 1, 2]).filter(l => !active.some(a => a.lane === l && Math.abs(a.obj.position.z - SPAWN_Z) < 14));
    if (pu && !pu.on && lanes.length) { pu.on = true; pu.lane = lanes[0]; pu.g.visible = true; pu.g.position.set(LANES[pu.lane], 1.5, SPAWN_Z); PD.nextPowerD = pdist + (V ? rand(380, 560) : rand(520, 820)); if (V && k === 'wings') V.wingsGiven = true; }
    else PD.nextPowerD = pdist + 10;
  }
  for (const pu of powerUps) {
    if (!pu.on) continue;
    pu.g.position.z += R.speed * dt; pu.ring.rotation.y += dt * 3; if (pu.k === 'wings') VW.flapWings(pu.g.children[1], S.t, 0.6); pu.g.position.y = 1.5 + Math.sin(S.t * 3) * 0.2;
    if (Math.abs(pu.g.position.z) < 1.2 + R.speed * dt && Math.abs(pu.g.position.x - R.px) < 1.4 && Math.abs(R.py + 1 - pu.g.position.y) < 2) { pu.on = false; pu.g.visible = false; activatePower(pu.k); }
    if (pu.g.position.z > 15) { pu.on = false; pu.g.visible = false; }
  }
}
function activatePower(k) {
  const P0 = POWERS[k]; sfx.power(); scorePop(); buzz(15); setExpression(player, 'happy', 1.0);
  if (k === 'fire') { R.fire = P0.dur; R.dark = 0; dstat('fire', 1, 'max'); }
  if (k === 'shield') { R.shield = true; R.shieldT = P0.dur; }
  if (k === 'lamp') R.magnet = P0.dur;
  if (k === 'wings') { R.wings = P0.dur; R.magnet = Math.max(R.magnet, P0.dur); R.sl = 0; R.jbuf = 0; R.sbuf = 0; if (R.grind) endGrind(); dstat('wings', 1, 'max'); }
  for (let i = 0; i < 26; i++) fx.emit(R.px, 1.4, 0, rand(-4, 4), rand(0, 5), rand(-3, 3), 0.7, 0.6, k === 'fire' ? '#ffb300' : k === 'shield' ? '#ffe08a' : k === 'wings' ? '#ffe4ef' : '#fff3a0', 0.6);
  popText(`${P0.icon} ${P0.name}!`, 'big');
  toast(`${P0.icon} ${P0.name} · “${P0.line}” (${P0.ref})`, 2200);
  powerHUD();
}
function powerHUD(tickOnly) {
  const el = $('#hPow'); if (!R) return;
  const act = R.wings > 0 ? ['wings', R.wings] : R.fire > 0 ? ['fire', R.fire] : R.magnet > 0 ? ['lamp', R.magnet] : R.shield ? ['shield', R.shieldT] : null;
  if (!act) { el.classList.add('hidden'); return; }
  const P0 = POWERS[act[0]], pct = Math.max(0, act[1] / P0.dur * 100);
  if (!tickOnly || el.classList.contains('hidden') || el.dataset.k !== act[0]) { el.dataset.k = act[0]; el.innerHTML = `${P0.icon} <span>${P0.name}${R.shield && act[0] !== 'shield' ? ' + 🛡️' : ''}</span><i><b></b></i>`; el.classList.remove('hidden'); }
  el.querySelector('b').style.width = pct.toFixed(0) + '%';
}
const _dom = new Map();
function setOp(el, v) { const s = v.toFixed(2); if (_dom.get(el) !== s) { _dom.set(el, s); el.style.opacity = s; } }
const EL = {};
const el$ = id => EL[id] || (EL[id] = $('#' + id));
function speedFX() {
  const k = SET.reduceMotion ? 0 : R.fire > 0 || R.burst > 0 ? 1 : clamp((R.speed - 30) / 30, 0, 0.75);
  const sl = el$('speedLines'); setOp(sl, k); const f = R.fire > 0 || R.burst > 0; if (sl._f !== f) { sl._f = f; sl.classList.toggle('fire', f); }
}
function crash(cause) {
  if (R.boss) R.boss.crashes++; if (R.vis && R.vis.boss) R.vis.boss.crashes++; R.wings = 0; playerWings.visible = false; laneWarn.visible = false; $('#gust').classList.remove('show');
  bankRun(false);
  settleRunner(); S.paused = true; sfx.crash(); shakeDOM(true); loseCombo();
  R.fire = 0; R.magnet = 0; R.shield = false; R.dark = 0; shieldBubble.visible = false; setOp(el$('darkV'), 0); setOp(el$('speedLines'), 0); hideGateUI(); powerHUD();
  player.root.rotation.x = -0.5; player.root.position.y = 0;
  setTimeout(() => showFallen(cause), 450);
}
function showFallen(cause) {
  if (R.vis) return showFallenVision(cause);
  const v = pick(FALL_VERSES), m = $('#modalBody'), cp = R.cp, cost = 200;
  $('#toast').classList.remove('show');
  const km = KM(R.dist), best = M.bestKm(), isBest = R.newBest;
  m.innerHTML = `<div class="banner dark"><div class="km">${esc(cause)}</div><div class="name">FALLEN, BUT NOT FORSAKEN</div></div>
    ${verseHTML(v)}
    <div class="reach"><div class="rk">You reached <b>${km.toFixed(1)} km</b> of ${C.TOTAL_KM} km</div><div class="rbar"><i style="width:${(km / C.TOTAL_KM * 100).toFixed(1)}%"></i><em style="left:${(best / C.TOTAL_KM * 100).toFixed(1)}%"></em></div><div class="small">${isBest ? '🏁 New best distance!' : `🏁 Best: ${best.toFixed(1)} km`} · ${esc(zoneAt(km).name)}</div></div>
    <div class="chips"><span class="chip">✨ ${S.score} light</span><span class="chip">📍 ${esc(C.STOPS[Math.min(R.stopIdx, C.STOPS.length - 1)])} next</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} gates</span></div>
    ${!R.revived ? `<p class="small" style="margin:4px 0">You can <b>rise again</b> once per run:</p>
      <button class="btn green" id="riseQ">🙏 Rise again · answer a Bible question</button>
      <button class="btn primary" id="riseL" ${S.score < cost ? 'disabled' : ''}>✨ Rise again · spend ${cost} light${S.score < cost ? ' (not enough yet)' : ''}</button>` : '<p class="small">You have already risen once this run.</p>'}
    ${cp.stopIdx > 0 ? `<button class="btn" id="rCP">↩ Restart from ${esc(cp.name)} bus stop</button>` : ''}
    <button class="btn ghost" id="rStart">🔁 Restart from Ojota</button>`;
  show('modal'); m.scrollTop = 0;
  if (!R.revived) {
    $('#riseQ').onclick = () => { sfx.tap(); riseQuestion(); };
    $('#riseL').onclick = () => { if (S.score < cost) return; S.score -= cost; sfx.good(); revive('✨ You spent 200 light and rose again!'); };
  }
  if ($('#rCP')) $('#rCP').onclick = () => { sfx.tap(); restartFrom(R.cp); };
  $('#rStart').onclick = () => { sfx.tap(); R.revived = false; restartFrom(R.cp0); };
}
function riseQuestion() {
  const src = R.vis ? BK.WORLDS[R.vis.id].quiz : C.GATE_Q, used = new Set((R.vis ? R.vis.quiz : S.plan.quiz).map(q => q[0])), pool = src.filter(q => !used.has(q[0]));
  const q = pick(pool.length ? pool : src), order = shuffle(q[1].map((t, i) => ({ t, ok: i === q[2] })));
  R.riseOk = order.findIndex(o => o.ok);
  const m = $('#modalBody');
  m.innerHTML = `<div class="banner dark"><div class="km">ANSWER TO RISE AGAIN</div><div class="name">🙏 ONE QUESTION</div></div>
    <div class="q">${esc(q[0])}</div>${order.map((o, i) => `<button class="btn opt" data-i="${i}">${esc(o.t)}</button>`).join('')}<div class="fb" id="rfb"></div><div id="rnext"></div>`;
  m.scrollTop = 0;
  const btns = m.querySelectorAll('[data-i]');
  btns.forEach(b => b.addEventListener('click', () => {
    const ok = order[+b.dataset.i].ok;
    btns.forEach((bb, i) => { bb.disabled = true; if (order[i].ok) bb.classList.add('right'); });
    if (ok) { sfx.good(); $('#rfb').innerHTML = `✅ <b>Correct!</b> ${esc(q[3] || '')}`; $('#rnext').innerHTML = '<button class="btn primary" id="rgo">Rise again ▶</button>'; $('#rgo').onclick = () => revive('🙏 “When I fall, I shall arise” (Micah 7:8)'); }
    else { b.classList.add('wrong'); sfx.soft(); R.revived = true; $('#rfb').innerHTML = `💛 Not this time. ${esc(q[3] || '')}`; $('#rnext').innerHTML = '<button class="btn primary" id="rback">Choose where to restart</button>'; $('#rback').onclick = () => showFallen('Keep going, pilgrim. Grace gives another start.'); }
  }));
}
function revive(msg) {
  R.revived = true; hide('modal'); S.paused = false; player.root.rotation.x = 0;
  R.inv = 2.2; R.stumble = 0; R.dark = 0; R.lastStumble = -99; R.t = Math.min(R.t, 2);
  clearObs(a => a.obj.position.z > -40);
  toast(msg, 2200); sfx.power();
}
function restartFrom(cp) {
  if (R.vis) leaveVisionWorld();
  R.visTold = false; R.visSkip = false; R.wings = 0; playerWings.visible = false;
  hide('modal'); fadeFlash(); hideGateUI();
  Object.assign(S, cp.S); S.lantern = Math.max(S.lantern, S.floor);
  if (R.boss) bossEnd(false);
  Object.assign(R, { dist: cp.dist, stopIdx: cp.stopIdx, vGot: cp.vGot, nextScrollD: cp.dist + 60, nextPowerD: cp.dist + 200, gate: null, t: 0, combo: 0, comboT: 0, fire: 0, magnet: 0, shield: false, stumble: 0, lastStumble: -99, dark: 0, inv: 1.5, nextRow: 30, lane: 1, px: 0, pv: 0, camX: 0, py: 0, vy: 0, onGround: true, sl: 0, burst: 0, grind: false, zone: -1, kmInt: Math.floor(KM(cp.dist)), startT: cp.dist ? R.startT : performance.now() });
  if (!cp.dist) R.bossDone = {};
  clearObs(); orbs.forEach(o => o.on = false); hideScrolls(); powerUps.forEach(p => { p.on = false; p.g.visible = false; });
  player.root.rotation.x = 0; verseHUD(); comboHUD(); powerHUD(); S.paused = false;
  toast(`↩ Back at ${cp.name}. Run with endurance! (Hebrews 12:1)`, 2200);
}
// bank the light earned this attempt, record distance, post to the youth-group board
function bankRun(final) {
  if (!R) return;
  if (R.orbBuf) { dstat('orbs', R.orbBuf); R.orbBuf = 0; }
  if (R.earn) { M.earn(R.earn); R.earn = 0; }
  const km = final ? C.TOTAL_KM : KM(R.dist); R.newBest = M.recordKm(km);
  const room = M.myRoom(); if (room && km >= 0.5) M.LB.submit(room.code, { name: save.name, km: +km.toFixed(1), score: S.score, week: M.weekKey(), at: Date.now() }).catch(() => {});
}
function fadeFlash() { const f = $('#fade'); f.style.transition = 'none'; f.style.opacity = 1; void f.offsetWidth; f.style.transition = 'opacity .5s ease-out'; f.style.opacity = 0; }
function prepGate(idx, q = S.plan.quiz[idx % S.plan.quiz.length]) {
  const order = shuffle([0, 1, 2]);           // order[lane] = option index
  const g = { idx, q, order, correctLane: order.indexOf(q[2]), called: false, shown: false, done: false };
  gateLanes.forEach((L, i) => { drawGateLabel(L.lab, C.shortOpt(q[1][order[i]]), GATE_COLS[i]); L.curtain.material.color.set(GATE_COLS[i]); L.curtain.material.opacity = 0.3; });
  return g;
}
// slim question bar: max 2 lines, font shrinks to fit
function fitBar(el, max = 18, min = 16) { let f = max; el.classList.remove('q3'); el.style.fontSize = f + 'px'; while (f > min && el.scrollHeight > f * 1.25 * 2 + 2) { f -= 0.5; el.style.fontSize = f + 'px'; } if (el.scrollHeight > f * 1.25 * 2 + 2) el.classList.add('q3'); }   // v11: 18→16px, 2 lines; a rare long one gets a 3rd line rather than being cut off
const GL_ARROWS = ['◀', '▲', '▶'];
function clearForQuestion() {   // v11: the question window is a calm stretch: nothing ahead but light
  clearObs(a => a.obj.position.z < -28 || (a.rel < 1 && a.obj.position.z < -6));
  const b = R.boss || (R.vis && R.vis.boss); if (b && b.warn) { b.warn = null; laneWarn.visible = false; $('#gust').classList.remove('show'); }
}
function showGateQ(g) {
  const hq = $('#hQ'); hq.classList.remove('hidden', 'ok', 'bad', 'slide'); void hq.offsetWidth; hq.classList.add('slide');
  $('#hQq').textContent = '📖 ' + g.q[0]; $('#hQo').textContent = ''; document.body.classList.add('qon'); fitBar($('#hQq'));
  // v11: fixed answer strip, lane-aligned (left | middle | right), readable long before the gates arrive
  document.querySelectorAll('#hQa b').forEach((el, i) => { el.className = 'a' + i; el.innerHTML = `<i>${GL_ARROWS[i]}</i><span>${esc(C.shortOpt(g.q[1][g.order[i]]))}</span>`; }); $('#hQa').classList.remove('hidden'); hQaLane = -1;
  document.querySelectorAll('#gLabels .gl').forEach((el, i) => { const t = C.shortOpt(g.q[1][g.order[i]]); el.innerHTML = `<i>${GL_ARROWS[i]}</i><span>${esc(t)}</span>`; el.classList.remove('ok', 'dim'); el.classList.toggle('long', t.length > 11); });
  $('#gLabels').classList.remove('hidden'); gateLanes.forEach(L => L.panel.visible = false); sfx.stop();
}
// DOM labels pinned above each 3D gate: readable at any distance, spread so they never overlap
const _gv = new THREE.Vector3();
let hQaLane = -1;
function placeGateLabels() {
  if (R && R.lane !== hQaLane) { hQaLane = R.lane; document.querySelectorAll('#hQa b').forEach((el, i) => el.classList.toggle('me', i === hQaLane)); }   // your lane is outlined in the strip
  const box = $('#gLabels'); if (box.classList.contains('hidden')) return;
  const W = innerWidth, H = innerHeight, top = $('#hud').getBoundingClientRect().bottom + 8, els = box.children, xs = [], ys = [];
  for (let i = 0; i < 3; i++) { gateLanes[i].g.getWorldPosition(_gv); _gv.y += 3.6; _gv.project(camera); xs.push((_gv.x + 1) / 2 * W); ys.push((1 - _gv.y) / 2 * H); }
  const sep = W * 0.325; xs[1] = clamp(xs[1], W / 2 - W * 0.02, W / 2 + W * 0.02); xs[0] = Math.min(xs[0], xs[1] - sep); xs[2] = Math.max(xs[2], xs[1] + sep);
  for (let i = 0; i < 3; i++) { const x = clamp(xs[i], W * 0.165, W * 0.835), y = clamp(ys[i], top + 34, H * 0.52); els[i].style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`; }
}
function hideGateUI(delay) { clearTimeout(hideGateUI.t); const f = () => { $('#hQ').classList.add('hidden'); document.body.classList.remove('qon'); $('#gLabels').classList.add('hidden'); }; if (delay) hideGateUI.t = setTimeout(f, delay); else f(); }
function judgeGate(g) {
  g.done = true; S.quizTotal++;
  const ok = R.lane === g.correctLane, right = g.q[1][g.q[2]], note = g.q[3] || '';
  const hq = $('#hQ');
  gateLanes.forEach((L, i) => { if (i === g.correctLane) { L.curtain.material.color.set('#ffd23f'); drawGateLabel(L.lab, right, GATE_COLS[i], 'ok'); } else drawGateLabel(L.lab, g.q[1][g.order[i]], GATE_COLS[i], 'dim'); });
  if (ok) {
    S.quizRight++; R.earn += 5; dstat('gates'); addCombo(5); S.score += 50 * comboMult(); addLantern(5); sfx.good(); scorePop();
    for (let k = 0; k < 34; k++) fx.emit(R.px + rand(-1.2, 1.2), rand(0.4, 3.2), rand(-1, 0.5), rand(-4, 4), rand(1, 5), rand(-2, 2), 0.9, 0.6, pick(['#fff3a0', '#ffd23f', '#ffffff']), 0.5);
    $('#hQq').textContent = `✅ Correct! +50 · ${right}`; $('#hQo').textContent = note; hq.classList.add('ok'); fitBar($('#hQq'));
  } else {
    sfx.soft(); addLantern(-2); loseCombo(); R.inv = Math.max(R.inv, 0.7);
    for (let k = 0; k < 10; k++) fx.emit(R.px + rand(-0.5, 0.5), rand(0.8, 2), 0, rand(-1, 1), rand(0, 1.2), 0, 0.6, 0.5, '#9fb3c8', 0.5);
    $('#hQq').textContent = `💛 Not quite. It was “${right}”`; $('#hQo').textContent = note; hq.classList.add('bad'); fitBar($('#hQq'));
  }
  document.querySelectorAll('#gLabels .gl').forEach((el, i) => el.classList.add(i === g.correctLane ? 'ok' : 'dim'));
  document.querySelectorAll('#hQa b').forEach((el, i) => { el.classList.remove('me'); el.classList.add(i === g.correctLane ? 'ok' : 'dim'); if (i === R.lane && i !== g.correctLane) el.classList.add('mine'); });
  gateLanes.forEach(L => L.panel.visible = true);
  setTimeout(() => $('#gLabels').classList.add('hidden'), 450);
  clearTimeout(g.tm); g.tm = setTimeout(() => { if (S.mode === 'run' && R && (R.gate === g || !R.gate || !R.gate.shown)) hideGateUI(); }, 2400); // v8: also clear if the gate was reset (restart) so the result card can't stick
}
function passStop(idx) {
  const b = bridges[idx % 2];
  if (b && b.userData.sign) R.signFlash = { mat: b.userData.sign.material, t: 1.2 };
  R.flash = 1.6; R.cp = snapCP(stopDist(idx) + 1, idx + 1, C.STOPS[idx]);
  for (let k = 0; k < 18; k++) fx.emit(rand(-6, 6), rand(5.5, 8), -2, rand(-2, 2), rand(0, 2), rand(-1, 1), 0.8, 0.6, '#fff3a0', 0.5);
}
// v11 test (?fair): is there ever a stretch of road where all three lanes are blocked by something you can't jump, slide or ramp over?
const FAIR_CHECK = params.has('fair');
function fairScan() {
  const hard = a => !a.hit && !a.fly && !a.jump && !a.slide && !a.ramp && !a.grind && !a.launch && !a.hazard;
  for (let z = -130; z < -4; z += 2) {
    let m = 0; for (const a of active) { if (!hard(a)) continue; const az = a.obj.position.z; if (Math.abs(az - z) > a.len / 2 + 1.2) continue; if (a.wide) m = 7; else m |= 1 << a.lane; }
    if (m === 7) { const key = Math.round((R.vis ? R.vis.d : R.dist) + (-z)); if (!R.unfair || Math.abs(R.unfair.at - key) > 30) { R.unfair = { at: key, n: ((R.unfair && R.unfair.n) || 0) + 1, list: [...((R.unfair && R.unfair.list) || []), active.filter(a => hard(a) && Math.abs(a.obj.position.z - z) < 6).map(a => a.type + '@' + a.lane).join(',')].slice(-12) }; } return; }
  }
}
function autoSteer(dt) {   // test helper (?autopilot): steer to the right gate / scroll, slide, jump, use ramps and rails
  R.autoT -= dt;
  let want = R.lane; const g = R.gate, gd = g ? gateGD(g) : 1e9;
  if (g && g.shown && !g.done && gd < 90) want = AUTO_MIX && (g.idx === 1 || g.idx === 101) ? (g.correctLane + 1) % 3 : g.correctLane;
  else { const sc = scrolls.find(s => s.on && s.obj.position.z < -1 && s.obj.position.z > -60); if (sc) want = sc.lane; else { const r = active.find(a => (a.grind || a.ramp) && a.obj.position.z > -60 && a.obj.position.z < -8); if (r && AUTO_FUN) want = r.lane; } }
  const look = Math.max(18, R.speed * 0.42);
  const wall = (a, l) => {
    if (a.hit || a.fly || !(a.wide || a.lane === l)) return false;
    const z = a.obj.position.z; if (z < -look || z > a.len / 2 + 1) return false;
    if (a.cross) return Math.abs(a.obj.position.x - LANES[l]) < 2;
    if (a.slide || a.jump) return false;
    if (a.surf) { if (R.py >= a.surf - 0.9 && l === R.lane) return false; if (a.ramp && l === R.lane && (z + a.len / 2 + a.ramp < 0 || R.py >= a.surf * (1 - Math.max(0, -(z + a.len / 2)) / a.ramp) - 0.35)) return false; if (a.ramp && !a.big) return false; return true; }
    return a.big || a.type === 'hawker' || a.type === 'vDrop';
  };
  const cw = R.vis && R.vis.boss && R.vis.boss.warn && R.vis.WD.boss.id === 'chariots' ? R.vis.boss.warn.lane : -1;
  const danger = l => l === cw || chariots.some(c => c.on && c.lane === l && c.obj.position.z > -6) || active.some(a => wall(a, l));
  if (danger(want) && !(g && g.shown && !g.done && gd < 20)) { const alt = [0, 1, 2].filter(l => !danger(l)).sort((x, y) => Math.abs(x - R.lane) - Math.abs(y - R.lane))[0]; if (alt !== undefined) want = alt; }
  if (want !== R.lane && R.autoT <= 0 && !danger(R.lane + Math.sign(want - R.lane)) ) { runMove(Math.sign(want - R.lane)); R.autoT = 0.12; }
  else if (want !== R.lane && R.autoT <= 0 && danger(R.lane)) { runMove(Math.sign(want - R.lane)); R.autoT = 0.12; }
  const T = airT(), jd = R.speed * T * 0.42;
  if (R.onGround && active.some(a => !a.hit && (a.wide || a.lane === R.lane) && a.jump && a.obj.position.z > -jd - 2.5 && a.obj.position.z < -jd + 1.5 && R.py < 0.5)) runJump();
  if (R.sl <= 0.05 && active.some(a => !a.hit && a.slide && (a.wide || a.lane === R.lane) && a.obj.position.z > -R.speed * 0.2 - 2 && a.obj.position.z < 0.5)) runSlide();
}
function arriveGate() {
  settleRunner(); if (R.boss) bossEnd(true);
  S.paused = true; R.earn += 50; bankRun(true);
  const secs = Math.round((performance.now() - R.startT) / 1000 * TIME_SCALE), bosses = Object.keys(R.bossDone).map(k => C.BOSSES[k].icon).join(' ');
  const m = $('#modalBody'), q = S.plan.quest, v = S.plan.verse, full = v.parts.join(' ');
  S.vGot = R.vGot; S.verseDone = R.vGot >= v.parts.length;
  let verseCard;
  if (S.verseDone) {
    S.score += 300; addLantern(10);
    const list = myVerses().filter(x => x.ref !== v.ref); list.unshift({ ref: v.ref, text: full, ch: save.chapter, at: new Date().toISOString().slice(0, 10) }); localStorage.setItem(VERSES_KEY, JSON.stringify(list));
    verseCard = `<div class="vmem"><div class="vt">📜 VERSE MEMORISED · +300 · 🏮 +10</div><div class="vx">“${esc(full)}”</div><b>${esc(v.ref)} (KJV)</b><div class="small">Saved to <b>My Verses</b> on the title screen. Say it out loud once more!</div></div>`;
  } else verseCard = `<div class="vmem partial"><div class="vt">📜 ${R.vGot}/${v.parts.length} parts of ${esc(v.ref)}</div><div class="vx">${v.parts.map((p, i) => i < R.vGot ? esc(p) : '▢').join(' ')}</div><div class="small">Grab every scroll to memorise it. It'll come back next chapter.</div></div>`;
  m.innerHTML = `<div class="banner purple"><div class="km">KM 46 · LAGOS–IBADAN EXPRESSWAY</div><div class="name">REDEMPTION CITY</div></div>
    <h2 style="text-align:center">🎉 You ran all ${C.TOTAL_KM} km, ${esc(save.name)}!</h2>
    <div class="reach"><div class="rk">Lagos ➜ <b>Redemption City</b> · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</div><div class="rbar"><i style="width:100%"></i></div><div class="small">${bosses ? 'Bosses beaten: ' + bosses : 'Survive the storm, the go-slow and the market rush for big bonuses!'} · +50 💡</div></div>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} gates</span><span class="chip">🤲 ${S.helpedRun} helped</span><span class="chip dim">💥 ${S.hits} bumps</span></div>
    ${verseCard}
    <p>Lantern: <b>${Math.round(S.lantern)}%</b> · Score: <b>${S.score}</b></p><div class="meter"><i style="width:${S.lantern}%"></i></div>
    <p>Now explore the camp. Talk to pilgrims with a ❗, ${q ? `find the ${q.n} ${q.item} <b>${esc(q.title.toLowerCase())}</b>, ` : ''}and head for the <b>Main Auditorium</b>. Follow the golden beacon ✨.</p><p class="small">📖 Optional: <b>Sister Funke</b> runs a Bible study at the Prayer Ground. Answer at your own pace for extra light.</p>
    <button class="btn primary" id="gogo">Enter the camp ⛺</button>`;
  show('modal'); m.scrollTop = 0;
  $('#gogo').addEventListener('click', () => { sfx.good(); hide('modal'); startCamp(); });
}

/* =========================================================
   DIALOGUE (roadside + camp)
   ========================================================= */
function openDialog(enc, runMoral, onDone, zone) {
  if (runMoral && S.mode === 'run' && R) { S.slowmo = true; R.inv = 999; } else S.paused = true;
  $('#prompt').classList.add('hidden'); document.body.classList.toggle('dlg-run', !!S.slowmo); S.dlgOpen = true;
  const body = $('#dialogBody');
  const head = `<div class="who"><div class="av">${enc.av}</div><div><div class="nm">${esc(enc.name)}</div><div class="vt">${runMoral ? 'On the expressway' : esc(zone || 'Redemption City')} · ${C.VIRTUES[enc.virtue]} ${enc.virtue}</div></div></div>`;
  body.innerHTML = head + `<div class="say">${esc(enc.say)}</div>` + enc.choices.map((c, i) => `<button class="btn opt" data-i="${i}">${esc(c.t)}</button>`).join('');
  show('dialog'); body.scrollTop = 0;
  body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => choose(enc.choices[+b.dataset.i])));
  function choose(c) {
    const chips = [];
    if (c.good) {
      const vk = c.virtue || enc.virtue; S.virtues[vk] = (S.virtues[vk] || 0) + 1; dstat('help');
      const light = c.light || 12;
      if (runMoral) { S.floor = Math.min(70, S.floor + 8); S.score = Math.max(0, S.score - 40); S.helpedRun++; chips.push(`<span class="chip dim">⏱ −40 (time)</span>`, `<span class="chip">🏮 Lasting light +8</span>`); }
      else { S.score += 100; chips.push(`<span class="chip">✨ +100</span>`); }
      addLantern(light); chips.unshift(`<span class="chip">${C.VIRTUES[vk]} +1 ${vk}</span>`, `<span class="chip">🏮 +${light}</span>`); sfx.good();
    } else { addLantern(-6); chips.push(`<span class="chip dim">🏮 flickers −6</span>`); sfx.soft(); }
    S.log.push({ who: enc.name, good: c.good });
    outcome(c, chips, c.good);
  }
  function outcome(c, chips, good) {
    body.innerHTML = head + `<div class="say">${esc(c.out)}</div><div class="chips">${chips.join('')}</div>` + verseHTML(c.verse) +
      (!good ? `<p class="small">${c.retry ? 'Grace means you can still make it right. 💛' : 'God\'s grace is bigger than our mistakes. 💛'}</p>` : '') +
      (c.retry ? `<button class="btn green" id="dRetry">↩ ${esc(c.retry.label)}</button>` : '') +
      `<button class="btn ${c.retry ? 'ghost' : 'primary'}" id="dCont">Continue</button>`;
    body.scrollTop = 0;
    $('#dCont').addEventListener('click', finish);
    if (c.retry) $('#dRetry').addEventListener('click', () => {
      const vk = c.retry.virtue || enc.virtue; S.virtues[vk] = (S.virtues[vk] || 0) + 1; addLantern(8); S.score += 50;
      if (runMoral) { S.floor = Math.min(70, S.floor + 4); S.helpedRun++; }
      S.log.push({ who: enc.name, good: true, retry: true }); sfx.good();
      outcome({ out: c.retry.out, verse: c.retry.verse }, [`<span class="chip">${C.VIRTUES[vk]} +1 ${vk}</span>`, `<span class="chip">🏮 +8</span>`, `<span class="chip">✨ +50</span>`], true);
    });
  }
  function finish() { sfx.tap(); hide('dialog'); S.dlgOpen = false; S.paused = false; S.slowmo = false; document.body.classList.remove('dlg-run'); if (R) R.inv = 1.2; onDone && onDone(); }
}

/* =========================================================
   CAMP WORLD
   ========================================================= */
const CW = new THREE.Group(); CW.visible = false; scene.add(CW);
const colliders = [];
const SPOTS = {
  gate: [[-12, 86], [12, 90], [-18, 72], [16, 66]], road: [[3, 52], [-3, 8], [4, -16], [-4, -52]],
  food: [[30, 28], [46, 12], [58, 28], [38, -12]], hostel: [[-42, 22], [-20, 26], [-64, 20], [-42, -16]],
  prayer: [[-28, -44], [-50, -48], [-38, -64], [-20, -60]],
};
const DOOR = [0, -72];
const ZONES = [['Main Auditorium', -50, 50, -140, -68], ['Prayer Ground', -70, -12, -78, -30], ['Accommodation', -75, -12, -25, 55], ['Food Court', 18, 75, -25, 55], ['Main Gate', -80, 80, 60, 115]];
// camp world is built lazily on first visit (keeps first load + first frame light)
let campBuilt = false;
const campInst = [];   // v9: [instancedMesh, data, radius]; trees/palms between the camera and the player are hidden
function buildCamp() {
  if (campBuilt) return; campBuilt = true;
  const solids = [], flats = [];
  const box = (arr, c, x, y, z, w, h, d, ry = 0) => arr.push(P(G.box, c, x, y, z, 0, ry, 0, w, h, d));
  const coll = (x, z, w, d) => colliders.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
  box(flats, '#e9cf98', 0, 0.02, 20, 11, 0.04, 190); box(flats, '#e9cf98', 0, 0.02, 20, 150, 0.04, 9); box(flats, '#e9cf98', -30, 0.02, -34, 70, 0.04, 8);
  box(flats, '#f0dcb0', -40, 0.03, -56, 46, 0.04, 36); box(flats, '#d9d2c4', 0, 0.03, -100, 110, 0.04, 70); box(flats, '#e9cf98', 46, 0.03, 20, 52, 0.04, 70);
  for (let z = 110; z > -68; z -= 6) box(flats, '#ffffff', 0, 0.05, z, 0.25, 0.02, 2.5);
  for (const s of [-1, 1]) { box(solids, '#ffffff', s * 47, 1, 100, 78, 2, 0.6); box(solids, '#6a1b9a', s * 47, 2.1, 100, 78, 0.25, 0.7); coll(s * 47, 100, 78, 1); }
  box(solids, '#b3e5fc', 24, 2.5, 80, 12, 5, 8); box(solids, '#1565c0', 24, 5.3, 80, 13, 0.6, 9); box(solids, '#5d4037', 24, 1.2, 75.98, 2, 2.4, 0.1); coll(24, 80, 12, 8);
  [['A', -30, 40, '#c62828'], ['B', -56, 40, '#2e7d32'], ['C', -30, 2, '#1565c0'], ['D', -56, 2, '#ef6c00']].forEach(([n, x, z, roof]) => {
    box(solids, '#fff3d6', x, 4.5, z, 18, 9, 11); box(solids, roof, x, 9.3, z, 19, 0.6, 12);
    for (let f = 0; f < 3; f++) for (let i = -3; i <= 3; i++) { box(solids, '#2c5a86', x + i * 2.4, 1.6 + f * 2.8, z + 5.52, 1.3, 1.3, 0.1); box(solids, '#2c5a86', x + 9.02, 1.6 + f * 2.8, z + i * 1.5, 0.1, 1.2, 0.9); }
    box(solids, roof, x, 3.0, z + 6, 18.4, 0.25, 1.2); box(solids, roof, x, 5.8, z + 6, 18.4, 0.25, 1.2);
    coll(x, z, 18, 11);
  });
  const cols = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  [[30, 42], [44, 42], [58, 42], [30, -2], [44, -2], [58, -2]].forEach(([x, z], i) => {
    const f = z > 20 ? -1 : 1;
    box(solids, '#8d6e63', x, 1.6, z, 10, 3.2, 6); box(solids, '#ffffff', x, 0.6, z + f * 3.3, 9.6, 1.2, 0.8); box(solids, cols[i], x, 3.6, z + f * 2.2, 10.6, 0.3, 4.2);
    for (let k = -2; k <= 2; k++) box(solids, '#ffffff', x + k * 2, 3.62, z + f * 2.2, 0.9, 0.32, 4.25);
    coll(x, z, 10, 6.5);
  });
  for (const [x, z] of [[32, 30], [44, 30], [56, 30], [32, 10], [44, 10], [56, 10]]) {
    solids.push(P(G.cyl, '#ffffff', x, 0.8, z, 0, 0, 0, 2.2, 0.12, 2.2), P(G.cyl6, '#9e9e9e', x, 1.6, z, 0, 0, 0, 0.12, 3.2, 0.12), P(G.cone, pick(cols), x, 3.3, z, 0, 0, 0, 4.2, 1, 4.2));
    for (let k = 0; k < 4; k++) box(solids, '#ff7043', x + Math.cos(k * 1.57) * 1.6, 0.45, z + Math.sin(k * 1.57) * 1.6, 0.6, 0.9, 0.6);
    coll(x, z, 2.4, 2.4);
  }
  for (let r = 0; r < 6; r++) for (let c = -1; c <= 1; c++) { box(solids, '#8d6e63', -40 + c * 12, 0.45, -48 - r * 3.2, 9, 0.18, 0.9); box(solids, '#6d4c41', -40 + c * 12, 0.22, -48 - r * 3.2, 8.6, 0.44, 0.4); }
  box(solids, '#8d6e4a', -40, 4, -72, 0.8, 8, 0.8); box(solids, '#8d6e4a', -40, 5.8, -72, 4.4, 0.8, 0.8); coll(-40, -72, 1.2, 1.2);
  for (const [x, z] of [[-62, -40], [-18, -40], [-62, -70], [-18, -70]]) { box(solids, '#bdbdbd', x, 3, z, 0.4, 6, 0.4); coll(x, z, 0.6, 0.6); }
  for (let i = 0; i < 6; i++) box(solids, i % 2 ? '#7b1fa2' : '#ffffff', -40, 6.1, -40 - i * 5 - 2.5, 46, 0.3, 5);
  box(solids, '#eceff1', 0, 0.7, -106, 96, 1.4, 60); for (let i = 0; i < 3; i++) box(solids, '#e0e0e0', 0, 0.25 + i * 0.4, -74 - i * 0.8, 30, 0.4, 1.0);
  for (let x = -44; x <= 44; x += 8) for (const z of [-77, -135]) solids.push(P(G.cyl, '#ffffff', x, 7.4, z, 0, 0, 0, 1.2, 12, 1.2));
  for (let z = -85; z >= -127; z -= 8) for (const x of [-46, 46]) solids.push(P(G.cyl, '#ffffff', x, 7.4, z, 0, 0, 0, 1.2, 12, 1.2));
  box(solids, '#1565c0', 0, 13.6, -77, 98, 1.6, 0.8); box(solids, '#1565c0', 0, 13.6, -135, 98, 1.6, 0.8); box(solids, '#1565c0', -48, 13.6, -106, 0.8, 1.6, 58); box(solids, '#1565c0', 48, 13.6, -106, 0.8, 1.6, 58);
  solids.push(P(new THREE.ConeGeometry(68, 11, 4), '#fafafa', 0, 19.8, -106, 0, Math.PI / 4, 0, 1, 1, 0.64));
  box(solids, '#6a1b9a', 0, 2.4, -128, 34, 2, 10); box(solids, '#ffd23f', 0, 8, -132, 1, 9, 0.6); box(solids, '#ffd23f', 0, 10, -132, 6, 1, 0.6);
  for (let r = 0; r < 9; r++) for (let c = -6; c <= 6; c++) if (c !== 0) box(solids, '#e53935', c * 5.5, 1.8, -86 - r * 3.6, 4.6, 0.8, 0.9);
  colliders.push([-48, 48, -137, -76.5]);
  // v9: a fuller camp: pilgrims' tents, avenue banners on poles, mats and coolers, bunting at the food court
  const tcols = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00897b'];
  [[26, 80], [36, 85], [47, 80], [58, 85], [30, 64], [52, 64], [-30, 70], [-44, 72], [-58, 69], [-70, 76], [62, 74], [-66, 60]].forEach(([x, z], i) => {
    const c = tcols[i % tcols.length], r = (i * 0.7) % 1.2 - 0.6;
    solids.push(P(G.cone, c, x, 1.5, z, 0, Math.PI / 4 + r, 0, 3.4, 3.0, 3.4), P(G.box, '#3e2723', x + Math.sin(r) * 2.3, 0.65, z + Math.cos(r) * 2.3, 0, r, 0, 1.0, 1.3, 0.06));
    box(flats, '#5d4037', x + Math.sin(r) * 3.6, 0.05, z + Math.cos(r) * 3.6, 2.2, 0.03, 1.4, r);
    box(solids, '#1565c0', x + 2.6, 0.35, z + 1.2, 0.8, 0.7, 0.55); coll(x, z, 4.4, 4.4);
  });
  const bcols = ['#6a1b9a', '#ffd23f', '#1565c0', '#c62828'];
  for (let z = 92, i = 0; z > -62; z -= 14, i++) for (const sx of [-1, 1]) {
    const x = sx * 10.2, c = bcols[(i + (sx > 0 ? 1 : 0)) % bcols.length];
    box(solids, '#9e9e9e', x, 2.6, z, 0.16, 5.2, 0.16); box(solids, c, x + sx * 0.12, 3.7, z, 0.06, 2.6, 1.2); box(solids, '#ffffff', x + sx * 0.13, 4.5, z, 0.07, 0.35, 1.25); coll(x, z, 0.4, 0.4);
  }
  for (let k = 0; k < 9; k++) { const x = 24 + k * 4.2; box(solids, cols[k % cols.length], x, 4.4, 20 + Math.sin(k) * 0.4, 0.05, 0.6, 0.5); }
  box(solids, '#9e9e9e', 22, 2.3, 20, 0.15, 4.6, 0.15); box(solids, '#9e9e9e', 61, 2.3, 20, 0.15, 4.6, 0.15); box(solids, '#ffffff', 41.5, 4.75, 20, 39, 0.05, 0.05);
  for (const [x, z] of [[-16, 50], [16, 46], [-16, -8], [16, -30], [-24, 92], [22, 94]]) { box(flats, pick(['#c62828', '#2e7d32', '#1565c0', '#f9a825']), x, 0.05, z, 2.6, 0.03, 1.6, rand(-0.5, 0.5)); box(solids, '#eceff1', x + 1.6, 0.3, z - 0.8, 0.7, 0.6, 0.5); }
  const flatMesh = new THREE.Mesh(merge(flats), VC); flatMesh.receiveShadow = true; CW.add(flatMesh);
  CW.add(mergedMesh(solids, 0.07, false));
  const gtex = grassTex.clone(); gtex.repeat.set(40, 40); gtex.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), toon('#ffffff', { map: gtex }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; CW.add(ground);
  const addSign = (t, sub, bg, w, h, x, y, z, ry = 0) => { const s = signMesh(signTex(t, sub, bg, '#fff', 512, sub ? 180 : 110), w, h); s.position.set(x, y, z); s.rotation.y = ry; CW.add(s); };
  const gate = gateArch(14); gate.position.set(0, 0, 100); CW.add(gate); colliders.push([-8.2, -6, 99, 101], [6, 8.2, 99, 101]);
  addSign('HELP DESK', 'LOST & FOUND · FIRST AID', '#1565c0', 9, 2.4, 24, 6.8, 75.9);
  [['HOSTEL A', -30, 40], ['HOSTEL B', -56, 40], ['HOSTEL C', -30, 2], ['HOSTEL D', -56, 2]].forEach(([t, x, z]) => addSign(t, '', '#263238', 7, 1.5, x, 8.2, z + 5.6));
  addSign('FOOD COURT', 'BUKA · SUYA · DRINKS', '#e65100', 10, 3, 14.5, 4.6, 20, -Math.PI / 2);
  addSign('PRAYER GROUND', '', '#5d4037', 9, 1.8, -14.5, 3.2, -44, Math.PI / 2);
  addSign('MAIN AUDITORIUM', 'HOLY GHOST SERVICE TONIGHT', '#6a1b9a', 30, 4.6, 0, 13.6, -76.5);
  CW.add(mergedMesh([P(G.box, '#9e9e9e', 14.3, 1.6, 15.5, 0, 0, 0, 0.3, 3.2, 0.3), P(G.box, '#9e9e9e', 14.3, 1.6, 24.5, 0, 0, 0, 0.3, 3.2, 0.3), P(G.box, '#9e9e9e', -14.3, 1.2, -40, 0, 0, 0, 0.3, 2.4, 0.3), P(G.box, '#9e9e9e', -14.3, 1.2, -48, 0, 0, 0, 0.3, 2.4, 0.3)], 0.04, false));
  const isFree = (x, z, r) => !colliders.some(c => x + r > c[0] && x - r < c[1] && z + r > c[2] && z - r < c[3]) && Math.abs(x) > 9 && Math.abs(z - 20) > 7 && !(x > -66 && x < -14 && z < -30 && z > -78) && !(x > 18 && x < 72 && z > -8 && z < 48) && !Object.values(SPOTS).flat().some(s => Math.hypot(s[0] - x, s[1] - z) < 5);
  const tData = []; let tries = 0;
  while (tData.length < 46 && tries++ < 3000) { const x = rand(-95, 95), z = rand(-70, 96); if (isFree(x, z, 3)) tData.push({ x, z, s: rand(0.8, 1.3), r: rand(0, 6) }); }
  tData.forEach(t => colliders.push([t.x - 0.6, t.x + 0.6, t.z - 0.6, t.z + 0.6]));
  const trees = swayInst(treeGeo(), tData.length, 0.07); writeInst(trees, tData); CW.add(trees); campInst.push([trees, tData, 3.4]);
  const pData = []; for (let z = 92; z > -64; z -= 13) pData.push({ x: 8, z, s: 1, r: z }, { x: -8, z: z - 6, s: 1.1, r: z });
  const cp = swayInst(palmGeo(), pData.length, 0.06); writeInst(cp, pData); CW.add(cp); campInst.push([cp, pData, 2.2]);
  const lData = []; for (let z = 96; z > -64; z -= 20) lData.push({ x: 6.5, z, s: 1, r: 0 }, { x: -6.5, z: z - 10, s: 1, r: 0 });
  const cl = new THREE.InstancedMesh(streetLightGeo(), VC, lData.length); outline(cl, 0.05); writeInst(cl, lData); CW.add(cl);
  for (const [x, z, r] of [[-22, 86, 0.2], [-30, 84, -0.1], [-38, 87, 0.15], [32, 92, 1.57]]) { const d = danfo(); d.position.set(x, 0, z); d.rotation.y = r; CW.add(d); colliders.push([x - 2.6, x + 2.6, z - 2.8, z + 2.8]); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.scale.set(70, 22, 1); glow.position.set(0, 6, -95); CW.add(glow);
}
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 50, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
beacon.position.y = 25; CW.add(beacon);
const doorBeacon = new THREE.Mesh(beacon.geometry, beacon.material.clone()); doorBeacon.material.color.set(0xb388ff); CW.add(doorBeacon);
const arrow = mergedMesh([P(G.cone, '#ffd23f', 0, 0, 0, Math.PI / 2, 0, 0, 0.7, 1.2, 0.25)], 0.04, false); arrow.position.y = 0.3; CW.add(arrow);

let K = null;
function startCamp() {
  fadeFlash();
  buildCamp();
  S.mode = 'camp'; S.paused = false;
  RW.visible = false; CW.visible = true; clearObs(); fx.clear(); setMoralNPC(null);
  setSky('evening', 'evening', 0, 1);
  if (K) K.all.forEach(n => { CW.remove(n.root); const b = n.root.userData.baked; if (b) b.geos.forEach(g => g.dispose()); if (n.mesh) disposeHuman(n); });
  K = { x: 0, z: 104, tx: null, tz: null, met: {}, quest: 0, all: [], enc: [], walkers: [], items: [], joy: null };
  const usedSpots = new Set();
  for (const e of S.plan.enc) {
    let list = (SPOTS[e.spot] || []).filter(s => !usedSpots.has(s + ''));
    if (!list.length) list = Object.values(SPOTS).flat().filter(s => !usedSpots.has(s + ''));
    const sp = list[0]; usedSpots.add(sp + '');
    const h = makeHuman(randomLook(e.look), false); h.root.position.set(sp[0], 0, sp[1]); h.enc = e;
    h.mark = textSprite('❗', 1.5); h.mark.position.y = 3.2; h.root.add(h.mark);
    CW.add(h.root); K.all.push(h); K.enc.push(h);
  }
  const usher = { root: bakedHuman({ ...randomLook({ gender: 'm', cap: true }), top: '#263238', topTex: null, headColor: '#263238' }, 'idle', 1) };
  usher.root.position.set(4.5, 0, -73.5); CW.add(usher.root); K.all.push(usher); K.usher = usher;
  const WP = [[0, 95], [0, 60], [0, 20], [0, -20], [0, -60], [-30, 20], [-60, 20], [30, 20], [60, 20], [-30, -34], [-55, -34], [20, 70]];
  for (let i = 0; i < 10; i++) { const h = { root: bakedHuman(randomLook({ gender: pick(['m', 'f']), kid: Math.random() < 0.15, old: Math.random() < 0.15 }), 'walk', 6) }; const w = pick(WP); h.root.position.set(w[0] + rand(-2, 2), 0, w[1] + rand(-2, 2)); h.wp = pick(WP); CW.add(h.root); K.all.push(h); K.walkers.push(h); }
  for (const g of [[-26, 30], [36, 20], [-48, -28], [12, 84], [52, 18], [-14, -20]]) { const h = { root: bakedHuman(randomLook({ gender: pick(['m', 'f']) }), 'idle', 1) }; h.root.position.set(g[0], 0, g[1]); h.root.rotation.y = rand(0, 6); CW.add(h.root); K.all.push(h); }
  // v9: more people: small chatting groups along the avenue and around the tents (baked, cheap to draw)
  for (const [gx, gz] of [[-14, 62], [15, 52], [-14, 28], [15, 0], [-14, -28], [14, -48], [34, 74], [-50, 78], [22, 34], [-24, 53]].slice(0, TIER === 'low' ? 4 : 10)) {
    const n = 2 + (Math.random() * 2 | 0);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, h = { root: bakedHuman(randomLook({ gender: pick(['m', 'f']), kid: Math.random() < 0.2, old: Math.random() < 0.12 }), 'idle', 1) }; h.root.position.set(gx + Math.cos(a) * 1.1, 0, gz + Math.sin(a) * 1.1); h.root.rotation.y = -a - Math.PI / 2; CW.add(h.root); K.all.push(h); }
  }
  const ITEMS = shuffle([[-14, 60], [20, 50], [-50, 58], [64, 52], [-70, -10], [70, -16], [-30, -84], [26, -60], [-60, -58], [40, 70], [-22, 12], [12, -40]]).slice(0, S.plan.quest.n);
  for (const [x, z] of ITEMS) { const s = textSprite(S.plan.quest.item, 1.3); s.material.depthTest = true; s.position.set(x, 1.3, z); CW.add(s); K.items.push(s); K.all.push({ root: s }); }
  const fSpot = [[-44, -38], [-34, -36], [-56, -40], [-46, -56], [-30, -52], [-60, -52]].find(p => !blocked(p[0], p[1], 0.8) && !usedSpots.has(p + '')) || [-24, -36];
  const funke = makeHuman({ ...randomLook({ gender: 'f', gele: true }), top: '#ffffff', topTex: null, headColor: '#1565c0' }, false);
  funke.root.position.set(fSpot[0], 0, fSpot[1]); funke.mark = textSprite('📖', 1.5); funke.mark.position.y = 3.2; funke.root.add(funke.mark);
  CW.add(funke.root); K.all.push(funke); K.funke = funke; K.studied = false;
  player.root.position.set(0, 0, 104); player.root.rotation.set(0, Math.PI, 0); scene.add(player.root); player.root.visible = true;
  K.occ = []; const _bx = new THREE.Box3(), _sz = new THREE.Vector3(), _c = new THREE.Vector3(), skip = new Set(K.all.map(o => o.root));
  for (const o of CW.children) { if (skip.has(o) || o.isSprite) continue; _bx.setFromObject(o); _bx.getSize(_sz); _bx.getCenter(_c); if (_sz.y > 1.6 && Math.max(_sz.x, _sz.z) < 9) K.occ.push([o, _c.x, _c.z, Math.max(_sz.x, _sz.z) / 2]); }
  camera.position.set(0, 9.8, 116.2);
  hudMode('camp');
  toast('Drag to walk · Tap the ground to go there · Talk to pilgrims with ❗', 3600);
  setTimeout(() => { if (!S.paused && S.mode === 'camp') toast(`Side quest: ${S.plan.quest.text}`, 3600); }, 4000);
}
function blocked(x, z, r = 0.55) {
  if (x < -100 || x > 100 || z < -140 || z > 112) return true;
  return colliders.some(c => x + r > c[0] && x - r < c[1] && z + r > c[2] && z - r < c[3]);
}
const metCount = () => K.enc.filter(h => K.met[h.enc.id]).length;
const DOOR_NEED = 5;
function campZone(x, z) { const zn = ZONES.find(Z => x > Z[1] && x < Z[2] && z > Z[3] && z < Z[4]); return zn ? zn[0] : 'Camp Grounds'; }
const keys = {};
function updateCamp(dt) {
  let vx = 0, vz = 0, run = false;
  if (keys.ArrowLeft || keys.a) vx -= 1; if (keys.ArrowRight || keys.d) vx += 1; if (keys.ArrowUp || keys.w) vz -= 1; if (keys.ArrowDown || keys.s) vz += 1;
  if (K.joy) { vx = K.joy.x; vz = K.joy.y; run = Math.hypot(vx, vz) > 0.7; }
  if (vx || vz) K.tx = null;
  else if (K.tx != null) { const dx = K.tx - K.x, dz = K.tz - K.z, d = Math.hypot(dx, dz); if (d > 0.3) { vx = dx / d; vz = dz / d; run = d > 4; } else K.tx = null; }
  const m = Math.min(1, Math.hypot(vx, vz));
  if (m > 0.05) {
    const sp = (run ? 7.5 : 5) * m * dt, n = Math.hypot(vx, vz), ux = vx / n, uz = vz / n;
    const nx = K.x + ux * sp, nz = K.z + uz * sp;
    let moved = false;
    if (!blocked(nx, K.z)) { K.x = nx; moved = true; } if (!blocked(K.x, nz)) { K.z = nz; moved = true; }
    if (!moved) K.tx = null;
    let d = Math.atan2(ux, uz) - player.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.root.rotation.y += d * Math.min(1, dt * 12);
    poseHuman(player, run ? 'run' : 'walk', dt, run ? 0.8 : 1);
    if (run && Math.random() < 0.4) fx.emit(K.x, 0.1, K.z, rand(-0.4, 0.4), rand(0.3, 0.8), rand(-0.4, 0.4), 0.5, 0.4, '#e9d2a8', 2);
  } else poseHuman(player, 'idle', dt);
  player.root.position.set(K.x, 0, K.z);
  for (const h of K.enc) {
    const dx = K.x - h.root.position.x, dz = K.z - h.root.position.z, d = Math.hypot(dx, dz);
    if (d < 9) h.root.rotation.y = Math.atan2(dx, dz);
    poseHuman(h, !K.met[h.enc.id] && d < 14 ? 'wave' : 'idle', dt);
    h.mark.position.y = 3.2 + Math.sin(S.t * 5 + h.phase) * 0.15;
  }
  { const f = K.funke, dx = K.x - f.root.position.x, dz = K.z - f.root.position.z, d = Math.hypot(dx, dz); if (d < 9) f.root.rotation.y = Math.atan2(dx, dz); poseHuman(f, !K.studied && d < 14 ? 'wave' : 'idle', dt); f.mark.position.y = 3.2 + Math.sin(S.t * 4) * 0.15; }
  for (const h of K.walkers) {
    const dx = h.wp[0] - h.root.position.x, dz = h.wp[1] - h.root.position.z, d = Math.hypot(dx, dz);
    if (d < 1) h.wp = [clamp(h.wp[0] + rand(-25, 25), -90, 90), clamp(h.wp[1] + rand(-25, 25), -60, 95)];
    else { const nx = h.root.position.x + dx / d * 1.6 * dt, nz = h.root.position.z + dz / d * 1.6 * dt; if (!blocked(nx, nz, 0.4)) { h.root.position.x = nx; h.root.position.z = nz; } else h.wp = [rand(-4, 4), rand(-60, 90)]; h.root.rotation.y = Math.atan2(dx, dz); }
    stepBaked(h.root, dt, 8);
  }
  for (let i = K.items.length - 1; i >= 0; i--) {
    const s = K.items[i]; s.position.y = 1.3 + Math.sin(S.t * 3 + i) * 0.2;
    if (Math.hypot(s.position.x - K.x, s.position.z - K.z) < 1.8) {
      CW.remove(s); K.items.splice(i, 1); K.quest++; S.score += 30; addLantern(2); sfx.orb();
      for (let k = 0; k < 10; k++) fx.emit(s.position.x, 1.3, s.position.z, rand(-2, 2), rand(0, 3), rand(-2, 2), 0.6, 0.4, '#fff3a0', 0.5);
      if (K.quest >= S.plan.quest.n) { S.score += 150; addLantern(10); sfx.good(); toast(`✅ Side quest done! ${S.plan.quest.done} +150`, 3200); } else toast(`${S.plan.quest.item} ${K.quest}/${S.plan.quest.n} found`, 1200);
    }
  }
  const mc = metCount();
  let near = null, nd = 3.4;
  for (const h of K.enc) { if (K.met[h.enc.id]) continue; const d = Math.hypot(h.root.position.x - K.x, h.root.position.z - K.z); if (d < nd) { nd = d; near = h; } }
  const atDoor = Math.hypot(DOOR[0] - K.x, DOOR[1] - K.z) < 6.5, atFunke = Math.hypot(K.funke.root.position.x - K.x, K.funke.root.position.z - K.z) < 3.4;
  if (near) setPrompt(`💬 ${near.enc.av} ${near.enc.name}`, false, () => talk(near));
  else if (atFunke) { if (!K.studied) setPrompt('📖 Bible study with Sister Funke', false, openStudy); else setPrompt('📖 Sister Funke: “Well done! See you next chapter.”', true, null); }
  else if (atDoor) { if (mc >= DOOR_NEED) setPrompt('⛪ Enter the Holy Ghost Service', false, enterService); else setPrompt(`👮🏾 Usher: help ${DOOR_NEED - mc} more pilgrim${DOOR_NEED - mc > 1 ? 's' : ''} first (${mc}/${DOOR_NEED})`, true, null); }
  else { $('#prompt').classList.add('hidden'); promptFn = null; }
  let target = null, td = Infinity;
  for (const h of K.enc) { if (K.met[h.enc.id]) continue; const d = Math.hypot(h.root.position.x - K.x, h.root.position.z - K.z); if (d < td) { td = d; target = [h.root.position.x, h.root.position.z]; } }
  const toDoor = !target; if (toDoor) { target = DOOR; td = Math.hypot(DOOR[0] - K.x, DOOR[1] - K.z); }
  beacon.position.set(target[0], 25, target[1]); beacon.visible = td > 9;
  doorBeacon.visible = mc >= DOOR_NEED && !toDoor; doorBeacon.position.set(DOOR[0], 25, DOOR[1]);
  const ang = Math.atan2(target[0] - K.x, target[1] - K.z);
  arrow.position.set(K.x + Math.sin(ang) * 1.7, 0.3, K.z + Math.cos(ang) * 1.7); arrow.rotation.y = ang; arrow.visible = td > 4;
  camera.position.lerp(_pv.set(K.x, 9.8, K.z + 12.2), Math.min(1, dt * 5)); camera.lookAt(K.x, 1.0, K.z - 2.6);   // v9: pulled back to show more of the camp
  if ((K.instT = (K.instT || 0) - dt) <= 0) { K.instT = 0.12; for (const [m, data, r] of campInst) { let ch = false; for (const t of data) { const h = Math.abs(t.x - K.x) < r + 1.2 && t.z > K.z + 0.4 && t.z < K.z + 13.5; if (h !== !!t.hide) { t.hide = h; ch = true; } } if (ch) writeInst(m, data); } }
  for (const [o, ox, oz, r] of K.occ) o.visible = !(Math.abs(ox - K.x) < r + 1.2 && oz > K.z + 0.6 - r * 0.3 && oz < K.z + 12.6 + r * 0.5);
  sunFollow(K.x, K.z);
  lanternLight.intensity = 1.6 * S.lantern / 100;
  fx.update(dt, 0, 0); lanternHalo(0);
  hud(mc / K.enc.length, `📍 ${campZone(K.x, K.z)} · 💛 ${mc}/${K.enc.length} · ${S.plan.quest.item} ${K.quest}/${S.plan.quest.n}${mc >= DOOR_NEED ? ' · ⛪ open' : ''}`);
}
let promptFn = null;
function setPrompt(txt, off, fn) { const pr = $('#prompt'); if (pr.textContent !== txt) pr.textContent = txt; pr.classList.toggle('off', off); pr.classList.remove('hidden'); promptFn = fn; }
$('#prompt').addEventListener('click', e => { e.stopPropagation(); if (promptFn && !S.paused) { sfx.tap(); promptFn(); } });
function talk(h) {
  K.joy = null; K.tx = null; $('#joy').classList.add('hidden');
  openDialog(h.enc, false, () => { K.met[h.enc.id] = true; h.root.remove(h.mark); h.mark = textSprite('💛', 1.1); h.mark.position.y = 3.2; h.root.add(h.mark); }, campZone(h.root.position.x, h.root.position.z));
}
function studyData() { try { return Object.assign({ done: {}, right: 0, total: 0, sessions: 0 }, JSON.parse(localStorage.getItem(STUDY_KEY) || '{}')); } catch (e) { return { done: {}, right: 0, total: 0, sessions: 0 }; } }
function openStudy() {
  K.joy = null; K.tx = null; S.paused = true; $('#prompt').classList.add('hidden'); $('#toast').classList.remove('show');
  const sd = studyData(), unlocked = Math.min(C.STUDY.length, save.chapter), m = $('#modalBody');
  const lvls = C.STUDY.map((L, i) => {
    const n = L.qs.filter((_, j) => sd.done[i + ':' + j]).length, open = i < unlocked;
    return `<button class="btn opt lvl ${open ? '' : 'locked'}" data-l="${i}" ${open ? '' : 'disabled'}>${L.icon} <b>Level ${i + 1}: ${esc(L.name)}</b><span class="small">${open ? `${n}/${L.qs.length} mastered` : `🔒 Unlocks in Chapter ${i + 1}`}</span></button>`;
  }).join('');
  m.innerHTML = `<div class="banner"><div class="km">PRAYER GROUND · BIBLE STUDY</div><div class="name">SISTER FUNKE</div></div>
    <div class="story">👩🏾‍🏫 “Welcome, ${esc(save.name)}! Sit down, no rush. <i>Thy word is a lamp unto my feet</i> (Psalm 119:105). Pick a level and we'll go through 4 questions together.”</div>${lvls}
    <button class="btn ghost" id="stBack">Maybe later</button>`;
  show('modal'); m.scrollTop = 0;
  $('#stBack').onclick = () => { sfx.tap(); hide('modal'); S.paused = false; };
  m.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { sfx.tap(); runStudy(+b.dataset.l); }));
}
function runStudy(L) {
  const sd = studyData(), lvl = C.STUDY[L], m = $('#modalBody');
  const idx = lvl.qs.map((_, j) => j), fresh = shuffle(idx.filter(j => !sd.done[L + ':' + j])), old = shuffle(idx.filter(j => sd.done[L + ':' + j]));
  const picks = [...fresh, ...old].slice(0, 4);
  let k = 0, right = 0;
  const ask = () => {
    const q = lvl.qs[picks[k]], order = shuffle(q[1].map((t, i) => ({ t, ok: i === q[2] })));
    m.innerHTML = `<div class="banner"><div class="km">${lvl.icon} LEVEL ${L + 1} · ${esc(lvl.name.toUpperCase())}</div><div class="name">QUESTION ${k + 1} OF ${picks.length}</div></div>
      <div class="q">${esc(q[0])}</div>${order.map((o, i) => `<button class="btn opt" data-i="${i}">${esc(o.t)}</button>`).join('')}<div class="fb" id="sfb"></div><div id="snext"></div>`;
    m.scrollTop = 0;
    const btns = m.querySelectorAll('[data-i]');
    btns.forEach(b => b.addEventListener('click', () => {
      const ok = order[+b.dataset.i].ok; S.studyTotal++; sd.total++;
      btns.forEach((bb, i) => { bb.disabled = true; if (order[i].ok) bb.classList.add('right'); });
      if (ok) { right++; S.studyRight++; sd.right++; sd.done[L + ':' + picks[k]] = 1; S.score += 40; addLantern(2); sfx.good(); }
      else { b.classList.add('wrong'); sfx.soft(); }
      $('#sfb').innerHTML = `${ok ? '✅ <b>Correct! +40</b>' : '💛 <b>Good try.</b> The answer is highlighted.'}<div class="verse" style="margin-top:8px">${esc(q[3])}</div>`;
      localStorage.setItem(STUDY_KEY, JSON.stringify(sd));
      $('#snext').innerHTML = `<button class="btn primary" id="sgo">${k + 1 < picks.length ? 'Next question ▶' : 'Finish study'}</button>`;
      $('#sgo').onclick = () => { sfx.tap(); k++; if (k < picks.length) ask(); else done(); };
    }));
  };
  const done = () => {
    sd.sessions++; localStorage.setItem(STUDY_KEY, JSON.stringify(sd));
    S.virtues.Faithfulness = (S.virtues.Faithfulness || 0) + 1; addLantern(6); S.score += 60; K.studied = true;
    K.funke.root.remove(K.funke.mark); K.funke.mark = textSprite('💛', 1.1); K.funke.mark.position.y = 3.2; K.funke.root.add(K.funke.mark);
    const n = lvl.qs.filter((_, j) => sd.done[L + ':' + j]).length;
    m.innerHTML = `<div class="banner"><div class="km">BIBLE STUDY COMPLETE</div><div class="name">${right}/${picks.length} CORRECT</div></div>
      <div class="story">👩🏾‍🏫 “${right === picks.length ? 'Excellent! You really know your Bible.' : right >= 2 ? 'Well done! Keep reading and it will stick.' : 'Every great Bible student started somewhere. Keep at it!'} Come back next chapter${save.chapter < C.STUDY.length ? ' and a new level will be open' : ''}.”</div>
      <div class="chips"><span class="chip">${C.VIRTUES.Faithfulness} +1 Faithfulness</span><span class="chip">✨ +${right * 40 + 60}</span><span class="chip">🏮 +${right * 2 + 6}</span><span class="chip">${lvl.icon} ${n}/${lvl.qs.length} mastered</span></div>
      ${verseHTML(['Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.', '2 Timothy 2:15'])}
      <button class="btn primary" id="sDone">Back to the camp</button>`;
    m.scrollTop = 0;
    $('#sDone').onclick = () => { sfx.tap(); hide('modal'); S.paused = false; };
  };
  ask();
}
function enterService() { K.joy = null; K.tx = null; openDialog(S.plan.door, false, () => setTimeout(showEnding, 200), 'Main Auditorium'); }

/* =========================================================
   INPUT
   ========================================================= */
let ptr = null, UI_T = 0;
// v11: any tap on the UI (buttons, cards, modals) marks a short quiet window so it can never leak into the run as a jump
document.addEventListener('pointerdown', e => { if (e.target !== canvas) UI_T = performance.now(); }, true);
document.addEventListener('pointerup', e => { if (e.target !== canvas) UI_T = performance.now(); }, true);
document.addEventListener('click', e => { if (e.target !== canvas) UI_T = performance.now(); }, true);
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && (S.mode === 'run' || S.mode === 'camp')) { if (S.userPause) resumeGame(); else pauseGame(); return; }
  if (S.paused || S.slowmo) return;
  if (S.mode === 'run' && !e.repeat && !LAT.t0) LAT.t0 = performance.now();
  if (S.mode === 'run') {
    if (!e.repeat && ['ArrowLeft', 'a', 'A'].includes(e.key)) runMove(-1);
    if (!e.repeat && ['ArrowRight', 'd', 'D'].includes(e.key)) runMove(1);
    if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) { if (!e.repeat) runJump(); e.preventDefault(); }
    if (['ArrowDown', 's', 'S'].includes(e.key)) { if (!e.repeat) runSlide(); e.preventDefault(); }
  }
  if (S.mode === 'camp' && (e.key === 'e' || e.key === 'Enter') && promptFn) promptFn();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
// swipe threshold scales with screen size (≈ 16–24 CSS px); a fast flick triggers even sooner
let SWIPE = 20, SAME = 64; const swipeCalc = () => { const m = Math.min(innerWidth, innerHeight); SWIPE = clamp(Math.round(m * 0.05), 16, 24); SAME = clamp(Math.round(m * 0.17), 56, 90); }; swipeCalc(); window.addEventListener('resize', swipeCalc);
const PASSIVE = { passive: true };
canvas.addEventListener('pointerdown', e => {
  ensureAudio(); const t = performance.now();
  ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: t, t, done: false, ok: S.mode !== 'run' || (!S.paused && !S.slowmo && t - UI_T > 350) };
  try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
}, PASSIVE);
function swipeCheck(e) {
  if (!ptr || e.pointerId !== ptr.id || S.mode !== 'run' || S.paused || S.slowmo) return;
  if (ptr.acted || !ptr.ok) return;   // v8: one gesture = exactly one action; a fresh touch is needed for the next lane
  const now = performance.now(), x = e.clientX, y = e.clientY, d = ptr.dir;
  // after a swipe, keep the origin at the furthest point reached so a turn-back fires at the normal threshold
  if (d === 'L' && x < ptr.x0) ptr.x0 = x; else if (d === 'R' && x > ptr.x0) ptr.x0 = x; else if (d === 'U' && y < ptr.y0) ptr.y0 = y; else if (d === 'D' && y > ptr.y0) ptr.y0 = y;
  const dx = x - ptr.x0, dy = y - ptr.y0, ax = Math.abs(dx), ay = Math.abs(dy);
  const sdt = Math.max(4, now - ptr.lt), vx = (x - ptr.lx) / sdt, vy = (y - ptr.ly) / sdt;   // px per ms
  ptr.lx = x; ptr.ly = y; ptr.lt = now;
  let dir = null;
  if (ax > ay && (ax > SWIPE || (ax > 10 && Math.abs(vx) > 0.55))) dir = dx < 0 ? 'L' : 'R';
  else if (ay > ax && (ay > SWIPE || (ay > 10 && Math.abs(vy) > 0.55))) dir = dy < 0 ? 'U' : 'D';
  if (!dir) return;
  if (dir === 'L') runMove(-1); else if (dir === 'R') runMove(1); else if (dir === 'U') runJump(); else runSlide();
  ptr.acted = true; ptr.dir = dir; ptr.x0 = ptr.ax = x; ptr.y0 = ptr.ay = y;
  if (!LAT.t0) LAT.t0 = e.timeStamp > 0 && e.timeStamp <= now ? e.timeStamp : now;
}
// pointerrawupdate (Chrome, secure contexts) arrives un-throttled: lane changes fire mid-gesture with less lag
const RAW = 'onpointerrawupdate' in window && window.isSecureContext;
canvas.addEventListener(RAW ? 'pointerrawupdate' : 'pointermove', swipeCheck, PASSIVE);
canvas.addEventListener('pointermove', e => {
  if (!ptr) return; ptr.x = e.clientX; ptr.y = e.clientY;
  if (S.paused || S.slowmo) return;
  const dx = ptr.x - ptr.x0, dy = ptr.y - ptr.y0;
  if (S.mode === 'camp' && K) {
    const d = Math.hypot(dx, dy);
    if (d > 12) { const k = Math.min(1, d / 55); K.joy = { x: dx / d * k, y: dy / d * k }; const j = el$('joy'); j.classList.remove('hidden'); j.style.transform = `translate3d(${ptr.x0}px,${ptr.y0}px,0)`; j.firstElementChild.style.transform = `translate3d(${dx / d * k * 32}px,${dy / d * k * 32}px,0)`; }
  }
}, PASSIVE);
canvas.addEventListener('pointercancel', () => { if (K) K.joy = null; el$('joy').classList.add('hidden'); ptr = null; }, PASSIVE);
canvas.addEventListener('pointerup', e => {
  if (ptr && e.type === 'pointerup') { ptr.x = e.clientX; ptr.y = e.clientY; }
  if (ptr && !S.paused && !S.slowmo) {
    const quick = performance.now() - ptr.t < 320 && Math.hypot(ptr.x - ptr.x0, ptr.y - ptr.y0) < 12;
    if (S.mode === 'run' && !ptr.acted && ptr.ok && quick) runJump();
    if (S.mode === 'camp' && K && quick) {
      _ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(_ndc, camera);
      const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(groundPlane, hit)) { K.tx = hit.x; K.tz = hit.z; for (let i = 0; i < 6; i++) fx.emit(hit.x, 0.2, hit.z, Math.cos(i) * 2, 0.5, Math.sin(i) * 2, 0.4, 0.3, '#ffd23f', 1); }
    }
  }
  if (K) K.joy = null; el$('joy').classList.add('hidden'); ptr = null;
}, PASSIVE);

/* =========================================================
   SCREENS: title, select, chapter intro, ending
   ========================================================= */
let titleDanfo = null;
function enterTitle() {
  if (R && R.vis) leaveVisionWorld(); Object.values(portals).forEach(p => p.visible = false); laneWarn.visible = false; playerWings.visible = false;
  endTutorial(true); hide('pause'); S.userPause = null;
  S.mode = 'title'; S.paused = false; S.shop = false; S.slowmo = false; S.dlgOpen = false; document.body.classList.remove('dlg-run'); RW.visible = true; CW.visible = false; hudMode(null); resetGround(); hide('shop'); setMoralNPC(null); clearObs(); orbs.forEach(o => o.on = false); hideOrbs();
  buildPlayer();
  player.root.position.set(0.6, 0, 0); player.root.visible = true; player.root.rotation.set(0, Math.PI, 0);
  if (!titleDanfo) { titleDanfo = danfo(); titleDanfo.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; }); RW.add(titleDanfo); }
  titleDanfo.visible = true; titleDanfo.position.set(-3.2, 0, 2.2);
  bridges.forEach(b => b.visible = false); roadGate.visible = false;
  setSky('day', 'day', 0); show('title');
  $('#btnContinue').classList.toggle('hidden', !save); document.body.classList.toggle('has-save', !!save);
  if (save) $('#btnContinue').innerHTML = `▶ CONTINUE<small>Chapter ${save.chapter} · ${esc(save.name)}</small>`;
  $('#btnNew').innerHTML = save ? 'Start a new journey' : '▶ PLAY<small>Start your journey</small>';
  const hs = JSON.parse(localStorage.getItem('lr3d_high') || 'null');
  const mv = myVerses().length; $('#btnVerses').innerHTML = `<i>📜</i><span>Verses</span>${mv ? `<em>${mv}</em>` : ''}`;
  $('#hiscore').textContent = hs ? `🏆 Best on this phone: ${hs.score} by ${hs.name} (Chapter ${hs.chapter})` : '';
  const st = M.dailyState(), dl = M.dailyFor(st.day), dn = dl.filter(c => st.done[c.id]).length, w = M.wallet(), bk = M.bestKm();
  $('#btnDaily').innerHTML = `<i>📅</i><span>Daily</span><em>${dn}/3</em>`; $('#btnShop').innerHTML = `<i>🛍️</i><span>Shop</span><em>💡${w.light}</em>`;
  $('#streakNote').textContent = M.streakNote() + (bk >= 0.5 ? ` · 🏁 Best ${bk.toFixed(1)} km` : '');
  const ch = $('#challenge'); if (CHALLENGE) { ch.classList.remove('hidden'); ch.innerHTML = `⚔️ <b>${esc(CHALLENGE.from)}</b> ran <b>${CHALLENGE.km.toFixed(1)} km</b>. Can you beat it?${CHALLENGE.room ? ` · Room ${esc(CHALLENGE.room)}` : ''}`; } else ch.classList.add('hidden');
}
function updateTitle(dt) {
  moveProps(9 * dt);
  for (const v of oncoming) { v.position.z += 25 * dt; if (v.position.z > 30) v.position.z = -300; }
  poseHuman(player, 'run', dt, 0.8);
  titleDanfo.position.y = Math.abs(Math.sin(S.t * 9)) * 0.05;
  if (Math.random() < 0.6) fx.emit(-3.2 + 0.6, 0.45, 2.2 + 2.4, rand(-0.3, 0.3), rand(0.5, 1), 2, 0.9, 0.6, '#9a9a9a', 2.5);
  if (Math.random() < 0.7) fx.emit(0.6 + rand(-0.2, 0.2), 0.12, 0.35, rand(-0.5, 0.5), rand(0.4, 0.9), 1.5, 0.5, 0.45, '#e6c9a0', 2.2);
  const a = Math.sin(S.t * 0.3) * 0.5;
  camera.position.set(1.5 + a * 2.5, 1.1, -4.6); camera.lookAt(-0.6, 1.7, 2);
  sunFollow(0, 0); fx.update(dt, 9, 0); lanternHalo(0);
}
let selG = 'm', selO = 0, selS = 1, selLook = null, cTab = 'body', selRot = 0, selDrag = null, selIdle = 0;
const CTABS = [['body', '🧍🏾 Body'], ['face', '🙂 Face'], ['hair', '💇🏾 Hair'], ['top', '👕 Top'], ['bottom', '👖 Bottom'], ['shoes', '👟 Shoes'], ['extras', '🎒 Extras'], ['outfits', '✨ Outfits']];
function enterSelect() {
  S.mode = 'select'; hide('title'); show('select');
  const base = save || freshSave(); selLook = { ...lookOf(base) }; selG = selLook.gender; selO = base.outfit || 0; selS = base.skin ?? 1; selRot = 0;
  $('#pname').value = base.name === 'Pilgrim' ? (localStorage.getItem('lr_name') || '') : base.name;
  if (titleDanfo) titleDanfo.visible = false;
  paintSelect(true);
}
const optBtns = (k, cur, g) => LK.OPT[k].filter(o => !o[2] || o[2] === g).map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${cur === v ? 'on' : ''}">${esc(t)}</button>`).join('');
const swatches = (k, cur, cols, label) => `<div class="clab">${label}</div><div class="sw">${cols.map(c => `<button data-k="${k}" data-v="${c}" class="${cur === c ? 'on' : ''}" style="background:${c}" aria-label="${label} ${c}"></button>`).join('')}<label class="cpick" title="Custom colour">🎨<input type="color" data-k="${k}" value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : '#ffffff'}"></label></div>`;
function creatorTab() {
  const l = selLook, g = l.gender, w = M.wallet();
  switch (cTab) {
    case 'body': return `<div class="clab">Pilgrim</div><div class="opts">${optBtns('gender', g, g)}</div><div class="clab">Body type</div><div class="opts">${optBtns('body', l.body, g)}</div><div class="clab">Skin tone</div><div class="sw skins2">${LK.SKIN_TONES.map(c => `<button data-k="skin" data-v="${c}" class="${l.skin === c ? 'on' : ''}" style="background:${c}" aria-label="Skin tone"></button>`).join('')}</div>`;
    case 'face': return `<div class="clab">Eyes</div><div class="opts">${optBtns('eyes', l.eyes, g)}</div><div class="clab">Brows</div><div class="opts">${optBtns('brows', l.brows, g)}</div><div class="clab">Smile</div><div class="opts">${optBtns('smile', l.smile, g)}</div>`;
    case 'hair': return `<div class="clab">Hairstyle</div><div class="opts">${optBtns('hair', l.hair, g)}</div>${swatches('hairColor', l.hairColor, LK.HAIR_COLS, 'Hair colour')}<div class="clab">Headwear</div><div class="opts">${optBtns('head', l.head, g)}</div>${l.head !== 'none' ? swatches('headColor', l.headColor, LK.CLOTH_COLS, 'Headwear colour') : ''}`;
    case 'top': return `<div class="clab">Top</div><div class="opts">${optBtns('top', l.top, g)}</div>${l.top === 'ankara' ? `<div class="clab">Ankara pattern</div><div class="pats">${LK.ANKARA_NAMES.map((n, i) => `<button data-k="pattern" data-v="${i}" class="${+l.pattern === i ? 'on' : ''}" style="background:linear-gradient(135deg,${LK.ANKARA_SWATCH[i][0]} 0 40%,${LK.ANKARA_SWATCH[i][1]} 40% 70%,${LK.ANKARA_SWATCH[i][2]} 70%)">${esc(n)}</button>`).join('')}</div>` : swatches('topColor', l.topColor, LK.CLOTH_COLS, 'Colour')}${l.top === 'kaftan' || l.top === 'striped' ? swatches('topColor2', l.topColor2, LK.CLOTH_COLS, l.top === 'kaftan' ? 'Trim colour' : 'Stripe colour') : ''}`;
    case 'bottom': return `<div class="clab">Bottom</div><div class="opts">${optBtns('bottom', l.bottom, g)}</div>${l.bottom === 'ankaraSkirt' ? `<div class="clab">Wrapper uses your ankara pattern</div><div class="pats">${LK.ANKARA_NAMES.map((n, i) => `<button data-k="pattern" data-v="${i}" class="${+l.pattern === i ? 'on' : ''}" style="background:linear-gradient(135deg,${LK.ANKARA_SWATCH[i][0]} 0 40%,${LK.ANKARA_SWATCH[i][1]} 40% 70%,${LK.ANKARA_SWATCH[i][2]} 70%)">${esc(n)}</button>`).join('')}</div>` : swatches('bottomColor', l.bottomColor, LK.CLOTH_COLS, 'Colour')}`;
    case 'shoes': return `<div class="clab">Shoes</div><div class="opts">${optBtns('shoes', l.shoes, g)}</div>${swatches('shoeColor', l.shoeColor, LK.CLOTH_COLS, 'Colour')}`;
    case 'extras': {
      const lan = M.SHOP.lanterns.map(it => { const own = w.owned.includes(it.id) || it.price === 0; return `<button class="${w.lantern === it.id ? 'on' : ''} ${own ? '' : 'lock'}" data-lan="${it.id}">${it.icon} ${esc(it.name)}${own ? '' : ` · 🔒💡${it.price}`}</button>`; }).join('');
      return `<div class="clab">Accessories</div><div class="opts">${LK.OPT.acc.map(([v, t]) => `<button data-acc="${v}" class="${l.acc[v] ? 'on' : ''}">${t}</button>`).join('')}</div>${swatches('accColor', l.accColor, LK.CLOTH_COLS, 'Backpack & wristband colour')}<div class="clab">Lantern</div><div class="opts">${lan}</div>`;
    }
    case 'outfits': return `<div class="clab">Quick outfits · tap to wear (your colours stay editable)</div><div class="opts">${LK.presetsFor(g).map(p => { const own = !p.shop || ownedId(p.id), it = p.shop && M.shopItem(p.id); return `<button data-pre="${p.id}" class="${l.preset === p.id ? 'on' : ''} ${own ? '' : 'lock'}">${esc(p.name)}${own ? '' : ` · 🔒💡${it ? it.price : ''}`}</button>`; }).join('')}</div><p class="small">Earn 💡 light on the run to unlock robes, agbada, ankara sets and more.</p>`;
  }
  return '';
}
let cBuy = null;
function paintSelect(rebuild = true) {
  const l = selLook;
  $('#ctabs').innerHTML = CTABS.map(([k, t]) => `<button data-tab="${k}" class="${k === cTab ? 'on' : ''}">${t}</button>`).join('');
  let body = creatorTab();
  if (cBuy) { const it = M.shopItem(cBuy), w = M.wallet(); body += `<div class="cbuy"><b>${it.icon} ${esc(it.name)}</b> · 💡 ${it.price} <span class="small">(you have ${w.light})</span><button class="btn primary slim" id="cBuyBtn" ${w.light < it.price ? 'disabled' : ''}>${w.light < it.price ? `Need ${it.price - w.light} more` : 'Unlock'}</button></div>`; }
  $('#cbody').innerHTML = body;
  $('#ctabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { sfx.tap(); cTab = b.dataset.tab; cBuy = null; paintSelect(false); b.scrollIntoView({ inline: 'center', block: 'nearest' }); });
  ctHint();
  const set = (k, v) => { if (k === 'pattern') v = +v; selLook[k] = v; if (k === 'gender') { selLook = LK.fixLook({ ...selLook, gender: v }); selG = v; } if (['top', 'topColor', 'topColor2', 'pattern', 'bottom', 'bottomColor', 'head', 'headColor'].includes(k)) selLook.preset = null; sfx.tap(); paintSelect(); };
  $('#cbody').querySelectorAll('button[data-k]').forEach(b => b.onclick = () => set(b.dataset.k, b.dataset.v));
  $('#cbody').querySelectorAll('input[type=color]').forEach(inp => inp.oninput = () => { selLook[inp.dataset.k] = inp.value; selLook.preset = null; refreshPreview(); });
  $('#cbody').querySelectorAll('input[type=color]').forEach(inp => inp.onchange = () => paintSelect());
  $('#cbody').querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { selLook.acc = { ...selLook.acc, [b.dataset.acc]: !selLook.acc[b.dataset.acc] }; sfx.tap(); paintSelect(); });
  $('#cbody').querySelectorAll('[data-pre]').forEach(b => b.onclick = () => {
    const p = LK.presetsFor(selLook.gender).find(x => x.id === b.dataset.pre); sfx.tap();
    Object.assign(selLook, LK.presetFields(p.of)); selLook.preset = p.id;
    cBuy = p.shop && !ownedId(p.id) ? p.id : null; paintSelect();
  });
  $('#cbody').querySelectorAll('[data-lan]').forEach(b => b.onclick = () => {
    const id = b.dataset.lan, w = M.wallet(), it = M.shopItem(id); sfx.tap();
    if (w.owned.includes(id) || !it || it.price === 0) { w.lantern = id; M.saveWallet(w); cBuy = null; } else cBuy = id;
    S.previewLantern = id; paintSelect();
  });
  if ($('#cBuyBtn')) $('#cBuyBtn').onclick = () => { const w = M.wallet(), it = M.shopItem(cBuy); if (w.light < it.price) return; w.light -= it.price; w.owned.push(it.id); if (it.id.startsWith('l_')) w.lantern = it.id; M.saveWallet(w); sfx.power(); toast(`🎉 Unlocked: ${it.name}!`); cBuy = null; paintSelect(); };
  if (rebuild) refreshPreview();
}
function refreshPreview() {
  const nm = ($('#pname').value || '').trim();
  const lant = S.previewLantern || M.wallet().lantern;
  buildPlayer({ ...(save || freshSave()), name: nm || 'Pilgrim', look: selLook }, lant);
  player.root.position.set(0, 0, 0); player.root.rotation.y = selRot; player.root.visible = true;
}
$('#pname').addEventListener('input', () => { if (S.mode === 'select' && player) setNameTag(($('#pname').value || '').trim()); });
$('#btnRand').addEventListener('click', () => { ensureAudio(); sfx.whoosh(); const keepPre = null; selLook = LK.randomLook2(); selLook.preset = keepPre; selG = selLook.gender; cBuy = null; paintSelect(); });
function updateSelect(dt) {
  if (S.shop) player.root.rotation.y = Math.sin(S.t * 0.8) * 0.7;
  else { if (!selDrag) { selIdle += dt; if (selIdle > 2.5) { selRot = Math.atan2(Math.sin(selRot), Math.cos(selRot)); selRot += (Math.sin(S.t * 0.6) * 0.45 - selRot) * Math.min(1, dt * 1.5); } } player.root.rotation.y = selRot; }
  poseHuman(player, 'idle', dt);
  if (S.shop && S.shopTrail && S.shopTrail !== 't_none' && Math.random() < 0.6) { const t = S.shopTrail; const x = rand(-0.3, 0.3); if (t === 't_gold') fx.emit(x, 0.1, 0, 0, rand(0.3, 0.8), rand(1, 2), 0.8, 0.35, '#ffd23f', 0.6); else if (t === 't_rainbow') ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9'].forEach((c, i) => fx.emit(-0.5 + i * 0.2, 0.2, 0, 0, 0.1, 2, 0.8, 0.3, c, 0.2)); else fx.emit(rand(-0.6, 0.6), 1.4, -0.2, rand(-1, 1), rand(0.2, 0.8), 1.5, 0.8, 0.36, '#ffffff', 0.8); }
  if (S.shop && lantern && Math.random() < 0.4) { lantern.getWorldPosition(_pv); const L = M.shopItem(M.wallet().lantern); fx.emit(_pv.x, _pv.y, _pv.z, rand(-0.2, 0.2), rand(0.2, 0.6), 1.2, 0.7, 0.25, (L && L.trail) || '#ffd27a', 1); }
  if (S.shop) { camera.position.lerp(_pv.set(0, 1.7, 5.6), Math.min(1, dt * 4)); camera.lookAt(0, -0.1, 0); }
  else { camera.position.lerp(_pv.set(0, 1.4, 4.75), Math.min(1, dt * 5)); camera.lookAt(0, -0.22, 0); }
  sunFollow(0, 0); fx.update(dt, 0, 0); lanternHalo(0);
}
canvas.addEventListener('pointerdown', e => { if (S.mode === 'select' && !S.shop) { selDrag = { x: e.clientX, r: selRot }; selIdle = 0; } });
window.addEventListener('pointermove', e => { if (selDrag && S.mode === 'select') { selRot = selDrag.r + (e.clientX - selDrag.x) * 0.012; selIdle = 0; } });
window.addEventListener('pointerup', () => { selDrag = null; });
$('#btnNew').addEventListener('click', () => {
  ensureAudio(); sfx.tap();
  if (save) {
    $('#modalBody').innerHTML = `<h2>Start over?</h2><p>This resets your chapters, virtues and lantern level on this phone. Your best score stays.</p><button class="btn primary" id="yesNew">Yes, start a new journey</button><button class="btn ghost" id="noNew">Keep my progress</button>`;
    show('modal');
    $('#yesNew').onclick = () => { hide('modal'); save = null; localStorage.removeItem(SAVE_KEY); enterSelect(); };
    $('#noNew').onclick = () => hide('modal');
  } else enterSelect();
});
$('#btnContinue').addEventListener('click', () => { ensureAudio(); sfx.good(); hide('title'); buildPlayer(); chapterIntro(); });
$('#btnHow').addEventListener('click', () => { ensureAudio(); sfx.tap(); show('howto'); });
$('#btnBible').addEventListener('click', () => { ensureAudio(); sfx.tap(); openBibleMap(); });   // v10
$('#btnCreator').addEventListener('click', () => { ensureAudio(); sfx.tap(); enterSelect(); });
$('#btnVerses').addEventListener('click', () => {
  ensureAudio(); sfx.tap();
  const list = myVerses(), sd = studyData();
  const lv = C.STUDY.map((L, i) => { const n = L.qs.filter((_, j) => sd.done[i + ':' + j]).length; return `<span class="chip ${save && save.chapter > i ? '' : 'dim'}">${L.icon} ${esc(L.name)} ${save && save.chapter > i ? n + '/' + L.qs.length : '🔒'}</span>`; }).join('');
  $('#modalBody').innerHTML = `<h2>📜 My Verses</h2>${list.length ? list.map(v => `<div class="verse">“${esc(v.text)}”<b>${esc(v.ref)} (KJV) · Chapter ${v.ch}</b></div>`).join('') : '<p>No verses yet. Collect every 📜 scroll on the expressway to memorise a verse.</p>'}
    <h3>🎓 Bible study progress</h3><div class="chips">${lv}</div><p class="small">${sd.right}/${sd.total} study answers correct over ${sd.sessions} session${sd.sessions === 1 ? '' : 's'}.</p>
    <button class="btn primary" id="vClose">Close</button>`;
  show('modal'); $('#modalBody').scrollTop = 0; $('#vClose').onclick = () => hide('modal');
});
$('#btnSelBack').addEventListener('click', () => { S.previewLantern = null; hide('select'); enterTitle(); });
$('#btnGo').addEventListener('click', () => {
  ensureAudio(); sfx.good();
  const name = ($('#pname').value.trim() || 'Pilgrim').slice(0, 16); localStorage.setItem('lr_name', name);
  if (!save) save = freshSave();
  selLook = LK.fixLook(selLook); Object.assign(save, { name, gender: selLook.gender, outfit: selO, skin: selS, look: selLook }); persist(); localStorage.setItem(LK.LOOK_KEY, JSON.stringify(selLook));
  S.previewLantern = null; hide('select'); buildPlayer(); chapterIntro();
});

/* =========================================================
   META SCREENS: daily challenges, shop, youth-group leaderboard
   ========================================================= */
const LANTERN_KIND = { l_hurricane: 'hurricane', l_star: 'star', l_dove: 'dove', l_flame: 'flame', l_oil: 'oil' };
function allOutfits(g) { return [...PLAYER_OUTFITS[g], ...SHOP_OUTFITS.map(o => o[g])]; }
function outfitOwned(i) { return i < 3 || M.wallet().owned.includes(SHOP_OUTFITS[i - 3]?.id); }
function dailyHTML() {
  const st = M.dailyState(), list = M.dailyFor(st.day), sk = M.streak(), v = M.dailyVerse();
  const done = list.filter(c => st.done[c.id]).length;
  const dots = Array.from({ length: 7 }, (_, i) => `<i class="${i < (sk.n % 7 || (sk.n ? 7 : 0)) ? 'on' : ''}">${i === 6 ? '🎁' : i + 1}</i>`).join('');
  return `<h2>📅 Today's challenges</h2>
    ${list.map(c => { const p = Math.min(c.n, st.prog[c.id] || 0); return `<div class="dch ${st.done[c.id] ? 'done' : ''}"><div class="dt">${st.done[c.id] ? '✅' : '⬜'} ${esc(c.t)}<b>+${c.r} 💡</b></div><div class="dbar"><i style="width:${(p / c.n * 100).toFixed(0)}%"></i></div><div class="small">${p}/${c.n}</div></div>`; }).join('')}
    <p class="small">${done}/3 done · finish all three for a <b>+150 💡</b> bonus. New challenges every day.</p>
    <h3>🔥 Streak: ${sk.n} day${sk.n === 1 ? '' : 's'} <span class="small">(best ${sk.best})</span></h3><div class="streak">${dots}</div>
    <p class="small">${esc(M.streakNote())}. Day 7 gives a big bonus.</p>
    <h3>📖 Today's memory verse</h3><div class="verse">“${esc(v.parts.join(' '))}”<b>${esc(v.ref)} (KJV)</b></div>`;
}
$('#btnDaily').addEventListener('click', () => {
  ensureAudio(); sfx.tap();
  $('#modalBody').innerHTML = dailyHTML() + '<button class="btn primary" id="dGo">Let\'s run ▶</button><button class="btn ghost" id="dClose">Close</button>';
  show('modal'); $('#modalBody').scrollTop = 0; $('#dClose').onclick = () => { sfx.tap(); hide('modal'); };
  // v8: "Let's run" used to only close the panel; now it actually starts/continues the run
  $('#dGo').onclick = () => { hide('modal'); (save ? $('#btnContinue') : $('#btnNew')).click(); };
});
/* ---- shop ---- */
// v9: creator tab row scroll hint (fade edges + a nudging › arrow while more tabs are off-screen)
function ctHint() { const t = $('#ctabs'), w = $('#ctwrap'); if (!t || !w) return; requestAnimationFrame(() => { w.classList.toggle('more-r', t.scrollLeft + t.clientWidth < t.scrollWidth - 4); w.classList.toggle('more-l', t.scrollLeft > 4); }); }
$('#ctabs').addEventListener('scroll', ctHint, { passive: true }); addEventListener('resize', ctHint);
$('#ctMore').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); const t = $('#ctabs'); t.scrollBy({ left: t.clientWidth * 0.7, behavior: 'smooth' }); });
let shopTab = 'outfits', shopFrom = 'title', shopSel = null;
function openShop(from) {
  shopFrom = from; hide('title'); hide('select'); S.mode = 'select'; S.shop = true;
  if (titleDanfo) titleDanfo.visible = false;
  shopSel = null; previewShop(); paintShop(); show('shop');
}
function previewShop() {
  const w = M.wallet(), base = save || freshSave(); if (!selLook) selLook = { ...lookOf(base) };
  const sv = { ...base, look: { ...selLook } };
  let lant = w.lantern; S.shopTrail = w.trail;
  if (shopSel) { if (shopSel.startsWith('o_')) { const p = LK.presetsFor(selLook.gender).find(x => x.id === shopSel); Object.assign(sv.look, LK.presetFields(p.of), { preset: shopSel }); } if (shopSel.startsWith('l_')) lant = shopSel; if (shopSel.startsWith('t_')) S.shopTrail = shopSel; }
  buildPlayer(sv, lant); player.root.position.set(0, 0, 0); player.root.rotation.y = 0; player.root.visible = true;
}
function paintShop() {
  const w = M.wallet(), items = M.SHOP[shopTab];
  const owned = id => w.owned.includes(id), equipped = id => id === w.lantern || id === w.trail || (id.startsWith('o_') && selLook && selLook.preset === id);
  const sel = shopSel && M.shopItem(shopSel);
  $('#shopBody').innerHTML = `<div class="shead"><h2>🛍️ Pilgrim shop</h2><div class="wal">💡 ${w.light}</div></div>
    <div class="seg tabs">${['outfits', 'lanterns', 'trails'].map(t => `<button data-t="${t}" class="${t === shopTab ? 'on' : ''}">${{ outfits: '👕 Outfits', lanterns: '🏮 Lanterns', trails: '✨ Trails' }[t]}</button>`).join('')}</div>
    <div class="sgrid">${items.map(it => `<button class="sit ${shopSel === it.id ? 'sel' : ''} ${owned(it.id) ? 'own' : ''}" data-id="${it.id}"><div class="ic">${it.icon}</div><div class="nm">${esc(it.name)}</div><div class="pr">${equipped(it.id) ? '✔ On' : owned(it.id) ? 'Owned' : `💡 ${it.price}`}</div></button>`).join('')}</div>
    ${sel ? `<div class="sdet"><b>${sel.icon} ${esc(sel.name)}</b><div class="small">${esc(sel.note)}</div>
      ${owned(sel.id) ? (equipped(sel.id) ? '<button class="btn slim" disabled>Equipped ✔</button>' : '<button class="btn green slim" id="sEquip">Equip</button>') : `<button class="btn primary slim" id="sBuy" ${w.light < sel.price ? 'disabled' : ''}>${w.light < sel.price ? `Need ${sel.price - w.light} more 💡` : `Buy for 💡 ${sel.price}`}</button>`}</div>` : '<p class="small">Tap an item to preview it. Earn 💡 light by collecting orbs, answering gates, daily challenges, streaks and boss runs.</p>'}
    <button class="btn ghost" id="sClose">Done</button>`;
  $('#shopBody').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { sfx.tap(); shopTab = b.dataset.t; shopSel = null; previewShop(); paintShop(); });
  $('#shopBody').querySelectorAll('[data-id]').forEach(b => b.onclick = () => { sfx.tap(); shopSel = b.dataset.id; previewShop(); paintShop(); });
  if ($('#sBuy')) $('#sBuy').onclick = () => { const w2 = M.wallet(); if (w2.light < sel.price) return; w2.light -= sel.price; w2.owned.push(sel.id); M.saveWallet(w2); sfx.power(); toast(`🎉 Unlocked: ${sel.name}!`); equip(sel.id); };
  if ($('#sEquip')) $('#sEquip').onclick = () => { sfx.good(); equip(sel.id); };
  $('#sClose').onclick = closeShop;
}
function equip(id) {
  const w = M.wallet();
  if (id.startsWith('l_')) w.lantern = id; else if (id.startsWith('t_')) w.trail = id;
  else { const p = LK.presetsFor(selLook.gender).find(x => x.id === id); Object.assign(selLook, LK.presetFields(p.of), { preset: id }); localStorage.setItem(LK.LOOK_KEY, JSON.stringify(selLook)); if (save) { save.look = { ...selLook }; persist(); } }
  M.saveWallet(w); previewShop(); paintShop();
}
function closeShop() { sfx.tap(); hide('shop'); S.shop = false; S.shopTrail = null; if (shopFrom === 'select') { S.mode = 'select'; show('select'); paintSelect(); } else enterTitle(); }
$('#btnShop').addEventListener('click', () => { ensureAudio(); sfx.tap(); const base = save || freshSave(); selLook = { ...lookOf(base) }; selG = selLook.gender; openShop('title'); });
$('#btnSelShop').addEventListener('click', () => { sfx.tap(); openShop('select'); });
/* ---- youth group leaderboard ---- */
async function openBoard() {
  const m = $('#modalBody'), room = M.myRoom(), best = M.bestKm(), name = (save && save.name) || localStorage.getItem('lr_name') || 'Pilgrim';
  const mode = `<p class="small lbmode">${M.LB.mode === 'local' ? '🧪 <b>Demo mode:</b> scores are kept on this phone until the group server is switched on. Room codes and WhatsApp challenges already work.' : '🟢 Live board: everyone in your room sees the same scores.'}</p>`;
  if (!room) {
    m.innerHTML = `<h2>🏆 Youth group board</h2><p>Race your youth fellowship from Lagos to KM 46. Weekly board, resets every Monday.</p>
      <input id="lbName" maxlength="24" placeholder="Group name (e.g. RCCG Youth, Surulere)">
      <button class="btn primary" id="lbCreate">Create a room</button>
      <div class="or">or join with a code</div>
      <input id="lbCode" maxlength="6" placeholder="ROOM CODE" style="text-transform:uppercase;letter-spacing:4px;text-align:center">
      <button class="btn green" id="lbJoin">Join room</button>${mode}<button class="btn ghost" id="lbClose">Close</button>`;
    show('modal');
    $('#lbCreate').onclick = async () => { try { const r = await M.LB.createRoom(($('#lbName').value.trim() || 'Youth group').slice(0, 24)); M.setMyRoom(r); sfx.good(); openBoard(); } catch (e) { toast('Could not create the room. Check your connection.'); } };
    $('#lbJoin').onclick = async () => { const c = $('#lbCode').value.trim().toUpperCase(); if (c.length < 4) return toast('Enter the room code'); try { const r = await M.LB.joinRoom(c); M.setMyRoom(r); sfx.good(); openBoard(); } catch (e) { toast('Room not found. Check the code.'); } };
    $('#lbClose').onclick = () => hide('modal');
    return;
  }
  m.innerHTML = `<h2>🏆 ${esc(room.name)}</h2><div class="rcode">Room code <b>${esc(room.code)}</b></div><div id="lbList" class="small">Loading this week's board…</div>${mode}
    <button class="btn green" id="lbWa">📲 Challenge on WhatsApp</button><button class="btn" id="lbCopy">🔗 Copy challenge link</button>
    <div class="row2"><button class="btn ghost" id="lbLeave">Leave room</button><button class="btn primary" id="lbClose">Close</button></div>`;
  show('modal'); m.scrollTop = 0;
  const link = M.challengeLink(location.href, room, best, name);
  const text = `🏮 Redemption City: Light Run\nI ran ${best.toFixed(1)} km of 46 km from Lagos to Redemption City! Can you beat my distance? 🏃🏾‍♂️\nJoin our youth group room ${room.code}: ${link}`;
  $('#lbWa').onclick = () => { sfx.tap(); window.open(M.whatsappURL(text), '_blank'); };
  $('#lbCopy').onclick = () => copyText(text);
  $('#lbLeave').onclick = () => { M.setMyRoom(null); sfx.tap(); openBoard(); };
  $('#lbClose').onclick = () => hide('modal');
  try {
    const rows = await M.LB.top(room.code, M.weekKey());
    $('#lbList').innerHTML = rows.length ? `<ol class="lb">${rows.map((r, i) => `<li class="${r.name === name ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || i + 1}</span><b>${esc(r.name)}</b><em>${(+r.km).toFixed(1)} km</em><small>${r.score}</small></li>`).join('')}</ol>` : '<p>No runs yet this week. Be the first!</p>';
  } catch (e) { $('#lbList').textContent = 'Could not load the board right now.'; }
}
$('#btnBoard').addEventListener('click', () => { ensureAudio(); sfx.tap(); openBoard(); });
// deep link: ?room=CODE&beat=12.3&from=Tobi
const CHALLENGE = params.get('beat') ? { km: +params.get('beat'), from: (params.get('from') || 'A friend').slice(0, 24), room: (params.get('room') || '').toUpperCase().slice(0, 6) } : null;
if (CHALLENGE && CHALLENGE.room && !M.myRoom()) M.LB.joinRoom(CHALLENGE.room).then(r => M.setMyRoom(r)).catch(() => {});

function planChapter() {
  const ch = save.chapter;
  const event = C.EVENTS[(ch - 1) % C.EVENTS.length];
  const enc = drawPool('enc', C.ENCOUNTERS, 8, a => a.id);
  let quiz = drawPool('gate', C.GATE_Q, C.STOPS.length - 1, a => a[0]);
  if (ch === 1) { const e = C.GATE_Q.find(q => q[0] === C.EASY_FIRST_Q) || C.GATE_Q[0]; quiz = [e, ...quiz.filter(q => q[0] !== e[0])].slice(0, quiz.length); }   // v9: an easy warm-up question at Ojota
  const road = drawPool('road', C.ROADSIDE, ch % 3 === 0 ? 1 : 2, a => a.id);
  const verse = pickVerse(ch);
  const door = drawPool('door', C.DOOR, 1, a => a.id)[0];
  const quest = drawPool('quest', C.SIDE_QUESTS, 1, a => a.title)[0];
  persist();
  return { event, enc, quiz, road, door, quest, verse, story: C.storyBeat(ch) };
}
function chapterIntro() {
  fadeFlash();
  S.mode = 'intro'; S.paused = true; hudMode(null);
  if (titleDanfo) titleDanfo.visible = false;
  RW.visible = true; CW.visible = false; bridges.forEach(b => b.visible = false); roadGate.visible = false;
  setSky('day', 'day', 0);
  S.plan = planChapter();
  const ch = save.chapter, lvl = lanternLevel();
  Object.assign(S, { score: 0, orbs: 0, hits: 0, quizRight: 0, quizTotal: 0, helpedRun: 0, virtues: {}, log: [], studyRight: 0, studyTotal: 0, verseDone: false, vGot: 0 });
  S.floor = Math.min(45, 12 + lvl * 3); S.lantern = clamp(Math.min(70, save.lantern ?? 50), S.floor, 100);
  const p = S.plan;
  $('#modalBody').innerHTML = `<div class="banner purple"><div class="km">CHAPTER ${ch} · ${esc(p.event.when.toUpperCase())}</div><div class="name">${esc(p.event.title)}</div></div>
    <div class="story">🧑🏾‍🏫 ${esc(p.story.intro)}</div>
    <div class="chips"><span class="chip">🏮 Lantern Lv ${lvl}</span><span class="chip">🛣️ ${esc(p.event.note)}</span><span class="chip">${p.quest.item} Side quest: ${esc(p.quest.title)}</span><span class="chip">📜 Memory verse: ${esc(p.verse.ref)}</span></div>
    <p class="small">Run through the glowing <b>answer gate</b> at each bus stop, and grab 📜 scrolls to build this chapter's memory verse.</p>
    ${ch > 1 ? `<p class="small">Virtues so far: ${Object.keys(save.totals).filter(k => save.totals[k]).map(k => C.VIRTUES[k] + '×' + save.totals[k]).join(' ') || '—'}</p>` : ''}
    <button class="btn primary" id="chGo">Start the journey from Ojota ▶</button><button class="btn ghost" id="chMenu">Main menu</button>`;
  show('modal'); $('#modalBody').scrollTop = 0;
  player.root.position.set(0, 0, 0); player.root.rotation.set(0, Math.PI * 0.85, 0); player.root.visible = true;
  $('#chGo').onclick = () => { sfx.good(); hide('modal'); setMoralNPC(S.plan.road[0]); startRun(); };
  $('#chMenu').onclick = () => { hide('modal'); enterTitle(); };
}

function showEnding() {
  fadeFlash();
  S.mode = 'end'; S.paused = true; hudMode(null);
  const vCount = Object.values(S.virtues).reduce((a, b) => a + b, 0);
  const shown = Object.keys(S.virtues).filter(k => S.virtues[k] > 0);
  const lant = Math.round(S.lantern), bonus = lant * 5 + vCount * 25 + save.chapter * 50;
  S.score += bonus; const total = S.score;
  for (const k of shown) save.totals[k] = (save.totals[k] || 0) + S.virtues[k];
  save.lantern = lant; save.totalScore = (save.totalScore || 0) + total; const doneCh = save.chapter; save.chapter++; persist();
  const hs = JSON.parse(localStorage.getItem('lr3d_high') || 'null'); const isHigh = !hs || total > hs.score;
  if (isHigh) localStorage.setItem('lr3d_high', JSON.stringify({ score: total, name: save.name, chapter: doneCh }));
  const tier = lant >= 85 ? ['A Shining City on a Hill', 'Your lantern is blazing! People could see your light from the gate.'] : lant >= 60 ? ['A Bright and Faithful Light', 'Your light grew all through the journey. Keep tending it!'] : ['A Light That Is Growing', 'Every lantern starts small. God\'s mercy is new every morning, and so is your chance to shine.'];
  const all = Object.keys(C.VIRTUES);
  const vList = all.map(k => `<div class="${S.virtues[k] ? '' : 'off'}">${C.VIRTUES[k]} ${k} <b>×${S.virtues[k] || 0}</b></div>`).join('');
  const homeKeys = shown.length >= 4 ? shown : [...shown, ...shuffle(all.filter(k => !shown.includes(k)))].slice(0, 5);
  const st = S.plan.story; const sv = st.verse && C.V[st.verse];
  const url = /^https?:/.test(location.href) && !/localhost|127\.0\.0\.1/.test(location.host) ? '\n' + location.href.split('?')[0] : '';
  const share = `🏮 Redemption City: Light Run 3D\n${save.name} finished Chapter ${doneCh}: ${S.plan.event.title}!\n✨ Light score: ${total}\n🏮 Lantern: ${lant}% (Lv ${lanternLevel()})\n💛 Virtues this chapter: ${shown.length} ${shown.map(k => C.VIRTUES[k]).join('')}\n📖 Answer gates: ${S.quizRight}/${S.quizTotal}\n📜 ${S.verseDone ? 'Memorised ' + S.plan.verse.ref : 'Verse: ' + S.vGot + '/' + S.plan.verse.parts.length}${S.studyTotal ? '\n🎓 Bible study: ' + S.studyRight + '/' + S.studyTotal : ''}\nCan you shine brighter? (Matthew 5:16)${url}`;
  $('#endBody').innerHTML = `
    <div style="text-align:center;font-size:54px;filter:drop-shadow(0 0 ${8 + lant / 4}px #ffb300)">🏮</div>
    <h2 style="text-align:center;margin:0">Welcome to the Holy Ghost Service, ${esc(save.name)}!</h2>
    <p style="text-align:center;margin:6px 0 2px;color:#d35400;font-weight:900">Chapter ${doneCh} complete · ${tier[0]}</p>
    <p class="small" style="text-align:center">${tier[1]}</p>
    <div class="big-score"><div class="n">${total}</div><div class="small" style="text-align:center">light score ${isHigh ? '· 🏆 new best on this phone!' : `· best: ${hs.score} (${esc(hs.name)})`}</div></div>
    <div class="small">Lantern brightness: <b>${lant}%</b> · Lantern Lv <b>${lanternLevel()}</b></div><div class="meter"><i style="width:${lant}%"></i></div>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} gates</span><span class="chip">📜 ${S.verseDone ? 'Verse memorised' : S.vGot + '/' + S.plan.verse.parts.length + ' verse'}</span>${S.studyTotal ? `<span class="chip">🎓 Study ${S.studyRight}/${S.studyTotal}</span>` : ''}<span class="chip">🤲 ${S.log.filter(l => l.good).length} good choices</span><span class="chip">${S.plan.quest.item} ${K ? K.quest : 0}/${S.plan.quest.n}</span><span class="chip dim">+${bonus} end bonus</span></div>
    <div class="story">🧑🏾‍🏫 ${esc(st.outro)}</div>${sv ? verseHTML(sv) : ''}
    <h3>Virtues you showed (${shown.length}/12)</h3><div class="vgrid">${vList}</div>
    <h3>Why it matters</h3>
    <p style="line-height:1.5;font-size:15px">Points fade, but character lasts. Every time you chose kindness, honesty, purity and putting others first, you let God's light shine through you. We don't earn heaven by good deeds; it's God's gift of grace through Jesus. But people who belong to Him walk in His ways, and their light shines so others see God.</p>
    ${verseHTML(C.V.mat516)}${verseHTML(C.V.heb1214)}${verseHTML(C.V.eph28)}
    <h3>🏠 Carry it home: this week's challenge</h3>
    <ul class="home">${homeKeys.map(k => `<li><b>${C.VIRTUES[k]} ${k}:</b> ${esc(C.CARRY_HOME[k])}</li>`).join('')}</ul>
    <button class="btn primary" id="btnNext">Begin Chapter ${save.chapter} ▶</button>
    <button class="btn green" id="btnShare">📋 Copy my result to share</button>
    <button class="btn ghost" id="btnMenu">Main menu</button>`;
  show('end'); $('#endBody').scrollTop = 0; sfx.good();
  $('#btnShare').onclick = () => copyText(share);
  $('#btnNext').onclick = () => { hide('end'); chapterIntro(); };
  $('#btnMenu').onclick = () => { hide('end'); enterTitle(); };
}
function copyText(t) {
  const done = () => toast('Copied! Paste it in your group chat 📲');
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Take a screenshot instead.'); } ta.remove(); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
}


/* =========================================================
   v6 UI: settings, pause, tutorial, visibility, orientation, PWA
   ========================================================= */
const GFX_NAMES = { auto: 'Auto', high: 'High', balanced: 'Balanced', battery: 'Battery saver' }, TIER_NAMES = { high: 'High', med: 'Balanced', low: 'Battery saver' };
function applyMotion() { document.body.classList.toggle('calm', !!SET.reduceMotion); }
function paintSettings() {
  document.querySelectorAll('#setGfx button').forEach(b => b.classList.toggle('on', b.dataset.v === SET.gfx));
  $('#gfxNote').textContent = SET.gfx === 'auto' ? `Auto picked ${TIER_NAMES[TIER]} for this phone. It adjusts resolution to stay smooth.` : SET.gfx === 'battery' ? 'Locked to 30 fps with simpler shadows: cooler phone, longer battery.' : SET.gfx === 'high' ? 'Sharpest picture with soft shadows. Best on newer phones.' : 'Good balance of sharpness and smoothness.';
  $('#setSound').checked = SET.sound; $('#setMusic').checked = SET.music; $('#setHaptics').checked = SET.haptics; $('#setMotion').checked = SET.reduceMotion;
  $('#hapRow').classList.toggle('hidden', !navigator.vibrate);
}
function openSettings() { ensureAudio(); sfx.tap(); paintSettings(); show('settings'); }
$('#btnSettings').addEventListener('click', openSettings);
$('#setGfx').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; SET.gfx = b.dataset.v; saveSettings(); sfx.tap();
  if (!params.get('gfx') && !LITE) applyQuality(pickTier()); paintSettings();
});
$('#setSound').addEventListener('change', e => { soundOn = SET.sound = e.target.checked; saveSettings(); paintSnd(); ensureAudio(); sfx.tap(); });
$('#setMusic').addEventListener('change', e => { SET.music = e.target.checked; saveSettings(); sfx.tap(); });
$('#setHaptics').addEventListener('change', e => { SET.haptics = e.target.checked; saveSettings(); buzz(20); });
$('#setMotion').addEventListener('change', e => { SET.reduceMotion = e.target.checked; saveSettings(); applyMotion(); sfx.tap(); });
$('#btnTutAgain').addEventListener('click', () => { localStorage.removeItem('lr3d_tut'); sfx.tap(); toast('🎓 The tutorial will play at the start of your next run', 2400); });
applyMotion();

/* ---- pause ---- */
function pauseGame(reason) {
  if (!(S.mode === 'run' || S.mode === 'camp') || S.userPause) return;
  S.userPause = { prev: S.paused }; S.paused = true;
  $('#pauseNote').textContent = reason === 'away' ? 'Paused while you were away.' : 'Take a breath. The road will wait for you.';
  const cpb = $('#btnPauseCP'), canCP = S.mode === 'run' && R && R.cp && !$('#modal').classList.contains('show'); cpb.classList.toggle('hidden', !canCP); if (canCP) cpb.textContent = R.vis ? '🔁 Restart the vision' : R.cp.stopIdx > 0 ? `↩ Restart from ${R.cp.name} bus stop` : '↩ Restart from Lagos (the start)';
  show('pause'); if (actx && actx.state === 'running') actx.suspend();
}
function resumeGame() {
  if (!S.userPause) return; if (R) { R.jbuf = 0; R.sbuf = 0; } S.paused = S.userPause.prev; S.userPause = null; hide('pause'); hide('settings'); hide('howto');
  last = performance.now(); if (actx && soundOn) actx.resume();
  if (S.mode === 'run' && R && !S.paused) R.inv = Math.max(R.inv, 0.6);   // a moment of grace after resuming
}
$('#btnPause').addEventListener('click', e => { e.stopPropagation(); ensureAudio(); sfx.tap(); pauseGame(); });
$('#btnResume').addEventListener('click', () => { sfx.tap(); resumeGame(); });
// v9: restart from the last bus stop straight from the pause menu
$('#btnPauseCP').addEventListener('click', () => { if (S.mode !== 'run' || !R || !R.cp) return; sfx.tap(); S.userPause = null; hide('pause'); ['dialog', 'settings', 'howto'].forEach(hide); S.dlgOpen = false; S.slowmo = false; document.body.classList.remove('dlg-run'); setMoralNPC(S.plan.road[R.moralIdx] || null); bankRun(false); if (R.vis) restartVision(); else restartFrom(R.cp); });
$('#btnPauseSet').addEventListener('click', openSettings);
$('#btnPauseHow').addEventListener('click', () => { sfx.tap(); show('howto'); });
$('#btnQuit').addEventListener('click', () => { sfx.tap(); S.userPause = null; hide('pause'); ['dialog', 'modal', 'settings', 'howto'].forEach(hide); S.paused = false; S.dlgOpen = false; if (R && R.boss) bossEnd(false); enterTitle(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.mode === 'run' || S.mode === 'camp') pauseGame('away'); if (actx && actx.state === 'running') actx.suspend(); }
  else { last = performance.now(); lastDraw = 0; if (actx && !S.userPause && soundOn) actx.resume(); }
});

/* ---- first-run interactive tutorial ---- */
const TUT = [
  ['left', '👈', 'Swipe LEFT to change lane'], ['right', '👉', 'Swipe RIGHT to change lane'],
  ['up', '👆', 'Swipe UP (or tap) to jump', 'Jump potholes, cones and ramps'], ['down', '👇', 'Swipe DOWN to slide', 'Slide under barriers and low signs'],
  ['gate', '⛩️', 'Answer gates', 'The question and its 3 answers (◀ left · ▲ middle · ▶ right) show at the top. Swipe into your answer\'s lane!'],
];
const needTutorial = () => !AUTO && !params.has('notut') && !localStorage.getItem('lr3d_tut');
let tutTimer = 0;
function paintTut() {
  const st = TUT[S.tut.step]; $('#tutHand').textContent = st[1]; $('#tutHand').className = 'tuthand ' + st[0];
  $('#tutTxt').innerHTML = esc(st[2]) + (st[3] ? `<small>${esc(st[3])}</small>` : '');
  $('#tutDots').innerHTML = TUT.map((_, i) => `<i class="${i < S.tut.step ? 'done' : i === S.tut.step ? 'on' : ''}"></i>`).join('');
  $('#tut .tutbox').classList.remove('ok');
}
function startTutorial() {
  S.tut = { step: 0 }; S.tutSlow = 0.55; if (R) R.nextRow = 1e9;   // calm, empty road while learning
  show('tut'); $('#tut').classList.remove('hidden'); paintTut();
}
function tutAct(kind) {
  const st = TUT[S.tut.step]; if (!st || st[0] !== kind || S.tut.wait) return;
  S.tut.wait = true; buzz(12); sfx.stop(); $('#tutTxt').innerHTML = '✅ Nice!'; $('#tut .tutbox').classList.add('ok');
  clearTimeout(tutTimer); tutTimer = setTimeout(() => { if (!S.tut) return; S.tut.wait = false; S.tut.step++; paintTut(); if (TUT[S.tut.step][0] === 'gate') tutTimer = setTimeout(() => endTutorial(), 4000); }, 650);
}
function endTutorial(silent) {
  clearTimeout(tutTimer); if (!S.tut) return;
  S.tut = null; S.tutSlow = 0; $('#tut').classList.add('hidden'); localStorage.setItem('lr3d_tut', '1');
  if (R && R.nextRow > 1e8) R.nextRow = 25;
  if (!silent && S.mode === 'run') { toast('🏃🏾 You\'re ready! Run Lagos → KM 46!', 2400); sfx.good(); }
}
$('#tutSkip').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); endTutorial(); });

/* ---- orientation + install ---- */
function tryLockPortrait() { try { if (screen.orientation && screen.orientation.lock && (document.fullscreenElement || matchMedia('(display-mode: standalone)').matches)) screen.orientation.lock('portrait').catch(() => {}); } catch (e) {} }
document.addEventListener('pointerdown', tryLockPortrait, { once: true, passive: true });
if ('serviceWorker' in navigator && (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || params.has('sw'))) {
  const reg = () => navigator.serviceWorker.register('sw.js').then(() => { window.__lrSW = 'registered'; }).catch(e => { window.__lrSW = 'failed: ' + e.message; });
  if (document.readyState === 'complete') setTimeout(reg, 1500); else window.addEventListener('load', () => setTimeout(reg, 1500));
}

/* =========================================================
   LOOP + auto quality
   ========================================================= */
let last = performance.now(), lastDraw = 0;
const perf = { t: 0, n: 0, lowered: LITE, fps: 0 };
/* ---- quality tiers + dynamic resolution ---- */
const DYN = { acc: 0, n: 0, bad: 0, target: 1000 / 60, on: !params.has('noauto') && !params.has('nodyn') };
function setPR(v) { v = Math.round(clamp(v, Q.prMin, Q.prMax) * 20) / 20; if (v !== PR) { PR = v; renderer.setPixelRatio(PR); resize(); } }
function sceneryOutlines(on) {
  const f = o => { if (o.userData.outline) o.visible = on; };
  for (const r of roadside) r.obj.traverse(f); for (const h of walkers) h.root.traverse(f);
  palms.children[0].visible = TIER !== 'low'; lamps.children[0].visible = TIER !== 'low';
}
function applyQuality(tier) {
  TIER = tier; Q = QUALITY[tier]; setCharTier(tier);
  if (renderer.shadowMap.enabled !== Q.shadows) { renderer.shadowMap.enabled = Q.shadows; sun.castShadow = Q.shadows; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); }
  if (sun.shadow.mapSize.x !== Q.shadowSize) { sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  sceneryOutlines(Q.sceneryOutlines);
  DYN.target = Q.cap === 30 ? 1000 / 30 : 1000 / 60; DYN.acc = DYN.n = DYN.bad = 0;
  setPR(Q.prMax); document.body.dataset.tier = tier;
}
function lowerQuality() {   // auto step-down (only in Auto mode)
  const next = TIER === 'high' ? 'med' : 'low'; if (next === TIER) return;
  perf.lowered = true; applyQuality(next); toast('Graphics optimised for your phone ⚡', 2000);
}
// sample real frame times; nudge resolution toward the 60 fps (or 30 fps) budget
function dynRes(ms) {
  if (!DYN.on || TIME_SCALE !== 1 || S.paused || !(S.mode === 'run' || S.mode === 'camp')) return;
  DYN.acc += ms; DYN.n++;
  if (DYN.acc < 1000) return;
  const avg = DYN.acc / DYN.n; DYN.acc = DYN.n = 0; perf.fps = 1000 / avg;
  if (avg > DYN.target * 1.15) {
    if (PR > Q.prMin + 0.01) setPR(PR - (avg > DYN.target * 1.6 ? 0.15 : 0.08));
    else if (DYN.target < 20 && avg > 24) DYN.target = 1000 / 30;               // can't hold 60: settle on a steady 30
    else if (avg > 40 && ++DYN.bad >= 3 && SET.gfx === 'auto' && !params.get('gfx')) { DYN.bad = 0; lowerQuality(); }
  } else if (avg < DYN.target * 0.8 && PR < Q.prMax - 0.01) setPR(PR + 0.05);
  else DYN.bad = 0;
}
const FT = { on: false, list: [] };   // frame-time recorder for benchmarks (rendered frames only)
const LAT = { t0: 0, list: [] };       // input → first rendered frame latency
function loop(now) {
  requestAnimationFrame(loop);
  // Battery saver: cap at 30 fps (skip every other vsync), saves heat + battery
  if (Q.cap === 30 && now - lastDraw < 30 && !LAT.t0) return;
  const frameMs = now - (lastDraw || now); lastDraw = now;
  let dt = Math.min(0.05, (now - last) / 1000); const real = dt; last = now; dt *= TIME_SCALE; S.rdt = real;
  S.t += dt;
  dynRes(frameMs);
  if (S.slowmo && S.mode === 'run') dt *= 0.04;
  if (S.tutSlow && S.mode === 'run' && !S.paused) dt *= S.tutSlow;
  const steps = Math.max(1, Math.ceil(dt / (1 / 50)));
  for (let i = 0; i < steps; i++) {
    const d = dt / steps;
    if (S.mode === 'title') { updateTitle(dt); break; }
    if (S.mode === 'select') { updateSelect(dt); break; }
    if (S.paused) break;
    if (S.mode === 'run') updateRun(d); else if (S.mode === 'camp') updateCamp(d);
  }
  if (S.mode === 'intro') { poseHuman(player, 'idle', dt); camera.position.lerp(_pv.set(1.6, 1.7, -3.6), 0.06); camera.lookAt(0, 1.3, 0); sunFollow(0, 0); fx.update(dt, 0, 0); lanternHalo(0); }
  musicTick(); SWAY_T.value = S.t; WATER_T.value = S.t;
  if (player && blobP) { blobP.position.set(player.root.position.x, 0.03, player.root.position.z); const k = 1 - Math.min(0.6, player.root.position.y * 0.3); blobP.scale.set(1.5 * k, 1.5 * k, 1); blobP.visible = player.root.visible && S.mode !== 'title'; }
  sky.position.copy(camera.position); clouds.position.set(camera.position.x, 0, camera.position.z); clouds.rotation.y += dt * 0.004;
  // while a bottom sheet is open (run or camp), slide the view up so the player stays visible above it
  S.vo = lerp(S.vo || 0, S.dlgOpen && (S.mode === 'run' || S.mode === 'camp') ? 0.2 : 0, Math.min(1, real * 6));
  if (S.vo > 0.002) camera.setViewOffset(innerWidth, innerHeight, 0, S.vo * innerHeight, innerWidth, innerHeight); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  renderer.render(scene, camera);
  if (FT.on && frameMs > 0) FT.list.push(frameMs);
  if (LAT.t0) { LAT.list.push(performance.now() - LAT.t0); if (LAT.list.length > 200) LAT.list.shift(); LAT.t0 = 0; }
}
applyQuality(TIER);
enterTitle();
// prewarm: compile every shader + obstacle pool now so the first danfo / boss doesn't hitch mid-run
prewarm();
{ const l = $('#loading'); if (window.__lrProgress) window.__lrProgress(1, 'Ready'); l.classList.add('out'); setTimeout(() => l.remove(), 400); }
window.__lr3dReady = true;
requestAnimationFrame(loop);

window.LR = {
  ftStart() { FT.list = []; FT.on = true; }, ftStop() { FT.on = false; return FT.list.slice(); },
  get latency() { const l = LAT.list.slice().sort((a, b) => a - b); return { n: l.length, avg: l.length ? +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(1) : 0, p95: l.length ? +l[Math.floor(l.length * 0.95)].toFixed(1) : 0 }; },
  get q() { return { tier: TIER, auto: AUTO_TIER, pr: PR, shadows: renderer.shadowMap.enabled, gpu: GPU, target: Math.round(1000 / DYN.target) }; },
  setTier(t) { applyQuality(t); },
  playerBox() { const b = new THREE.Box3().setFromObject(player.root); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return { left: (x0 + 1) / 2, right: (x1 + 1) / 2, top: (1 - y1) / 2, bottom: (1 - y0) / 2, h: (y1 - y0) / 2 }; },
  get state() { return { mode: S.mode, paused: S.paused, score: S.score, lantern: S.lantern, chapter: save && save.chapter, stop: R && R.stopIdx, dist: R && R.dist, met: K && K.met, fps: perf.fps, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lowered: perf.lowered, tier: TIER, pr: PR }; },
  skipRun() { if (R) { R.dist = RUN_LEN - 3; R.stopIdx = C.STOPS.length - 1; R.moralIdx = 3; setMoralNPC(null); } },
  near(i) { if (!K) return; const h = K.enc[i]; K.x = h.root.position.x; K.z = h.root.position.z + 2.2; K.tx = null; },
  campAt(x, z) { if (K) { K.x = x; K.z = z; K.tx = null; } },
  door() { if (K) { K.x = DOOR[0]; K.z = DOOR[1] + 3; } },
  hit(t) { if (R && S.mode === 'run') onHit({ type: t, jump: OBS[t].jump, big: !!OBS[t].big, obj: new THREE.Object3D() }); },
  power(k) { if (R) activatePower(k); },
  get riseOk() { return R ? R.riseOk : -1; },
  study() { if (K) { K.x = K.funke.root.position.x; K.z = K.funke.root.position.z + 2.2; K.tx = null; } },
  get gate() { return R && R.gate ? { idx: R.gate.idx, shown: R.gate.shown, done: R.gate.done, gd: gateGD(R.gate), vi: R.gate.vi, lane: R.lane, correct: R.gate.correctLane } : null; },
  get run() { return R ? { combo: R.combo, fire: R.fire, shield: R.shield, magnet: R.magnet, dark: R.dark, revived: R.revived, cp: R.cp && R.cp.name, speed: R.speed, vGot: R.vGot, parts: S.plan.verse.parts.length, quizRight: S.quizRight, quizTotal: S.quizTotal, moral: R.moralIdx } : null; },
  get encCount() { return K ? K.enc.length : 0; },
  pattern(k) { FORCE.pattern = k; if (R) R.nextRow = Math.min(R.nextRow, 1); },
  km(k) { if (!R) return; if (R.vis) leaveVisionWorld(); if (R.boss) bossEnd(false); hideGateUI(); R.dist = k * UPK; R.stopIdx = STOP_D.findIndex(d => d > R.dist); R.gate = null; R.kmInt = Math.floor(k); R.nextScrollD = R.dist + 100; clearObs(); R.nextRow = 30; R.zone = -1;
    let mi = 0; while (mi < MORAL_AFTER.length && moralDist(mi) < R.dist - 1) mi++; if (mi !== R.moralIdx) { R.moralIdx = mi; setMoralNPC(S.plan.road[mi] || null); } },
  get j() { return R ? { km: KM(R.dist), zone: zoneAt(KM(R.dist)).id, boss: R.boss && R.boss.id, bossDone: Object.keys(R.bossDone), py: R.py, onGround: R.onGround, sl: R.sl, grind: R.grind, grindM: R.grindM, roofs: R.roofs, slides: R.slides, speed: R.speed, lane: R.lane, burst: R.burst } : null; },
  get meta() { return { wallet: M.wallet(), daily: M.dailyState(), list: M.dailyFor().map(c => c.id), streak: M.streak(), best: M.bestKm(), room: M.myRoom() }; },
  give(n) { M.earn(n); },
  debugPx() { return R ? R.px : null; },
  god(on) { if (R) R.god = !!on; },
  get unfair() { return R ? R.unfair || null : null; },
  get campPos() { return K ? { x: +K.x.toFixed(3), z: +K.z.toFixed(3), tx: K.tx } : null; },
  dark(k) { if (R) R.forceDark = k || 0; },
  get acts() { return R ? { uiAgo: Math.round(performance.now() - UI_T), ...(R.acts || { move: 0, jump: 0, slide: 0, ramp: 0 }), lane: R.lane, py: +R.py.toFixed(2), sl: +R.sl.toFixed(2), wings: R.wings || 0, grind: !!R.grind } : null; },
  vision(id) { startVisionRun(id || 'genesis'); },
  visD(d) { if (R && R.vis) { const V = R.vis; if (V.boss && d < VIS_BOSS[0]) visBossEnd(false); V.d = d; while (V.gi < V.gates.length && V.gates[V.gi] < d - 2) V.gi++; R.gate = null; hideGateUI(); clearObs(); R.nextRow = 20; V.nextScrollD = d + 40; V.nextPowerD = d + 60; } },
  get vis() { const V = R && R.vis; return V ? { id: V.id, d: Math.round(V.d), len: V.len, gi: V.gi, right: V.right, total: V.total, vGot: V.vGot, parts: V.verse.parts.length, boss: !!V.boss, bossDone: V.bossDone, bossK: +V.bossK.toFixed(2), finished: !!V.finished, journey: V.journey, wings: +(R.wings || 0).toFixed(2), py: +R.py.toFixed(2), lamps: !!V.W.lamps, chariots: chariots.filter(c => c.on).length, speed: +R.speed.toFixed(1) } : null; },
  get visBook() { return R ? { book: R.visBook, skip: R.visSkip, portalD: visPortalD(), last: R.lastVision || null } : null; },
  get bible() { return bible(); },
  bibleMap() { openBibleMap(); },
  bookCard(id) { openBibleMap(); openBookCard(id); },
  combo(n) { if (R) addCombo(n); },
  get v9() { return R ? { gentle: isGentle(), moralD: MORAL_AFTER.map((_, i) => +KM(moralDist(i)).toFixed(2)), moralIdx: R.moralIdx, nearN: R.nearN || 0, kick: R.kick || 0, dlg: !!S.dlgOpen, fov: +camera.fov.toFixed(1) } : null; },
  look(l, rot) { if (S.mode !== 'select') return false; selLook = LK.fixLook({ ...selLook, ...l }); selG = selLook.gender; if (rot != null) selRot = rot; selIdle = -999; paintSelect(); return true; },
  face(e) { if (player) setExpression(player, e, 3); },
  dbg() { // draw-call breakdown of visible meshes (debug)
    const out = {}; let n = 0;
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)), tri = {};
    scene.updateMatrixWorld();
    scene.traverseVisible(o => { if (!(o.isMesh || o.isPoints || o.isSprite)) return; if (o.isMesh && o.frustumCulled && o.geometry.boundingSphere !== undefined) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); if (!fr.intersectsObject(o)) return; } let top = o; while (top.parent && top.parent !== scene && top.parent !== RW && top.parent !== CW) top = top.parent; const k = (top.parent === RW ? 'RW:' : top.parent === CW ? 'CW:' : 'S:') + (top.userData.tag || top.type) + (o.userData.outline ? ':ol' : ''); out[k] = (out[k] || 0) + 1; n++; if (o.isMesh) { const g = o.geometry, c = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); tri[k] = (tri[k] || 0) + Math.round(c); } });
    return { n, out, tri };
  },
};
