// v14.3 episodes: story card, per-episode boss/scenery/questions, results next-episode, map, gates offer next unfinished episode
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8766/', W = +(process.env.W || 390), H = +(process.env.H || 844), OUT = process.env.OUT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  await p.goto(base + '?gfx=' + (process.env.GFX || 'battery') + '&noauto&notut', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = { eps: [] };
  const eps = { genesis: 4, exodus: 4, leviticus: 3 };
  for (const [book, n] of Object.entries(eps)) for (let i = 0; i < n; i++) {
    await ev(([bk, i]) => LR.vision(bk, i), [book, i]); await wait(900);
    const v0 = await ev(() => LR.vis);
    const card = await ev(() => ({ show: !!document.querySelector('#modal.show #stGo'), txt: (document.querySelector('#modal.show .banner') || {}).textContent }));
    if (OUT && book === 'exodus' && i === 3) await p.screenshot({ path: OUT + `/story-card-${W}.png` });
    await ev(() => LR.storyGo()); await wait(1500); await ev(() => LR.god(1));
    const run = await ev(() => LR.state);
    if (OUT && (process.env.SHOTS || '').split(',').includes(`${book}${i}`)) await p.screenshot({ path: OUT + `/ep-${book}-${i + 1}-${W}.png` });
    await ev(() => LR.visD(1440)); await wait(1800);
    const bv = await ev(() => LR.vis);
    if (OUT && (process.env.BSHOTS || '').split(',').includes(`${book}${i}`)) await p.screenshot({ path: OUT + `/ep-${book}-${i + 1}-finale-${W}.png` });
    await ev(() => LR.visD(1995)); await wait(2500);
    const res = await ev(() => ({ modal: !!document.querySelector('#modal.show'), banner: (document.querySelector('#modal.show .banner') || {}).textContent || '', next: (document.querySelector('#vrNext') || {}).textContent || null }));
    out.eps.push({ book, i, ep: v0 && v0.ep, story: card.show, storyTitle: card.txt, ran: run.mode === 'run' && !run.paused, boss: bv && bv.boss, bossTitle: bv && bv.boss0, res });
  }
  out.map = await ev(() => { LR.bibleMap(); const t = [...document.querySelectorAll('.btile.play,.btile.done')].map(x => x.textContent); return t; });
  await ev(() => LR.bookCard('exodus')); await wait(400);
  out.card = await ev(() => [...document.querySelectorAll('.epi')].map(x => x.textContent));
  if (OUT) await p.screenshot({ path: OUT + `/bible-map-episodes-${W}.png` });
  out.stats = await ev(() => LR.eps);
  const bad = out.eps.filter(e => !e.story || !e.ran || !e.boss || !e.res.modal || !/EPISODE/.test(e.res.banner));
  out.titles = [...new Set(out.eps.map(e => e.bossTitle))].length;
  out.pass = !bad.length && out.titles >= 10 && !errs.length && out.stats.genesis.done === 4 && out.stats.leviticus.done === 3;
  out.bad = bad; out.errs = errs.slice(0, 5);
  console.log(JSON.stringify(out)); await b.close(); process.exit(out.pass ? 0 : 1);
})();
