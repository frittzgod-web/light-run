// Redemption City: Light Run 3D — main game
import { RIM, SWAY_T, swayMats } from './toon.js';
import { THREE, toon, VC, outline, P, G, merge, mergedMesh, canvasTex, signTex, signMesh, SOFT, CLOUD, Particles, makeHuman, poseHuman, randomLook, PLAYER_OUTFITS, SKINS } from './toon.js';
import { danfo, truck, okada, cones, pothole, hawker, palmGeo, treeGeo, building, billboard, stall, streetLightGeo, bridge, setBridgeSign, gateArch, lanternMesh, textSprite } from './props.js';
import * as C from './content.js';

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
const AUTO = params.has('autopilot'), AUTO_MIX = params.get('autopilot') === 'mix';

/* ---------------- WebGL check ---------------- */
function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) { $('#loading').remove(); $('#nogl').classList.add('show'); throw new Error('WebGL unavailable'); }

/* ---------------- Renderer / scene ---------------- */
const canvas = $('#c3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
let PR = Math.min(window.devicePixelRatio || 1, LITE ? 1 : 1.5);
renderer.setPixelRatio(PR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = !LITE; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 700);
scene.fog = new THREE.Fog(0xbfe6ff, 70, 250);
const hemi = new THREE.HemisphereLight(0xfff4dd, 0x6a8a3a, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.4); sun.castShadow = !LITE;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 }); sun.shadow.bias = -0.0015;
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
  evening: { top: '#2a3a96', mid: '#ffae74', bot: '#4c6b3a', fog: '#f7c093', sun: '#ffc690', sunI: 2.0, hemiS: '#ffe6c8', hemiG: '#5e7a3a', hemiI: 1.45, sunPos: [-0.6, 0.12, -1] },
};
const _ca = new THREE.Color(), _cb = new THREE.Color();
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
const fx = new Particles(260); scene.add(fx.points);
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
let soundOn = localStorage.getItem('lr_sound') !== 'off', actx = null;
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
  if (!soundOn || !actx || S.mode !== 'run' || S.paused || !R) { MUS.next = 0; return; }
  const bpm = Math.min(156, 92 + (R.speed - 11) * 3.6 + (R.fire > 0 ? 14 : 0)), stepDur = 60 / bpm / 2;
  const lvl = R.fire > 0 ? 4 : R.speed < 14 ? 0 : R.speed < 18 ? 1 : R.speed < 22 ? 2 : 3;
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
};
const sndBtn = $('#snd');
const paintSnd = () => sndBtn.textContent = soundOn ? '🔊' : '🔇';
sndBtn.addEventListener('click', e => { e.stopPropagation(); ensureAudio(); soundOn = !soundOn; localStorage.setItem('lr_sound', soundOn ? 'on' : 'off'); paintSnd(); sfx.tap(); });
paintSnd();

/* ---------------- UI helpers ---------------- */
const show = id => $('#' + id).classList.add('show');
const hide = id => $('#' + id).classList.remove('show');
let toastT = 0;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { sfx.tap(); hide(b.dataset.close); }));
const verseHTML = v => `<div class="verse">“${esc(v[0])}”<b>${esc(v[1])} (KJV)</b></div>`;

/* ---------------- Save ---------------- */
const SAVE_KEY = 'lr3d_save';
function freshSave() { return { name: 'Pilgrim', gender: 'm', outfit: 0, skin: 1, chapter: 1, totals: {}, lantern: 50, totalScore: 0, used: {} }; }
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
  const v = S.plan.verse, got = R.vGot, el = $('#hVerse');
  el.innerHTML = `<span class="vi">📜</span> ${v.parts.map((p, i) => i < got ? `<b>${esc(p)}</b>` : '<i>▢</i>').join(' ')} <span class="ref">${esc(v.ref)}</span>`;
  if (pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

/* ---------------- Player ---------------- */
let player = null, lantern = null, lanternLight = null;
function lookFromSave(sv) {
  const of = PLAYER_OUTFITS[sv.gender][sv.outfit % 3];
  return { ...of, gender: sv.gender, skin: SKINS[sv.skin % SKINS.length], skirt: sv.gender === 'f' ? of.skirt : null, kid: false, old: false };
}
function buildPlayer(sv = save || freshSave()) {
  if (player && player.root.parent) player.root.parent.remove(player.root);
  player = makeHuman(lookFromSave(sv), true);
  player.root.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
  lantern = lanternMesh(); lantern.position.set(0, -0.42, 0.05); player.R.el.add(lantern);
  lanternLight = new THREE.PointLight(0xffd27a, 0, 9, 1.6); lantern.add(lanternLight);
  scene.add(player.root); player.root.visible = true;
}

/* =========================================================
   EXPRESSWAY WORLD
   ========================================================= */
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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), toon('#ffffff', { map: grassTex })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -150); ground.receiveShadow = true; RW.add(ground);
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
const palms = swayInst(palmGeo(), 70, 0.06); RW.add(palms);
const palmData = [];
for (let i = 0; i < 70; i++) { const right = i % 3 !== 0; palmData.push({ x: right ? (Math.random() < 0.6 ? rand(7.5, 12) : rand(26, 60)) : rand(-21, -60), z: rand(-300, 25), s: rand(0.8, 1.25), r: rand(0, 6.28) }); }
const lamps = new THREE.InstancedMesh(streetLightGeo(), VC, 11); outline(lamps, 0.05); RW.add(lamps);
const lampData = Array.from({ length: 11 }, (_, i) => ({ x: -6.5, z: 25 - i * 30, s: 1, r: 0 }));
const _mtx = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sv = new THREE.Vector3(), _pv = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function writeInst(mesh, data) {
  data.forEach((d, i) => { _q.setFromAxisAngle(_up, d.r); _mtx.compose(_pv.set(d.x, 0, d.z), _q, _sv.setScalar(d.s)); mesh.setMatrixAt(i, _mtx); });
  mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
}
const roadside = [];
function addSide(obj, x, z, ry, span = 330) { obj.position.set(x, 0, z); obj.rotation.y = ry; RW.add(obj); roadside.push({ obj, span }); }
for (let i = 0; i < 10; i++) addSide(building(), rand(15, 20), -300 + i * 33, -Math.PI / 2);
for (let i = 0; i < 8; i++) addSide(building(), rand(-24, -28), -300 + i * 41, Math.PI / 2);
for (let i = 0; i < 5; i++) addSide(billboard(), rand(12, 14), -290 + i * 66, -0.45);
for (let i = 0; i < 3; i++) addSide(billboard(), -22, -250 + i * 110, 0.45);
for (let i = 0; i < 7; i++) addSide(stall(), rand(8.6, 10.5), -300 + i * 47, rand(0, 6));
const walkers = [];
for (let i = 0; i < 4; i++) { const h = makeHuman(randomLook({ gender: pick(['m', 'f']) }), false); h.root.position.set(rand(7, 7.8), 0, -60 * i); RW.add(h.root); walkers.push(h); }
const oncoming = [];
for (let i = 0; i < 4; i++) { const v = i % 3 === 2 ? truck() : danfo(); v.rotation.y = Math.PI; v.position.set(i % 2 ? -10.6 : -15.2, 0, -80 * i); RW.add(v); oncoming.push(v); }
const bridges = [bridge(), bridge()]; bridges.forEach(b => { b.visible = false; RW.add(b); });
const roadGate = gateArch(14.5); roadGate.visible = false; RW.add(roadGate);
const ORB_N = 80;
const orbMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: 0xffe14a }), ORB_N); orbMesh.frustumCulled = false; RW.add(orbMesh);
const orbs = Array.from({ length: ORB_N }, () => ({ on: false, x: 0, y: 1, z: 0 }));
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

/* ---- verse scrolls ---- */
const scrolls = [];
for (let i = 0; i < 3; i++) {
  const m = mergedMesh([
    P(G.cyl, '#fff1cf', 0, 0, 0, 0, 0, Math.PI / 2, 0.55, 1.3, 0.55),
    P(G.cyl, '#a0522d', -0.74, 0, 0, 0, 0, Math.PI / 2, 0.7, 0.18, 0.7), P(G.cyl, '#a0522d', 0.74, 0, 0, 0, 0, Math.PI / 2, 0.7, 0.18, 0.7),
    P(G.box, '#d32f2f', 0, 0, 0, 0, 0, 0, 0.16, 0.6, 0.6)], 0.05, false);
  m.visible = false; RW.add(m); scrolls.push({ obj: m, on: false, lane: 1 });
}
function hideScrolls() { scrolls.forEach(s => { s.on = false; s.obj.visible = false; }); }

