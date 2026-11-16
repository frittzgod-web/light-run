// v12 rewards hub + fever smoke with screenshots
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8767/', W = +(process.env.W || 390), H = +(process.env.H || 844), OUT = process.env.OUT || '/tmp/v12/hub';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  await p.goto(base + '?gfx=balanced&noauto&notut&novision', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(1000);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `${OUT}/${n}-${W}.png` });
  await shot('title');
  for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnContinue', '#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(800); }
  await ev(() => { LR.god(1); LR.km(7.5); }); await wait(800);
  await ev(() => LR.combo(29)); await wait(200); await ev(() => LR.combo(2)); await wait(700); await shot('fever');
  const fv = await ev(() => ({ fever: document.body.classList.contains('fever'), run: LR.run, prog: JSON.parse(localStorage.getItem('lr3d_prog')) }));
  await ev(() => LR.god(0)); await ev(() => LR.hit('danfo')); await wait(1500); await shot('fallen-progress');
  await ev(() => { document.querySelector('#modal') && (document.querySelector('#modal').classList.remove('show')); }); 
  await p.goto(base + '?gfx=balanced&noauto&notut&novision', { waitUntil: 'load' }); await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await wait(900);
  await ev(() => document.querySelector('#btnDaily').click()); await wait(500); await shot('hub-today');
  for (const t of ['missions', 'chest', 'cards', 'badges']) { await ev(t => document.querySelector(`.hubtabs [data-t="${t}"]`).click(), t); await wait(400); await shot('hub-' + t); }
  await ev(() => document.querySelector('.hubtabs [data-t="chest"]').click()); await wait(300);
  const canOpen = await ev(() => !document.querySelector('#chestOpen').disabled);
  if (canOpen) { await ev(() => document.querySelector('#chestOpen').click()); await wait(1700); await shot('hub-chest-open'); }
  console.log(JSON.stringify({ errs, fever: fv.fever, combo: fv.run.combo, xp: fv.prog && fv.prog.xp, lvl: fv.prog && fv.prog.lvl, chests: fv.prog && fv.prog.chests, canOpen }));
  await b.close();
})();
