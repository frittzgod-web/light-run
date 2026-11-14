// Meta-game: wallet, shop catalogue, daily challenges, streaks, best distance and the youth-group leaderboard.
// Everything is stored in localStorage on the phone. The leaderboard uses a pluggable backend adapter.
import { MEMORY } from './content.js';

const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch (e) { return d; } };
const W = (k, v) => localStorage.setItem(k, JSON.stringify(v));
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = k => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() - 1); return todayKey(d); };
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------------- wallet + shop ---------------- */
const WALLET = 'lr3d_wallet';
export function wallet() { return Object.assign({ light: 0, earned: 0, owned: ['l_hurricane', 't_none'], lantern: 'l_hurricane', trail: 't_none' }, J(WALLET, {})); }
export function saveWallet(w) { W(WALLET, w); }
export function earn(n) { if (!n) return; const w = wallet(); w.light += Math.round(n); w.earned += Math.round(n); saveWallet(w); }
export const SHOP = {
  outfits: [
    { id: 'o_youth', name: 'Youth T-shirt', price: 250, icon: '👕', note: 'Represent your parish youth fellowship.' },
    { id: 'o_choir', name: 'Choir robe', price: 350, icon: '🎶', note: '“Sing unto the LORD a new song” (Psalm 96:1)' },
    { id: 'o_ankara', name: 'Ankara set', price: 500, icon: '🧵', note: 'Bold prints for a bright pilgrim.' },
    { id: 'o_usher', name: 'Usher uniform', price: 700, icon: '🤵🏾', note: '“I had rather be a doorkeeper in the house of my God” (Psalm 84:10)' },
    { id: 'o_agbada', name: 'Agbada / Iro & buba', price: 1000, icon: '👑', note: 'Sunday best for the Holy Ghost Service.' },
  ],
  lanterns: [
    { id: 'l_hurricane', name: 'Hurricane lamp', price: 0, icon: '🏮', note: 'The classic. Warm golden sparks.', trail: '#ffd27a' },
    { id: 'l_star', name: 'Morning star', price: 400, icon: '⭐', note: 'Twinkling star trail (Revelation 22:16).', trail: '#fff59d' },
    { id: 'l_dove', name: 'Dove lamp', price: 650, icon: '🕊️', note: 'Soft white feather trail (Matthew 3:16).', trail: '#ffffff' },
    { id: 'l_flame', name: 'Pentecost flame', price: 900, icon: '🔥', note: 'Flickering flame trail (Acts 2:3).', trail: '#ff8a1e' },
  ],
  trails: [
    { id: 't_none', name: 'No trail', price: 0, icon: '·', note: 'Just your feet and the road.' },
    { id: 't_gold', name: 'Golden path', price: 300, icon: '✨', note: '“The path of the just is as the shining light” (Proverbs 4:18)' },
    { id: 't_rainbow', name: 'Rainbow promise', price: 750, icon: '🌈', note: '“I do set my bow in the cloud” (Genesis 9:13)' },
    { id: 't_wings', name: 'Eagle wings', price: 1100, icon: '🦅', note: '“They shall mount up with wings as eagles” (Isaiah 40:31)' },
  ],
};
export const shopItem = id => Object.values(SHOP).flat().find(i => i.id === id);

/* ---------------- best distance ---------------- */
export const bestKm = () => +(localStorage.getItem('lr3d_bestkm') || 0);
export function recordKm(km) { const b = bestKm(); if (km > b) { localStorage.setItem('lr3d_bestkm', km.toFixed(1)); return true; } return false; }

