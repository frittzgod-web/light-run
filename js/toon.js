// Toon rendering helpers, merged geometry, textures, characters
import * as THREE from './vendor/three.min.js';
export { THREE };
import { makeHuman, poseHuman, bakeSkinned, clayMat } from './chibi.js';
export { makeHuman, poseHuman, setExpression, disposeHuman, clayMat, setCharTier } from './chibi.js';

// 3-tone gradient for cel shading
const gd = new Uint8Array([104, 104, 104, 255, 158, 158, 158, 255, 214, 214, 214, 255, 255, 255, 255, 255]);
export const GRAD = new THREE.DataTexture(gd, 4, 1, THREE.RGBAFormat);
GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;

// warm rim light on every toon material (cheap fresnel term)
export const RIM = { value: 0.42 };
export const SWAY_T = { value: 0 };
function addRim(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uRim = RIM;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRim;')
      .replace('#include <opaque_fragment>', 'float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);\noutgoingLight += rimF * uRim * vec3(1.0, 0.92, 0.78) * (0.35 + 0.65 * diffuseColor.rgb);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'rim';
  return m;
}
const SWAY_VS = `
  float swH = max(0.0, position.y - 1.2);
  vec4 swP = instanceMatrix[3];
  transformed.x += sin(uSway * 1.7 + swP.x * 0.37 + swP.z * 0.21) * swH * swH * 0.011;
  transformed.z += cos(uSway * 1.3 + swP.z * 0.29 + swP.x * 0.1) * swH * swH * 0.007;`;
// vertex-coloured toon material whose upper vertices sway (instanced palms / trees)
export function swayMats(th) {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD });
  m.onBeforeCompile = sh => {
    sh.uniforms.uRim = RIM; sh.uniforms.uSway = SWAY_T;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSway;').replace('#include <begin_vertex>', '#include <begin_vertex>' + SWAY_VS);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRim;')
      .replace('#include <opaque_fragment>', 'float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);\noutgoingLight += rimF * uRim * vec3(1.0, 0.92, 0.78) * (0.35 + 0.65 * diffuseColor.rgb);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'sway';
  const o = new THREE.MeshBasicMaterial({ color: 0x1a1206, side: THREE.BackSide });
  o.onBeforeCompile = sh => { sh.uniforms.uSway = SWAY_T; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSway;').replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${th.toFixed(4)};` + SWAY_VS); };
  o.customProgramCacheKey = () => 'swayol' + th;
  return [m, o];
}
const matCache = new Map();
export function toon(color, extra = {}) {
  const key = color + JSON.stringify(Object.keys(extra)) + (extra.map ? extra.map.uuid : '') + (extra.side || '');
  if (matCache.has(key)) return matCache.get(key);
  const m = addRim(new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...extra }));
  matCache.set(key, m);
  return m;
}
export const VC = addRim(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD }));
export const BASIC_GLOW = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });

