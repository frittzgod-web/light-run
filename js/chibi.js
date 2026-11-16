// v7 "clay toy" chibi characters.
// One SkinnedMesh per character (1 draw call, 2 when it wears an ankara/stripe texture), built procedurally from
// smooth lathed/subdivided shapes so every creator option (skin, hair, gele, ankara …) stays swappable.
// Soft clay shading (wrap light + warm subsurface tint + rim), glossy eyes, blinking and expressions.
import * as THREE from './vendor/three.min.js';
import { ankara, stripes } from './toon.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new V3(x, y, z), _q, new V3(sx, sy, sz));
}
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const bump = (x, y, z, f) => Math.sin(x * f + 1.3) * Math.sin(y * f * 1.13 + 0.7) * Math.sin(z * f * 0.91 + 2.1);

// ---------- level of detail ----------
export const DETAIL = {
  hi: { hs: 34, hr: 26, sp: 14, spr: 10, lat: 16, tub: 9, torus: 16 },
  mid: { hs: 22, hr: 16, sp: 9, spr: 7, lat: 10, tub: 6, torus: 10 },
  lo: { hs: 10, hr: 8, sp: 5, spr: 4, lat: 6, tub: 4, torus: 5 },
};
// quality tier → which LOD the player (true) and live NPCs (false) get
let LODMAP = { true: 'hi', false: 'mid' };
export function setCharTier(t) { LODMAP = t === 'low' ? { true: 'mid', false: 'lo' } : { true: 'hi', false: 'mid' }; }
const GC = new Map();
function geo(key, fn) { let g = GC.get(key); if (!g) { g = fn(); GC.set(key, g); } return g; }
const sph = (d, big) => geo('s' + d.sp + (big ? 'b' : ''), () => big ? new THREE.SphereGeometry(1, d.hs, d.hr) : new THREE.SphereGeometry(1, d.sp, d.spr));
const sphS = d => geo('ss' + d.sp, () => new THREE.SphereGeometry(1, Math.max(6, d.sp - 6), Math.max(4, d.spr - 5)));
const lathe = (key, pts, seg) => geo('l' + key + seg, () => { const q = pts[0][1] > pts[pts.length - 1][1] ? pts.slice().reverse() : pts; return new THREE.LatheGeometry(q.map(p => new V2(p[0], p[1])), seg); });
const torus = (key, R, r, d, arc = Math.PI * 2) => geo('t' + key + d.torus, () => new THREE.TorusGeometry(R, r, Math.max(4, d.tub - 2), d.torus, arc));
const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const capsule = d => geo('cap' + d.tub, () => new THREE.CapsuleGeometry(0.5, 1, 3, d.tub));

