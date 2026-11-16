// v10 · Vision worlds from the Bible: Genesis (Eden), Exodus (Red Sea), Leviticus (aqueduct road + tabernacle)
// Warm clay-toy look: merged vertex-coloured toon geometry, instanced decor, canvas textures. Built lazily, one draw-call-light group per world.
import { THREE, P, G, merge, mergedMesh, VC, toon, canvasTex, SOFT } from './toon.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const HALF_T = (r, t, a = Math.PI) => new THREE.TorusGeometry(r, t, 6, 14, a);
const glowMat = (c, op = 0.8) => new THREE.SpriteMaterial({ map: SOFT, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op, fog: false });
function glow(c, s, op) { const g = new THREE.Sprite(glowMat(c, op)); g.scale.set(s, s, 1); return g; }
const basicVC = new THREE.MeshBasicMaterial({ vertexColors: true });

/* ---------- textures ---------- */
function speckle(x, w, h, n, cols, r0, r1) { for (let i = 0; i < n; i++) { x.fillStyle = pick(cols); x.beginPath(); x.arc(Math.random() * w, Math.random() * h, rnd(r0, r1), 0, 7); x.fill(); } }
const T = {};
T.edenPath = () => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#7cc653'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#c9b48a'; x.fillRect(22, 0, w - 44, h);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
    const sx = 26 + c * 52 + (r % 2) * 18 + rnd(-4, 4), sy = r * 52 + rnd(-3, 3), sw = rnd(40, 50), sh = rnd(40, 48);
    x.fillStyle = pick(['#f1e2bd', '#ead7ab', '#f5e8c8', '#e3cf9f']); x.beginPath(); x.roundRect(Math.min(sx, w - 70), sy, sw, sh, 12); x.fill();
    x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.roundRect(Math.min(sx, w - 70) + 4, sy + 3, sw - 14, 8, 4); x.fill();
  }
  speckle(x, 30, h, 60, ['#5fae3c', '#93d867', '#4c9a33'], 2, 5);
  x.save(); x.translate(w - 30, 0); speckle(x, 30, h, 60, ['#5fae3c', '#93d867', '#4c9a33'], 2, 5); x.restore();
  speckle(x, w, h, 14, ['#ff4fa3', '#ffd23f', '#ffffff'], 1.5, 2.5);
}, true);
T.meadow = () => canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#6fc04a'; x.fillRect(0, 0, w, h); speckle(x, w, h, 500, ['#5cae3a', '#86d25c', '#79c850', '#4f9e35'], 2, 6); speckle(x, w, h, 50, ['#ff6fb5', '#ffe14a', '#ffffff', '#b98cff'], 1.4, 2.6); }, true);
T.seabed = () => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#c8ad80'; x.fillRect(0, 0, w, h);
  speckle(x, w, h, 260, ['#b99a6c', '#d6bd92', '#a88b60'], 2, 6);
  for (let i = 0; i < 7; i++) { const g = x.createRadialGradient(0, 0, 2, 0, 0, 40); g.addColorStop(0, 'rgba(120,200,215,.55)'); g.addColorStop(1, 'rgba(120,200,215,0)'); x.save(); x.translate(rnd(20, w - 20), rnd(0, h)); x.scale(1.6, 0.8); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 40, 0, 7); x.fill(); x.restore(); }
  speckle(x, w, h, 40, ['#8e8a82', '#a29d94', '#6f6a62', '#f7efe2'], 3, 7);
  x.strokeStyle = 'rgba(90,70,45,.25)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { x.beginPath(); const y = rnd(0, h); x.moveTo(0, y); x.bezierCurveTo(80, y + rnd(-10, 10), 170, y + rnd(-10, 10), w, y); x.stroke(); }
}, true);
T.wall = () => canvasTex(128, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#b8fbff'); g.addColorStop(0.25, '#43d3e2'); g.addColorStop(0.7, '#138fb0'); g.addColorStop(1, '#0a5c86'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2.5;
  for (let i = 0; i < 26; i++) { x.beginPath(); const y = rnd(0, h * 0.8); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + rnd(-18, 18), w * 0.7, y + rnd(-18, 18), w, y); x.stroke(); }
  for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.2; x.beginPath(); x.arc(rnd(0, w), rnd(0, h), rnd(1.5, 4), 0, 7); x.stroke(); }
}, true);
T.foam = () => canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 90; i++) { const r = rnd(5, 16), cx = rnd(0, w), cy = rnd(h * 0.35, h); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }, true);
T.shaft = () => canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,250,215,.7)'); g.addColorStop(1, 'rgba(255,250,215,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const s = x.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(0.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = s; x.fillRect(0, 0, w, h); });
T.blocks = (base = '#d9a865') => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#9c6f3d'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) {
    const bw = 64, bh = 32, sx = c * bw + (r % 2) * 32, sy = r * bh;
    x.fillStyle = pick([base, '#e3b677', '#cf9a57', '#e8c084', '#d3a062']); x.fillRect(sx + 2, sy + 2, bw - 4, bh - 4);
    x.fillStyle = 'rgba(255,240,200,.22)'; x.fillRect(sx + 3, sy + 3, bw - 8, 5);
    x.fillStyle = 'rgba(90,55,20,.18)'; x.fillRect(sx + 3, sy + bh - 7, bw - 6, 4);
  }
  speckle(x, w, h, 120, ['rgba(120,80,40,.35)', 'rgba(255,230,180,.3)'], 1, 3);
}, true);
T.desert = () => canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c98f55'; x.fillRect(0, 0, w, h); speckle(x, w, h, 300, ['#b97e46', '#d9a067', '#a86f3c', '#8f9a55'], 3, 9); }, true);
T.water = () => canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#3a86a8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(220,245,255,.45)'; x.lineWidth = 3; for (let i = 0; i < 14; i++) { x.beginPath(); const y = rnd(0, h); x.moveTo(0, y); x.quadraticCurveTo(w / 2, y + rnd(-12, 12), w, y); x.stroke(); } }, true);
T.swirl = (c1, c2) => canvasTex(256, 256, (x, w, h) => {
  const g = x.createRadialGradient(128, 128, 4, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, c1); g.addColorStop(0.8, c2); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 5; for (let k = 0; k < 6; k++) { x.beginPath(); for (let t = 0; t < 1; t += 0.02) { const a = k / 6 * 6.283 + t * 5, r = t * 120; t ? x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r) : x.moveTo(128, 128); } x.stroke(); }
});
let TEX = null; function tex() { if (!TEX) TEX = {}; return TEX; }
function getTex(k, ...a) { const c = tex(); return c[k] || (c[k] = T[k](...a)); }

