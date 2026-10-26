/** Motion + native Web Audio regression checks. No external APIs are called.
 * MOTION_BASE_URL=http://127.0.0.1:4173 node scripts/stage-interaction-qa.mjs
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
const output = path.resolve(process.env.MOTION_OUTPUT ?? 'screenshots/stage-interaction');
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
  await check('All twelve stage characters respond to real pointer clicks and sync cards', async () => {
    await go('/stage');
    for (const id of ids) {
      const target = page.locator(`[data-stage-control="${id}"]`);
      await target.scrollIntoViewIfNeeded();
      const point = await target.evaluate(el => {
        const box = el.getBoundingClientRect();
        for (let y = box.top + 2; y < box.bottom; y += 2)
          for (let x = box.left + 2; x < box.right; x += 2)
            if (document.elementFromPoint(x, y) === el) return { x, y };
        return null;
      });
      assert.ok(point, `no clickable visible area for ${id}`);
      await page.mouse.click(point.x, point.y);
      await matchingLineup(ids.filter(x => x !== id));
      await target.focus(); await page.keyboard.press('Enter'); await matchingLineup(ids);
    }
  });
  for (const width of [320, 393, 430]) await check(`Stage ${width}: aligned masks and only one fullscreen icon`, async () => {
    await page.setViewportSize({ width, height: 852 });
    await go('/stage?lineup=flute,violin,cello');
    const art = await page.locator('.stage-mobile__hero-art').boundingBox();
    for (const selector of ['.stage-mobile__character-layers', '.stage-mobile__character-controls']) {
      const layer = await page.locator(selector).boundingBox();
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(layer[key] - art[key]) < 1);
    }
    await checkIconCover();
    await page.screenshot({ path: path.join(output, `stage-${width}.png`), fullPage: true });
  });
  async function checkIconCover() {
    const art = await page.locator('.stage-mobile__hero-art').boundingBox();
    const cover = await page.locator('.stage-mobile__fullscreen, .stage-mobile__fullscreen-cover').boundingBox();
    const scale = art.width / 393;
    assert.ok(cover.x <= art.x + 318 * scale && cover.x + cover.width >= art.x + 357 * scale);
    assert.ok(cover.y <= art.y + 41 * scale && cover.y + cover.height >= art.y + 80 * scale);
    assert.equal(await page.locator('.stage-mobile__fullscreen svg').count(), 1);
  }
  for (const viewport of [{ width: 430, height: 932 }, { width: 1280, height: 720 }])
    await check(`Fullscreen ${viewport.width}: artwork cover scales and controls still work`, async () => {
      await page.setViewportSize(viewport); await go('/stage?lineup=flute');
      await page.getByRole('button', { name: '全屏查看舞台', exact: true }).click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      await checkIconCover();
      const control = page.locator('[data-stage-control="violin"]');
      await control.focus(); await page.keyboard.press('Space'); await matchingLineup(['flute', 'violin']);
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(output, `fullscreen-${viewport.width}.png`) });
      await page.getByRole('button', { name: '退出全屏舞台', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
    });
  await check('Reduced motion keeps both musician controls keyboard accessible', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await go('/stage?lineup=violin');
    await button('violin').focus(); await page.keyboard.press('Space'); await matchingLineup([]);
    assert.equal(await character('violin').locator('image').evaluate(e => getComputedStyle(e).opacity), '0.82');
    await page.locator('[data-stage-control="flute"]').focus(); await page.keyboard.press('Enter');
    await matchingLineup(['flute']);
  });
  await check('No uncaught page errors', async () => assert.deepEqual(errors, []));

} finally {
  await browser.close();
  const report = { baseURL, passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length, results, errors };
  await fs.writeFile(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
}
