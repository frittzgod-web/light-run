// Toon rendering helpers, merged geometry, textures, characters
import * as THREE from './vendor/three.min.js';
export { THREE };

// 3-tone gradient for cel shading
const gd = new Uint8Array([90, 90, 90, 255, 180, 180, 180, 255, 255, 255, 255, 255]);
export const GRAD = new THREE.DataTexture(gd, 3, 1, THREE.RGBAFormat);
GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;

const matCache = new Map();
export function toon(color, extra = {}) {
  const key = color + JSON.stringify(Object.keys(extra));
  if (!extra.map && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...extra });
  if (!extra.map) matCache.set(key, m);
  return m;
}
export const VC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD });
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
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
  sph: new THREE.SphereGeometry(0.5, 12, 9),
  sphLo: new THREE.SphereGeometry(0.5, 8, 6),
  ico: new THREE.IcosahedronGeometry(0.5, 1),
  wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 12).rotateZ(Math.PI / 2),
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
];
const ankCache = [];
export function ankara(i) {
  i = i % ANK.length; if (ankCache[i]) return ankCache[i];
  const [a, b, c, d] = ANK[i];
  const t = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
      const cx = xx * 32 + (yy % 2) * 16 + 8, cy = yy * 32 + 16;
      x.fillStyle = b; x.beginPath(); x.arc(cx, cy, 12, 0, 7); x.fill();
      x.fillStyle = c; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill();
      x.fillStyle = d; x.beginPath(); x.moveTo(cx, cy - 4); x.lineTo(cx + 4, cy); x.lineTo(cx, cy + 4); x.lineTo(cx - 4, cy); x.fill();
    }
    x.strokeStyle = c; x.lineWidth = 3; for (let yy = 0; yy < 4; yy++) { x.beginPath(); x.moveTo(0, yy * 32); for (let xx = 0; xx <= 128; xx += 8) x.lineTo(xx, yy * 32 + (xx % 16 ? 3 : -3)); x.stroke(); }
  }, true);
  t.repeat.set(2, 1.5); ankCache[i] = t; return t;
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