/* ---------------- daily challenges + streak ---------------- */
export const DAILY_POOL = [
  { id: 'scrolls', t: 'Collect 3 verse scrolls', n: 3, stat: 'scrolls', r: 60 },
  { id: 'help', t: 'Help 2 pilgrims', n: 2, stat: 'help', r: 80 },
  { id: 'grind', t: 'Grind 200 m along the rails', n: 200, stat: 'grindM', r: 80 },
  { id: 'bridge', t: 'Reach Long Bridge', n: 1, stat: 'reachBridge', r: 60 },
  { id: 'mowe', t: 'Reach Mowe', n: 1, stat: 'reachMowe', r: 120 },
  { id: 'slide', t: 'Slide under 8 barriers', n: 8, stat: 'slides', r: 60 },
  { id: 'roof', t: 'Run across 3 danfo roofs', n: 3, stat: 'roofs', r: 80 },
  { id: 'orbs', t: 'Collect 150 light orbs', n: 150, stat: 'orbs', r: 60 },
  { id: 'gates', t: 'Run through 5 right answer gates', n: 5, stat: 'gates', r: 80 },
  { id: 'storm', t: 'Survive the Long Bridge storm', n: 1, stat: 'storm', r: 100 },
  { id: 'combo', t: 'Reach a x4 combo', n: 1, stat: 'combo4', r: 80 },
  { id: 'fire', t: 'Catch Holy Ghost Fire', n: 1, stat: 'fire', r: 50 },
  { id: 'km', t: 'Run 25 km in total today', n: 25, stat: 'km', r: 80 },
  { id: 'goslow', t: 'Beat the Ibafo go-slow', n: 1, stat: 'goslow', r: 120 },
];
export function dailyFor(day = todayKey()) {
  const rnd = seeded(hash('lr-daily-' + day)), pool = DAILY_POOL.slice(), out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
export function dailyVerse(day = todayKey()) { return MEMORY[hash('lr-verse-' + day) % MEMORY.length]; }
const DKEY = 'lr3d_daily';
export function dailyState() {
  const day = todayKey(); let st = J(DKEY, null);
  if (!st || st.day !== day) { st = { day, prog: {}, done: {}, bonus: false }; W(DKEY, st); }
  return st;
}
// Add progress to a stat. mode 'max' keeps the highest value (e.g. combo), otherwise accumulates.
// Returns a list of newly completed challenges so the game can celebrate.
export function dailyStat(stat, v = 1, mode = 'add') {
  const st = dailyState(), list = dailyFor(st.day), fresh = [];
  for (const c of list) {
    if (c.stat !== stat || st.done[c.id]) continue;
    st.prog[c.id] = mode === 'max' ? Math.max(st.prog[c.id] || 0, v) : (st.prog[c.id] || 0) + v;
    if (st.prog[c.id] >= c.n) { st.done[c.id] = true; earn(c.r); fresh.push(c); }
  }
  if (fresh.length && list.every(c => st.done[c.id]) && !st.bonus) { st.bonus = true; earn(150); fresh.push({ id: 'all', t: 'All 3 daily challenges', r: 150 }); }
  if (fresh.length || list.some(c => c.stat === stat)) W(DKEY, st);
  return fresh;
}
const SKEY = 'lr3d_streak';
export function streak() { return Object.assign({ last: null, n: 0, best: 0 }, J(SKEY, {})); }
export const streakReward = n => 40 * Math.min(n, 7) + (n % 7 === 0 ? 250 : 0);
// Called when a run starts. Returns { n, reward } when today is newly counted, else null.
export function markPlayed() {
  const s = streak(), day = todayKey();
  if (s.last === day) return null;
  s.n = s.last === dayBefore(day) ? s.n + 1 : 1; s.last = day; s.best = Math.max(s.best, s.n); W(SKEY, s);
  const reward = streakReward(s.n); earn(reward); return { n: s.n, reward };
}
export function streakNote() {
  const s = streak(), day = todayKey();
  if (s.last === day) return `🔥 ${s.n}-day streak · see you tomorrow, pilgrim!`;
  if (s.last === dayBefore(day)) return `🔥 ${s.n}-day streak · run today to keep it going (+${streakReward(s.n + 1)} 💡)`;
  return s.best ? `🔥 Start a new streak today (+${streakReward(1)} 💡)` : '🔥 Play every day to build a streak';
}

/* ---------------- leaderboard (pluggable backend) ---------------- */
// Configure a real backend in js/lb-config.js (see LEADERBOARD.md). Without it we run in local demo mode.
export const weekKey = (d = new Date()) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`; };
const ROOMS = 'lr3d_rooms', MYROOM = 'lr3d_room';
const LocalAdapter = {
  mode: 'local', label: 'Demo mode (this phone only)',
  async createRoom(name) { const code = makeCode(); const r = J(ROOMS, {}); r[code] = { name, created: Date.now(), entries: [] }; W(ROOMS, r); return { code, name }; },
  async joinRoom(code) { const r = J(ROOMS, {}); if (!r[code]) { r[code] = { name: 'Youth group ' + code, created: Date.now(), entries: [] }; W(ROOMS, r); } return { code, name: r[code].name }; },
  async submit(code, e) { const r = J(ROOMS, {}); if (!r[code]) return; r[code].entries.push(e); r[code].entries = r[code].entries.slice(-300); W(ROOMS, r); },
  async top(code, week) {
    const r = J(ROOMS, {}), list = (r[code]?.entries || []).filter(e => e.week === week), best = {};
    for (const e of list) { const k = e.name.toLowerCase(); if (!best[k] || e.km > best[k].km || (e.km === best[k].km && e.score > best[k].score)) best[k] = e; }
    return Object.values(best).sort((a, b) => b.km - a.km || b.score - a.score).slice(0, 30);
  },
};
// Supabase REST adapter (free tier, no card). Needs { url, anonKey } and the two tables in LEADERBOARD.md.
function SupabaseAdapter(cfg) {
  const H = { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json' };
  const api = (path, opt = {}) => fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/' + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } }).then(r => { if (!r.ok) throw new Error('Leaderboard ' + r.status); return r.status === 204 ? null : r.json(); });
  return {
    mode: 'supabase', label: 'Live youth-group board',
    async createRoom(name) { const code = makeCode(); await api('lr_rooms', { method: 'POST', body: JSON.stringify({ code, name }), headers: { Prefer: 'return=minimal' } }); return { code, name }; },
    async joinRoom(code) { const r = await api(`lr_rooms?code=eq.${encodeURIComponent(code)}&select=code,name`); if (!r.length) throw new Error('Room not found'); return r[0]; },
    async submit(code, e) { await api('lr_scores', { method: 'POST', body: JSON.stringify({ room: code, name: e.name, km: e.km, score: e.score, week: e.week }), headers: { Prefer: 'return=minimal' } }); },
    async top(code, week) {
      const rows = await api(`lr_scores?room=eq.${encodeURIComponent(code)}&week=eq.${week}&select=name,km,score&order=km.desc,score.desc&limit=200`), best = {};
      for (const e of rows) { const k = e.name.toLowerCase(); if (!best[k]) best[k] = e; }
      return Object.values(best).slice(0, 30);
    },
  };
}
function makeCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
const cfg = (typeof window !== 'undefined' && window.LR_LEADERBOARD) || {};
export const LB = cfg.url && cfg.anonKey ? SupabaseAdapter(cfg) : LocalAdapter;
export const myRoom = () => J(MYROOM, null);
export const setMyRoom = r => r ? W(MYROOM, r) : localStorage.removeItem(MYROOM);
export function challengeLink(base, room, km, name) {
  const u = new URL(base); u.search = ''; u.hash = '';
  if (room) u.searchParams.set('room', room.code); u.searchParams.set('beat', km.toFixed(1)); u.searchParams.set('from', name);
  return u.toString();
}
export function whatsappURL(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }
