import { loadScript } from './loadScript';

let cachedLoad: Promise<void> | null = null;

interface AFrameWindow extends Window {
  AFRAME?: {
    components?: Record<string, unknown>;
  };
}

function hasMindArRegistration() {
  const runtimeWindow = window as AFrameWindow;

  return Boolean(runtimeWindow.AFRAME?.components?.['mindar-image']);
}

export function ensureMindArAssets() {
  if (!cachedLoad) {
    cachedLoad = (async () => {
      await loadScript('/vendor/aframe.min.js');
      await loadScript('/vendor/mindar/mindar-image-aframe.prod.js');

      if (!hasMindArRegistration()) {
        throw new Error(
          'MindAR 组件未注册成功。通常是脚本加载顺序异常，请刷新页面后重试。',
        );
      }
    })().catch((error) => {
      cachedLoad = null;
      throw error;
    });
  }

  return cachedLoad;
}
