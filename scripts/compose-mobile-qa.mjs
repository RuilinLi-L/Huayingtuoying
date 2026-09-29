/**
 * Mobile Compose browser QA. Every /api/music/* request is intercepted locally;
 * this script never submits a real third-party generation task.
 *
 * Run after starting Vite or the production preview:
 *   COMPOSE_BASE_URL=http://127.0.0.1:5173 node scripts/compose-mobile-qa.mjs
 *
 * Playwright may be installed in this project or supplied by the Codex runtime.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshotDir = process.env.COMPOSE_SCREENSHOT_DIR
  ?? path.join(repositoryRoot, 'screenshots', 'compose-phase-4');
const baseUrl = (process.env.COMPOSE_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const chromeExecutable = process.env.CHROME_EXECUTABLE
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const fixturePath = path.join(repositoryRoot, 'public', 'assets', 'audio', 'violin-harmony.wav');
const taskId = 'compose-mobile-qa-task';

const presetValues = [
  ['校园室内乐', 'warm chamber ensemble, classical crossover, piano and strings'],
  ['管弦草图', 'cinematic orchestral sketch, woodwinds, strings, gentle percussion'],
  ['美育课堂', 'clear educational arrangement, simple motif development, elegant harmony'],
];

const mockTracks = [
  {
    id: 'mock-track-a',
    title: '编曲草图 A',
    audioUrl: '/assets/audio/violin-harmony.wav',
    duration: 72,
    style: 'chamber ensemble',
  },
  {
    id: 'mock-track-b',
    title: '编曲草图 B',
    audioUrl: '/assets/audio/ensemble-strings.wav',
    duration: 83,
    style: 'orchestral sketch',
  },
];

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require(path.join(
      os.homedir(),
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
    ));
  }
}

const results = [];
async function check(label, task) {
  try {
    await task();
    results.push({ label, status: 'passed' });
    console.log(`PASS ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ label, status: 'failed', message });
    console.error(`FAIL ${label}: ${message}`);
  }
}

function status(statusValue, message, tracks = []) {
  return { taskId, status: statusValue, tracks, message };
}

function uploadInput(page) {
  return page.locator('input[type="file"][accept="audio/*"]').first();
}

function promptInput(page) {
  return page.getByRole('textbox', { name: /Prompt/i });
}

function styleInput(page) {
  return page.getByRole('textbox', { name: /风格标签/ });
}

function negativeTagsInput(page) {
  return page.getByRole('textbox', { name: /Negative tags|负向标签/i });
}

function generateButton(page) {
  return page.getByRole('button', { name: /生成编曲/ });
}

async function openAdvanced(page) {
  const details = page.locator('details.cm-advanced');
  const toggle = details.locator('summary');
  assert.equal(await toggle.count(), 1, 'advanced settings toggle is missing');
  if (await details.getAttribute('open') === null) await toggle.click();
  await page.getByRole('combobox', { name: /模型/ }).waitFor({ state: 'visible' });
}

async function uploadFixture(page) {
  const input = uploadInput(page);
  assert.equal(await input.count(), 1, 'audio upload input is missing');
  await input.setInputFiles(fixturePath);
  await page.getByText('当前动机').first().waitFor({ state: 'visible' });
  assert.ok(await page.getByText('violin-harmony.wav').count(), 'uploaded filename is not shown');
}

async function installControlledMicrophone(page) {
  await page.evaluate(() => {
    const qa = { trackStops: 0, recorderStarts: 0, recorderStops: 0, recordersCreated: 0 };
    const fakeTrack = { stop: () => { qa.trackStops += 1; } };
    const fakeStream = { getTracks: () => [fakeTrack] };
    let resolvePermission;
    let rejectPermission;

    qa.resolvePermission = () => resolvePermission(fakeStream);
    qa.rejectPermission = () => rejectPermission(new DOMException('Permission denied', 'NotAllowedError'));
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () => new Promise((resolve, reject) => {
        const preview = document.querySelector('.cm-audio-preview audio');
        qa.previewPausedAtRequest = preview?.paused;
        qa.previewTimeAtRequest = preview?.currentTime;
        qa.previewLockedAtRequest = [...document.querySelectorAll('.cm-audio-preview button, .cm-audio-preview input')]
          .every((control) => control.disabled);
        resolvePermission = resolve;
        rejectPermission = reject;
      }),
    });

    function makeWav() {
      const samples = 8000;
      const bytes = new Uint8Array(44 + samples);
      const view = new DataView(bytes.buffer);
      const ascii = (offset, value) => {
        for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
      };
      ascii(0, 'RIFF');
      view.setUint32(4, 36 + samples, true);
      ascii(8, 'WAVE');
      ascii(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 8000, true);
      view.setUint32(28, 8000, true);
      view.setUint16(32, 1, true);
      view.setUint16(34, 8, true);
      ascii(36, 'data');
      view.setUint32(40, samples, true);
      bytes.fill(128, 44);
      return new Blob([bytes], { type: 'audio/wav' });
    }

    class ControlledMediaRecorder {
      static isTypeSupported() { return false; }

      constructor() {
        this.state = 'inactive';
        this.mimeType = 'audio/wav';
        qa.recordersCreated += 1;
      }

      start() {
        this.state = 'recording';
        qa.recorderStarts += 1;
      }

      stop() {
        this.state = 'inactive';
        qa.recorderStops += 1;
        window.setTimeout(() => {
          this.ondataavailable?.({ data: makeWav() });
          this.onstop?.();
        }, 600);
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: ControlledMediaRecorder,
    });
    window.__composeQaMic = qa;
  });
}

async function navigate(page) {
  const response = await page.goto(`${baseUrl}/compose`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, '/compose did not load successfully');
  await page.locator('main.mobile-shell__main h1').first().waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(new URL(page.url()).pathname, '/compose');
  assert.equal(await page.locator('.not-found').count(), 0, 'not-found page rendered');
  const nav = page.getByRole('navigation', { name: '主导航' });
  assert.equal(await nav.getByRole('link', { name: '编创' }).getAttribute('aria-current'), 'page');
}

async function playPreview(page) {
  await page.waitForFunction(() => document.querySelector('.cm-audio-preview audio')?.duration > 0);
  await page.locator('.cm-audio-preview audio').evaluate((audio) => { audio.currentTime = 1; });
  await page.getByRole('button', { name: '播放当前动机', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.cm-audio-preview audio')?.paused === false);
}

async function assertPreviewLocked(page, expectedUrl) {
  const audio = page.locator('.cm-audio-preview audio');
  assert.ok(await audio.evaluate((element) => element.paused), 'preview is still playing while recorder is busy');
  assert.equal(await audio.getAttribute('src'), expectedUrl, 'busy preview URL was replaced');
  for (const control of [
    page.getByRole('button', { name: '播放当前动机', exact: true }),
    page.getByRole('slider', { name: '当前动机播放进度' }),
    page.getByRole('button', { name: '重新录制或替换音频' }),
    uploadInput(page),
  ]) assert.ok(await control.isDisabled(), 'a busy preview control is enabled');
  assert.ok(!(await page.evaluate(() => window.__composeQaCleanup.revokedUrls)).includes(expectedUrl),
    'busy preview URL was revoked');
}

async function assertParametersDisabled(page, disabled) {
  const controls = page.locator('.cm-prompt-panel input, .cm-prompt-panel textarea, .cm-prompt-panel button, .cm-advanced input, .cm-advanced select');
  assert.equal(await controls.count(), 11, 'expected all nine parameter types including three presets');
  for (const control of await controls.all()) {
    assert.equal(await control.isDisabled(), disabled, 'generation parameter lock has the wrong state');
  }
}

async function assertNoHorizontalOverflow(page, width) {
  const dimensions = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && (rect.right > viewport + 2 || rect.left < -2))
      .slice(0, 6)
      .map(({ element, rect }) => `${element.tagName.toLowerCase()} [${Math.round(rect.left)}, ${Math.round(rect.right)}]`);
    return { viewport, scrollWidth, offenders };
  });
  assert.ok(
    dimensions.scrollWidth <= dimensions.viewport + 1,
    `${width}px viewport scrolls to ${dimensions.scrollWidth}px; offenders: ${dimensions.offenders.join(', ')}`,
  );
}

async function waitForCount(readCount, expected, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (readCount() < expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(readCount() >= expected, `expected ${expected} status requests, saw ${readCount()}`);
}

function multipartValue(body, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`name="${escaped}"\\r\\n\\r\\n([^\\r\\n]*)`).exec(body);
  return match?.[1] ?? null;
}

async function screenshot(page, filename, anchor = null, top = 100) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  if (anchor) {
    await page.locator(anchor).first().evaluate((element, targetTop) => {
      window.scrollBy(0, element.getBoundingClientRect().top - targetTop);
    }, top);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    animations: 'disabled',
  });
}

async function main() {
  const { chromium } = loadPlaywright();
  const launchOptions = { headless: true, args: ['--autoplay-policy=no-user-gesture-required'] };
  if (await fs.access(chromeExecutable).then(() => true, () => false)) {
    launchOptions.executablePath = chromeExecutable;
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__composeQaCleanup = { aborts: 0, revokedUrls: [] };
    const abort = AbortController.prototype.abort;
    AbortController.prototype.abort = function (...args) {
      window.__composeQaCleanup.aborts += 1;
      return abort.apply(this, args);
    };
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = function (url) {
      window.__composeQaCleanup.revokedUrls.push(url);
      return revoke.call(this, url);
    };
  });

  let composeMode = 'success';
  let statusPlan = [status('complete', '模拟生成完成', mockTracks)];
  let statusCallCount = 0;
  let composeRequests = [];
  const setMock = (next) => {
    composeMode = next.composeMode ?? 'success';
    statusPlan = next.statusPlan ?? [status('complete', '模拟生成完成', mockTracks)];
    statusCallCount = 0;
    composeRequests = [];
  };

  await context.route('**/api/music/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/music/compose') {
      composeRequests.push({
        method: request.method(),
        body: request.postDataBuffer()?.toString('utf8') ?? '',
      });
      await route.fulfill({
        status: composeMode === 'error' ? 500 : 200,
        contentType: 'application/json',
        body: JSON.stringify(composeMode === 'error'
          ? { message: '模拟生成请求失败' }
          : { taskId }),
      });
      return;
    }
    if (url.pathname === '/api/music/status') {
      const response = statusPlan[Math.min(statusCallCount, statusPlan.length - 1)];
      statusCallCount += 1;
      assert.equal(url.searchParams.get('taskId'), taskId, 'status request has the wrong taskId');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    await route.fulfill({
      status: 599,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unexpected music API request blocked by Compose QA' }),
    });
  });

  try {
    await fs.mkdir(screenshotDir, { recursive: true });

    for (const width of [320, 360, 393, 430]) {
      await check(`${width}px responsive layout`, async () => {
        await page.setViewportSize({ width, height: 852 });
        await navigate(page);
        assert.ok(await page.getByRole('button', { name: /录制哼唱/ }).count(), 'record button is missing');
        assert.equal(await uploadInput(page).count(), 1, 'upload fallback is missing');
        assert.equal(await promptInput(page).count(), 1, 'Prompt is missing');
        assert.equal(await generateButton(page).count(), 1, 'generate button is missing');
        await assertNoHorizontalOverflow(page, width);
        await uploadFixture(page);
        await openAdvanced(page);
        await assertNoHorizontalOverflow(page, width);
      });
    }
    await page.setViewportSize({ width: 393, height: 852 });

    await check('Microphone permission error and upload fallback', async () => {
      await navigate(page);
      await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('Permission denied', 'NotAllowedError');
        };
      });
      await page.getByRole('button', { name: /录制哼唱/ }).first().click();
      await page.getByRole('alert').filter({ hasText: /麦克风|权限/ }).first().waitFor();
      assert.equal(await uploadInput(page).count(), 1, 'upload fallback disappeared after microphone error');
    });

    await check('Mocked recorder lifecycle and busy controls', async () => {
      await navigate(page);
      await uploadFixture(page);
      await installControlledMicrophone(page);
      await page.getByRole('button', { name: '录制哼唱' }).first().click();
      await page.locator('.cm-recorder__status').getByText(/等待麦克风权限/).waitFor();
      assert.ok(await generateButton(page).isDisabled(), 'generation is enabled while microphone permission is pending');
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isDisabled(),
        'preview can be cleared while microphone permission is pending');

      await page.evaluate(() => window.__composeQaMic.resolvePermission());
      await page.locator('.cm-recorder__status').getByText(/正在录音/).waitFor();
      assert.ok(await generateButton(page).isDisabled(), 'generation is enabled during recording');
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isDisabled(),
        'preview can be cleared during recording');
      assert.equal(await page.evaluate(() => window.__composeQaMic.recorderStarts), 1);

      await page.getByRole('button', { name: '停止录音' }).first().click();
      await page.locator('.cm-recorder__status').getByText(/正在保存录音/).waitFor();
      assert.ok(await generateButton(page).isDisabled(), 'generation is enabled while recording is stopping');
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isDisabled(),
        'preview can be cleared while recording is stopping');
      await page.locator('.cm-recorder__status').getByText(/动机已准备好/).waitFor();
      await page.getByText('现场录音').waitFor();
      assert.ok(await generateButton(page).isEnabled(), 'recorded audio did not become submittable');
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isEnabled());
      const stats = await page.evaluate(() => window.__composeQaMic);
      assert.equal(stats.recorderStops, 1);
      assert.ok(stats.trackStops >= 1, 'recording stream tracks were not stopped');
    });

    await check('Preview pauses and locks while recorder is busy', async () => {
      await navigate(page);
      await uploadFixture(page);
      await installControlledMicrophone(page);
      await playPreview(page);
      const audio = page.locator('.cm-audio-preview audio');
      const previousUrl = await audio.getAttribute('src');
      await page.getByRole('button', { name: '录制哼唱', exact: true }).first().click();
      await page.locator('.cm-recorder__status').getByText(/等待麦克风权限/).waitFor();
      await assertPreviewLocked(page, previousUrl);
      const atRequest = await page.evaluate(() => window.__composeQaMic);
      assert.equal(atRequest.previewPausedAtRequest, true, 'preview was not paused before getUserMedia');
      assert.equal(atRequest.previewLockedAtRequest, true, 'preview was not locked before getUserMedia');
      assert.ok(atRequest.previewTimeAtRequest >= 1, 'pausing reset the preview playback position');

      await page.evaluate(() => window.__composeQaMic.resolvePermission());
      await page.locator('.cm-recorder__status').getByText(/正在录音/).waitFor();
      await assertPreviewLocked(page, previousUrl);
      assert.equal(await audio.evaluate((element) => element.currentTime), atRequest.previewTimeAtRequest);
      await page.getByRole('button', { name: '停止录音', exact: true }).first().click();
      await page.locator('.cm-recorder__status').getByText(/正在保存录音/).waitFor();
      await assertPreviewLocked(page, previousUrl);
      await page.getByText('现场录音').waitFor();
      await page.waitForFunction(() => document.querySelector('.cm-audio-preview audio')?.duration > 0);
      assert.notEqual(await audio.getAttribute('src'), previousUrl, 'recorded audio did not replace the preview');
      assert.ok(await audio.evaluate((element) => element.paused), 'new recording auto-played');
      assert.ok(await page.getByRole('button', { name: '播放当前动机', exact: true }).isEnabled());
      assert.ok(await page.getByRole('slider', { name: '当前动机播放进度' }).isEnabled());
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isEnabled());
      assert.ok(await uploadInput(page).isEnabled());
    });

    await check('Preview does not auto-resume after microphone permission failure', async () => {
      await navigate(page);
      await uploadFixture(page);
      await installControlledMicrophone(page);
      await playPreview(page);
      const audio = page.locator('.cm-audio-preview audio');
      const previousUrl = await audio.getAttribute('src');
      await page.getByRole('button', { name: '录制哼唱', exact: true }).first().click();
      await page.locator('.cm-recorder__status').getByText(/等待麦克风权限/).waitFor();
      await assertPreviewLocked(page, previousUrl);
      const pausedAt = await audio.evaluate((element) => element.currentTime);
      await page.evaluate(() => window.__composeQaMic.rejectPermission());
      await page.getByRole('alert').filter({ hasText: /麦克风|权限/ }).first().waitFor();
      await page.waitForTimeout(150);
      assert.ok(await audio.evaluate((element) => element.paused), 'preview auto-resumed after permission failure');
      assert.equal(await audio.getAttribute('src'), previousUrl);
      assert.equal(await audio.evaluate((element) => element.currentTime), pausedAt);
      assert.ok(await page.getByRole('slider', { name: '当前动机播放进度' }).isEnabled());
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isEnabled());
      assert.ok(await uploadInput(page).isEnabled());
      await page.getByRole('button', { name: '播放当前动机', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.cm-audio-preview audio')?.paused === false);
      await page.getByRole('button', { name: '暂停当前动机', exact: true }).click();
    });

    await check('Uploading during permission request ignores late rejection', async () => {
      await navigate(page);
      await installControlledMicrophone(page);
      await page.getByRole('button', { name: '录制哼唱' }).first().click();
      await page.locator('.cm-recorder__status').getByText(/等待麦克风权限/).waitFor();
      await uploadFixture(page);
      await page.locator('.cm-recorder__status').getByText(/动机已准备好/).waitFor();
      await page.evaluate(() => window.__composeQaMic.rejectPermission());
      await page.waitForTimeout(100);
      assert.equal(await page.getByRole('alert').filter({ hasText: /麦克风/ }).count(), 0,
        'a stale microphone error replaced the uploaded audio state');
      assert.ok(await generateButton(page).isEnabled(), 'uploaded audio was blocked by a stale microphone error');
      assert.equal(await page.evaluate(() => window.__composeQaMic.recordersCreated), 0);
    });

    await check('Late microphone permission after unmount stops the stream', async () => {
      await navigate(page);
      await installControlledMicrophone(page);
      await page.getByRole('button', { name: '录制哼唱' }).first().click();
      await page.locator('.cm-recorder__status').getByText(/等待麦克风权限/).waitFor();
      await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '首页' }).click();
      await page.waitForURL(`${baseUrl}/`);
      await page.locator('.cm-recorder').waitFor({ state: 'detached' });
      await page.waitForTimeout(50);
      await page.evaluate(() => window.__composeQaMic.resolvePermission());
      await page.waitForFunction(() => window.__composeQaMic.trackStops >= 1);
      assert.equal(await page.evaluate(() => window.__composeQaMic.recordersCreated), 0,
        'MediaRecorder was created after Compose unmounted');
    });

    await check('Audio upload, preview, and playback', async () => {
      await navigate(page);
      await uploadFixture(page);
      assert.ok(await generateButton(page).isEnabled(), 'generation stayed disabled after a valid upload');
      const audio = page.locator('audio[src^="blob:"]').first();
      assert.ok(await audio.count(), 'audio preview has no playable element');
      await audio.evaluate((element) => element.play());
      await page.waitForFunction(() => [...document.querySelectorAll('audio[src^="blob:"]')].some((element) => !element.paused));
      await audio.evaluate((element) => element.pause());
      assert.ok(await audio.evaluate((element) => element.paused), 'audio preview did not pause');
    });

    await check('30 MB upload limit', async () => {
      await navigate(page);
      await uploadInput(page).setInputFiles({
        name: 'oversized.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.alloc(30 * 1024 * 1024 + 1),
      });
      await page.getByRole('alert').filter({ hasText: /30\s*MB/i }).first().waitFor();
      assert.ok(await generateButton(page).isDisabled(), 'oversized file became submittable');
    });

    await check('Empty Prompt blocks submission', async () => {
      await navigate(page);
      await uploadFixture(page);
      await promptInput(page).fill('  ');
      if (await generateButton(page).isEnabled()) {
        await generateButton(page).click();
        await page.getByRole('alert').filter({ hasText: /Prompt|描述|填写/ }).first().waitFor();
      } else {
        assert.ok(await generateButton(page).isDisabled());
      }
      assert.equal(composeRequests.length, 0, 'empty Prompt reached the API');
    });

    await check('Style presets change the editable style input', async () => {
      await navigate(page);
      for (const [label, value] of presetValues) {
        await page.getByRole('button', { name: new RegExp(label) }).click();
        assert.equal(await styleInput(page).inputValue(), value, `${label} did not update style`);
      }
      await styleInput(page).fill('custom chamber setting');
      assert.equal(await styleInput(page).inputValue(), 'custom chamber setting');
    });

    await check('Advanced controls retain values in the submitted request', async () => {
      setMock({ statusPlan: [status('complete', '模拟生成完成', mockTracks)] });
      await navigate(page);
      await uploadFixture(page);
      await openAdvanced(page);
      await page.getByRole('combobox', { name: /模型/ }).selectOption('V4');
      const instrumental = page.getByRole('switch', { name: /生成纯音乐/ });
      const control = await instrumental.count()
        ? instrumental
        : page.getByRole('checkbox', { name: /生成纯音乐/ });
      assert.equal(await control.count(), 1, 'instrumental control is missing');
      await control.click();
      const audioSlider = page.getByRole('slider', { name: /动机影响/ });
      const styleSlider = page.getByRole('slider', { name: /风格影响/ });
      await audioSlider.focus();
      await audioSlider.press('ArrowRight');
      await styleSlider.focus();
      await styleSlider.press('ArrowRight');
      assert.equal(await audioSlider.inputValue(), '0.8', 'audioWeight did not change');
      assert.equal(await styleSlider.inputValue(), '0.65', 'styleWeight did not change');
      await negativeTagsInput(page).fill('no vocals, no distortion');
      await styleInput(page).fill('custom chamber setting');
      await generateButton(page).click();
      await waitForCount(() => composeRequests.length, 1);
      const request = composeRequests[0];
      assert.equal(request.method, 'POST');
      assert.equal(multipartValue(request.body, 'model'), 'V4');
      assert.equal(multipartValue(request.body, 'instrumental'), 'false');
      assert.equal(multipartValue(request.body, 'audioWeight'), '0.8');
      assert.equal(multipartValue(request.body, 'styleWeight'), '0.65');
      assert.equal(multipartValue(request.body, 'negativeTags'), 'no vocals, no distortion');
      assert.equal(multipartValue(request.body, 'style'), 'custom chamber setting');
      assert.ok(multipartValue(request.body, 'prompt')?.trim(), 'Prompt was omitted from the request');
      assert.ok(request.body.includes('name="audio"; filename="violin-harmony.wav"'), 'audio file was omitted');
      await page.getByText('编曲草图 B').waitFor();
    });

    await check('Generation locks all parameters while keeping preview playback available', async () => {
      setMock({ statusPlan: [status('queued', '模拟排队中')] });
      await navigate(page);
      await uploadFixture(page);
      await openAdvanced(page);
      await assertParametersDisabled(page, false);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      await assertParametersDisabled(page, true);
      assert.notEqual(await page.locator('.cm-advanced').getAttribute('open'), null);
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isDisabled());
      assert.ok(await uploadInput(page).isDisabled());
      assert.ok(await page.getByRole('slider', { name: '当前动机播放进度' }).isEnabled());
      await playPreview(page);
      await page.getByRole('button', { name: '暂停当前动机', exact: true }).click();
      for (const width of [320, 360, 393, 430]) {
        await page.setViewportSize({ width, height: 852 });
        await assertNoHorizontalOverflow(page, width);
      }
      await page.setViewportSize({ width: 393, height: 852 });
      await page.getByRole('button', { name: '停止等待' }).click();
      await assertParametersDisabled(page, false);
      assert.ok(await page.getByRole('button', { name: '重新录制或替换音频' }).isEnabled());
      await promptInput(page).fill('停止等待后可以编辑');
      assert.equal(await promptInput(page).inputValue(), '停止等待后可以编辑');
    });

    await check('Queued, processing, first, complete, and two result tracks', async () => {
      setMock({ statusPlan: [
        status('queued', '模拟排队中'),
        status('processing', '模拟正在编曲'),
        status('first', '模拟初稿已生成', [mockTracks[0]]),
        status('complete', '模拟生成完成', mockTracks),
      ] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      await page.getByText(/模拟排队中|排队中|已提交/).first().waitFor();
      await waitForCount(() => statusCallCount, 2);
      await page.getByText(/模拟正在编曲|正在编曲|生成中/).first().waitFor();
      await waitForCount(() => statusCallCount, 3);
      await page.getByText(/模拟初稿已生成|初稿已生成|已有初稿/).first().waitFor();
      await page.getByText('编曲草图 A').waitFor();
      await waitForCount(() => statusCallCount, 4);
      await page.getByText('编曲草图 A').waitFor();
      await page.getByText('编曲草图 B').waitFor();
      assert.equal(await page.locator('audio[src^="/assets/audio/"]').count(), 2, 'both result players are not present');
      assert.ok(await page.getByText(/生成完成/).count(), 'complete state was not shown');
      await assertParametersDisabled(page, false);
    });

    await check('Compose request failure stops before polling', async () => {
      setMock({ composeMode: 'error' });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await page.getByRole('alert').filter({ hasText: /模拟生成请求失败/ }).first().waitFor();
      assert.equal(statusCallCount, 0, 'status polling continued after compose failed');
      await assertParametersDisabled(page, false);
    });

    await check('Failed status shows the returned message', async () => {
      setMock({ statusPlan: [status('failed', '模拟第三方生成失败')] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      await page.getByRole('alert').filter({ hasText: /模拟第三方生成失败/ }).first().waitFor();
      assert.ok(await page.getByText(/生成失败/).count(), 'failed status was not shown');
      await assertParametersDisabled(page, false);
    });

    await check('Complete status without tracks presents an unusable result', async () => {
      setMock({ statusPlan: [status('complete', '模拟完成但无音频')] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      await page.getByText('结果不可用').first().waitFor();
      await page.getByRole('alert').filter({ hasText: /生成完成但没有返回可试听音频/ }).first().waitFor();
      assert.ok(await page.locator('.cm-progress__step.is-failed').filter({ hasText: '试听结果' }).count(),
        'result step was not marked failed');
    });

    await check('Stop waiting aborts polling', async () => {
      setMock({ statusPlan: [status('queued', '模拟排队中')] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      const before = await page.evaluate(() => window.__composeQaCleanup.aborts);
      await page.getByRole('button', { name: /停止等待/ }).click();
      assert.ok(await generateButton(page).isEnabled(), 'generation remained locked after cancellation');
      assert.ok(await page.evaluate(() => window.__composeQaCleanup.aborts) > before, 'AbortController was not aborted');
      const count = statusCallCount;
      await page.waitForTimeout(5300);
      assert.equal(statusCallCount, count, 'status polling continued after cancellation');
    });

    await check('BottomNav navigation releases preview URL and polling', async () => {
      setMock({ statusPlan: [status('queued', '模拟排队中')] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      const before = await page.evaluate(() => ({ ...window.__composeQaCleanup }));
      await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '首页' }).click();
      await page.waitForURL(`${baseUrl}/`);
      await page.locator('.cm-recorder').waitFor({ state: 'detached' });
      await page.waitForFunction((aborts) => window.__composeQaCleanup.aborts > aborts, before.aborts);
      const after = await page.evaluate(() => window.__composeQaCleanup);
      assert.ok(after.aborts > before.aborts, 'unmount did not abort the polling controller');
      assert.ok(after.revokedUrls.length > before.revokedUrls.length, 'unmount did not revoke the preview URL');
      const count = statusCallCount;
      await page.waitForTimeout(5300);
      assert.equal(statusCallCount, count, 'status polling continued after leaving Compose');
    });

    await check('Focused fields can clear the fixed BottomNav', async () => {
      await navigate(page);
      await openAdvanced(page);
      for (const field of [promptInput(page), styleInput(page), negativeTagsInput(page)]) {
        await field.scrollIntoViewIfNeeded();
        await field.focus();
        const fieldBox = await field.boundingBox();
        const navBox = await page.getByRole('navigation', { name: '主导航' }).boundingBox();
        assert.ok(fieldBox && navBox, 'field or BottomNav has no bounding box');
        assert.ok(fieldBox.y >= -1 && fieldBox.y + fieldBox.height <= navBox.y + 2,
          `focused field is hidden behind BottomNav: ${JSON.stringify({ fieldBox, navBox })}`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
        'form cannot scroll beyond the viewport');
    });

    await check('Screenshot compose-empty-393.png', async () => {
      await navigate(page);
      await screenshot(page, 'compose-empty-393.png');
    });
    await check('Screenshot compose-audio-ready-393.png', async () => {
      await navigate(page);
      await uploadFixture(page);
      await screenshot(page, 'compose-audio-ready-393.png');
    });
    await check('Screenshot compose-advanced-393.png', async () => {
      await navigate(page);
      await uploadFixture(page);
      await openAdvanced(page);
      await screenshot(page, 'compose-advanced-393.png', '.cm-advanced', 170);
    });
    await check('Screenshot compose-generating-393.png', async () => {
      setMock({ statusPlan: [status('queued', '模拟排队中')] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await waitForCount(() => statusCallCount, 1);
      await screenshot(page, 'compose-generating-393.png', '.cm-section--generate', 100);
    });
    await check('Screenshot compose-result-393.png', async () => {
      setMock({ statusPlan: [status('complete', '模拟生成完成', mockTracks)] });
      await navigate(page);
      await uploadFixture(page);
      await generateButton(page).click();
      await page.getByText('编曲草图 B').waitFor();
      await screenshot(page, 'compose-result-393.png', '.cm-progress', 100);
    });

    await check('No uncaught page errors', async () => {
      assert.deepEqual(pageErrors, []);
    });
  } finally {
    await browser.close();
  }

  const report = {
    baseUrl,
    screenshotDir: path.relative(repositoryRoot, screenshotDir),
    fixturePath: path.relative(repositoryRoot, fixturePath),
    apiMode: 'Playwright route mocks only; no real generation requests',
    widths: [320, 360, 393, 430],
    passed: results.filter((result) => result.status === 'passed').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
    pageErrors,
  };
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.writeFile(path.join(screenshotDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${report.passed} passed, ${report.failed} failed. Report: ${path.join(screenshotDir, 'qa-report.json')}`);
  if (report.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
