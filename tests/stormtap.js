// v14 storm: thumb-roll taps (jumping debris) must jump and NEVER change lane; real swipes still change exactly one lane. All tiers.
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8766/', W = +(process.env.W || 390), H = +(process.env.H || 844);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = { errs: [], tiers: {} };
  for (const gfx of (process.env.TIERS || 'high,balanced,battery').split(',')) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); p.on('pageerror', e => out.errs.push(gfx + ': ' + e.message));
    await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
    await p.goto(base + `?gfx=${gfx}&noauto&notut&novision`, { waitUntil: 'load' });
    await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
    const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
    for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); }
    await ev(() => { LR.god(1); LR.km(11.0); }); await wait(1500);
    const cdp = await ctx.newCDPSession(p);
    const a0 = await ev(() => LR.acts); const boss = await ev(() => document.body.className);
    let laneChanges = 0, lane = a0.lane;
    for (let i = 0; i < 24; i++) {
      const x0 = W * (0.3 + 0.4 * Math.random()), y = H * 0.6, dx = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10), dy = -(Math.random() * 6);
      // in-page pointer events with real 50 ms timing (CDP input lags behind slow software-GL frames, which makes a tap look like a long press)
      await ev(([x0, y, dx, dy, ST, UP]) => new Promise(res => { const c = document.querySelector('canvas'); const f = (t, x, yy) => { const o = { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: yy, bubbles: true }; c.dispatchEvent(new PointerEvent(t, o)); if (t === 'pointermove' && 'onpointerrawupdate' in window) c.dispatchEvent(new PointerEvent('pointerrawupdate', o)); };
        f('pointerdown', x0, y); setTimeout(() => { f('pointermove', x0 + dx * 0.6, y + dy * 0.5); setTimeout(() => { f('pointermove', x0 + dx, y + dy); setTimeout(() => { f('pointerup', x0 + dx, y + dy); res(); }, UP); }, ST); }, ST); }), [x0, y, dx, dy, +(process.env.STEP||15), +(process.env.UPMS||20)]);
      await wait(900); const l = await ev(() => LR.acts.lane); if (l !== lane) { laneChanges++; lane = l; }
    }
    const a1 = await ev(() => LR.acts);
    // then a real (short, quick) swipe of 70 px must still change exactly one lane
    const before = await ev(() => LR.acts.lane), dir = before === 0 ? 1 : -1, x0 = W / 2, y = H * 0.6;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
    for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dir * 70 * k / 6, y }] }); await wait(10); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(400);
    const after = await ev(() => LR.acts.lane);
    out.tiers[gfx] = { storm: /boss-storm/.test(boss), taps: 24, jumps: a1.jump - a0.jump, moves: a1.move - a0.move, laneChanges, swipeOk: Math.abs(after - before) === 1 };
    await ctx.close();
  }
  out.pass = Object.values(out.tiers).every(t => t.storm && t.laneChanges === 0 && t.jumps >= 20 && t.swipeOk) && !out.errs.length;
  console.log(JSON.stringify(out)); await b.close(); process.exit(out.pass ? 0 : 1);
})();