const olCache = new Map();
// v7: softer, thinner ink lines on scenery (characters have none: they are soft clay now)
export function outlineMat(th = 0.03, color = 0x3a2a1c) {
  th *= 0.7; const k = th + '_' + color; if (olCache.has(k)) return olCache.get(k);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${th.toFixed(4)};`); };
  m.customProgramCacheKey = () => 'ol' + th;
  olCache.set(k, m); return m;
}
export function outline(mesh, th = 0.03) {
  const o = mesh.isInstancedMesh ? new THREE.InstancedMesh(mesh.geometry, outlineMat(th), mesh.count) : new THREE.Mesh(mesh.geometry, outlineMat(th));
  if (mesh.isInstancedMesh) { o.instanceMatrix = mesh.instanceMatrix; o.frustumCulled = false; }
  o.castShadow = false; o.receiveShadow = false; o.userData.outline = true;
  mesh.add(o); return mesh;
}

// ---- merged vertex-coloured geometry ----
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export function P(g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
  return { g, c, m: new THREE.Matrix4().compose(_v, _q, _s) };
}
export function merge(parts) {
  let n = 0; const gs = parts.map(p => { const g = (p.g.index ? p.g.toNonIndexed() : p.g.clone()); g.applyMatrix4(p.m); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0; const c = new THREE.Color();
  gs.forEach((g, i) => {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    c.set(parts[i].c); const cnt = g.attributes.position.count;
    for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
    o += cnt; g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}
export function mergedMesh(parts, th = 0.04, shadow = true) {
  const m = new THREE.Mesh(merge(parts), VC); m.castShadow = shadow; m.receiveShadow = true;
  if (th) outline(m, th); return m;
}
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  sph: new THREE.SphereGeometry(0.5, 18, 13),
  sphLo: new THREE.SphereGeometry(0.5, 10, 7),
  ico: new THREE.IcosahedronGeometry(0.5, 1),
  wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 16).rotateZ(Math.PI / 2),
};

// ---- canvas textures ----
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const ANK = [
  ['#e8541e', '#1b5e20', '#ffd23f', '#0d47a1'], ['#6a1b9a', '#ffb300', '#00897b', '#fff'], ['#0277bd', '#ff7043', '#fdd835', '#1a237e'],
  ['#c62828', '#ffeb3b', '#2e7d32', '#000'], ['#00695c', '#f06292', '#ffca28', '#fff'], ['#ef6c00', '#4527a0', '#81d4fa', '#fff'],
  ['#f9a825', '#1b5e20', '#c62828', '#111'], ['#1a237e', '#bbdefb', '#e3f2fd', '#0d47a1'], ['#ad1457', '#ffd54f', '#26a69a', '#fff'], ['#2e7d32', '#ffeb3b', '#e65100', '#111'],
];
export const ANKARA_NAMES = ['Sunburst', 'Royal', 'Lagoon', 'Market', 'Orchid', 'Dusk', 'Kente', 'Adire', 'Zigzag', 'Diamond'];
export const ANKARA_SWATCH = ANK.map(p => p.slice(0, 3));
const ankCache = [];
export function ankara(i) {
  i = ((i | 0) % ANK.length + ANK.length) % ANK.length; if (ankCache[i]) return ankCache[i];
  const [a, b, c, d] = ANK[i];
  const t = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    if (i === 6) {            // kente: woven bands
      for (let yy = 0; yy < 128; yy += 32) { x.fillStyle = b; x.fillRect(0, yy, w, 10); x.fillStyle = c; x.fillRect(0, yy + 14, w, 6); x.fillStyle = d; for (let xx = 0; xx < 128; xx += 16) x.fillRect(xx, yy + 22, 8, 8); }
      x.fillStyle = 'rgba(0,0,0,.18)'; for (let xx = 0; xx < 128; xx += 32) x.fillRect(xx, 0, 6, h);
    } else if (i === 7) {     // adire: indigo tie-dye rings
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) { const cx = 32 + xx * 64, cy = 32 + yy * 64; for (let r = 28; r > 2; r -= 7) { x.strokeStyle = r % 14 ? b : c; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); } }
    } else if (i === 8) {     // zigzag
      for (let yy = 0; yy < 128; yy += 21) { x.strokeStyle = [b, c, d][(yy / 21) % 3 | 0]; x.lineWidth = 6; x.beginPath(); x.moveTo(0, yy + 10); for (let xx = 0; xx <= 128; xx += 16) x.lineTo(xx, yy + (xx % 32 ? 2 : 18)); x.stroke(); }
    } else if (i === 9) {     // diamonds
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) { const cx = xx * 32 + 16, cy = yy * 32 + 16; x.fillStyle = b; x.beginPath(); x.moveTo(cx, cy - 15); x.lineTo(cx + 15, cy); x.lineTo(cx, cy + 15); x.lineTo(cx - 15, cy); x.fill(); x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy - 7); x.lineTo(cx + 7, cy); x.lineTo(cx, cy + 7); x.lineTo(cx - 7, cy); x.fill(); x.fillStyle = d; x.fillRect(cx - 2, cy - 2, 4, 4); }
    } else {
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
        const cx = xx * 32 + (yy % 2) * 16 + 8, cy = yy * 32 + 16;
        x.fillStyle = b; x.beginPath(); x.arc(cx, cy, 12, 0, 7); x.fill();
        x.fillStyle = c; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill();
        x.fillStyle = d; x.beginPath(); x.moveTo(cx, cy - 4); x.lineTo(cx + 4, cy); x.lineTo(cx, cy + 4); x.lineTo(cx - 4, cy); x.fill();
      }
      x.strokeStyle = c; x.lineWidth = 3; for (let yy = 0; yy < 4; yy++) { x.beginPath(); x.moveTo(0, yy * 32); for (let xx = 0; xx <= 128; xx += 8) x.lineTo(xx, yy * 32 + (xx % 16 ? 3 : -3)); x.stroke(); }
    }
  }, true);
  t.repeat.set(2, 1.5); ankCache[i] = t; return t;
}
const stripeCache = new Map();
export function stripes(c1, c2) {
  const k = c1 + c2; if (stripeCache.has(k)) return stripeCache.get(k);
  const t = canvasTex(64, 64, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); x.fillStyle = c2; for (let y = 0; y < h; y += 16) x.fillRect(0, y, w, 7); }, true);
  t.repeat.set(1, 2); stripeCache.set(k, t); return t;
}
const signCache = new Map();
export function signTex(text, sub = '', bg = '#0a6b3c', fg = '#fff', w = 512, h = 160, border = true) {
  const k = [text, sub, bg, fg, w, h].join('|'); if (signCache.has(k)) return signCache.get(k);
  const t = canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    if (border) { x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = sub ? h * 0.42 : h * 0.5; x.font = `900 ${fs}px system-ui,Arial`;
    while (x.measureText(text).width > w - 40 && fs > 10) { fs -= 2; x.font = `900 ${fs}px system-ui,Arial`; }
    x.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
    if (sub) { x.font = `700 ${h * 0.17}px system-ui,Arial`; x.fillText(sub, w / 2, h * 0.76); }
  });
  signCache.set(k, t); return t;
}
export function signMesh(tex, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  return m;
}
export const SOFT = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
export const CLOUD = canvasTex(256, 128, (x) => {
  const blob = (cx, cy, r, c) => { const g = x.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, c); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  [[70, 80, 42], [120, 62, 52], [175, 78, 44], [100, 90, 36], [150, 92, 38], [205, 92, 30], [48, 96, 28]].forEach(([a, b, r]) => blob(a, b, r, 'rgba(225,238,255,.95)'));
});

// ---- Particles (single draw call) ----
const PCOL = new Map();
export class Particles {
  constructor(n = 220) {
    this.n = n; this.i = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grow = new Float32Array(n); this.s0 = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: SOFT }, uPx: { value: 600 } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC; uniform float uPx; void main(){ vA=alpha; vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uPx/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); if(t.a*vA<0.01) discard; gl_FragColor=vec4(vC,t.a*vA); }',
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.geo = g;
  }
  emit(x, y, z, vx, vy, vz, life, size, color, grow = 1.5) {
    const i = this.i; this.i = (this.i + 1) % this.n; let c = PCOL.get(color); if (!c) { c = new THREE.Color(color); PCOL.set(color, c); }
    const j = i * 3, P = this.pos, V = this.vel, C = this.col; P[j] = x; P[j + 1] = y; P[j + 2] = z; V[j] = vx; V[j + 1] = vy; V[j + 2] = vz; C[j] = c.r; C[j + 1] = c.g; C[j + 2] = c.b;
    this.live = 3; this.life[i] = life; this.max[i] = life; this.s0[i] = size; this.grow[i] = grow; this.size[i] = size; this.alpha[i] = 1;
  }
  update(dt, dz = 0, gravity = 0) {
    // skip work + GPU upload entirely when nothing is alive (pooled, allocation-free)
    if (!this.live) return; let alive = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt; const k = 1 - this.life[i] / this.max[i];
      this.vel[i * 3 + 1] -= gravity * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += (this.vel[i * 3 + 2] + dz) * dt;
      this.size[i] = this.s0[i] * (1 + k * this.grow[i]); this.alpha[i] = Math.max(0, 1 - k) * 0.6; alive++;
    }
    if (!alive) this.live--;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.alpha.fill(0); this.live = 2; }
}

// ---- Characters ----
export const SKINS = ['#5a3418', '#6b3f1f', '#8d5524', '#a8693f', '#3d2314'];
const CLOTH = ['#e53935', '#8e24aa', '#1e88e5', '#43a047', '#fb8c00', '#00897b', '#fdd835', '#d81b60', '#5e35b1', '#ffffff', '#3949ab'];
const pickR = a => a[Math.floor(Math.random() * a.length)];

export const SKIN_TONES = ['#2e1a0f', '#3d2314', '#4a2a17', '#5a3418', '#6b3f1f', '#7b4a26', '#8d5524', '#a0623a', '#b57446', '#c68a5a', '#d9a273', '#eac39b'];
export const HAIR_COLS = ['#15100c', '#3b2417', '#6a3a1e', '#a0522d', '#c48a3a', '#6d1a36', '#bdbdbd', '#1e5aa8'];
export function randomLook(look = {}) {
  const female = look.gender === 'f';
  const o = {
    gender: female ? 'f' : 'm', skin: pickR(SKINS), kid: !!look.kid, old: !!look.old,
    top: pickR(CLOTH), topTex: Math.random() < 0.6 ? Math.floor(Math.random() * 6) : null,
    bottom: female ? null : pickR(['#263238', '#37474f', '#1a237e', '#4e342e', '#ffffff']),
    skirt: female ? (Math.random() < 0.5 ? 'tex' : pickR(CLOTH)) : null, long: female && (look.old || Math.random() < 0.5),
    head: look.gele || (female && Math.random() < 0.4) ? 'gele' : look.cap || (!female && Math.random() < 0.35) ? 'cap' : null,
    headColor: pickR(CLOTH), hair: female ? pickR(['bun', 'braids', 'puff', 'cornrows', 'bantu', 'locs']) : pickR(['short', 'short', 'lowcut', 'afro', 'locs']),
    shoe: pickR(['#3e2723', '#212121', '#795548', '#2e7d32', '#ffffff']), shoeStyle: pickR(['plain', 'sneakers', 'boots', 'sandals']),
    eyes: pickR(['round', 'big', 'almond']), smile: pickR(['smile', 'smile', 'grin', 'calm']), brows: pickR(['soft', 'arched', 'thick']),
    body: pickR(['slim', 'regular', 'regular', 'broad']), hairColor: pickR(['#15100c', '#15100c', '#3b2417']),
    beltLantern: Math.random() < 0.25, jeans: false, shorts: !female && !look.old && Math.random() < 0.3,
  };
  if (o.head === 'gele' && !female) o.head = 'cap';
  return o;
}
export const PLAYER_OUTFITS = {
  m: [
    { label: 'White kaftan', top: '#ffffff', topTex: null, bottom: '#ffffff', head: null, hair: 'short', shoe: '#5d4037', trim: '#008751' },
    { label: 'Ankara & jeans', top: '#e8541e', topTex: 0, bottom: '#1a3c7a', head: null, hair: 'short', shoe: '#ffffff' },
    { label: 'Agbada & fila', top: '#1565c0', topTex: 2, bottom: '#1565c0', head: 'cap', headColor: '#0d47a1', hair: 'short', shoe: '#3e2723' },
  ],
  f: [
    { label: 'White gown & gele', top: '#ffffff', topTex: null, skirt: '#ffffff', long: true, head: 'gele', headColor: '#ffd23f', hair: 'bun', shoe: '#c62828', trim: '#008751' },
    { label: 'Ankara gown', top: '#6a1b9a', topTex: 1, skirt: 'tex', long: true, head: 'gele', headColor: '#ffb300', hair: 'bun', shoe: '#ffb300' },
    { label: 'Tee, skirt & braids', top: '#e91e63', topTex: null, skirt: '#1565c0', long: false, head: null, hair: 'braids', shoe: '#ffffff' },
  ],
};

// Unlockable outfits from the shop (index 3+ in the outfit picker)
export const SHOP_OUTFITS = [
  { id: 'o_choir', name: 'Choir robe', m: { label: 'Choir robe', top: '#7b1230', topTex: null, bottom: '#7b1230', head: null, hair: 'short', shoe: '#212121', trim: '#ffd23f' }, f: { label: 'Choir robe', top: '#7b1230', topTex: null, skirt: '#7b1230', long: true, head: null, hair: 'bun', shoe: '#212121', trim: '#ffd23f' } },
  { id: 'o_youth', name: 'Youth T-shirt', m: { label: 'Youth tee', top: '#1e88e5', topTex: null, bottom: '#263238', head: 'cap', headColor: '#ffd23f', hair: 'short', shoe: '#ffffff', trim: '#ffd23f' }, f: { label: 'Youth tee', top: '#1e88e5', topTex: null, skirt: '#263238', long: false, head: null, hair: 'braids', shoe: '#ffffff', trim: '#ffd23f' } },
  { id: 'o_ankara', name: 'Ankara set', m: { label: 'Ankara set', top: '#c62828', topTex: 3, bottom: '#c62828', head: 'cap', headColor: '#c62828', hair: 'short', shoe: '#3e2723' }, f: { label: 'Ankara set', top: '#00695c', topTex: 4, skirt: 'tex', long: true, head: 'gele', headColor: '#f06292', hair: 'bun', shoe: '#ffca28' } },
  { id: 'o_usher', name: 'Usher uniform', m: { label: 'Usher', top: '#ffffff', topTex: null, bottom: '#1a237e', head: null, hair: 'short', shoe: '#111111', trim: '#c62828' }, f: { label: 'Usher', top: '#ffffff', topTex: null, skirt: '#1a237e', long: true, head: 'gele', headColor: '#1a237e', hair: 'bun', shoe: '#111111', trim: '#c62828' } },
  { id: 'o_agbada', name: 'Agbada / Iro & buba', m: { label: 'Agbada', top: '#f3e5ab', topTex: 5, bottom: '#f3e5ab', head: 'cap', headColor: '#4527a0', hair: 'short', shoe: '#5d4037', trim: '#4527a0' }, f: { label: 'Iro & buba', top: '#ef6c00', topTex: 5, skirt: 'tex', long: true, head: 'gele', headColor: '#4527a0', hair: 'bun', shoe: '#4527a0' } },
];

const avgCache = new Map();
function texAvg(t) {
  if (avgCache.has(t)) return avgCache.get(t);
  let col = new THREE.Color('#888888');
  try { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.drawImage(t.image, 0, 0, 4, 4); const d = x.getImageData(0, 0, 4, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < 64; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } col = new THREE.Color().setRGB(r / 16 / 255, g / 16 / 255, b / 16 / 255, THREE.SRGBColorSpace); } catch (e) {}
  avgCache.set(t, col); return col;
}
const _bm = new THREE.Matrix4(), _bi = new THREE.Matrix4(), _bc = new THREE.Color();
export function bakeGeo(root) {
  root.updateMatrixWorld(true); _bi.copy(root.matrixWorld).invert();
  const list = []; let n = 0;
  root.traverse(o => {
    if (!o.isMesh || o.userData.outline || o.isInstancedMesh || !o.visible) return;
    if (o.isSkinnedMesh) { const r = bakeSkinned(o, _bi, texAvg); list.push(r); n += r.n; return; }
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    _bm.multiplyMatrices(_bi, o.matrixWorld); g.applyMatrix4(_bm);
    list.push([g, o.material]); n += g.attributes.position.count;
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), cm = new Float32Array(n * 2); let off = 0;
  for (const it of list) {
    if (!Array.isArray(it)) { pos.set(it.pos, off * 3); nor.set(it.nor, off * 3); col.set(it.col, off * 3); cm.set(it.cm, off * 2); off += it.n; continue; }
    const [g, m] = it;
    const cnt = g.attributes.position.count; pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3);
    if (m.vertexColors && g.attributes.color) col.set(g.attributes.color.array.subarray(0, cnt * 3), off * 3);
    else { _bc.copy(m.color || _bc.set('#888')); if (m.map) _bc.multiply(texAvg(m.map)); for (let k = 0; k < cnt; k++) { col[(off + k) * 3] = _bc.r; col[(off + k) * 3 + 1] = _bc.g; col[(off + k) * 3 + 2] = _bc.b; } }
    off += cnt; g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('cmat', new THREE.BufferAttribute(cm, 2));
  geo.computeBoundingSphere(); return geo;
}
// frames: list of phases to bake for a cheap flip-book animation (geometry swap, zero extra draw calls)
export function bakedHuman(o, mode = 'idle', frames = 1, extra) {
  const h = makeHuman(o, 'lo'); if (extra) extra(h);
  const geos = [];
  for (let f = 0; f < frames; f++) { h.phase = frames > 1 ? f / frames * Math.PI * 2 / (mode === 'wave' ? 3 : 1) : 0.3; poseHuman(h, mode, 0); geos.push(bakeGeo(h.root)); }
  h.mesh.geometry.dispose(); h.mesh.skeleton.dispose();
  const m = new THREE.Mesh(geos[0], clayMat(null)); m.castShadow = false;
  const root = new THREE.Group(); root.add(m);
  root.userData.baked = { mesh: m, geos, f: 0, t: Math.random() * frames };
  return root;
}
export function stepBaked(root, dt, fps = 8) {
  const b = root.userData.baked; if (!b || b.geos.length < 2) return;
  b.t += dt * fps; const f = Math.floor(b.t) % b.geos.length;
  if (f !== b.f) { b.f = f; b.mesh.geometry = b.geos[f]; if (b.mesh.children[0]) b.mesh.children[0].geometry = b.geos[f]; }
}
// cheap baked ambient occlusion: darken vertex colours near the ground (bases, doorways, under eaves)
export function aoBake(root, h = 2.6, min = 0.6) {
  root.traverse(o => {
    const g = o.geometry; if (!o.isMesh || o.userData.outline || !g || !g.attributes.color || g.userData.ao) return;
    g.userData.ao = true; const p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, p.getY(i) / h)), k = min + (1 - min) * t * t * (3 - 2 * t); c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k); }
    c.needsUpdate = true;
  });
  return root;
}
