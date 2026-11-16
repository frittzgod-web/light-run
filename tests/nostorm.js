// v14: NO-INPUT storm + weather test on every graphics tier (High includes the post-processing chain).
// Runs the WHOLE storm boss (KM 10.7–14.2) and every weather state with no touch or key at all and asserts
// zero lane changes and zero move/jump/slide actions. God mode keeps the run alive without steering.
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8766/', W = +(process.env.W || 390), H = +(process.env.H || 844);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = {}, fail = [], errs = [];
  for (const gfx of (process.env.TIERS || 'high,balanced,battery').split(',')) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(gfx + ': ' + e.message));
    await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
    await p.goto(base + `?gfx=${gfx}&noauto&notut&novision&speed=3`, { waitUntil: 'load' });
    await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
    const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
    for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); }
    const unblock = () => ev(() => { const d = document.querySelector('#dialog.show'); if (d) { const bt = d.querySelector('button'); bt && bt.click(); } });
    const T = out[gfx] = { q: await ev(() => LR.q), runs: [] };
    async function watch(name, setup, until, maxS, arg) {
      await ev(setup, arg); await ev(() => LR.god(1)); await wait(300);
      const a0 = await ev(() => LR.acts); const lanes = new Set([a0.lane]); let a1 = a0, n = 0, km0 = (await ev(() => LR.j)).km, km1 = km0, sawBoss = false, warns = 0;
      const t0 = Date.now();
      while (Date.now() - t0 < maxS * 1000) {
        await wait(250); await unblock(); a1 = await ev(() => LR.acts); n++; lanes.add(a1.lane);
        const j = await ev(() => LR.j); km1 = j.km; if (j.boss === 'storm') sawBoss = true;
        warns += await ev(() => document.querySelector('#gust').classList.contains('show') ? 1 : 0);
        if (until && km1 >= until) break;
      }
      const r = { name, km: [+km0.toFixed(2), +km1.toFixed(2)], lanes: [...lanes], move: a1.move - a0.move, jump: a1.jump - a0.jump, slide: a1.slide - a0.slide, samples: n, sawBoss, warns };
      if (lanes.size !== 1 || r.move || r.jump || r.slide) fail.push(gfx + ' ' + JSON.stringify(r));
      T.runs.push(r); return r;
    }
    for (const [nm, m, k] of [['clear', { rain: false, fog: 1, dusk: false }, 4.5], ['harmattan', { fog: 2.0, rain: false }, 7.9], ['rain', { rain: true, fog: 1.4 }, 15.0], ['dusk', { dusk: true, rain: true }, 22.0], ['darkness', { rain: false }, 31.2]])
      await watch('weather:' + nm, ([m, k, nm]) => { LR.km(k); LR.weather(m); LR.dark(nm === 'darkness' ? 1 : 0); }, 0, 6, [m, k, nm]);
    await ev(() => LR.dark(0));
    // the whole storm boss, entered from before its start, run until past its end
    const r = await watch('storm:full', () => { LR.km(10.45); LR.weather({ rain: true, fog: 1.4 }); }, 14.3, +(process.env.STORMS || 150));
    if (!r.sawBoss || r.km[1] < 14.2) fail.push(gfx + ' storm not completed ' + JSON.stringify(r.km));
    await ctx.close();
  }
  console.log(JSON.stringify(out)); console.log('FAIL', JSON.stringify(fail)); console.log('ERRS', JSON.stringify(errs.slice(0, 6)));
  await b.close(); process.exit(fail.length || errs.length ? 1 : 0);
})();
