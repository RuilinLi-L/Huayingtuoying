import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
// Run against the built preview: THEORY_BASE_URL=http://127.0.0.1:4190 node scripts/theory-restoration-qa.mjs
const base = process.env.THEORY_BASE_URL ?? 'http://127.0.0.1:4190';
const output = 'screenshots/theory-restoration';
await fs.mkdir(output, { recursive: true });
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const errors = [], results = [];
const page = await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2});
page.on('pageerror', e => errors.push(e.message));
try {
  for (const [old, expected] of [
    ['/learn/fundamentals#rhythm-meter','/knowledge/theory/02'],
    ['/learn/fundamentals#chinese-modes','/knowledge/theory/07'],
    ['/learn/fundamentals','/knowledge/guide'],
    ['/demo/base?lineup=flute','/stage'],
    ['/entry/violin-dialogue','/stage'],
    ['/experience/flute-color','/stage'],
  ]) {
    await page.goto(base+old);
    await page.waitForURL(url=>url.pathname===expected);
    await page.locator('.mobile-shell main h1').first().waitFor();
    assert.equal(await page.locator('.app-shell').count(),0);
    results.push(`Legacy route ${old} → ${expected}`);
  }
  await page.goto(base+'/knowledge/theory/02');
  await page.locator('.theory-dial[data-active-topic="02"]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{window.__dial=document.querySelector('.theory-dial__orbit');});
  await page.locator('.theory-dial__button[href$="/03"]').click();
  await page.waitForURL('**/knowledge/theory/03');
  assert.ok(await page.evaluate(()=>window.__dial===document.querySelector('.theory-dial__orbit')), 'Dial was remounted instead of rotating');
  await page.waitForTimeout(100);
  await page.screenshot({path:output+'/dial-mid-transition.png'});
  await page.waitForTimeout(400);
  assert.ok(await page.locator('.theory-dial').getAttribute('style').then(s=>s.includes('-64deg')));
  const before=await page.locator('.theory-dial').boundingBox();
  await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  const after=await page.locator('.theory-dial').boundingBox();
  assert.ok(Math.abs(before.y-after.y)<1, 'Dial moved with document scrolling');
  await page.getByRole('link',{name:'返回完整知识导览'}).click();
  await page.waitForURL('**/knowledge/guide');
  await page.locator('.guide-card').first().waitFor();
  assert.equal(await page.locator('.guide-card').count(),7);
  assert.equal(await page.locator('.guide-instruments a').count(),12);
  assert.equal(await page.locator('a[href^="/learn/"],a[href^="/demo/"],a[href^="/entry/"]').count(),0);
  await page.screenshot({path:output+'/guide-393.png'});
  results.push('Dial stays mounted, rotates, remains fixed; full guide has 7 chapters and 12 instruments');
  for(const width of [320,393,430]) {
    await page.setViewportSize({width,height:852});
    for(const id of ['01','02','03','04','05','06','07']) {
      await page.goto(base+'/knowledge/theory/'+id);
      await page.locator('.theory-dial').waitFor();
      assert.equal(await page.locator('.mobile-bottom-nav').count(), 0);
      const dialBounds = await page.locator('.theory-dial').boundingBox();
      assert.ok(Math.abs(dialBounds.y + dialBounds.height - 852) < 1, 'Dial must meet the viewport bottom');
      assert.ok(await page.locator('h1').textContent());
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.equal(await page.locator('a[href^="/learn/"]').count(),0);
      if(id==='02') await page.screenshot({path:output+`/theory-02-${width}.png`});
    }
  }
  results.push('All 7 chapters render at 320/393/430px without overflow or legacy links');
  await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  const guideBounds = await page.getByRole('link',{name:'返回完整知识导览'}).boundingBox();
  const dialBounds = await page.locator('.theory-dial').boundingBox();
  assert.ok(guideBounds.y + guideBounds.height <= dialBounds.y, 'Last link must scroll clear of the dial');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.locator('.theory-dial__orbit').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=0.001));
  assert.deepEqual(errors,[]);
  results.push('Reduced motion respected; no browser runtime errors');
  await page.goto(base+'/knowledge/instruments');
  await page.locator('.instrument-library-page').waitFor();
  assert.equal(await page.locator('.mobile-bottom-nav a').count(),4);
  results.push('Theory dial replaces bottom shortcuts; other knowledge pages retain navigation');
  console.log(results.join('\n'));
} finally {
  await fs.writeFile(output+'/qa-report.json',JSON.stringify({base,results,errors},null,2));
  await browser.close();
}
