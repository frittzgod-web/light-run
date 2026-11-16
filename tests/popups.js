// v14.2: during active running nothing may appear in the middle of the screen or over the road/runner.
// Fires every kind of notice mid-run (zone, boss, storm, combo, fever, near-miss, mission-style pops, toasts, level-up
// celebrations, vision entry + vision boss) and samples every 120 ms: any visible overlay box inside the play area
// (below the HUD band) fails, and at most one top chip may be visible at once. Then checks the deferred celebrations
// appear on the results screen. Env BASE, W, H, OUT (screenshot dir).
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8766/', W = +(process.env.W || 390), H = +(process.env.H || 844), OUT = process.env.OUT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  await p.goto(base + '?gfx=battery&noauto&notut&novision', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); }
  await ev(() => LR.god(1));
  const bad = [], multi = []; let samples = 0, chipSeen = 0;
  const audit = () => ev(([W, H]) => {
    const top = Math.max(230, H * 0.27);   // HUD band + chip slot; everything below is the road/runner area
    const skip = new Set(['c3d', 'darkV', 'bolt', 'fade', 'pops']);
    const out = [];
    for (const e of document.querySelectorAll('body *')) {
      if (skip.has(e.id) || e.closest('#hud, .hud, #topbar, #hQ, #gLabels, #ansStrip, #pause, #autoBadge, #dbg, #loading')) continue;
      const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      let o = 1, x = e; while (x && x !== document.body) { o *= +getComputedStyle(x).opacity; x = x.parentElement; } if (o < 0.15) continue;
      const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
      if (r.width >= W - 2 && r.height >= H - 2) continue;   // full-screen tints (vignette, flash) are edge effects
      const ix = Math.min(r.right, W * 0.92) - Math.max(r.left, W * 0.08), iy = Math.min(r.bottom, H) - Math.max(r.top, top);
      if (ix > 6 && iy > 6) out.push((e.id || e.className || e.tagName) + ' @' + Math.round(r.top) + '-' + Math.round(r.bottom));
    }
    const chips = ['#runChip', '#gateChip', '#gust'].filter(s => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.5; });
    return { out, chips, mode: LR.state.mode, paused: LR.state.paused };
  }, [W, H]);
  async function phase(name, fn, ms) {
    await ev(fn); const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const a = await audit(); samples++;
      if (!a.paused && a.mode === 'run') { if (a.out.length) bad.push(name + ': ' + a.out.join(', ')); if (a.chips.length > 1) multi.push(name + ': ' + a.chips.join('+')); if (a.chips.includes('#runChip')) chipSeen++; }
      await ev(() => { const d = document.querySelector('#dialog.show'); if (d) { const bt = d.querySelector('button'); bt && bt.click(); } });
      await wait(120);
    }
  }
  await phase('zone', () => LR.km(4.4), 2500);
  await phase('toast', () => LR.toastTest('Day 3 streak! +50 light'), 1200);
  await phase('combo+fever', () => { LR.combo(12); LR.combo(20); }, 2500);
  if (OUT) await p.screenshot({ path: OUT + `/fever-chip-${W}.png` });
  await phase('celebrate', () => { LR.celebrateTest('LEVEL 9'); LR.celebrateTest('BADGE: Test'); }, 2000);
  await phase('hits', () => { LR.hit('cone'); }, 1500);
  await phase('storm', () => LR.km(10.62), 6000);
  if (OUT) await p.screenshot({ path: OUT + `/storm-chip-${W}.png` });
  await phase('market', () => LR.km(36.4), 3000);
  await phase('vision', () => LR.vision('exodus'), 4000);
  await phase('vboss', () => LR.visD(1440), 4000);
  const ch = await ev(() => LR.chips);
  // end the run → results: the deferred level-up must show now
  await ev(() => { LR.god(0); }); let res = null;
  await ev(() => LR.km(20.5));
  for (let i = 0; i < 40; i++) { await ev(() => LR.hit('danfo')); await wait(400); const m = await ev(() => ({ modal: !!document.querySelector('#modal.show'), cel: !!document.querySelector('.celebrate.show'), txt: (document.querySelector('.celebrate.show') || {}).textContent || '' })); if (m.modal) { await wait(900); res = await ev(() => ({ modal: !!document.querySelector('#modal.show'), cel: !!document.querySelector('.celebrate.show'), txt: ((document.querySelector('.celebrate') || {}).textContent || '').slice(0, 60), defer: LR.chips.defer })); break; } }
  if (OUT && res) await p.screenshot({ path: OUT + `/results-celebrate-${W}.png` });
  const out = { W, H, samples, chipSeen, chips: ch, bad: [...new Set(bad)].slice(0, 12), multi: [...new Set(multi)].slice(0, 6), results: res, errs };
  out.pass = !bad.length && !multi.length && chipSeen > 5 && res && res.modal && (res.cel || res.defer === 0) && !errs.length;
  console.log(JSON.stringify(out)); await b.close(); process.exit(out.pass ? 0 : 1);
})();
