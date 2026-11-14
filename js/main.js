// Redemption City: Light Run 3D — main game
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
const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0xfff3c0, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); sunDisc.scale.set(90, 90, 1); sky.add(sunDisc);
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
  const sp = A.sunPos.map((v, i) => lerp(v, B.sunPos[i], t)); sunDisc.position.set(sp[0], sp[1], sp[2]).normalize().multiplyScalar(450);
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
const sfx = {
  orb: () => beep(880 + Math.random() * 200, 0.07, 'triangle', 0.07),
  jump: () => beep(420, 0.1, 'square', 0.05),
  hit: () => { beep(140, 0.25, 'sawtooth', 0.12); beep(90, 0.3, 'square', 0.06, 0.05); },
  good: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'triangle', 0.1, i * 0.09)),
  soft: () => [392, 330].forEach((f, i) => beep(f, 0.2, 'sine', 0.08, i * 0.12)),
  stop: () => [660, 880].forEach((f, i) => beep(f, 0.12, 'square', 0.06, i * 0.1)),
  tap: () => beep(600, 0.04, 'triangle', 0.06),
  horn: () => { beep(330, 0.18, 'square', 0.05); beep(415, 0.18, 'square', 0.04); },
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
const roadTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#c9763a'; x.fillRect(0, 0, w, h);
  const a0 = w / 12, a1 = w * 11 / 12; x.fillStyle = '#4a4f5c'; x.fillRect(a0, 0, a1 - a0, h);
  for (let i = 0; i < 600; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; x.fillRect(a0 + Math.random() * (a1 - a0), Math.random() * h, 2, 2); }
  x.fillStyle = 'rgba(0,0,0,.16)'; for (const lx of [-3.2, 0, 3.2]) x.fillRect((lx + 6) / 12 * w - 10, 0, 20, h);
  x.fillStyle = '#ffd23f'; x.fillRect(a0 + 4, 0, 5, h); x.fillRect(a1 - 9, 0, 5, h);
  x.fillStyle = '#ffffff'; for (const lx of [-1.6, 1.6]) x.fillRect((lx + 6) / 12 * w - 3, 0, 6, h * 0.5);
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
const palms = new THREE.InstancedMesh(palmGeo(), VC, 70); outline(palms, 0.06); RW.add(palms);
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
  if (!obj) { obj = OBS[type].make(); if (type !== 'pothole') obj.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; }); }
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
  roadTex.offset.y += move / 8; grassTex.offset.y += move / 10;
}
function startRun() {
  S.mode = 'run'; S.paused = false;
  RW.visible = true; CW.visible = false; scene.add(player.root); player.root.visible = true; player.root.position.set(0, 0, 0); player.root.rotation.set(0, Math.PI, 0);
  clearObs(); orbs.forEach(o => o.on = false); fx.clear();
  R = { dist: 0, speed: 13, lane: 1, px: 0, py: 0, jt: 0, inv: 0, shake: 0, nextRow: 30, stopIdx: 0, moralIdx: 0, dustT: 0, ev: S.plan.event };
  hudMode('run');
  toast('Swipe ⬅️ ➡️ to change lane · Swipe ⬆️ or tap to jump', 3200);
}
const JT = 0.66;
function runMove(d) { const n = clamp(R.lane + d, 0, 2); if (n !== R.lane) { R.lane = n; sfx.tap(); } }
function runJump() { if (R.jt <= 0) { R.jt = JT; sfx.jump(); } }
function rowGap() { const ch = save.chapter; return Math.max(12, 25 - R.stopIdx * 0.9 - (ch - 1) * 0.7) / Math.sqrt(R.ev.mod.traffic); }
function spawnRow() {
  const st = R.stopIdx, ch = save.chapter, tr = R.ev.mod.traffic;
  const pool = st < 2 && ch === 1 ? ['pothole', 'cone', 'danfo', 'pothole'] : st < 5 ? ['pothole', 'cone', 'danfo', 'okada', 'hawker', 'danfo'] : ['pothole', 'cone', 'danfo', 'okada', 'truck', 'hawker', 'danfo', 'okada'];
  if (tr > 1.3) pool.push('danfo', 'truck');
  if (R.ev.mod.rain) pool.push('pothole', 'pothole');
  const two = Math.random() < Math.min(0.75, (st < 2 && ch === 1 ? 0 : 0.3) + st * 0.04 + (ch - 1) * 0.04 + (tr - 1) * 0.3);
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
const MORAL_AFTER = [1, 4, 7];
function updateRun(dt) {
  const ch = save.chapter, ev = R.ev;
  R.speed = 13 + R.stopIdx * 0.85 + Math.min(6, (ch - 1) * 0.8);
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
  R.dustT -= dt; if (R.dustT <= 0 && R.py < 0.05) { R.dustT = 0.05; fx.emit(R.px + rand(-0.2, 0.2), 0.12, 0.35, rand(-0.6, 0.6), rand(0.4, 1.0), rand(0.5, 1.5), 0.55, 0.45, '#e6c9a0', 2.2); }
  if (ev.mod.rain) for (let i = 0; i < 3; i++) fx.emit(R.px + rand(-14, 14), rand(8, 14), rand(-30, 4), 0, -26, 0, 0.5, 0.18, '#cfe8ff', 0);
  const nextStop = stopDist(R.stopIdx), moral = S.plan.road[R.moralIdx];
  const moralD = moral ? stopDist(MORAL_AFTER[R.moralIdx]) + GAP / 2 : Infinity;
  R.nextRow -= move;
  if (R.nextRow <= 0) {
    const arrive = R.dist - SPAWN_Z;
    const quiet = (arrive > nextStop - 35 && arrive < nextStop + 8) || (arrive > moralD - 35 && arrive < moralD + 8) || arrive > RUN_LEN - 30;
    if (!quiet) spawnRow();
    R.nextRow = rowGap() + rand(0, 6);
  }
  const px = R.px, air = R.py > 0.6;
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i]; a.obj.position.z += move * a.rel;
    if (a.type === 'okada') a.obj.position.x = LANES[a.lane] + Math.sin(S.t * 2 + i) * 0.25;
    if (a.type === 'hawker') poseHuman(a.obj.userData.human, 'carry', dt, 0.6);
    if (a.obj.userData.exhaust && (a.ex -= dt) <= 0) { a.ex = 0.07; const e = a.obj.userData.exhaust; fx.emit(a.obj.position.x + e[0], e[1], a.obj.position.z + e[2], rand(-0.3, 0.3), rand(0.6, 1.2), 1.5, 0.9, 0.55, '#8d8d8d', 2.5); }
    const z = a.obj.position.z;
    if (!a.hit && Math.abs(z) < a.len / 2 + 0.45 && Math.abs(a.obj.position.x - px) < 1.4 && !(a.jump && air) && R.inv <= 0) {
      a.hit = true; S.hits++; S.score = Math.max(0, S.score - 20); addLantern(-7); R.inv = 1.1; R.shake = 0.35; sfx.hit(); if (!a.jump) sfx.horn();
      for (let k = 0; k < 14; k++) fx.emit(px + rand(-0.6, 0.6), rand(0.3, 1.5), rand(-0.5, 0.5), rand(-3, 3), rand(1, 3), rand(-2, 2), 0.7, 0.8, '#d9b38c', 2);
      toast(pick(['Ouch! Pothole wahala 😅', 'Watch out, pilgrim!', 'Your lantern flickered!', 'Eyes on the road!', 'Danfo no dey brake o!']), 1100);
    }
    if (z > 22) { RW.remove(a.obj); freeObs[a.type].push(a.obj); active.splice(i, 1); }
  }
  let hi = 0;
  orbs.forEach((o, i) => {
    if (o.on) {
      o.z += move;
      if (Math.abs(o.z) < 1.0 && Math.abs(o.x - px) < 1.3 && Math.abs(o.y - (R.py + 1.0)) < 1.3) {
        o.on = false; S.orbs++; S.score += 10; addLantern(1.2); sfx.orb();
        for (let k = 0; k < 6; k++) fx.emit(o.x, o.y, o.z, rand(-2, 2), rand(0, 3), rand(-1, 1), 0.5, 0.35, '#fff3a0', 0.5);
      }
      if (o.z > 15) o.on = false;
    }
    const s = o.on ? 1 + Math.sin(S.t * 6 + i) * 0.1 : 0;
    _q.setFromAxisAngle(_up, S.t * 2 + i); _mtx.compose(_pv.set(o.x, o.y + Math.sin(S.t * 4 + i) * 0.12, o.z), _q, _sv.setScalar(s)); orbMesh.setMatrixAt(i, _mtx);
    if (o.on && hi < halos.n - 1) { halos.pos.set([o.x, o.y, o.z], hi * 3); halos.col.set([1, 0.85, 0.3], hi * 3); halos.size[hi] = 2.2; halos.alpha[hi] = 0.8; hi++; }
  });
  orbMesh.instanceMatrix.needsUpdate = true;
  lanternHalo(hi);
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
  camera.position.lerp(_pv.set(R.px * 0.55 + rand(-sh, sh), 3.0 + R.py * 0.35 + rand(-sh, sh), 6.6), Math.min(1, dt * 6));
  camera.lookAt(R.px * 0.35, 1.3 + R.py * 0.25, -12);
  sunFollow(R.px, 0);
  fx.update(dt, R.speed, 0);
  if (moral && R.dist >= moralD - 1) {
    R.moralIdx++; clearObs(a => a.obj.position.z > -45);
    openDialog(moral, true, () => { R.inv = 1.2; setMoralNPC(S.plan.road[R.moralIdx]); });
    return;
  }
  if (R.dist >= nextStop) {
    const idx = R.stopIdx; R.stopIdx++; clearObs(a => a.obj.position.z > -50); sfx.stop();
    if (idx >= C.STOPS.length - 1) arriveGate(); else stopQuiz(idx);
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
function hudMode(m) { $('#hud').classList.toggle('hidden', !m); $('#prompt').classList.add('hidden'); }
function hud(prog, info) {
  if ((hudT -= 1) > 0) return; hudT = 6;
  $('#hLant').style.width = S.lantern + '%'; $('#hFloor').style.left = S.floor + '%';
  $('#hScore').textContent = '✨ ' + S.score;
  if (S.mode === 'run') {
    const i = Math.min(R.stopIdx, C.STOPS.length - 1);
    $('#hInfo').textContent = `Ch.${save.chapter} · Next stop: ${C.STOPS[i]} · ${Math.max(0, Math.round((stopDist(i) - R.dist) * 1.5))}m`;
  } else if (info) $('#hInfo').textContent = info;
  $('#hProg').style.width = (prog * 100).toFixed(1) + '%';
}

/* ---- quiz, gate ---- */
function stopQuiz(idx) {
  S.paused = true;
  const q = S.plan.quiz[idx];
  const order = shuffle(q[1].map((t, i) => ({ t, ok: i === q[2] })));
  const m = $('#modalBody');
  m.innerHTML = `<div class="banner"><div class="km">BUS STOP ${idx + 1} OF ${C.STOPS.length - 1} · ${C.STOP_REGION[idx]}</div><div class="name">${esc(C.STOPS[idx].toUpperCase())}</div></div>
    <div class="small" style="text-align:center;margin-bottom:6px">Conductor dey shout: “${esc(C.STOPS[idx + 1])}! ${esc(C.STOPS[idx + 1])}! Enter with your change!” 🚌</div>
    <div class="q">📖 ${esc(q[0])}</div>${order.map((o, i) => `<button class="btn opt" data-i="${i}">${esc(o.t)}</button>`).join('')}
    <div class="fb" id="fb"></div><div id="qcont"></div>`;
  show('modal'); m.scrollTop = 0;
  const btns = m.querySelectorAll('[data-i]');
  btns.forEach(b => b.addEventListener('click', () => {
    const ok = order[+b.dataset.i].ok; S.quizTotal++;
    btns.forEach((bb, i) => { bb.disabled = true; if (order[i].ok) bb.classList.add('right'); });
    if (ok) { S.quizRight++; S.score += 50; addLantern(5); sfx.good(); $('#fb').innerHTML = '✅ <b>Correct!</b> +50 light, lantern +5'; }
    else { b.classList.add('wrong'); sfx.soft(); $('#fb').innerHTML = '💛 Not quite, but now you know! Keep going.'; }
    $('#qcont').innerHTML = `<button class="btn primary" id="qgo">Continue to ${esc(C.STOPS[idx + 1])} ▶</button>`;
    $('#qgo').addEventListener('click', () => { sfx.tap(); hide('modal'); S.paused = false; R.inv = 1; });
  }));
}
function arriveGate() {
  S.paused = true;
  const m = $('#modalBody'), q = S.plan.quest;
  m.innerHTML = `<div class="banner purple"><div class="km">KM 46 · LAGOS–IBADAN EXPRESSWAY</div><div class="name">REDEMPTION CITY</div></div>
    <h2 style="text-align:center">🎉 You made it, ${esc(save.name)}!</h2>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} questions</span><span class="chip">🤲 ${S.helpedRun} helped</span><span class="chip dim">💥 ${S.hits} bumps</span></div>
    <p>Lantern: <b>${Math.round(S.lantern)}%</b> · Score: <b>${S.score}</b></p><div class="meter"><i style="width:${S.lantern}%"></i></div>
    <p>Now explore the camp. Talk to pilgrims with a ❗, find the ${q.n} ${q.item} <b>${esc(q.title.toLowerCase())}</b>, and head for the <b>Main Auditorium</b>. Follow the golden beacon ✨.</p>
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
  const trees = new THREE.InstancedMesh(treeGeo(), VC, tData.length); outline(trees, 0.07); writeInst(trees, tData); CW.add(trees);
  const pData = []; for (let z = 92; z > -64; z -= 13) pData.push({ x: 8, z, s: 1, r: z }, { x: -8, z: z - 6, s: 1.1, r: z });
  const cp = new THREE.InstancedMesh(palmGeo(), VC, pData.length); outline(cp, 0.06); writeInst(cp, pData); CW.add(cp);
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
  player.root.position.set(0, 0, 104); player.root.rotation.set(0, Math.PI, 0); scene.add(player.root); player.root.visible = true;
  camera.position.set(0, 10, 116);
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
  const atDoor = Math.hypot(DOOR[0] - K.x, DOOR[1] - K.z) < 6.5;
  if (near) setPrompt(`💬 ${near.enc.av} ${near.enc.name}`, false, () => talk(near));
  else if (atDoor) { if (mc >= DOOR_NEED) setPrompt('⛪ Enter the Holy Ghost Service', false, enterService); else setPrompt(`👮🏾 Usher: help ${DOOR_NEED - mc} more pilgrim${DOOR_NEED - mc > 1 ? 's' : ''} first (${mc}/${DOOR_NEED})`, true, null); }
  else { $('#prompt').classList.add('hidden'); promptFn = null; }
  let target = null, td = Infinity;
  for (const h of K.enc) { if (K.met[h.enc.id]) continue; const d = Math.hypot(h.root.position.x - K.x, h.root.position.z - K.z); if (d < td) { td = d; target = [h.root.position.x, h.root.position.z]; } }
  const toDoor = !target; if (toDoor) { target = DOOR; td = Math.hypot(DOOR[0] - K.x, DOOR[1] - K.z); }
  beacon.position.set(target[0], 25, target[1]); beacon.visible = td > 9;
  doorBeacon.visible = mc >= DOOR_NEED && !toDoor; doorBeacon.position.set(DOOR[0], 25, DOOR[1]);
  const ang = Math.atan2(target[0] - K.x, target[1] - K.z);
  arrow.position.set(K.x + Math.sin(ang) * 1.7, 0.3, K.z + Math.cos(ang) * 1.7); arrow.rotation.y = ang; arrow.visible = td > 4;
  camera.position.lerp(_pv.set(K.x, 11, K.z + 9), Math.min(1, dt * 5)); camera.lookAt(K.x, 1.2, K.z - 1.5);
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
  camera.position.lerp(_pv.set(0, 1.9, 5.2), Math.min(1, dt * 4)); camera.lookAt(0, 0.35, 0);
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
  const quiz = drawPool('quiz', C.QUIZ, 9, (a, i) => i);
  const road = drawPool('road', C.ROADSIDE, 3, a => a.id);
  const door = drawPool('door', C.DOOR, 1, a => a.id)[0];
  const quest = drawPool('quest', C.SIDE_QUESTS, 1, a => a.title)[0];
  persist();
  return { event, enc, quiz, road, door, quest, story: C.storyBeat(ch) };
}
function chapterIntro() {
  S.mode = 'intro'; S.paused = true; hudMode(null);
  if (titleDanfo) titleDanfo.visible = false;
  RW.visible = true; CW.visible = false; bridges.forEach(b => b.visible = false); roadGate.visible = false;
  setSky('day', 'day', 0);
  S.plan = planChapter();
  const ch = save.chapter, lvl = lanternLevel();
  Object.assign(S, { score: 0, orbs: 0, hits: 0, quizRight: 0, quizTotal: 0, helpedRun: 0, virtues: {}, log: [] });
  S.floor = Math.min(45, 12 + lvl * 3); S.lantern = clamp(Math.min(70, save.lantern ?? 50), S.floor, 100);
  const p = S.plan;
  $('#modalBody').innerHTML = `<div class="banner purple"><div class="km">CHAPTER ${ch} · ${esc(p.event.when.toUpperCase())}</div><div class="name">${esc(p.event.title)}</div></div>
    <div class="story">🧑🏾‍🏫 ${esc(p.story.intro)}</div>
    <div class="chips"><span class="chip">🏮 Lantern Lv ${lvl}</span><span class="chip">🛣️ ${esc(p.event.note)}</span><span class="chip">${p.quest.item} Side quest: ${esc(p.quest.title)}</span></div>
    ${ch > 1 ? `<p class="small">Virtues so far: ${Object.keys(save.totals).filter(k => save.totals[k]).map(k => C.VIRTUES[k] + '×' + save.totals[k]).join(' ') || '—'}</p>` : ''}
    <button class="btn primary" id="chGo">Start the journey from Ojota ▶</button><button class="btn ghost" id="chMenu">Main menu</button>`;
  show('modal'); $('#modalBody').scrollTop = 0;
  player.root.position.set(0, 0, 0); player.root.rotation.set(0, Math.PI * 0.85, 0); player.root.visible = true;
  $('#chGo').onclick = () => { sfx.good(); hide('modal'); setMoralNPC(S.plan.road[0]); startRun(); };
  $('#chMenu').onclick = () => { hide('modal'); enterTitle(); };
}

function showEnding() {
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
  const share = `🏮 Redemption City: Light Run 3D\n${save.name} finished Chapter ${doneCh}: ${S.plan.event.title}!\n✨ Light score: ${total}\n🏮 Lantern: ${lant}% (Lv ${lanternLevel()})\n💛 Virtues this chapter: ${shown.length} ${shown.map(k => C.VIRTUES[k]).join('')}\n📖 Bible Qs: ${S.quizRight}/${S.quizTotal}\nCan you shine brighter? (Matthew 5:16)${url}`;
  $('#endBody').innerHTML = `
    <div style="text-align:center;font-size:54px;filter:drop-shadow(0 0 ${8 + lant / 4}px #ffb300)">🏮</div>
    <h2 style="text-align:center;margin:0">Welcome to the Holy Ghost Service, ${esc(save.name)}!</h2>
    <p style="text-align:center;margin:6px 0 2px;color:#d35400;font-weight:900">Chapter ${doneCh} complete · ${tier[0]}</p>
    <p class="small" style="text-align:center">${tier[1]}</p>
    <div class="big-score"><div class="n">${total}</div><div class="small" style="text-align:center">light score ${isHigh ? '· 🏆 new best on this phone!' : `· best: ${hs.score} (${esc(hs.name)})`}</div></div>
    <div class="small">Lantern brightness: <b>${lant}%</b> · Lantern Lv <b>${lanternLevel()}</b></div><div class="meter"><i style="width:${lant}%"></i></div>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} Bible Qs</span><span class="chip">🤲 ${S.log.filter(l => l.good).length} good choices</span><span class="chip">${S.plan.quest.item} ${K ? K.quest : 0}/${S.plan.quest.n}</span><span class="chip dim">+${bonus} end bonus</span></div>
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
  sky.position.copy(camera.position); clouds.position.set(camera.position.x, 0, camera.position.z); clouds.rotation.y += dt * 0.004;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
enterTitle();
$('#loading').remove();
window.__lr3dReady = true;
requestAnimationFrame(loop);

window.LR = {
  get state() { return { mode: S.mode, paused: S.paused, score: S.score, lantern: S.lantern, chapter: save && save.chapter, stop: R && R.stopIdx, dist: R && R.dist, met: K && K.met, fps: perf.fps, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lowered: perf.lowered }; },
  skipRun() { if (R) { R.dist = RUN_LEN - 3; R.stopIdx = C.STOPS.length - 1; R.moralIdx = 3; setMoralNPC(null); } },
  near(i) { if (!K) return; const h = K.enc[i]; K.x = h.root.position.x; K.z = h.root.position.z + 2.2; K.tx = null; },
  door() { if (K) { K.x = DOOR[0]; K.z = DOOR[1] + 3; } },
  get encCount() { return K ? K.enc.length : 0; },
};
