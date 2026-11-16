// v12: GLB vehicles from the 3D Artist (assets/vehicles/*.glb), prepared once into toon-shaded protos.
// props.js danfo()/okada() use these when ready and fall back to the code-built models otherwise.
import { THREE, VC, outline } from './toon.js';

const params = new URLSearchParams(location.search);
export const MODELS = { ready: false, err: null, ms: 0 };
let TIER = 'med';
export function setVehTier(t) { TIER = t; }
export const vehTier = () => TIER;
const LOD_DIST = 55;     // metres from the camera before switching to the LOD1 mesh

// decals keep their atlas map + alpha cutoff, but as a toon material so they light like the body
function decalMat(src) {
  return new THREE.MeshToonMaterial({ map: src.map, alphaTest: src.alphaTest || 0.5, vertexColors: true, gradientMap: VC.gradientMap, side: src.side });
}
// copy an attribute into float RGB/XYZ (COLOR_0 arrives as normalized Uint8 RGBA)
function f32(attr, size) {
  const n = attr.count, out = new Float32Array(n * size);
  for (let i = 0; i < n; i++) { out[i * size] = attr.getX(i); out[i * size + 1] = attr.getY(i); out[i * size + 2] = attr.getZ(i); }
  return new THREE.BufferAttribute(out, size);
}
// flatten meshes (in the root's space) into one non-indexed position/normal/color geometry
function bake(meshes, root, recolor) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), parts = []; let n = 0;
  for (const m of meshes) {
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', f32(g.attributes.position, 3)); ng.setAttribute('normal', f32(g.attributes.normal, 3));
    ng.setAttribute('color', f32(g.attributes.color, 3));
    ng.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    parts.push(ng); n += ng.attributes.position.count; g.dispose();
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  if (recolor) recolor(col);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingBox(); geo.computeBoundingSphere(); return geo;
}
// okada colour variety: remap the red bodywork (linear ~0.68 / ~0.39 red, near-zero g/b) to another paint
const PAINT = { red: null, blue: [0.02, 0.12, 0.62], green: [0.03, 0.36, 0.06], black: [0.035, 0.035, 0.04] };
const repaint = rgb => col => { for (let i = 0; i < col.length; i += 3) { const r = col[i], g = col[i + 1], b = col[i + 2]; if (r > 0.3 && r < 0.75 && g < 0.06 && b < 0.06) { const k = r / 0.68; col[i] = rgb[0] * k; col[i + 1] = rgb[1] * k; col[i + 2] = rgb[2] * k; } } };

// the rider's eyes show through the gap between helmet rim and head when seen from behind (how players see okadas),
// so drop the tiny near-black eye triangles on the head; the face is never seen in play
function dropEyes(geo) {
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, c = geo.attributes.color.array, keep = [];
  for (let t = 0; t < p.length / 9; t++) { let eye = true; for (let k = 0; k < 3; k++) { const i = t * 9 + k * 3; if (p[i + 1] < 1.7 || c[i] + c[i + 1] + c[i + 2] > 0.02) eye = false; } if (!eye) keep.push(t); }
  if (keep.length * 9 === p.length) return geo;
  const out = [new Float32Array(keep.length * 9), new Float32Array(keep.length * 9), new Float32Array(keep.length * 9)];
  keep.forEach((t, j) => { out[0].set(p.subarray(t * 9, t * 9 + 9), j * 9); out[1].set(n.subarray(t * 9, t * 9 + 9), j * 9); out[2].set(c.subarray(t * 9, t * 9 + 9), j * 9); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out[0], 3)); g.setAttribute('normal', new THREE.BufferAttribute(out[1], 3)); g.setAttribute('color', new THREE.BufferAttribute(out[2], 3));
  g.computeBoundingBox(); g.computeBoundingSphere(); geo.dispose(); MODELS.eyesDropped = (MODELS.eyesDropped || 0) + (p.length / 9 - keep.length); return g;
}
function prep(scene, kind) {
  const root = scene, byName = n => root.getObjectByName(n), meshesOf = o => { const a = []; o && o.traverse(c => { if (c.isMesh) a.push(c); }); return a; };
  const wheelNames = kind === 'danfo' ? ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'] : ['wheel_F', 'wheel_R'];
  const body = meshesOf(byName(kind + '_body')), dec = meshesOf(byName(kind + '_decals'))[0], rider = byName('rider');
  const P = { kind, wheels: [], paints: {} };
  for (const [paint, rgb] of Object.entries(kind === 'okada' ? PAINT : { red: null })) {
    const rc = rgb && repaint(rgb);
    P.paints[paint] = { body: bake(body, root, rc), bodyAll: bake([...body, ...wheelNames.flatMap(n => meshesOf(byName(n)))], root, rc) };
  }
  for (const n of wheelNames) { const w = byName(n); const g = bake(meshesOf(w), w); P.wheels.push({ name: n, geo: g, pos: w.position.clone() }); }
  if (dec) { dec.updateMatrixWorld(true); const g = dec.geometry.clone(); g.applyMatrix4(dec.matrixWorld); P.decal = { geo: g, mat: decalMat(dec.material) }; }
  if (rider) P.rider = dropEyes(bake(meshesOf(rider), root));
  return P;
}

