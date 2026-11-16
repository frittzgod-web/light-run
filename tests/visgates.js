// v12 regression: vision gates open on every journey run (3 per run), after a completed save, and after a checkpoint restart
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8765/', W = +(process.env.W || 390), H = +(process.env.H || 844);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [], out = { errs }; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  const toRun = async () => {
    await p.goto(base + '?gfx=battery&noauto&notut', { waitUntil: 'load' });
    await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await wait(600);
    for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnContinue', '#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); }
    out.modes = (out.modes || []).concat(await ev(() => LR.state.mode + ' ' + [...document.querySelectorAll('button')].filter(e => e.offsetParent).map(e => e.id || e.textContent.trim().slice(0, 14)).join('|')));
    await ev(() => LR.god(1));
  };
  // approach slot k; returns the book entered (or null)
  const reach = async k => {
    const at = await ev(k => LR.visBook.slots[k].km, k);
    await ev(km => { LR.km(km); LR.god(1); }, at - 0.45);
    for (let i = 0; i < 160; i++) { const v = await ev(() => { const d = document.querySelector('#dialog.show button'); d && d.click(); return LR.vis; }); if (v) return v.id; await wait(150); }
    return null;
  };
  const finish = async () => { await ev(() => LR.visD(1985)); for (let i = 0; i < 120; i++) { const v = await ev(() => LR.vis); if (!v) break; await wait(150); } await wait(500); return ev(() => ({ km: +(LR.state.dist / 200).toFixed(2), slots: LR.visBook.slots.map(s => s.book + ':' + s.state), last: LR.visBook.last && LR.visBook.last.id })); };
  // run 1 (fresh save): gate 1 = Genesis; finish it; gate 2 should be Exodus (now unlocked); gate 3 Leviticus after Exodus
  await toRun();
  out.r1 = { g1: await reach(0) }; out.r1.f1 = await finish();
  out.r1.g2 = await reach(1); out.r1.f2 = await finish();
  out.r1.g3 = await reach(2); out.r1.f3 = await finish();
  // run 2 straight after (all three now finished): gates must still open, cycling finished books
  await toRun(); console.log(JSON.stringify(out));
  out.r2 = { slots0: await ev(() => LR.visBook.slots.map(s => s.km)), g1: await reach(0) };
  // checkpoint restart before gate 1: pause -> restart from last stop, gate 1 opens again
  await ev(() => { document.querySelector('#btnPause') && document.querySelector('#btnPause').click(); }); await wait(500);
  out.r2.cpBtn = await ev(() => { const e = document.querySelector('#btnPauseCP'); if (!e) return 'none'; e.click(); return 'clicked'; }); await wait(800);
  out.r2.afterCp = await ev(() => ({ vis: !!LR.vis, slots: LR.visBook.slots.map(s => s.state), km: +(LR.state.dist / 200).toFixed(2) }));
  out.r2.g1again = await reach(0);
  // run 3: completed save (every book done, 3 stars) still gets three gates
  await ev(() => localStorage.setItem('lr3d_bible', JSON.stringify({ books: Object.fromEntries(['genesis', 'exodus', 'leviticus'].map(id => [id, { done: true, plays: 3, best: 5000, stars: 3, q: {}, v: [] }])) })));
  await toRun();
  out.r3 = { g1: await reach(0) }; await finish(); out.r3.g2 = await reach(1); await finish(); out.r3.g3 = await reach(2);
  // run 4: a missed gate (jumped past it) is followed by the next gate a few km later
  await toRun(); await ev(() => { LR.km(3.2); LR.god(1); }); await wait(600);
  out.r4 = { nGates: await ev(() => LR.visBook.slots.length), states: await ev(() => LR.visBook.slots.map(s => s.state).slice(0, 3)), next: await ev(() => LR.visBook.next), g: await reach(1) };
  const r1 = out.r1, ok = out.r4.nGates >= 8 && out.r4.g && out.r4.next === 1 && r1.g1 === 'genesis' && r1.g2 === 'exodus' && r1.g3 === 'leviticus' && !!out.r2.g1 && out.r2.afterCp.slots[0] === 'open' && !!out.r2.g1again && out.r3.g1 && out.r3.g2 && out.r3.g3 && new Set([out.r3.g1, out.r3.g2, out.r3.g3]).size === 3 && !errs.length;
  out.pass = !!ok; console.log(JSON.stringify(out)); await b.close(); process.exit(ok ? 0 : 1);
})();