function headGeo(o) {
  const skin = o.skin, dark = new THREE.Color(skin).multiplyScalar(0.75).getStyle();
  const hair = o.old ? '#d8d8d8' : '#15100c';
  const parts = [
    P(G.sph, skin, 0, 0, 0, 0, 0, 0, 0.9, 0.86, 0.84),
    P(G.sphLo, skin, 0.4, 0, 0, 0, 0, 0, 0.12, 0.16, 0.1), P(G.sphLo, skin, -0.4, 0, 0, 0, 0, 0, 0.12, 0.16, 0.1),
    P(G.sphLo, dark, 0, -0.05, 0.41, 0, 0, 0, 0.1, 0.08, 0.08),
    // eyes
    P(G.sphLo, '#ffffff', 0.15, 0.05, 0.355, 0, 0, 0, 0.22, 0.27, 0.1), P(G.sphLo, '#ffffff', -0.15, 0.05, 0.355, 0, 0, 0, 0.22, 0.27, 0.1),
    P(G.sphLo, '#1a0f08', 0.15, 0.03, 0.4, 0, 0, 0, 0.13, 0.16, 0.05), P(G.sphLo, '#1a0f08', -0.15, 0.03, 0.4, 0, 0, 0, 0.13, 0.16, 0.05),
    P(G.sphLo, '#ffffff', 0.175, 0.08, 0.425, 0, 0, 0, 0.045, 0.045, 0.02), P(G.sphLo, '#ffffff', -0.125, 0.08, 0.425, 0, 0, 0, 0.045, 0.045, 0.02),
    // brows + smile
    P(G.box, '#15100c', 0.15, 0.22, 0.37, 0, 0, -0.15, 0.15, 0.03, 0.04), P(G.box, '#15100c', -0.15, 0.22, 0.37, 0, 0, 0.15, 0.15, 0.03, 0.04),
    P(new THREE.TorusGeometry(0.085, 0.022, 4, 10, Math.PI), '#7a1f1f', 0, -0.15, 0.37, 0.2, 0, Math.PI),
    P(G.sphLo, '#d9776a', 0.24, -0.08, 0.32, 0, 0, 0, 0.08, 0.05, 0.03), P(G.sphLo, '#d9776a', -0.24, -0.08, 0.32, 0, 0, 0, 0.08, 0.05, 0.03),
  ];
  if (o.head === 'gele') {
    const c = o.headColor;
    parts.push(P(new THREE.TorusGeometry(0.3, 0.12, 6, 14), c, 0, 0.24, -0.02, Math.PI / 2 - 0.25, 0, 0));
    parts.push(P(G.sph, c, 0, 0.38, -0.04, 0, 0, 0, 0.72, 0.42, 0.72));
    parts.push(P(G.cone, c, 0.12, 0.6, -0.12, -0.5, 0, -0.3, 0.42, 0.42, 0.12));
    parts.push(P(G.cone, c, -0.14, 0.58, -0.1, -0.4, 0, 0.35, 0.36, 0.36, 0.12));
  } else if (o.head === 'cap') {
    parts.push(P(G.cyl, o.headColor, 0.03, 0.33, -0.02, 0, 0, 0.22, 0.7, 0.26, 0.7));
    parts.push(P(G.sphLo, hair, 0, 0.12, -0.08, 0, 0, 0, 0.8, 0.5, 0.75));
  } else if (o.hair === 'bun') {
    parts.push(P(G.sph, hair, 0, 0.15, -0.07, 0, 0, 0, 0.92, 0.68, 0.86));
    parts.push(P(G.sph, hair, 0, 0.42, -0.14, 0, 0, 0, 0.32, 0.3, 0.32));
  } else if (o.hair === 'braids') {
    parts.push(P(G.sph, hair, 0, 0.15, -0.07, 0, 0, 0, 0.92, 0.68, 0.88));
    for (let i = -2; i <= 2; i++) parts.push(P(G.cyl6, hair, i * 0.1, -0.2, -0.3, 0.25, 0, 0, 0.06, 0.55, 0.06));
  } else {
    parts.push(P(G.sph, hair, 0, 0.15, -0.07, 0, 0, 0, 0.92, 0.66, 0.86));
  }
  if (o.old && o.gender === 'm') parts.push(P(G.box, '#e8e8e8', 0, -0.3, 0.26, 0.3, 0, 0, 0.26, 0.12, 0.08));
  return merge(parts);
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
};
// Build an articulated low-poly humanoid. Faces +Z.
export function makeHuman(o, detail = true) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const sc = o.kid ? 0.72 : 1; body.scale.setScalar(sc);
  const skinM = toon(o.skin);
  const topM = o.topTex != null ? toon('#ffffff', { map: ankara(o.topTex) }) : toon(o.top);
  const botM = toon(o.bottom || o.top);
  const shoeM = toon(o.shoe || '#3e2723');
  const hips = new THREE.Group(); hips.position.y = 0.8; body.add(hips);
  const spine = new THREE.Group(); hips.add(spine);
  const torso = partMesh(GH.torso, topM); torso.position.y = 0.31; spine.add(torso); outline(torso, 0.025);
  if (o.trim) { const t = partMesh(new THREE.CylinderGeometry(0.255, 0.255, 0.06, 10).scale(1, 1, 0.73), toon(o.trim)); t.position.y = 0.03; spine.add(t); }
  const neck = new THREE.Group(); neck.position.y = 0.64; spine.add(neck);
  const head = partMesh(headGeo(o), VC); head.position.y = 0.4; neck.add(head); outline(head, 0.025);
  const mk = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.33 * side, 0.56, 0); spine.add(sh);
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
    const hip = new THREE.Group(); hip.position.set(0.14 * side, 0, 0); hips.add(hip);
    r.hip = hip;
    if (detail) {
      const th = partMesh(GH.thigh, botM); th.position.y = -0.2; hip.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.4; hip.add(kn);
      const sn = partMesh(GH.shin, o.bottom ? botM : skinM); sn.position.y = -0.19; kn.add(sn);
      const s = partMesh(GH.shoe, shoeM); s.position.set(0, -0.37, 0.05); kn.add(s);
      r.kn = kn;
    } else {
      const lg = partMesh(GH.legFull, o.bottom ? botM : skinM); lg.position.y = -0.4; hip.add(lg);
      const s = partMesh(GH.shoe, shoeM); s.position.set(0, -0.77, 0.05); hip.add(s);
    }
    return r;
  };
  const L = mk(1), R = mk(-1);
  if (o.skirt) {
    const sm = o.skirt === 'tex' ? toon('#ffffff', { map: ankara(o.topTex ?? 1), side: THREE.DoubleSide }) : toon(o.skirt, { side: THREE.DoubleSide });
    const sk = partMesh(o.long ? GH.gown : GH.skirt, sm); sk.position.y = o.long ? -0.32 : -0.2; hips.add(sk); outline(sk, 0.02);
  }
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
