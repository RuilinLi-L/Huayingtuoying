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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface InstrumentModelViewerProps {
  modelUrl?: string;
  title: string;
  accentColor: string;
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

function normalizeModel(model: Object3D) {
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const largestAxis = Math.max(size.x, size.y, size.z) || 1;

  model.position.sub(center);
  model.scale.multiplyScalar(1.8 / largestAxis);
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
    const camera = new PerspectiveCamera(36, 1, 0.1, 100);
    const root = new Group();
    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
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

    camera.position.set(0, 0.28, 4.2);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const resize = () => {
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 420;

      camera.aspect = width / height;
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

        normalizeModel(gltf.scene);
        root.add(gltf.scene);
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
      root.rotation.y += 0.006;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
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
    </div>
  );
}
