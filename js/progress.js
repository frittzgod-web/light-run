// v12 progression: XP + levels + rank ladder, 3 rolling missions, achievements/badges, Bible hero cards,
// reward chests, a weekly challenge and the 7-day streak calendar. Healthy by design: no real money, no pay-to-win,
// rewards are light (soft currency), cosmetics and Bible cards. Everything is stored on the phone.
import { earn, weekKey, streak, streakReward, todayKey } from './meta.js';

const KEY = 'lr3d_prog';
const J = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
let P = Object.assign({ xp: 0, lvl: 1, stats: {}, missions: [], mDone: 0, ach: {}, cards: {}, chests: 0, opened: 0, week: null, seen: {} }, J() || {});
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
const listeners = [];
export const on = f => listeners.push(f);
const emit = (type, data) => listeners.forEach(f => { try { f(type, data); } catch (e) {} });

/* ---------- XP, levels and ranks ---------- */
export const RANKS = [[1, 'Pilgrim', '🥾'], [3, 'Seeker', '🔦'], [6, 'Disciple', '📖'], [10, 'Servant', '🤲🏾'], [14, 'Steward', '🗝️'], [19, 'Evangelist', '📣'], [25, 'Shepherd', '🐑'], [32, 'Elder', '🌿'], [40, 'Ambassador', '👑']];
export const xpFor = l => 120 + (l - 1) * 70;              // XP needed to go from level l to l+1
export function rankOf(l = P.lvl) { let r = RANKS[0]; for (const x of RANKS) if (l >= x[0]) r = x; return { name: r[1], icon: r[2], at: r[0], next: RANKS.find(x => x[0] > l) || null }; }
export function level() { return { lvl: P.lvl, xp: P.xp, need: xpFor(P.lvl), rank: rankOf() }; }
export function addXP(n) {
  n = Math.round(n); if (n <= 0) return; P.xp += n; let ups = 0;
  while (P.xp >= xpFor(P.lvl)) { P.xp -= xpFor(P.lvl); P.lvl++; ups++; P.chests++; const r = rankOf(); emit('level', { lvl: P.lvl, rank: r, newRank: r.at === P.lvl }); }
  if (ups) checkAch(); save();
}
const XPW = { km: 10, gates: 15, bookq: 15, help: 30, vision: 100, scrolls: 5, roofs: 6, nearmiss: 2, vboss: 60, storm: 60, goslow: 60, market: 60, fever: 25, slides: 2, grindM: 0.2, orbs: 0.2, camp: 200, wings: 10, fire: 8 };

