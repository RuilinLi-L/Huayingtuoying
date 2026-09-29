/**
 * Mobile Knowledge browser QA and reference screenshots.
 *
 * Run after starting Vite or the production preview:
 *   KNOWLEDGE_BASE_URL=http://127.0.0.1:5173 node scripts/knowledge-mobile-qa.mjs
 *
 * Playwright may be installed in this project or supplied through NODE_PATH.
 * The Codex workspace runtime is used as a fallback when available.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshotDir = process.env.KNOWLEDGE_SCREENSHOT_DIR
  ?? path.join(repositoryRoot, 'screenshots', 'knowledge-phase-3');
const baseUrl = (process.env.KNOWLEDGE_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const chromeExecutable = process.env.CHROME_EXECUTABLE
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const requiredRoutes = [
  '/knowledge/instruments',
  '/knowledge/instruments?section=woodwind',
  '/knowledge/instruments?section=brass',
  '/knowledge/instruments?section=strings',
  '/knowledge/instruments/violin?section=strings',
  '/knowledge/instruments/flute?section=woodwind',
  '/knowledge/theory/01',
  '/knowledge/theory/02',
  '/knowledge/theory/03',
];

const screenshots = [
  { route: '/knowledge/instruments?section=woodwind', file: 'knowledge-woodwind-393.png', fullPage: false },
  { route: '/knowledge/instruments?section=woodwind', file: 'knowledge-woodwind-bottom-393.png', fullPage: false, bottom: true },
  { route: '/knowledge/instruments?section=brass', file: 'knowledge-brass-393.png', fullPage: false },
  { route: '/knowledge/instruments?section=strings', file: 'knowledge-strings-393.png', fullPage: false },
  { route: '/knowledge/instruments/violin?section=strings', file: 'knowledge-violin-detail-393.png', fullPage: true },
  { route: '/knowledge/theory/01', file: 'theory-01-393.png', fullPage: true },
  { route: '/knowledge/theory/02', file: 'theory-02-393.png', fullPage: true },
  { route: '/knowledge/theory/03', file: 'theory-03-393.png', fullPage: true },
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

function currentRoute(page) {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}

async function waitForKnowledgePage(page, route) {
  await page.locator('main.mobile-shell__main h1').first().waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(380);
  assert.equal(currentRoute(page), route, 'route changed unexpectedly');
  assert.equal(await page.locator('.not-found').count(), 0, 'not-found page rendered');
  const heading = (await page.locator('main.mobile-shell__main h1').first().textContent())?.trim();
  assert.ok(heading, 'page heading is empty');
  const knowledgeNav = page.getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '知识' });
  assert.equal(await knowledgeNav.getAttribute('aria-current'), 'page', 'Knowledge bottom nav is inactive');
}

async function navigate(page, route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.ok(response, 'navigation had no HTTP response');
  assert.equal(response.status(), 200, `${route} returned HTTP ${response.status()}`);
  await waitForKnowledgePage(page, route);
}

async function assertNoHorizontalOverflow(page, route, width) {
  const dimensions = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && (rect.right > viewport + 2 || rect.left < -2))
      .slice(0, 6)
      .map(({ element, rect }) => `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''} [${Math.round(rect.left)}, ${Math.round(rect.right)}]`);
    return { viewport, scrollWidth, offenders };
  });
  assert.ok(
    dimensions.scrollWidth <= dimensions.viewport + 1,
    `${route} at ${width}px scrolls to ${dimensions.scrollWidth}px; possible offenders: ${dimensions.offenders.join(', ')}`,
  );
}

async function clickSection(page, name) {
  const controls = [
    page.getByRole('button', { name, exact: true }),
    page.getByRole('tab', { name, exact: true }),
    page.getByRole('link', { name, exact: true }),
  ];
  for (const control of controls) {
    if (await control.count()) {
      await control.first().click();
      return;
    }
  }
  throw new Error(`Section control ${name} not found`);
}

async function clickTheoryTopic(page, topicId) {
  const links = page.locator(`a[href^="/knowledge/theory/${topicId}"]`);
  if (await links.count()) {
    await links.first().click();
    return;
  }
  const controls = [
    page.getByRole('button', { name: new RegExp(`(?:章节|第)?\\s*${topicId}(?:\\s|$)`) }),
    page.getByRole('tab', { name: new RegExp(`(?:章节|第)?\\s*${topicId}(?:\\s|$)`) }),
  ];
  for (const control of controls) {
    if (await control.count()) {
      await control.first().click();
      return;
    }
  }
  throw new Error(`Theory topic ${topicId} control not found`);
}

async function mediaState(page) {
  return page.evaluate(() => (window.__knowledgeQaMedia ?? []).map((media) => ({
    src: decodeURIComponent(media.currentSrc || media.src || ''),
    sourceAttribute: media.getAttribute('src'),
    paused: media.paused,
    currentTime: media.currentTime,
    duration: media.duration,
    networkState: media.networkState,
    readyState: media.readyState,
    error: media.error?.message ?? null,
  })));
}

async function waitForMedia(page, instrument, paused) {
  await page.waitForFunction(({ instrument, paused }) => {
    const media = (window.__knowledgeQaMedia ?? []).filter((item) => {
      const src = decodeURIComponent(item.currentSrc || item.src || '').toLowerCase();
      return src.includes(instrument);
    });
    return media.some((item) => item.paused === paused && (paused || item.readyState >= 2));
  }, { instrument, paused }, { timeout: 12000 });
}

async function assertKnowledgeAudioStopped(page, instrument) {
  await page.waitForFunction(() => {
    const media = window.__knowledgeQaMedia ?? [];
    return media.length > 0 && media.every((item) =>
      item.paused && !item.getAttribute('src') && item.networkState === HTMLMediaElement.NETWORK_EMPTY);
  }, null, { timeout: 12000 });
  const states = await mediaState(page);
  assert.ok(states.length > 0, `${instrument} audio was never registered`);
  assert.ok(states.every((media) => media.paused), 'Knowledge audio kept playing in the background');
  // Chromium can retain currentSrc as the last played URL after load() clears the resource.
  assert.ok(states.every((media) => !media.sourceAttribute && media.networkState === 0),
    `Knowledge audio resource was retained: ${JSON.stringify(states)}`);
}

async function assertIdlePlayer(page, selector, instrumentName) {
  const player = page.locator(selector);
  assert.equal(await player.count(), 1, `${instrumentName} player is missing`);
  assert.equal(
    await player.getByRole('button', { name: `播放${instrumentName}` }).count(),
    1,
    `${instrumentName} player does not show its idle play control`,
  );
  const progress = player.getByRole('slider', { name: `${instrumentName}播放进度` });
  assert.ok(await progress.isDisabled(), `${instrumentName} retained a seekable audio snapshot`);
  assert.equal(await progress.inputValue(), '0', `${instrumentName} retained audio progress`);
  assert.equal(
    (await player.locator('.instrument-preview-player__time').textContent())?.trim(),
    '0:00',
    `${instrumentName} retained audio duration`,
  );
}

async function pushKnowledgeRoute(page, route) {
  // Exercise BrowserRouter's route listener without replacing the document or Provider.
  await page.evaluate((nextRoute) => {
    window.history.pushState({}, '', nextRoute);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await waitForKnowledgePage(page, route);
}

async function scrollToBottom(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
}

async function previewButton(page, instrument, chineseName) {
  const named = page.getByRole('button', {
    name: new RegExp(`${chineseName}|${instrument}`, 'i'),
  });
  if (await named.count()) return named.first();
  const card = page.locator(`a[href*="/knowledge/instruments/${instrument}"]`)
    .first().locator('xpath=ancestor::*[contains(@class,"card")][1]');
  if (await card.count()) {
    const button = card.getByRole('button');
    if (await button.count()) return button.first();
  }
  throw new Error(`Preview button for ${instrument} not found`);
}

async function prepareScreenshot(page, route) {
  await navigate(page, route);
  await page.evaluate(async () => {
    const step = Math.max(500, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.querySelectorAll('main img')]
      .filter((img) => img.complete && img.naturalWidth > 0)
      .map((img) => img.decode().catch(() => {})));
  });
  await page.waitForTimeout(400);
  const brokenImages = await page.locator('main img').evaluateAll((images) => images
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.getAttribute('src')));
  assert.deepEqual(brokenImages, [], `broken images on ${route}`);
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
  page.on('pageerror', (error) => pageErrors.push({ route: currentRoute(page), message: error.message }));
  await page.addInitScript(() => {
    window.__knowledgeQaMedia = [];
    const register = (media) => {
      if (!window.__knowledgeQaMedia.includes(media)) window.__knowledgeQaMedia.push(media);
    };
    const originalPlay = HTMLMediaElement.prototype.play;
    const originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function (...args) {
      register(this);
      return originalPlay.apply(this, args);
    };
    HTMLMediaElement.prototype.pause = function (...args) {
      register(this);
      return originalPause.apply(this, args);
    };
  });

  try {
    for (const width of [320, 360, 393, 430]) {
      await page.setViewportSize({ width, height: 852 });
      for (const route of requiredRoutes) {
        await check(`${width}px ${route}`, async () => {
          await navigate(page, route);
          await assertNoHorizontalOverflow(page, route, width);
          if (width === 393) {
            const response = await page.reload({ waitUntil: 'domcontentloaded' });
            assert.equal(response?.status(), 200, `refresh of ${route} failed`);
            await waitForKnowledgePage(page, route);
            await assertNoHorizontalOverflow(page, route, width);
          }
        });
      }
    }

    await page.setViewportSize({ width: 393, height: 852 });
    await check('Section click and history navigation', async () => {
      await navigate(page, '/knowledge/instruments?section=woodwind');
      await clickSection(page, '铜管');
      await waitForKnowledgePage(page, '/knowledge/instruments?section=brass');
      assert.ok(await page.locator('a[href*="/knowledge/instruments/trumpet"]').count(), 'brass instruments missing');
      await clickSection(page, '弦乐');
      await waitForKnowledgePage(page, '/knowledge/instruments?section=strings');
      assert.ok(await page.locator('a[href*="/knowledge/instruments/violin"]').count(), 'strings instruments missing');
      await page.goBack();
      await waitForKnowledgePage(page, '/knowledge/instruments?section=brass');
      await page.goBack();
      await waitForKnowledgePage(page, '/knowledge/instruments?section=woodwind');
      await page.goForward();
      await waitForKnowledgePage(page, '/knowledge/instruments?section=brass');
      await page.goForward();
      await waitForKnowledgePage(page, '/knowledge/instruments?section=strings');
    });

    await check('Instrument detail preserves section return URL', async () => {
      await navigate(page, '/knowledge/instruments?section=strings');
      await page.locator('a[href*="/knowledge/instruments/violin"]').first().click();
      await waitForKnowledgePage(page, '/knowledge/instruments/violin?section=strings');
      await page.locator('a[href="/knowledge/instruments?section=strings"]').first().click();
      await waitForKnowledgePage(page, '/knowledge/instruments?section=strings');
    });

    await check('Theory 01 → 02 → 03 and browser history', async () => {
      await navigate(page, '/knowledge/theory/01');
      const heading01 = await page.locator('main h1').first().textContent();
      await clickTheoryTopic(page, '02');
      await waitForKnowledgePage(page, '/knowledge/theory/02');
      const heading02 = await page.locator('main h1').first().textContent();
      await clickTheoryTopic(page, '03');
      await waitForKnowledgePage(page, '/knowledge/theory/03');
      const heading03 = await page.locator('main h1').first().textContent();
      assert.equal(new Set([heading01, heading02, heading03]).size, 3, 'Theory headings did not change');
      await page.goBack();
      await waitForKnowledgePage(page, '/knowledge/theory/02');
      await page.goBack();
      await waitForKnowledgePage(page, '/knowledge/theory/01');
      await page.goForward();
      await waitForKnowledgePage(page, '/knowledge/theory/02');
      await page.goForward();
      await waitForKnowledgePage(page, '/knowledge/theory/03');
      await clickTheoryTopic(page, '02');
      await waitForKnowledgePage(page, '/knowledge/theory/02');
      await clickTheoryTopic(page, '01');
      await waitForKnowledgePage(page, '/knowledge/theory/01');
    });

    await check('Knowledge mode tabs connect instruments and theory', async () => {
      await navigate(page, '/knowledge/instruments');
      await page.locator('main a[href="/knowledge/theory/01"]').first().click();
      await waitForKnowledgePage(page, '/knowledge/theory/01');
      await page.locator('main a[href="/knowledge/instruments"]').first().click();
      await waitForKnowledgePage(page, '/knowledge/instruments');
    });

    await check('Library preview strip is visible and clickable above BottomNav', async () => {
      await navigate(page, '/knowledge/instruments?section=woodwind');
      const preview = page.locator('.instrument-library-page .instrument-preview-player');
      const nav = page.getByRole('navigation', { name: '主导航' });
      const previewBounds = await preview.boundingBox();
      const navBounds = await nav.boundingBox();
      assert.ok(previewBounds && navBounds, 'preview strip or BottomNav is not visible');
      assert.ok(previewBounds.y >= 0, 'preview strip is above the viewport');
      assert.ok(previewBounds.y + previewBounds.height <= navBounds.y + 2, 'preview strip overlaps BottomNav');
      await preview.getByRole('button', { name: /播放长笛/ }).click();
      await waitForMedia(page, 'flute', false);
    });

    await check('Flute preview play, pause, resume, then switch to clarinet', async () => {
      await navigate(page, '/knowledge/instruments?section=woodwind');
      const flute = await previewButton(page, 'flute', '长笛');
      await flute.click();
      await waitForMedia(page, 'flute', false);
      await flute.click();
      await waitForMedia(page, 'flute', true);
      await flute.click();
      await waitForMedia(page, 'flute', false);
      const clarinet = await previewButton(page, 'clarinet', '单簧管');
      await clarinet.click();
      await waitForMedia(page, 'clarinet', false);
      const states = await mediaState(page);
      assert.ok(states.filter((media) => !media.paused).length <= 1, 'multiple audio elements are playing');
      assert.ok(states.filter((media) => media.src.toLowerCase().includes('flute')).every((media) => media.paused), 'flute kept playing after switch');
    });

    await check('Library flute stops and resets on Theory 01', async () => {
      await navigate(page, '/knowledge/instruments?section=woodwind');
      await (await previewButton(page, 'flute', '长笛')).click();
      await waitForMedia(page, 'flute', false);
      await page.locator('.knowledge-mode-tabs a[href="/knowledge/theory/01"]').click();
      await waitForKnowledgePage(page, '/knowledge/theory/01');
      await assertKnowledgeAudioStopped(page, 'flute');
      assert.equal(await page.locator('.instrument-preview-player').count(), 0, 'Theory unexpectedly has an audio controller');
      await page.locator('.knowledge-mode-tabs a[href="/knowledge/instruments"]').click();
      await waitForKnowledgePage(page, '/knowledge/instruments');
      await assertIdlePlayer(page, '.instrument-library-page .instrument-preview-player', '长笛');
      assert.equal(await page.locator('.instrument-preview-button[aria-pressed="true"]').count(), 0, 'a card still shows playing');
    });

    await check('Library flute stops before clarinet detail', async () => {
      await navigate(page, '/knowledge/instruments?section=woodwind');
      await (await previewButton(page, 'flute', '长笛')).click();
      await waitForMedia(page, 'flute', false);
      await page.locator('a.instrument-card__link[href="/knowledge/instruments/clarinet?section=woodwind"]').click();
      await waitForKnowledgePage(page, '/knowledge/instruments/clarinet?section=woodwind');
      await assertKnowledgeAudioStopped(page, 'flute');
      await assertIdlePlayer(page, '.instrument-detail-page > .instrument-preview-player', '单簧管');
    });

    await check('Library violin continues on its own detail page', async () => {
      await navigate(page, '/knowledge/instruments?section=strings');
      await (await previewButton(page, 'violin', '小提琴')).click();
      await waitForMedia(page, 'violin', false);
      await page.locator('a.instrument-card__link[href="/knowledge/instruments/violin?section=strings"]').click();
      await waitForKnowledgePage(page, '/knowledge/instruments/violin?section=strings');
      const states = await mediaState(page);
      assert.ok(states.some((media) => media.src.toLowerCase().includes('violin') && !media.paused),
        `violin stopped on its own detail page: ${JSON.stringify(states)}`);
      assert.equal(states.filter((media) => !media.paused).length, 1, 'unexpected audio is playing');
      assert.equal(
        await page.locator('.instrument-detail-page > .instrument-preview-player')
          .getByRole('button', { name: '暂停小提琴' }).count(),
        1,
        'violin detail control disagrees with the playing audio',
      );
    });

    await check('Violin detail stops before cello detail', async () => {
      await navigate(page, '/knowledge/instruments/violin?section=strings');
      await page.locator('.instrument-detail-page > .instrument-preview-player')
        .getByRole('button', { name: '播放小提琴' }).click();
      await waitForMedia(page, 'violin', false);
      await pushKnowledgeRoute(page, '/knowledge/instruments/cello?section=strings');
      await assertKnowledgeAudioStopped(page, 'violin');
      await assertIdlePlayer(page, '.instrument-detail-page > .instrument-preview-player', '大提琴');
    });

    await check('393px woodwind scene clears fixed player at page bottom', async () => {
      await navigate(page, '/knowledge/instruments?section=woodwind');
      await scrollToBottom(page);
      const layout = await page.evaluate(() => {
        const scene = document.querySelector('.instrument-library-page .instrument-scene');
        const art = document.querySelector('.instrument-library-page .instrument-scene__art img');
        const player = document.querySelector('.instrument-library-page .instrument-preview-player');
        const nav = document.querySelector('nav[aria-label="主导航"]');
        if (!scene || !art || !player || !nav) return null;
        const sceneRect = scene.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        return {
          sceneTop: sceneRect.top,
          sceneBottom: sceneRect.bottom,
          sceneHeight: sceneRect.height,
          playerTop: playerRect.top,
          playerBottom: playerRect.bottom,
          navTop: navRect.top,
          viewportHeight: window.innerHeight,
          sceneImageLoaded: art.complete && art.naturalWidth > 0,
        };
      });
      assert.ok(layout, 'scene, player, or BottomNav is missing');
      assert.ok(layout.sceneImageLoaded, 'woodwind scene image did not load');
      assert.ok(layout.sceneTop >= 0 && layout.sceneBottom <= layout.viewportHeight,
        `scene is not fully visible at the page bottom: ${JSON.stringify(layout)}`);
      assert.ok(layout.sceneBottom <= layout.playerTop - 8,
        `fixed player overlaps the scene or leaves less than 8px of space: ${JSON.stringify(layout)}`);
      assert.ok(layout.playerBottom <= layout.navTop + 2,
        `fixed player overlaps BottomNav: ${JSON.stringify(layout)}`);
    });

    await check('Violin detail audio playback, progress, and seek', async () => {
      await navigate(page, '/knowledge/instruments/violin?section=strings');
      const control = page.getByRole('button', { name: /播放|试听|play/i }).first();
      assert.ok(await control.count(), 'detail audio play button missing');
      await control.click();
      await waitForMedia(page, 'violin', false);
      await page.waitForFunction(() => (window.__knowledgeQaMedia ?? []).some((media) =>
        decodeURIComponent(media.currentSrc || media.src || '').toLowerCase().includes('violin')
        && media.currentTime > 0), null, { timeout: 12000 });
      try {
        await page.waitForFunction(() => (window.__knowledgeQaMedia ?? []).some((media) =>
          decodeURIComponent(media.currentSrc || media.src || '').toLowerCase().includes('violin')
          && Number.isFinite(media.duration) && media.duration > 0),
        null, { timeout: 20000 });
      } catch {
        throw new Error(`violin audio duration never became available: ${JSON.stringify(await mediaState(page))}`);
      }
      const states = await mediaState(page);
      const violin = states.find((media) => media.src.toLowerCase().includes('violin'));
      assert.ok(violin && violin.currentTime > 0, 'violin audio progress did not advance');
      const slider = page.getByRole('slider', { name: /小提琴播放进度/ });
      assert.ok(await slider.count(), 'detail seek slider missing');
      assert.ok(violin.duration > 0, 'violin audio duration is unavailable');
      const bounds = await slider.boundingBox();
      assert.ok(bounds, 'detail seek slider is not visible');
      await slider.click({ position: { x: bounds.width * 0.65, y: bounds.height / 2 } });
      await page.waitForFunction(() => (window.__knowledgeQaMedia ?? []).some((media) =>
        decodeURIComponent(media.currentSrc || media.src || '').toLowerCase().includes('violin')
        && Number.isFinite(media.duration) && media.currentTime > media.duration * 0.4),
      null, { timeout: 12000 });
    });

    await check('3D model waits for an explicit detail-page request', async () => {
      const modelRequests = [];
      const recordModelRequest = (request) => {
        if (request.url().includes('/assets/models/')) modelRequests.push(request.url());
      };
      page.on('request', recordModelRequest);
      try {
        await navigate(page, '/knowledge/instruments?section=strings');
        await navigate(page, '/knowledge/instruments/violin?section=strings');
        assert.deepEqual(modelRequests, [], 'a 3D model was fetched before the user asked to view it');
        const requestPromise = page.waitForRequest(
          (request) => request.url().includes('/assets/models/violin/scene.optimized.glb'),
          { timeout: 15000 },
        );
        await page.getByRole('button', { name: /查看 3D 模型/ }).click();
        await page.locator('.instrument-detail-page__model').scrollIntoViewIfNeeded();
        await requestPromise;
      } finally {
        page.off('request', recordModelRequest);
      }
    });

    await fs.mkdir(screenshotDir, { recursive: true });
    for (const { route, file, fullPage, bottom } of screenshots) {
      await check(`Screenshot ${file}`, async () => {
        await prepareScreenshot(page, route);
        if (bottom) await scrollToBottom(page);
        await page.screenshot({ path: path.join(screenshotDir, file), fullPage, animations: 'disabled' });
      });
    }

    await check('No uncaught page errors', async () => {
      assert.deepEqual(pageErrors, []);
    });
  } finally {
    await browser.close();
  }

  const report = {
    baseUrl,
    screenshotDir,
    routes: requiredRoutes,
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
