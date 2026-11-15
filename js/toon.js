// Toon rendering helpers, merged geometry, textures, characters
import * as THREE from './vendor/three.min.js';
export { THREE };

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
export function outlineMat(th = 0.03, color = 0x1a1206) {
  const k = th + '_' + color; if (olCache.has(k)) return olCache.get(k);
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
    const i = this.i; this.i = (this.i + 1) % this.n; const c = new THREE.Color(color);
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.col.set([c.r, c.g, c.b], i * 3);
    this.life[i] = life; this.max[i] = life; this.s0[i] = size; this.grow[i] = grow; this.size[i] = size; this.alpha[i] = 1;
  }
  update(dt, dz = 0, gravity = 0) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt; const k = 1 - this.life[i] / this.max[i];
      this.vel[i * 3 + 1] -= gravity * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += (this.vel[i * 3 + 2] + dz) * dt;
      this.size[i] = this.s0[i] * (1 + k * this.grow[i]); this.alpha[i] = Math.max(0, 1 - k) * 0.6;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.alpha.fill(0); }
}

// ---- Characters ----
export const SKINS = ['#5a3418', '#6b3f1f', '#8d5524', '#a8693f', '#3d2314'];
const CLOTH = ['#e53935', '#8e24aa', '#1e88e5', '#43a047', '#fb8c00', '#00897b', '#fdd835', '#d81b60', '#5e35b1', '#ffffff', '#3949ab'];
const pickR = a => a[Math.floor(Math.random() * a.length)];