/* ---- power-ups (Biblically framed) ---- */
const POWERS = {
  fire: { icon: '🔥', name: 'Holy Ghost Fire', ref: 'Acts 2:3', dur: 5, col: [1, 0.5, 0.15], line: 'cloven tongues like as of fire' },
  shield: { icon: '🛡️', name: 'Shield of Faith', ref: 'Ephesians 6:16', dur: 20, col: [0.4, 0.8, 1], line: 'quench all the fiery darts' },
  lamp: { icon: '🏮', name: 'Lamp unto my feet', ref: 'Psalm 119:105', dur: 8, col: [1, 0.85, 0.35], line: 'Thy word is a lamp unto my feet' },
};
const powerUps = Object.keys(POWERS).map(k => {
  const g = new THREE.Group(); const ic = textSprite(POWERS[k].icon, 1.5); ic.material.depthTest = true; ic.renderOrder = 0;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 8, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(...POWERS[k].col), toneMapped: false }));
  const pg = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: new THREE.Color(...POWERS[k].col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pg.scale.set(4, 4, 1);
  g.add(pg, ic, ring); g.visible = false; RW.add(g); return { k, g, ring, on: false, lane: 1 };
});
const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.45, 20, 14), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
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
  danfo: { make: danfo, rel: 0.55, jump: false, len: 4.6 },
  truck: { make: truck, rel: 0.6, jump: false, len: 8 },
  okada: { make: okada, rel: 0.45, jump: false, len: 2.2 },
  hawker: { make: hawker, rel: 1, jump: false, len: 0.9 },
};
const freeObs = {}, active = [];
function spawnObs(type, lane, z) {
  freeObs[type] = freeObs[type] || [];
  let obj = freeObs[type].pop();
  if (!obj) { obj = OBS[type].make(); if (type !== 'pothole') { obj.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; }); const L = OBS[type].len; addBlob(obj, type === 'cone' ? 1.6 : type === 'hawker' ? 1.3 : 2.9, Math.max(1.4, L * 1.15)); } }
  obj.position.set(LANES[lane], 0, z); RW.add(obj);
  active.push({ type, lane, obj, hit: false, ex: 0, ...OBS[type] });
}
function clearObs(filter = () => true) {
  for (let i = active.length - 1; i >= 0; i--) { const a = active[i]; if (filter(a)) { RW.remove(a.obj); freeObs[a.type].push(a.obj); active.splice(i, 1); } }
}
function spawnOrb(x, y, z) { const o = orbs.find(o => !o.on); if (o) Object.assign(o, { on: true, x, y, z }); }