/* ---------- reusable assets (power-ups, collectibles, portal) ---------- */
export function wingsMesh(scale = 1) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const parts = [];
    for (let i = 0; i < 6; i++) { const a = -0.25 + i * 0.22, L = 0.95 - i * 0.09; parts.push(P(G.sphLo, i % 2 ? '#ffe4ef' : '#ffffff', s * (0.18 + Math.cos(a) * L * 0.5), 0.1 + Math.sin(a) * L * 0.55, 0, 0, 0, s * (a + 0.2), L, 0.2, 0.08)); }
    for (let i = 0; i < 4; i++) parts.push(P(G.sphLo, '#fff6fa', s * (0.25 + i * 0.13), 0.42 - i * 0.03, 0.02, 0, 0, s * 0.35, 0.36, 0.16, 0.08));
    const w = new THREE.Mesh(merge(parts), new THREE.MeshToonMaterial({ vertexColors: true, emissive: 0x9a6070, emissiveIntensity: 0.35 }));
    const piv = new THREE.Group(); piv.add(w); piv.userData.side = s; g.add(piv);
  }
  const gl = glow('#ffd6e8', 2.6, 0.55); gl.position.y = 0.2; g.add(gl);
  g.scale.setScalar(scale); g.userData.wings = g.children.filter(c => c.isGroup);
  return g;
}
export function flapWings(w, t, k = 1) { for (const p of w.userData.wings) p.rotation.y = p.userData.side * (0.35 + Math.sin(t * 9) * 0.45 * k); }
export const SHIELD_TEX = canvasTex(256, 128, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,240,180,.35)'); g.addColorStop(0.5, 'rgba(255,215,110,.04)'); g.addColorStop(1, 'rgba(255,240,180,.3)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (const u of [0.25, 0.75]) { const cx = u * w, cy = h * 0.5; x.fillStyle = 'rgba(255,236,150,1)'; x.fillRect(cx - 5, cy - 30, 10, 60); x.fillRect(cx - 19, cy - 14, 38, 10); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.5; x.strokeRect(cx - 4, cy - 26, 8, 52); }
  x.strokeStyle = 'rgba(255,245,200,.5)'; x.lineWidth = 2; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * h / 6); x.lineTo(w, i * h / 6); x.stroke(); }
});
export function scrollMesh() {
  return mergedMesh([
    P(G.cyl, '#f6e7c1', 0, 0, 0, 0, 0, Math.PI / 2, 0.56, 1.3, 0.56),
    P(G.cyl, '#e9d3a0', 0, 0, 0.02, 0, 0, Math.PI / 2, 0.5, 1.32, 0.5),
    P(G.cyl, '#7a4a26', -0.75, 0, 0, 0, 0, Math.PI / 2, 0.2, 0.32, 0.2), P(G.cyl, '#7a4a26', 0.75, 0, 0, 0, 0, Math.PI / 2, 0.2, 0.32, 0.2),
    P(G.sphLo, '#c9a24a', -0.93, 0, 0, 0, 0, 0, 0.2, 0.2, 0.2), P(G.sphLo, '#c9a24a', 0.93, 0, 0, 0, 0, 0, 0.2, 0.2, 0.2),
    P(G.box, '#b71c1c', 0, -0.05, 0.27, 0, 0, 0, 0.12, 0.62, 0.06),
    P(G.cyl, '#c62828', 0, 0, 0.3, Math.PI / 2, 0, 0, 0.3, 0.07, 0.3), P(G.cyl, '#e53935', 0, 0, 0.34, Math.PI / 2, 0, 0, 0.18, 0.03, 0.18),
  ], 0.04, false);
}
export function lampGeo() {
  return merge([
    P(G.sphLo, '#ffc233', 0, 0, 0, 0, 0, 0, 0.62, 0.3, 0.42), P(G.cone, '#ffb300', 0.38, 0.06, 0, 0, 0, -1.35, 0.16, 0.36, 0.16),
    P(new THREE.TorusGeometry(0.12, 0.04, 4, 10), '#e09a00', -0.34, 0.05, 0), P(G.cyl6, '#ffd54f', 0, -0.15, 0, 0, 0, 0, 0.3, 0.06, 0.3),
    P(G.cone, '#ff8f1e', 0.5, 0.33, 0, 0, 0, 0, 0.17, 0.36, 0.17), P(G.cone, '#fff59d', 0.5, 0.29, 0, 0, 0, 0, 0.09, 0.2, 0.09),
  ]).scale(1.25, 1.25, 1.25);
}
export function coinGeo() { return merge([P(G.cyl, '#d7dde6', 0, 0, 0, Math.PI / 2, 0, 0, 0.66, 0.09, 0.66), P(G.cyl, '#f4f7fb', 0, 0, 0.03, Math.PI / 2, 0, 0, 0.44, 0.06, 0.44), P(G.box, '#aab4c2', 0, 0, 0.065, 0, 0, 0, 0.08, 0.26, 0.02)]); }
export function portalMesh(label, c1 = 'rgba(255,214,90,.85)', c2 = 'rgba(255,140,40,.35)') {
  const g = new THREE.Group();
  const parts = [];
  for (const s of [-1, 1]) { parts.push(P(G.box, '#f3d37a', s * 7, 4.4, 0, 0, 0, 0, 1.1, 8.8, 1.1), P(G.box, '#e0b44a', s * 7, 0.3, 0, 0, 0, 0, 1.6, 0.6, 1.6), P(G.box, '#fff0b8', s * 7, 8.9, 0, 0, 0, 0, 1.5, 0.4, 1.5)); }
  parts.push(P(HALF_T(7, 0.5), '#f6d06a', 0, 8.9, 0));
  const frame = mergedMesh(parts, 0.05, false); g.add(frame);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6.4, 40), new THREE.MeshBasicMaterial({ map: T.swirl(c1, c2), transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  disc.position.y = 6.2; disc.scale.y = 1.05; g.add(disc); g.userData.disc = disc;
  const gl = glow('#ffd36a', 22, 0.5); gl.position.y = 7; g.add(gl);
  if (label) {
    const t = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#3b2306'; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 30); x.fill(); x.strokeStyle = '#ffd23f'; x.lineWidth = 7; x.stroke(); x.fillStyle = '#ffe9a6'; x.font = '900 56px system-ui,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, w / 2, h / 2 + 3, w - 40); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, transparent: true })); sg.position.set(0, 12.4, 0.4); g.add(sg);
  }
  return g;
}

/* ---------- obstacles (each returns a Group; registered into main's OBS table) ---------- */
function lion(stone = '#d6ccb6', dark = '#b3a68b') {
  const p = [P(G.box, '#cdbf9f', 0, 0.55, 0, 0, 0, 0, 1.9, 1.1, 1.9), P(G.box, '#e2d6bb', 0, 1.15, 0, 0, 0, 0, 2.1, 0.14, 2.1), P(G.box, '#bfb08f', 0, 0.05, 0, 0, 0, 0, 2.2, 0.12, 2.2)];
  const y = 1.25;
  p.push(P(G.sphLo, stone, 0, y + 0.75, -0.05, 0, 0, 0, 0.95, 0.85, 1.5), P(G.sphLo, stone, 0, y + 1.05, 0.45, -0.3, 0, 0, 0.95, 1.05, 0.9));
  p.push(P(G.ico, dark, 0, y + 1.6, 0.7, 0, 0, 0, 1.25, 1.2, 0.9), P(G.sphLo, stone, 0, y + 1.6, 0.95, 0, 0, 0, 0.72, 0.68, 0.7));
  p.push(P(G.box, '#5a4a3a', 0, y + 1.42, 1.28, 0.25, 0, 0, 0.36, 0.2, 0.1), P(G.sphLo, stone, 0, y + 1.5, 1.22, 0, 0, 0, 0.42, 0.3, 0.32));
  for (const s of [-1, 1]) { p.push(P(G.box, stone, s * 0.3, y + 0.3, 0.55, 0, 0, 0, 0.26, 0.7, 0.3), P(G.box, stone, s * 0.32, y + 0.3, -0.55, 0, 0, 0, 0.28, 0.6, 0.36), P(G.sphLo, dark, s * 0.25, y + 1.95, 0.85, 0, 0, 0, 0.22, 0.22, 0.16), P(G.sphLo, '#3a2c20', s * 0.18, y + 1.72, 1.2, 0, 0, 0, 0.09, 0.09, 0.05)); }
  p.push(P(G.cyl6, stone, 0, y + 0.95, -0.9, 0.9, 0, 0, 0.1, 0.8, 0.1), P(G.sphLo, dark, 0, y + 1.25, -1.2, 0, 0, 0, 0.22, 0.22, 0.22));
  const g = new THREE.Group(); const m = mergedMesh(p, 0.04); m.rotation.y = Math.PI; g.add(m); return g;
}
function pillar(col = '#e2d5bb', moss) {
  const p = [P(G.box, '#cbbd9e', 0, 0.2, 0, 0, 0, 0, 1.5, 0.4, 1.5), P(G.cyl, col, 0, 2.2, 0, 0, 0, 0, 1.1, 3.6, 1.1), P(G.box, '#cbbd9e', 0, 4.15, 0, 0, 0, 0, 1.55, 0.35, 1.55), P(G.cyl, '#d8caa9', 0, 3.9, 0, 0, 0, 0, 1.3, 0.25, 1.3)];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.push(P(G.box, '#c9b998', Math.cos(a) * 0.53, 2.2, Math.sin(a) * 0.53, 0, -a, 0, 0.08, 3.4, 0.08)); }
  p.push(P(G.box, '#a68f6a', 0, 2.6, 0.56, 0, 0, 0, 0.5, 0.06, 0.02), P(G.box, '#a68f6a', 0, 2.3, 0.56, 0, 0, 0, 0.06, 0.6, 0.02));
  if (moss) for (let i = 0; i < 5; i++) p.push(P(G.sphLo, pick(['#2e8b57', '#3aa36b', '#ff7f6e']), rnd(-0.5, 0.5), rnd(0.3, 1.6), 0.5, 0, 0, 0, 0.3, 0.3, 0.2));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.04)); return g;
}
function logs(n = 1, wide) {
  const p = []; const L = wide ? 10.8 : 2.4;
  for (let i = 0; i < n; i++) { const z = (i - (n - 1) / 2) * 0.75; p.push(P(G.cyl, '#7a5230', 0, 0.38, z, 0, 0.05 * (i - 1), Math.PI / 2, 0.76, L, 0.76), P(G.cyl, '#c89a62', L / 2, 0.38, z, 0, 0, Math.PI / 2, 0.6, 0.04, 0.6), P(G.cyl, '#c89a62', -L / 2, 0.38, z, 0, 0, Math.PI / 2, 0.6, 0.04, 0.6)); }
  if (wide) for (let i = 0; i < 4; i++) p.push(P(G.box, '#a0703c', rnd(-4, 4), 0.95, rnd(-0.3, 0.3), 0, rnd(0, 1), 0, 0.7, 0.6, 0.7), P(G.sphLo, '#3d9a3a', rnd(-5, 5), 0.8, 0.3, 0, 0, 0, 0.5, 0.3, 0.4));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.035)); return g;
}
function rock(cols = ['#9c9486', '#b1a998'], moss = '#5fae3c') { const p = [P(G.ico, cols[0], 0, 0.42, 0, 0, 0, 0, 1.6, 0.9, 1.2), P(G.ico, cols[1], 0.45, 0.6, 0.1, 0, 0, 0, 0.8, 0.6, 0.7)]; if (moss) p.push(P(G.sphLo, moss, -0.2, 0.82, 0, 0, 0, 0, 0.9, 0.2, 0.7)); const g = new THREE.Group(); g.add(mergedMesh(p, 0.035)); return g; }
function coral() { const p = [P(G.ico, '#9a8d79', 0, 0.3, 0, 0, 0, 0, 1.7, 0.6, 1.2)]; for (let i = 0; i < 7; i++) p.push(P(G.cyl6, pick(['#ff6f61', '#ff9e5e', '#e858a8', '#ffcf5a']), rnd(-0.6, 0.6), 0.75, rnd(-0.3, 0.3), rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4), 0.16, rnd(0.5, 0.9), 0.16)); p.push(P(G.sphLo, '#ffb3d1', 0.3, 1.05, 0, 0, 0, 0, 0.3, 0.3, 0.3)); const g = new THREE.Group(); g.add(mergedMesh(p, 0.03)); return g; }
function pots() { const p = []; [[-0.45, 0], [0.42, 0.1], [0, -0.3]].forEach(([x, z], i) => { const s = i === 2 ? 1.15 : 0.9; p.push(P(G.sph, i % 2 ? '#b8562e' : '#c96a3a', x, 0.45 * s, z, 0, 0, 0, 0.8 * s, 0.85 * s, 0.8 * s), P(G.cyl, '#a54a26', x, 0.92 * s, z, 0, 0, 0, 0.35 * s, 0.22 * s, 0.35 * s), P(G.box, '#f0d9a0', x, 0.45 * s, z + 0.39 * s, 0, 0, 0, 0.5 * s, 0.06, 0.02)); }); const g = new THREE.Group(); g.add(mergedMesh(p, 0.035)); return g; }
function vineArch() {
  const p = [P(G.cyl6, '#8a6a42', -1.35, 1.1, 0, 0, 0, 0, 0.22, 2.2, 0.22), P(G.cyl6, '#8a6a42', 1.35, 1.1, 0, 0, 0, 0, 0.22, 2.2, 0.22), P(G.box, '#4f9e35', 0, 2.25, 0, 0, 0, 0, 3.0, 0.5, 0.5)];
  for (let i = 0; i < 11; i++) p.push(P(G.sphLo, pick(['#ff4fa3', '#b36bff', '#ff9a2e', '#ffe14a', '#5cbf3f', '#5cbf3f']), -1.4 + i * 0.28, 2.0 + rnd(-0.1, 0.3), rnd(-0.2, 0.3), 0, 0, 0, 0.42, 0.36, 0.36));
  for (let i = 0; i < 5; i++) p.push(P(G.cyl6, '#4f9e35', -1.2 + i * 0.6, 2.0 - 0.2, 0.1, 0, 0, 0, 0.06, rnd(0.2, 0.5), 0.06));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.03)); return g;
}
function brokenArch() {
  const p = [P(G.box, '#dcae6e', -1.35, 1.3, 0, 0, 0, 0, 0.6, 2.6, 0.9), P(G.box, '#cf9e5c', 1.35, 1.1, 0, 0, 0, 0, 0.6, 2.2, 0.9), P(G.box, '#e7bd80', -1.35, 2.65, 0, 0, 0, 0, 0.75, 0.2, 1.0)];
  p.push(P(HALF_T(1.35, 0.28, Math.PI * 0.72), '#e1b273', 0, 2.05, 0, 0, 0, 0.0, 1, 0.9, 1.6));
  p.push(P(G.box, '#d7a766', 0.95, 2.35, 0, 0, 0, -0.35, 0.8, 0.42, 0.9), P(G.box, '#c9934f', 1.3, 0.25, 0.6, 0.2, 0.4, 0.3, 0.5, 0.4, 0.4));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.035)); return g;
}
function fallenColumn() {
  const p = [P(G.cyl, '#e3cfa6', 0, 0.55, 0, 0, 0, Math.PI / 2, 1.1, 10.4, 1.1)];
  for (let i = 0; i < 6; i++) p.push(P(G.box, '#c7b085', 0, 0.55 + Math.sin(i) * 0.5, Math.cos(i) * 0.5, i, 0, 0, 10.2, 0.06, 0.06));
  p.push(P(G.box, '#d9c294', 5.5, 0.75, 0, 0, 0.2, 0, 1.4, 1.5, 1.5), P(G.box, '#cfb685', -5.3, 0.6, 0.1, 0, -0.3, 0.2, 0.9, 1.1, 1.2));
  for (let i = 0; i < 5; i++) p.push(P(G.ico, '#c4a57a', rnd(-5, 5), 0.15, rnd(-0.9, 0.9), 0, 0, 0, 0.4, 0.25, 0.3));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.04)); return g;
}
function chariotWreck() {
  const p = [P(G.box, '#8a6a3c', 0, 0.75, 0, 0.1, 0.2, 0.25, 1.6, 0.9, 1.4), P(G.box, '#c9a23e', 0, 1.25, 0.55, 0.1, 0.2, 0.25, 1.6, 0.18, 0.12), P(G.cyl6, '#6d5030', 0.2, 0.6, -1.1, 0.4, 0, 0, 0.1, 1.6, 0.1)];
  p.push(P(new THREE.TorusGeometry(0.75, 0.1, 6, 16), '#b8892e', -0.95, 0.85, 0.1, 0, Math.PI / 2 + 0.2, 0.15)); for (let i = 0; i < 4; i++) p.push(P(G.box, '#a07a32', -0.95, 0.85, 0.1, i * 0.8, Math.PI / 2 + 0.2, 0, 0.06, 1.4, 0.06));
  for (let i = 0; i < 4; i++) p.push(P(G.sphLo, pick(['#2e8b57', '#ff7f6e', '#ffb3d1']), rnd(-0.6, 0.6), rnd(0.2, 1.1), 0.7, 0, 0, 0, 0.28, 0.28, 0.2));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.035)); return g;
}
function dropStone() { const p = [P(G.cyl, '#dcbf8e', 0, 0.75, 0, 0, 0.3, 0, 1.4, 1.5, 1.4), P(G.box, '#c9a873', 0, 1.55, 0, 0, 0.3, 0, 1.6, 0.22, 1.6)]; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; p.push(P(G.box, '#c2a273', Math.cos(a) * 0.68, 0.75, Math.sin(a) * 0.68, 0, -a, 0, 0.07, 1.4, 0.07)); } const g = new THREE.Group(); g.add(mergedMesh(p, 0.04)); return g; }
export function chariotMesh() {
  const g = new THREE.Group();
  const p = [P(G.box, '#c9952e', 0, 1.1, 0.6, 0, 0, 0, 1.7, 1.0, 1.2), P(G.box, '#f2c14e', 0, 1.65, 0.6, 0, 0, 0, 1.8, 0.14, 1.3), P(G.box, '#8b1c1c', 0, 1.25, 1.2, 0, 0, 0, 1.4, 0.5, 0.06), P(G.cyl6, '#6d4c2f', 0, 1.0, -0.9, Math.PI / 2, 0, 0, 0.12, 2.2, 0.12)];
  for (const s of [-1, 1]) { p.push(P(new THREE.TorusGeometry(0.62, 0.1, 6, 16), '#e0b040', s * 1.0, 0.65, 0.6, 0, Math.PI / 2, 0)); for (let i = 0; i < 3; i++) p.push(P(G.box, '#b88a2a', s * 1.0, 0.65, 0.6, i * 1.05, 0, 0, 0.06, 1.15, 0.06)); }
  for (const s of [-1, 1]) { const x = s * 0.5, z = -1.9; p.push(P(G.sphLo, '#5d3a22', x, 1.45, z, 0, 0, 0, 0.7, 0.75, 1.7), P(G.sphLo, '#5d3a22', x, 2.05, z - 0.9, -0.6, 0, 0, 0.36, 0.42, 0.75), P(G.box, '#2b1a10', x, 2.15, z - 0.55, -0.5, 0, 0, 0.12, 0.5, 0.5)); for (const [lx, lz] of [[-0.18, 0.5], [0.18, 0.5], [-0.18, -0.6], [0.18, -0.6]]) p.push(P(G.box, '#4a2e1a', x + lx, 0.55, z + lz, 0, 0, 0, 0.14, 1.1, 0.14)); }
  p.push(P(G.sphLo, '#d9a066', 0, 2.35, 0.7, 0, 0, 0, 0.5, 0.5, 0.5), P(G.box, '#f5f0e0', 0, 1.95, 0.75, 0, 0, 0, 0.6, 0.6, 0.4), P(G.cyl, '#2f6fd6', 0, 2.7, 0.7, 0, 0, 0, 0.55, 0.32, 0.55), P(G.box, '#ffd23f', 0, 2.62, 0.95, 0, 0, 0, 0.5, 0.12, 0.05));
  const m = mergedMesh(p, 0.04); m.rotation.y = Math.PI; g.add(m);
  const gl = glow('#ff6a3d', 4, 0.35); gl.position.y = 1.5; g.add(gl);
  return g;
}
// type → definition (same fields as main's OBS)
export const VOBS = {
  vLion: { make: () => lion(), rel: 1, jump: false, len: 2.2, big: true, parked: true },
  vLionS: { make: () => lion('#e7c48c', '#c99a5a'), rel: 1, jump: false, len: 2.2, big: true, parked: true },
  vPillar: { make: () => pillar(), rel: 1, jump: false, len: 1.6, big: true, parked: true },
  vPillarW: { make: () => pillar('#b3a68d', true), rel: 1, jump: false, len: 1.6, big: true, parked: true },
  vLog: { make: () => logs(1), rel: 1, jump: true, len: 1.0 },
  vLogW: { make: () => logs(2, true), rel: 1, jump: true, len: 1.6, wide: true },
  vRock: { make: () => rock(), rel: 1, jump: true, len: 1.3 },
  vStone: { make: () => rock(['#c99a5f', '#ddb178'], null), rel: 1, jump: true, len: 1.3 },
  vCoral: { make: coral, rel: 1, jump: true, len: 1.3 },
  vPots: { make: pots, rel: 1, jump: true, len: 1.2 },
  vVine: { make: vineArch, rel: 1, slide: true, len: 0.6, over: 1.85 },
  vArch: { make: brokenArch, rel: 1, slide: true, len: 0.9, over: 1.85 },
  vColumn: { make: fallenColumn, rel: 1, jump: true, len: 1.4, wide: true },
  vWreck: { make: chariotWreck, rel: 1, jump: false, len: 2.0, big: true, parked: true },
  vDrop: { make: dropStone, rel: 1, jump: false, len: 1.5 },
};
export const VOBS_NAMES = { vLion: 'You ran into a stone lion!', vLionS: 'You ran into a stone lion!', vPillar: 'A stone pillar stood in your way!', vPillarW: 'You hit a carved pillar on the seabed!', vWreck: 'You crashed into a sunken chariot!', chariot: "Pharaoh's chariot ran you down!" };

