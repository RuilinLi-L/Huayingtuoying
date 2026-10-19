import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(
    join(
      os.homedir(),
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
    ),
  ));
}
const output = resolve('.runtime/optimization-qa');
await mkdir(output, { recursive: true });
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4190';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const results = [],
  errors = [];
const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
await context.addInitScript(() => {
  if (window !== window.top) return;
  window.__audio = [];
  window.__decoded = [];
  window.__contexts = [];
  const N = AudioContext;
  window.AudioContext = new Proxy(N, {
    construct(T, args) {
      const c = new T(...args);
      window.__contexts.push(c);
      const old = c.createBufferSource.bind(c);
      const decode = c.decodeAudioData.bind(c);
      c.decodeAudioData = async (data) => {
        const buffer = await decode(data);
        __decoded.push({ duration: buffer.duration, length: buffer.length });
        return buffer;
      };
      c.createBufferSource = () => {
        const s = old(),
          start = s.start.bind(s);
        s.start = (...args) => {
          __audio.push({
            t: performance.now(),
            at: args[0],
            offset: args[1],
            duration: args[2],
            bufferDuration: s.buffer?.duration,
          });
          start(...args);
        };
        return s;
      };
      return c;
    },
  });
});
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const check = async (name, fn) => {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, ms: Date.now() - start });
    console.log('PASS', name);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: String(error),
      url: page.url(),
      body: (await page.locator('body').innerText()).slice(0, 2000),
    });
    await page.screenshot({ path: join(output, 'failure.png'), fullPage: true });
    throw error;
  }
};
try {
  await check('All legacy entries and complete knowledge stay in the new shell', async () => {
    const routes = [
      ['/learn/fundamentals', '/knowledge/guide'],
      ['/learn/fundamentals#chinese-modes', '/knowledge/theory/07'],
      ['/demo/base?lineup=violin,oboe&scene=stadium', '/stage'],
      ['/experience/oboe-player?source=nfc', '/stage'],
      ['/experience/violin-dialogue?source=qr', '/stage'],
      ['/?entry=flute-color&source=nfc&autostart=1&lineup=flute,oboe&scene=stadium', '/stage'],
      ['/home?entry=oboe-player&source=qr&lineup=&scene=stadium', '/stage'],
      ['/stage?entry=missing', '/not-found'],
      ['/missing', '/missing'],
    ];
    for (const [path, target] of routes) {
      await page.goto(base + path);
      await page.waitForURL((url) => url.pathname === target);
      await page.locator('.mobile-shell').waitFor();
      if(path.includes('lineup=')){
        const before=new URL(base+path).searchParams,after=new URL(page.url()).searchParams;
        for(const name of ['lineup','scene','source'])if(before.has(name))assert.equal(after.get(name),before.get(name),name);
      }
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.app-shell').count(), 0);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
        path,
      );
    }
    await page.goto(base + '/knowledge/guide');
    await page.locator('.guide-card').first().waitFor();
    assert.equal(await page.locator('.guide-card').count(), 7);
    assert.equal(await page.locator('.guide-section .guide-instruments a').count(), 12);
    await page.screenshot({ path: join(output, 'guide.png'), fullPage: true });
    for (let i = 1; i <= 7; i++) {
      await page.goto(base + `/knowledge/theory/0${i}`);
      await page.locator('.theory-mobile__hero h1').waitFor();
      assert.ok((await page.locator('.theory-mobile__hero h1').textContent()).length > 0);
    }
    await page.screenshot({ path: join(output, 'theory-07.png'), fullPage: true });
  });
  await check('Exhibit links and generated NFC links retain lineup, scene and source',async()=>{
    await page.goto(base+'/entry/oboe-player?source=qr&lineup=oboe,violin&scene=stadium');
    const experience=new URL(await page.getByRole('link',{name:'打开实景 AR',exact:true}).getAttribute('href'),base);
    const nfc=new URL(await page.locator('.entry-mobile__url').getAttribute('href'));
    for(const url of [experience,nfc]){assert.equal(url.searchParams.get('lineup'),'oboe,violin');assert.equal(url.searchParams.get('scene'),'stadium');assert.equal(url.searchParams.get('entry'),'oboe-player')}
    assert.equal(experience.searchParams.get('source'),'qr');assert.equal(nfc.searchParams.get('source'),'nfc');
  });
  await check('Idle main pages do not fetch audio, models or AR runtime', async () => {
    for (const path of ['/', '/stage', '/knowledge/guide', '/knowledge/instruments']) {
      const requests = [];
      const record = (req) => requests.push(req.url());
      page.on('request', record);
      await page.goto(base + path);
      await page.locator('.mobile-shell').waitFor();
      await page.waitForTimeout(350);
      page.off('request', record);
      assert.equal(
        requests.filter((u) => /\.(glb|flac|mp3)(\?|$)|\/vendor\//.test(u)).length,
        0,
        path,
      );
    }
  });
  await check('12 voices start together and use short decoded slices', async () => {
    await page.goto(base + '/stage');
    await page.getByRole('button', { name: '播放演奏', exact: true }).click();
    await page.waitForFunction(() => __audio.length >= 24, null, { timeout: 45000 });
    const info = await page.evaluate(() => ({ audio: __audio, decoded: __decoded }));
    const starts = info.audio.slice(0, 24).sort((a, b) => a.at - b.at);
    assert.equal(starts.length, 24);
    for (const group of [starts.slice(0, 12), starts.slice(12, 24)])
      assert.ok(
        Math.max(...group.map((s) => s.at)) - Math.min(...group.map((s) => s.at)) < 0.001,
        'voices must share a scheduled time',
      );
    assert.ok(info.decoded.every((b) => b.duration <= 8.001));
    assert.ok(
      Math.abs(starts[12].at - (starts[0].at + starts[0].duration)) < 0.001,
      'segment boundaries must be gapless',
    );
    await page.waitForTimeout(8500);
    assert.ok(Number(await page.locator('#stage-playback-progress').inputValue()) >= 8);
    assert.equal(await page.getByRole('button', { name: '暂停演奏', exact: true }).count(), 1);
    await page.locator('#stage-playback-progress').evaluate((el) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '130');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    await page.waitForFunction(
      () => Number(document.querySelector('#stage-playback-progress').value) > 130,
      null,
      { timeout: 20000 },
    );
    await page.getByRole('button', { name: '暂停演奏', exact: true }).click();
    const paused = Number(await page.locator('#stage-playback-progress').inputValue());
    await page.waitForTimeout(400);
    assert.ok(
      Math.abs(Number(await page.locator('#stage-playback-progress').inputValue()) - paused) < 0.05,
    );
    await page.getByRole('link', { name: '打开实景 AR', exact: true }).click();
    await page.getByRole('button', { name: '关闭体验', exact: true }).waitFor();
    assert.equal(await page.locator('.stage-ar-panel').count(), 1);
    await page.getByRole('button', { name: '关闭体验', exact: true }).click();
    assert.ok(
      Math.abs(Number(await page.locator('#stage-playback-progress').inputValue()) - paused) < 0.3,
    );
    assert.equal(await page.locator('.stage-mobile__musician--in-lineup').count(), 12);
  });
  await check('Versioned models are small and render on demand', async () => {
    const media = JSON.parse(await readFile('src/data/mediaAssets.json', 'utf8'));
    assert.ok((await readFile('public' + media.models['oboe-player'])).length < 2_000_000);
    await page.goto(base + '/stage');
    await page.getByRole('button', { name: '双簧管 3D', exact: true }).click();
    await page.getByRole('button', { name: '恢复视角' }).waitFor({ timeout: 30000 });
    await page.screenshot({ path: join(output, 'oboe-model.png'), fullPage: true });
    await page.goto(base + '/entry/oboe-player');
    await page.locator('.entry-mobile').waitFor();
    await page.screenshot({ path: join(output, 'entry.png'), fullPage: true });
  });
  await check('World runtime loads only SLAM and exposes a permission start', async () => {
    await page.goto(base + '/stage?view=ar&entry=oboe-player');
    const frame = page.frameLocator('iframe[title="双簧管空间 AR"]');
    await frame
      .getByRole('button', { name: '开始实景 AR', exact: true })
      .waitFor({ timeout: 30000 });
    await page.waitForFunction(
      () => {
        const f = document.querySelector('iframe');
        return f?.contentDocument?.querySelector('#permission')?.disabled === false;
      },
      null,
      { timeout: 45000 },
    );
    const assets = await page
      .frames()[1]
      .evaluate(() => performance.getEntriesByType('resource').map((r) => r.name));
    assert.ok(assets.some((u) => u.includes('xr-slam')));
    assert.ok(!assets.some((u) => /xr-face|semantics/.test(u)));
    await page.screenshot({ path: join(output, 'world-ready.png'), fullPage: true });
    await page.getByRole('button', { name: '关闭体验', exact: true }).click();
    await page.locator('iframe').waitFor({ state: 'detached' });
  });
  await check('Single-track home previews use progressive media', async () => {
    await page.goto(base + '/');
    await page.locator('.home-symphony__play').first().click();
    await page.waitForFunction(
      () => document.querySelector('.home-symphony__play')?.getAttribute('aria-pressed') === 'true',
    );
    assert.equal(await page.evaluate(() => __decoded.length), 0);
    await page.getByRole('link', { name: '舞台', exact: true }).click();
    await page.locator('.home-symphony-list').waitFor({ state: 'detached' });
  });
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    join(output, 'results.json'),
    JSON.stringify(
      {
        base,
        results,
        errors,
        limitations:
          'Desktop synthetic camera validates lifecycle only. Physical iPhone Safari and Android Chrome are required for spatial stability and sensor permissions.',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