const FIRST = 150, GAP = 200, SPAWN_Z = -140;
const stopDist = i => FIRST + i * GAP;
const RUN_LEN = stopDist(C.STOPS.length - 1);
let R = null;
function moveProps(move) {
  for (const d of palmData) { d.z += move; if (d.z > 25) d.z -= 330; }
  for (const d of lampData) { d.z += move; if (d.z > 25) d.z -= 330; }
  writeInst(palms, palmData); writeInst(lamps, lampData);
  for (const r of roadside) { r.obj.position.z += move; if (r.obj.position.z > 30) r.obj.position.z -= r.span; }
  for (const h of walkers) { h.root.position.z += move * 1.05; if (h.root.position.z > 25) h.root.position.z -= 300; }
  roadTex.offset.y += move / 8; grassTex.offset.y += move / 10; kerbTex.offset.y += move * 110 / 320;
}
function startRun() {
  fadeFlash();
  S.mode = 'run'; S.paused = false;
  RW.visible = true; CW.visible = false; scene.add(player.root); player.root.visible = true; player.root.position.set(0, 0, 0); player.root.rotation.set(0, Math.PI, 0);
  clearObs(); orbs.forEach(o => o.on = false); fx.clear();
  R = { combo: 0, comboT: 0, fire: 0, shield: false, shieldT: 0, magnet: 0, stumble: 0, lastStumble: -99, dark: 0, revived: false, nextPowerD: 240, popT: 0, dist: 0, t: 0, speed: 11, lane: 1, px: 0, camX: 0, py: 0, jt: 0, inv: 0, shake: 0, nextRow: 30, stopIdx: 0, moralIdx: 0, dustT: 0, ev: S.plan.event, gate: null, vGot: 0, nextScrollD: 70, autoT: 0, flash: 0, signFlash: null };
  R.scrollGap = (RUN_LEN - 260) / (S.plan.verse.parts.length + 2.5);
  hideScrolls(); answerGate.visible = false; $('#hQ').classList.add('hidden');
  R.cp0 = R.cp = snapCP(0, 0, 'Ojota (the start)');
  hudMode('run'); verseHUD(); powerHUD();
  toast('Swipe ⬅️ ➡️ to change lane · Swipe ⬆️ or tap to jump · Grab 📜 scrolls!', 3400);
}
const JT = 0.66;
function runMove(d) { const n = clamp(R.lane + d, 0, 2); if (n !== R.lane) { R.lane = n; sfx.tap(); } }
function runJump() { if (R.jt <= 0) { R.jt = JT; sfx.jump(); } }
const MAX_SPEED = 28;
function runSpeed() {
  const ch = save.chapter, p = clamp(R.dist / RUN_LEN, 0, 1);
  const base = 11.5 + Math.min(6, (ch - 1) * 0.75);
  return Math.min(MAX_SPEED, base * Math.min(1, 0.6 + R.t * 0.16) + 9.5 * p);
}
function rowGap() { return Math.max(13, 31 - (R.speed - 11) * 1.05) / Math.sqrt(R.ev.mod.traffic); }
const readDist = () => clamp(R.speed * 6, 95, 150);
function inGateZone(arrive) {
  for (const i of [R.stopIdx, R.stopIdx + 1]) { if (i >= C.STOPS.length - 1) continue; const gz = gateDist(i); if (arrive > gz - readDist() - 6 && arrive < stopDist(i) + 8) return true; }
  return false;
}
function spawnRow() {
  const sp = R.speed, ch = save.chapter, tr = R.ev.mod.traffic, easy = sp < 14.5 && ch === 1;
  const pool = easy ? ['pothole', 'cone', 'danfo', 'pothole'] : sp < 19 ? ['pothole', 'cone', 'danfo', 'okada', 'hawker', 'danfo'] : ['pothole', 'cone', 'danfo', 'okada', 'truck', 'hawker', 'danfo', 'okada'];
  if (tr > 1.3) pool.push('danfo', 'truck');
  if (R.ev.mod.rain) pool.push('pothole', 'pothole');
  const two = Math.random() < Math.min(0.72, (easy ? 0 : 0.2) + Math.max(0, sp - 13) * 0.04 + (tr - 1) * 0.3);
  const lanes = shuffle([0, 1, 2]); const n = two ? 2 : 1;
  for (let i = 0; i < n; i++) spawnObs(pick(pool), lanes[i], SPAWN_Z - i * rand(0, 3));
  const free = lanes[n], cnt = 4 + Math.floor(Math.random() * 3);
  for (let k = 0; k < cnt; k++) spawnOrb(LANES[free], 1.0, SPAWN_Z - 4 - k * 2.6);
  const first = active[active.length - n];
  if (first && first.jump && Math.random() < 0.6) for (let k = -1; k <= 1; k++) spawnOrb(LANES[first.lane], 2.3 - Math.abs(k) * 0.5, SPAWN_Z + k * 1.6);
}
let moralNPC = null;
function setMoralNPC(m) {
  if (moralNPC) RW.remove(moralNPC.root);
  if (!m) { moralNPC = null; return; }
  moralNPC = makeHuman(randomLook(m.look), false);
  const mk = textSprite('❗', 1.4); mk.position.y = 3.1; moralNPC.root.add(mk); moralNPC.mark = mk;
  moralNPC.root.position.set(6.6, 0, -999); RW.add(moralNPC.root);
}
const MORAL_AFTER = [2, 6];
function updateRun(dt) {
  const ch = save.chapter, ev = R.ev;
  R.t += dt;
  if (R.stumble > 0) R.stumble -= dt;
  R.speed = runSpeed() * (R.stumble > 0 ? 1 - 0.5 * (R.stumble / 0.9) : 1) * (R.fire > 0 ? 1.35 : 1);
  if (AUTO) autoSteer(dt);
  updatePowers(dt);
  const move = R.speed * dt; R.dist += move;
  moveProps(move);
  for (const v of oncoming) { v.position.z += move + 18 * dt; if (v.position.z > 30) { v.position.z = -300 - rand(0, 60); v.position.x = Math.random() < 0.5 ? -10.6 : -15.2; } }
  R.px += (LANES[R.lane] - R.px) * Math.min(1, dt * 12);
  const wasAir = R.py > 0.05;
  if (R.jt > 0) { R.jt -= dt; R.py = Math.sin(Math.PI * clamp(1 - R.jt / JT, 0, 1)) * 2.1; } else R.py = 0;
  if (wasAir && R.py <= 0.05) for (let i = 0; i < 8; i++) fx.emit(R.px + rand(-0.3, 0.3), 0.15, rand(-0.2, 0.4), rand(-2, 2), rand(0.3, 1), rand(-1, 1), 0.6, 0.7, '#e2c39a', 2);
  if (R.inv > 0) R.inv -= dt; if (R.shake > 0) R.shake -= dt;
  player.root.position.set(R.px, R.py, 0);
  player.root.rotation.z = (R.px - LANES[R.lane]) * 0.08;
  player.root.visible = !(R.inv > 0 && Math.floor(S.t * 14) % 2 === 0);
  poseHuman(player, R.py > 0.05 ? 'jump' : 'run', dt, R.speed / 14);
  if (R.stumble > 0.4) player.root.rotation.x = Math.sin((0.9 - R.stumble) * 9) * 0.35; else player.root.rotation.x = 0;
  R.dustT -= dt; if (R.dustT <= 0 && R.py < 0.05) { R.dustT = 0.05; fx.emit(R.px + rand(-0.2, 0.2), 0.12, 0.35, rand(-0.6, 0.6), rand(0.4, 1.0), rand(0.5, 1.5), 0.55, 0.45, '#e6c9a0', 2.2); }
  if (ev.mod.rain) for (let i = 0; i < 3; i++) fx.emit(R.px + rand(-14, 14), rand(8, 14), rand(-30, 4), 0, -26, 0, 0.5, 0.18, '#cfe8ff', 0);
  const nextStop = stopDist(R.stopIdx), moral = S.plan.road[R.moralIdx];
  const moralD = moral ? stopDist(MORAL_AFTER[R.moralIdx]) + 30 : Infinity;
  R.nextRow -= move;
  if (R.nextRow <= 0) {
    const arrive = R.dist - SPAWN_Z;
    const quiet = inGateZone(arrive) || (arrive > moralD - 35 && arrive < moralD + 8) || arrive > RUN_LEN - 30;
    if (!quiet) spawnRow();
    else if (arrive < RUN_LEN - 30 && Math.random() < 0.5) { const l = Math.floor(Math.random() * 3); for (let k = 0; k < 4; k++) spawnOrb(LANES[l], 1.0, SPAWN_Z - k * 2.6); }
    R.nextRow = rowGap() + rand(0, 6);
  }
  const px = R.px, air = R.py > 0.6;
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i]; a.obj.position.z += move * a.rel;
    if (a.type === 'okada') a.obj.position.x = LANES[a.lane] + Math.sin(S.t * 2 + i) * 0.25;
    if (a.type === 'hawker') poseHuman(a.obj.userData.human, 'carry', dt, 0.6);
    if (a.obj.userData.exhaust && (a.ex -= dt) <= 0) { a.ex = 0.07; const e = a.obj.userData.exhaust; fx.emit(a.obj.position.x + e[0], e[1], a.obj.position.z + e[2], rand(-0.3, 0.3), rand(0.6, 1.2), 1.5, 0.9, 0.55, '#8d8d8d', 2.5); }
    if (a.fly) { a.obj.position.y += a.fly * dt; a.fly -= 22 * dt; a.obj.rotation.x += dt * 7; a.obj.position.x += a.fx * dt; if (a.obj.position.y < -3) a.obj.position.z = 99; }
    const z = a.obj.position.z, dx = Math.abs(a.obj.position.x - px);
    if (!a.hit && Math.abs(z) < a.len / 2 + 0.45 && dx < 1.4 && !(a.jump && air) && (R.inv <= 0 || R.fire > 0)) {
      a.hit = true;
      if (onHit(a)) return;
    }
    if (!a.hit && !a.nm && z > -0.3 && z < a.len / 2 + 0.6) {
      if (!a.jump && a.type !== 'hawker' && dx > 1.6 && dx < 3.9 && R.py < 0.8) { a.nm = true; nearMiss('😮 Close one!', 15); }
      else if (a.jump && dx < 1.4 && air) { a.nm = true; nearMiss('🦘 Leap of faith!', 10); }
    }
    if (z > 22) { RW.remove(a.obj); freeObs[a.type].push(a.obj); active.splice(i, 1); }
  }
  let hi = 0;
  orbs.forEach((o, i) => {
    if (o.on) {
      o.z += move;
      if (R.magnet > 0 && o.z > -22 && o.z < 0.5) { o.x += (px - o.x) * Math.min(1, dt * 7); o.y += (R.py + 1 - o.y) * Math.min(1, dt * 7); }
      if (Math.abs(o.z) < 1.0 && Math.abs(o.x - px) < 1.3 && Math.abs(o.y - (R.py + 1.0)) < 1.3) {
        o.on = false; S.orbs++; addCombo(1); S.score += 10 * comboMult(); addLantern(1.2); sfx.orb(); scorePop();
        for (let k = 0; k < 6; k++) fx.emit(o.x, o.y, o.z, rand(-2, 2), rand(0, 3), rand(-1, 1), 0.5, 0.35, '#fff3a0', 0.5);
      }
      if (o.z > 15) o.on = false;
    }
    const s = o.on ? 1 + Math.sin(S.t * 6 + i) * 0.1 : 0;
    _q.setFromAxisAngle(_up, S.t * 2 + i); _mtx.compose(_pv.set(o.x, o.y + Math.sin(S.t * 4 + i) * 0.12, o.z), _q, _sv.setScalar(s)); orbMesh.setMatrixAt(i, _mtx);
    if (o.on && hi < halos.n - 1) { halos.pos.set([o.x, o.y, o.z], hi * 3); halos.col.set([1, 0.82, 0.3], hi * 3); halos.size[hi] = 2.8; halos.alpha[hi] = 0.85; hi++; }
  });
  orbMesh.instanceMatrix.needsUpdate = true;
  // verse scrolls
  const vp = S.plan.verse.parts;
  if (R.vGot < vp.length && R.dist >= R.nextScrollD && !inGateZone(R.dist - SPAWN_Z) && R.dist - SPAWN_Z < RUN_LEN - 40) {
    const sc = scrolls.find(s => !s.on);
    const lanes = shuffle([0, 1, 2]).filter(l => !active.some(a => a.lane === l && Math.abs(a.obj.position.z - SPAWN_Z) < 12));
    if (sc && lanes.length) { sc.on = true; sc.lane = lanes[0]; sc.obj.visible = true; sc.obj.position.set(LANES[sc.lane], 1.3, SPAWN_Z); R.nextScrollD = R.dist + R.scrollGap; }
    else R.nextScrollD = R.dist + 8;
  }
  for (const sc of scrolls) {
    if (!sc.on) continue;
    sc.obj.position.z += move; if (R.magnet > 0 && sc.obj.position.z > -24) sc.obj.position.x += (px - sc.obj.position.x) * Math.min(1, dt * 6); sc.obj.rotation.y = Math.sin(S.t * 2) * 0.5; sc.obj.position.y = 1.3 + Math.sin(S.t * 4) * 0.15;
    if (hi < halos.n - 1) { halos.pos.set([sc.obj.position.x, sc.obj.position.y, sc.obj.position.z], hi * 3); halos.col.set([1, 0.95, 0.6], hi * 3); halos.size[hi] = 3.4; halos.alpha[hi] = 0.9; hi++; }
    if (Math.abs(sc.obj.position.z) < 1.2 && Math.abs(sc.obj.position.x - px) < 1.4 && R.py < 1.8) {
      sc.on = false; sc.obj.visible = false; R.vGot++; S.score += 25; addLantern(2); sfx.orb(); setTimeout(() => sfx.orb(), 90);
      for (let k = 0; k < 16; k++) fx.emit(sc.obj.position.x, 1.3, 0, rand(-2.5, 2.5), rand(0, 3.5), rand(-1, 1), 0.7, 0.45, '#fff1a8', 0.5);
      verseHUD(true);
      if (R.vGot >= vp.length) { sfx.good(); toast(`📜 Verse complete! ${S.plan.verse.ref} · bonus light at the camp gate`, 2600); }
    }
    if (sc.obj.position.z > 15) { sc.on = false; sc.obj.visible = false; }
  }
  lanternHalo(hi);
  // answer gates
  const NG = C.STOPS.length - 1;
  if (R.stopIdx < NG) {
    const gi = R.stopIdx;
    if (!R.gate || R.gate.idx !== gi) R.gate = prepGate(gi);
    const g = R.gate, gd = gateDist(gi) - R.dist, rd = readDist();
    answerGate.visible = gd < 175 && gd > -1.5; answerGate.position.z = -gd;
    if (!g.called && gd < rd + 30) { g.called = true; toast(`🚌 Conductor: “${C.STOPS[gi]}! ${C.STOPS[gi]}! Enter with your change!”`, 1800); }
    if (!g.shown && gd < rd) { g.shown = true; showGateQ(g); clearObs(a => a.obj.position.z < -40 && a.rel < 1); }
    gateLanes.forEach((L, i) => { if (!g.done) L.curtain.material.opacity = 0.26 + 0.12 * Math.sin(S.t * 5 + i); else if (i === g.correctLane) L.curtain.material.opacity = 0.45 + 0.3 * Math.sin(S.t * 14); });
    if (!g.done && gd <= 0) judgeGate(g);
  } else answerGate.visible = false;
  if (R.signFlash) { R.signFlash.t -= dt; const k = Math.max(0, R.signFlash.t) / 1.2, on = Math.floor(R.signFlash.t * 8) % 2 === 0; R.signFlash.mat.color.setRGB(1 + (on ? 0.9 : 0.2) * k, 1 + (on ? 0.9 : 0.2) * k, 1 + (on ? 0.1 : 0) * k); if (R.signFlash.t <= 0) { R.signFlash.mat.color.setRGB(1, 1, 1); R.signFlash = null; } }
  if (R.flash > 0) R.flash -= dt;
  for (let k = 0; k < 2; k++) {
    const idx = R.stopIdx + k; const b = bridges[idx % 2];
    if (idx < C.STOPS.length - 1) { b.visible = true; b.position.z = -(stopDist(idx) - R.dist) - 2; if (b.userData.idx !== idx) { setBridgeSign(b, C.STOPS[idx], C.STOP_REGION[idx] + ' · BUS STOP'); b.userData.idx = idx; } }
    else b.visible = false;
  }
  roadGate.visible = RUN_LEN - R.dist < 260; roadGate.position.z = -(RUN_LEN - R.dist) - 2;
  if (moralNPC && moral) { moralNPC.root.position.z = -(moralD - R.dist); moralNPC.root.rotation.y = 0; poseHuman(moralNPC, 'wave', dt); moralNPC.mark.position.y = 3.1 + Math.sin(S.t * 6) * 0.15; }
  const prog = clamp(R.dist / RUN_LEN, 0, 1);
  setSky('day', 'dusk', clamp((prog - 0.35) / 0.65, 0, 1), ev.mod.fog);
  lanternLight.intensity = prog * 2.2 * S.lantern / 100;
  const sh = R.shake > 0 ? R.shake * 0.6 : 0;
  R.camX += (R.px - R.camX) * Math.min(1, dt * 7);
  camera.position.set(R.camX + rand(-sh, sh), 3.3 + R.py * 0.3 + rand(-sh, sh), 7.6);
  camera.lookAt(R.camX, 1.25 + R.py * 0.2, -9);
  const tf = R.fire > 0 ? 72 : 62 + Math.max(0, R.speed - 17) * 0.45;
  if (Math.abs(camera.fov - tf) > 0.05) { camera.fov += (tf - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  speedFX(dt);
  sunFollow(R.px, 0);
  fx.update(dt, R.speed, 0);
  if (moral && R.dist >= moralD - 1) {
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
function hudMode(m) { document.body.classList.toggle('inrun', m === 'run'); if (m !== 'run') { $('#darkV').style.opacity = 0; $('#speedLines').style.opacity = 0; $('#hCombo').classList.add('hidden'); $('#hPow').classList.add('hidden'); shieldBubble.visible = false; if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); } } $('#hud').classList.toggle('hidden', !m); $('#prompt').classList.add('hidden'); $('#hVerse').classList.toggle('hidden', m !== 'run'); $('#hQ').classList.add('hidden'); }
function hud(prog, info) {
  if ((hudT -= 1) > 0) return; hudT = 6;
  $('#hLant').style.width = S.lantern + '%'; $('#hFloor').style.left = S.floor + '%';
  $('#hScore').textContent = '✨ ' + S.score;
  if (S.mode === 'run') {
    const i = Math.min(R.stopIdx, C.STOPS.length - 1);
    $('#hInfo').textContent = R.flash > 0 ? `📍 ${C.STOPS[R.stopIdx - 1]} ✓ · ${Math.round(R.speed * 3.6)} km/h` : `Ch.${save.chapter} · Next stop: ${C.STOPS[i]} · ${Math.max(0, Math.round((stopDist(i) - R.dist) * 1.5))}m`;
    $('#hInfo').classList.toggle('flash', R.flash > 0);
  } else if (info) $('#hInfo').textContent = info;
  $('#hProg').style.width = (prog * 100).toFixed(1) + '%';
}

/* ---- quiz, gate ---- */
function settleRunner() {
  if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); } player.root.rotation.x = 0;
  R.jt = 0; R.py = 0; R.px = LANES[R.lane]; R.camX = R.px; R.inv = 0;
  player.root.position.set(R.px, 0, 0); player.root.rotation.z = 0; player.root.visible = true; poseHuman(player, 'idle', 0.016);
  // lift the view so the runner sits above the dialog sheet while paused
  camera.position.set(R.camX, 3.0, 7.6); camera.lookAt(R.camX, -1.9, -9);
}
const comboMult = () => 1 + Math.min(4, Math.floor(R.combo / 8));
function addCombo(n) {
  const before = comboMult(); R.combo += n; R.comboT = 2.8;
  if (comboMult() > before) { popText(`🔥 Combo x${comboMult()}!`, 'big'); sfx.stop(); }
  comboHUD();
}
function loseCombo() { if (R.combo >= 8) popText('Combo lost', 'dim'); R.combo = 0; R.comboT = 0; comboHUD(); }
function comboHUD() { const el = $('#hCombo'); if (R.combo >= 3) { el.classList.remove('hidden'); el.textContent = `x${comboMult()} · ${R.combo}`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } else el.classList.add('hidden'); }
function nearMiss(txt, pts) { const p = pts * comboMult(); S.score += p; addCombo(2); popText(`${txt} +${p}`); sfx.whoosh(); scorePop(); }
function popText(txt, cls = '') {
  const el = document.createElement('div'); el.className = 'popt ' + cls; el.textContent = txt;
  el.style.left = (50 + rand(-12, 12)) + '%'; $('#pops').appendChild(el); setTimeout(() => el.remove(), 1100);
}
function scorePop() { const el = $('#hScore'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function shakeDOM(big) { const c = $('#c3d'); c.classList.remove('shake', 'shake2'); void c.offsetWidth; c.classList.add(big ? 'shake2' : 'shake'); }
function snapCP(dist, stopIdx, name) { return { dist, stopIdx, name, vGot: R.vGot, S: { score: S.score, orbs: S.orbs, quizRight: S.quizRight, quizTotal: S.quizTotal, lantern: S.lantern, hits: S.hits } }; }
function knock(a) { a.fly = 9; a.fx = (a.obj.position.x - R.px >= 0 ? 1 : -1) * 6; }
const BIG_NAMES = { danfo: 'A danfo no gree brake!', truck: 'Trailer wahala!', okada: 'An okada swerved into you!' };
function onHit(a) {
  const big = !a.jump && a.type !== 'hawker';
  if (R.fire > 0) { knock(a); S.score += 20; popText('🔥 Smashed through! +20'); sfx.hit(); for (let k = 0; k < 14; k++) fx.emit(R.px + rand(-1, 1), rand(0.5, 2), -1, rand(-4, 4), rand(1, 4), rand(-3, 0), 0.6, 0.7, '#ff8a3d', 1); return false; }
  if (R.shield) {
    R.shield = false; R.inv = 1.2; knock(a); sfx.shield(); shakeDOM();
    for (let k = 0; k < 22; k++) fx.emit(R.px, 1.2, 0, rand(-4, 4), rand(-1, 4), rand(-3, 3), 0.6, 0.6, '#9be7ff', 0.5);
    popText('🛡️ The Shield of Faith held!', 'big'); powerHUD(); return false;
  }
  for (let k = 0; k < 16; k++) fx.emit(R.px + rand(-0.6, 0.6), rand(0.3, 1.5), rand(-0.5, 0.5), rand(-3, 3), rand(1, 3), rand(-2, 2), 0.7, 0.8, '#d9b38c', 2);
  if (big || R.t - R.lastStumble < 4) { crash(big ? BIG_NAMES[a.type] : 'You stumbled twice and the darkness caught up.'); return true; }
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
  shieldBubble.visible = R.shield; if (R.shield) { shieldBubble.position.set(R.px, R.py + 1.2, 0); shieldBubble.material.opacity = 0.14 + 0.06 * Math.sin(S.t * 6); }
  if (R.dark > 0) { R.dark -= dt; for (let k = 0; k < 2; k++) fx.emit(R.px + rand(-5, 5), rand(0, 3), rand(2.5, 5), rand(-0.5, 0.5), rand(0, 0.6), rand(-2, -0.5), 0.9, 1.6, pick(['#2b2140', '#1d1830', '#3a2d55']), 1.4); }
  const dv = $('#darkV'), dk = R.dark > 0 ? Math.min(1, R.dark / 1.2) : 0; dv.style.opacity = dk.toFixed(2);
  if ((R.popT -= dt) <= 0) { R.popT = 0.25; powerHUD(true); }
  // spawn power-ups now and then
  if (R.dist >= R.nextPowerD && !inGateZone(R.dist - SPAWN_Z) && R.dist - SPAWN_Z < RUN_LEN - 60) {
    const k = pick(['shield', 'shield', 'lamp', 'lamp', 'fire']), pu = powerUps.find(p => p.k === k);
    const lanes = shuffle([0, 1, 2]).filter(l => !active.some(a => a.lane === l && Math.abs(a.obj.position.z - SPAWN_Z) < 14));
    if (pu && !pu.on && lanes.length) { pu.on = true; pu.lane = lanes[0]; pu.g.visible = true; pu.g.position.set(LANES[pu.lane], 1.5, SPAWN_Z); R.nextPowerD = R.dist + rand(280, 400); }
    else R.nextPowerD = R.dist + 10;
  }
  for (const pu of powerUps) {
    if (!pu.on) continue;
    pu.g.position.z += R.speed * dt; pu.ring.rotation.y += dt * 3; pu.g.position.y = 1.5 + Math.sin(S.t * 3) * 0.2;
    if (Math.abs(pu.g.position.z) < 1.2 && Math.abs(pu.g.position.x - R.px) < 1.4 && R.py < 2) { pu.on = false; pu.g.visible = false; activatePower(pu.k); }
    if (pu.g.position.z > 15) { pu.on = false; pu.g.visible = false; }
  }
}
function activatePower(k) {
  const P0 = POWERS[k]; sfx.power(); scorePop();
  if (k === 'fire') { R.fire = P0.dur; R.dark = 0; }
  if (k === 'shield') { R.shield = true; R.shieldT = P0.dur; }
  if (k === 'lamp') R.magnet = P0.dur;
  for (let i = 0; i < 26; i++) fx.emit(R.px, 1.4, 0, rand(-4, 4), rand(0, 5), rand(-3, 3), 0.7, 0.6, k === 'fire' ? '#ffb300' : k === 'shield' ? '#9be7ff' : '#fff3a0', 0.6);
  popText(`${P0.icon} ${P0.name}!`, 'big');
  toast(`${P0.icon} ${P0.name} · “${P0.line}” (${P0.ref})`, 2200);
  powerHUD();
}
function powerHUD(tickOnly) {
  const el = $('#hPow'); if (!R) return;
  const act = R.fire > 0 ? ['fire', R.fire] : R.magnet > 0 ? ['lamp', R.magnet] : R.shield ? ['shield', R.shieldT] : null;
  if (!act) { el.classList.add('hidden'); return; }
  const P0 = POWERS[act[0]], pct = Math.max(0, act[1] / P0.dur * 100);
  if (!tickOnly || el.classList.contains('hidden') || el.dataset.k !== act[0]) { el.dataset.k = act[0]; el.innerHTML = `${P0.icon} <span>${P0.name}${R.shield && act[0] !== 'shield' ? ' + 🛡️' : ''}</span><i><b></b></i>`; el.classList.remove('hidden'); }
  el.querySelector('b').style.width = pct.toFixed(0) + '%';
}
function speedFX() {
  const k = R.fire > 0 ? 1 : clamp((R.speed - 17) / 9, 0, 0.75);
  const sl = $('#speedLines'); sl.style.opacity = k.toFixed(2); sl.classList.toggle('fire', R.fire > 0);
}
function crash(cause) {
  settleRunner(); S.paused = true; sfx.crash(); shakeDOM(true); loseCombo();
  R.fire = 0; R.magnet = 0; R.shield = false; R.dark = 0; shieldBubble.visible = false; $('#darkV').style.opacity = 0; $('#speedLines').style.opacity = 0; $('#hQ').classList.add('hidden'); powerHUD();
  player.root.rotation.x = -0.5; player.root.position.y = 0;
  setTimeout(() => showFallen(cause), 450);
}
function showFallen(cause) {
  const v = pick(FALL_VERSES), m = $('#modalBody'), cp = R.cp, cost = 200;
  $('#toast').classList.remove('show');
  const metres = Math.round(R.dist * 1.5);
  m.innerHTML = `<div class="banner dark"><div class="km">${esc(cause)}</div><div class="name">FALLEN, BUT NOT FORSAKEN</div></div>
    ${verseHTML(v)}
    <div class="chips"><span class="chip">✨ ${S.score} light</span><span class="chip">📏 ${metres} m</span><span class="chip">📍 ${esc(C.STOPS[Math.min(R.stopIdx, C.STOPS.length - 1)])} next</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} gates</span></div>
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
  const used = new Set(S.plan.quiz.map(q => q[0])), pool = C.GATE_Q.filter(q => !used.has(q[0]));
  const q = pick(pool.length ? pool : C.GATE_Q), order = shuffle(q[1].map((t, i) => ({ t, ok: i === q[2] })));
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
  hide('modal'); fadeFlash();
  Object.assign(S, cp.S); S.lantern = Math.max(S.lantern, S.floor);
  Object.assign(R, { dist: cp.dist, stopIdx: cp.stopIdx, vGot: cp.vGot, nextScrollD: cp.dist + 40, nextPowerD: cp.dist + 120, gate: null, t: 0, combo: 0, comboT: 0, fire: 0, magnet: 0, shield: false, stumble: 0, lastStumble: -99, dark: 0, inv: 1.5, nextRow: 20, lane: 1, px: 0, camX: 0 });
  clearObs(); orbs.forEach(o => o.on = false); hideScrolls(); powerUps.forEach(p => { p.on = false; p.g.visible = false; });
  player.root.rotation.x = 0; verseHUD(); comboHUD(); powerHUD(); S.paused = false;
  toast(`↩ Back at ${cp.name}. Run with endurance! (Hebrews 12:1)`, 2200);
}
function fadeFlash() { const f = $('#fade'); f.style.transition = 'none'; f.style.opacity = 1; void f.offsetWidth; f.style.transition = 'opacity .5s ease-out'; f.style.opacity = 0; }
function prepGate(idx) {
  const q = S.plan.quiz[idx % S.plan.quiz.length];
  const order = shuffle([0, 1, 2]);           // order[lane] = option index
  const g = { idx, q, order, correctLane: order.indexOf(q[2]), called: false, shown: false, done: false };
  gateLanes.forEach((L, i) => { drawGateLabel(L.lab, q[1][order[i]], GATE_COLS[i]); L.curtain.material.color.set(GATE_COLS[i]); L.curtain.material.opacity = 0.3; });
  return g;
}
function showGateQ(g) {
  const arrows = ['◀', '▲', '▶'];
  $('#hQq').textContent = '📖 ' + g.q[0];
  $('#hQo').innerHTML = g.order.map((o, i) => `<span class="go g${i}">${arrows[i]} ${esc(g.q[1][o])}</span>`).join('');
  const hq = $('#hQ'); hq.classList.remove('hidden', 'ok', 'bad'); sfx.stop();
}
function judgeGate(g) {
  g.done = true; S.quizTotal++;
  const ok = R.lane === g.correctLane, right = g.q[1][g.q[2]], note = g.q[3] || '';
  const hq = $('#hQ');
  gateLanes.forEach((L, i) => { if (i === g.correctLane) { L.curtain.material.color.set('#ffd23f'); drawGateLabel(L.lab, right, GATE_COLS[i], 'ok'); } else drawGateLabel(L.lab, g.q[1][g.order[i]], GATE_COLS[i], 'dim'); });
  if (ok) {
    S.quizRight++; addCombo(5); S.score += 50 * comboMult(); addLantern(5); sfx.good(); scorePop();
    for (let k = 0; k < 34; k++) fx.emit(R.px + rand(-1.2, 1.2), rand(0.4, 3.2), rand(-1, 0.5), rand(-4, 4), rand(1, 5), rand(-2, 2), 0.9, 0.6, pick(['#fff3a0', '#ffd23f', '#ffffff']), 0.5);
    $('#hQq').textContent = `✅ Correct! +50 · ${right}`; $('#hQo').innerHTML = `<span class="note">${esc(note)}</span>`; hq.classList.add('ok');
    toast(`✅ Correct! +50 · ${note}`, 1800);
  } else {
    sfx.soft(); addLantern(-2); loseCombo(); R.inv = Math.max(R.inv, 0.7);
    for (let k = 0; k < 10; k++) fx.emit(R.px + rand(-0.5, 0.5), rand(0.8, 2), 0, rand(-1, 1), rand(0, 1.2), 0, 0.6, 0.5, '#9fb3c8', 0.5);
    $('#hQq').textContent = `💛 The answer was: ${right}`; $('#hQo').innerHTML = `<span class="note">${esc(note)}</span>`; hq.classList.add('bad');
    toast(`💛 Not quite. It was “${right}” · ${note}`, 2400);
  }
  clearTimeout(g.tm); g.tm = setTimeout(() => { if (S.mode === 'run' && R && R.gate === g) hq.classList.add('hidden'); }, 2600);
}
function passStop(idx) {
  const b = bridges[idx % 2];
  if (b && b.userData.sign) R.signFlash = { mat: b.userData.sign.material, t: 1.2 };
  R.flash = 1.6; R.cp = snapCP(stopDist(idx) + 1, idx + 1, C.STOPS[idx]);
  for (let k = 0; k < 18; k++) fx.emit(rand(-6, 6), rand(5.5, 8), -2, rand(-2, 2), rand(0, 2), rand(-1, 1), 0.8, 0.6, '#fff3a0', 0.5);
}
function autoSteer(dt) {   // test helper (?autopilot): steer to the right gate / scroll, avoid traffic
  R.autoT -= dt;
  let want = R.lane; const g = R.gate, gd = g ? gateDist(g.idx) - R.dist : 1e9;
  if (g && g.shown && !g.done && gd < 70) want = AUTO_MIX && g.idx === 1 ? (g.correctLane + 1) % 3 : g.correctLane;
  else { const sc = scrolls.find(s => s.on && s.obj.position.z < -1 && s.obj.position.z > -50); if (sc) want = sc.lane; }
  const danger = l => active.some(a => !a.hit && a.lane === l && !a.jump && a.obj.position.z > -16 && a.obj.position.z < 3);
  if (danger(want) && !(g && g.shown && !g.done && gd < 20)) { const alt = [0, 1, 2].filter(l => !danger(l)).sort((x, y) => Math.abs(x - R.lane) - Math.abs(y - R.lane))[0]; if (alt !== undefined) want = alt; }
  if (want !== R.lane && R.autoT <= 0) { runMove(Math.sign(want - R.lane)); R.autoT = 0.16; }
  if (active.some(a => !a.hit && a.lane === R.lane && a.jump && a.obj.position.z > -6 && a.obj.position.z < -2.5)) runJump();
}
function arriveGate() {
  settleRunner();
  S.paused = true;
  const m = $('#modalBody'), q = S.plan.quest, v = S.plan.verse, full = v.parts.join(' ');
  S.vGot = R.vGot; S.verseDone = R.vGot >= v.parts.length;
  let verseCard;
  if (S.verseDone) {
    S.score += 300; addLantern(10);
    const list = myVerses().filter(x => x.ref !== v.ref); list.unshift({ ref: v.ref, text: full, ch: save.chapter, at: new Date().toISOString().slice(0, 10) }); localStorage.setItem(VERSES_KEY, JSON.stringify(list));
    verseCard = `<div class="vmem"><div class="vt">📜 VERSE MEMORISED · +300 · 🏮 +10</div><div class="vx">“${esc(full)}”</div><b>${esc(v.ref)} (KJV)</b><div class="small">Saved to <b>My Verses</b> on the title screen. Say it out loud once more!</div></div>`;
  } else verseCard = `<div class="vmem partial"><div class="vt">📜 ${R.vGot}/${v.parts.length} parts of ${esc(v.ref)}</div><div class="vx">${v.parts.map((p, i) => i < R.vGot ? esc(p) : '▢').join(' ')}</div><div class="small">Grab every scroll to memorise it. It'll come back next chapter.</div></div>`;
  m.innerHTML = `<div class="banner purple"><div class="km">KM 46 · LAGOS–IBADAN EXPRESSWAY</div><div class="name">REDEMPTION CITY</div></div>
    <h2 style="text-align:center">🎉 You made it, ${esc(save.name)}!</h2>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} gates</span><span class="chip">🤲 ${S.helpedRun} helped</span><span class="chip dim">💥 ${S.hits} bumps</span></div>
    ${verseCard}
    <p>Lantern: <b>${Math.round(S.lantern)}%</b> · Score: <b>${S.score}</b></p><div class="meter"><i style="width:${S.lantern}%"></i></div>
    <p>Now explore the camp. Talk to pilgrims with a ❗, find the ${q.n} ${q.item} <b>${esc(q.title.toLowerCase())}</b>, and head for the <b>Main Auditorium</b>. Follow the golden beacon ✨.</p><p class="small">📖 Optional: <b>Sister Funke</b> runs a Bible study at the Prayer Ground. Answer at your own pace for extra light.</p>
    <button class="btn primary" id="gogo">Enter the camp ⛺</button>`;
  show('modal'); m.scrollTop = 0;
  $('#gogo').addEventListener('click', () => { sfx.good(); hide('modal'); startCamp(); });
}

/* =========================================================
   DIALOGUE (roadside + camp)
   ========================================================= */
function openDialog(enc, runMoral, onDone, zone) {
  S.paused = true; $('#prompt').classList.add('hidden');
  const body = $('#dialogBody');
  const head = `<div class="who"><div class="av">${enc.av}</div><div><div class="nm">${esc(enc.name)}</div><div class="vt">${runMoral ? 'On the expressway' : esc(zone || 'Redemption City')} · ${C.VIRTUES[enc.virtue]} ${enc.virtue}</div></div></div>`;
  body.innerHTML = head + `<div class="say">${esc(enc.say)}</div>` + enc.choices.map((c, i) => `<button class="btn opt" data-i="${i}">${esc(c.t)}</button>`).join('');
  show('dialog'); body.scrollTop = 0;
  body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => choose(enc.choices[+b.dataset.i])));
  function choose(c) {
    const chips = [];
    if (c.good) {
      const vk = c.virtue || enc.virtue; S.virtues[vk] = (S.virtues[vk] || 0) + 1;
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
  function finish() { sfx.tap(); hide('dialog'); S.paused = false; onDone && onDone(); }
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
{
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
  const trees = swayInst(treeGeo(), tData.length, 0.07); writeInst(trees, tData); CW.add(trees);
  const pData = []; for (let z = 92; z > -64; z -= 13) pData.push({ x: 8, z, s: 1, r: z }, { x: -8, z: z - 6, s: 1.1, r: z });
  const cp = swayInst(palmGeo(), pData.length, 0.06); writeInst(cp, pData); CW.add(cp);
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
  S.mode = 'camp'; S.paused = false;
  RW.visible = false; CW.visible = true; clearObs(); fx.clear(); setMoralNPC(null);
  setSky('evening', 'evening', 0, 1);
  if (K) K.all.forEach(n => CW.remove(n.root));
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
  const usher = makeHuman({ ...randomLook({ gender: 'm', cap: true }), top: '#263238', topTex: null, headColor: '#263238' }, false);
  usher.root.position.set(4.5, 0, -73.5); CW.add(usher.root); K.all.push(usher); K.usher = usher;
  const WP = [[0, 95], [0, 60], [0, 20], [0, -20], [0, -60], [-30, 20], [-60, 20], [30, 20], [60, 20], [-30, -34], [-55, -34], [20, 70]];
  for (let i = 0; i < 10; i++) { const h = makeHuman(randomLook({ gender: pick(['m', 'f']), kid: Math.random() < 0.15, old: Math.random() < 0.15 }), false); const w = pick(WP); h.root.position.set(w[0] + rand(-2, 2), 0, w[1] + rand(-2, 2)); h.wp = pick(WP); CW.add(h.root); K.all.push(h); K.walkers.push(h); }
  for (const g of [[-26, 30], [36, 20], [-48, -28], [12, 84], [52, 18], [-14, -20]]) { const h = makeHuman(randomLook({ gender: pick(['m', 'f']) }), false); h.root.position.set(g[0], 0, g[1]); h.root.rotation.y = rand(0, 6); h.idle = true; CW.add(h.root); K.all.push(h); }
  const ITEMS = shuffle([[-14, 60], [20, 50], [-50, 58], [64, 52], [-70, -10], [70, -16], [-30, -84], [26, -60], [-60, -58], [40, 70], [-22, 12], [12, -40]]).slice(0, S.plan.quest.n);
  for (const [x, z] of ITEMS) { const s = textSprite(S.plan.quest.item, 1.3); s.material.depthTest = true; s.position.set(x, 1.3, z); CW.add(s); K.items.push(s); K.all.push({ root: s }); }
  const fSpot = [[-44, -38], [-34, -36], [-56, -40], [-46, -56], [-30, -52], [-60, -52]].find(p => !blocked(p[0], p[1], 0.8) && !usedSpots.has(p + '')) || [-24, -36];
  const funke = makeHuman({ ...randomLook({ gender: 'f', gele: true }), top: '#ffffff', topTex: null, headColor: '#1565c0' }, false);
  funke.root.position.set(fSpot[0], 0, fSpot[1]); funke.mark = textSprite('📖', 1.5); funke.mark.position.y = 3.2; funke.root.add(funke.mark);
  CW.add(funke.root); K.all.push(funke); K.funke = funke; K.studied = false;
  player.root.position.set(0, 0, 104); player.root.rotation.set(0, Math.PI, 0); scene.add(player.root); player.root.visible = true;
  K.occ = []; const _bx = new THREE.Box3(), _sz = new THREE.Vector3(), _c = new THREE.Vector3(), skip = new Set(K.all.map(o => o.root));
  for (const o of CW.children) { if (skip.has(o) || o.isSprite) continue; _bx.setFromObject(o); _bx.getSize(_sz); _bx.getCenter(_c); if (_sz.y > 1.6 && Math.max(_sz.x, _sz.z) < 9) K.occ.push([o, _c.x, _c.z, Math.max(_sz.x, _sz.z) / 2]); }
  camera.position.set(0, 8.6, 111.6);
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
  poseHuman(K.usher, 'idle', dt);
  { const f = K.funke, dx = K.x - f.root.position.x, dz = K.z - f.root.position.z, d = Math.hypot(dx, dz); if (d < 9) f.root.rotation.y = Math.atan2(dx, dz); poseHuman(f, !K.studied && d < 14 ? 'wave' : 'idle', dt); f.mark.position.y = 3.2 + Math.sin(S.t * 4) * 0.15; }
  for (const h of K.walkers) {
    const dx = h.wp[0] - h.root.position.x, dz = h.wp[1] - h.root.position.z, d = Math.hypot(dx, dz);
    if (d < 1) h.wp = [clamp(h.wp[0] + rand(-25, 25), -90, 90), clamp(h.wp[1] + rand(-25, 25), -60, 95)];
    else { const nx = h.root.position.x + dx / d * 1.6 * dt, nz = h.root.position.z + dz / d * 1.6 * dt; if (!blocked(nx, nz, 0.4)) { h.root.position.x = nx; h.root.position.z = nz; } else h.wp = [rand(-4, 4), rand(-60, 90)]; h.root.rotation.y = Math.atan2(dx, dz); }
    poseHuman(h, 'walk', dt, 0.8);
  }
  for (const h of K.all) if (h.idle) poseHuman(h, 'idle', dt);
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
  camera.position.lerp(_pv.set(K.x, 8.6, K.z + 7.6), Math.min(1, dt * 5)); camera.lookAt(K.x, 1.0, K.z + 0.2);
  for (const [o, ox, oz, r] of K.occ) o.visible = !(Math.abs(ox - K.x) < r + 1.2 && oz > K.z + 0.6 - r * 0.3 && oz < K.z + 8.5 + r * 0.5);
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
let ptr = null;
window.addEventListener('keydown', e => {
  keys[e.key] = true; if (S.paused) return;
  if (S.mode === 'run') {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) runMove(-1);
    if (['ArrowRight', 'd', 'D'].includes(e.key)) runMove(1);
    if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) { runJump(); e.preventDefault(); }
  }
  if (S.mode === 'camp' && (e.key === 'e' || e.key === 'Enter') && promptFn) promptFn();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener('pointerdown', e => { ensureAudio(); ptr = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), done: false }; });
canvas.addEventListener('pointermove', e => {
  if (!ptr) return; ptr.x = e.clientX; ptr.y = e.clientY;
  if (S.paused) return;
  const dx = ptr.x - ptr.x0, dy = ptr.y - ptr.y0;
  if (S.mode === 'run' && !ptr.done) {
    if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) { runMove(Math.sign(dx)); ptr.done = true; }
    else if (dy < -26 && Math.abs(dy) > Math.abs(dx)) { runJump(); ptr.done = true; }
  }
  if (S.mode === 'camp' && K) {
    const d = Math.hypot(dx, dy);
    if (d > 12) { const k = Math.min(1, d / 55); K.joy = { x: dx / d * k, y: dy / d * k }; const j = $('#joy'); j.classList.remove('hidden'); j.style.left = ptr.x0 + 'px'; j.style.top = ptr.y0 + 'px'; j.firstElementChild.style.transform = `translate(${dx / d * k * 32}px,${dy / d * k * 32}px)`; }
  }
});
canvas.addEventListener('pointerup', e => {
  if (ptr && !S.paused) {
    const quick = performance.now() - ptr.t < 320 && Math.hypot(ptr.x - ptr.x0, ptr.y - ptr.y0) < 12;
    if (S.mode === 'run' && !ptr.done && quick) runJump();
    if (S.mode === 'camp' && K && quick) {
      _ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); ray.setFromCamera(_ndc, camera);
      const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(groundPlane, hit)) { K.tx = hit.x; K.tz = hit.z; for (let i = 0; i < 6; i++) fx.emit(hit.x, 0.2, hit.z, Math.cos(i) * 2, 0.5, Math.sin(i) * 2, 0.4, 0.3, '#ffd23f', 1); }
    }
  }
  if (K) K.joy = null; $('#joy').classList.add('hidden'); ptr = null;
});