/* ---------- missions: always 3 active; a finished one pays out and a new one slides in ---------- */
export const MISSIONS = [
  { id: 'm_gates8', t: 'Run through 8 right answer gates', stat: 'gates', n: 8, xp: 80, r: 60 },
  { id: 'm_roofs6', t: 'Run across 6 danfo roofs', stat: 'roofs', n: 6, xp: 70, r: 60 },
  { id: 'm_km15', t: 'Run 15 km', stat: 'km', n: 15, xp: 80, r: 60 },
  { id: 'm_km40', t: 'Run 40 km', stat: 'km', n: 40, xp: 150, r: 120 },
  { id: 'm_vision1', t: 'Complete a Bible vision', stat: 'vision', n: 1, xp: 90, r: 80 },
  { id: 'm_vision3', t: 'Complete 3 Bible visions', stat: 'vision', n: 3, xp: 200, r: 150 },
  { id: 'm_bookq6', t: 'Answer 6 Bible-book questions right', stat: 'bookq', n: 6, xp: 90, r: 70 },
  { id: 'm_near15', t: 'Make 15 near misses', stat: 'nearmiss', n: 15, xp: 70, r: 50 },
  { id: 'm_fever2', t: 'Trigger Fever mode twice', stat: 'fever', n: 2, xp: 90, r: 70 },
  { id: 'm_scroll8', t: 'Collect 8 verse scrolls', stat: 'scrolls', n: 8, xp: 70, r: 60 },
  { id: 'm_help3', t: 'Help 3 pilgrims', stat: 'help', n: 3, xp: 100, r: 80 },
  { id: 'm_slide15', t: 'Slide under 15 barriers', stat: 'slides', n: 15, xp: 60, r: 50 },
  { id: 'm_grind400', t: 'Grind 400 m along the rails', stat: 'grindM', n: 400, xp: 80, r: 60 },
  { id: 'm_orbs500', t: 'Collect 500 light orbs', stat: 'orbs', n: 500, xp: 80, r: 60 },
  { id: 'm_storm', t: 'Survive the Long Bridge storm', stat: 'storm', n: 1, xp: 90, r: 80 },
  { id: 'm_goslow', t: 'Beat the Ibafo go-slow', stat: 'goslow', n: 1, xp: 110, r: 90 },
  { id: 'm_vboss2', t: 'Beat 2 vision bosses', stat: 'vboss', n: 2, xp: 120, r: 90 },
  { id: 'm_combo50', t: 'Reach a 50 combo', stat: 'comboMax', n: 50, xp: 100, r: 80, max: true },
  { id: 'm_wings2', t: 'Fly with the angel wings twice', stat: 'wings', n: 2, xp: 60, r: 50 },
  { id: 'm_fire3', t: 'Catch Holy Ghost Fire 3 times', stat: 'fire', n: 3, xp: 70, r: 50 },
];
function refill() {
  const have = new Set(P.missions.map(m => m.id)); let guard = 0;
  while (P.missions.length < 3 && guard++ < 50) {
    const pool = MISSIONS.filter(m => !have.has(m.id) && m.id !== P.lastM), m = pool[(P.mDone * 7 + P.missions.length * 3 + guard) % pool.length];
    P.missions.push({ id: m.id, p: 0 }); have.add(m.id);
  }
}
refill(); save();
export const missions = () => P.missions.map(x => ({ ...MISSIONS.find(m => m.id === x.id), p: x.p }));

/* ---------- achievements / badges ---------- */
export const ACH = [
  { id: 'a_first', t: 'First steps', d: 'Start your first journey', icon: '👣', test: s => s.runs >= 1 },
  { id: 'a_bridge', t: 'Bridge crosser', d: 'Survive the Long Bridge storm', icon: '🌉', test: s => s.storm >= 1 },
  { id: 'a_camp', t: 'Made it to camp', d: 'Reach Redemption City', icon: '⛺', test: s => s.camp >= 1 },
  { id: 'a_vision', t: 'Seer', d: 'Complete a Bible vision', icon: '👁️', test: s => s.vision >= 1 },
  { id: 'a_vision10', t: 'Visionary', d: 'Complete 10 Bible visions', icon: '🌈', test: s => s.vision >= 10 },
  { id: 'a_gates50', t: 'Gatekeeper', d: '50 right answer gates', icon: '🚪', test: s => s.gates >= 50 },
  { id: 'a_gates200', t: 'Bible scholar', d: '200 right answer gates', icon: '🎓', test: s => s.gates >= 200 },
  { id: 'a_roofs25', t: 'Roof runner', d: 'Run across 25 danfo roofs', icon: '🚐', test: s => s.roofs >= 25 },
  { id: 'a_fever', t: 'On fire', d: 'Trigger Fever mode', icon: '🔥', test: s => s.fever >= 1 },
  { id: 'a_combo100', t: 'Hallelujah!', d: 'Reach a 100 combo', icon: '💯', test: s => s.comboMax >= 100 },
  { id: 'a_help10', t: 'Good Samaritan', d: 'Help 10 pilgrims', icon: '🤝🏾', test: s => s.help >= 10 },
  { id: 'a_km100', t: 'Marathon pilgrim', d: 'Run 100 km in total', icon: '🏃🏾', test: s => s.km >= 100 },
  { id: 'a_streak7', t: 'Faithful week', d: 'A 7-day streak', icon: '📅', test: () => streak().best >= 7 },
  { id: 'a_lvl10', t: 'Servant', d: 'Reach level 10', icon: '⭐', test: () => P.lvl >= 10 },
  { id: 'a_set', t: 'Collector', d: 'Complete a Bible card set', icon: '🃏', test: () => SETS.some(st => st.cards.every(c => P.cards[c.id])) },
  { id: 'a_week', t: 'Weekly champion', d: 'Finish a weekly challenge', icon: '🏅', test: s => s.weekly >= 1 },
];
function checkAch() {
  for (const a of ACH) if (!P.ach[a.id] && a.test(P.stats)) { P.ach[a.id] = Date.now(); P.chests++; emit('ach', a); }
}
export const achievements = () => ACH.map(a => ({ ...a, got: !!P.ach[a.id] }));

