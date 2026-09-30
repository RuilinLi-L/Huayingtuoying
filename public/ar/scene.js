/* One iframe per AR session: teardown destroys the whole A-Frame/TF context. */
(() => {
  const channel = 'orchestra-ar';
  const hint = document.getElementById('hint');
  let started = false, closed = false, failed = false, modelReady = false, arReady = false, found = false;
  let startupTimer, modelTimer;
  const streams = new Set();
  const send = (type, value) => { if (!closed) parent.postMessage({ channel, type, value }, location.origin); };
  const stopStreams = () => { for (const stream of streams) stream.getTracks().forEach(track => track.stop()); streams.clear(); };
  const fail = message => {
    if (failed || closed) return;
    failed = true; clearTimeout(startupTimer); clearTimeout(modelTimer);
    stopStreams(); hint.textContent = message; send('error', message);
  };
  const updateStatus = () => {
    if (failed || closed) return;
    const status = !modelReady || !arReady ? 'loading' : found ? 'found' : 'scanning';
    hint.textContent = !modelReady ? '正在加载 3D 模型…' : !arReady ? '正在准备相机与识别引擎…' : found ? '识别成功 · 缓慢移动手机，观察人物' : '请将完整识别图放入画面';
    send('status', status);
  };
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = () => reject(new Error('识图资源加载失败，请检查网络后重试。'));
    document.head.appendChild(script);
  });
  const element = (tag, attributes, parentNode) => {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    parentNode.appendChild(node); return node;
  };
  const vector = value => `${value.x} ${value.y} ${value.z}`;
  const cameraMessage = error => ['NotAllowedError', 'SecurityError'].includes(error.name)
    ? '相机权限未开启，请在浏览器站点设置中允许访问相机后重试。'
    : error.name === 'NotFoundError' ? '没有找到可用摄像头，可以切换到普通 3D 预览。'
    : '相机无法启动，请关闭其他占用相机的应用后重试。';
  window.addEventListener('pagehide', () => { closed = true; clearTimeout(startupTimer); clearTimeout(modelTimer); stopStreams(); });
  window.addEventListener('error', event => { if (event.message) fail('识图场景运行异常，请重试。'); });
  window.addEventListener('unhandledrejection', event => fail(`识图场景启动失败：${event.reason?.message ?? '资源加载异常，请重试。'}`));
  window.addEventListener('message', async event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== channel || event.data.type !== 'start' || started) return;
    started = true;
    const { modelUrl, scene, cards } = event.data.config;
    // Track late permission grants as well as active streams in this context only.
    if (!navigator.mediaDevices?.getUserMedia) { fail('当前环境无法使用相机，请使用 HTTPS 和系统浏览器打开。'); return; }
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      try {
        const stream = await getUserMedia(constraints);
        if (closed || failed) { stream.getTracks().forEach(track => track.stop()); throw new DOMException('Session closed', 'AbortError'); }
        streams.add(stream); return stream;
      } catch (error) { if (!closed && !failed) fail(cameraMessage(error)); throw error; }
    };
    try {
      startupTimer = setTimeout(() => fail('识图场景加载超时，请检查网络后重试。'), 30000);
      await load('/vendor/aframe.min.js');
      await load('/vendor/mindar/mindar-image.prod.js');
      await load('/vendor/mindar/mindar-image-aframe.prod.js');
      if (!window.AFRAME?.components?.['mindar-image']) throw new Error('识图引擎未能加载，请重试。');
      if (closed || failed) return;
      // Fetch first: MindAR 1.1's addImageTargets does not reject failed fetches.
      const target = await fetch(scene.target.trackingTargetSrc);
      if (!target.ok || target.headers.get('content-type')?.includes('text/html')) throw new Error('识别文件不存在或无法下载。');
      const targetUrl = URL.createObjectURL(await target.blob());
      const stage = document.getElementById('stage');
      const ar = document.createElement('a-scene');
      ar.setAttribute('embedded', '');
      ar.setAttribute('mindar-image', `imageTargetSrc: ${targetUrl}; autoStart: false; uiLoading: no; uiScanning: no; uiError: no; maxTrack: 1;`);
      ar.setAttribute('renderer', 'alpha: true; antialias: false; colorManagement: true; maxCanvasWidth: 1280; maxCanvasHeight: 720');
      ar.setAttribute('xr-mode-ui', 'enabled: false'); ar.setAttribute('vr-mode-ui', 'enabled: false'); ar.setAttribute('device-orientation-permission-ui', 'enabled: false');
      ar.setAttribute('color-space', 'sRGB');
      element('a-camera', { position: '0 0 0', 'look-controls': 'enabled: false', cursor: 'rayOrigin: mouse', raycaster: 'objects: .clickable' }, ar);
      element('a-entity', { light: 'type: ambient; intensity: 1.4' }, ar);
      element('a-entity', { light: 'type: directional; intensity: 0.7', position: '0 1 1' }, ar);
      const anchor = element('a-entity', { 'mindar-image-target': `targetIndex: ${scene.target.targetIndex ?? 0}` }, ar);
      if (scene.showTargetPlane !== false) element('a-plane', { src: scene.target.previewImage, width: 1, height: 0.62 }, anchor);
      const model = element('a-gltf-model', { src: modelUrl, position: vector(scene.modelPosition), scale: vector(scene.modelScale), rotation: vector(scene.modelRotation) }, anchor);
      if (scene.floating !== false) model.setAttribute('animation', 'property: position; to: 0 0.1 0.12; dur: 1400; easing: easeInOutQuad; loop: true; dir: alternate');
      if (scene.showHotspots !== false) cards.slice(0, 3).forEach((card, index) => {
        const node = element('a-sphere', { class: 'clickable', position: ['-0.36 0.18 0.08', '0 0.36 0.08', '0.36 0.18 0.08'][index], radius: 0.045, color: scene.accentColor }, anchor);
        node.addEventListener('click', () => send('card', card.id));
      });
      model.addEventListener('model-loaded', () => { modelReady = true; clearTimeout(modelTimer); send('debug', '3D 模型加载完成'); updateStatus(); });
      model.addEventListener('model-error', () => fail('3D 模型加载失败，请检查网络后重试，或切换到普通 3D 预览。'));
      anchor.addEventListener('targetFound', () => { found = true; updateStatus(); });
      anchor.addEventListener('targetLost', () => {
        found = false;
        if (arReady && modelReady && !failed) { hint.textContent = '目标暂时离开画面，请重新对准识别图'; send('status', 'lost'); }
      });
      ar.addEventListener('arReady', () => { arReady = true; clearTimeout(startupTimer); URL.revokeObjectURL(targetUrl); updateStatus(); });
      ar.addEventListener('arError', () => fail('识图引擎无法启动，请确认相机权限后重试。'));
      ar.addEventListener('renderstart', () => { if (!closed && !failed) ar.systems['mindar-image-system'].start(); }, { once: true });
      modelTimer = setTimeout(() => fail('3D 模型加载超时，请检查网络后重试。'), 30000);
      stage.appendChild(ar);
    } catch (error) { fail(error.message || '识图场景启动失败，请重试。'); }
  });
})();