/* =========================================================
   SCREENS: title, select, chapter intro, ending
   ========================================================= */
let titleDanfo = null;
function enterTitle() {
  S.mode = 'title'; S.paused = false; RW.visible = true; CW.visible = false; hudMode(null); setMoralNPC(null); clearObs(); orbs.forEach(o => o.on = false); hideOrbs();
  buildPlayer();
  player.root.position.set(0.6, 0, 0); player.root.visible = true; player.root.rotation.set(0, Math.PI, 0);
  if (!titleDanfo) { titleDanfo = danfo(); titleDanfo.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; }); RW.add(titleDanfo); }
  titleDanfo.visible = true; titleDanfo.position.set(-3.2, 0, 2.2);
  bridges.forEach(b => b.visible = false); roadGate.visible = false;
  setSky('day', 'day', 0); show('title');
  $('#btnContinue').classList.toggle('hidden', !save);
  if (save) $('#btnContinue').textContent = `▶ Continue · Chapter ${save.chapter} (${save.name})`;
  const hs = JSON.parse(localStorage.getItem('lr3d_high') || 'null');
  const mv = myVerses().length; $('#btnVerses').textContent = `📜 My Verses (${mv})`;
  $('#hiscore').textContent = hs ? `🏆 Best on this phone: ${hs.score} by ${hs.name} (Chapter ${hs.chapter})` : '';
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
let selG = 'm', selO = 0, selS = 1;
function enterSelect() {
  S.mode = 'select'; hide('title'); show('select');
  const base = save || freshSave(); selG = base.gender; selO = base.outfit; selS = base.skin;
  $('#pname').value = base.name === 'Pilgrim' ? (localStorage.getItem('lr_name') || '') : base.name;
  if (titleDanfo) titleDanfo.visible = false;
  paintSelect();
}
function paintSelect() {
  document.querySelectorAll('#segGender button').forEach(b => b.classList.toggle('on', b.dataset.g === selG));
  $('#segOutfit').innerHTML = PLAYER_OUTFITS[selG].map((o, i) => `<button data-o="${i}" class="${i === selO ? 'on' : ''}">${esc(o.label)}</button>`).join('');
  $('#segOutfit').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { selO = +b.dataset.o; sfx.tap(); paintSelect(); }));
  $('#skins').innerHTML = SKINS.map((c, i) => `<button data-s="${i}" class="${i === selS ? 'on' : ''}" style="background:${c}" aria-label="Skin tone ${i + 1}"></button>`).join('');
  $('#skins').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { selS = +b.dataset.s; sfx.tap(); paintSelect(); }));
  buildPlayer({ ...(save || freshSave()), gender: selG, outfit: selO, skin: selS });
  player.root.position.set(0, 0, 0); player.root.rotation.y = 0; player.root.visible = true;
}
document.querySelectorAll('#segGender button').forEach(b => b.addEventListener('click', () => { selG = b.dataset.g; selO = 0; sfx.tap(); paintSelect(); }));
function updateSelect(dt) {
  player.root.rotation.y = Math.sin(S.t * 0.8) * 0.7; poseHuman(player, 'idle', dt);
  camera.position.lerp(_pv.set(0, 2.0, 6.8), Math.min(1, dt * 4)); camera.lookAt(0, -0.3, 0);
  sunFollow(0, 0); fx.update(dt, 0, 0); lanternHalo(0);
}
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
$('#btnVerses').addEventListener('click', () => {
  ensureAudio(); sfx.tap();
  const list = myVerses(), sd = studyData();
  const lv = C.STUDY.map((L, i) => { const n = L.qs.filter((_, j) => sd.done[i + ':' + j]).length; return `<span class="chip ${save && save.chapter > i ? '' : 'dim'}">${L.icon} ${esc(L.name)} ${save && save.chapter > i ? n + '/' + L.qs.length : '🔒'}</span>`; }).join('');
  $('#modalBody').innerHTML = `<h2>📜 My Verses</h2>${list.length ? list.map(v => `<div class="verse">“${esc(v.text)}”<b>${esc(v.ref)} (KJV) · Chapter ${v.ch}</b></div>`).join('') : '<p>No verses yet. Collect every 📜 scroll on the expressway to memorise a verse.</p>'}
    <h3>🎓 Bible study progress</h3><div class="chips">${lv}</div><p class="small">${sd.right}/${sd.total} study answers correct over ${sd.sessions} session${sd.sessions === 1 ? '' : 's'}.</p>
    <button class="btn primary" id="vClose">Close</button>`;
  show('modal'); $('#modalBody').scrollTop = 0; $('#vClose').onclick = () => hide('modal');
});
$('#btnSelBack').addEventListener('click', () => { hide('select'); enterTitle(); });
$('#btnGo').addEventListener('click', () => {
  ensureAudio(); sfx.good();
  const name = ($('#pname').value.trim() || 'Pilgrim').slice(0, 16); localStorage.setItem('lr_name', name);
  if (!save) save = freshSave();
  Object.assign(save, { name, gender: selG, outfit: selO, skin: selS }); persist();
  hide('select'); buildPlayer(); chapterIntro();
});