/* ---------- Bible hero cards (from chests) ---------- */
export const SETS = [
  { id: 'genesis', name: 'Genesis', cards: [['Adam', '🌳', 'c', 'Genesis 2:7'], ['Eve', '🍎', 'c', 'Genesis 3:20'], ['Noah', '🚢', 'r', 'Genesis 6:9'], ['Abraham', '⭐', 'r', 'Genesis 15:6'], ['Sarah', '👶🏾', 'c', 'Genesis 21:2'], ['Joseph', '🧥', 'e', 'Genesis 50:20']] },
  { id: 'exodus', name: 'Exodus', cards: [['Moses', '🪄', 'e', 'Exodus 14:21'], ['Miriam', '🪘', 'r', 'Exodus 15:20'], ['Aaron', '🔔', 'c', 'Exodus 4:14'], ['Jethro', '⛺', 'c', 'Exodus 18:17'], ['Joshua', '⚔️', 'r', 'Exodus 17:13'], ['Bezaleel', '🛠️', 'c', 'Exodus 31:2']] },
  { id: 'leviticus', name: 'Leviticus', cards: [['The High Priest', '🧑🏾‍🦳', 'r', 'Leviticus 16:32'], ['The Lampstand', '🪔', 'c', 'Leviticus 24:2'], ['The Altar', '🔥', 'c', 'Leviticus 6:13'], ['Day of Atonement', '🕊️', 'e', 'Leviticus 16:30'], ['The Jubilee', '🎺', 'r', 'Leviticus 25:10'], ['Love thy neighbour', '💛', 'e', 'Leviticus 19:18']] },
].map(s => ({ ...s, cards: s.cards.map(([n, i, r, ref]) => ({ id: s.id + ':' + n, name: n, icon: i, rar: r, ref, set: s.id })) }));
const ALLCARDS = SETS.flatMap(s => s.cards), RW = { c: 6, r: 3, e: 1 };
export const cards = () => SETS.map(s => ({ ...s, cards: s.cards.map(c => ({ ...c, n: P.cards[c.id] || 0 })), done: s.cards.every(c => P.cards[c.id]) }));
function drawCard() { let t = Math.random() * ALLCARDS.reduce((a, c) => a + RW[c.rar] * (P.cards[c.id] ? 0.6 : 1.4), 0); for (const c of ALLCARDS) { t -= RW[c.rar] * (P.cards[c.id] ? 0.6 : 1.4); if (t <= 0) return c; } return ALLCARDS[0]; }

/* ---------- chests ---------- */
export const chests = () => P.chests;
export function giveChest(n = 1, why = '') { P.chests += n; save(); emit('chest', { n, why }); }
export function openChest() {
  if (P.chests <= 0) return null;
  P.chests--; P.opened++;
  const c = drawCard(), dup = !!P.cards[c.id]; P.cards[c.id] = (P.cards[c.id] || 0) + 1;
  const light = 40 + Math.round(Math.random() * 6) * 10 + (dup ? 40 : 0), xp = 25;
  earn(light); P.xp += 0; save(); addXP(xp);
  const set = SETS.find(s => s.id === c.set), setDone = set.cards.every(k => P.cards[k.id]) && !P.seen['set_' + set.id];
  if (setDone) { P.seen['set_' + set.id] = 1; earn(300); }
  checkAch(); save();
  return { card: c, dup, light: light + (setDone ? 300 : 0), xp, setDone: setDone ? set.name : null };
}

