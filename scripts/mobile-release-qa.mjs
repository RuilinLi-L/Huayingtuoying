/** Cross-module release QA against a built site. Never calls real music APIs.
 * RELEASE_BASE_URL=http://127.0.0.1:4173 node scripts/mobile-release-qa.mjs
 * RELEASE_SCREENSHOT_DIR overrides output; RELEASE_SMOKE_ONLY=1 skips lifecycle tests.
 * Native Web Audio / HTMLMediaElement are observed, not replaced. Camera/recorder
 * are controlled mocks; this cannot certify physical iPhone permissions or WebAR.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch {
  playwright = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const baseUrl = (process.env.RELEASE_BASE_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = path.resolve(process.env.RELEASE_SCREENSHOT_DIR ?? path.join(root, 'screenshots/release-qa'));
await fs.mkdir(output, { recursive: true });
const results = [], diagnostics = [], requests = [], warnings = [];
const manualChecks = ['真实 iPhone Safari microphone / 权限及录音格式', '真实 iPhone camera / 权限与指示灯', '真实 WebAR / MindAR 识别追踪与退出', '实体 NFC / QR 扫描', '真实 Suno（本脚本全部 mock）', '长时间后台运行、锁屏、来电、发热', '真实软键盘和 safe-area'];
const core = [['/', 'home', '首页'], ['/stage', 'stage', '舞台'], ['/knowledge/instruments', 'knowledge', '知识'], ['/knowledge/theory/01', 'theory', '知识'], ['/compose', 'compose', '编创']];
const deepLinks = ['/stage', '/knowledge/instruments', '/knowledge/instruments/violin?section=strings', '/knowledge/theory/02', '/compose', '/demo/base', '/entry/violin-dialogue', '/entry/flute-color', '/entry/ensemble-stage', '/experience/violin-dialogue', '/experience/flute-color', '/experience/ensemble-stage', '/learn/fundamentals'];
const chrome = process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await playwright.chromium.launch({ headless: true, ...(await fs.access(chrome).then(() => true, () => false) ? { executablePath: chrome } : {}), args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
let mode = 'processing', statusCalls = 0;
await context.route('**/api/music/**', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/music/compose') return route.fulfill({ json: { taskId: 'release-mock' } });
  if (url.pathname === '/api/music/status') {
    statusCalls++;
    if (mode === 'pending') return; // Deliberately pending fetch; navigation must abort it.
    return route.fulfill({ json: { taskId: 'release-mock', status: mode,
      tracks: mode === 'complete' ? [1, 2].map(id => ({ id: String(id), title: `Release result ${id}`, audioUrl: '/assets/audio/violin-harmony.wav' })) : [], message: 'Release QA mock' } });
  }
  return route.fulfill({ status: 418, json: { message: 'Unexpected music API blocked by release QA' } });
});
await context.addInitScript(() => {
  const q = window.__release = { contexts: [], sources: [], media: [], streams: [], recorders: [], revoked: [], aborts: 0, overlaps: [], fetches: [] };
  const NativeContext = window.AudioContext;
  window.AudioContext = class extends NativeContext {
    constructor(...args) { super(...args); q.contexts.push(this); }
    createBufferSource() {
      const node = super.createBufferSource();
      const item = { context: this, node, active: false, offset: 0, starts: 0 };
      q.sources.push(item);
      const start = node.start.bind(node), stop = node.stop.bind(node);
      node.start = (...args) => { item.active = true; item.offset = args[1] ?? 0; item.when = args[0]; item.starts++; return start(...args); };
      node.stop = (...args) => { item.active = false; return stop(...args); };
      node.addEventListener('ended', () => { item.active = false; });
      return node;
    }
  };
  for (const method of ['play', 'pause']) {
    const original = HTMLMediaElement.prototype[method];
    HTMLMediaElement.prototype[method] = function (...args) {
      if (!q.media.includes(this)) q.media.push(this);
      return original.apply(this, args);
    };
  }
  const revoke = URL.revokeObjectURL;
  URL.revokeObjectURL = url => { q.revoked.push(url); return revoke(url); };
  const abort = AbortController.prototype.abort;
  AbortController.prototype.abort = function (...args) { q.aborts++; return abort.apply(this, args); };
  const fetchOriginal = window.fetch;
  window.fetch = (input, options) => {
    const item = { url: String(input), aborted: false };
    q.fetches.push(item);
    options?.signal?.addEventListener('abort', () => { item.aborted = true; });
    return fetchOriginal(input, options);
  };
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async constraints => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
    canvas.getContext('2d').fillRect(0, 0, 16, 16);
    const stream = canvas.captureStream(1);
    q.streams.push({ kind: constraints.audio ? 'mic' : 'camera', stream });
    return stream;
  } });
  window.MediaRecorder = class {
    static isTypeSupported() { return false; }
    constructor(stream) { this.stream = stream; this.state = 'inactive'; this.mimeType = 'audio/wav'; this.stops = 0; q.recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.stops++; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['fixture'], { type: 'audio/wav' }) }); this.onstop?.(); }, 20); }
  };
  setInterval(() => {
    const systems = new Set();
    q.sources.filter(s => s.active && s.context.state === 'running').forEach(s => systems.add(`context-${q.contexts.indexOf(s.context)}`));
    q.media.filter(m => m.tagName === 'AUDIO' && !m.paused && !m.ended).forEach(m => systems.add(m.src.startsWith('blob:') ? 'compose-preview' : m.getAttribute('aria-label')?.startsWith('试听Release') ? 'compose-results' : 'knowledge'));
    if (systems.size > 1) q.overlaps.push({ route: location.pathname, systems: [...systems] });
  }, 20);
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
let label = '';
page.on('pageerror', e => diagnostics.push({ type: 'pageerror', label, route: page.url(), message: e.message }));
page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) diagnostics.push({ type: `console.${msg.type()}`, label, route: page.url(), message: msg.text() }); });
page.on('request', r => requests.push({ label, url: r.url(), type: r.resourceType() }));
page.on('response', r => { if (r.status() >= 400) diagnostics.push({ type: 'http', label, url: r.url(), status: r.status() }); });
page.on('requestfailed', r => diagnostics.push({ type: 'requestfailed', label, url: r.url(), message: r.failure()?.errorText }));
async function check(name, fn) {
  if (process.env.RELEASE_FILTER && !new RegExp(process.env.RELEASE_FILTER).test(name)) return;
  label = name;
  try { await fn(); results.push({ label: name, status: 'passed' }); console.log(`PASS ${name}`); }
  catch (e) { results.push({ label: name, status: 'failed', message: e.message }); console.error(`FAIL ${name}: ${e.message}`); await page.screenshot({ path: path.join(output, `failure-${results.length}.png`) }).catch(() => {}); }
}
async function settled() { await page.locator('main').waitFor(); await page.locator('.route-fallback').waitFor({ state: 'detached' }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400); }
async function go(route) { const response = await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded' }); assert.equal(response.status(), 200); await settled(); assert.equal(new URL(page.url()).pathname, route.split('?')[0]); }
async function nav(name) { await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name, exact: true }).click(); await settled(); }
async function silent() {
  await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(() => ({ voices: __release.sources.filter(s => s.active && s.context.state !== 'closed').length, media: __release.media.filter(m => m.tagName === 'AUDIO' && !m.paused && !m.ended).length, overlaps: __release.overlaps })), { voices: 0, media: 0, overlaps: [] });
}
async function voices(n) { await page.waitForFunction(n => __release.sources.filter(s => s.active && s.context.state === 'running').length === n, n, { timeout: 60000 }); }
const progress = () => page.locator('#stage-playback-progress').inputValue().then(Number);
async function stagePlay() { await page.getByRole('button', { name: '播放演奏', exact: true }).click(); await page.getByRole('button', { name: '暂停演奏', exact: true }).waitFor({ timeout: 90000 }); }
async function upload() { await page.locator('input[type=file]').setInputFiles(path.join(root, 'public/assets/audio/violin-harmony.wav')); await page.getByRole('button', { name: '播放当前动机', exact: true }).waitFor(); }
async function layout() {
  const r = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-bottom-nav').getBoundingClientRect();
    const fixed = [...document.querySelectorAll('main *')].filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 0).map(e => ({ cls: e.className, bottom: e.getBoundingClientRect().bottom }));
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, nav: { top: nav.top, bottom: nav.bottom, left: nav.left, right: nav.right }, height: innerHeight, fixed };
  });
  assert.ok(r.scrollWidth <= r.width + 1, JSON.stringify(r));
  assert.ok(r.nav.left >= -1 && r.nav.right <= r.width + 1 && r.nav.bottom <= r.height, JSON.stringify(r));
  for (const f of r.fixed) assert.ok(f.bottom <= r.nav.top + 1, `fixed control collision: ${JSON.stringify(f)}`);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const controls = await page.locator('main button:visible, main a:visible, main textarea:visible').all();
  if (controls.length) { const box = await controls.at(-1).boundingBox(); assert.ok(box.y + box.height <= r.nav.top + 1, 'last control hidden by BottomNav at page end'); }
  await page.evaluate(() => scrollTo(0, 0));
}
try {
  for (const width of [320, 360, 393, 430]) {
    await page.setViewportSize({ width, height: 852 });
    for (const [route, name, tab] of core) await check(`${width}px ${route} layout / active nav`, async () => {
      await go(route); await layout();
      assert.equal(await page.locator('.mobile-bottom-nav [aria-current=page]').textContent(), tab);
      assert.equal(await page.locator('button button, a button, button a').count(), 0);
      if (width === 393) await page.screenshot({ path: path.join(output, `release-${name}-393.png`) });
    });
  }
  await page.setViewportSize({ width: 393, height: 852 });
  for (const route of deepLinks) await check(`deep link + refresh ${route}`, async () => { await go(route); assert.equal(await page.locator('.not-found').count(), 0); assert.equal((await page.reload({ waitUntil: 'domcontentloaded' })).status(), 200); await settled(); assert.equal(await page.locator('.not-found').count(), 0); });
  await check('Vercel unknown-page fallback excludes API and static assets', async () => {
    const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
    const catchAll = config.rewrites.find(r => r.source.includes('(?!'));
    assert.ok(catchAll, 'Vercel has no unknown-page SPA fallback');
    const re = new RegExp(`^${catchAll.source}$`);
    assert.ok(re.test('/this-route-does-not-exist'));
    for (const url of ['/api/music/compose', '/api/music/status', '/assets/ui/missing.png']) assert.equal(re.test(url), false);
    assert.equal(catchAll.destination, '/index.html');
  });
  await check('Catalog static resources exist in dist and return non-HTML content', async () => {
    const catalogCode = `import * as entries from './src/data/entries.ts'; import * as instruments from './src/data/instrumentEncyclopedia.ts'; import * as orchestra from './src/data/orchestraDemo.ts'; import * as sleeping from './src/data/sleepingBeauty.ts'; import * as theory from './src/data/theoryTopics.ts'; const urls = new Set(); function walk(x) { if (typeof x === 'string' && x.startsWith('/assets/')) urls.add(x); else if (x && typeof x === 'object') Object.values(x).forEach(walk); } [entries,instruments,orchestra,sleeping,theory].forEach(walk); console.log(JSON.stringify([...urls]));`;
    const urls = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', catalogCode], { cwd: root, encoding: 'utf8' }));
    // Include glTF sidecar buffers and textures: a successful .gltf request alone is insufficient.
    for (const url of [...urls]) if (url.endsWith('.gltf')) {
      const gltf = JSON.parse(await fs.readFile(path.join(root, 'dist', url), 'utf8'));
      for (const part of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) if (part.uri && !part.uri.startsWith('data:')) urls.push(path.posix.join(path.posix.dirname(url), part.uri));
    }
    for (const url of new Set(urls)) {
      const size = (await fs.stat(path.join(root, 'dist', url))).size; assert.ok(size > 0, url);
      const response = await context.request.get(baseUrl + url, { headers: { Range: 'bytes=0-0' } });
      assert.ok([200, 206].includes(response.status()), `${url}: ${response.status()}`);
      assert.ok(!response.headers()['content-type']?.includes('text/html'), `${url} silently fell back to SPA HTML`);
      await response.dispose();
    }
  });
  await check('unknown route renders project NotFound', async () => { await go('/this-route-does-not-exist'); await page.locator('.not-found').waitFor(); });
  await check('Home → Stage → Knowledge → Compose → Home', async () => { await go('/'); for (const name of ['舞台', '知识', '编创', '首页']) { await nav(name); assert.equal(await page.locator('.mobile-bottom-nav [aria-current=page]').textContent(), name); } });
  for (const route of ['/', '/stage', '/knowledge/instruments/violin', '/compose']) await check(`first-load request budget ${route}`, async () => {
    const start = requests.length; await go(route); await page.waitForTimeout(700);
    const list = requests.slice(start).map(r => r.url);
    assert.equal(list.filter(u => /\/api\/music\//.test(u)).length, 0);
    assert.equal(list.filter(u => /\.(glb|mind)(\?|$)|mindar|aframe/i.test(u)).length, 0);
    assert.equal(list.filter(u => /\/assets\/audio\//.test(u)).length, 0);
  });
  await check('Home experience cards, filters and scan link', async () => {
    await go('/'); assert.deepEqual(await page.locator('.home-experience-card').evaluateAll(es => es.map(e => e.getAttribute('href'))), ['/compose', '/stage']);
    for (const name of ['弦乐声部', '木管声部', '铜管声部']) { await page.getByRole('button', { name, exact: true }).click(); assert.equal(await page.locator('.home-symphony').count(), 2); }
    await page.getByRole('link', { name: '打开展签与扫码入口' }).click(); await settled(); assert.equal(new URL(page.url()).pathname, '/entry/violin-dialogue');
  });
  await check('Entry NFC / QR query and return paths', async () => {
    for (const source of ['nfc', 'qr']) { await go(`/entry/violin-dialogue?source=${source}&autostart=1`); const href = await page.getByRole('link', { name: '进入 AR 场景', exact: true }).getAttribute('href'); assert.ok(href.includes(`source=${source}`) && href.includes('autostart=1')); }
    await go('/experience/violin-dialogue'); await page.getByRole('link', { name: '返回展签', exact: true }).click(); await settled(); assert.equal(new URL(page.url()).pathname, '/entry/violin-dialogue');
  });
  await check('Theory 01 → 02 scroll top; Knowledge return path', async () => {
    await go('/knowledge/theory/01'); await page.getByRole('link', { name: '下一章 · 02', exact: true }).click(); await settled(); await page.waitForFunction(() => scrollY === 0);
    await nav('知识'); await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await nav('首页'); await nav('知识'); assert.equal(await page.locator('.instrument-library-page').count(), 1);
  });
  await check('Compose inputs scroll above BottomNav at reduced viewport height', async () => {
    await go('/compose'); await page.locator('.cm-advanced summary').click(); await page.setViewportSize({ width: 393, height: 480 });
    for (const input of await page.locator('textarea, input[type=text]').all()) { await input.focus(); await input.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); const box = await input.boundingBox(); const navBox = await page.locator('.mobile-bottom-nav').boundingBox(); assert.ok(box.y >= 0 && box.y + box.height < navBox.y, await input.getAttribute('name') ?? 'input obscured'); }
    await page.setViewportSize({ width: 393, height: 852 });
  });
  await check('Keyboard focus and reduced motion smoke', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [route] of core) { await go(route); await page.keyboard.press('Tab'); const focused = await page.evaluate(() => { const e = document.activeElement; const c = getComputedStyle(e); return { tag: e.tagName, outline: c.outlineStyle, width: c.outlineWidth }; }); assert.notEqual(focused.tag, 'BODY'); assert.notEqual(focused.outline, 'none'); assert.notEqual(focused.width, '0px'); assert.equal(await page.locator('.mobile-shell__main').evaluate(e => getComputedStyle(e).animationName), 'none'); }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
  if (!process.env.RELEASE_SMOKE_ONLY) {
    await check('Stage delayed audio resume → Home cannot revive disposed session', async () => {
      await go('/stage');
      await page.evaluate(async () => {
        const ctx = __release.contexts.at(-1); await ctx.suspend();
        ctx.resume = () => new Promise(resolve => { window.__releaseResume = resolve; });
      });
      await page.getByRole('button', { name: '播放演奏', exact: true }).click();
      await page.waitForFunction(() => !!window.__releaseResume);
      await nav('首页'); await page.evaluate(() => __releaseResume());
      await page.waitForTimeout(2500); await silent();
      assert.ok(await page.evaluate(() => __release.contexts.every(c => c.state === 'closed')), 'disposed Stage created another AudioContext');
    });
    await check('Stage pending audio downloads → Home stays silent', async () => {
      await go('/stage'); let releaseDownloads;
      const gate = new Promise(resolve => { releaseDownloads = resolve; });
      await page.route('**/stage-mobile/**', async route => { await gate; await route.continue(); });
      try {
        await page.getByRole('button', { name: '播放演奏', exact: true }).click();
        await page.waitForFunction(() => __release.fetches.some(f => f.url.includes('/stage-mobile/')));
        await nav('首页'); releaseDownloads();
        await page.waitForTimeout(1200); await silent();
        assert.ok(await page.evaluate(() => __release.contexts.every(c => c.state === 'closed')));
      } finally { releaseDownloads(); await page.unroute('**/stage-mobile/**'); }
    });
    await check('Stage scan entry opens dedicated AR page without acquiring camera', async () => {
      await go('/stage');
      await page.locator('.stage-mobile__actions summary').click();
      await page.getByRole('link', { name: '扫描体验 · 双簧管 AR', exact: true }).click();
      await page.getByRole('button', { name: '开始扫描', exact: true }).waitFor();
      assert.ok(page.url().endsWith('/experience/oboe-player'));
      assert.ok(await page.evaluate(() => __release.streams.every(s => s.stream.getTracks().every(t => t.readyState === 'ended'))));
    });
    await check('Home play / pause / resume / switch → Stage cleanup', async () => {
      await go('/'); const buttons = page.locator('.home-symphony__play'); await buttons.nth(0).click(); await voices(1); await buttons.nth(0).click(); await voices(0); await buttons.nth(0).click(); await voices(1); await buttons.nth(1).click(); await voices(1);
      await nav('舞台'); await silent(); assert.ok(await page.evaluate(() => __release.contexts.slice(0, -1).every(c => c.state === 'closed'))); await stagePlay(); await voices(12); await nav('知识'); await silent();
    });
    for (const target of ['知识', '编创']) await check(`Stage 12 native stems → ${target} dispose`, async () => { await go('/stage'); await stagePlay(); await voices(12); const starts = await page.evaluate(() => __release.sources.filter(s => s.active).map(s => s.when)); assert.equal(new Set(starts).size, 1, '12 stems did not share scheduled start'); await nav(target); await silent(); assert.ok(await page.evaluate(() => __release.contexts.every(c => c.state === 'closed'))); });
    await check('Stage pause / resume / seek / restart / scenes / fullscreen', async () => {
      await go('/stage'); await stagePlay(); await voices(12); await page.waitForTimeout(600); await page.getByRole('button', { name: '暂停演奏', exact: true }).click(); const paused = await progress(); await page.waitForTimeout(450); assert.equal(await progress(), paused); await stagePlay(); await voices(12);
      await page.locator('#stage-playback-progress').fill('35'); await page.waitForTimeout(250); assert.ok(await progress() >= 35);
      await page.locator('.stage-mobile__actions summary').click();
      const palettes = [];
      for (const scene of ['琴台', '青年园', '排练厅', '体育馆']) { await page.getByRole('button', { name: scene, exact: true }).click(); await page.waitForTimeout(220); assert.ok(await progress() >= 35); assert.equal(await page.locator('.stage-mobile__musician--in-lineup').count(), 12); assert.ok((await page.locator('.stage-mobile__scene-label').textContent()).includes(scene)); palettes.push(await page.locator('.stage-mobile__hero').getAttribute('style')); await voices(12); }
      assert.equal(new Set(palettes).size, 4);
      await page.getByRole('button', { name: '回到乐曲开头' }).click(); assert.ok(await progress() < 2);
      await page.getByRole('button', { name: '全屏查看舞台' }).click(); await page.waitForFunction(() => !!document.fullscreenElement); await page.getByRole('button', { name: '退出全屏舞台' }).click(); await nav('首页'); await silent();
    });
    await check('Stage dynamic lineup preserves clock and joins at current offset; dialog Escape', async () => {
      await go('/stage?lineup=violin,cello'); await stagePlay(); await voices(2); await page.locator('#stage-playback-progress').fill('24');
      await page.getByRole('button', { name: /^小提琴，/ }).click(); await voices(1); assert.equal(await page.getByRole('dialog').count(), 0);
      await page.getByRole('button', { name: /^长笛，/ }).click(); await voices(2);
      assert.ok(await progress() >= 24); const offsets = await page.evaluate(() => __release.sources.filter(s => s.active).map(s => s.offset)); assert.ok(offsets.every(x => x >= 24)); assert.equal(await page.locator('.stage-mobile__musician--in-lineup').count(), 2);
      await page.getByRole('button', { name: '查看长笛详情', exact: true }).click();
      await page.keyboard.press('Tab'); assert.ok(await page.getByRole('dialog').evaluate(e => e.contains(document.activeElement))); await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.body.style.overflow), ''); await nav('首页'); await silent();
    });
    for (const [route, count] of [['/stage', 12], ['/stage?source=nfc', 0], ['/stage?source=nfc&lineup=violin,cello', 2]]) await check(`NFC lineup ${route} = ${count}; camera → Home cleanup`, async () => {
      await go(route); assert.equal(await page.locator('.stage-mobile__musician--in-lineup').count(), count);
      if (route.includes('nfc')) { await page.getByRole('button', { name: '关闭相机舞台' }).waitFor(); assert.ok(await page.evaluate(() => __release.streams.some(s => s.stream.getTracks().some(t => t.readyState === 'live')))); }
      await nav('首页'); assert.ok(await page.evaluate(() => __release.streams.every(s => s.stream.getTracks().every(t => t.readyState === 'ended'))));
    });
    for (const [instrument, target] of [['flute', '首页'], ['violin', '舞台'], ['flute', '编创']]) await check(`Knowledge ${instrument} → ${target} audio cleanup`, async () => {
      await go(`/knowledge/instruments/${instrument}`); await page.locator('.instrument-preview-player button').first().click(); await page.waitForFunction(() => __release.media.some(m => m.tagName === 'AUDIO' && !m.paused)); await nav(target); await silent(); if (target === '舞台') { await stagePlay(); await voices(12); await nav('首页'); await silent(); }
    });
    await check('Compose native preview → Home pause / revoke', async () => { await go('/compose'); await upload(); await page.getByRole('button', { name: '播放当前动机', exact: true }).click(); await page.waitForFunction(() => __release.media.some(m => !m.paused)); const url = await page.locator('.cm-audio-preview audio').getAttribute('src'); await nav('首页'); await silent(); assert.ok(await page.evaluate(url => __release.revoked.includes(url), url)); });
    for (const status of ['queued', 'processing', 'pending']) await check(`Compose ${status} polling → Stage abort / no further requests`, async () => {
      mode = status; statusCalls = 0; await go('/compose'); await upload(); await page.getByRole('button', { name: '生成编曲', exact: true }).click(); await page.waitForFunction(() => __release.fetches.some(f => f.url.includes('/api/music/status'))); await nav('舞台'); const calls = statusCalls; await page.waitForTimeout(5500); assert.equal(statusCalls, calls); assert.ok(await page.evaluate(() => __release.aborts > 0 && __release.fetches.filter(f => f.url.includes('/api/music/status')).every(f => f.aborted)));
    });
    await check('Compose actively recording → Home stops recorder and stream', async () => { await go('/compose'); await page.getByRole('button', { name: '录制哼唱', exact: true }).first().click(); await page.waitForFunction(() => __release.recorders.some(r => r.state === 'recording')); await nav('首页'); assert.ok(await page.evaluate(() => __release.recorders.length > 0 && __release.recorders.every(r => r.state === 'inactive' && r.stops === 1) && __release.streams.every(s => s.stream.getTracks().every(t => t.readyState === 'ended')))); });
    await check('Compose results native audio → Home cleanup; same-page track behavior', async () => {
      mode = 'complete'; await go('/compose'); await upload(); await page.getByRole('button', { name: '生成编曲', exact: true }).click(); await page.locator('.cm-track audio').first().waitFor(); await page.locator('.cm-track audio').evaluateAll(async es => { for (const e of es) await e.play(); });
      assert.equal(await page.locator('.cm-track audio').evaluateAll(es => es.filter(e => !e.paused).length), 2); warnings.push('Compose 同页两个 result audio 可同时播放（实测）；本阶段按要求保留原生 controls。'); await nav('首页'); await silent();
    });
    await check('Knowledge GLB loads only after explicit 3D action', async () => { await go('/knowledge/instruments/violin'); const start = requests.length; await page.getByRole('button', { name: '查看 3D 模型' }).click(); await page.waitForResponse(r => /\.glb(?:\?|$)/.test(r.url()) && r.status() === 200); assert.ok(requests.slice(start).some(r => r.url.includes('.glb'))); await nav('首页'); });
  }
} finally {
  await page.waitForTimeout(300);
  const expectedAborts = diagnostics.filter(d => d.type === 'requestfailed' && /ERR_ABORTED/.test(d.message) && (d.url.startsWith('blob:') || d.url.includes('/assets/audio/') || (d.label.startsWith('Compose pending polling') && d.url.includes('/api/music/status'))));
  const thirdParty = diagnostics.filter(d => d.type === 'console.warning');
  const unexpected = diagnostics.filter(d => !expectedAborts.includes(d) && !thirdParty.includes(d));
  results.push({ label: 'No unexpected pageerror / console.error / HTTP errors / requestfailed', status: unexpected.length ? 'failed' : 'passed', ...(unexpected.length ? { message: JSON.stringify(unexpected) } : {}) });
  if (expectedAborts.length) warnings.push(`${expectedAborts.length} navigation / playback-aborted requests retained in diagnostics (ERR_ABORTED).`);
  if (thirdParty.length) warnings.push(`${thirdParty.length} console warnings retained verbatim in diagnostics.`);
  warnings.push('模拟 camera / MediaRecorder 生命周期通过不等于真实 iPhone 权限通过；Experience 仅页面加载 smoke，未认证 WebAR 追踪。');
  const inventory = async dir => { let files = []; for (const e of await fs.readdir(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) files.push(...await inventory(p)); else files.push({ file: path.relative(root, p), bytes: (await fs.stat(p)).size }); } return files; };
  const assets = {};
  for (const dir of ['public/assets/ui', 'public/assets/audio', 'public/assets/models', 'dist/assets']) { const files = await inventory(path.join(root, dir)); assets[dir] = { totalBytes: files.reduce((s, f) => s + f.bytes, 0), fileCount: files.length, top20: files.sort((a, b) => b.bytes - a.bytes).slice(0, 20) }; }
  const report = { generatedAt: new Date().toISOString(), baseUrl, deploymentCommit: process.env.RELEASE_DEPLOYMENT_COMMIT ?? null, localHeadAtTest: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), workingTreeDiff: execFileSync('git', ['diff', '--stat'], { cwd: root, encoding: 'utf8' }).trim(), passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length, warnings, manualChecks, deepLinks: deepLinks.map(r => baseUrl + r), results, diagnostics, requests, assets, titles: 'Existing static document.title retained; optional dynamic titles not introduced.' };
  await fs.writeFile(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); console.log(JSON.stringify({ passed: report.passed, failed: report.failed, warnings: warnings.length })); if (report.failed) process.exitCode = 1;
}
