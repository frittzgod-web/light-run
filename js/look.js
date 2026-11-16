// Character creator data: option lists, defaults, presets and conversion to makeHuman options.
import { SKIN_TONES, HAIR_COLS, ANKARA_NAMES, ANKARA_SWATCH, PLAYER_OUTFITS, SHOP_OUTFITS, SKINS } from './toon.js';

export const LOOK_KEY = 'lr3d_look';
export const CLOTH_COLS = ['#ffffff', '#111111', '#e53935', '#c62828', '#fb8c00', '#fdd835', '#43a047', '#008751', '#00897b', '#1e88e5', '#1a237e', '#5e35b1', '#8e24aa', '#d81b60', '#f48fb1', '#795548', '#f3e5ab', '#9e9e9e'];
export const OPT = {
  gender: [['m', '👦🏾 Boy'], ['f', '👧🏾 Girl']],
  body: [['slim', 'Slim'], ['regular', 'Regular'], ['broad', 'Broad']],
  eyes: [['round', 'Round'], ['almond', 'Almond'], ['big', 'Bright'], ['sleepy', 'Chill']],
  brows: [['soft', 'Soft'], ['arched', 'Arched'], ['thick', 'Bold'], ['straight', 'Straight'], ['worried', 'Kind']],
  smile: [['smile', 'Smile'], ['grin', 'Big grin'], ['calm', 'Calm'], ['open', 'Excited']],
  hair: [['lowcut', 'Low cut'], ['afro', 'Afro'], ['puff', 'Afro puff'], ['braids', 'Braids'], ['cornrows', 'Cornrows'], ['bantu', 'Bantu knots'], ['locs', 'Locs'], ['bun', 'Bun']],
  head: [['none', 'No hat'], ['cap', 'Fila cap'], ['beret', 'Beret'], ['gele', 'Gele', 'f']],
  top: [['tee', 'T-shirt'], ['kaftan', 'Kaftan'], ['ankara', 'Ankara'], ['striped', 'Striped']],
  bottom: [['trousers', 'Trousers'], ['jeans', 'Jeans'], ['shorts', 'Shorts'], ['skirt', 'Skirt', 'f'], ['long', 'Long skirt', 'f'], ['ankaraSkirt', 'Ankara wrapper', 'f']],
  shoes: [['sneakers', 'Sneakers'], ['sandals', 'Sandals'], ['boots', 'Boots'], ['plain', 'Shoes']],
  acc: [['glasses', '👓 Glasses'], ['wristband', '🟡 Wristband'], ['bible', '📖 Bible in hand'], ['backpack', '🎒 Backpack']],
};
export { SKIN_TONES, HAIR_COLS, ANKARA_NAMES, ANKARA_SWATCH };
const pick = a => a[Math.floor(Math.random() * a.length)];
export function defaultLook(g = 'm') {
  return g === 'f'
    ? { gender: 'f', body: 'regular', skin: SKIN_TONES[5], eyes: 'round', brows: 'soft', smile: 'smile', hair: 'braids', hairColor: HAIR_COLS[0], head: 'none', headColor: '#ffd23f', top: 'tee', topColor: '#ffffff', topColor2: '#008751', pattern: 1, bottom: 'long', bottomColor: '#ffffff', shoes: 'plain', shoeColor: '#c62828', acc: {}, accColor: '#ffd23f' }
    : { gender: 'm', body: 'regular', skin: SKIN_TONES[5], eyes: 'round', brows: 'soft', smile: 'smile', hair: 'lowcut', hairColor: HAIR_COLS[0], head: 'none', headColor: '#0d47a1', top: 'kaftan', topColor: '#ffffff', topColor2: '#008751', pattern: 0, bottom: 'trousers', bottomColor: '#ffffff', shoes: 'plain', shoeColor: '#5d4037', acc: {}, accColor: '#ffd23f' };
}
export const allowed = (k, v, g) => { const o = (OPT[k] || []).find(x => x[0] === v); return !o || !o[2] || o[2] === g; };
export function fixLook(l) {
  const d = defaultLook(l.gender); const o = { ...d, ...l, acc: { ...(l.acc || {}) } };
  for (const k of ['head', 'bottom']) if (!allowed(k, o[k], o.gender)) o[k] = d[k];
  return o;
}
export function randomLook2(g) {
  g = g || pick(['m', 'f']);
  const opts = k => OPT[k].filter(x => !x[2] || x[2] === g).map(x => x[0]);
  const l = { gender: g, body: pick(opts('body')), skin: pick(SKIN_TONES), eyes: pick(opts('eyes')), brows: pick(opts('brows')), smile: pick(opts('smile')),
    hair: pick(opts('hair')), hairColor: Math.random() < 0.65 ? HAIR_COLS[0] : pick(HAIR_COLS), head: Math.random() < 0.6 ? 'none' : pick(opts('head')), headColor: pick(CLOTH_COLS),
    top: pick(opts('top')), topColor: pick(CLOTH_COLS), topColor2: pick(CLOTH_COLS), pattern: Math.floor(Math.random() * 10),
    bottom: pick(opts('bottom')), bottomColor: pick(CLOTH_COLS), shoes: pick(opts('shoes')), shoeColor: pick(CLOTH_COLS), acc: {}, accColor: pick(CLOTH_COLS) };
  for (const [k] of OPT.acc) if (Math.random() < 0.3) l.acc[k] = true;
  return l;
}
// Old outfit presets (base 3 + shop) -> creator fields
export function presetFields(of) {
  const f = { top: of.topTex != null ? 'ankara' : of.trim ? 'kaftan' : 'tee', topColor: of.top, topColor2: of.trim || '#008751', pattern: of.topTex ?? 0,
    head: of.head || 'none', headColor: of.headColor || '#0d47a1', shoeColor: of.shoe || '#3e2723' };
  if (of.skirt) { f.bottom = of.skirt === 'tex' ? 'ankaraSkirt' : of.long ? 'long' : 'skirt'; if (of.skirt !== 'tex') f.bottomColor = of.skirt; }
  else { f.bottom = 'trousers'; f.bottomColor = of.bottom || of.top; }
  if (of.hair && of.hair !== 'short') f.hair = of.hair;
  return f;
}
export function presetsFor(g) {
  return [...PLAYER_OUTFITS[g].map((o, i) => ({ id: 'base' + i, name: o.label, of: o, price: 0 })), ...SHOP_OUTFITS.map(o => ({ id: o.id, name: o[g].label, of: o[g], shop: true }))];
}
export function legacyLook(sv, ownedFn) {
  const g = sv.gender || 'm', list = presetsFor(g), p = list[sv.outfit] && (!list[sv.outfit].shop || ownedFn(list[sv.outfit].id)) ? list[sv.outfit] : list[0];
  const l = { ...defaultLook(g), ...presetFields(p.of), skin: SKINS[(sv.skin ?? 1) % SKINS.length], preset: p.id };
  return l;
}
// creator look -> makeHuman options
export function toHuman(l) {
  l = fixLook(l);
  const skirt = l.bottom === 'skirt' || l.bottom === 'long' || l.bottom === 'ankaraSkirt';
  return {
    gender: l.gender, skin: l.skin, body: l.body, eyes: l.eyes, brows: l.brows, smile: l.smile, hair: l.hair, hairColor: l.hairColor,
    head: l.head === 'none' ? null : l.head, headColor: l.headColor,
    top: l.topColor, topTex: l.top === 'ankara' ? l.pattern : null, topStripe: l.top === 'striped' ? l.topColor2 : null, trim: l.top === 'kaftan' ? l.topColor2 : null,
    bottom: skirt ? null : (l.bottom === 'jeans' ? (l.bottomColor === '#ffffff' ? '#3b5b9a' : l.bottomColor) : l.bottomColor), shorts: l.bottom === 'shorts', jeans: l.bottom === 'jeans',
    skirt: skirt ? (l.bottom === 'ankaraSkirt' ? 'tex' : l.bottomColor) : null, skirtTex: l.pattern, long: l.bottom === 'long' || l.bottom === 'ankaraSkirt',
    shoe: l.shoeColor, shoeStyle: l.shoes, acc: l.acc || {}, accColor: l.accColor, kid: false, old: false,
  };
}
