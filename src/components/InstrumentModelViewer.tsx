import { useEffect, useRef, useState } from 'react';
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

function disposeObject(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;

    mesh.geometry?.dispose();

    const material = mesh.material as Material | Material[] | undefined;

    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
      return;
    }

    material?.dispose();
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
  const [status, setStatus] = useState<'empty' | 'loading' | 'ready' | 'error'>(
    modelUrl ? 'loading' : 'empty',
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    if (!modelUrl) {
      setStatus('empty');
      return undefined;
    }

    setStatus('loading');
    container.replaceChildren();

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        const normalizedModel = normalizeModel(gltf.scene);

        modelFitSize = normalizedModel.fitSize;
        resize();
        fitInitialView();
        root.add(normalizedModel.object);
        setStatus('ready');
      },
      undefined,
      () => {
        if (!disposed) {
          setStatus('error');
        }
      },
    );

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      controls.dispose();
      disposeObject(root);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accentColor, modelUrl]);

  const message = {
    empty: '暂未配置百科模型。',
    loading: '正在加载百科占位模型…',
    ready: '',
    error: '百科模型加载失败，当前仍保留文字与音频内容。',
  }[status];

  return (
    <div className="instrument-model" aria-label={`${title} 3D 模型预览`}>
      <div className="instrument-model__stage" ref={containerRef} />
      {message ? (
        <div className="instrument-model__status">
          <strong>{title}</strong>
          <span>{message}</span>
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
