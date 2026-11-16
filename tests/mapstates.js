// v14: the Bible map's "Enter the vision" must work from every state: title, paused mid-run, after a fall (results),
// inside another vision, and on the vision results card. Each time a vision must start, run (story card tapped) and move.
const { chromium } = require('playwright-core');
const base = process.env.BASE || 'http://localhost:8766/', W = +(process.env.W || 390), H = +(process.env.H || 844);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('lr3d_tut', '1'); });
  await p.goto(base + '?gfx=battery&noauto&notut', { waitUntil: 'load' });
  await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = {};
  const enterFromMap = async (name, book = 'genesis') => {
    await ev(bk => LR.bookCard(bk), book); await wait(400);
    const clicked = await ev(() => { const e = document.querySelector('#bkGo'); if (!e || e.offsetParent === null) return false; e.click(); return true; }); await wait(1200);
    await ev(() => LR.storyGo()); await wait(1500);
    const v1 = await ev(() => LR.vis); await wait(1200); const v2 = await ev(() => LR.vis), st = await ev(() => LR.state);
    const ui = await ev(() => ({ pause: !!document.querySelector('#pause:not(.hidden)') && document.querySelector('#pause').offsetParent !== null, modal: !!document.querySelector('#modal.show'), bible: document.querySelector('#bible') && document.querySelector('#bible').offsetParent !== null }));
    out[name] = { clicked, vis: v1 && v1.id + '/' + v1.ep, moving: !!(v1 && v2 && v2.d > v1.d), mode: st.mode, paused: st.paused, ui };
  };
  const toRun = async () => { for (let i = 0; i < 30; i++) { const m = await ev(() => LR.state.mode); if (m === 'run') break; await ev(() => { const v = e => e && e.offsetParent !== null; for (const id of ['#btnContinue', '#btnNew', '#btnGo', '#chGo']) { const e = document.querySelector(id); if (v(e)) { e.click(); return; } } }); await wait(700); } };
  await enterFromMap('fromTitle');
  await ev(() => LR.km(0)); await ev(() => document.querySelector('#btnPause').click()); await wait(300); await ev(() => LR.km(0));
  // paused mid journey run
  await ev(() => { LR.state; }); await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await wait(800);
  await toRun(); await ev(() => { LR.km(4.5); }); await wait(800); await ev(() => document.querySelector('#btnPause').click()); await wait(500);
  await enterFromMap('fromPause', 'exodus');
  // after a fall in a journey run
  await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => window.LR && document.querySelector('#btnNew'), null, { timeout: 90000 }); await wait(800);
  await toRun(); await ev(() => LR.km(5)); for (let i = 0; i < 20; i++) { await ev(() => LR.hit('danfo')); await wait(300); if (await ev(() => !!document.querySelector('#modal.show'))) break; }
  out.fallModal = await ev(() => !!document.querySelector('#modal.show'));
  await enterFromMap('fromFall', 'leviticus');
  // inside another vision (mid-run)
  await enterFromMap('fromVision', 'genesis');
  // vision results card
  await ev(() => { LR.god(1); LR.visD(1995); }); await wait(2500); out.resModal = await ev(() => !!document.querySelector('#modal.show #vrMap'));
  await enterFromMap('fromResults', 'exodus');
  const cases = ['fromTitle', 'fromPause', 'fromFall', 'fromVision', 'fromResults'];
  out.pass = cases.every(c => out[c] && out[c].clicked && out[c].vis && out[c].moving && !out[c].paused && !out[c].ui.pause && !out[c].ui.modal) && !errs.length;
  out.errs = errs.slice(0, 5); console.log(JSON.stringify(out)); await b.close(); process.exit(out.pass ? 0 : 1);
})();