/* ---------- scrolling decor ---------- */
class Decor {
  constructor(group) { this.g = group; this.sets = []; this.objs = []; this.texs = []; }
  inst(geo, mat, n, gen, span = 330, shadow = false) {
    const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = shadow; im.receiveShadow = false;
    const data = []; for (let i = 0; i < n; i++) data.push({ y: 0, r: Math.random() * 6.28, s: 1, ...gen(i, -310 + (i + Math.random() * 0.8) * span / n) });
    const set = { im, data, span }; this.sets.push(set); this.g.add(im); this.write(set); return set;
  }
  write(set) { const { im, data } = set; for (let i = 0; i < data.length; i++) { const d = data[i]; _e.set(d.rx || 0, d.r, d.rz || 0); _q.setFromEuler(_e); _m.compose(_p.set(d.x, d.y + (d.dy || 0), d.z), _q, _s.set(d.s * (d.sx || 1), d.s * (d.sy || 1), d.s * (d.sz || 1))); im.setMatrixAt(i, _m); } im.instanceMatrix.needsUpdate = true; }
  obj(o, x, y, z, span = 330, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; this.objs.push({ o, span }); this.g.add(o); return o; }
  scrollTex(t, k) { this.texs.push([t, k]); }
  move(m) {
    for (const s of this.sets) { for (const d of s.data) { d.z += m; if (d.z > 26) d.z -= s.span; } this.write(s); }
    for (const r of this.objs) { r.o.position.z += m; if (r.o.position.z > 40) r.o.position.z -= r.span; r.o.visible = r.o.position.z > -330; }
    for (const [t, k] of this.texs) t.offset.y += m * k;
  }
}
function plane(w, h, mat, x, y, z, rx = -Math.PI / 2) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.rotation.x = rx; m.position.set(x, y, z); m.receiveShadow = true; return m; }
const side = () => (Math.random() < 0.5 ? -1 : 1);

