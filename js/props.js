// Props, vehicles and scenery built from merged toon geometry
import { THREE, P, G, merge, mergedMesh, VC, outline, toon, signTex, signMesh, makeHuman, randomLook, poseHuman, bakedHuman } from './toon.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

export function danfo() {
  const Y = '#ffc400', K = '#141414', W = '#2c4a6e';
  const parts = [
    P(G.box, Y, 0, 1.2, 0, 0, 0, 0, 2.1, 1.55, 4.6),
    P(G.box, '#e0a800', 0, 0.55, 0, 0, 0, 0, 2.12, 0.3, 4.62),
    P(G.box, K, 0, 1.0, 0, 0, 0, 0, 2.14, 0.14, 4.64), P(G.box, K, 0, 1.32, 0, 0, 0, 0, 2.14, 0.1, 4.64),
    P(G.box, W, 0, 1.62, -0.1, 0, 0, 0, 2.16, 0.5, 3.6),
    P(G.box, W, 0, 1.6, 2.31, 0, 0, 0, 1.7, 0.5, 0.04), P(G.box, W, 0, 1.55, -2.25, -0.25, 0, 0, 1.8, 0.65, 0.1),
    P(G.box, '#fff2a8', 0, 1.99, 0, 0, 0, 0, 2.0, 0.05, 4.4),
    P(G.box, '#555', 0, 2.08, 0.2, 0, 0, 0, 1.8, 0.08, 3.0),
    P(G.box, '#c62828', 0.4, 2.3, 0.5, 0, 0.2, 0, 0.7, 0.4, 0.8), P(G.box, '#1565c0', -0.4, 2.27, -0.4, 0, -0.1, 0, 0.8, 0.35, 0.7), P(G.sph, '#6d4c41', 0, 2.3, 1.2, 0, 0, 0, 0.7, 0.45, 0.6),
    P(G.box, K, 0, 0.5, 2.36, 0, 0, 0, 2.15, 0.28, 0.16), P(G.box, K, 0, 0.5, -2.36, 0, 0, 0, 2.15, 0.28, 0.16),
    P(G.box, '#ff1744', 0.85, 0.85, 2.32, 0, 0, 0, 0.3, 0.2, 0.06), P(G.box, '#ff1744', -0.85, 0.85, 2.32, 0, 0, 0, 0.3, 0.2, 0.06),
    P(G.box, '#fffde7', 0.8, 0.85, -2.32, 0, 0, 0, 0.35, 0.22, 0.06), P(G.box, '#fffde7', -0.8, 0.85, -2.32, 0, 0, 0, 0.35, 0.22, 0.06),
  ];
  // side window pillars, roof-rack rails, mirrors, bumper chrome and rust trims
  for (const x of [1.085, -1.085]) for (let z = -1.6; z <= 1.7; z += 0.82) parts.push(P(G.box, K, x, 1.62, z, 0, 0, 0, 0.03, 0.52, 0.09));
  for (const x of [0.88, -0.88]) parts.push(P(G.box, '#3a3a3a', x, 2.18, 0.2, 0, 0, 0, 0.06, 0.12, 3.6));
  for (let z = -1.2; z <= 1.6; z += 0.7) parts.push(P(G.box, '#3a3a3a', 0, 2.2, z, 0, 0, 0, 1.82, 0.05, 0.06));
  parts.push(P(G.box, K, 1.2, 1.55, -2.0, 0, 0, 0, 0.08, 0.3, 0.06), P(G.box, K, -1.2, 1.55, -2.0, 0, 0, 0, 0.08, 0.3, 0.06));
  parts.push(P(G.box, '#cfd8dc', 0, 0.62, 2.45, 0, 0, 0, 2.0, 0.06, 0.06));
  for (const [x, y, z, w, h] of [[0.95, 0.75, 1.9, 0.02, 0.25], [-1.06, 0.8, -0.6, 0.02, 0.2], [1.06, 0.72, 0.4, 0.02, 0.18], [0.5, 0.42, 2.37, 0.5, 0.12]]) parts.push(P(G.box, '#8d5524', x + Math.sign(x) * 0.01, y, z, 0, 0, 0, w || 0.02, h, x === 0.5 ? 0.02 : 0.4));
  for (const [x, z] of [[1, 1.5], [-1, 1.5], [1, -1.5], [-1, -1.5]]) { parts.push(P(G.wheel, K, x, 0.45, z, 0, 0, 0, 0.32, 0.9, 0.9)); parts.push(P(G.wheel, '#bdbdbd', x * 1.06, 0.45, z, 0, 0, 0, 0.1, 0.45, 0.45)); parts.push(P(G.box, '#e0a800', x * 1.02, 0.95, z, 0, 0, 0, 0.12, 0.12, 1.15)); }
  const g = new THREE.Group(); const m = mergedMesh(parts, 0.05); g.add(m);
  const plate = signMesh(signTex('LAGOS', pick(['KJA 246 XY', 'EKY 316 AA', 'LND 777 KJ', 'IKD 120 BB']), '#ffffff', '#0a6b3c', 256, 96, true), 0.62, 0.24);
  plate.position.set(0, 0.62, 2.48); g.add(plate);
  const txt = signMesh(signTex(pick(['NO KING AS GOD', 'GOD DEY', 'NO TELEPHONE TO HEAVEN', 'JESUS IS LORD', 'SMALL STOUT', 'EKO O NI BAJE']), '', '#ffc400', '#111', 512, 96, false), 1.7, 0.32);
  txt.position.set(0, 1.12, 2.335); g.add(txt);
  g.userData = { len: 4.6, exhaust: [0.6, 0.45, 2.4] };
  return g;
}
export function truck() {
  const cab = pick(['#ef6c00', '#c62828', '#2e7d32', '#1565c0']), box = pick(['#1e88e5', '#43a047', '#e53935', '#fdd835', '#8e24aa']);
  const K = '#141414';
  const parts = [
    P(G.box, cab, 0, 1.55, -3.0, 0, 0, 0, 2.4, 2.1, 1.9), P(G.box, '#2c4a6e', 0, 2.0, -3.96, 0, 0, 0, 2.0, 0.8, 0.05),
    P(G.box, '#ffffff', 0, 2.62, -3.0, 0, 0, 0, 2.2, 0.08, 1.7),
    P(G.box, box, 0, 2.0, 1.0, 0, 0, 0, 2.5, 2.8, 5.8), P(G.box, '#b0bec5', 0, 3.42, 1.0, 0, 0, 0, 2.4, 0.06, 5.6),
    P(G.box, '#333', 0, 0.7, 0, 0, 0, 0, 2.2, 0.35, 7.6),
  ];
  for (let i = 0; i < 6; i++) parts.push(P(G.box, new THREE.Color(box).multiplyScalar(0.8).getStyle(), 0, 2.0, -1.6 + i * 1.05, 0, 0, 0, 2.56, 2.7, 0.12));
  parts.push(P(G.box, '#555', 0, 2.0, 3.92, 0, 0, 0, 2.3, 2.5, 0.06), P(G.box, '#ff1744', 0.95, 0.8, 3.95, 0, 0, 0, 0.3, 0.2, 0.06), P(G.box, '#ff1744', -0.95, 0.8, 3.95, 0, 0, 0, 0.3, 0.2, 0.06));
  for (const z of [-3.0, 1.6, 2.9]) for (const x of [1.1, -1.1]) parts.push(P(G.wheel, K, x, 0.5, z, 0, 0, 0, 0.4, 1.0, 1.0));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.06));
  g.userData = { len: 8, exhaust: [0.9, 3.0, -2.2] };
  return g;
}
export function okada() {
  const K = '#141414', body = pick(['#c62828', '#1565c0', '#2e7d32', '#212121']);
  const parts = [
    P(G.wheel, K, 0, 0.42, -0.85, 0, 0, 0, 0.16, 0.84, 0.84), P(G.wheel, K, 0, 0.42, 0.85, 0, 0, 0, 0.18, 0.84, 0.84),
    P(G.box, body, 0, 0.8, -0.15, 0.1, 0, 0, 0.42, 0.4, 0.9), P(G.box, K, 0, 0.98, 0.45, 0, 0, 0, 0.36, 0.14, 0.9),
    P(G.box, '#9e9e9e', 0, 0.75, -0.75, -0.35, 0, 0, 0.08, 0.8, 0.08), P(G.box, '#333', 0, 1.2, -0.85, 0, 0, 0, 0.9, 0.06, 0.06),
    P(G.box, '#fffde7', 0, 1.0, -0.98, 0, 0, 0, 0.22, 0.18, 0.06), P(G.box, '#9e9e9e', 0.2, 0.5, 0.6, 0, 0, 0, 0.08, 0.08, 0.7),
  ];
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.035));
  const rider = makeHuman(randomLook({ gender: 'm', cap: true }), false); poseHuman(rider, 'sit', 0);
  rider.root.rotation.y = Math.PI; rider.root.position.set(0, 0.15 + 0.8 - rider.hipY, 0.2); g.add(rider.root);
  g.userData = { len: 2.2, exhaust: [0.2, 0.5, 1.0], rider };
  return g;
}
export function cones() {
  const parts = [];
  for (const x of [-0.95, 0.95]) {
    parts.push(P(G.box, '#ff6d00', x, 0.04, 0, 0, 0, 0, 0.6, 0.08, 0.6), P(G.cone, '#ff6d00', x, 0.45, 0, 0, 0, 0, 0.45, 0.85, 0.45), P(G.cyl, '#ffffff', x, 0.48, 0, 0, 0, 0, 0.32, 0.12, 0.32));
  }
  parts.push(P(G.box, '#ffffff', 0, 0.62, 0, 0, 0, 0, 1.9, 0.18, 0.08));
  for (let i = -2; i <= 2; i++) parts.push(P(G.box, '#e53935', i * 0.38, 0.62, 0.045, 0, 0, 0.6, 0.12, 0.2, 0.02));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.03)); g.userData = { len: 0.9 }; return g;
}
export function pothole() {
  const parts = [
    P(G.cyl, '#6b6b6b', 0, 0.012, 0, 0, 0, 0, 2.3, 0.02, 1.7), P(G.cyl, '#1b1b1f', 0, 0.02, 0, 0, 0, 0, 2.0, 0.02, 1.4),
    P(G.cyl, '#4f7fb0', 0.15, 0.03, 0.05, 0, 0, 0, 1.2, 0.02, 0.75), P(G.cyl, '#9fd0ff', 0.35, 0.035, -0.05, 0, 0, 0, 0.35, 0.02, 0.18),
    P(G.box, '#8a7a66', -0.9, 0.03, 0.5, 0, 0.4, 0, 0.3, 0.06, 0.2), P(G.box, '#8a7a66', 0.95, 0.03, -0.4, 0, 0.8, 0, 0.25, 0.06, 0.18),
  ];
  const m = new THREE.Mesh(merge(parts), VC); m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); g.userData = { len: 1.6 }; return g;
}
export function hawker() {
  const h = makeHuman({ ...randomLook({ gender: Math.random() < 0.6 ? 'f' : 'm' }), head: null, hair: pick(['short', 'cornrows', 'lowcut']) }, false);
  const g = new THREE.Group(); g.add(h.root);
  const goods = pick([['#d7a65a', '#c08a3e'], ['#ff9800', '#fb8c00'], ['#e53935', '#43a047']]);
  const parts = [P(G.cyl, '#bcaaa4', 0, 0, 0, 0, 0, 0, 1.1, 0.1, 1.1)];
  for (let i = 0; i < 7; i++) parts.push(P(G.sphLo, goods[i % 2], Math.cos(i) * 0.3, 0.12 + (i === 6 ? 0.12 : 0), Math.sin(i) * 0.3, 0, 0, 0, 0.3, 0.24, 0.3));
  const tray = mergedMesh(parts, 0.02, false); tray.position.y = h.topY - 0.02; g.add(tray);
  g.userData = { len: 0.9, human: h };
  return g;
}
const COCO = new THREE.SphereGeometry(0.5, 6, 4);   // low-poly coconuts (x70 palms adds up)
export function palmGeo() {
  const parts = []; let x = 0, y = 0; const lean = rnd(-0.12, 0.12);
  for (let i = 0; i < 6; i++) { parts.push(P(G.cyl6, i % 2 ? '#8d6e4a' : '#a1805a', x, y + 0.6, 0, 0, 0, lean, 0.42 - i * 0.03, 1.25, 0.42 - i * 0.03)); y += 1.15; x -= lean * 1.15; }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    parts.push(P(G.cone, i % 2 ? '#2e9e3e' : '#43c24f', x + Math.cos(a) * 1.25, y + 0.1, Math.sin(a) * 1.25, Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25, 0.55, 3.0, 0.14));
  }
  for (let i = 0; i < 3; i++) parts.push(P(COCO, '#6d4c2f', x + Math.cos(i * 2) * 0.3, y - 0.25, Math.sin(i * 2) * 0.3, 0, 0, 0, 0.36, 0.36, 0.36));
  return merge(parts);
}
export function treeGeo() {
  const parts = [P(G.cyl6, '#7a5230', 0, 1.2, 0, 0, 0, 0, 0.5, 2.4, 0.5)];
  const c = ['#3faa3f', '#58c447', '#2f8f34'];
  parts.push(P(G.ico, c[0], 0, 3.4, 0, 0, 0, 0, 3.2, 2.7, 3.2), P(G.ico, c[1], 0.8, 4.2, 0.3, 0, 0, 0, 2.2, 2, 2.2), P(G.ico, c[2], -0.9, 3.0, -0.5, 0, 0, 0, 2.2, 1.8, 2.2));
  return merge(parts);
}
const SHOPS = ['JESUS IS LORD STORES', 'MAMA PUT BUKA', 'ALHAJA FABRICS', 'GOD\'S GRACE PHARMACY', 'BLESSED CHILD VULCANIZER', 'NO WEAPON PHONES', 'MERCY LAND SUPERMARKET', 'DIVINE FAVOUR BAKERY', 'EBENEZER BOOKSHOP', 'JEHOVAH JIREH POS', 'OLUWASEUN ELECTRICALS', 'SHALOM HAIR SALON'];
export function building() {
  const w = rnd(7, 11), h = rnd(4, 7.5), d = rnd(5, 7);
  const wall = pick(['#ffe082', '#80deea', '#f48fb1', '#a5d6a7', '#ffcc80', '#ce93d8', '#fff59d', '#90caf9']);
  const roof = pick(['#b5532a', '#1e6fbf', '#2e7d32', '#8d6e63', '#c62828']);
  const parts = [
    P(G.box, wall, 0, h / 2, 0, 0, 0, 0, w, h, d),
    P(G.box, roof, 0, h + 0.4, 0.3, -0.12, 0, 0, w + 0.8, 0.25, d + 1.2),
    P(G.box, '#5d4037', 0, 1.1, d / 2 + 0.01, 0, 0, 0, 1.4, 2.2, 0.06),
    P(G.box, pick(['#e53935', '#1e88e5', '#43a047', '#fb8c00']), 0, 2.55, d / 2 + 0.6, 0.25, 0, 0, w * 0.9, 0.1, 1.4),
  ];
  const floors = Math.floor(h / 2.6);
  for (let f = 0; f < floors; f++) for (let i = -1; i <= 1; i += 2) {
    const wy = 1.5 + f * 2.4 + (f === 0 ? 0.3 : 0.6);
    parts.push(P(G.box, '#ffffff', i * w * 0.3, wy, d / 2 + 0.02, 0, 0, 0, 1.6, 1.2, 0.05), P(G.box, '#2c5a86', i * w * 0.3, wy, d / 2 + 0.05, 0, 0, 0, 1.3, 0.95, 0.05));
  }
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.06, false));
  const s = signMesh(signTex(pick(SHOPS), '', pick(['#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00']), '#fff', 512, 96), Math.min(w * 0.9, 7), 1.0);
  s.position.set(0, Math.min(h - 0.6, 3.6), d / 2 + 0.08); g.add(s);
  return g;
}
const ADS = [['HOLY GHOST SERVICE', 'FIRST FRIDAY · REDEMPTION CITY KM 46', '#4a148c'], ['JESUS IS LORD', 'OVER LAGOS', '#c62828'], ['NAIJA NOODLES', 'SWEET LIKE MAMA\'S POT', '#ef6c00'],
  ['GBAM! NETWORK', 'CALL HOME FOR LESS', '#00897b'], ['WELCOME TO OGUN STATE', 'GATEWAY STATE', '#1565c0'], ['DRIVE SAFELY', 'ARRIVE ALIVE · FRSC', '#2e7d32'],
  ['SUPER MALT', 'ENERGY FOR THE JOURNEY', '#5d4037'], ['LET YOUR LIGHT SHINE', 'MATTHEW 5:16', '#f9a825']];
