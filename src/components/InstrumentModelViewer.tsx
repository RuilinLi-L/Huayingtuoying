import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type Mesh,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface InstrumentModelViewerProps {
  modelUrl?: string;
  title: string;
  accentColor: string;
}

interface NormalizedModel {
  object: Object3D;
  fitSize: {
    width: number;
    height: number;
  };
}

type ModelStatus = 'empty' | 'waiting' | 'loading' | 'ready' | 'timeout' | 'error';

const MODEL_LOAD_TIMEOUT_MS = 25000;
const MOBILE_PIXEL_RATIO_LIMIT = 1.35;
const DESKTOP_PIXEL_RATIO_LIMIT = 1.75;

function isMobileViewport() {
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

function getModelBasePath(modelUrl: string) {
  const baseUrl = new URL(modelUrl, window.location.href);
  const lastSlashIndex = baseUrl.pathname.lastIndexOf('/');

  baseUrl.pathname = baseUrl.pathname.slice(0, lastSlashIndex + 1);
  baseUrl.search = '';
  baseUrl.hash = '';

  return baseUrl.href;
}

async function readResponseBuffer(
  response: Response,
  onProgress: (progress: number | null) => void,
  signal: AbortSignal,
) {
  const contentLength = Number(response.headers.get('content-length') ?? 0);

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress(1);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (signal.aborted) {
      await reader.cancel();
      throw new DOMException('Model load aborted', 'AbortError');
    }

    chunks.push(value);
    receivedLength += value.length;
    onProgress(contentLength ? receivedLength / contentLength : null);
  }

  const bytes = new Uint8Array(receivedLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });

  onProgress(1);
  return bytes.buffer;
}

async function fetchModelBuffer(
  modelUrl: string,
  signal: AbortSignal,
  onProgress: (progress: number | null) => void,
) {
  const response = await fetch(modelUrl, { signal });

  if (!response.ok) {
    throw new Error(`请求模型失败（HTTP ${response.status}）`);
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('text/html')) {
    throw new Error('模型地址返回了 HTML，通常表示线上文件不存在或被路由回退。');
  }

  return readResponseBuffer(response, onProgress, signal);
}

function parseModel(loader: GLTFLoader, buffer: ArrayBuffer, modelUrl: string) {
  return new Promise<Object3D>((resolve, reject) => {
    loader.parse(
      buffer,
      getModelBasePath(modelUrl),
      (gltf) => resolve(gltf.scene),
      (error) => reject(error),
    );
  });
}

function disposeObject(root: Object3D) {
  const disposeMaterial = (material: Material) => {
    Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
      if (
        value &&
        typeof value === 'object' &&
        'dispose' in value &&
        typeof value.dispose === 'function'
      ) {
        value.dispose();
      }
    });

    material.dispose();
  };

  root.traverse((object) => {
    const mesh = object as Mesh;

    mesh.geometry?.dispose();

    const material = mesh.material as Material | Material[] | undefined;

    if (Array.isArray(material)) {
      material.forEach(disposeMaterial);
      return;
    }

    if (material) {
      disposeMaterial(material);
    }
  });
}

function normalizeModel(model: Object3D): NormalizedModel {
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const largestAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = 1.8 / largestAxis;
  const normalizedModel = new Group();
  const rotateLongDepthToSide = size.z > Math.max(size.x, size.y) * 1.15;
  const displayWidth = rotateLongDepthToSide ? size.z : size.x;
  const displayDepth = rotateLongDepthToSide ? size.x : size.z;

  model.position.sub(center);
  normalizedModel.scale.set(scale, scale, scale);

  if (rotateLongDepthToSide) {
    normalizedModel.rotation.y = Math.PI / 2;
  }

  normalizedModel.add(model);

  return {
    object: normalizedModel,
    fitSize: {
      width: Math.hypot(displayWidth, displayDepth) * scale,
      height: size.y * scale,
    },
  };
}

