import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { findHorizontalSurface } from './surface';

window.THREE = THREE;
const channel = 'orchestra-world-ar',
  canvas = document.getElementById('camera');
const panel = document.getElementById('start'),
  button = document.getElementById('permission');
let closed = false,
  started = false,
  config,
  model,
  renderer,
  reticle,
  xrScene,
  placed = false,
  tracking = false;
let status = '',
  candidate = null,
  candidateSince = 0,
  lastProbe = 0,
  timeout,
  searchStarted = 0,
  everTracked = false;
const progress = { engine: 'loading', model: 'downloading', received: 0, total: 0 };
const abort = new AbortController(),
  streams = new Set();
const send = (type, value) => {
  if (!closed) parent.postMessage({ channel, type, value }, location.origin);
};
const report = (value) => {
  if (status !== value) {
    status = value;
    send('status', value);
  }
};
const disposeModel = (object) =>
  object?.traverse((o) => {
    o.geometry?.dispose();
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    materials.filter(Boolean).forEach((m) => {
      Object.values(m).forEach((v) => {
        if (v?.isTexture) v.dispose();
      });
      m.dispose();
    });
  });
const stop = () => {
  if (closed) return;
  closed = true;
  clearTimeout(timeout);
  abort.abort();
  try {
    window.XR8?.stop();
  } catch {
    /* The engine may still be initializing. */
  }
  streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  streams.clear();
  disposeModel(model);
  disposeModel(reticle);
  renderer?.dispose();
};
const fail = (message) => {
  send('error', message);
  stop();
};
window.addEventListener('pagehide', stop);
window.addEventListener('orchestra-stop', stop);
window.addEventListener('unhandledrejection', () => fail('实景资源无法启动，请检查网络后重试。'));
window.addEventListener('error', () => fail('实景场景运行异常，请重试。'));
const resize = () => {
  if (renderer) {
    renderer.setSize(innerWidth, innerHeight, false);
  }
};
window.addEventListener('resize', resize);

