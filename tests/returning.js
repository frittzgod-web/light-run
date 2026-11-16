// Returning-player test: play an OLD build (old SW + old save, vision done), then the site updates to NEW; play naturally (no km jumps) and check a vision gate is entered.
const { chromium } = require('playwright-core'); const fs = require('fs'), { execSync } = require('child_process');
const OLD = process.env.OLD || 'v12', NEW = process.env.NEW || 'v131', ROOT = '/workspace/lrv/srv/light-run', URL0 = 'http://localhost:8770/light-run/';
const point = v => execSync(`ln -sfn /workspace/lrv/${v} ${ROOT}`);
(async () => {
  const dir = '/tmp/pwprof-' + OLD + '-' + NEW; fs.rmSync(dir, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(dir, { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [], out = { OLD, NEW, errs, log: [] }; p.on('pageerror', e => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  const toRun = async () => { for (let i = 0; i < 40; i++) { const m = await ev(() => window.LR && LR.state && LR.state.mode); if (m === 'run') return true; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnContinue', '#btnNew', '#btnGo', '#chGo', '#selGo', '#btnPlay', '#cGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && /start|run|go|let|continue|begin/i.test(b.textContent)); b && b.click(); }); await wait(700); } return false; };
  const boot = async q => { await p.goto(URL0 + '?gfx=battery&noauto&sw' + (q || ''), { waitUntil: 'load' }); await p.waitForFunction(() => window.LR && LR.state, null, { timeout: 90000 }); await wait(1500); };
  // ---- OLD build: new player, tutorial done, enter + finish the vision via the gate
  point(OLD); await boot('&notut');
  out.oldRun = await toRun();
  await ev(() => { LR.god && LR.god(1); });
  const vb = await ev(() => LR.visBook || null); out.oldVisBook = vb && { book: vb.book, portalD: vb.portalD };
  if (vb && vb.portalD) { await ev(d => { LR.state; window.LR.km((d - 90) / 200); }, vb.portalD); for (let i = 0; i < 120; i++) { if (await ev(() => !!LR.vis)) break; await wait(150); } }
  out.oldEntered = await ev(() => LR.vis && LR.vis.id);
  if (out.oldEntered) { await ev(() => LR.visD && LR.visD(1985)); for (let i = 0; i < 100; i++) { if (!(await ev(() => !!LR.vis))) break; await wait(150); } await wait(1500); }
  await ev(() => { const d = document.querySelector('#dialog.show button, #modal.show .btn.primary'); d && d.click(); }); await wait(800);
  out.oldLS = await ev(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k).slice(0, 300); } return o; });
  out.oldSW = await ev(async () => (await caches.keys()).join(','));
  // ---- site updates to NEW; the phone simply opens the game again (twice: 1st load may still run the old cached code)
  point(NEW);
  for (const pass of [1, 2]) {
    await boot(pass === 2 ? '&autopilot' : '&autopilot');
    let upd = 0; for (let i = 0; i < 30; i++) { const v = await p.evaluate(() => window.LR_VERSION || null).catch(() => null); if (v) { upd = i; break; } await wait(1000); }
    try { await p.waitForFunction(() => window.LR && LR.state, null, { timeout: 60000 }); } catch (e) {} await wait(1500);
    const info = await ev(async () => ({ sw: (await caches.keys()).join(','), ctrl: navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL, ver: window.LR_VERSION || (document.querySelector('#ver') && document.querySelector('#ver').textContent) || null, slotsAPI: !!(LR.visBook && LR.visBook.slots) }));
    const ok = await toRun(); await ev(() => LR.god && LR.god(1));
    let entered = null; const t0 = Date.now(); let lastKm = 0;
    while (Date.now() - t0 < 150000) { await wait(1000); const s = await ev(() => ({ km: LR.j ? LR.j.km : (LR.state.dist / 200), vis: LR.vis && LR.vis.id, mode: LR.state.mode, vb: LR.visBook && { book: LR.visBook.book, slots: LR.visBook.slots && LR.visBook.slots.map(s => s.book + ':' + s.state) } })); lastKm = s.km; if (s.vis) { entered = s; break; } if (s.mode !== 'run') { await toRun(); } if (s.km > 4) { entered = { missed: true, ...s }; break; } }
    out.log.push({ pass, upd, info, ok, entered, lastKm });
  }
  out.newLS = await ev(() => ({ save: localStorage.getItem('lr3d_save'), bible: localStorage.getItem('lr3d_bible') }));
  console.log(JSON.stringify(out)); await ctx.close();
})();
