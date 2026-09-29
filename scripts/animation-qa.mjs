/** Motion + native Web Audio regression checks. No external APIs are called.
 * MOTION_BASE_URL=http://127.0.0.1:4173 node scripts/animation-qa.mjs
 * MOTION_RECORD=1 also saves a short visual walkthrough (Playwright FFmpeg required).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));
}
const baseURL = process.env.MOTION_BASE_URL ?? 'http://127.0.0.1:4173';
const output = path.resolve(process.env.MOTION_OUTPUT ?? 'screenshots/animation-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await context.addInitScript(() => {
  const q = window.__motion = { contexts: [], sources: [] };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) { super(...args); q.contexts.push(this); }
    createBufferSource() {
      const node = super.createBufferSource();
      const item = { context: this, active: false, offset: 0, node };
      q.sources.push(item);
      const start = node.start.bind(node), stop = node.stop.bind(node);
      node.start = (...args) => { item.active = true; item.offset = args[1] ?? 0; return start(...args); };
      node.stop = (...args) => { item.active = false; return stop(...args); };
      node.addEventListener('ended', () => { item.active = false; });
      return node;
    }
  };
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const results = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const ids = ['violin', 'viola', 'cello', 'bass', 'clarinet', 'bassoon', 'flute', 'oboe', 'trumpet', 'horn', 'tuba', 'trombone'];
const button = id => page.locator(`[data-musician-id="${id}"]`);
const character = id => page.locator(`[data-stage-character="${id}"]`);
async function go(route) { await page.goto(baseURL + route); await page.locator('.route-fallback').waitFor({ state: 'detached' }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(450); }
async function check(label, fn) {
  if (process.env.MOTION_FILTER && !new RegExp(process.env.MOTION_FILTER).test(label)) return;
  try { await fn(); results.push({ label, status: 'passed' }); console.log(`PASS ${label}`); }
  catch (e) { results.push({ label, status: 'failed', message: e.message }); console.error(`FAIL ${label}: ${e.message}`); await page.screenshot({ path: path.join(output, `failure-${results.length}.png`) }).catch(() => {}); }
}
async function voices(count) { await page.waitForFunction(n => __motion.sources.filter(s => s.active && s.context.state === 'running').length === n, count, { timeout: 60000 }); }
async function play() { await page.getByRole('button', { name: '播放演奏', exact: true }).click(); await page.getByRole('button', { name: '暂停演奏', exact: true }).waitFor({ timeout: 60000 }); }
const progress = () => page.locator('#stage-playback-progress').inputValue().then(Number);
const dialLink = id => page.locator('.theory-dial').getByRole('link', { name: new RegExp(`第 ${id} 章`) });
async function matchingLineup(expected) {
  assert.deepEqual((await page.locator('[data-musician-id][aria-pressed="true"]').evaluateAll(es => es.map(e => e.dataset.musicianId))).sort(), [...expected].sort());
  assert.deepEqual((await page.locator('[data-stage-character][data-active="true"]').evaluateAll(es => es.map(e => e.dataset.stageCharacter))).sort(), [...expected].sort());
}
try {
  await check('All twelve artwork masks and independent detail controls', async () => {
    await go('/stage'); await matchingLineup(ids);
    for (const id of ids) {
      await button(id).click(); await matchingLineup(ids.filter(x => x !== id));
      assert.equal(await page.getByRole('dialog').count(), 0);
      await page.waitForTimeout(280);
      assert.ok(Number(await character(id).locator('image').evaluate(e => getComputedStyle(e).opacity)) > 0.8);
      await page.locator('.stage-mobile__hero').screenshot({ path: path.join(output, `mask-${id}.png`) });
      await button(id).click(); await matchingLineup(ids);
    }
    await page.getByRole('button', { name: '查看小提琴详情', exact: true }).click();
    await page.getByRole('dialog').waitFor(); await matchingLineup(ids);
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
  await check('240ms mask fade, addition pulse, rapid clicks use latest lineup', async () => {
    await go('/stage');
    await button('cello').evaluate(e => e.click()); await page.waitForTimeout(80);
    const mid = Number(await character('cello').locator('image').evaluate(e => getComputedStyle(e).opacity));
    assert.ok(mid > 0 && mid < 0.82, `no intermediate fade: ${mid}`);
    await page.locator('.stage-mobile__hero').screenshot({ path: path.join(output, 'stage-mid-transition.png') });
    await button('cello').evaluate(e => e.click());
    await character('cello').locator('.stage-mobile__character-pulse').waitFor();
    await page.evaluate(() => { for (const id of ['violin', 'flute', 'horn', 'violin']) document.querySelector(`[data-musician-id="${id}"]`).click(); });
    await matchingLineup(ids.filter(id => !['flute', 'horn'].includes(id)));
    await page.waitForTimeout(650); assert.equal(await page.locator('.stage-mobile__character-pulse').count(), 0);
  });
  await check('Native stems join at current offset, preserve other sources, empty lineup pauses', async () => {
    await go('/stage?lineup=violin,cello'); await play(); await voices(2);
    await page.locator('#stage-playback-progress').fill('24'); await page.waitForTimeout(100);
    await button('violin').click(); await voices(1);
    await page.evaluate(() => { window.__survivor = __motion.sources.find(s => s.active); });
    await button('flute').click(); await voices(2);
    assert.ok(await progress() >= 24);
    assert.ok(await page.evaluate(() => __survivor.active), 'existing source restarted');
    assert.ok(await page.evaluate(() => __motion.sources.filter(s => s.active).every(s => s.offset >= 24)));
    await page.evaluate(() => { for (const e of document.querySelectorAll('[data-musician-id][aria-pressed="true"]')) e.click(); });
    await voices(0); await matchingLineup([]);
    await page.waitForTimeout(250); const paused = await progress();
    await page.waitForTimeout(350); assert.equal(await progress(), paused);
    await button('horn').click(); await voices(0);
    assert.equal(await progress(), paused);
    await play(); await voices(1); assert.ok(await progress() >= paused);
    await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '知识', exact: true }).click();
    await voices(0); assert.ok(await page.evaluate(() => __motion.contexts.every(c => c.state === 'closed')));
  });
  await check('Selection during pending initial audio load cannot revive removed voice', async () => {
    await go('/stage?lineup=flute'); let release; const gate = new Promise(r => { release = r; }); let requested = false;
    await page.route('**/stage-mobile/Flute*', async route => { requested = true; await gate; await route.continue(); });
    try {
      await page.getByRole('button', { name: '播放演奏', exact: true }).click();
      await assert.doesNotReject(async () => { for (let i = 0; !requested && i < 100; i++) await page.waitForTimeout(20); assert.ok(requested); });
      await button('flute').click(); await button('violin').click();
      release(); await voices(1); await matchingLineup(['violin']);
      await page.waitForTimeout(500); await voices(1);
      await button('violin').click(); await voices(0);
    } finally { release(); await page.unroute('**/stage-mobile/Flute*'); }
  });
  await check('Partial audio failure reports error while remaining stem plays', async () => {
    await go('/stage?lineup=violin,cello');
    await page.route('**/stage-mobile/Cello*', route => route.fulfill({ status: 503, body: 'QA intentional failure' }));
    try { await play(); await voices(1); await page.getByRole('alert').filter({ hasText: '音频加载失败' }).waitFor(); await matchingLineup(['violin', 'cello']); }
    finally { await page.unroute('**/stage-mobile/Cello*'); }
  });
  await check('Dial survives chapter changes and rotates through intermediate angles', async () => {
    await go('/knowledge/theory/01');
    await page.evaluate(() => { window.__originalDial = document.querySelector('.theory-dial__orbit'); });
    await dialLink('02').evaluate(e => e.click()); await page.waitForTimeout(80);
    const angle = await page.locator('.theory-dial__orbit').evaluate(e => { const m = new DOMMatrix(getComputedStyle(e).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI; });
    assert.ok(angle < -1 && angle > -32, `not rotating: ${angle}`);
    await page.screenshot({ path: path.join(output, 'theory-mid-transition.png') });
    await dialLink('03').evaluate(e => e.click()); await page.waitForTimeout(480);
    assert.ok(await page.evaluate(() => __originalDial === document.querySelector('.theory-dial__orbit')));
    assert.ok(page.url().endsWith('/03'));
    await page.goBack(); await page.waitForTimeout(480); assert.ok(page.url().endsWith('/02'));
    await page.goForward(); await page.waitForTimeout(480); assert.ok(page.url().endsWith('/03'));
    await page.reload(); await page.waitForTimeout(500);
    assert.equal(await page.locator('.theory-dial').getAttribute('data-active-topic'), '03');
  });
  for (const width of [320, 393, 430]) await check(`Phone ${width}: masks align, dial links reachable, bottom content unobscured`, async () => {
    await page.setViewportSize({ width, height: 852 });
    await go('/stage?lineup=violin,cello');
    const layers = await page.locator('.stage-mobile__character-layers').boundingBox();
    const art = await page.locator('.stage-mobile__hero-art').boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(layers[key] - art[key]) < 1);
    await page.screenshot({ path: path.join(output, `stage-${width}.png`) });
    await go('/knowledge/theory/01');
    for (const id of ['03', '01', '02']) { await dialLink(id).click(); await page.waitForTimeout(480); assert.equal(await page.locator('.theory-dial').getAttribute('data-active-topic'), id); }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const dial = await page.locator('.theory-dial').boundingBox(), nav = await page.locator('.mobile-bottom-nav').boundingBox();
    assert.ok(dial.y + dial.height <= nav.y);
    await page.screenshot({ path: path.join(output, `theory-${width}.png`) });
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    const bottom = await page.locator('.theory-mobile__legacy').boundingBox();
    assert.ok(bottom.y + bottom.height < dial.y, 'last content behind dial');
    const dialAfter = await page.locator('.theory-dial').boundingBox(); assert.equal(dial.y, dialAfter.y);
    await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '首页', exact: true }).click();
    await page.locator('.theory-dial').waitFor({ state: 'detached' });
  });
  await check('Direction-aware route and classification motion; no stale dial after leaving', async () => {
    await page.setViewportSize({ width: 393, height: 852 }); await go('/knowledge/instruments');
    await page.getByRole('button', { name: '弦乐', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.instrument-library-page')?.dataset.sectionMotion === 'forward');
    assert.equal(await page.locator('.instrument-library-page').getAttribute('data-section-motion'), 'forward');
    await page.getByRole('button', { name: '木管', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.instrument-library-page')?.dataset.sectionMotion === 'backward');
    assert.equal(await page.locator('.instrument-library-page').getAttribute('data-section-motion'), 'backward');
    await page.locator('a[href*="/knowledge/instruments/flute"]').first().click(); await page.waitForTimeout(400);
    assert.equal(await page.locator('main').getAttribute('data-motion-direction'), 'forward');
    await page.locator('.instrument-detail-page__back').click(); await page.waitForTimeout(400);
    assert.equal(await page.locator('main').getAttribute('data-motion-direction'), 'backward');
  });
  await check('Reduced motion preserves final state and keyboard-accessible controls', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await go('/knowledge/theory/01');
    await dialLink('02').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.theory-dial')?.dataset.activeTopic === '02');
    assert.equal(await page.locator('.theory-dial').getAttribute('data-active-topic'), '02');
    assert.ok(parseFloat(await page.locator('.theory-dial__orbit').evaluate(e => getComputedStyle(e).transitionDuration)) < 0.001);
    await go('/stage'); await button('violin').focus(); await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('[data-musician-id=violin]')?.getAttribute('aria-pressed') === 'false');
    assert.equal(await button('violin').getAttribute('aria-pressed'), 'false');
    assert.equal(await character('violin').locator('image').evaluate(e => getComputedStyle(e).opacity), '0.82');
    assert.equal(await page.locator('main').evaluate(e => e.getAnimations().length), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
  await check('No uncaught page errors', async () => assert.deepEqual(errors, []));
  if (process.env.MOTION_RECORD === '1') await check('Record stage, classification and dial walkthrough', async () => {
    const recording = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, recordVideo: { dir: output, size: { width: 393, height: 852 } } });
    const demo = await recording.newPage();
    await demo.goto(baseURL + '/stage'); await demo.waitForTimeout(1000);
    for (const id of ['cello', 'viola', 'cello']) { await demo.locator(`[data-musician-id="${id}"]`).click(); await demo.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await demo.waitForTimeout(900); }
    await demo.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '知识', exact: true }).click(); await demo.waitForTimeout(800);
    for (const name of ['铜管', '弦乐', '木管']) { await demo.getByRole('button', { name, exact: true }).click(); await demo.waitForTimeout(700); }
    await demo.getByRole('navigation', { name: '知识分类' }).getByRole('link', { name: '乐理', exact: true }).click(); await demo.waitForTimeout(800);
    for (const id of ['02', '03', '01', '03', '02']) { await demo.locator('.theory-dial').getByRole('link', { name: new RegExp(`第 ${id} 章`) }).click(); await demo.waitForTimeout(800); }
    await demo.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })); await demo.waitForTimeout(1300);
    const video = demo.video(); await recording.close(); await video.saveAs(path.join(output, 'interaction-walkthrough.webm')); await video.delete();
  });
} finally {
  await browser.close();
  const report = { baseURL, passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length, results, errors };
  await fs.writeFile(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
}