export function InstrumentModelViewer({
  modelUrl,
  title,
  accentColor,
}: InstrumentModelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<ModelStatus>(modelUrl ? 'waiting' : 'empty');

  useEffect(() => {
    const container = containerRef.current;

    if (!modelUrl) {
      setIsVisible(false);
      return undefined;
    }

    if (!container || isVisible) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [isVisible, modelUrl]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    if (!modelUrl) {
      setStatus('empty');
      setLoadProgress(null);
      return undefined;
    }

    if (!isVisible) {
      setStatus('waiting');
      setLoadProgress(null);
      container.replaceChildren();
      return undefined;
    }

    setStatus('loading');
    setLoadProgress(0);
    container.replaceChildren();

    const abortController = new AbortController();
    const scene = new Scene();
    const cameraFov = 36;
    const camera = new PerspectiveCamera(cameraFov, 1, 0.1, 100);
    const root = new Group();
    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    let modelFitSize = { width: 1.8, height: 1.8 };
    let disposed = false;
    let animationFrame = 0;

    scene.background = new Color(0xf7f3ea);
    scene.add(root);
    scene.add(new AmbientLight(0xffffff, 1.8));

    const keyLight = new DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.5, 3, 3);
    scene.add(keyLight);

    const rimLight = new DirectionalLight(new Color(accentColor), 1.2);
    rimLight.position.set(-2, 1.8, -2.6);
    scene.add(rimLight);

    camera.position.set(0, 0, 4.2);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        isMobileViewport() ? MOBILE_PIXEL_RATIO_LIMIT : DESKTOP_PIXEL_RATIO_LIMIT,
      ),
    );
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.target.set(0, 0, 0);
    controls.update();

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    const getCameraDistance = () => {
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 420;
      const aspect = width / height || 1;
      const requiredViewHeight = Math.max(
        modelFitSize.height,
        modelFitSize.width / aspect,
      );
      const fovRadians = (cameraFov * Math.PI) / 180;

      return Math.max(
        (requiredViewHeight * 1.16) / (2 * Math.tan(fovRadians / 2)),
        2.2,
      );
    };

    const fitInitialView = () => {
      const cameraDistance = getCameraDistance();

      camera.position.set(0, 0, cameraDistance);
      controls.target.set(0, 0, 0);
      controls.minDistance = Math.max(cameraDistance * 0.35, 0.4);
      controls.maxDistance = cameraDistance * 3.2;
      controls.update();
    };

    const resize = () => {
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 420;
      const aspect = width / height || 1;

      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    const timeoutId = window.setTimeout(() => {
      abortController.abort();

      if (!disposed) {
        setStatus('timeout');
      }
    }, MODEL_LOAD_TIMEOUT_MS);

    void fetchModelBuffer(modelUrl, abortController.signal, (progress) => {
      if (!disposed) {
        setLoadProgress(progress);
      }
    })
      .then((buffer) => parseModel(loader, buffer, modelUrl))
      .then((model) => {
        if (disposed) {
          disposeObject(model);
          return;
        }

        window.clearTimeout(timeoutId);

        const normalizedModel = normalizeModel(model);

        modelFitSize = normalizedModel.fitSize;
        resize();
        fitInitialView();
        root.add(normalizedModel.object);
        setLoadProgress(1);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        window.clearTimeout(timeoutId);

        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatus('timeout');
          return;
        }

        setStatus('error');
      });

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      disposed = true;
      abortController.abort();
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      controls.dispose();
      disposeObject(root);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accentColor, isVisible, modelUrl]);

  const progressLabel =
    typeof loadProgress === 'number'
      ? `${Math.max(0, Math.min(100, Math.round(loadProgress * 100)))}%`
      : '处理中';

  const message = {
    empty: '暂未配置百科模型。',
    waiting: '模型将在滚动到这里时加载。',
    loading: `正在加载轻量百科模型 ${progressLabel}`,
    ready: '',
    timeout: '模型加载超时，当前仍保留文字与音频内容。',
    error: '百科模型加载失败，可能是文件路径、缓存或浏览器解码失败。',
  }[status];

  return (
    <div className="instrument-model" aria-label={`${title} 3D 模型预览`}>
      <div className="instrument-model__stage" ref={containerRef} />
      {message ? (
        <div className="instrument-model__status">
          <strong>{title}</strong>
          <span>{message}</span>
          {status === 'loading' ? (
            <span
              className="instrument-model__progress"
              style={
                {
                  '--progress': loadProgress === null ? '35%' : `${loadProgress * 100}%`,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}
      {status === 'ready' ? (
        <div className="instrument-model__hint" aria-hidden="true">
          拖拽旋转 · 滚轮/双指缩放 · 右键/双指平移
        </div>
      ) : null}
    </div>
  );
}