async function loadEngine() {
  report('loading-engine');
  await new Promise((resolve, reject) => {
    const loaded = () => {
      window.removeEventListener('xrloaded', loaded);
      resolve();
    };
    if (window.XR8) {
      resolve();
      return;
    }
    window.addEventListener('xrloaded', loaded);
    const script = document.createElement('script');
    script.src = '/vendor/8thwall-1.0.0/xr.js';
    script.dataset.preloadChunks = 'slam';
    script.onerror = () => reject(new Error('空间追踪引擎下载失败，请重试。'));
    document.head.appendChild(script);
  });
  await window.XR8.loadChunk('slam');
  progress.engine = 'ready';
  send('progress', progress);
}
async function loadModel(url) {
  const response = await fetch(url, { signal: abort.signal });
  if (!response.ok) throw new Error('人物模型下载失败，请重试。');
  progress.total = Number(response.headers.get('content-length')) || 0;
  const chunks = [],
    reader = response.body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      progress.received += value.length;
      send('progress', progress);
    }
  } else {
    const value = new Uint8Array(await response.arrayBuffer());
    chunks.push(value);
    progress.received = value.length;
  }
  const bytes = new Uint8Array(progress.received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  progress.model = 'parsing';
  send('progress', progress);
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer,
    new URL('.', new URL(url, location.href)).href,
  );
  if (closed) {
    disposeModel(gltf.scene);
    return;
  }
  model = gltf.scene;
  model.scale.setScalar(0.2);
  model.visible = false;
  progress.model = 'ready';
  send('progress', progress);
}
function place() {
  if (closed || !tracking || !candidate || performance.now() - candidateSince < 650 || !model)
    return;
  model.position.copy(candidate);
  model.visible = true;
  placed = true;
  reticle.visible = false;
  report('placed');
}
function applyCommand(type, value) {
  if (type === 'stop') {
    stop();
    return;
  }
  if (type === 'place') place();
  if (type === 'reset' && model) {
    placed = false;
    candidate = null;
    candidateSince = 0;
    searchStarted = performance.now();
    model.visible = false;
    report('searching');
  }
  if (type === 'scale' && model && Number.isFinite(value))
    model.scale.setScalar(Math.max(0.08, Math.min(0.6, value)));
  if (type === 'rotate' && model && Number.isFinite(value))
    model.rotation.y = (value * Math.PI) / 180;
}
window.addEventListener('message', async (event) => {
  if (
    event.source !== parent ||
    event.origin !== location.origin ||
    event.data?.channel !== channel
  )
    return;
  const { type, value } = event.data;
  if (type !== 'configure') {
    applyCommand(type, value);
    return;
  }
  if (config) return;
  config = value;
  timeout = setTimeout(() => fail('资源准备超时，请重试。'), 45000);
  try {
    await Promise.all([loadEngine(), loadModel(config.modelUrl)]);
    if (closed) return;
    clearTimeout(timeout);
    report('ready');
    button.disabled = false;
  } catch (error) {
    if (!closed) fail(error.message);
  }
});
button.disabled = true;
button.addEventListener('click', async () => {
  if (!config || closed || started || button.disabled) return;
  started = true;
  report('permission');
  try {
    // iOS motion permission must originate inside this frame's user gesture.
    if (typeof window.DeviceMotionEvent?.requestPermission === 'function') {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== 'granted') throw new Error('请允许运动与方向访问，以固定人物的位置。');
    }
    if (closed) return;
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error('请通过 HTTPS，在 Safari 或 Chrome 中打开。');
    const nativeGet = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      try {
        const stream = await nativeGet(constraints);
        if (closed) {
          stream.getTracks().forEach((t) => t.stop());
          throw new DOMException('Closed', 'AbortError');
        }
        streams.add(stream);
        // Start this watchdog only after permission has actually been granted.
        // Time spent deciding in the browser permission prompt is unbounded.
        clearTimeout(timeout);
        timeout=setTimeout(()=>fail('相机已打开，但空间追踪尚未就绪。请重试或使用普通 3D 预览。'),15000);
        return stream;
      } catch (error) {
        if (!closed)
          fail(
            error.name === 'NotAllowedError'
              ? '请在浏览器设置中允许相机访问后重试。'
              : '相机无法启动，请关闭其他占用相机的应用。',
          );
        throw error;
      }
    };
    const XR8 = window.XR8;
    XR8.XrController.configure({
      enableWorldPoints: true,
      disableWorldTracking: false,
      scale: 'absolute',
    });
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      {
        name: 'oboe-surface',
        onStart: () => {
          if (closed) return;
          clearTimeout(timeout);
          ({ scene: xrScene, renderer } = XR8.Threejs.xrScene());
          const { camera } = XR8.Threejs.xrScene();
          camera.position.set(0, 1.5, 0);
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
          resize();
          xrScene.add(new THREE.AmbientLight(0xffffff, 2));
          const light = new THREE.DirectionalLight(0xffffff, 2);
          light.position.set(1, 3, 2);
          xrScene.add(light, model);
          reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.055, 0.065, 36),
            new THREE.MeshBasicMaterial({ color: 0xb8e2b2, side: THREE.DoubleSide }),
          );
          reticle.rotation.x = -Math.PI / 2;
          reticle.visible = false;
          xrScene.add(reticle);
          XR8.XrController.updateCameraProjectionMatrix({
            origin: camera.position,
            facing: camera.quaternion,
          });
          panel.style.display = 'none';
          searchStarted = performance.now();
          report('searching');
        },
        onUpdate: ({ processCpuResult }) => {
          if (closed || !reticle) return;
          const reality = processCpuResult?.reality;
          tracking = reality?.trackingStatus === 'NORMAL';
          if (!tracking) {
            reticle.visible = false;
            model.visible = false;
            candidate = null;
            report(
              everTracked
                ? 'tracking-lost'
                : performance.now() - searchStarted > 15000
                  ? 'searching-slow'
                  : 'searching',
            );
            return;
          }
          everTracked = true;
          if (placed) {
            model.visible = true;
            report('placed');
            return;
          }
          if (performance.now() - lastProbe < 100) return;
          lastProbe = performance.now();
          const { camera } = XR8.Threejs.xrScene();
          const hit = findHorizontalSurface(
            reality.worldPoints ?? [],
            camera.position,
            camera.getWorldDirection(new THREE.Vector3()),
          );
          if (!hit) {
            candidate = null;
            candidateSince = 0;
            reticle.visible = false;
            report(performance.now() - searchStarted > 15000 ? 'searching-slow' : 'searching');
            return;
          }
          const next = new THREE.Vector3(hit.x, hit.y, hit.z);
          if (!candidate || candidate.distanceTo(next) > 0.035) {
            candidateSince = performance.now();
            candidate = next;
          } else candidate.lerp(next, 0.2);
          reticle.position.copy(candidate);
          reticle.visible = true;
          report(performance.now() - candidateSince >= 650 ? 'surface-ready' : 'searching');
        },
        onException: () => fail('空间追踪启动失败，请重试或使用普通 3D 预览。'),
        onCameraStatusChange: ({ status }) => {
          if (status === 'failed') fail('相机未能启动，请检查访问权限。');
        },
      },
    ]);
    await XR8.run({ canvas, allowedDevices: XR8.XrConfig.device().MOBILE });
  } catch (error) {
    if (!closed) fail(error.message);
  }
});
canvas.addEventListener('click', place);
