/**
 * Reproducible browser QA for homepage copy and QR entry.
 * Start the built preview, then run HOME_SCAN_BASE_URL=http://127.0.0.1:4190 node scripts/home-scan-qa.mjs.
 * QR decoding uses real generated images and the worker fallback; no camera hardware is required.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch {
  playwright = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'screenshots/home-scan');
const baseUrl = process.env.HOME_SCAN_BASE_URL ?? 'http://127.0.0.1:4190';
await fs.mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const results = [];
const pageErrors = [];
async function check(label, test) {
  try {
    await test();
    results.push({ label, status: 'passed' });
    console.log(`PASS ${label}`);
  } catch (error) {
    results.push({ label, status: 'failed', message: String(error) });
    console.error(`FAIL ${label}: ${error}`);
  }
}
async function newPage(width = 393, height = 852) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // Exercise the decoder used on browsers without native QR support, including iOS.
  await context.addInitScript(() => { delete window.BarcodeDetector; });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(baseUrl);
  await page.locator('.home-experience-card__copy').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function openScan(page) {
  await page.getByRole('button', { name: '扫一扫', exact: true }).click();
  await page.getByRole('dialog', { name: '扫一扫' }).waitFor();
}
async function uploadQr(page, data) {
  const buffer = await QRCode.toBuffer(data, { width: 600, margin: 4 });
  await page.getByLabel('选择二维码图片').setInputFiles({ name: 'experience.png', mimeType: 'image/png', buffer });
}
async function assertStage(page, lineup, highlight) {
  await page.waitForURL((url) => url.pathname === '/stage');
  const url = new URL(page.url());
  assert.equal(url.searchParams.get('source'), 'qr');
  if (lineup) assert.equal(url.searchParams.get('lineup'), lineup);
  if (highlight) assert.equal(url.searchParams.get('highlight'), highlight);
  assert.equal(url.searchParams.has('autostart'), false);
  await page.locator('.stage-mobile').waitFor();
  assert.equal(await page.locator('.mobile-shell').count(), 1);
  await page.getByRole('dialog', { name: '扫一扫', exact: true }).waitFor({ state: 'detached' });
}
async function installCamera(page, data, delayed = false) {
  const image = data ? await QRCode.toDataURL(data, { width: 600, margin: 4 }) : null;
  await page.evaluate(async ({ image, delayed }) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 600;
    const ctx = canvas.getContext('2d');
    let qr;
    if (image) {
      qr = new Image();
      qr.src = image;
      await qr.decode();
    }
    const drawFrame = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 600, 600);
      if (qr) ctx.drawImage(qr, 100, 100, 400, 400);
    };
    drawFrame();
    const qa = window.__cameraQA = { calls: 0, streams: [], pending: false };
    navigator.mediaDevices.getUserMedia = async () => {
      qa.calls += 1;
      if (delayed) {
        qa.pending = true;
        await new Promise((resolve) => { qa.release = resolve; });
      }
      const stream = canvas.captureStream(24);
      qa.streams.push(stream);
      const timer = setInterval(() => {
        if (stream.getTracks().every((track) => track.readyState === 'ended')) clearInterval(timer);
        else drawFrame();
      }, 40);
      return stream;
    };
  }, { image, delayed });
}

try {
  await check('Live card copy, original destinations, and layout at 320/393/430px', async () => {
    for (const width of [320, 393, 430]) {
      const page = await newPage(width);
      assert.equal(await page.locator('.home-experience-card__copy strong').allTextContents().then((v) => v.join(',')), '编创音乐,交响乐舞台');
      const metrics = await page.locator('.home-experience-card__copy').evaluateAll((nodes) => nodes.map((node) => ({
        clipped: node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth,
        titleSize: parseFloat(getComputedStyle(node.querySelector('strong')).fontSize),
      })));
      assert.ok(metrics.every((m) => !m.clipped && m.titleSize >= 14));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('.mobile-topbar__actions img').count(), 0);
      await page.screenshot({ path: path.join(output, `home-${width}.png`) });
      await page.locator('.home-experience-card').nth(1).scrollIntoViewIfNeeded();
      if (width === 393) await page.screenshot({ path: path.join(output, 'home-second-card-393.png') });
      await page.locator('.home-experience-card').nth(1).click();
      await page.waitForURL('**/stage');
      await page.goto(baseUrl);
      await page.locator('.home-experience-card').first().click();
      await page.waitForURL('**/compose');
      await page.context().close();
    }
  });

  await check('Scan opens a modal without navigation or a camera request; Escape restores focus', async () => {
    const page = await newPage();
    await installCamera(page, null);
    await openScan(page);
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.evaluate(() => window.__cameraQA.calls), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.screenshot({ path: path.join(output, 'scan-sheet-393.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('button', { name: '扫一扫', exact: true }).evaluate((el) => el === document.activeElement), true);
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await openScan(page);
    await page.getByRole('button', { name: '没有二维码？直接进入交响舞台' }).click();
    await page.waitForURL('**/stage');
    await openScan(page);
    await page.getByRole('button', { name: '关闭扫一扫' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.context().close();
  });

  await check('Old QR/NFC entry shapes resolve to the current stage with the right instruments', async () => {
    const fixtures = [
      ['https://old.example/?entry=violin-dialogue&source=qr&autostart=1', 'violin', 'violin'],
      ['https://old.example/entry/flute-color', 'flute', 'flute'],
      ['https://old.example/experience/ensemble-stage?source=nfc&autostart=1', null, null],
      ['https://old.example/demo/base?lineup=flute,violin,unknown&highlight=violin&scene=campus', 'flute,violin', 'violin'],
      ['https://old.example/stage', null, null],
    ];
    for (const [data, lineup, highlight] of fixtures) {
      const page = await newPage();
      await openScan(page);
      await uploadQr(page, data);
      await assertStage(page, lineup, highlight);
      if (data.includes('ensemble-stage')) {
        assert.equal(new URL(page.url()).searchParams.get('lineup').split(',').length, 12);
      }
      await page.context().close();
    }
  });

  await check('Unknown QR, unsafe content, and unreadable images show recoverable errors', async () => {
    const page = await newPage();
    await openScan(page);
    for (const data of ['https://unrelated.example/', 'javascript:alert(1)', 'https://old.example/?entry=missing-entry', 'https://old.example/demo/base?lineup=unknown']) {
      await uploadQr(page, data);
      await page.getByRole('alert').filter({ hasText: '未识别到华音拓影体验' }).waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
      await page.waitForFunction(() => !document.querySelector('.scan-sheet__album').disabled);
    }
    await page.getByLabel('选择二维码图片').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await page.getByRole('alert').filter({ hasText: '图片中没有识别到二维码' }).waitFor();
    await uploadQr(page, 'https://old.example/?entry=flute-color');
    await assertStage(page, 'flute', 'flute');
    await page.context().close();
  });

  await check('Camera permission failure keeps album and stage entries usable', async () => {
    const page = await newPage(320, 568);
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
    });
    await openScan(page);
    await page.getByRole('button', { name: '开启相机扫码' }).click();
    await page.getByRole('alert').filter({ hasText: '相机未能开启' }).waitFor();
    await page.getByRole('button', { name: '从相册选择' }).scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('button', { name: '从相册选择' }).isEnabled(), true);
    await page.screenshot({ path: path.join(output, 'camera-denied-320.png') });
    await uploadQr(page, 'https://old.example/?entry=violin-dialogue');
    await assertStage(page, 'violin', 'violin');
    await page.context().close();
  });

  await check('Real QR decoding from a synthetic camera stream enters the new stage', async () => {
    const page = await newPage();
    await installCamera(page, 'https://old.example/?entry=violin-dialogue&autostart=1');
    await openScan(page);
    await page.getByRole('button', { name: '开启相机扫码' }).click();
    await assertStage(page, 'violin', 'violin');
    await page.waitForFunction(() => window.__cameraQA.streams.every((stream) => stream.getTracks().every((track) => track.readyState === 'ended')));
    assert.equal(await page.evaluate(() => window.__cameraQA.calls), 1);
    await page.context().close();
  });

  await check('Camera streams stop on close, including a permission request that resolves after close', async () => {
    for (const delayed of [false, true]) {
      const page = await newPage();
      await installCamera(page, null, delayed);
      await openScan(page);
      await page.getByRole('button', { name: '开启相机扫码' }).click();
      await page.waitForFunction(() => window.__cameraQA.calls > 0);
      if (!delayed) await page.getByRole('button', { name: '正在扫码', exact: true }).waitFor();
      await page.getByRole('button', { name: '关闭扫一扫' }).click();
      if (delayed) await page.evaluate(() => window.__cameraQA.release());
      await page.waitForFunction(() => window.__cameraQA.streams.length > 0 && window.__cameraQA.streams.every((stream) => stream.getTracks().every((track) => track.readyState === 'ended')));
      await page.context().close();
    }
  });
  await check('No browser runtime errors', async () => assert.deepEqual(pageErrors, []));
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'qa-report.json'), JSON.stringify({ baseUrl, checkedAt: new Date().toISOString(), results }, null, 2) + '\n');
}
if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
