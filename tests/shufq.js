const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  await p.goto('http://localhost:8766/?gfx=battery&noauto&notut&novision', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = { sets: [] };
  for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); }
  out.road = await ev(() => LR.quiz.length);
  for (let i = 0; i < 3; i++) { await ev(() => LR.vision('genesis', 0)); await wait(1200); out.sets.push(await ev(() => LR.quiz.map(q => q.slice(0, 22)))); await ev(() => LR.storyGo()); await wait(300); }
  // replay story countdown while paused 'away': must not run behind the pause menu, and Resume must unfreeze
  await ev(() => LR.vision('genesis', 0)); await wait(1200);
  out.storyBefore = await ev(() => LR.vis.story);
  await ev(() => LR.pauseNow('away')); await wait(6000);
  out.whilePaused = await ev(() => ({ story: LR.vis.story, d: LR.vis.d }));
  await ev(() => LR.resumeNow()); await wait(500); await ev(() => LR.storyGo()); await ev(() => LR.god(1));
  const d0 = await ev(() => LR.vis.d); await wait(2000); out.movedAfter = (await ev(() => LR.vis.d)) - d0;
  out.recent = await ev(() => JSON.parse(localStorage.getItem('lr_recentQ')).length); out.errs = errs;
  console.log(JSON.stringify(out)); await b.close();
})();