/* ---------- Genesis: Eden ---------- */
function fruitTree() { const p = [P(G.cyl6, '#7a5230', 0, 1.3, 0, 0, 0, 0, 0.55, 2.6, 0.55), P(G.cyl6, '#7a5230', 0.5, 2.6, 0, 0, 0, -0.6, 0.25, 1.2, 0.25)]; p.push(P(G.ico, '#3f9e3a', 0, 4.0, 0, 0, 0, 0, 3.6, 2.9, 3.6), P(G.ico, '#58b947', 0.9, 4.7, 0.4, 0, 0, 0, 2.4, 2.1, 2.4), P(G.ico, '#2f8a34', -1.0, 3.6, -0.4, 0, 0, 0, 2.4, 2.0, 2.4)); return merge(p); }
function fruitGeo() { const p = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, r = rnd(1.2, 1.75); p.push(P(G.sphLo, '#ffffff', Math.cos(a) * r, rnd(3.1, 5.0), Math.sin(a) * r, 0, 0, 0, 0.42, 0.42, 0.42)); } return merge(p); }
function flowerGeo(c) { const p = [P(G.cyl6, '#3e8f33', 0, 0.55, 0, 0, 0, 0, 0.09, 1.1, 0.09), P(G.box, '#4fa53c', 0.22, 0.45, 0, 0, 0, 0.8, 0.5, 0.06, 0.24), P(G.box, '#4fa53c', -0.2, 0.7, 0, 0, 0, -0.8, 0.45, 0.06, 0.22)]; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; p.push(P(G.sphLo, c, Math.cos(a) * 0.34, 1.2, Math.sin(a) * 0.34, 0, -a, 0.5, 0.48, 0.16, 0.3)); } p.push(P(G.sphLo, '#ffd23f', 0, 1.24, 0, 0, 0, 0, 0.28, 0.2, 0.28)); return merge(p); }
function bushGeo() { return merge([P(G.ico, '#4aa33c', 0, 0.5, 0, 0, 0, 0, 1.6, 1.1, 1.4), P(G.ico, '#62bd4a', 0.5, 0.75, 0.2, 0, 0, 0, 0.9, 0.8, 0.9), P(G.sphLo, '#ff7ab8', -0.3, 1.0, 0.4, 0, 0, 0, 0.25, 0.25, 0.25), P(G.sphLo, '#fff176', 0.4, 1.1, -0.2, 0, 0, 0, 0.2, 0.2, 0.2)]); }
function fountain() {
  const p = [P(G.cyl, '#f3efe6', 0, 0.35, 0, 0, 0, 0, 4.6, 0.7, 4.6), P(G.cyl, '#7fd0ea', 0, 0.68, 0, 0, 0, 0, 4.1, 0.08, 4.1), P(G.cyl, '#e8e2d4', 0, 1.6, 0, 0, 0, 0, 0.7, 2.0, 0.7), P(G.cyl, '#f7f4ec', 0, 2.6, 0, 0, 0, 0, 2.6, 0.35, 2.6), P(G.cyl, '#8fdcf0', 0, 2.8, 0, 0, 0, 0, 2.3, 0.06, 2.3), P(G.cyl, '#e8e2d4', 0, 3.4, 0, 0, 0, 0, 0.45, 1.3, 0.45), P(G.cyl, '#f7f4ec', 0, 4.1, 0, 0, 0, 0, 1.4, 0.26, 1.4), P(G.sphLo, '#f7f4ec', 0, 4.6, 0, 0, 0, 0, 0.5, 0.7, 0.5)];
  const g = new THREE.Group(); g.add(mergedMesh(p, 0.04)); const gl = glow('#bff3ff', 4, 0.4); gl.position.y = 4.4; g.add(gl); g.userData.spray = [0, 4.8]; return g;
}
function palace() {
  const g = new THREE.Group(), gold = c => new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: 0.92 });
  const p = [P(G.box, '#f3cf73', 0, 9, 0, 0, 0, 0, 60, 18, 14), P(G.box, '#f7dc8f', 0, 19, 0, 0, 0, 0, 38, 4, 12), P(G.sph, '#ffe7a0', 0, 27, 0, 0, 0, 0, 20, 18, 20), P(G.cone, '#fff0b8', 0, 39, 0, 0, 0, 0, 2, 8, 2)];
  for (const s of [-1, 1]) { p.push(P(G.cyl, '#f5d681', s * 26, 18, 0, 0, 0, 0, 6, 36, 6), P(G.sph, '#ffe7a0', s * 26, 37, 0, 0, 0, 0, 7, 7, 7), P(G.cone, '#fff0b8', s * 26, 43, 0, 0, 0, 0, 1.2, 6, 1.2), P(G.cyl, '#f1cb6c', s * 14, 22, 0, 0, 0, 0, 4, 20, 4), P(G.sph, '#ffe7a0', s * 14, 33, 0, 0, 0, 0, 5, 5, 5)); }
  for (let i = 0; i < 9; i++) p.push(P(G.box, '#e3b65a', -24 + i * 6, 7, 7.2, 0, 0, 0, 2.2, 9, 0.4));
  const m = new THREE.Mesh(merge(p), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.78 })); g.add(m);
  const sunG = glow('#fff1b5', 150, 0.75); sunG.position.set(0, 34, -20); g.add(sunG);
  void gold; return g;
}
function buildGenesis(tier) {
  const g = new THREE.Group(), D = new Decor(g), lo = tier === 'low' ? 0.5 : tier === 'med' ? 0.75 : 1;
  const pt = getTex('edenPath'); pt.repeat.set(1, 41); D.scrollTex(pt, 1 / 8);
  const mt = getTex('meadow'); mt.repeat.set(40, 40); D.scrollTex(mt, 40 / 600);
  g.add(plane(600, 600, toon('#ffffff', { map: mt }), 0, -0.03, -150), plane(12.4, 330, toon('#ffffff', { map: pt }), 0, 0.01, -140));
  const tm = new THREE.MeshToonMaterial({ vertexColors: true });
  const trees = D.inst(fruitTree(), tm, Math.round(30 * lo), (i, z) => ({ x: side() * rnd(10.5, 30), z, s: rnd(0.85, 1.25) }), 330, true);
  const fr = new THREE.InstancedMesh(fruitGeo(), new THREE.MeshBasicMaterial({ color: 0xffffff }), trees.data.length); fr.frustumCulled = false;
  trees.data.forEach((d, i) => fr.setColorAt(i, new THREE.Color(i % 3 ? '#ff9a1f' : '#ffd84a'))); g.add(fr);
  D.sets.push({ im: fr, data: trees.data, span: 1e9, shared: true });
  ['#ff3fa4', '#a95cff', '#ff8a1e', '#ff5f7a'].forEach(c => D.inst(flowerGeo(c), tm, Math.round(18 * lo), (i, z) => ({ x: side() * rnd(6.9, 12), z, s: rnd(1.2, 2.1) })));
  D.inst(bushGeo(), tm, Math.round(26 * lo), (i, z) => ({ x: side() * rnd(6.8, 9.5), z, s: rnd(0.7, 1.2) }));
  const fountains = [D.obj(fountain(), 13, 0, -120, 330), D.obj(fountain(), -14, 0, -285, 330)];
  for (let i = 0; i < 3; i++) { const l = lion(); l.scale.setScalar(1.2); D.obj(l, (i % 2 ? -1 : 1) * 8.4, 0, -60 - i * 110, 330, (i % 2 ? 1 : -1) * 0.35); }
  const pal = palace(); pal.position.set(12, -2, -360); g.add(pal); const palGlow = pal.children[1];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(G.sphLo, new THREE.MeshBasicMaterial({ color: s > 0 ? '#9fd27a' : '#8cc96a', fog: false, transparent: true, opacity: 0.85 })); h.scale.set(rnd(90, 140), rnd(26, 40), 60); h.position.set(s * rnd(90, 160), -6, -300 - i * 30); g.add(h); }
  // flood water at the sides (boss)
  const wt = getTex('water'); wt.repeat.set(20, 20);
  const water = []; for (const s of [-1, 1]) { const w = plane(300, 600, new THREE.MeshLambertMaterial({ color: '#4ea3c8', map: wt, transparent: true, opacity: 0.88 }), s * 156.4, -1.5, -150); w.visible = false; g.add(w); water.push(w); }
  return {
    group: g, decor: D, lamps: false,
    obs: { dodge: ['vLion', 'vPillar'], jump: ['vLog', 'vRock'], slide: ['vVine'], wide: ['vLogW'] },
    bossObs: { dodge: ['vPillar'], jump: ['vLog', 'vRock'], slide: ['vVine'], wide: ['vLogW', 'vLogW'] },
    sky: { top: '#4aa8ff', mid: '#ffe6ad', bot: '#bfe39a', fog: '#f6e7bf', sun: '#fff0c8', sunI: 2.7, hemiS: '#fff3d6', hemiG: '#5f9a3a', hemiI: 1.7, sunPos: [0.15, 0.3, -1] },
    fogMul: 0.9,
    tick(dt, t, fx, bossK) {
      if (Math.random() < 0.5) fx.emit(rnd(-14, 14), rnd(0.5, 5), rnd(-50, 2), rnd(-0.3, 0.3), rnd(0.1, 0.5), rnd(-0.3, 0.3), 1.6, rnd(0.12, 0.22), pick(['#fff3a0', '#ffe082', '#ffffff']), 0.2);
      for (const f of fountains) if (f.position.z > -90 && f.position.z < 10 && Math.random() < 0.7) fx.emit(f.position.x + rnd(-0.2, 0.2), 4.8, f.position.z, rnd(-1.2, 1.2), rnd(2, 3.5), rnd(-1.2, 1.2), 0.8, 0.22, '#d9f6ff', 0.6);
      palGlow.material.opacity = 0.75 * (1 - bossK * 0.75); pal.children[0].material.opacity = 0.78 - bossK * 0.35;
      water.forEach(w => { w.visible = bossK > 0.01; w.position.y = -1.5 + bossK * 1.78 + Math.sin(t * 1.3) * 0.06; }); wt.offset.x = t * 0.05; wt.offset.y = t * 0.03;
    },
  };
}

