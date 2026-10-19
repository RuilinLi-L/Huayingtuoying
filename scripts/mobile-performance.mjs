import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
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
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4190',
  runs = Number(process.env.QA_RUNS ?? 3),
  results = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  for (const mode of ['audio', 'oboe', 'violin', 'ar'])
    for (let run = 0; run < runs; run++) {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
      await context.addInitScript(() => {
        window.__starts = [];
        const original = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
          const s = original.call(this),
            start = s.start.bind(s);
          s.start = (...args) => {
            window.__starts.push({ at: performance.now(), when: args[0] });
            return start(...args);
          };
          return s;
        };
        document.addEventListener(
          'click',
          () => {
            window.__click = performance.now();
          },
          { capture: true },
        );
      });
      const page = await context.newPage(),
        cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 10_000_000 / 8,
        uploadThroughput: 10_000_000 / 8,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(base + (mode === 'violin' ? '/knowledge/instruments/violin' : '/stage'), {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      const names = { audio: '播放演奏', oboe: '双簧管 3D', violin: '查看 3D 模型' };
      if (mode === 'ar') await page.getByRole('link', { name: '打开实景 AR', exact: true }).click();
      else await page.getByRole('button', { name: names[mode], exact: true }).click();
      if (mode === 'audio')
        await page.waitForFunction(() => __starts.length >= 12, null, { timeout: 60000 });
      else if (mode === 'ar')
        await page.waitForFunction(
          () =>
            document.querySelector('iframe')?.contentDocument?.querySelector('#permission')
              ?.disabled === false,
          null,
          { timeout: 60000 },
        );
      else await page.getByRole('button', { name: '恢复视角' }).waitFor({ timeout: 45000 });
      const result = await page.evaluate(
        (mode) => ({
          mode,
          ms:
            mode === 'audio'
              ? Math.max(...__starts.slice(0, 24).map((s) => s.at)) - __click
              : performance.now() - __click,
          audioBytes: performance
            .getEntriesByType('resource')
            .filter(
              (r) =>
                /flac|manifest\.json/.test(r.name) &&
                r.responseEnd <= Math.max(0, ...__starts.map((s) => s.at)),
            )
            .reduce((n, r) => n + r.encodedBodySize, 0),
        }),
        mode,
      );
      results.push({ ...result, run: run + 1 });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
} finally {
  await mkdir(resolve('.runtime/optimization-qa'), { recursive: true });
  await writeFile(
    '.runtime/optimization-qa/performance.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        network:
          '10 Mbps / 150 ms; CPU 4x; cold cache; timer starts at user click; camera permission and surface search excluded',
        results,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