export function billboard() {
  const ad = pick(ADS);
  const parts = [P(G.box, '#9e9e9e', -2.6, 3, 0, 0, 0, 0, 0.35, 6, 0.35), P(G.box, '#9e9e9e', 2.6, 3, 0, 0, 0, 0, 0.35, 6, 0.35), P(G.box, '#424242', 0, 7.6, -0.12, 0, 0, 0, 8.4, 3.6, 0.2)];
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.05, false));
  const s = signMesh(signTex(ad[0], ad[1], ad[2], '#fff', 512, 220), 8, 3.4); s.position.set(0, 7.6, 0.0); g.add(s);
  return g;
}
export function stall() {
  const c1 = pick(['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa']), c2 = '#ffffff';
  const parts = [P(G.box, '#8d6e63', 0, 0.5, 0, 0, 0, 0, 2.4, 1, 1.4), P(G.cyl6, '#9e9e9e', 0, 1.5, 0, 0, 0, 0, 0.08, 3, 0.08),
    P(G.cone, c1, 0, 3.1, 0, 0, 0, 0, 3.6, 0.9, 3.6), P(G.cone, c2, 0, 3.14, 0, 0, Math.PI / 10, 0, 3.3, 0.8, 3.3), P(G.cone, c1, 0, 3.2, 0, 0, 0, 0, 2.2, 0.55, 2.2)];
  const gc = pick([['#ff9800', '#ffb74d'], ['#e53935', '#43a047'], ['#fdd835', '#8d6e63']]);
  for (let i = 0; i < 9; i++) parts.push(P(G.sphLo, gc[i % 2], -0.8 + (i % 3) * 0.8, 1.15 + Math.floor(i / 3) * 0.05, -0.35 + Math.floor(i / 3) * 0.35, 0, 0, 0, 0.4, 0.35, 0.4));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.04, false)); return g;
}
export function streetLightGeo() {
  return merge([P(G.cyl6, '#8a8f99', 0, 4, 0, 0, 0, 0, 0.22, 8, 0.22), P(G.box, '#8a8f99', 1.2, 7.9, 0, 0, 0, 0, 2.6, 0.15, 0.15), P(G.box, '#8a8f99', -1.2, 7.9, 0, 0, 0, 0, 2.6, 0.15, 0.15),
    P(G.box, '#fff59d', 2.4, 7.75, 0, 0, 0, 0, 0.8, 0.18, 0.4), P(G.box, '#fff59d', -2.4, 7.75, 0, 0, 0, 0, 0.8, 0.18, 0.4)]);
}
// Pedestrian bridge spanning the expressway, with a stop sign
export function bridge() {
  const C = '#cfd8dc', B = '#1e88e5', parts = [];
  const x0 = -21, x1 = 10, y = 6.6;
  parts.push(P(G.box, C, (x0 + x1) / 2, y, 0, 0, 0, 0, x1 - x0, 0.5, 3));
  parts.push(P(G.box, B, (x0 + x1) / 2, y + 0.9, 1.45, 0, 0, 0, x1 - x0, 0.12, 0.12), P(G.box, B, (x0 + x1) / 2, y + 0.9, -1.45, 0, 0, 0, x1 - x0, 0.12, 0.12));
  for (let x = x0; x <= x1; x += 1.5) { parts.push(P(G.box, B, x, y + 0.5, 1.45, 0, 0, 0, 0.08, 0.8, 0.08), P(G.box, B, x, y + 0.5, -1.45, 0, 0, 0, 0.08, 0.8, 0.08)); }
  for (const x of [x0 + 1, -6.4, x1 - 1]) parts.push(P(G.box, C, x, y / 2, 0, 0, 0, 0, 0.9, y, 0.9));
  for (const [sx, dir] of [[x1, 1], [x0, -1]]) {
    for (let i = 0; i < 12; i++) parts.push(P(G.box, C, sx + dir * (0.8 + i * 0.5), y - i * 0.55, -2.3, 0, 0, 0, 0.55, 0.3, 1.6));
    parts.push(P(G.box, C, sx + dir * 3.8, y / 2 - 0.5, -2.3, 0, 0, 0, 0.6, y - 1, 0.6));
  }
  // bus shelter on the right
  parts.push(P(G.box, '#ffffff', 8.5, 2.6, 4.5, 0, 0, 0, 4, 0.15, 2.2), P(G.box, '#9e9e9e', 7, 1.3, 4.5, 0, 0, 0, 0.12, 2.6, 0.12), P(G.box, '#9e9e9e', 10, 1.3, 4.5, 0, 0, 0, 0.12, 2.6, 0.12), P(G.box, '#ffb300', 8.5, 0.5, 5.2, 0, 0, 0, 3.4, 0.12, 0.5));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.06, false));
  const sign = signMesh(signTex('OJOTA', 'BUS STOP'), 9, 2.4); sign.position.set(0, y + 1.6, 1.6); g.add(sign);
  const back = new THREE.Mesh(new THREE.BoxGeometry(9.3, 2.7, 0.15), toon('#0a6b3c')); back.position.set(0, y + 1.6, 1.5); g.add(back);
  g.userData.sign = sign;
  return g;
}
export function setBridgeSign(g, name, sub, final) {
  g.userData.sign.material.map = signTex(name.toUpperCase(), sub, final ? '#6a1b9a' : '#0a6b3c'); g.userData.sign.material.needsUpdate = true;
}
export function gateArch(w = 24, title = 'REDEMPTION CITY', sub = 'KM 46 · WELCOME, PILGRIM!') {
  const parts = [];
  for (const x of [-w / 2, w / 2]) { parts.push(P(G.box, '#ffffff', x, 4.5, 0, 0, 0, 0, 1.6, 9, 1.6), P(G.box, '#6a1b9a', x, 9.3, 0, 0, 0, 0, 2.1, 0.8, 2.1), P(G.box, '#6a1b9a', x, 0.4, 0, 0, 0, 0, 2.1, 0.8, 2.1)); }
  parts.push(P(G.box, '#6a1b9a', 0, 10.2, 0, 0, 0, 0, w + 2.4, 2.6, 1.2), P(G.box, '#ffd23f', 0, 11.6, 0, 0, 0, 0, w + 2.6, 0.3, 1.3));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.07, false));
  const s = signMesh(signTex(title, sub, '#6a1b9a', '#ffd23f', 1024, 160), w + 1.6, 2.3); s.position.set(0, 10.2, 0.62); g.add(s);
  const s2 = s.clone(); s2.rotation.y = Math.PI; s2.position.z = -0.62; g.add(s2);
  return g;
}
export function lanternMesh(kind = 'hurricane') {
  const g = new THREE.Group(); let core;
  if (kind === 'star') {
    const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.07 : 0.16, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); geo.translate(0, 0, -0.03);
    core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe066 })); core.position.y = 0.06; g.add(core);
    g.add(mergedMesh([P(new THREE.TorusGeometry(0.05, 0.012, 4, 8), '#ffb300', 0, 0.26, 0)], 0.01, false));
  } else if (kind === 'dove') {
    const parts = [P(G.sphLo, '#ffffff', 0, 0.07, 0, 0, 0, 0, 0.16, 0.13, 0.24), P(G.sphLo, '#ffffff', 0, 0.13, 0.11, 0, 0, 0, 0.1, 0.1, 0.1), P(G.cone, '#ffb300', 0, 0.13, 0.17, Math.PI / 2, 0, 0, 0.04, 0.06, 0.04),
      P(G.box, '#ffffff', 0.13, 0.1, -0.02, 0, 0, 0.5, 0.2, 0.02, 0.14), P(G.box, '#ffffff', -0.13, 0.1, -0.02, 0, 0, -0.5, 0.2, 0.02, 0.14), P(G.box, '#ffffff', 0, 0.06, -0.15, 0.3, 0, 0, 0.1, 0.02, 0.1),
      P(new THREE.TorusGeometry(0.05, 0.012, 4, 8), '#ffd23f', 0, 0.26, 0)];
    g.add(mergedMesh(parts, 0.012, false));
    core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6b0 })); core.position.y = -0.04; g.add(core);
  } else if (kind === 'flame') {
    const parts = [P(G.cyl6, '#5d4037', 0, -0.04, 0, 0, 0, 0, 0.08, 0.16, 0.08), P(G.cyl6, '#8d6e63', 0, 0.05, 0, 0, 0, 0, 0.14, 0.04, 0.14), P(new THREE.TorusGeometry(0.05, 0.012, 4, 8), '#ffb300', 0, 0.3, 0)];
    g.add(mergedMesh(parts, 0.012, false));
    core = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0xff8a1e })); core.position.y = 0.16; g.add(core);
    const in2 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xfff176 })); in2.position.y = 0.13; g.add(in2);
  } else {
    const parts = [P(G.cyl6, '#ffb300', 0, 0.16, 0, 0, 0, 0, 0.2, 0.05, 0.2), P(G.cyl6, '#ffb300', 0, -0.02, 0, 0, 0, 0, 0.22, 0.05, 0.22), P(new THREE.TorusGeometry(0.06, 0.012, 4, 8), '#ffb300', 0, 0.22, 0)];
    for (const [x, z] of [[0.08, 0.08], [-0.08, 0.08], [0.08, -0.08], [-0.08, -0.08]]) parts.push(P(G.box, '#ffb300', x, 0.07, z, 0, 0, 0, 0.02, 0.18, 0.02));
    g.add(mergedMesh(parts, 0.012, false));
    core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6b0 })); core.position.y = 0.07; g.add(core);
  }
  g.userData.core = core;
  return g;
}
// ---- journey props: ramps, rails, barriers, beams, cattle, flyover ----
const STRIPE = new Map();
function stripeTex(a, b) { const k = a + b; if (!STRIPE.has(k)) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = a; x.fillRect(0, 0, 64, 64); x.fillStyle = b; for (let i = -64; i < 128; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 11, 0); x.lineTo(i - 53, 64); x.lineTo(i - 64, 64); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; STRIPE.set(k, t); } return STRIPE.get(k); }
// A plank ramp leading up to height H over length L (rising toward -z, i.e. toward the vehicle in front)
export function rampMesh(L, H, w = 2.1, col = '#ffb300') {
  const g = new THREE.Group();
  const len = Math.hypot(L, H), ang = Math.atan2(H, L);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, len), toon('#ffffff', { map: stripeTex(col, '#212121') }));
  plank.material.map.repeat.set(2, len / 2); plank.rotation.x = ang; plank.position.set(0, H / 2, L / 2); plank.castShadow = true; outline(plank, 0.03); g.add(plank);
  const legs = mergedMesh([P(G.box, '#5d4037', w / 2 - 0.12, H / 2, 0.5, 0, 0, 0, 0.14, H, 0.14), P(G.box, '#5d4037', -w / 2 + 0.12, H / 2, 0.5, 0, 0, 0, 0.14, H, 0.14), P(G.box, '#5d4037', 0, H * 0.25, L * 0.5, 0, 0, 0, w - 0.3, 0.1, 0.1)], 0.02, false);
  g.add(legs);
  return g;
}
export function okadaRamp() {
  const g = new THREE.Group(); const r = rampMesh(3.2, 1.1, 2.2, '#e53935'); g.add(r);
  const o = okada(); o.position.set(1.7, 0, -0.6); o.rotation.y = 0.5; o.scale.setScalar(0.85); g.add(o);
  return g;
}
export function railMesh(len) {
  const parts = [P(G.box, '#ffd23f', 0, 0.8, 0, 0, 0, 0, 0.5, 0.12, len), P(G.box, '#cfd8dc', 0, 0.64, 0, 0, 0, 0, 0.62, 0.22, len), P(G.box, '#90a4ae', 0, 0.5, 0, 0, 0, 0, 0.14, 0.1, len)];
  for (let z = -len / 2 + 0.6; z < len / 2; z += 2.4) parts.push(P(G.box, '#455a64', 0, 0.28, z, 0, 0, 0, 0.2, 0.56, 0.2), P(G.box, '#e53935', 0, 0.66, z, 0, 0, 0, 0.64, 0.24, 0.3));
  // sloped lead-in at the near end (+z) so you can run straight onto it
  parts.push(P(G.box, '#ffd23f', 0, 0.42, len / 2 + 1.1, Math.atan2(0.8, 2.2), 0, 0, 0.5, 0.12, 2.4));
  return mergedMesh(parts, 0.03, true);
}
export function barMesh() {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.45, 0.25), toon('#ffffff', { map: stripeTex('#ffffff', '#e53935') })); bar.material.map.repeat.set(3, 1); bar.position.y = 1.55; bar.castShadow = true; outline(bar, 0.03); g.add(bar);
  g.add(mergedMesh([P(G.box, '#455a64', 1.3, 0.85, 0, 0, 0, 0, 0.14, 1.7, 0.14), P(G.box, '#455a64', -1.3, 0.85, 0, 0, 0, 0, 0.14, 1.7, 0.14), P(G.box, '#263238', 1.3, 0.04, 0, 0, 0, 0, 0.6, 0.08, 0.5), P(G.box, '#263238', -1.3, 0.04, 0, 0, 0, 0, 0.6, 0.08, 0.5)], 0.03, true));
  const s = signMesh(signTex('SLIDE!', '', '#ffd23f', '#111', 256, 80, true), 1.1, 0.34); s.position.set(0, 1.55, 0.14); g.add(s);
  g.userData.bar = bar;
  return g;
}
export function lowSign() {
  const g = new THREE.Group();
  g.add(mergedMesh([P(G.box, '#37474f', 1.35, 1.6, 0, 0, 0, 0, 0.12, 3.2, 0.12), P(G.box, '#37474f', -1.35, 1.6, 0, 0, 0, 0, 0.12, 3.2, 0.12), P(G.box, '#37474f', 0, 3.15, 0, 0, 0, 0, 2.8, 0.1, 0.1)], 0.03, true));
  const s = signMesh(signTex(pick(['GO SLOW', 'DIVERSION', 'MARKET DAY', 'LOW ROOF']), 'DUCK!', '#ff7043', '#fff', 256, 120, true), 2.5, 1.15); s.position.set(0, 1.85, 0.07); g.add(s);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.25, 0.1), toon('#bf360c')); back.position.set(0, 1.85, 0); g.add(back);
  return g;
}
// Pedestrian-bridge girder low across all three lanes: you must slide
export function beamMesh() {
  const g = new THREE.Group();
  const girder = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.75, 0.6), toon('#ffffff', { map: stripeTex('#ffd23f', '#212121') })); girder.material.map.repeat.set(10, 1); girder.position.y = 1.55; girder.castShadow = true; outline(girder, 0.04); g.add(girder);
  const parts = [P(G.box, '#90a4ae', 0, 6.4, 0, 0, 0, 0, 16, 0.5, 2.8), P(G.box, '#1e88e5', 0, 7.2, 1.35, 0, 0, 0, 16, 0.1, 0.1), P(G.box, '#1e88e5', 0, 7.2, -1.35, 0, 0, 0, 16, 0.1, 0.1)];
  for (const x of [-6.8, 6.8]) parts.push(P(G.box, '#90a4ae', x, 3.2, 0, 0, 0, 0, 0.7, 6.4, 0.7));
  for (let x = -6; x <= 6; x += 3) parts.push(P(G.box, '#78909c', x, 4.0, 0, 0, 0, 0, 0.18, 4.6, 0.18));
  g.add(mergedMesh(parts, 0.05, false));
  return g;
}
export function cow() {
  const c = pick(['#f5f5f5', '#efe6d8', '#8d5a3b', '#e0d0b8']), d = '#3e2723';
  const parts = [P(G.sph, c, 0, 1.15, 0, 0, 0, 0, 0.95, 0.85, 1.9), P(G.sph, c, 0, 1.45, -0.55, 0, 0, 0, 0.7, 0.55, 0.6),
    P(G.sph, c, 0, 1.3, -1.15, 0.3, 0, 0, 0.45, 0.5, 0.7), P(G.sphLo, '#d7a99a', 0, 1.15, -1.45, 0, 0, 0, 0.36, 0.3, 0.3),
    P(G.cone, '#eeeeee', 0.35, 1.7, -1.1, 0, 0, -1.0, 0.12, 0.8, 0.12), P(G.cone, '#eeeeee', -0.35, 1.7, -1.1, 0, 0, 1.0, 0.12, 0.8, 0.12),
    P(G.sphLo, d, 0.13, 1.45, -1.38, 0, 0, 0, 0.07, 0.07, 0.05), P(G.sphLo, d, -0.13, 1.45, -1.38, 0, 0, 0, 0.07, 0.07, 0.05),
    P(G.cyl6, d, 0, 1.0, 0.95, 0.5, 0, 0, 0.05, 0.7, 0.05)];
  for (const [x, z] of [[0.28, 0.6], [-0.28, 0.6], [0.28, -0.6], [-0.28, -0.6]]) parts.push(P(G.cyl6, c, x, 0.4, z, 0, 0, 0, 0.18, 0.8, 0.18), P(G.box, d, x, 0.04, z, 0, 0, 0, 0.2, 0.08, 0.2));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.04, false)); return g;
}
export function herder() {
  // baked into one mesh (staff included): 1 draw call instead of ~14
  return bakedHuman({ ...randomLook({ gender: 'm', cap: true }), top: pick(['#fff8e1', '#90caf9', '#a1887f']), topTex: null, headColor: '#c62828' }, 'idle', 1, h => {
    const staff = mergedMesh([P(G.cyl6, '#6d4c41', 0, 0.9, 0, 0, 0, 0.12, 0.06, 2.1, 0.06)], 0, false); staff.scale.y = 0.85; staff.position.set(0.36, 0, 0.18); h.root.add(staff);
  });
}
// Ojota-style flyover crossing the expressway
export function flyover() {
  const parts = [P(G.box, '#cfd8dc', 0, 8.2, 0, 0, 0, 0, 90, 1.0, 9), P(G.box, '#eceff1', 0, 8.9, 4.4, 0, 0, 0, 90, 0.6, 0.3), P(G.box, '#eceff1', 0, 8.9, -4.4, 0, 0, 0, 90, 0.6, 0.3), P(G.box, '#ffd23f', 0, 7.65, 4.55, 0, 0, 0, 90, 0.12, 0.08)];
  for (const x of [-30, -19, -7.2, 7.2, 19, 30]) parts.push(P(G.box, '#b0bec5', x, 3.9, 0, 0, 0, 0, 1.4, 7.8, 2.2), P(G.box, '#b0bec5', x, 7.5, 0, 0, 0, 0, 2.6, 0.6, 7));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.07, false));
  const s = signMesh(signTex('OJOTA INTERCHANGE', 'IKORODU RD · LAGOS–IBADAN EXPY', '#0a6b3c'), 9, 2); s.position.set(0, 10.4, 0.2); g.add(s);
  const back = new THREE.Mesh(new THREE.BoxGeometry(9.3, 2.3, 0.15), toon('#0a6b3c')); back.position.set(0, 10.4, 0.05); g.add(back);
  for (let i = 0; i < 5; i++) { const v = pick([danfo, danfo, truck])(); v.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1); v.position.set(-38 + i * 17, 8.7, (i % 2 ? 2 : -2)); v.scale.setScalar(0.9); g.add(v); }
  return g;
}
export function textSprite(txt, size = 1.2) {
  const t = signTex(txt, '', 'rgba(0,0,0,0)', '#fff', 128, 128, false);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(size, size, 1); s.renderOrder = 10; return s;
}
// small roadside props for variety: recharge-card kiosk, vulcaniser tyre stack, overhead water tank, generator
export function roadProp(k = pick(['kiosk', 'tyres', 'tank', 'gen'])) {
  const parts = [];
  if (k === 'kiosk') {
    const c = pick(['#ffcc00', '#e53935', '#1e88e5']);
    parts.push(P(G.box, c, 0, 1.15, 0, 0, 0, 0, 1.6, 2.3, 1.3), P(G.box, '#fafafa', 0, 2.4, 0, 0, 0, 0, 1.9, 0.18, 1.6), P(G.box, '#3e2723', 0, 1.1, 0.66, 0, 0, 0, 1.2, 0.7, 0.04),
      P(G.box, '#ffffff', 0, 1.9, 0.66, 0, 0, 0, 1.3, 0.35, 0.03), P(G.box, '#555', 0, 0.75, 0.7, 0, 0, 0, 1.5, 0.08, 0.3));
  } else if (k === 'tyres') {
    const tyre = new THREE.TorusGeometry(0.42, 0.17, 6, 14);
    for (let i = 0; i < 4; i++) parts.push(P(tyre, '#1c1c1c', rnd(-0.05, 0.05), 0.17 + i * 0.32, 0, Math.PI / 2, 0, 0));
    parts.push(P(tyre, '#262626', 1.0, 0.58, 0.2, 0, 0.3, 0), P(G.box, '#c62828', -0.9, 1.0, 0, 0, 0, 0, 0.08, 2.0, 0.08), P(G.box, '#ffeb3b', -0.9, 1.9, 0.2, 0, 0, 0, 0.06, 0.4, 0.5));
  } else if (k === 'tank') {
    for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) parts.push(P(G.box, '#78909c', x, 1.6, z, 0, 0, 0, 0.12, 3.2, 0.12));
    parts.push(P(G.box, '#90a4ae', 0, 3.2, 0, 0, 0, 0, 1.7, 0.12, 1.7), P(G.cyl, '#1565c0', 0, 4.0, 0, 0, 0, 0, 1.5, 1.5, 1.5), P(G.cyl, '#0d47a1', 0, 4.8, 0, 0, 0, 0, 0.5, 0.15, 0.5), P(G.box, '#cfd8dc', 0.8, 1.6, 0, 0, 0, 0, 0.08, 3.2, 0.08));
  } else {
    parts.push(P(G.box, '#c62828', 0, 0.55, 0, 0, 0, 0, 1.3, 0.8, 0.8), P(G.box, '#222', 0, 0.12, 0, 0, 0, 0, 1.4, 0.1, 0.9), P(G.box, '#424242', 0.45, 0.62, 0.41, 0, 0, 0, 0.3, 0.4, 0.02),
      P(G.cyl6, '#9e9e9e', -0.5, 1.05, 0, 0, 0, 0, 0.1, 0.25, 0.1), P(G.box, '#ffeb3b', -0.2, 0.75, 0.41, 0, 0, 0, 0.35, 0.16, 0.02));
  }
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.035, false)); return g;
}