/* ---------- Exodus: the Red Sea ---------- */
function fishGeo() { return merge([P(G.sphLo, '#ffffff', 0, 0, 0, 0, 0, 0, 0.5, 0.36, 1.0), P(G.cone, '#ffffff', 0, 0, -0.62, -Math.PI / 2, 0, 0, 0.42, 0.4, 0.12), P(G.box, '#ffffff', 0, 0.2, 0, 0, 0, 0, 0.04, 0.2, 0.35)]).rotateY(Math.PI / 2); }
function sharkGeo() { return merge([P(G.sphLo, '#8fa3b5', 0, 0, 0, 0, 0, 0, 1.1, 0.9, 3.6), P(G.cone, '#7f93a6', 0, 0.75, 0.2, -0.3, 0, 0, 0.3, 0.9, 0.7), P(G.cone, '#7f93a6', 0, 0.1, -2.2, -Math.PI / 2, 0, 0, 1.1, 1.0, 0.25), P(G.box, '#dfe7ee', 0, -0.32, 0.5, 0, 0, 0, 0.8, 0.2, 2.2), P(G.box, '#7f93a6', 0.6, -0.15, 0.6, 0, 0, -0.6, 0.9, 0.08, 0.5), P(G.box, '#7f93a6', -0.6, -0.15, 0.6, 0, 0, 0.6, 0.9, 0.08, 0.5)]).rotateY(Math.PI / 2); }
function seaweedGeo() { const p = []; for (let i = 0; i < 4; i++) p.push(P(G.cone, '#ffffff', rnd(-0.3, 0.3), 1.6, rnd(-0.3, 0.3), rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2), 0.3, rnd(2.4, 3.6), 0.12)); return merge(p); }
function coralGeo() { const p = [P(G.ico, '#ffffff', 0, 0.3, 0, 0, 0, 0, 1.2, 0.6, 1.0)]; for (let i = 0; i < 6; i++) p.push(P(G.cyl6, '#ffffff', rnd(-0.5, 0.5), 0.9, rnd(-0.4, 0.4), rnd(-0.5, 0.5), 0, rnd(-0.5, 0.5), 0.18, rnd(0.8, 1.4), 0.18)); return merge(p); }
function sunkCart() { const g = new THREE.Group(); const w = chariotWreck(); w.scale.setScalar(1.6); w.rotation.set(0.3, 0.6, 0.5); g.add(w); return g; }
function buildExodus(tier) {
  const g = new THREE.Group(), D = new Decor(g), lo = tier === 'low' ? 0.5 : tier === 'med' ? 0.75 : 1;
  const pt = getTex('seabed'); const pt2 = pt.clone(); pt.repeat.set(1, 41); D.scrollTex(pt, 1 / 8);
  g.add(plane(14, 330, toon('#ffffff', { map: pt }), 0, 0.01, -140));
  pt2.needsUpdate = true; pt2.repeat.set(30, 30); g.add(plane(600, 600, toon('#a88d62'), 0, -0.04, -150));
  const wt = getTex('wall'); wt.repeat.set(14, 1);
  const wallMat = new THREE.MeshBasicMaterial({ map: wt, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  const walls = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(16, 24, 350), wallMat); w.position.set(s * (7.0 + 8), 12, -150); w.renderOrder = 2; g.add(w); walls.push(w);
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(350, 24), new THREE.MeshBasicMaterial({ map: wt, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    sheen.rotation.y = s * -Math.PI / 2; sheen.position.set(s * 6.95, 12, -150); sheen.renderOrder = 3; g.add(sheen);
  }
  const ft = getTex('foam'); ft.repeat.set(30, 1);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(350, 1.8), new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false, opacity: 0.95, side: THREE.DoubleSide })); f.rotation.y = s * -Math.PI / 2; f.position.set(s * 6.9, 0.8, -150); f.renderOrder = 4; g.add(f); }
  const fm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x113344 });
  const fish = D.inst(fishGeo(), fm, Math.round(44 * lo), (i, z) => ({ x: side() * rnd(7.8, 13), y: rnd(1.5, 15), z, s: rnd(0.6, 1.1), r: 0, sw: rnd(0, 6) }));
  const FC = ['#ff8a1e', '#ffd23f', '#3fa9ff', '#ff5fa2', '#ffffff', '#7fffd4']; fish.data.forEach((d, i) => fish.im.setColorAt(i, new THREE.Color(FC[i % FC.length])));
  fish.data.forEach(d => { d.r = d.x > 0 ? Math.PI : 0; });
  const sharks = D.inst(sharkGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x0a2233 }), tier === 'low' ? 2 : 4, (i, z) => ({ x: (i % 2 ? -1 : 1) * rnd(10, 14), y: rnd(5, 13), z, s: rnd(0.9, 1.3), r: 0 }));
  sharks.data.forEach(d => { d.r = d.x > 0 ? Math.PI : 0; });
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const corals = D.inst(coralGeo(), cm, Math.round(30 * lo), (i, z) => ({ x: side() * rnd(7.4, 12), z, s: rnd(0.8, 1.6) }));
  corals.data.forEach((d, i) => corals.im.setColorAt(i, new THREE.Color(['#ff6f61', '#ff9e5e', '#e858a8', '#ffcf5a', '#b56bff'][i % 5])));
  const weeds = D.inst(seaweedGeo(), cm, Math.round(34 * lo), (i, z) => ({ x: side() * rnd(7.2, 12.5), z, s: rnd(0.8, 1.5) }));
  weeds.data.forEach((d, i) => weeds.im.setColorAt(i, new THREE.Color(i % 2 ? '#2e9e5b' : '#5cc46a')));
  // pebbles and shells along the seabed edges
  D.inst(merge([P(G.ico, '#ffffff', 0, 0.1, 0, 0, 0, 0, 0.5, 0.25, 0.4)]), new THREE.MeshLambertMaterial({ color: '#9a9184' }), Math.round(40 * lo), (i, z) => ({ x: side() * rnd(5, 6.8), z, s: rnd(0.6, 1.4) }));
  const sht = getTex('shaft'); const shafts = [];
  for (let i = 0; i < (tier === 'low' ? 4 : 7); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 26), new THREE.MeshBasicMaterial({ map: sht, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); m.rotation.set(0, rnd(-0.4, 0.4), rnd(-0.35, 0.35)); D.obj(m, rnd(-5, 5), 12, -20 - i * 47, 330); m.rotation.z = rnd(-0.3, 0.3); shafts.push(m); }
  D.obj(sunkCart(), 8.6, 3.2, -90, 330, 0.6); D.obj(sunkCart(), -8.8, 6.5, -250, 330, -0.8);
  for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 6, 18), toon('#b8892e')); w.rotation.set(0.4, 1.2, 0.3); D.obj(w, (i % 2 ? -1 : 1) * rnd(8, 9.5), rnd(1.5, 9), -40 - i * 100, 330); }
  return {
    group: g, decor: D, lamps: false,
    obs: { dodge: ['vPillarW', 'vWreck'], jump: ['vCoral', 'vRock'], slide: ['vArch'], wide: ['vColumn'] },
    bossObs: { dodge: ['vPillarW'], jump: ['vCoral'], slide: ['vArch'], wide: [] },
    sky: { top: '#0d3e6e', mid: '#6fd8e8', bot: '#14707f', fog: '#4fb6c6', sun: '#fff0c0', sunI: 2.2, hemiS: '#cdf6ff', hemiG: '#3a6a6a', hemiI: 1.65, sunPos: [0.0, 0.9, -0.4] },
    fogMul: 1.05,
    tick(dt, t, fx, bossK) {
      for (const d of fish.data) { d.sw += dt; d.dy = Math.sin(d.sw * 1.6) * 0.25; d.z += (d.x > 0 ? -1 : 1) * 0; }
      for (const d of sharks.data) d.dy = Math.sin(t * 0.8 + d.x) * 0.6;
      wt.offset.x = t * 0.015; ft.offset.x = -t * 0.08;
      if (Math.random() < 0.8) { const s = side(); fx.emit(s * 6.9, rnd(0.2, 1.4), rnd(-40, 2), -s * rnd(0.4, 1.4), rnd(0.8, 2.2), rnd(-0.5, 0.5), 0.7, rnd(0.2, 0.4), '#ffffff', 1.1); }
      if (Math.random() < 0.35) { const s = side(); fx.emit(s * rnd(6.95, 7.1), rnd(14, 22), rnd(-60, -10), -s * rnd(0.5, 1.5), rnd(-1, 0.5), 0, 1.2, rnd(0.4, 0.8), '#e9fdff', 0.8); }
      if (Math.random() < 0.4) fx.emit(rnd(-4, 4), rnd(0.2, 2), rnd(-30, 0), 0, rnd(0.6, 1.4), 0, 1.4, 0.1, '#d8fbff', 0.4);
      shafts.forEach((m, i) => { m.material.opacity = 0.22 + 0.12 * Math.sin(t * 0.9 + i) - bossK * 0.1; });
      walls.forEach(w => { w.position.y = 12 + bossK * Math.sin(t * 9) * 0.08; });
    },
  };
}