// plait / loc strand: tapered tube with spiral ridges (braids) or soft lumps (locs), hanging down -y from the origin
function strand(d, kind) {
  return geo('str' + kind + d.tub, () => {
    const seg = kind === 'loc' ? 14 : 22, g = new THREE.CylinderGeometry(1, 1, 1, Math.max(5, d.tub - 2), seg, false);
    g.translate(0, -0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = -y;
      const taper = (kind === 'loc' ? 1 - t * 0.25 : 1 - t * 0.4) * Math.min(1, 0.5 + t * 8);
      const ridge = kind === 'loc' ? 1 + 0.12 * Math.sin(t * 40 + Math.sin(a * 2) * 1.5) : 1 + 0.22 * Math.max(0, Math.sin(a * 2 + t * 70));
      p.setXYZ(i, x * taper * ridge, y, z * taper * ridge);
    }
    g.computeVertexNormals(); return g;
  });
}
// ---------- clay material ----------
const MATS = new Map();
export function clayMat(tex) {
  const k = tex ? tex.uuid : 'base'; let m = MATS.get(k);
  if (m) return m;
  m = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex || null });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 cmat;\nvarying vec2 vMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = cmat;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vMat;')
      .replace('#include <opaque_fragment>', `
        float cNV = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float cFr = pow(1.0 - cNV, 2.4);
        // wrapped soft fill (clay), warm subsurface on skin, gentle cool-warm rim
        vec3 cN = normalize(normal);
        float cKey = clamp(dot(cN, normalize(vec3(-0.35, 0.65, 0.68))) * 0.6 + 0.4, 0.0, 1.0);
        outgoingLight += diffuseColor.rgb * (0.04 + 0.26 * cKey * cKey);
        // cheap glossy highlight (hair sheen, eyes, leather, buckles) from the same studio key
        float cSpec = pow(max(dot(cN, normalize(vec3(-0.35, 0.65, 0.68) + normalize(vViewPosition))), 0.0), 34.0);
        outgoingLight += vec3(1.0, 0.97, 0.9) * cSpec * clamp(vMat.x, 0.0, 1.0) * 0.5;
        outgoingLight += diffuseColor.rgb * vec3(0.24, 0.07, 0.03) * vMat.y * (0.5 + 0.5 * cFr);
        outgoingLight += vec3(1.0, 0.86, 0.7) * cFr * 0.1 * (0.35 + diffuseColor.rgb);
        outgoingLight = mix(outgoingLight, diffuseColor.rgb * 1.25, step(1.5, vMat.x));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'clay7';
  MATS.set(k, m); return m;
}

// ---------- mesh builder ----------
const _p = new V3(), _lp = new V3(), _n = new V3(), _c = new THREE.Color(), _wm = new THREE.Matrix4(), _nm = new THREE.Matrix3();
class Build {
  constructor(bones) { this.bones = bones; this.ix = {}; bones.forEach((b, i) => { this.ix[b.name] = i; }); this.pos = []; this.nor = []; this.col = []; this.uv = []; this.mat = []; this.si = []; this.sw = []; this.groups = new Map(); this.n = 0; }
  // g: geometry, bone: name of the frame + default weight, local: Matrix4 in bone space, color,
  // o: { w(lp) → [[bone, w], …], gloss, sss, tex, cf(gp, lp, color), uv: [su, sv] }
  add(g, bone, local, color, o = {}) {
    const B = this.bones[this.ix[bone]];
    _wm.multiplyMatrices(B.matrixWorld, local); _nm.getNormalMatrix(_wm);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const base = this.n, col = new THREE.Color(color), gl = o.gloss || 0, ss = o.sss || 0, bi = this.ix[bone];
    const su = o.uv ? o.uv[0] : 1, sv = o.uv ? o.uv[1] : 1;
    for (let i = 0; i < P.count; i++) {
      _p.fromBufferAttribute(P, i); _lp.copy(_p).applyMatrix4(local);
      const gp = o.cf ? _p.clone() : null;
      _p.applyMatrix4(_wm); this.pos.push(_p.x, _p.y, _p.z);
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); this.nor.push(_n.x, _n.y, _n.z);
      _c.copy(col); if (o.cf) o.cf(gp, _lp, _c);
      this.col.push(_c.r, _c.g, _c.b);
      if (U) this.uv.push(U.getX(i) * su, U.getY(i) * sv); else this.uv.push(0, 0);
      this.mat.push(gl, ss);
      if (o.w) {
        const ws = o.w(_lp); let t = 0; for (const x of ws) t += x[1];
        for (let k = 0; k < 4; k++) { const x = ws[k]; this.si.push(x ? this.ix[x[0]] : 0); this.sw.push(x ? x[1] / t : 0); }
      } else { this.si.push(bi, 0, 0, 0); this.sw.push(1, 0, 0, 0); }
    }
    const key = o.tex ? o.tex.uuid : 'base';
    let gr = this.groups.get(key); if (!gr) { gr = { tex: o.tex || null, ind: [] }; this.groups.set(key, gr); }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) gr.ind.push(base + a[i]); }
    else for (let i = 0; i < P.count; i++) gr.ind.push(base + i);
    this.n += P.count;
  }
  finish() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('cmat', new THREE.Float32BufferAttribute(this.mat, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    const all = [], mats = []; let start = 0;
    const order = [...this.groups.values()].sort((a, b) => (a.tex ? 1 : 0) - (b.tex ? 1 : 0));
    for (const gr of order) { for (const i of gr.ind) all.push(i); g.addGroup(start, gr.ind.length, mats.length); mats.push(clayMat(gr.tex)); start += gr.ind.length; }
    g.setIndex(all);
    if (mats.length === 1) g.clearGroups();
    return { geo: g, mat: mats.length === 1 ? mats[0] : mats };
  }
}

// ---------- colour helpers ----------
const C = c => new THREE.Color(c);
const mix = (a, b, t) => C(a).lerp(C(b), t);
const shade = (c, k) => C(c).multiplyScalar(k);
const lumi = c => { const x = C(c); return 0.3 * x.r + 0.59 * x.g + 0.11 * x.b; };
const leather = '#6b4226', gold = '#e0a83a';
const W = (a, b, t) => [[a, 1 - t], [b, t]];

// ---------- the character ----------
// o: options from look.toHuman / randomLook. detail: true|'hi' (player, creator), false|'mid' (NPC), 'lo' (baked crowd).
export function makeHuman(o, detail = true) {
  const lod = detail === true ? LODMAP.true : detail === false ? LODMAP.false : detail;
  const d = DETAIL[lod] || DETAIL.mid, hi = lod === 'hi', lo = lod === 'lo';
  const f = o.gender === 'f';
  const bw = { slim: 0.88, regular: 1, broad: 1.14 }[o.body] || 1;
  const skin = o.skin || '#8d5524', hairC = o.old ? '#d8d4cc' : (o.hairColor || '#1a1210');
  const top = o.top || '#e53935', bot = o.bottom || null, shoe = o.shoe || '#3e2723';
  const topTex = o.topTex != null ? ankara(o.topTex) : o.topStripe ? stripes(o.top, o.topStripe) : null;
  const topCol = topTex ? '#ffffff' : top;
  const skirt = o.skirt || null, skirtTex = skirt === 'tex' ? ankara(o.skirtTex ?? o.topTex ?? 1) : null;

  // --- skeleton (names match the old rig so poses/consumers keep working) ---
  const root = new THREE.Group(); const bones = [];
  const bone = (name, parent, x = 0, y = 0, z = 0) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); (parent || root).add(b); bones.push(b); return b; };
  const hipY = 0.56;
  const body = bone('body'); if (o.kid) body.scale.setScalar(0.74);
  const hips = bone('hips', body, 0, hipY, 0);
  const spine = bone('spine', hips);
  const neck = bone('neck', spine, 0, 0.45, 0);
  const head = bone('head', neck, 0, 0.05, 0);
  const HR = 0.35 * (o.kid ? 1.1 : 1), HC = new V3(0, 0.29 * (o.kid ? 1.08 : 1), 0.015), HS = new V3(1.02, 0.95, 0.97);
  const shX = 0.19 * bw + 0.03, hipX = 0.085 * (0.6 + bw * 0.4);
  const side = s => {
    const n = s > 0 ? 'L' : 'R';
    const sh = bone('sh' + n, spine, shX * s, 0.375, 0);
    const el = bone('el' + n, sh, 0, -0.19, 0);
    const hand = bone('hand' + n, el, 0, -0.18, 0);
    const hip = bone('hip' + n, hips, hipX * s, -0.01, 0);
    const kn = bone('kn' + n, hip, 0, -0.25, 0);
    const ft = bone('ft' + n, kn, 0, -0.25, 0);
    return { sh, el, hand, hip, kn, ft, n };
  };
  const L = side(1), R = side(-1);
  // face rig
  const surf = (yaw, pitch, out = 0) => {
    const n = new V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const p = n.clone().multiplyScalar(HR + out).multiply(HS).add(HC);
    return { p, n: n.clone().multiply(new V3(1 / HS.x, 1 / HS.y, 1 / HS.z)).normalize() };
  };
  const eyeStyle = o.eyes || 'round';
  const EY = { round: { yaw: 0.37, pitch: -0.04, r: 0.088, sy: 1.12, lid: -0.8 }, big: { yaw: 0.38, pitch: -0.03, r: 0.098, sy: 1.18, lid: -1.0 }, almond: { yaw: 0.38, pitch: -0.03, r: 0.085, sy: 0.98, lid: -0.5 }, sleepy: { yaw: 0.37, pitch: -0.05, r: 0.086, sy: 1.04, lid: -0.1 } }[eyeStyle] || { yaw: 0.37, pitch: -0.04, r: 0.088, sy: 1.12, lid: -0.8 };
  const face = {};
  const eyeFrame = s => { const e = surf(EY.yaw * s, EY.pitch, -0.02); const n = e.n.clone().lerp(new V3(0, 0, 1), 0.55).normalize(); return { p: e.p, q: new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), n) }; };
  const eL = eyeFrame(1), eR = eyeFrame(-1);
  const lidL = bone('lidL', head); lidL.position.copy(eL.p); lidL.quaternion.copy(eL.q);
  const lidR = bone('lidR', head); lidR.position.copy(eR.p); lidR.quaternion.copy(eR.q);
  const eyeL = bone('eyeL', head); eyeL.position.copy(eL.p); eyeL.quaternion.copy(eL.q);
  const eyeR = bone('eyeR', head); eyeR.position.copy(eR.p); eyeR.quaternion.copy(eR.q);
  const bL = surf(EY.yaw * 1, EY.pitch + 0.3, 0.005), bR = surf(-EY.yaw, EY.pitch + 0.3, 0.005);
  const browL = bone('browL', head); browL.position.copy(bL.p); browL.quaternion.setFromUnitVectors(new V3(0, 0, 1), bL.n);
  const browR = bone('browR', head); browR.position.copy(bR.p); browR.quaternion.setFromUnitVectors(new V3(0, 0, 1), bR.n);
  const mS = surf(0, -0.36, 0.0);
  const mouth = bone('mouth', head); mouth.position.copy(mS.p); mouth.quaternion.setFromUnitVectors(new V3(0, 0, 1), mS.n);
  // lid rest angles are relative to the lid bone frame; we rotate the lid bone about x
  const lidRest = EY.lid;
  root.updateMatrixWorld(true);

  const b = new Build(bones);
  const SK = { sss: 1 }; // skin material flags
  const skinC = C(skin), skinD = shade(skin, 0.82);
  const darkSkin = lumi(skin) < 0.25;

  // ---------- head ----------
  const hg = sph(d, true);
  b.add(hg, 'head', M(HC.x, HC.y, HC.z, 0, 0, 0, HR * HS.x, HR * HS.y, HR * HS.z), skin, {
    ...SK, cf: (g, lp, c) => { // soft jaw shadow + slight forehead sheen
      c.multiplyScalar(0.9 + 0.1 * sstep(-0.9, 0.2, g.y));
    },
  });
  // ears
  for (const s of [1, -1]) { const e = surf(1.52 * s, -0.06, -0.02); b.add(sph(d), 'head', M(e.p.x, e.p.y, e.p.z, 0, 0.25 * s, 0, 0.045, 0.075, 0.06), skinD, SK); }
  // nose: soft button
  const nz = surf(0, -0.17, -0.012);
  b.add(sph(d), 'head', M(nz.p.x, nz.p.y, nz.p.z, -0.2, 0, 0, 0.05, 0.038, 0.04), mix(skin, '#ffc9a0', darkSkin ? 0.1 : 0.06), SK);
  if (!lo) for (const s of [1, -1]) b.add(sph(d), 'head', M(nz.p.x + 0.021 * s, nz.p.y - 0.022, nz.p.z + 0.01, 0, 0, 0, 0.013, 0.009, 0.01), shade(skin, 0.45));
  // cheeks (blush)
  const blush = mix(skin, '#ff6f61', darkSkin ? 0.28 : 0.4);
  for (const s of [1, -1]) { const ck = surf(0.62 * s, -0.22, -0.035); b.add(sph(d), 'head', M(ck.p.x, ck.p.y, ck.p.z, 0, 0.6 * s, 0, 0.075, 0.05, 0.05), blush, { sss: 1 }); }
  // eyes
  const irisA = C(o.eyeColor || '#4a2510'), irisB = C(o.eyeColor ? shade(o.eyeColor, 1.6) : '#b5651d');
  for (const [s, e, lid, eb] of [[1, eL, 'lidL', 'eyeL'], [-1, eR, 'lidR', 'eyeR']]) {
    const F = new THREE.Matrix4().compose(e.p, e.q, new V3(1, 1, 1));
    const at = (x, y, z, sx, sy, sz) => F.clone().multiply(M(x, y, z, 0, 0, 0, sx, sy, sz));
    const r = EY.r * (o.kid ? 1.08 : 1);
    const yo = -0.1 * r;
    b.add(sph(d), eb, M(0, 0, -0.018, 0, 0, 0, r * 1.06, r * EY.sy, r * 0.46), '#fbf7f2', { gloss: 0.9 });
    b.add(sph(d), eb, M(0, yo, 0.02, 0, 0, 0, r * 0.74, r * 0.78 * EY.sy, r * 0.3), irisA, { gloss: 1, cf: (g, lp, c) => { c.lerp(irisB, sstep(-0.1, -0.9, g.y) * 0.85); } });
    b.add(sph(d), eb, M(0, yo, 0.032, 0, 0, 0, r * 0.38, r * 0.42 * EY.sy, r * 0.2), '#120806', { gloss: 1 });
    b.add(sphS(d), eb, M(r * 0.28, yo + r * 0.26, 0.046, 0, 0, 0, r * 0.2, r * 0.22, r * 0.08), '#ffffff', { gloss: 2 });
    b.add(sphS(d), eb, M(-r * 0.24, yo - r * 0.3, 0.044, 0, 0, 0, r * 0.1, r * 0.1, r * 0.05), '#ffffff', { gloss: 2 });
    // upper lid shell + lash line, skinned to the lid bone (blink / squint)
    const lidG = geo('lid' + d.sp, () => new THREE.SphereGeometry(1, d.sp + 4, d.spr, 0, Math.PI * 2, 0, 1.3));
    const LR = r * 1.1;
    b.add(lidG, lid, M(0, 0, -0.018, 0, 0, 0, LR, LR * EY.sy, LR * 0.6), mix(skin, '#000', 0.12), SK);
    const lash = torus('lash', 1, 0.17, d, Math.PI * 1.1);
    const ey = Math.cos(1.3) * LR * EY.sy, er = Math.sin(1.3) * LR;
    b.add(lash, lid, M(0, ey, -0.018, Math.PI / 2, 0, 0, er, er * 0.6, LR * 0.9), '#1a0d08', { gloss: 0.3 });
    if (f || hi) { // outer flick lashes
      for (const k of [0, 1]) b.add(capsule(d), lid, M(s * er * (0.92 + 0.12 * k), ey + 0.012 + k * 0.012, -0.004, 0, 0, -s * (0.9 + 0.35 * k), 0.012, f ? 0.03 : 0.018, 0.012), '#1a0d08');
    }
    if (!lo && hi) b.add(geo('lower' + d.tub, () => new THREE.TorusGeometry(1, 0.08, 4, d.torus, Math.PI * 0.8).rotateZ(Math.PI * 1.1)), 'head', at(0, 0, 0.0, r * 1.02, r * EY.sy * 1.02, r * 0.5), shade(skin, 0.85), SK);
  }
  // brows
  const browC = o.old ? '#bdb8b0' : shade(hairC, 0.9);
  const bs = o.brows || 'soft';
  const BRW = { soft: [0.05, 0.016, 0.1], arched: [0.055, 0.015, 0.2], thick: [0.055, 0.024, 0.06], straight: [0.055, 0.016, 0], worried: [0.05, 0.016, -0.25] }[bs] || [0.05, 0.016, 0.1];
  for (const [s, bn] of [[1, 'browL'], [-1, 'browR']]) b.add(capsule(d), bn, M(0, 0, 0, 0, 0, Math.PI / 2 + s * BRW[2], BRW[1], BRW[0] * 1.6, BRW[1] * 0.7), browC);
  // mouth (on the mouth bone: scale = bigger smile, flip = frown)
  const mst = o.smile || 'smile', lip = mix(skin, '#8a1c22', darkSkin ? 0.55 : 0.65);
  if (mst === 'grin' || mst === 'open') {
    b.add(sph(d), 'mouth', M(0, -0.012, -0.012, 0, 0, 0, 0.058, mst === 'open' ? 0.04 : 0.034, 0.022), '#4a1212');
    b.add(sph(d), 'mouth', M(0, -0.03, 0.0, 0, 0, 0, 0.032, 0.014, 0.012), '#e46a72');
    if (mst === 'grin') b.add(box, 'mouth', M(0, 0.008, 0.004, 0, 0, 0, 0.07, 0.016, 0.012), '#fffaf0');
    b.add(torus('smile', 1, 0.16, d, Math.PI), 'mouth', M(0, 0.02, -0.004, 0, 0, Math.PI, 0.062, 0.05, 0.05), lip);
  } else if (mst === 'calm') {
    b.add(capsule(d), 'mouth', M(0, 0, 0, 0, 0, Math.PI / 2, 0.012, 0.05, 0.008), lip);
  } else {
    b.add(torus('smile2', 1, 0.22, d, Math.PI), 'mouth', M(0, 0.026, -0.004, 0, 0, Math.PI, 0.066, 0.05, 0.05), lip);
    if (!lo) for (const s of [1, -1]) b.add(sphS(d), 'mouth', M(0.066 * s, 0.03, -0.004, 0, 0, 0, 0.012, 0.012, 0.01), shade(skin, 0.75));
  }
  // neck
  b.add(lathe('neck', [[0.0, -0.05], [0.07, -0.04], [0.065, 0.06], [0.06, 0.1], [0, 0.11]], d.lat), 'neck', M(0, 0, 0), shade(skin, 0.86), SK);

  // ---------- hair & headwear ----------
  const hairO = { gloss: 0.22, cf: (g, lp, c) => { const t = lp.y - HC.y; c.multiplyScalar(0.82 + 0.38 * sstep(0.05, 0.38, t) + 0.12 * bump(lp.x, lp.y, lp.z, 40)); } };
  const hd = o.head, style = o.hair || 'short', HCv = HC;
  const capShell = (k = 1.04, tilt = -0.42, theta = 1.45, col = hairC, bumpy = 0.008) => {
    const g = geo('shell' + d.hs + theta, () => new THREE.SphereGeometry(1, d.hs, d.hr, 0, Math.PI * 2, 0, theta));
    const pos = g.attributes.position;
    // per-character bumpy clumps through colour only (geometry shared); add a bumpy shell copy when hi
    let gg = g;
    if (bumpy && hi) { gg = g.clone(); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k2 = 1 + bumpy * (bump(x, y, z, 14) + 0.6 * bump(x, y, z, 29)); p.setXYZ(i, x * k2, y * k2, z * k2); } gg.computeVertexNormals(); }
    b.add(gg, 'head', M(HCv.x, HCv.y + 0.01, HCv.z - 0.01, tilt, 0, 0, HR * HS.x * k, HR * HS.y * k, HR * HS.z * k), col, hairO);
    if (gg !== g) gg.dispose();
    return pos;
  };
  const clump = (x, y, z, r, col = hairC, sy = 1, rx = 0, rz = 0) => b.add(r < 0.06 ? sphS(d) : sph(d), 'head', M(x, y, z, rx, 0, rz, r, r * sy, r), col, hairO);
  const onHead = (yaw, pitch, out = 0) => surf(yaw, pitch, out).p;
  // short hairline shell for most styles (not under a full gele)
  if (style !== 'afro' && !(hd === 'gele' && style !== 'braids' && style !== 'locs')) capShell(style === 'lowcut' || style === 'short' ? 1.025 : 1.04, -0.5, style === 'lowcut' || style === 'short' ? 1.35 : 1.45, hairC, style === 'lowcut' ? 0.004 : 0.01);
  if (!hd || hd === 'cap' || hd === 'beret') {
    if (style === 'afro') {
      const c0 = new V3(HCv.x, HCv.y + 0.13, HCv.z - 0.1);
      b.add(sph(d, true), 'head', M(c0.x, c0.y, c0.z, 0, 0, 0, 0.46, 0.42, 0.4), hairC, hairO);
      const N = lo ? 10 : hi ? 34 : 20;
      for (let i = 0; i < N; i++) { const y = 1 - (i + 0.5) / N * 1.6, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; const p = new V3(Math.cos(a) * r, y, Math.sin(a) * r); if (p.z > 0.25 && p.y < 0.5) continue; clump(c0.x + p.x * 0.44, c0.y + p.y * 0.4, c0.z + p.z * 0.38, 0.11 + 0.04 * hash(i, 1, 2)); }
    } else if (style === 'puff') {
      const c0 = new V3(0, HCv.y + 0.4, HCv.z - 0.12);
      b.add(sph(d), 'head', M(c0.x, c0.y, c0.z, 0, 0, 0, 0.2, 0.18, 0.2), hairC, hairO);
      for (let i = 0; i < (lo ? 5 : 11); i++) { const a = i * 2.4, y = 0.8 - i / 11 * 1.5, r = Math.sqrt(Math.max(0, 1 - y * y)); clump(c0.x + Math.cos(a) * r * 0.18, c0.y + y * 0.16, c0.z + Math.sin(a) * r * 0.18, 0.08); }
      b.add(torus('band', 1, 0.25, d), 'head', M(c0.x, c0.y - 0.15, c0.z + 0.02, Math.PI / 2 - 0.4, 0, 0, 0.12, 0.12, 0.12), o.headColor || '#e0c080', { gloss: 0.3 });
    } else if (style === 'bun') {
      const c0 = new V3(0, HCv.y + 0.34, HCv.z - 0.2);
      for (let i = 0; i < (lo ? 4 : 8); i++) { const a = i / 8 * Math.PI * 2; clump(c0.x + Math.cos(a) * 0.06, c0.y + Math.sin(a * 2) * 0.02, c0.z + Math.sin(a) * 0.06, 0.1, hairC, 0.85); }
      b.add(torus('rope', 1, 0.22, d), 'head', M(c0.x, c0.y - 0.06, c0.z + 0.03, Math.PI / 2 - 0.6, 0, 0, 0.13, 0.13, 0.13), '#c9a46a', { gloss: 0.2, cf: (g, lp, c) => c.multiplyScalar(0.8 + 0.25 * Math.sin(Math.atan2(g.y, g.x) * 18)) });
      if (!lo) for (const s of [1, -1]) b.add(sph(d), 'head', M(c0.x + 0.11 * s, c0.y - 0.04, c0.z + 0.06, 0.4, 0, 0.6 * s, 0.05, 0.016, 0.028), '#5aa04a', { gloss: 0.3 });
    } else if (style === 'braids') {
      // box braids: tapered plaited strands falling behind the shoulders, gold cuffs at the ends
      const n = lo ? 6 : hi ? 18 : 11, sg = strand(d, 'braid');
      for (let i = 0; i < n; i++) {
        const yaw = (i / (n - 1) - 0.5) * 3.6 + Math.PI; const st = onHead(yaw, 0.18, -0.01);
        const len = 0.5 + 0.06 * hash(i, 3, 1), tilt = 0.28;
        const m = M(st.x, st.y, st.z, Math.cos(yaw) * tilt, 0, -Math.sin(yaw) * tilt, 0.048, len, 0.048);
        b.add(sg, 'head', m, hairC, hairO);
        if (!lo) { const e = new V3(0, -len, 0).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.cos(yaw) * tilt, 0, -Math.sin(yaw) * tilt))); b.add(sphS(d), 'head', M(st.x + e.x, st.y + e.y, st.z + e.z, 0, 0, 0, 0.022, 0.03, 0.022), gold, { gloss: 0.8 }); }
      }
      // a couple of front strands framing the face
      if (!lo) for (const s2 of [1, -1]) { const st = onHead(1.25 * s2, 0.2, -0.01); b.add(sg, 'head', M(st.x, st.y, st.z, 0, 0, 0.12 * s2, 0.042, 0.42, 0.042), hairC, hairO); }
    } else if (style === 'cornrows') {
      const rows = lo ? 4 : 7;
      for (let r = 0; r < rows; r++) {
        const yaw = (r / (rows - 1) - 0.5) * 1.5, beads = lo ? 6 : 12;
        for (let k = 0; k < beads; k++) { const pitch = 0.35 + k / beads * 2.4; const p = onHead(yaw * Math.cos((pitch - 1.2) * 0.4), Math.min(pitch, Math.PI / 2), 0.015); const pp = pitch > Math.PI / 2 ? onHead(yaw + Math.PI, Math.PI - pitch, 0.015) : p; clump(pp.x, pp.y, pp.z, 0.03, hairC, 1.3); }
      }
    } else if (style === 'bantu') {
      const pts = [[0, 1.15], [0.9, 0.7], [-0.9, 0.7], [0.5, 0.25], [-0.5, 0.25], [2.4, 0.6], [-2.4, 0.6], [Math.PI, 0.9]];
      for (const [yaw, pitch] of pts.slice(0, lo ? 5 : 8)) { const p = onHead(yaw, pitch, 0.0); const n = p.clone().sub(HCv).normalize(); for (let k = 0; k < 3; k++) clump(p.x + n.x * k * 0.045, p.y + n.y * k * 0.045, p.z + n.z * k * 0.045, 0.065 - k * 0.017); }
    } else if (style === 'locs') {
      const n = lo ? 7 : hi ? 18 : 12, sg = strand(d, 'loc');
      for (let i = 0; i < n; i++) {
        const yaw = (i / (n - 1) - 0.5) * 3.5 + Math.PI; const st = onHead(yaw, 0.3, -0.06);
        const len = 0.5 + 0.1 * hash(i, 7, 2), tilt = 0.32;
        b.add(sg, 'head', M(st.x, st.y, st.z, Math.cos(yaw) * tilt, 0, -Math.sin(yaw) * tilt, 0.058, len, 0.058), hairC, hairO);
      }
      if (!lo) for (let i = 0; i < 6; i++) { const yaw = (i / 5 - 0.5) * 1.6; const p = onHead(yaw, 0.95, 0.01); clump(p.x, p.y, p.z, 0.06, hairC, 0.9, 0.6); }
    } else if (style === 'short' || style === 'lowcut') {
      // a few soft sculpted waves on the crown
      if (hi && style === 'short') for (let i = 0; i < 6; i++) { const yaw = (i / 5 - 0.5) * 1.4; const p = onHead(yaw, 0.92, -0.005); clump(p.x, p.y, p.z, 0.07, hairC, 0.5, 0.4); }
    }
  }
  if (hd === 'gele') {
    const gc = o.headColor || '#ffd23f', gD = shade(gc, 0.78), gL = mix(gc, '#fff', 0.18);
    const pleat = (g, lp, c) => { c.multiplyScalar(0.78 + 0.3 * (0.5 + 0.5 * Math.sin(g.x * 9 + g.y * 3))); };
    const cr = new V3(HCv.x, HCv.y + 0.19, HCv.z - 0.08);
    // snug wrapped base
    b.add(sph(d, true), 'head', M(cr.x, cr.y, cr.z, -0.2, 0, 0, HR * 1.06, HR * 0.88, HR * 1.04), gc, { gloss: 0.55, cf: (g, lp, c) => c.multiplyScalar(0.82 + 0.22 * (0.5 + 0.5 * Math.sin(g.y * 14 + g.x * 4))) });
    b.add(torus('gband', 1, 0.17, d), 'head', M(cr.x, cr.y - 0.02, cr.z + 0.04, Math.PI / 2 - 0.12, 0, 0, HR * 1.03, HR * 1.03, HR * 1.03), gD, { gloss: 0.55 });
    // the dramatic pleated fan, rising up and back like starched aso-oke
    const fans = lo ? 4 : hi ? 11 : 7;
    for (let i = 0; i < fans; i++) {
      const t = i / (fans - 1) - 0.5, a = t * 2.6, h = 1 - Math.abs(t) * 0.7;
      b.add(sph(d), 'head', M(cr.x + Math.sin(a) * 0.2, cr.y + 0.28 + h * 0.12, cr.z - 0.06 + Math.cos(a) * 0.05 - Math.abs(t) * 0.08, -0.35, a * 0.6, -t * 1.5, 0.15 + h * 0.05, 0.2 + h * 0.08, 0.045), i % 2 ? gc : gL, { gloss: 0.6, cf: pleat });
    }
    // knot and tail at the back
    b.add(sph(d), 'head', M(cr.x, cr.y + 0.08, cr.z - 0.36, 0.3, 0, 0, 0.11, 0.1, 0.08), gD, { gloss: 0.5 });
    if (!lo) b.add(sph(d), 'head', M(cr.x + 0.08, cr.y + 0.2, cr.z - 0.34, 0.4, 0, -0.7, 0.07, 0.15, 0.035), gc, { gloss: 0.55, cf: pleat });
  } else if (hd === 'cap') { // fila
    const cc = o.headColor || '#0d47a1';
    b.add(lathe('fila', [[0, 0.24], [0.2, 0.22], [0.31, 0.13], [0.355, 0.02], [0.36, -0.01], [0.33, -0.015], [0, 0]], d.lat + 4), 'head', M(HCv.x, HCv.y + 0.13, HCv.z - 0.02, -0.22, 0, 0.18, 1.02, 1.0, 1.0), cc, { gloss: 0.3, cf: (g, lp, c) => c.multiplyScalar(0.85 + 0.2 * Math.abs(Math.sin(Math.atan2(g.z, g.x) * 6))) });
  } else if (hd === 'beret') {
    const cc = o.headColor || '#c62828';
    b.add(sph(d, true), 'head', M(HCv.x + 0.05, HCv.y + 0.27, HCv.z - 0.04, -0.25, 0, 0.3, 0.37, 0.1, 0.36), cc, { gloss: 0.15 });
    b.add(torus('bb', 1, 0.15, d), 'head', M(HCv.x, HCv.y + 0.2, HCv.z - 0.02, Math.PI / 2 - 0.25, 0, 0.12, 0.33, 0.33, 0.33), shade(cc, 0.8));
    b.add(sph(d), 'head', M(HCv.x + 0.05, HCv.y + 0.38, HCv.z - 0.04, 0, 0, 0, 0.025, 0.03, 0.025), shade(cc, 0.7));
  }
  if (o.old && !f && !lo) b.add(sph(d), 'head', M(0, HCv.y - HR * 0.82, HCv.z + HR * 0.55, 0.3, 0, 0, 0.12, 0.09, 0.08), '#d8d4cc', hairO);

  // ---------- torso & clothes ----------
  const kaftan = !!o.trim, long = !!o.long, isSkirt = !!skirt;
  const TP = [[0, -0.07], [0.17 * bw, -0.065], [0.205 * bw, 0.0], [0.214 * bw, 0.1], [0.212 * bw, 0.22], [0.2 * bw, 0.32], [0.17 * bw, 0.39], [0.11, 0.44], [0.06, 0.46], [0, 0.465]];
  const torsoW = lp => { const t = sstep(0.12, 0.0, lp.y); return W('spine', 'hips', t); };
  const topO = { tex: topTex, uv: [2, 1.4], w: torsoW, cf: (g, lp, c) => { c.multiplyScalar(0.88 + 0.12 * sstep(-0.05, 0.25, lp.y)); } };
  b.add(lathe('torso' + bw, TP, d.lat + 2), 'spine', M(0, 0, 0, 0, 0, 0, 1, 1, 0.8), topCol, topO);
  // collar
  const collar = kaftan ? o.trim : topTex ? shade(top, 0.85) : shade(top, 0.82);
  b.add(torus('collar', 1, 0.28, d), 'spine', M(0, 0.425, 0, Math.PI / 2 + 0.25, 0, 0, 0.1, 0.1 * 0.9, 0.1), collar, { gloss: 0.2 });
  if (kaftan) { // placket + embroidery dashes + hem band
    b.add(box, 'spine', M(0, 0.3, 0.165 * bw, -0.12, 0, 0, 0.045, 0.22, 0.012), o.trim, { gloss: 0.2 });
    if (!lo) for (let i = 0; i < 5; i++) b.add(box, 'spine', M(0, 0.39 - i * 0.045, 0.172 * bw, -0.15, 0, 0, 0.03, 0.01, 0.01), '#ffffff');
  }
  // tunic hem / kaftan flare (follows thighs a little)
  const flare = kaftan ? 0.24 : 0.1;
  if (!long && !isSkirt) {
    const hem = [[0.19 * bw + flare * 0.2, -0.035 - flare], [0.23 * bw + flare * 0.25, -0.02 - flare], [0.222 * bw + flare * 0.1, -0.02], [0.21 * bw, 0.06]];
    b.add(lathe('hem' + bw + flare, hem, d.lat + 2), 'hips', M(0, 0, 0, 0, 0, 0, 1, 1, 0.82), topCol, { tex: topTex, uv: [2, 0.6], w: lp => lp.y > -0.03 ? [['hips', 1]] : [['hips', 0.6], [lp.x > 0 ? 'hipL' : 'hipR', 0.4]] });
    if (kaftan) b.add(torus('hemband', 1, 0.08, d), 'hips', M(0, -0.02 - flare, 0, Math.PI / 2, 0, 0, 0.2 * bw + flare * 0.25, 0.2 * bw * 0.82 + flare * 0.2, 0.2), o.trim, { w: lp => [['hips', 0.6], [lp.x > 0 ? 'hipL' : 'hipR', 0.4]] });
  }
  // stitched patch on plain tops
  if (!topTex && !kaftan && !lo) {
    const pc = lumi(top) > 0.6 ? shade(top, 0.86) : mix(top, '#fff', 0.18);
    b.add(box, 'spine', M(-0.1 * bw, 0.16, 0.168 * bw, -0.05, -0.35, 0.1, 0.08, 0.075, 0.012), pc);
    if (hi) for (let i = 0; i < 4; i++) for (const s of [1, -1]) b.add(box, 'spine', M(-0.1 * bw + (i - 1.5) * 0.019, 0.16 + s * 0.035, 0.175 * bw - 0.012 * (i - 1.5) * 0.35, 0, -0.35, 0.1, 0.01, 0.004, 0.004), shade(pc, 0.6));
  }
  // belt, buckle and pouch (or a sash on gowns)
  if (!long) {
    b.add(torus('belt', 1, 0.12, d), 'hips', M(0, 0.03, 0, Math.PI / 2, 0, 0, 0.212 * bw, 0.212 * bw * 0.82, 0.2), kaftan ? shade(o.trim, 0.75) : leather, { gloss: 0.35 });
    b.add(box, 'hips', M(0, 0.03, 0.175 * bw, 0, 0, 0, 0.055, 0.045, 0.02), gold, { gloss: 0.9 });
    if (!lo) b.add(box, 'hips', M(0, 0.03, 0.186 * bw, 0, 0, 0, 0.03, 0.022, 0.01), shade(gold, 0.55));
    if (!lo && !kaftan) { // pouch with flap
      b.add(sph(d), 'hips', M(-0.19 * bw, -0.03, 0.08 * bw, 0, -0.9, 0, 0.055, 0.06, 0.035), shade(leather, 1.15), { gloss: 0.2 });
      b.add(sph(d), 'hips', M(-0.196 * bw, 0.0, 0.088 * bw, 0.2, -0.9, 0, 0.057, 0.03, 0.033), shade(leather, 0.85), { gloss: 0.25 });
    }
  } else {
    b.add(torus('sash', 1, 0.16, d), 'spine', M(0, 0.16, 0, Math.PI / 2, 0, 0, 0.21 * bw, 0.21 * bw * 0.82, 0.2), o.trim || (topTex ? shade(o.headColor || '#ffb300', 1) : shade(top, 0.8)), { gloss: 0.3 });
  }
  // belt lantern (NPC flavour; the player carries a real one)
  if (o.beltLantern && !lo) {
    b.add(box, 'hips', M(0.2 * bw, -0.06, 0.06, 0, 0.7, 0, 0.05, 0.07, 0.05), '#3b6b35', { gloss: 0.4 });
    b.add(sph(d), 'hips', M(0.2 * bw, -0.07, 0.06, 0, 0, 0, 0.032, 0.04, 0.032), '#b8ff7a', { gloss: 2 });
  }
  // backpack
  const acc = o.acc || {};
  if (acc.backpack) {
    const pc = o.accColor || '#1e88e5';
    b.add(sph(d, true), 'spine', M(0, 0.24, -0.2 * bw, 0, 0, 0, 0.17, 0.2, 0.1), pc, { gloss: 0.2 });
    b.add(sph(d), 'spine', M(0, 0.17, -0.29 * bw, 0, 0, 0, 0.12, 0.08, 0.05), shade(pc, 0.85), { gloss: 0.2 });
    for (const s of [1, -1]) b.add(torus('strap', 1, 0.07, d), 'spine', M(0.1 * s * bw, 0.26, -0.03, 0, Math.PI / 2, 0, 0.19, 0.2, 0.5), shade(pc, 0.75), { gloss: 0.2 });
  }

  // ---------- arms ----------
  const longSleeve = kaftan || long || o.longSleeve;
  const sleeveCol = topCol;
  for (const S of [L, R]) {
    const s = S === L ? 1 : -1, n = S.n;
    const armW = lp => { const t = sstep(-0.16, -0.22, lp.y); return W('sh' + n, 'el' + n, t); };
    // skin arm (or grey under-shirt when the top is sleeveless-looking ankara)
    const armC = o.underShirt || skin;
    b.add(lathe('arm', [[0, 0.045], [0.068, 0.04], [0.072, -0.02], [0.066, -0.12], [0.058, -0.2], [0.054, -0.28], [0.048, -0.35], [0.04, -0.37], [0, -0.375]], d.lat), 'sh' + n, M(0, 0, 0), armC, { ...(o.underShirt ? {} : SK), w: armW });
    // sleeve
    const sl = longSleeve ? [[0.05, -0.345], [0.07, -0.34], [0.068, -0.3], [0.076, -0.18], [0.086, -0.05], [0.08, 0.05], [0, 0.065]] : [[0.064, -0.11], [0.08, -0.118], [0.088, -0.1], [0.094, -0.04], [0.088, 0.05], [0, 0.065]];
    b.add(lathe(longSleeve ? 'slL' : 'slS', sl, d.lat), 'sh' + n, M(0, 0, 0, 0, 0, 0, bw * 0.95 + 0.05, 1, bw * 0.95 + 0.05), sleeveCol, { tex: topTex, uv: [1, 1], w: armW });
    if (longSleeve && kaftan) b.add(torus('cuff', 1, 0.2, d), 'el' + n, M(0, -0.15, 0, Math.PI / 2, 0, 0, 0.062, 0.062, 0.062), o.trim);
    if (!longSleeve) b.add(torus('scuff', 1, 0.18, d), 'sh' + n, M(0, -0.105, 0, Math.PI / 2, 0, 0, 0.07 * (bw * 0.95 + 0.05), 0.07 * (bw * 0.95 + 0.05), 0.07), shade(collar, 1));
    // mitten hand with a thumb
    const hn = 'hand' + n, hs = 1.05;
    b.add(sph(d), hn, M(0, -0.04 * hs, 0.004, 0, 0, 0, 0.048 * hs, 0.055 * hs, 0.034 * hs), skin, SK);
    b.add(sph(d), hn, M(0, -0.085 * hs, 0.014, 0.35, 0, 0, 0.044 * hs, 0.046 * hs, 0.031 * hs), skin, SK);
    if (!lo) { b.add(capsule(d), hn, M(-0.012 * s, -0.05 * hs, 0.036, 0.5, 0, 0.5 * s, 0.026 * hs, 0.035 * hs, 0.026 * hs), skin, SK); if (hi) for (let k = 0; k < 3; k++) b.add(box, hn, M((k - 1) * 0.022 * hs, -0.112 * hs, 0.035, 0.35, 0, 0, 0.004, 0.03 * hs, 0.004), shade(skin, 0.7)); }
    // wristband
    if (acc.wristband && S === L) b.add(torus('wb', 1, 0.3, d), 'el' + L.n, M(0, -0.15, 0, Math.PI / 2, 0, 0, 0.05, 0.05, 0.05), o.accColor || '#ffd23f', { gloss: 0.4 });
  }
  if (acc.bible) {
    b.add(box, 'handL', M(0.02, -0.08, 0.07, 0.25, 0, 0, 0.13, 0.17, 0.045), '#2b1a10', { gloss: 0.35 });
    b.add(box, 'handL', M(0.02, -0.08, 0.07, 0.25, 0, 0, 0.12, 0.16, 0.05), '#f2ead8');
    b.add(box, 'handL', M(0.02, -0.07, 0.096, 0.25, 0, 0, 0.012, 0.07, 0.004), gold, { gloss: 0.9 });
    b.add(box, 'handL', M(0.02, -0.055, 0.096, 0.25, 0, 0, 0.045, 0.012, 0.004), gold, { gloss: 0.9 });
  }

  // ---------- legs, trousers, skirts, shoes ----------
  const pantsC = bot || (isSkirt ? null : top);
  const shorts = !!o.shorts;
  if (!long) b.add(lathe('pelvis' + bw, [[0, -0.12], [0.11 * bw, -0.11], [0.17 * bw, -0.07], [0.195 * bw, 0.0], [0.2 * bw, 0.07], [0, 0.07]], d.lat), 'hips', M(0, 0, 0, 0, 0, 0, 1, 1, 0.82), pantsC || (skirtTex ? '#fff' : skirt) || skin, pantsC ? { w: lp => lp.y > -0.06 ? [['hips', 1]] : [['hips', 0.5], [lp.x > 0 ? 'hipL' : 'hipR', 0.5]] } : { tex: skirtTex });
  for (const S of [L, R]) {
    const s = S === L ? 1 : -1, n = S.n;
    const legW = lp => { const t = sstep(-0.22, -0.28, lp.y); return lp.y > 0.0 ? W('hips', 'hip' + n, 0.6 + lp.y * -4) : W('hip' + n, 'kn' + n, t); };
    const covered = pantsC && !shorts;
    const legCol = covered ? pantsC : skin;
    b.add(lathe('leg' + bw, [[0, 0.05], [0.085 * (0.7 + bw * 0.3), 0.045], [0.09 * (0.7 + bw * 0.3), -0.04], [0.078, -0.18], [0.066, -0.26], [0.058, -0.36], [0.05, -0.46], [0.045, -0.5], [0, -0.5]], d.lat), 'hip' + n, M(0, 0, 0), legCol, covered ? { w: legW, cf: (g, lp, c) => { if (o.jeans && lp.y < -0.02) c.multiplyScalar(0.92 + 0.08 * Math.sin(lp.y * 60)); } } : { ...SK, w: legW });
    if (covered && o.jeans && !lo) for (let k = 0; k < 6; k++) b.add(box, 'hip' + n, M(0.082 * s - 0.004 * k * s, -0.04 - k * 0.075, 0, 0, 0, 0, 0.004, 0.035, 0.008), '#d9a74a', { w: legW });
    if (shorts) { // puffy shorts with cuff and patch
      b.add(lathe('shorts' + bw, [[0.07, 0.06], [0.105, 0.03], [0.115 * (0.7 + bw * 0.3), -0.08], [0.105, -0.16], [0.09, -0.175], [0.08, -0.16]], d.lat), 'hip' + n, M(0, 0, 0), pantsC, { w: legW });
      b.add(torus('scf', 1, 0.15, d), 'hip' + n, M(0, -0.168, 0, Math.PI / 2, 0, 0, 0.096, 0.096, 0.096), shade(pantsC, 0.8), { w: legW });
      if (S === R && !lo) b.add(box, 'hip' + n, M(-0.06, -0.08, 0.075, 0, -0.5, 0.1, 0.05, 0.05, 0.012), mix(pantsC, '#fff', 0.2), { w: legW });
    } else if (covered && !lo) b.add(torus('pcf', 1, 0.14, d), 'kn' + n, M(0, -0.22, 0, Math.PI / 2, 0, 0, 0.056, 0.056, 0.056), shade(pantsC, 0.85));
    // shoes on the ankle bone
    const fn = 'ft' + n, st = o.shoeStyle || 'plain';
    if (st === 'sandals') {
      b.add(sph(d), fn, M(0, -0.01, 0.045, 0, 0, 0, 0.055, 0.04, 0.1), skin, SK);
      b.add(lathe('sole', [[0, -0.045], [0.07, -0.04], [0.072, -0.02], [0, -0.02]], d.lat), fn, M(0, 0, 0.045, 0, 0, 0, 0.95, 1, 1.6), shade(shoe, 0.8));
      for (const z of [0.02, 0.08]) b.add(torus('sstrap', 1, 0.2, d, Math.PI), fn, M(0, -0.02, z, 0, 0, 0, 0.06, 0.045, 0.06), shoe, { gloss: 0.3 });
    } else {
      const boot = st === 'boots';
      b.add(sph(d), fn, M(0, -0.005, 0.05, 0, 0, 0, 0.078, 0.06, 0.125), shoe, { gloss: 0.35 });
      b.add(sph(d), fn, M(0, -0.0, -0.01, 0, 0, 0, 0.07, 0.065, 0.08), shoe, { gloss: 0.35 });
      b.add(lathe('sole', [[0, -0.045], [0.07, -0.04], [0.072, -0.02], [0, -0.02]], d.lat), fn, M(0, 0, 0.04, 0, 0, 0, 1.1, 1, 1.85), st === 'sneakers' ? '#f5f5f5' : '#2a1d16', { gloss: 0.1 });
      if (st === 'sneakers' && !lo) { b.add(sph(d), fn, M(0, 0.0, 0.12, 0, 0, 0, 0.06, 0.04, 0.05), '#f5f5f5'); for (let k = 0; k < 3; k++) b.add(box, fn, M(0, 0.045 - k * 0.006, 0.03 + k * 0.03, -0.5, 0, 0, 0.06, 0.008, 0.012), '#ffffff'); }
      if (boot) { // chunky shaft + strap + buckle
        b.add(lathe('boot', [[0, -0.02], [0.074, -0.02], [0.07, 0.08], [0.074, 0.13], [0.06, 0.135], [0, 0.135]], d.lat), fn, M(0, 0, -0.005), shoe, { gloss: 0.35, w: lp => lp.y > 0.07 ? W(fn, 'kn' + n, 0.6) : [[fn, 1]] });
        b.add(torus('bstrap', 1, 0.14, d), fn, M(0, 0.06, 0.0, Math.PI / 2, 0, 0, 0.074, 0.074, 0.074), shade(shoe, 0.7));
        if (!lo) b.add(box, fn, M(0.068 * s, 0.06, 0.02, 0, 0.6 * s, 0, 0.018, 0.026, 0.01), gold, { gloss: 0.9 });
      }
    }
  }
  if (isSkirt) {
    const sc = skirtTex ? '#ffffff' : skirt, len = long ? 0.5 : 0.3, flr = long ? 0.13 : 0.1;
    const pts = [[0.2 * bw + flr, -len - 0.025], [0.24 * bw + flr, -len], [0.24 * bw + flr * 0.4, -len * 0.5], [0.215 * bw, 0.0], [0.205 * bw, long ? 0.08 : 0.06]];
    b.add(lathe('skirt' + bw + len, pts, d.lat + 6), 'hips', M(0, 0, 0, 0, 0, 0, 1, 1, 0.86), sc, { tex: skirtTex, uv: [3, 1.2], w: lp => { const t = clamp01(-lp.y / (len + 0.02)) * (long ? 0.55 : 0.5); return [['hips', 1 - t], [lp.x > 0 ? 'hipL' : 'hipR', t]]; }, cf: (g, lp, c) => { c.multiplyScalar(0.9 + 0.1 * Math.sin(Math.atan2(g.z, g.x) * 9)); } });
  }
  // glasses (head bone)
  if (acc.glasses) {
    for (const e of [eL, eR]) { const F = new THREE.Matrix4().compose(e.p, e.q, new V3(1, 1, 1)); b.add(torus('glass', 1, 0.09, d), 'head', F.clone().multiply(M(0, 0, 0.055, 0, 0, 0, EY.r * 1.25, EY.r * 1.15, EY.r)), '#20160f', { gloss: 0.6 }); }
    b.add(box, 'head', M(0, eL.p.y + 0.01, eL.p.z + 0.06, 0, 0, 0, 0.07, 0.012, 0.01), '#20160f');
  }

  // ---------- assemble ----------
  const { geo: g, mat } = b.finish();
  const mesh = new THREE.SkinnedMesh(g, mat);
  mesh.castShadow = lod !== 'lo'; mesh.frustumCulled = true;
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.computeBoundingSphere(); if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.6;
  g.userData.own = true;
  const top_ = (HC.y + HR * 0.95 + 0.05 + 0.45 + hipY) * (o.kid ? 0.74 : 1) + (hd === 'gele' ? 0.3 : style === 'afro' && !hd ? 0.2 : style === 'puff' || style === 'bun' ? 0.16 : 0.02);
  const h = {
    root, body, hips, spine, neck, head, L, R, o, detail: lod !== 'lo', lod, phase: Math.random() * 6, hipY, mesh, topY: top_,
    face: { lidL, lidR, eyeL, eyeR, browL, browR, mouth, lidRest, blink: 1 + Math.random() * 3, bt: 0, expr: null, et: 0, browY: browL.position.y },
  };
  lidL.rotation.x = lidR.rotation.x = lidRest;
  if (o.old) spine.rotation.x = 0.18;
  return h;
}
export function disposeHuman(h) { if (h && h.mesh) { h.mesh.geometry.dispose(); if (h.mesh.skeleton) h.mesh.skeleton.dispose(); } }

// ---------- expressions ----------
export function setExpression(h, e, dur = 0.8) { if (!h || !h.face) return; h.face.expr = e; h.face.et = h.face.dur = dur; }
function updateFace(h, dt) {
  const F = h.face; if (!F) return;
  F.blink -= dt; let cl = 0; // 0 open … 1 shut
  if (F.blink < 0) { F.bt += dt; const k = F.bt / 0.14; cl = Math.sin(Math.min(1, k) * Math.PI); if (k >= 1) { F.bt = 0; F.blink = 2 + Math.random() * 3.5; } }
  let ms = 1, my = 1, bz = 0, by = 0, mr = 0;
  if (F.et > 0) {
    F.et -= dt; const a = clamp01(Math.min(F.et * 4, (F.dur - F.et) * 7));
    if (F.expr === 'happy') { cl = Math.max(cl, 0.45 * a); ms = 1 + 0.35 * a; my = 1 + 0.5 * a; by = 0.014 * a; }
    else if (F.expr === 'ouch') { cl = Math.max(cl, 0.85 * a); if (a > 0.3) { mr = Math.PI; ms = 0.85; my = 0.75; } else { ms = 1 - a; my = 1 - 2 * a; } bz = 0.35 * a; by = -0.012 * a; }
  }
  F.lidL.rotation.x = F.lidR.rotation.x = F.lidRest + (0.35 - F.lidRest) * cl;
  F.eyeL.scale.y = F.eyeR.scale.y = 1 - 0.9 * cl;
  F.mouth.scale.set(ms, Math.max(0.05, my), 1); F.mouth.rotation.z = mr;
  F.browL.rotation.z = -bz; F.browR.rotation.z = bz; F.browL.position.y = F.browR.position.y = F.browY + by;
}

// ---------- procedural animation (same modes as before) ----------
export function poseHuman(h, mode, dt, speed = 1) {
  h.phase += dt * speed * (mode === 'run' ? 11 : mode === 'walk' ? 7 : 2);
  const p = h.phase, s = Math.sin(p), c = Math.cos(p);
  const { L, R } = h; const H0 = h.hipY || 0.8, bs = H0 / 0.8;
  let lean = h.o.old ? 0.18 : 0, bob = 0;
  if (h.mode !== mode) { h.mode = mode; h.blend = dt > 0 ? 0.22 : 0; }
  let k = 1; if (h.blend > 0 && dt > 0) { h.blend -= dt; k = 1 - Math.exp(-22 * dt); }
  const set = k === 1 ? (o, x, z = 0) => { if (o) { o.rotation.x = x; o.rotation.z = z; } } : (o, x, z = 0) => { if (o) { o.rotation.x += (x - o.rotation.x) * k; o.rotation.z += (z - o.rotation.z) * k; } };
  if (mode === 'run') {
    set(L.hip, s * 0.95); set(R.hip, -s * 0.95);
    set(L.kn, Math.max(0, -s) * 1.35 + 0.2); set(R.kn, Math.max(0, s) * 1.35 + 0.2);
    set(L.sh, -s * 1.0, 0.18); set(R.sh, s * 1.0, -0.18); set(L.el, -1.35); set(R.el, -1.35);
    lean += 0.2; bob = Math.abs(c) * 0.1;
    h.head.rotation.x = -0.1; h.head.rotation.z = s * 0.04;
  } else if (mode === 'walk') {
    set(L.hip, s * 0.55); set(R.hip, -s * 0.55);
    set(L.kn, Math.max(0, -s) * 0.6); set(R.kn, Math.max(0, s) * 0.6);
    set(L.sh, -s * 0.5, 0.14); set(R.sh, s * 0.5, -0.14); set(L.el, -0.35); set(R.el, -0.35);
    lean += 0.05; bob = Math.abs(c) * 0.05; h.head.rotation.x = 0;
  } else if (mode === 'jump') {
    set(L.hip, -1.0); set(R.hip, -0.5); set(L.kn, 1.6); set(R.kn, 1.2);
    set(L.sh, -2.6, 0.4); set(R.sh, -2.4, -0.4); set(L.el, -0.3); set(R.el, -0.3);
    lean += 0.1;
  } else if (mode === 'slide') {
    set(L.hip, -1.5, 0.1); set(R.hip, -1.25, -0.1); set(L.kn, 0.25); set(R.kn, 0.7);
    set(L.sh, 0.9, 0.6); set(R.sh, 0.9, -0.6); set(L.el, -0.3); set(R.el, -0.3);
    lean = -0.9; bob = -0.42; h.head.rotation.x = 0.45;
  } else if (mode === 'sit') {
    set(L.hip, -1.45, 0.12); set(R.hip, -1.45, -0.12); set(L.kn, 1.45); set(R.kn, 1.45);
    set(L.sh, -1.2, 0.2); set(R.sh, -1.2, -0.2); set(L.el, -0.2); set(R.el, -0.2); lean += 0.25;
  } else if (mode === 'wave') {
    set(L.hip, 0); set(R.hip, 0); set(L.kn, 0); set(R.kn, 0);
    set(L.sh, 0.05, 0.2); set(R.sh, Math.PI, -0.35 + Math.sin(p * 3) * 0.35); set(L.el, -0.1); set(R.el, -0.4);
    bob = Math.sin(p) * 0.01;
  } else if (mode === 'carry') {
    set(L.hip, s * 0.4); set(R.hip, -s * 0.4); set(L.kn, Math.max(0, -s) * 0.4); set(R.kn, Math.max(0, s) * 0.4);
    set(L.sh, -2.9, 0.3); set(R.sh, -2.9, -0.3); set(L.el, -0.4); set(R.el, -0.4); bob = Math.abs(c) * 0.03;
  } else { // idle
    set(L.hip, 0); set(R.hip, 0); set(L.kn, 0.02); set(R.kn, 0.02);
    set(L.sh, Math.sin(p) * 0.05, 0.2); set(R.sh, -Math.sin(p) * 0.05, -0.2); set(L.el, -0.15); set(R.el, -0.15);
    bob = Math.sin(p) * 0.012; h.head.rotation.y = Math.sin(p * 0.37) * 0.35;
  }
  // keep the feet roughly flat to the ground
  if (L.ft) { set(L.ft, -(L.hip.rotation.x + L.kn.rotation.x) * 0.6); set(R.ft, -(R.hip.rotation.x + R.kn.rotation.x) * 0.6); }
  const ty = H0 + bob * bs;
  if (k === 1) { h.spine.rotation.x = lean; h.hips.position.y = ty; } else { h.spine.rotation.x += (lean - h.spine.rotation.x) * k; h.hips.position.y += (ty - h.hips.position.y) * k; }
  if (dt > 0) updateFace(h, dt);
}

// skinned → static geometry in root space (used by the baked flip-book crowd)
const _sp = new V3(), _sn = new V3(), _bm4 = new THREE.Matrix4(), _acc = new THREE.Matrix4(), _si = new THREE.Vector4(), _sw = new THREE.Vector4();
export function bakeSkinned(mesh, inv, texAvg) {
  const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color, CM = g.attributes.cmat, idx = g.index.array;
  const sk = mesh.skeleton; sk.bones.forEach(b => b.updateMatrixWorld(true));
  const mats = sk.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
  const nv = P.count, vp = new Float32Array(nv * 3), vn = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    _si.fromBufferAttribute(g.attributes.skinIndex, i); _sw.fromBufferAttribute(g.attributes.skinWeight, i);
    const e = _acc.elements; e.fill(0);
    for (let k = 0; k < 4; k++) { const w = _sw.getComponent(k); if (!w) continue; const m = mats[_si.getComponent(k)].elements; for (let j = 0; j < 16; j++) e[j] += m[j] * w; }
    _bm4.multiplyMatrices(inv, _acc);
    _sp.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(_bm4); vp[i * 3] = _sp.x; vp[i * 3 + 1] = _sp.y; vp[i * 3 + 2] = _sp.z;
    _sn.fromBufferAttribute(N, i).transformDirection(_bm4); vn[i * 3] = _sn.x; vn[i * 3 + 1] = _sn.y; vn[i * 3 + 2] = _sn.z;
  }
  // per-vertex texture tint for textured groups
  const tint = new Float32Array(nv * 3).fill(1);
  if (Array.isArray(mesh.material)) for (const gr of g.groups) { const m = mesh.material[gr.materialIndex]; if (!m.map) continue; const t = texAvg(m.map); for (let k = gr.start; k < gr.start + gr.count; k++) { const v = idx[k]; tint[v * 3] = t.r; tint[v * 3 + 1] = t.g; tint[v * 3 + 2] = t.b; } }
  const n = idx.length, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), cm = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) { const v = idx[k]; for (let j = 0; j < 3; j++) { pos[k * 3 + j] = vp[v * 3 + j]; nor[k * 3 + j] = vn[v * 3 + j]; col[k * 3 + j] = Cc.array[v * 3 + j] * tint[v * 3 + j]; } cm[k * 2] = CM.array[v * 2]; cm[k * 2 + 1] = CM.array[v * 2 + 1]; }
  return { pos, nor, col, cm, n };
}
