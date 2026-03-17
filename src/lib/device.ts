export interface DeviceCapabilities {
  canUseCamera: boolean;
  canUseAr: boolean;
  isAndroid: boolean;
  isIPhone: boolean;
}

interface RequestCameraAccessOptions {
  releaseDelayMs?: number;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export async function requestCameraAccess(
  options: RequestCameraAccessOptions = {},
) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持摄像头访问，请使用最新版 Safari 或 Chrome 重试。');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: {
        ideal: 'environment',
      },
    },
  });

  stream.getTracks().forEach((track) => track.stop());

  if (options.releaseDelayMs && options.releaseDelayMs > 0) {
    await wait(options.releaseDelayMs);
  }
}

export function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
      case 'SecurityError':
        return '尚未获得摄像头权限，请在浏览器站点设置中允许访问相机后重试。';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
      case 'OverconstrainedError':
        return '没有找到可用的后置摄像头，请确认当前设备具备摄像头并未被系统限制。';
      case 'NotReadableError':
      case 'TrackStartError':
      case 'AbortError':
        return '摄像头当前可能被其他应用占用，请关闭占用相机的应用后重试。';
      default:
        return `摄像头启动失败：${error.message || error.name}`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '摄像头启动失败，请稍后重试。';
}

export function getDeviceCapabilities(): DeviceCapabilities {
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes('android');
  const isIPhone = /iphone|ipad|ipod/.test(userAgent);
  const canUseCamera = Boolean(navigator.mediaDevices?.getUserMedia);
  const secureContext =
    window.isSecureContext || window.location.hostname === 'localhost';

  return {
    canUseCamera,
    canUseAr: canUseCamera && secureContext,
    isAndroid,
    isIPhone,
  };
}