function level(P, paint, spin, th, lod) {
  const g = new THREE.Group(), pp = P.paints[paint] || P.paints.red;
  const body = new THREE.Mesh(spin ? pp.body : pp.bodyAll, VC); body.castShadow = true; body.receiveShadow = true; body.name = P.kind + '_body';
  if (th) outline(body, th); g.add(body);
  const wheels = [];
  if (spin) for (const w of P.wheels) { const m = new THREE.Mesh(w.geo, VC); m.position.copy(w.pos); m.name = w.name; m.castShadow = true; g.add(m); wheels.push(m); }
  if (P.decal && !lod) { const d = new THREE.Mesh(P.decal.geo, P.decal.mat); d.name = P.kind + '_decals'; d.castShadow = false; d.receiveShadow = false; d.userData.noShadow = true; g.add(d); }
  if (P.rider) { const r = new THREE.Mesh(P.rider, VC); r.name = 'rider'; r.castShadow = true; g.add(r); }
  return { g, wheels };
}
// build a vehicle: LOD0 near (spinning wheels on High), LOD1 far (merged, no lettering)
export function vehicleGLB(kind, opts = {}) {
  const P0 = MODELS[kind], P1 = MODELS[kind + '_lod1'];
  const lowTier = TIER === 'low' || params.has('lite');
  const paint = opts.paint || 'red', th = opts.outline ?? (kind === 'danfo' ? 0.05 : 0.035), spin = TIER === 'high' && !opts.static;
  const g = new THREE.Group(); g.name = kind; g.userData.glb = true;
  let wheels = [];
  if (lowTier || opts.lod1) { const L = level(P1, paint, false, th, true); g.add(L.g); }
  else {
    const lod = new THREE.LOD(), A = level(P0, paint, spin, th, false), B = level(P1, paint, false, th, true);
    lod.addLevel(A.g, 0); lod.addLevel(B.g, LOD_DIST); g.add(lod); wheels = A.wheels; g.userData.lod = lod;
  }
  g.userData.wheels = wheels; g.userData.wheelR = kind === 'danfo' ? 0.5 : 0.4;
  return g;
}
// hide / show the okada rider on every LOD level
export function setRider(g, on) { g.traverse(o => { if (o.name === 'rider') o.visible = on; }); }

async function load() {
  if (params.has('procveh')) throw new Error('procveh');
  const t0 = performance.now();
  const { GLTFLoader } = await import('../assets/vendor/three-addons/loaders/GLTFLoader.js');
  const L = new GLTFLoader(), names = ['danfo', 'danfo_lod1', 'okada', 'okada_lod1'];
  const scenes = await Promise.all(names.map(n => L.loadAsync(new URL(`../assets/vehicles/${n}.glb`, import.meta.url).href).then(r => r.scene)));
  names.forEach((n, i) => { MODELS[n] = prep(scenes[i], n.replace('_lod1', '')); });
  MODELS.ready = true; MODELS.ms = Math.round(performance.now() - t0);
}
// top-level await (with a timeout) so the first scene is built with the GLBs; any failure keeps the code-built vehicles
export const vehiclesReady = Promise.race([load(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))])
  .catch(e => { MODELS.err = String(e && e.message || e); if (MODELS.err !== 'procveh') console.warn('GLB vehicles unavailable, using built-in models:', MODELS.err); });
await vehiclesReady;
