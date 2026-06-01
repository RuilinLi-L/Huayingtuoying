declare module 'three' {
  export class Color {
    constructor(value: number | string);
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    sub(value: Vector3): this;
    multiplyScalar(value: number): this;
  }

  export class Object3D {
    position: Vector3;
    scale: Vector3;
    rotation: { y: number };
    add(...objects: Object3D[]): this;
    traverse(callback: (object: Object3D) => void): void;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {
    background: Color | null;
  }

  export class PerspectiveCamera extends Object3D {
    aspect: number;
    constructor(fov: number, aspect: number, near: number, far: number);
    updateProjectionMatrix(): void;
  }

  export class Box3 {
    setFromObject(object: Object3D): this;
    getSize(target: Vector3): Vector3;
    getCenter(target: Vector3): Vector3;
  }

  export class AmbientLight extends Object3D {
    constructor(color: number | string, intensity?: number);
  }

  export class DirectionalLight extends Object3D {
    constructor(color: Color | number | string, intensity?: number);
  }

  export class Material {
    dispose(): void;
  }

  export class BufferGeometry {
    dispose(): void;
  }

  export interface Mesh extends Object3D {
    geometry?: BufferGeometry;
    material?: Material | Material[];
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    outputColorSpace: unknown;
    constructor(parameters?: { alpha?: boolean; antialias?: boolean });
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }

  export const SRGBColorSpace: unknown;
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import type { Object3D } from 'three';

  export class GLTFLoader {
    load(
      url: string,
      onLoad: (gltf: { scene: Object3D }) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void,
    ): void;
  }
}