function planChapter() {
  const ch = save.chapter;
  const event = C.EVENTS[(ch - 1) % C.EVENTS.length];
  const enc = drawPool('enc', C.ENCOUNTERS, 8, a => a.id);
  const quiz = drawPool('gate', C.GATE_Q, C.STOPS.length - 1, a => a[0]);
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
   LOOP + auto quality
   ========================================================= */
let last = performance.now();
const perf = { t: 0, n: 0, lowered: LITE, fps: 0 };
function lowerQuality() {
  perf.lowered = true; PR = 1; renderer.setPixelRatio(1); resize();
  sun.castShadow = false; renderer.shadowMap.enabled = false;
  scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  toast('Graphics optimised for your phone ⚡', 2000);
}
function loop(now) {
  let dt = Math.min(0.05, (now - last) / 1000); const real = dt; last = now; dt *= TIME_SCALE;
  S.t += dt;
  if ((S.mode === 'run' || S.mode === 'camp') && !S.paused) { perf.t += real; perf.n++; if (perf.t > 3) { perf.fps = perf.n / perf.t; if (perf.fps < 24 && !perf.lowered && TIME_SCALE === 1 && !params.has('noauto')) lowerQuality(); perf.t = 0; perf.n = 0; } }
  const steps = Math.max(1, Math.ceil(dt / (1 / 50)));
  for (let i = 0; i < steps; i++) {
    const d = dt / steps;
    if (S.mode === 'title') { updateTitle(dt); break; }
    if (S.mode === 'select') { updateSelect(dt); break; }
    if (S.paused) break;
    if (S.mode === 'run') updateRun(d); else if (S.mode === 'camp') updateCamp(d);
  }
  if (S.mode === 'intro') { poseHuman(player, 'idle', dt); camera.position.lerp(_pv.set(1.8, 2.0, -4.2), 0.06); camera.lookAt(0, 1.6, 0); sunFollow(0, 0); fx.update(dt, 0, 0); lanternHalo(0); }
  musicTick(); SWAY_T.value = S.t;
  if (player && blobP) { blobP.position.set(player.root.position.x, 0.03, player.root.position.z); const k = 1 - Math.min(0.6, player.root.position.y * 0.3); blobP.scale.set(1.5 * k, 1.5 * k, 1); blobP.visible = player.root.visible && S.mode !== 'title'; }
  sky.position.copy(camera.position); clouds.position.set(camera.position.x, 0, camera.position.z); clouds.rotation.y += dt * 0.004;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
enterTitle();
$('#loading').remove();
window.__lr3dReady = true;
requestAnimationFrame(loop);

window.LR = {
  playerBox() { const b = new THREE.Box3().setFromObject(player.root); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return { left: (x0 + 1) / 2, right: (x1 + 1) / 2, top: (1 - y1) / 2, bottom: (1 - y0) / 2, h: (y1 - y0) / 2 }; },
  get state() { return { mode: S.mode, paused: S.paused, score: S.score, lantern: S.lantern, chapter: save && save.chapter, stop: R && R.stopIdx, dist: R && R.dist, met: K && K.met, fps: perf.fps, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lowered: perf.lowered }; },
  skipRun() { if (R) { R.dist = RUN_LEN - 3; R.stopIdx = C.STOPS.length - 1; R.moralIdx = 3; setMoralNPC(null); } },
  near(i) { if (!K) return; const h = K.enc[i]; K.x = h.root.position.x; K.z = h.root.position.z + 2.2; K.tx = null; },
  door() { if (K) { K.x = DOOR[0]; K.z = DOOR[1] + 3; } },
  hit(t) { if (R && S.mode === 'run') onHit({ type: t, jump: OBS[t].jump, obj: new THREE.Object3D() }); },
  power(k) { if (R) activatePower(k); },
  get riseOk() { return R ? R.riseOk : -1; },
  study() { if (K) { K.x = K.funke.root.position.x; K.z = K.funke.root.position.z + 2.2; K.tx = null; } },
  get gate() { return R && R.gate ? { idx: R.gate.idx, shown: R.gate.shown, done: R.gate.done, gd: gateDist(R.gate.idx) - R.dist, lane: R.lane, correct: R.gate.correctLane } : null; },
  get run() { return R ? { combo: R.combo, fire: R.fire, shield: R.shield, magnet: R.magnet, dark: R.dark, revived: R.revived, cp: R.cp && R.cp.name, speed: R.speed, vGot: R.vGot, parts: S.plan.verse.parts.length, quizRight: S.quizRight, quizTotal: S.quizTotal, moral: R.moralIdx } : null; },
  get encCount() { return K ? K.enc.length : 0; },
};