/* ---------- weekly challenge (same for everyone this week; seeded by the ISO week) ---------- */
export const WEEKLY = [
  { id: 'w_gates', t: 'Gate Week: run through 60 right answer gates', stat: 'gates', n: 60 },
  { id: 'w_roofs', t: 'Roof Runner Week: cross 40 danfo roofs', stat: 'roofs', n: 40 },
  { id: 'w_vision', t: 'Vision Week: complete 6 Bible visions', stat: 'vision', n: 6 },
  { id: 'w_km', t: 'Pilgrim Week: run 120 km', stat: 'km', n: 120 },
  { id: 'w_fever', t: 'Fever Week: trigger Fever mode 8 times', stat: 'fever', n: 8 },
  { id: 'w_help', t: 'Samaritan Week: help 10 pilgrims', stat: 'help', n: 10 },
];
function weekState() {
  const wk = weekKey(); if (!P.week || P.week.key !== wk) { let h = 0; for (const ch of wk) h = (h * 31 + ch.charCodeAt(0)) >>> 0; P.week = { key: wk, id: WEEKLY[h % WEEKLY.length].id, p: 0, done: false }; save(); }
  return P.week;
}
export function weekly() { const w = weekState(), d = WEEKLY.find(x => x.id === w.id); return { ...d, p: w.p, done: w.done, key: w.key }; }

/* ---------- tracking: called by the game for every stat event ---------- */
export function track(stat, v = 1, mode = 'add') {
  const s = P.stats; s[stat] = mode === 'max' ? Math.max(s[stat] || 0, v) : (s[stat] || 0) + v;
  if (stat === 'combo') { s.comboMax = Math.max(s.comboMax || 0, v); stat = 'comboMax'; v = s.comboMax; mode = 'max'; }
  if (XPW[stat] && mode !== 'max') addXP(XPW[stat] * v);
  for (const x of P.missions) { const m = MISSIONS.find(k => k.id === x.id); if (!m || m.stat !== stat) continue; x.p = m.max || mode === 'max' ? Math.max(x.p, v) : x.p + v; }
  const done = P.missions.filter(x => { const m = MISSIONS.find(k => k.id === x.id); return m && x.p >= m.n; });
  for (const x of done) { const m = MISSIONS.find(k => k.id === x.id); P.missions = P.missions.filter(y => y !== x); P.mDone++; P.lastM = m.id; earn(m.r); addXP(m.xp); if (P.mDone % 3 === 0) P.chests++; emit('mission', m); }
  if (done.length) refill();
  const w = weekState(), wd = WEEKLY.find(x => x.id === w.id);
  if (!w.done && wd.stat === stat && mode !== 'max') { w.p += v; if (w.p >= wd.n) { w.done = true; s.weekly = (s.weekly || 0) + 1; P.chests += 2; earn(500); addXP(300); emit('weekly', wd); } }
  checkAch(); save();
}
export const stats = () => ({ ...P.stats });

/* ---------- 7-day streak calendar (rewards come from meta.markPlayed) ---------- */
export function calendar() {
  const s = streak(), today = todayKey(), playedToday = s.last === today, n = s.n || 0;
  const cycleStart = playedToday ? Math.floor((n - 1) / 7) * 7 : Math.floor(n / 7) * 7;   // keep the current week of the streak in view
  return Array.from({ length: 7 }, (_, i) => { const d = cycleStart + i + 1; return { day: d, reward: streakReward(d), chest: d % 7 === 0, got: d <= n && (playedToday || d <= n), today: playedToday ? d === n : d === n + 1 }; });
}
// day-7 streak days also drop a chest
export function streakChest(n) { if (n && n % 7 === 0) giveChest(1, '7-day streak'); }

/* ---------- run summary for the "one more run" screen ---------- */
let runStart = null;
export function runBegin() { runStart = { xp: P.xp, lvl: P.lvl, total: totalXP() }; }
function totalXP() { let t = P.xp; for (let l = 1; l < P.lvl; l++) t += xpFor(l); return t; }
export function runSummary() { const g = runStart ? totalXP() - runStart.total : 0; return { gained: g, lvl: P.lvl, ups: runStart ? P.lvl - runStart.lvl : 0, xp: P.xp, need: xpFor(P.lvl), rank: rankOf(), chests: P.chests, missions: missions(), weekly: weekly() }; }
