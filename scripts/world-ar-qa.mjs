// SDK download is tested separately by mobile-optimization-qa. This fixture
// supplies deterministic poses, not a claim of physical-device SLAM accuracy.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
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
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4190';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_EXECUTABLE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({ viewport: { width: 393, height: 852 } }),
  results = [];
await context.addInitScript(() => {
  if (window === top) {
    window.__streams = [];
    window.__stops = 0;
    window.__messages = [];
    window.addEventListener('message', (e) => {
      if (e.data?.channel === 'orchestra-world-ar') window.__messages.push(e.data);
    });
  }
  const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (options) => {
    const s = await get(options);
    top.__streams.push(s);
    return s;
  };
});
const sdk = `(()=>{
 let modules=[],scene,stream;
 window.__tracking='NORMAL';
 window.XR8={loadChunk:async()=>{},GlTextureRenderer:{pipelineModule:()=>({name:'texture'})},Threejs:{pipelineModule:()=>({name:'three'}),xrScene:()=>scene},XrController:{configure:()=>{},pipelineModule:()=>({name:'slam'}),updateCameraProjectionMatrix:()=>{}},XrConfig:{device:()=>({MOBILE:'mobile'})},addCameraPipelineModules:m=>modules=m,stop:()=>{top.__stops++;clearInterval(window.__ticks);stream?.getTracks().forEach(t=>t.stop())},run:async({canvas})=>{
 stream=await navigator.mediaDevices.getUserMedia({video:true});scene={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),renderer:new THREE.WebGLRenderer({canvas})};const module=modules.at(-1);module.onStart();scene.camera.lookAt(0,.75,-1);scene.camera.updateMatrixWorld();window.__scene=scene;
 window.__ticks=setInterval(()=>module.onUpdate({processCpuResult:{reality:{trackingStatus:window.__tracking,worldPoints:Array.from({length:25},(_,i)=>({confidence:.9,position:{x:(i%5-2)*.05,y:.75,z:-1+(Math.floor(i/5)-2)*.05}}))}}}),110);
 }};window.dispatchEvent(new Event('xrloaded'));
})();`;
await context.route('**/vendor/8thwall-1.0.0/xr.js', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: sdk }),
);
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log('PASS', name);
};
const open = async () => {
  await page.goto(base + '/stage?view=ar&entry=oboe-player');
  await page.frameLocator('iframe').getByRole('button', { name: '开始实景 AR' }).click();
  await page.getByText('位置已稳定，可以点击放置', { exact: true }).waitFor({ timeout: 20000 });
};
try {
  await check(
    'Placement uses tracked table height, pose stays fixed, lost tracking hides and restores model',
    async () => {
      await open();
      await page.getByRole('button', { name: '放置人物', exact: true }).click();
      await page.getByText('人物已放置 · 移动手机观察不同角度', { exact: true }).waitFor();
      const f = page.frames()[1];
      const before = await f.evaluate(() => {
        const m = __scene.scene.children.find((o) => o.type === 'Group');
        return { position: m.position.toArray(), visible: m.visible };
      });
      assert.equal(before.position[1], 0.75);
      assert.equal(before.visible, true);
      await f.evaluate(() => {
        __scene.camera.position.set(0.4, 1.4, 0.1);
        __tracking = 'LIMITED';
      });
      await page.getByText('暂时无法定位', { exact: false }).waitFor();
      assert.equal(
        await f.evaluate(() => __scene.scene.children.find((o) => o.type === 'Group').visible),
        false,
      );
      await f.evaluate(() => (__tracking = 'NORMAL'));
      await page.getByText('人物已放置 · 移动手机观察不同角度', { exact: true }).waitFor();
      assert.deepEqual(
        await f.evaluate(() =>
          __scene.scene.children.find((o) => o.type === 'Group').position.toArray(),
        ),
        before.position,
      );
      await page.getByRole('slider', { name: '人物大小' }).evaluate((el) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '.4');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(150);
      assert.equal(
        await f.evaluate(() => __scene.scene.children.find((o) => o.type === 'Group').scale.x),
        0.4,
      );
      await page.getByRole('button', { name: '重新放置' }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('.world-ar .ar-status').textContent !==
          '人物已放置 · 移动手机观察不同角度',
      );
      await page.getByRole('button', { name: '关闭相机', exact: true }).click();
      await page.locator('iframe').waitFor({ state: 'detached' });
      assert.ok(
        await page.evaluate(() =>
          __streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
        ),
      );
    },
  );
  await check(
    'Five world-camera cycles release tracks and renderer owner, landscape stays usable',
    async () => {
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: '打开实景 AR', exact: true }).click();
        await page.frameLocator('iframe').getByRole('button', { name: '开始实景 AR' }).click();
        await page.getByText('位置已稳定，可以点击放置', { exact: true }).waitFor();
        if (i === 1) {
          await page.setViewportSize({ width: 852, height: 393 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await page.setViewportSize({ width: 393, height: 852 });
        }
        await page.getByRole('button', { name: '关闭相机', exact: true }).click();
        await page.locator('iframe').waitFor({ state: 'detached' });
        assert.ok(
          await page.evaluate(() =>
            __streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
          ),
        );
      }
      assert.equal(await page.evaluate(() => __stops), 6);
    },
  );
  await check('Hidden document releases camera and requires explicit restart', async () => {
    await page.getByRole('button', { name: '打开实景 AR', exact: true }).click();
    await page.frameLocator('iframe').getByRole('button', { name: '开始实景 AR' }).click();
    await page.getByText('位置已稳定，可以点击放置', { exact: true }).waitFor();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.locator('iframe').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '继续体验' }).waitFor();
    assert.ok(
      await page.evaluate(() =>
        __streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
      ),
    );
  });
  await check('Model failure and permission denial offer retry and ordinary 3D', async () => {
    const model = JSON.parse(await readFile('src/data/mediaAssets.json', 'utf8')).models[
      'oboe-player'
    ];
    await page.route('**' + model, (r) => r.fulfill({ status: 404, body: 'missing' }));
    await page.goto(base + '/stage?view=ar');
    await page.getByRole('button', { name: '重新启动实景 AR' }).waitFor();
    await page.locator('iframe').waitFor({ state: 'detached' });
    await page.unroute('**' + model);
    await page.getByRole('button', { name: '重新启动实景 AR' }).click();
    await page.frameLocator('iframe').getByRole('button', { name: '开始实景 AR' }).waitFor();
    await page.frames()[1].evaluate(
      () =>
        (navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        }),
    );
    await page.frameLocator('iframe').getByRole('button', { name: '开始实景 AR' }).click();
    await page.getByText('请在浏览器设置中允许相机访问后重试。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '普通 3D 预览', exact: true }).click();
    await page.getByRole('button', { name: '恢复视角' }).waitFor();
  });
  assert.deepEqual(errors, []);
} finally {
  await mkdir('.runtime/optimization-qa', { recursive: true });
  await writeFile(
    '.runtime/optimization-qa/world-states.json',
    JSON.stringify(
      {
        results,
        errors,
        fixture:
          'Real browser camera stream + deterministic SDK poses; physical SLAM still requires phones.',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