/* ---------- Leviticus: the holy road (aqueduct bridge, domed city, tabernacle) ---------- */
function oliveGeo() { return merge([P(G.cyl6, '#8a7458', 0, 1.0, 0, 0, 0, 0.15, 0.4, 2.0, 0.4), P(G.ico, '#8fa070', 0, 2.6, 0, 0, 0, 0, 2.6, 1.6, 2.4), P(G.ico, '#a3b384', 0.7, 3.0, 0.2, 0, 0, 0, 1.5, 1.1, 1.5)]); }
function pierGeo() { return merge([P(G.box, '#d39d5c', 5.7, -21, 0, 0, 0, 0, 1.6, 40, 2.4), P(G.box, '#d39d5c', -5.7, -21, 0, 0, 0, 0, 1.6, 40, 2.4), P(G.box, '#c58e50', 5.9, -41, 0, 0, 0, 0, 2.6, 1.2, 3.4), P(G.box, '#c58e50', -5.9, -41, 0, 0, 0, 0, 2.6, 1.2, 3.4), P(HALF_T(6.8, 0.8, Math.PI), '#dcab6b', 0, -12, 13, 0, Math.PI / 2, 0, 1, 1, 1.4), P(HALF_T(6.8, 0.8, Math.PI), '#dcab6b', 0, -12, -13, 0, Math.PI / 2, 0, 1, 1, 1.4)]); }
function aqueductSeg() { const p = []; for (const z of [-10, 10]) p.push(P(G.box, '#d7a96a', 0, -24, z, 0, 0, 0, 2.2, 36, 2.2)); p.push(P(HALF_T(9, 1.0, Math.PI), '#deb276', 0, -8, 0, 0, Math.PI / 2, 0), P(G.box, '#e3bb80', 0, 1.2, 0, 0, 0, 0, 2.8, 1.6, 20.2), P(G.box, '#cf9e5f', 0, -6, 0, 0, 0, 0, 2.4, 0.8, 20.2)); for (const z of [-5, 5]) p.push(P(G.box, '#d7a96a', 0, -3, z, 0, 0, 0, 1.4, 7, 1.4)); p.push(P(HALF_T(4.3, 0.6, Math.PI), '#deb276', 0, 0, -5, 0, Math.PI / 2, 0, 1, 0.6, 1), P(HALF_T(4.3, 0.6, Math.PI), '#deb276', 0, 0, 5, 0, Math.PI / 2, 0, 1, 0.6, 1)); return merge(p); }
function mesa(h, w) { const g = new THREE.Group(); const m = mergedMesh([P(G.cyl6, '#c27a45', 0, h / 2, 0, 0, 0, 0, w, h, w * 0.8), P(G.cyl6, '#d48d52', 0, h + 0.8, 0, 0, 0.3, 0, w * 1.02, 1.6, w * 0.82), P(G.cyl6, '#a8653a', 0, h * 0.35, 0, 0, 0, 0, w * 1.08, 1.2, w * 0.86)], 0, false); g.add(m); return g; }
function domedCity() {
  const p = [P(G.box, '#c78d55', 0, -20, 0, 0, 0, 0, 44, 40, 60)];
  const H = [[-12, -16, 7, 8], [4, -18, 9, 6], [14, -6, 7, 10], [-6, -2, 10, 7], [10, 12, 8, 6], [-14, 14, 7, 9], [0, 20, 11, 7], [-2, 6, 6, 12]];
  for (const [x, z, w, h] of H) {
    p.push(P(G.box, pick(['#f1d6a8', '#e9c993', '#f5e1bb', '#dfbd85']), x, h / 2, z, 0, 0, 0, w, h, w));
    if (Math.random() < 0.6) p.push(P(G.sph, pick(['#f7e7c6', '#d9a45e', '#e9f0f5']), x, h, z, 0, 0, 0, w * 0.8, w * 0.7, w * 0.8));
    else for (let k = 0; k < 3; k++) p.push(P(G.sph, '#c4622f', x - w / 3 + k * w / 3, h + 0.5, z + rnd(-1, 1), 0, 0, 0, 0.9, 1.0, 0.9), P(G.cyl, '#a54a26', x - w / 3 + k * w / 3, h + 1.1, z, 0, 0, 0, 0.4, 0.3, 0.4));
    p.push(P(G.box, '#7a4a26', x, h * 0.45, z + w / 2 + 0.02, 0, 0, 0, w * 0.18, h * 0.35, 0.05), P(G.box, '#6b4422', x + w / 3, h * 0.7, z + w / 2 + 0.02, 0, 0, 0, w * 0.12, w * 0.12, 0.05));
  }
  p.push(P(G.cyl, '#f0dcb0', -18, 9, -22, 0, 0, 0, 2.2, 18, 2.2), P(G.sph, '#d9a45e', -18, 18.5, -22, 0, 0, 0, 2.6, 2.6, 2.6));
  const g = new THREE.Group(); g.add(mergedMesh(p, 0, false)); return g;
}
function tabernacle() {
  const g = new THREE.Group(), p = [P(G.box, '#c98f55', 0, -21, 0, 0, 0, 0, 34, 42, 46), P(G.box, '#e7c38b', 0, 0.1, 0, 0, 0, 0, 30, 0.3, 42)];
  for (let i = 0; i <= 10; i++) for (const s of [-1, 1]) { p.push(P(G.cyl6, '#d9c08a', s * 13, 1.3, -19 + i * 3.8, 0, 0, 0, 0.18, 2.6, 0.18)); }
  for (let i = 0; i <= 6; i++) for (const s of [-1, 1]) p.push(P(G.cyl6, '#d9c08a', -13 + i * 4.33, 1.3, s * 19, 0, 0, 0, 0.18, 2.6, 0.18));
  for (const s of [-1, 1]) p.push(P(G.box, '#fbf8ef', s * 13, 1.5, 0, 0, 0, 0, 0.08, 2.2, 38), P(G.box, '#fbf8ef', s * 8.5, 1.5, 19, 0, 0, 0, 9, 2.2, 0.08), P(G.box, '#fbf8ef', 0, 1.5, -19, 0, 0, 0, 26, 2.2, 0.08));
  for (let i = 0; i < 4; i++) p.push(P(G.box, ['#2a55c9', '#7b2fa8', '#c62828', '#fbf8ef'][i], -4.5 + i * 3, 1.5, 19, 0, 0, 0, 2.95, 2.2, 0.1));
  p.push(P(G.box, '#7a4a2b', 0, 3.2, -8, 0, 0, 0, 9, 6.4, 18), P(G.box, '#2a55c9', 0, 3.2, 1.05, 0, 0, 0, 8.2, 5.6, 0.1));
  for (let i = 0; i < 5; i++) p.push(P(G.box, ['#2a55c9', '#7b2fa8', '#c62828', '#7b2fa8', '#2a55c9'][i], 0, 6.5 - i * 0.12, -8, 0, 0, 0, 9.3 - i * 0.05, 0.12, 18.2));
  for (let i = 0; i < 5; i++) p.push(P(G.cyl6, '#e2b23a', -3.6 + i * 1.8, 3, 1.15, 0, 0, 0, 0.22, 5.6, 0.22));
  p.push(P(G.box, '#a8723a', 0, 1.0, 10, 0, 0, 0, 3.2, 2.0, 3.2), P(G.box, '#c58b48', 0, 2.05, 10, 0, 0, 0, 3.5, 0.2, 3.5));
  for (const [x, z] of [[-1.6, 8.4], [1.6, 8.4], [-1.6, 11.6], [1.6, 11.6]]) p.push(P(G.cone, '#c58b48', x, 2.4, z, 0, 0, 0, 0.35, 0.6, 0.35));
  p.push(P(G.cyl, '#b0782f', 4, 0.7, 4.5, 0, 0, 0, 1.8, 1.4, 1.8), P(G.cyl, '#8fd3ea', 4, 1.42, 4.5, 0, 0, 0, 1.5, 0.05, 1.5));
  const m = mergedMesh(p, 0.03); g.add(m);
  const fl = glow('#ff9a2e', 6, 0.85); fl.position.set(0, 3.0, 10); g.add(fl);
  const flame = new THREE.Mesh(G.cone, new THREE.MeshBasicMaterial({ color: '#ff8a1e' })); flame.scale.set(1.2, 2.2, 1.2); flame.position.set(0, 3.1, 10); g.add(flame);
  const men = merge([P(G.cyl6, '#ffd23f', 0, 1.0, 0, 0, 0, 0, 0.12, 2.0, 0.12), P(G.cyl6, '#ffd23f', 0, 0.08, 0, 0, 0, 0, 0.6, 0.16, 0.6), ...[1, 2, 3].flatMap(k => [-1, 1].map(s => P(HALF_T(0.3 * k, 0.05, Math.PI / 2), '#ffd23f', s * 0.3 * k * 0, 2.0 - 0.0, 0, 0, 0, s > 0 ? -Math.PI / 2 : Math.PI, 1, 1, 1))), ...[-3, -2, -1, 0, 1, 2, 3].map(k => P(G.cone, '#ffb300', k * 0.3, 2.15, 0, 0, 0, 0, 0.1, 0.18, 0.1))]);
  const mm = new THREE.Mesh(men, new THREE.MeshBasicMaterial({ vertexColors: true })); mm.scale.setScalar(1.4); mm.position.set(-4.5, 0.2, 9); g.add(mm);
  const mg = glow('#ffd36a', 5, 0.6); mg.position.set(-4.5, 3.2, 9); g.add(mg);
  g.userData.fire = [0, 3.6, 10];
  return g;
}
function buildLeviticus(tier) {
  const g = new THREE.Group(), D = new Decor(g), lo = tier === 'low' ? 0.5 : tier === 'med' ? 0.75 : 1;
  const pt = getTex('blocks'); pt.repeat.set(2, 82); D.scrollTex(pt, 82 / 330);
  g.add(plane(12.6, 330, toon('#ffffff', { map: pt }), 0, 0.01, -140));
  const st = getTex('blocks', '#d9a865').clone(); st.needsUpdate = true; st.repeat.set(55, 1); st.wrapS = st.wrapT = THREE.RepeatWrapping;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(12.8, 3, 340), toon('#ffffff', { map: st })); deck.position.set(0, -1.52, -150); deck.receiveShadow = true; g.add(deck);
  const parMat = toon('#ffffff', { map: st });
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 340), parMat); w.position.set(s * 6.55, 0.42, -150); w.receiveShadow = true; w.castShadow = true; g.add(w); }
  const dt0 = getTex('desert'); dt0.repeat.set(40, 40); D.scrollTex(dt0, 40 / 900);
  g.add(plane(900, 900, toon('#ffffff', { map: dt0 }), 0, -42, -200));
  D.inst(pierGeo(), new THREE.MeshToonMaterial({ vertexColors: true }), 13, (i, z) => ({ x: 0, z, r: 0, s: 1 }), 338);
  D.inst(oliveGeo(), new THREE.MeshToonMaterial({ vertexColors: true }), Math.round(46 * lo), (i, z) => ({ x: side() * rnd(12, 80), y: -42, z, s: rnd(1.8, 2.8) }));
  D.inst(aqueductSeg(), new THREE.MeshToonMaterial({ vertexColors: true }), 17, (i, z) => ({ x: -34, y: -6, z: -310 + i * 20, r: 0, s: 1 }), 340).data.forEach((d, i) => { d.z = -310 + i * 20; });
  for (let i = 0; i < 6; i++) { const s = i % 2 ? -1 : 1; D.obj(mesa(rnd(40, 62), rnd(26, 46)), s * rnd(60, 90), -42, -40 - i * 110, 660); }
  // hazy horizon: mesas, a Roman aqueduct and a domed city in golden-hour light (static, unfogged silhouettes)
  { const hp = [];
    [[-150, 26, 60], [-95, 18, 40], [70, 30, 55], [140, 22, 70], [-20, 12, 30]].forEach(([x, h, w]) => hp.push(P(G.cyl6, '#dc9a63', x, h / 2 - 8, -380, 0, 0.4, 0, w, h + 16, w * 0.5), P(G.cyl6, '#e8ad74', x, h + 0.5, -380, 0, 0.4, 0, w * 1.03, 2, w * 0.52)));
    for (let i = 0; i < 11; i++) { const x = -128 + i * 10; hp.push(P(G.box, '#efc08c', x, -2, -320, 0, 0, 0, 1.8, 30, 1.8)); if (i < 10) hp.push(P(HALF_T(4.1, 0.7), '#efc08c', x + 5, 10.5, -320)); }
    hp.push(P(G.box, '#f3c894', -78, 15.4, -320, 0, 0, 0, 104, 1.6, 2.2));
    for (let i = 0; i < 10; i++) { const x = -124 + i * 10; hp.push(P(G.box, '#efc08c', x, 18.5, -320, 0, 0, 0, 0.9, 4.6, 0.9)); if (i < 9) hp.push(P(HALF_T(1.8, 0.4), '#efc08c', x + 2.5, 20.6, -320, 0, 0, 0, 1.4, 1, 1)); }
    [[48, 10, 9], [60, 14, 7], [72, 9, 10], [86, 16, 8], [100, 11, 9]].forEach(([x, h, w]) => { hp.push(P(G.box, '#f2d3a3', x, h / 2 - 2, -300, 0, 0, 0, w, h, w), P(G.sph, '#f7e3bf', x, h - 2, -300, 0, 0, 0, w * 0.8, w * 0.7, w * 0.8)); });
    const hz = new THREE.Mesh(merge(hp), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.72 })); g.add(hz); }
  const city = domedCity(); D.obj(city, 46, -2, -170, 400, -0.2);
  const tab = tabernacle(); D.obj(tab, -30, -0.6, -230, 1100, 0.25);
  // golden lamps on the parapet posts
  const lampG = lampGeo();
  const lamps = D.inst(lampG, basicVC, Math.round(18 * lo), (i, z) => ({ x: (i % 2 ? -1 : 1) * 6.55, y: 1.05, z: -300 + i * (330 / Math.round(18 * lo)), s: 0.8, r: 0 }));
  lamps.data.forEach((d, i) => { d.z = -300 + i * (330 / lamps.data.length); });
  return {
    group: g, decor: D, lamps: true,
    obs: { dodge: ['vLionS', 'vPillar'], jump: ['vPots', 'vStone'], slide: ['vArch'], wide: ['vColumn'] },
    bossObs: { dodge: ['vPillar'], jump: ['vPots', 'vStone'], slide: ['vArch'], wide: ['vColumn'] },
    sky: { top: '#3b6db3', mid: '#ffc98a', bot: '#d9a26a', fog: '#f4d3a6', sun: '#ffc985', sunI: 2.5, hemiS: '#ffe4bf', hemiG: '#9a6a3a', hemiI: 1.5, sunPos: [-0.55, 0.14, -1] },
    fogMul: 0.5,
    tick(dt, t, fx, bossK) {
      if (Math.random() < 0.6) fx.emit(rnd(-14, 14), rnd(0.3, 6), rnd(-50, 2), rnd(0.2, 0.8), rnd(0, 0.3), rnd(-0.2, 0.2), 2, rnd(0.08, 0.18), pick(['#ffe0a8', '#fff3d0', '#f0c080']), 0.2);
      if (tab.position.z > -150 && tab.position.z < 30 && Math.random() < 0.8) fx.emit(tab.position.x + 0.2, 3.8, tab.position.z + 9.5, rnd(-0.4, 0.4), rnd(1.5, 3), rnd(-0.4, 0.4), 0.7, 0.5, pick(['#ff9a2e', '#ffd23f']), 1.4);
      if (bossK > 0.01 && Math.random() < 0.5 * bossK) fx.emit(rnd(-6, 6), rnd(0, 0.6), rnd(-30, 0), rnd(-1, 1), rnd(0.5, 1.5), rnd(-1, 1), 1.2, 0.9, '#d8b585', 2.5);
    },
  };
}
export function buildWorld(id, tier = 'high') {
  const W = id === 'genesis' ? buildGenesis(tier) : id === 'exodus' ? buildExodus(tier) : buildLeviticus(tier);
  W.id = id; W.group.visible = false;
  // shared instanced sets (fruit on trees) follow their parent data; skip double-scrolling
  const D = W.decor; const own = D.sets.filter(s => !s.shared), shared = D.sets.filter(s => s.shared);
  W.move = (m, dt, t, fx, bossK) => {
    for (const s of own) { for (const d of s.data) { d.z += m; if (d.z > 26) d.z -= s.span; } D.write(s); }
    for (const s of shared) D.write(s);
    for (const r of D.objs) { r.o.position.z += m; if (r.o.position.z > 40) r.o.position.z -= r.span; r.o.visible = r.o.position.z > -360; }
    for (const [tx, k] of D.texs) tx.offset.y += m * k;
    W.tick(dt, t, fx, bossK);
  };
  return W;
}
