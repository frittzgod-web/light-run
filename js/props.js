// Props, vehicles and scenery built from merged toon geometry
import { THREE, P, G, merge, mergedMesh, VC, outline, toon, signTex, signMesh, makeHuman, randomLook, poseHuman } from './toon.js';

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
    P(G.box, box, 0, 2.0, 1.0, 0, 0, 0, 2.5, 2.8, 5.8), P(G.box, '#ffffff', 0, 3.42, 1.0, 0, 0, 0, 2.4, 0.06, 5.6),
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
  rider.root.rotation.y = Math.PI; rider.root.position.set(0, 0.15, 0.2); g.add(rider.root);
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
  const h = makeHuman(randomLook({ gender: Math.random() < 0.6 ? 'f' : 'm' }), false);
  h.o.head = null;
  const g = new THREE.Group(); g.add(h.root);
  const goods = pick([['#d7a65a', '#c08a3e'], ['#ff9800', '#fb8c00'], ['#e53935', '#43a047']]);
  const parts = [P(G.cyl, '#bcaaa4', 0, 0, 0, 0, 0, 0, 1.1, 0.1, 1.1)];
  for (let i = 0; i < 7; i++) parts.push(P(G.sphLo, goods[i % 2], Math.cos(i) * 0.3, 0.12 + (i === 6 ? 0.12 : 0), Math.sin(i) * 0.3, 0, 0, 0, 0.3, 0.24, 0.3));
  const tray = mergedMesh(parts, 0.02, false); tray.position.y = 2.32; g.add(tray);
  g.userData = { len: 0.9, human: h };
  return g;
}
export function palmGeo() {
  const parts = []; let x = 0, y = 0; const lean = rnd(-0.12, 0.12);
  for (let i = 0; i < 6; i++) { parts.push(P(G.cyl6, i % 2 ? '#8d6e4a' : '#a1805a', x, y + 0.6, 0, 0, 0, lean, 0.42 - i * 0.03, 1.25, 0.42 - i * 0.03)); y += 1.15; x -= lean * 1.15; }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    parts.push(P(G.cone, i % 2 ? '#2e9e3e' : '#43c24f', x + Math.cos(a) * 1.25, y + 0.1, Math.sin(a) * 1.25, Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25, 0.55, 3.0, 0.14));
  }
  for (let i = 0; i < 3; i++) parts.push(P(G.sphLo, '#6d4c2f', x + Math.cos(i * 2) * 0.3, y - 0.25, Math.sin(i * 2) * 0.3, 0, 0, 0, 0.36, 0.36, 0.36));
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
export function lanternMesh() {
  const parts = [P(G.cyl6, '#ffb300', 0, 0.16, 0, 0, 0, 0, 0.2, 0.05, 0.2), P(G.cyl6, '#ffb300', 0, -0.02, 0, 0, 0, 0, 0.22, 0.05, 0.22), P(new THREE.TorusGeometry(0.06, 0.012, 4, 8), '#ffb300', 0, 0.22, 0)];
  for (const [x, z] of [[0.08, 0.08], [-0.08, 0.08], [0.08, -0.08], [-0.08, -0.08]]) parts.push(P(G.box, '#ffb300', x, 0.07, z, 0, 0, 0, 0.02, 0.18, 0.02));
  const g = new THREE.Group(); g.add(mergedMesh(parts, 0.012, false));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6b0 })); core.position.y = 0.07; g.add(core);
  return g;
}
export function textSprite(txt, size = 1.2) {
  const t = signTex(txt, '', 'rgba(0,0,0,0)', '#fff', 128, 128, false);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(size, size, 1); s.renderOrder = 10; return s;
}
