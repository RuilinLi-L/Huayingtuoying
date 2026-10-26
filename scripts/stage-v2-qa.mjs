/** Real Chromium + native Web Audio E2E. Artifacts: screenshots, report and interaction video. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = process.env.STAGE_BASE_URL || 'http://127.0.0.1:4190';
const output = path.resolve(process.env.STAGE_OUTPUT || 'screenshots/stage-v2');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  window.__audio = { contexts: [], sources: [] };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) { super(...args); __audio.contexts.push(this); }
    createBufferSource() {
      const node = super.createBufferSource(), source = { node, active: false, offset: 0, context: this };
      __audio.sources.push(source);
      const start = node.start.bind(node), stop = node.stop.bind(node);
      node.start = (...args) => { source.active = true; source.offset = args[1] || 0; return start(...args); };
      node.stop = (...args) => { source.active = false; return stop(...args); };
      node.addEventListener('ended', () => { source.active = false; });
      return node;
    }
  };
});
const page = await context.newPage(); page.setDefaultTimeout(15000);
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
const audioRequests = [];
page.on('request', request => {
  if (request.url().includes('/stage-mobile/')) audioRequests.push(decodeURIComponent(new URL(request.url()).pathname.split('/').pop()));
});
const ids = ['violin', 'viola', 'cello', 'bass', 'clarinet', 'bassoon', 'flute', 'oboe', 'trumpet', 'horn', 'tuba', 'trombone'];
const card = id => page.locator(`[data-musician-id="${id}"]`);
const figure = id => page.locator(`[data-stage-character="${id}"]`);
async function go(suffix = '') {
  await page.goto(base + '/stage' + suffix);
  await page.locator('.stage-mobile__hero').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.stage-mobile img')].every(i => i.complete && i.naturalWidth > 0));
  await page.evaluate(() => document.fonts.ready);
}
async function lineup(expected) {
  await page.waitForFunction(expected => {
    const current = [...document.querySelectorAll('[data-musician-id][aria-pressed="true"]')].map(e => e.dataset.musicianId).sort();
    return JSON.stringify(current) === JSON.stringify([...expected].sort());
  }, expected);
  assert.deepEqual((await page.locator('[data-stage-character][aria-pressed="true"]').evaluateAll(es => es.map(e => e.dataset.stageCharacter))).sort(), [...expected].sort());
}
async function voices(count) {
  await page.waitForFunction(n => __audio.sources.filter(s => s.active && s.context.state === 'running').length === n, count, { timeout: 60000 });
}
async function reset() { const b = page.getByRole('button', { name: '重置全部演奏', exact: true }); if (await b.isEnabled()) await b.click(); await lineup([]); await voices(0); }
async function check(label, fn) {
  if (process.env.STAGE_FILTER && !new RegExp(process.env.STAGE_FILTER).test(label)) return;
  try { await fn(); results.push({ label, status: 'passed' }); console.log('PASS', label); }
  catch (e) { results.push({ label, status: 'failed', error: e.message }); console.error('FAIL', label, e.message); await page.screenshot({ path: `${output}/failure-${results.length}.png` }).catch(() => {}); }
}
try {
  await check('All 12 supplied originals are served unchanged with the correct musician mapping', async () => {
    const sources = JSON.parse(await fs.readFile('docs/stage-v2-sources.json', 'utf8'));
    assert.deepEqual(sources.assets.map(asset => asset.id).sort(), [...ids].sort());
    for (const asset of sources.assets) {
      const response = await context.request.get(base + '/' + asset.file.replace(/^public\//, ''));
      assert.equal(response.status(), 200, asset.id);
      assert.equal(createHash('sha256').update(await response.body()).digest('hex'), asset.sha256, `${asset.id} differs from original ZIP`);
    }
  });
  await check('Empty default, independent alpha artwork and native controls', async () => {
    await go(); await lineup([]); await voices(0);
    assert.ok(await page.getByRole('button', { name: '播放演奏', exact: true }).isDisabled());
    assert.equal(await page.locator('svg mask, .stage-mobile__character-layers, .stage-mobile__section > img').count(), 0);
    assert.equal(await page.locator('.stage-mobile__character img').count(), 12);
    assert.equal(await page.locator('.stage-mobile__fullscreen').count(), 1);
    const alpha = await page.locator('.stage-mobile__character img').evaluateAll(images => images.map(img => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0, solid = 0; for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) clear++; if (data[i] > 240) solid++; }
      return { id: img.closest('button').dataset.stageCharacter, clear: clear / (data.length / 4), solid: solid / (data.length / 4), width: c.width, height: c.height };
    }));
    for (const a of alpha) { assert.ok(a.clear > .1 && a.solid > .1, JSON.stringify(a)); assert.ok(a.width >= 1000 && a.height >= 1000); }
    await fs.writeFile(`${output}/asset-alpha-report.json`, JSON.stringify(alpha, null, 2));
    await page.screenshot({ path: `${output}/default-empty-393.png`, fullPage: true });
  });
  await check('Every card starts its voice and dims cleanly when removed', async () => {
    await go();
    for (const id of ids) {
      const requestCount = audioRequests.length;
      await card(id).click(); await lineup([id]); await voices(1); await page.waitForTimeout(650);
      const fileStem = id === 'trombone' ? 'Trumbone' : id[0].toUpperCase() + id.slice(1);
      assert.deepEqual(audioRequests.slice(requestCount), [`${fileStem}_睡美人圆舞曲.mp3`], `${id} requested the wrong voice`);
      assert.equal(await figure(id).locator('img').evaluate(e => getComputedStyle(e).filter), 'none');
      assert.equal(await card(id).locator('img').getAttribute('src'), await figure(id).locator('img').getAttribute('src'));
      await page.locator('.stage-mobile__hero').screenshot({ path: `${output}/selected-${id}.png` });
      await card(id).click(); await lineup([]); await voices(0); await page.waitForTimeout(250);
      assert.match(await figure(id).locator('img').evaluate(e => getComputedStyle(e).filter), /grayscale\(1\).*brightness\(0.55\)/);
      assert.equal(Number(await page.locator('#stage-playback-progress').inputValue()), 0);
    }
  });
  await check('Section reset preserves other audio at current progress; full reset clears all', async () => {
    await go(); await card('violin').click(); await voices(1); await card('cello').click(); await voices(2); await card('flute').click(); await voices(3);
    await page.locator('#stage-playback-progress').fill('24');
    await page.getByRole('button', { name: '重置弦乐声部' }).click(); await lineup(['flute']); await voices(1);
    await page.evaluate(() => { window.__survivor = __audio.sources.find(s => s.active); });
    await card('horn').click(); await voices(2);
    assert.ok(await page.evaluate(() => __survivor.active));
    assert.ok(Number(await page.locator('#stage-playback-progress').inputValue()) >= 24);
    await reset(); assert.equal(Number(await page.locator('#stage-playback-progress').inputValue()), 0);
    await card('violin').click(); await voices(1); assert.ok(Number(await page.locator('#stage-playback-progress').inputValue()) < 3);
  });
  await check('Manual pause persists through lineup edits; keyboard and details stay independent', async () => {
    await go(); await card('violin').click(); await voices(1);
    await page.getByRole('button', { name: '暂停演奏', exact: true }).click(); await voices(0);
    await card('cello').click(); await lineup(['violin', 'cello']); await page.waitForTimeout(300); await voices(0);
    await page.getByRole('button', { name: '查看小提琴详情', exact: true }).click(); await page.getByRole('dialog').waitFor(); await lineup(['violin', 'cello']);
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '播放演奏', exact: true }).click(); await voices(2);
    await figure('flute').focus(); await page.keyboard.press('Enter'); await lineup(['violin', 'cello', 'flute']); await voices(3);
    await reset();
  });
  await check('Reset during pending audio invalidates old requests and loading state', async () => {
    await go(); let release; const gate = new Promise(r => { release = r; }); let requested = false;
    await page.route('**/stage-mobile/Flute*', async route => { requested = true; await gate; await route.continue(); });
    try {
      await card('flute').click();
      for (let i = 0; !requested && i < 100; i++) await page.waitForTimeout(20);
      assert.ok(requested); await reset(); await card('violin').click(); await voices(1);
      release(); await page.waitForTimeout(1000); await voices(1); await lineup(['violin']);
      assert.equal(await page.locator('.stage-mobile__player').getAttribute('aria-busy'), 'false');
    } finally { release(); await page.unroute('**/stage-mobile/Flute*'); }
  });
  await check('Audio failure can retry; presets stay silent; leaving disposes sources', async () => {
    await go('?lineup=violin,cello'); await lineup(['violin', 'cello']); await voices(0);
    await reset(); await page.route('**/stage-mobile/Flute*', route => route.fulfill({ status: 503, body: 'Intentional QA failure' }));
    await card('flute').click(); await page.getByRole('alert').filter({ hasText: '音频加载失败' }).waitFor(); await voices(0);
    await page.unroute('**/stage-mobile/Flute*'); await page.getByRole('button', { name: '重试演奏', exact: true }).click(); await voices(1);
    await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '知识', exact: true }).click();
    await voices(0); assert.ok(await page.evaluate(() => __audio.contexts.every(c => c.state === 'closed')));
  });
  await check('Real pointer hits visible alpha of all 12 stage figures, skips transparent overlap', async () => {
    await go();
    const targets = await page.locator('.stage-mobile__character img').evaluateAll(images => {
      const layers = images.map(img => {
        const box = img.getBoundingClientRect(), scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
        const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        return { id: img.closest('button').dataset.stageCharacter, x: box.x + (box.width - width) / 2, y: box.bottom - height, width, height, scale, pw: c.width, pixels: ctx.getImageData(0, 0, c.width, c.height).data };
      });
      const opaque = (l, x, y) => { const px = Math.floor((x - l.x) / l.scale), py = Math.floor((y - l.y) / l.scale); return x >= l.x && y >= l.y && x < l.x + l.width && y < l.y + l.height && l.pixels[(py * l.pw + px) * 4 + 3] > 48; };
      const targets = {};
      for (let y = 0; y < innerHeight; y += 2) for (let x = 0; x < innerWidth; x += 2) {
        const hit = [...layers].reverse().find(l => opaque(l, x, y));
        if (hit && !targets[hit.id]) targets[hit.id] = { x, y };
      }
      return targets;
    });
    for (const id of ids) {
      assert.ok(targets[id], `no visible alpha for ${id}`);
      await page.mouse.click(targets[id].x, targets[id].y); await lineup([id]); await voices(1);
      await page.mouse.click(targets[id].x, targets[id].y); await lineup([]); await voices(0);
    }
    const scene = await page.locator('.stage-mobile__hero-scene').boundingBox();
    await page.mouse.click(scene.x + scene.width / 2, scene.y + scene.height * .2); await lineup([]);
  });
  await check('Partial failure retries without pausing surviving audio; rapid changes use latest lineup', async () => {
    await go(); await card('violin').click(); await voices(1);
    await page.route('**/stage-mobile/Cello*', route => route.fulfill({ status: 503, body: 'Intentional partial failure' }));
    await card('cello').click(); await page.getByRole('alert').filter({ hasText: '音频加载失败' }).waitFor(); await voices(1);
    await page.evaluate(() => { window.__survivor = __audio.sources.find(s => s.active); });
    await page.unroute('**/stage-mobile/Cello*'); await page.getByRole('button', { name: '重试演奏' }).click(); await voices(2);
    assert.ok(await page.evaluate(() => __survivor.active));
    await page.evaluate(() => { for (const id of ['flute', 'horn', 'flute', 'violin', 'horn']) document.querySelector(`[data-musician-id="${id}"]`).click(); });
    await lineup(['cello']); await voices(1);
  });
  await check('Section reset and pause during pending loads cannot revive cancelled voices', async () => {
    await go(); await card('violin').click(); await voices(1);
    let release; const gate = new Promise(r => { release = r; }); let requested = false;
    await page.route('**/stage-mobile/Flute*', async route => { requested = true; await gate; await route.continue(); });
    try {
      await card('flute').click();
      for (let i = 0; !requested && i < 100; i++) await page.waitForTimeout(20);
      assert.ok(requested);
      await page.getByRole('button', { name: '重置木管声部' }).click(); await lineup(['violin']); await voices(1);
      release(); await page.waitForTimeout(700); await voices(1);
    } finally { release(); await page.unroute('**/stage-mobile/Flute*'); }
    await reset();
    let finish; const wait = new Promise(r => { finish = r; });
    await page.route('**/stage-mobile/Horn*', async route => { await wait; await route.continue(); });
    try {
      await card('horn').click(); await page.getByRole('button', { name: '取消加载并暂停' }).click();
      finish(); await page.waitForTimeout(1000); await lineup(['horn']); await voices(0);
      await page.getByRole('button', { name: '播放演奏', exact: true }).click(); await voices(1);
    } finally { finish(); await page.unroute('**/stage-mobile/Horn*'); }
  });
  for (const width of [320, 393, 430]) await check(`Responsive ${width}: card edges, labels and distinct sprites`, async () => {
    await page.setViewportSize({ width, height: 852 }); await go('?lineup=violin,cello,flute');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const id of ids) {
      const cardBox = await card(id).boundingBox(), slot = await card(id).locator('..').boundingBox();
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(cardBox[key] - slot[key]) < 1, `${id} misaligned ${key}`);
    }
    await page.screenshot({ path: `${output}/stage-${width}.png`, fullPage: true });
  });
  for (const viewport of [{ width: 430, height: 932 }, { width: 1280, height: 720 }]) await check(`Fullscreen ${viewport.width}: single native control, independent selection`, async () => {
    await page.setViewportSize(viewport); await go('?lineup=violin,flute');
    await page.getByRole('button', { name: '全屏查看舞台' }).click(); await page.waitForFunction(() => !!document.fullscreenElement);
    await figure('cello').focus(); await page.keyboard.press('Space'); await lineup(['violin', 'flute', 'cello']); await voices(3);
    await page.locator('.stage-mobile__fullscreen').focus(); await page.waitForTimeout(650);
    assert.equal(await page.getByRole('button', { name: '退出全屏舞台' }).count(), 1);
    await page.screenshot({ path: `${output}/fullscreen-${viewport.width}.png` });
    await page.getByRole('button', { name: '退出全屏舞台' }).click(); await page.waitForFunction(() => !document.fullscreenElement);
  });
  await check('Reduced motion preserves selection and immediate reset', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await go(); await card('violin').focus(); await page.keyboard.press('Space');
    await lineup(['violin']); await voices(1);
    assert.equal(await figure('violin').locator('img').evaluate(e => getComputedStyle(e).animationName), 'none');
    await figure('violin').focus(); await page.keyboard.press('Space'); await lineup([]); await voices(0);
    assert.match(await figure('violin').locator('img').evaluate(e => getComputedStyle(e).filter), /grayscale\(1\).*brightness\(0.55\)/);
    await reset(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
  await check('No uncaught browser errors', async () => assert.deepEqual(errors, []));
  await check('Save interaction walkthrough video', async () => {
    const recording = await browser.newContext({ viewport: { width: 393, height: 852 }, recordVideo: { dir: output, size: { width: 393, height: 852 } } });
    const p = await recording.newPage(); await p.goto(base + '/stage');
    await p.waitForFunction(() => [...document.querySelectorAll('.stage-mobile img')].every(i => i.complete && i.naturalWidth));
    await p.waitForTimeout(800);
    for (const id of ['violin', 'cello', 'flute']) { await p.locator(`[data-musician-id=${id}]`).click(); await p.waitForTimeout(1000); }
    await p.locator('.stage-mobile__hero').scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: '重置弦乐声部' }).click(); await p.waitForTimeout(1000);
    await p.getByRole('button', { name: '重置全部演奏' }).click(); await p.waitForTimeout(1000);
    const video = p.video(); await recording.close(); const temporaryVideo = await video.path();
    await video.saveAs(`${output}/stage-walkthrough.webm`); await fs.unlink(temporaryVideo);
  });
} finally {
  await browser.close();
  const report = { base, results, errors, passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length };
  await fs.writeFile(`${output}/qa-report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
  if (report.failed) process.exitCode = 1;
}