export const SKIN_TONES = ['#2e1a0f', '#3d2314', '#4a2a17', '#5a3418', '#6b3f1f', '#7b4a26', '#8d5524', '#a0623a', '#b57446', '#c68a5a', '#d9a273', '#eac39b'];
export const HAIR_COLS = ['#15100c', '#3b2417', '#6a3a1e', '#a0522d', '#c48a3a', '#6d1a36', '#bdbdbd', '#1e5aa8'];
const lighten = (c, k) => new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k).getStyle();
const TOR_SMILE = new THREE.TorusGeometry(0.085, 0.022, 4, 10, Math.PI), TOR_GRIN = new THREE.TorusGeometry(0.1, 0.03, 4, 12, Math.PI);
function headGeo(o) {
  const skin = o.skin, dark = new THREE.Color(skin).multiplyScalar(0.75).getStyle();
  const hair = o.old ? '#d8d8d8' : (o.hairColor || '#15100c'), hairHi = lighten(hair, 0.35), brow = o.old ? '#bbbbbb' : (o.hairColor && o.hairColor !== '#bdbdbd' ? new THREE.Color(hair).multiplyScalar(0.8).getStyle() : '#15100c');
  const eyes = o.eyes || 'round', brows = o.brows || 'soft', smile = o.smile || 'smile';
  const E = { round: [0.22, 0.27, 0.13, 0.16, 0], almond: [0.26, 0.2, 0.13, 0.14, 0.12], big: [0.25, 0.32, 0.15, 0.19, 0], sleepy: [0.22, 0.2, 0.13, 0.13, 0] }[eyes] || [0.22, 0.27, 0.13, 0.16, 0];
  const parts = [
    P(G.sph, skin, 0, 0, 0, 0, 0, 0, 0.9, 0.86, 0.84),
    P(G.sphLo, skin, 0.4, 0, 0, 0, 0, 0, 0.12, 0.16, 0.1), P(G.sphLo, skin, -0.4, 0, 0, 0, 0, 0, 0.12, 0.16, 0.1),
    P(G.sphLo, dark, 0, -0.05, 0.41, 0, 0, 0, 0.1, 0.08, 0.08),
    P(G.sphLo, '#ffffff', 0.15, 0.05, 0.355, 0, 0, -E[4], E[0], E[1], 0.1), P(G.sphLo, '#ffffff', -0.15, 0.05, 0.355, 0, 0, E[4], E[0], E[1], 0.1),
    P(G.sphLo, '#1a0f08', 0.15, 0.03, 0.4, 0, 0, 0, E[2], E[3], 0.05), P(G.sphLo, '#1a0f08', -0.15, 0.03, 0.4, 0, 0, 0, E[2], E[3], 0.05),
    P(G.sphLo, '#ffffff', 0.175, 0.08, 0.425, 0, 0, 0, 0.045, 0.045, 0.02), P(G.sphLo, '#ffffff', -0.125, 0.08, 0.425, 0, 0, 0, 0.045, 0.045, 0.02),
    P(G.sphLo, '#d9776a', 0.24, -0.08, 0.32, 0, 0, 0, 0.08, 0.05, 0.03), P(G.sphLo, '#d9776a', -0.24, -0.08, 0.32, 0, 0, 0, 0.08, 0.05, 0.03),
  ];
  // lids
  const lidY = eyes === 'sleepy' ? 0.11 : eyes === 'big' ? 0.21 : 0.18, lidH = eyes === 'sleepy' ? 0.06 : 0.028;
  parts.push(P(G.box, '#15100c', 0.15, lidY, 0.385, 0, 0, -0.08 - E[4], 0.2 + (eyes === 'almond' ? 0.05 : 0), lidH, 0.035), P(G.box, '#15100c', -0.15, lidY, 0.385, 0, 0, 0.08 + E[4], 0.2 + (eyes === 'almond' ? 0.05 : 0), lidH, 0.035));
  // brows
  const B = { soft: [0.22, 0.15, 0.03], arched: [0.25, 0.32, 0.03], thick: [0.23, 0.12, 0.055], straight: [0.22, 0, 0.035], worried: [0.23, -0.25, 0.03] }[brows] || [0.22, 0.15, 0.03];
  parts.push(P(G.box, brow, 0.15, B[0], 0.37, 0, 0, -B[1], 0.16, B[2], 0.04), P(G.box, brow, -0.15, B[0], 0.37, 0, 0, B[1], 0.16, B[2], 0.04));
  // mouth
  if (smile === 'grin') { parts.push(P(TOR_GRIN, '#7a1f1f', 0, -0.14, 0.37, 0.2, 0, Math.PI), P(G.sphLo, '#ffffff', 0, -0.17, 0.375, 0, 0, 0, 0.14, 0.05, 0.03)); }
  else if (smile === 'calm') parts.push(P(G.box, '#7a1f1f', 0, -0.16, 0.38, 0, 0, 0, 0.12, 0.025, 0.03));
  else if (smile === 'open') parts.push(P(G.sphLo, '#5a1414', 0, -0.17, 0.37, 0, 0, 0, 0.12, 0.09, 0.05), P(G.sphLo, '#e57373', 0, -0.19, 0.385, 0, 0, 0, 0.07, 0.035, 0.02));
  else parts.push(P(TOR_SMILE, '#7a1f1f', 0, -0.15, 0.37, 0.2, 0, Math.PI));
  if (o.gender === 'f') parts.push(
    P(G.box, '#15100c', 0.265, lidY - 0.01, 0.36, 0, 0, 0.6, 0.07, 0.022, 0.03), P(G.box, '#15100c', 0.27, lidY - 0.05, 0.36, 0, 0, 0.2, 0.07, 0.022, 0.03),
    P(G.box, '#15100c', -0.265, lidY - 0.01, 0.36, 0, 0, -0.6, 0.07, 0.022, 0.03), P(G.box, '#15100c', -0.27, lidY - 0.05, 0.36, 0, 0, -0.2, 0.07, 0.022, 0.03));
  const covered = o.head === 'gele' || o.head === 'cap' || o.head === 'beret';
  const capHair = () => parts.push(P(G.sph, hair, 0, 0.15, -0.07, 0, 0, 0, 0.92, 0.66, 0.86));
  const hs = o.hair === 'short' ? 'lowcut' : (o.hair || 'lowcut');
  if (o.head === 'gele') {
    const c = o.headColor;
    parts.push(P(new THREE.TorusGeometry(0.3, 0.12, 6, 14), c, 0, 0.24, -0.02, Math.PI / 2 - 0.25, 0, 0));
    parts.push(P(G.sph, c, 0, 0.38, -0.04, 0, 0, 0, 0.72, 0.42, 0.72));
    parts.push(P(G.cone, c, 0.12, 0.6, -0.12, -0.5, 0, -0.3, 0.42, 0.42, 0.12));
    parts.push(P(G.cone, c, -0.14, 0.58, -0.1, -0.4, 0, 0.35, 0.36, 0.36, 0.12));
  } else if (o.head === 'cap') {
    parts.push(P(G.cyl, o.headColor, 0.03, 0.33, -0.02, 0, 0, 0.22, 0.7, 0.26, 0.7));
    parts.push(P(G.sphLo, hair, 0, 0.12, -0.08, 0, 0, 0, 0.8, 0.5, 0.75));
  } else if (o.head === 'beret') {
    parts.push(P(G.sphLo, hair, 0, 0.12, -0.08, 0, 0, 0, 0.84, 0.52, 0.78));
    parts.push(P(G.sph, o.headColor, 0.06, 0.34, -0.04, 0.12, 0, -0.25, 0.86, 0.26, 0.82), P(G.cyl6, o.headColor, 0.08, 0.48, -0.04, 0, 0, -0.25, 0.05, 0.08, 0.05));
  }
  if (!covered) {
    if (hs === 'afro') { parts.push(P(G.sph, hair, 0, 0.26, -0.1, 0, 0, 0, 1.22, 1.0, 1.15)); }
    else if (hs === 'bun') { capHair(); parts.push(P(G.sph, hair, 0, 0.42, -0.14, 0, 0, 0, 0.32, 0.3, 0.32)); }
    else if (hs === 'braids') { parts.push(P(G.sph, hair, 0, 0.15, -0.07, 0, 0, 0, 0.92, 0.68, 0.88)); for (let i = -3; i <= 3; i++) parts.push(P(G.cyl6, hair, i * 0.085, -0.25, -0.3 + Math.abs(i) * 0.03, 0.25, 0, i * 0.06, 0.06, 0.7, 0.06)); }
    else if (hs === 'cornrows') { parts.push(P(G.sph, dark, 0, 0.13, -0.06, 0, 0, 0, 0.9, 0.62, 0.85)); for (let i = -3; i <= 3; i++) parts.push(P(G.cyl6, hair, i * 0.085, 0.38 - Math.abs(i) * 0.045, -0.05, Math.PI / 2 + 0.25, 0, i * 0.2, 0.06, 0.78, 0.07)); for (let i = -1; i <= 1; i++) parts.push(P(G.cyl6, hair, i * 0.12, -0.15, -0.4, 0.2, 0, 0, 0.05, 0.45, 0.05)); }
    else if (hs === 'bantu') { parts.push(P(G.sph, dark, 0, 0.13, -0.06, 0, 0, 0, 0.9, 0.62, 0.85)); for (const [x, y, z] of [[0, 0.44, 0.02], [0.24, 0.38, -0.02], [-0.24, 0.38, -0.02], [0.14, 0.33, -0.3], [-0.14, 0.33, -0.3], [0.3, 0.16, -0.24], [-0.3, 0.16, -0.24]]) parts.push(P(G.sphLo, hair, x, y, z, 0, 0, 0, 0.2, 0.17, 0.2)); }
    else if (hs === 'locs') { capHair(); for (let k = 0; k < 13; k++) { const t = -2.4 + k * 0.4; parts.push(P(G.cyl6, hair, Math.sin(t) * 0.38, -0.12, Math.cos(t) * 0.36 - 0.06, Math.cos(t) * 0.18, 0, -Math.sin(t) * 0.2, 0.07, 0.62, 0.07)); } }
    else if (hs === 'puff') { capHair(); parts.push(P(G.sph, hair, 0, 0.5, -0.12, 0, 0, 0, 0.5, 0.45, 0.5)); }
    else { parts.push(P(G.sph, hair, 0, 0.15, -0.07, 0, 0, 0, 0.92, 0.66, 0.86)); }
    if (hs !== 'afro') parts.push(P(G.sphLo, o.old ? '#f4f4f4' : hairHi, 0.1, 0.42, 0.12, -0.5, 0, 0, 0.3, 0.06, 0.16));
  } else if (o.head === 'gele') parts.push(P(G.sphLo, lighten(o.headColor, 0.45), 0.08, 0.5, 0.18, -0.6, 0, 0, 0.3, 0.06, 0.14));
  if (o.old && o.gender === 'm') parts.push(P(G.box, '#e8e8e8', 0, -0.3, 0.26, 0.3, 0, 0, 0.26, 0.12, 0.08));
  return merge(parts);
}
// accessories (shared geometry, built once)
const ACC = {};
function accGeo(k) {
  if (ACC[k]) return ACC[k];
  if (k === 'glasses') { const ring = new THREE.TorusGeometry(0.1, 0.018, 5, 14); ACC[k] = merge([P(ring, '#111111', 0.15, 0.04, 0.44), P(ring, '#111111', -0.15, 0.04, 0.44), P(G.box, '#111111', 0, 0.06, 0.44, 0, 0, 0, 0.1, 0.02, 0.02), P(G.box, '#111111', 0.3, 0.06, 0.25, 0, 0, 0, 0.02, 0.02, 0.36), P(G.box, '#111111', -0.3, 0.06, 0.25, 0, 0, 0, 0.02, 0.02, 0.36), P(G.cyl, '#9fd3ff', 0.15, 0.04, 0.435, Math.PI / 2, 0, 0, 0.18, 0.01, 0.18), P(G.cyl, '#9fd3ff', -0.15, 0.04, 0.435, Math.PI / 2, 0, 0, 0.18, 0.01, 0.18)]); }
  if (k === 'bible') ACC[k] = merge([P(G.box, '#1a1a1a', 0, 0, 0, 0, 0, 0, 0.07, 0.26, 0.2), P(G.box, '#f5f0e0', 0.002, 0, 0.004, 0, 0, 0, 0.074, 0.24, 0.19), P(G.box, '#ffd23f', 0.04, 0.03, 0, 0, 0, 0, 0.005, 0.1, 0.02), P(G.box, '#ffd23f', 0.04, 0.05, 0, 0, 0, 0, 0.005, 0.02, 0.07)]);
  if (k === 'pack') ACC[k] = merge([P(G.box, '#ffffff', 0, 0, 0, 0, 0, 0, 0.46, 0.5, 0.2), P(G.box, '#ffffff', 0, -0.12, 0.1, 0, 0, 0, 0.36, 0.2, 0.08), P(G.box, '#222222', 0.15, 0.1, 0.27, 0, 0, 0, 0.05, 0.42, 0.05), P(G.box, '#222222', -0.15, 0.1, 0.27, 0, 0, 0, 0.05, 0.42, 0.05)]);
  if (k === 'band') ACC[k] = new THREE.CylinderGeometry(0.082, 0.082, 0.07, 10);
  if (k === 'sole') ACC[k] = new THREE.BoxGeometry(0.2, 0.04, 0.32);
  if (k === 'boot') ACC[k] = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8);
  return ACC[k];
}
export function randomLook(look = {}) {
  const female = look.gender === 'f';
  const o = {
    gender: female ? 'f' : 'm', skin: pickR(SKINS), kid: !!look.kid, old: !!look.old,
    top: pickR(CLOTH), topTex: Math.random() < 0.6 ? Math.floor(Math.random() * 6) : null,
    bottom: female ? null : pickR(['#263238', '#37474f', '#1a237e', '#4e342e', '#ffffff']),
    skirt: female ? (Math.random() < 0.5 ? 'tex' : pickR(CLOTH)) : null, long: female && (look.old || Math.random() < 0.5),
    head: look.gele || (female && Math.random() < 0.4) ? 'gele' : look.cap || (!female && Math.random() < 0.35) ? 'cap' : null,
    headColor: pickR(CLOTH), hair: female ? pickR(['bun', 'braids']) : 'short', shoe: pickR(['#3e2723', '#212121', '#795548']),
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

function partMesh(geo, mat, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; return m; }
const GH = {
  torso: new THREE.CylinderGeometry(0.29, 0.25, 0.62, 10).scale(1, 1, 0.72),
  upper: new THREE.CylinderGeometry(0.085, 0.075, 0.32, 7),
  fore: new THREE.CylinderGeometry(0.075, 0.065, 0.32, 7),
  armFull: new THREE.CylinderGeometry(0.085, 0.07, 0.62, 7),
  hand: new THREE.SphereGeometry(0.09, 7, 6),
  thigh: new THREE.CylinderGeometry(0.12, 0.1, 0.42, 7),
  shin: new THREE.CylinderGeometry(0.1, 0.085, 0.4, 7),
  legFull: new THREE.CylinderGeometry(0.12, 0.09, 0.8, 7),
  shoe: new THREE.BoxGeometry(0.18, 0.1, 0.3),
  skirt: new THREE.CylinderGeometry(0.27, 0.44, 0.55, 12, 1, true),
  gown: new THREE.CylinderGeometry(0.27, 0.48, 0.8, 12, 1, true),
  trim: new THREE.CylinderGeometry(0.255, 0.255, 0.06, 10).scale(1, 1, 0.73),
  cuff: new THREE.CylinderGeometry(0.11, 0.105, 0.08, 7),
};
// Build an articulated low-poly humanoid. Faces +Z.
export function makeHuman(o, detail = true) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const sc = o.kid ? 0.72 : 1; body.scale.setScalar(sc);
  const bw = { slim: 0.86, regular: 1, broad: 1.16 }[o.body] || 1;
  const skinM = toon(o.skin);
  const topM = o.topTex != null ? toon('#ffffff', { map: ankara(o.topTex) }) : o.topStripe ? toon('#ffffff', { map: stripes(o.top, o.topStripe) }) : toon(o.top);
  const botM = toon(o.bottom || o.top);
  const shoeM = toon(o.shoe || '#3e2723');
  const hips = new THREE.Group(); hips.position.y = 0.8; body.add(hips);
  const spine = new THREE.Group(); hips.add(spine);
  const torso = partMesh(GH.torso, topM); torso.position.y = 0.31; torso.scale.set(bw, 1, bw); spine.add(torso); outline(torso, 0.025);
  if (o.trim) { const t = partMesh(GH.trim, toon(o.trim)); t.position.y = 0.03; t.scale.set(bw, 1, bw); spine.add(t); const t2 = partMesh(G.box, toon(o.trim)); t2.scale.set(0.07, 0.42, 0.02); t2.position.set(0, 0.42, 0.205 * bw); spine.add(t2); }
  const neck = new THREE.Group(); neck.position.y = 0.64; spine.add(neck);
  const head = partMesh(headGeo(o), VC); head.position.y = 0.4; neck.add(head); outline(head, 0.025);
  const mk = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.33 * side * (0.5 + bw / 2), 0.56, 0); sh.scale.set(bw, 1, bw); spine.add(sh);
    const r = { sh };
    if (detail) {
      const up = partMesh(GH.upper, topM); up.position.y = -0.15; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
      const fo = partMesh(GH.fore, skinM); fo.position.y = -0.15; el.add(fo);
      const ha = partMesh(GH.hand, skinM); ha.position.y = -0.33; el.add(ha);
      r.el = el; r.hand = ha;
    } else {
      const a = partMesh(GH.armFull, topM); a.position.y = -0.3; sh.add(a);
      const ha = partMesh(GH.hand, skinM); ha.position.y = -0.64; sh.add(ha); r.hand = ha;
    }
    const hip = new THREE.Group(); hip.position.set(0.14 * side * (0.6 + bw * 0.4), 0, 0); hip.scale.set(0.6 + bw * 0.4, 1, 0.6 + bw * 0.4); hips.add(hip);
    r.hip = hip;
    if (detail) {
      const th = partMesh(GH.thigh, botM); th.position.y = -0.2; hip.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.4; hip.add(kn);
      const sn = partMesh(GH.shin, o.bottom && !o.shorts ? botM : skinM); sn.position.y = -0.19; kn.add(sn);
      if (o.shorts) { const cuff = partMesh(GH.cuff, botM); cuff.position.y = -0.02; kn.add(cuff); }
      if (o.shoeStyle === 'sandals') { const s = partMesh(GH.shoe, skinM); s.scale.set(0.9, 0.7, 0.95); s.position.set(0, -0.38, 0.05); kn.add(s); const so = partMesh(accGeo('sole'), shoeM); so.position.set(0, -0.42, 0.05); kn.add(so); const st = partMesh(G.box, shoeM); st.scale.set(0.19, 0.03, 0.05); st.position.set(0, -0.36, 0.1); kn.add(st); }
      else { const s = partMesh(GH.shoe, shoeM); s.position.set(0, -0.37, 0.05); kn.add(s); if (o.shoeStyle === 'sneakers') { const so = partMesh(accGeo('sole'), toon('#ffffff')); so.position.set(0, -0.41, 0.05); kn.add(so); } else if (o.shoeStyle === 'boots') { const b = partMesh(accGeo('boot'), shoeM); b.position.set(0, -0.28, 0); kn.add(b); } }
      r.kn = kn;
    } else {
      const lg = partMesh(GH.legFull, o.bottom ? botM : skinM); lg.position.y = -0.4; hip.add(lg);
      const s = partMesh(GH.shoe, shoeM); s.position.set(0, -0.77, 0.05); hip.add(s);
    }
    return r;
  };
  const L = mk(1), R = mk(-1);
  if (o.skirt) {
    const sm = o.skirt === 'tex' ? toon('#ffffff', { map: ankara(o.skirtTex ?? o.topTex ?? 1), side: THREE.DoubleSide }) : toon(o.skirt, { side: THREE.DoubleSide });
    const sk = partMesh(o.long ? GH.gown : GH.skirt, sm); sk.scale.set(0.6 + bw * 0.4, 1, 0.6 + bw * 0.4); sk.position.y = o.long ? -0.32 : -0.2; hips.add(sk); outline(sk, 0.02);
  }
  const acc = o.acc || {};
  if (acc.glasses) { const gl = partMesh(accGeo('glasses'), VC, false); head.add(gl); }
  if (acc.wristband && L.el) { const b = partMesh(accGeo('band'), toon(o.accColor || '#ffd23f')); b.position.y = -0.24; L.el.add(b); }
  if (acc.bible && L.el) { const bb = partMesh(accGeo('bible'), VC); bb.position.set(0.02, -0.4, 0.06); bb.rotation.set(0.2, 0, 0); L.el.add(bb); }
  if (acc.backpack) { const bp = partMesh(accGeo('pack'), toon(o.accColor || '#1e88e5')); bp.position.set(0, 0.32, -0.3 * bw); spine.add(bp); outline(bp, 0.02); }
  head.geometry.userData.own = true;
  const h = { root, body, hips, spine, neck, head, L, R, o, detail, phase: Math.random() * 6 };
  if (o.old) spine.rotation.x = 0.18;
  return h;
}
// Procedural animation
export function poseHuman(h, mode, dt, speed = 1) {
  h.phase += dt * speed * (mode === 'run' ? 11 : mode === 'walk' ? 7 : 2);
  const p = h.phase, s = Math.sin(p), c = Math.cos(p);
  const { L, R } = h;
  let lean = h.o.old ? 0.18 : 0, bob = 0;
  const set = (o, x, z = 0) => { if (o) { o.rotation.x = x; o.rotation.z = z; } };
  if (mode === 'run') {
    set(L.hip, s * 0.95); set(R.hip, -s * 0.95);
    set(L.kn, Math.max(0, -s) * 1.3 + 0.2); set(R.kn, Math.max(0, s) * 1.3 + 0.2);
    set(L.sh, -s * 0.9, 0.1); set(R.sh, s * 0.9, -0.1); set(L.el, -1.3); set(R.el, -1.3);
    lean += 0.22; bob = Math.abs(c) * 0.1;
    h.head.rotation.x = -0.12;
  } else if (mode === 'walk') {
    set(L.hip, s * 0.55); set(R.hip, -s * 0.55);
    set(L.kn, Math.max(0, -s) * 0.6); set(R.kn, Math.max(0, s) * 0.6);
    set(L.sh, -s * 0.5, 0.08); set(R.sh, s * 0.5, -0.08); set(L.el, -0.35); set(R.el, -0.35);
    lean += 0.05; bob = Math.abs(c) * 0.05; h.head.rotation.x = 0;
  } else if (mode === 'jump') {
    set(L.hip, -1.0); set(R.hip, -0.5); set(L.kn, 1.6); set(R.kn, 1.2);
    set(L.sh, -2.6, 0.3); set(R.sh, -2.4, -0.3); set(L.el, -0.3); set(R.el, -0.3);
    lean += 0.1;
  } else if (mode === 'slide') {
    set(L.hip, -1.5, 0.1); set(R.hip, -1.25, -0.1); set(L.kn, 0.25); set(R.kn, 0.7);
    set(L.sh, 0.9, 0.5); set(R.sh, 0.9, -0.5); set(L.el, -0.3); set(R.el, -0.3);
    lean = -1.0; bob = -0.42; h.head.rotation.x = 0.5;
  } else if (mode === 'sit') {
    set(L.hip, -1.45, 0.12); set(R.hip, -1.45, -0.12); set(L.kn, 1.45); set(R.kn, 1.45);
    set(L.sh, -1.2, 0.15); set(R.sh, -1.2, -0.15); set(L.el, -0.2); set(R.el, -0.2); lean += 0.25;
  } else if (mode === 'wave') {
    set(L.hip, 0); set(R.hip, 0); set(L.kn, 0); set(R.kn, 0);
    set(L.sh, 0.05, 0.12); set(R.sh, Math.PI, -0.35 + Math.sin(p * 3) * 0.35); set(L.el, -0.1); set(R.el, -0.4);
    bob = Math.sin(p) * 0.01;
  } else if (mode === 'carry') {
    set(L.hip, s * 0.4); set(R.hip, -s * 0.4); set(L.kn, Math.max(0, -s) * 0.4); set(R.kn, Math.max(0, s) * 0.4);
    set(L.sh, -2.9, 0.25); set(R.sh, -2.9, -0.25); set(L.el, -0.4); set(R.el, -0.4); bob = Math.abs(c) * 0.03;
  } else { // idle
    set(L.hip, 0); set(R.hip, 0); set(L.kn, 0.02); set(R.kn, 0.02);
    set(L.sh, Math.sin(p) * 0.05, 0.12); set(R.sh, -Math.sin(p) * 0.05, -0.12); set(L.el, -0.15); set(R.el, -0.15);
    bob = Math.sin(p) * 0.012; h.head.rotation.y = Math.sin(p * 0.37) * 0.35;
  }
  h.spine.rotation.x = lean; h.hips.position.y = 0.8 + bob;
}
