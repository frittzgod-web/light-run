const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8766/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  await p.goto(base + '?gfx=battery&noauto&notut&novision', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = {};
  for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); }
  await ev(() => LR.god(1)); await wait(1500);
  const moving = async () => { const f = () => LR.vis ? LR.vis.d : LR.state.dist; const a = await ev(f); await wait(1200); const c = await ev(f); return +(c - a).toFixed(1); };
  const tapSel = async s => { const bb = await p.locator(s).boundingBox(); if (!bb) return 'nobox'; await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); return 'ok'; };
  out.before = await moving();
  for (const [name, setup] of [['plain', null], ['afterChip', () => LR.toastTest('hello')], ['inVision', () => LR.vision('genesis', 0)], ['visQuestion', () => LR.visD(380)], ['journeyQ', () => { LR.km(5.75); }], ['dialog', () => { LR.km(6.1); }], ['storm', () => LR.km(11)]]) {
    if (setup) { await ev(setup); await wait(name === 'dialog' ? 3000 : 1500); await ev(() => LR.storyGo && LR.storyGo()); await wait(800); await ev(() => LR.god(1)); }
    out[name + 'Pre'] = await ev(() => ({ p: LR.state.paused, dlg: !!document.querySelector('#dialog.show'), q: document.body.classList.contains('qon'), modal: !!document.querySelector('#modal.show') }));
    await tapSel('#btnPause'); await wait(600);
    const paused = await ev(() => LR.state.paused);
    out[name] = { paused, tap: await tapSel('#btnResume') }; await wait(700);
    out[name].state = await ev(() => ({ p: LR.state.paused, pauseVis: document.querySelector('#pause').offsetParent !== null })); out[name].moved = await moving();
  }
  // visibility hide/show
  await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(500);
  await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(500); out.vis = { paused: await ev(() => LR.state.paused), tap: await tapSel('#btnResume') }; await wait(700); out.vis.moved = await moving();
  out.errs = errs; console.log(JSON.stringify(out)); await b.close();
})();
