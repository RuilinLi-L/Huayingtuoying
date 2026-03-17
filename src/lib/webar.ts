import type {
  EntryLaunchSource,
  EntryManifest,
  Vector3Value,
  WebArImageTarget,
  WebArProvider,
  WebArSceneConfig,
  WebArSceneId,
} from '../types/manifest';

const defaultModelPosition: Vector3Value = { x: 0, y: 0.02, z: 0.12 };
const defaultModelScale: Vector3Value = { x: 0.005, y: 0.005, z: 0.005 };

export interface ResolvedWebArScene
  extends Omit<WebArSceneConfig, 'provider' | 'modelPosition' | 'modelScale'> {
  provider: WebArProvider;
  modelPosition: Vector3Value;
  modelScale: Vector3Value;
  accentColor: string;
}

export interface ResolvedWebArConfig {
  provider: WebArProvider;
  defaultSceneId: WebArSceneId;
  sourceSceneMap: Record<EntryLaunchSource, WebArSceneId>;
  scenes: ResolvedWebArScene[];
}

function mergeVector3(
  value: Vector3Value | undefined,
  fallback: Vector3Value,
): Vector3Value {
  return {
    x: value?.x ?? fallback.x,
    y: value?.y ?? fallback.y,
    z: value?.z ?? fallback.z,
  };
}

function buildLegacyImageTarget(entry: EntryManifest): WebArImageTarget | undefined {
  if (!entry.targetImage || !entry.trackingTargetSrc) {
    return undefined;
  }

  return {
    previewImage: entry.targetImage,
    trackingTargetSrc: entry.trackingTargetSrc,
    targetIndex: 0,
  };
}

function buildLegacyScene(entry: EntryManifest): ResolvedWebArScene {
  return {
    id: 'image',
    provider: 'mindar',
    trackingMode: 'image-target',
    startMode: 'manual',
    target: buildLegacyImageTarget(entry),
    placementPrompt: '将相机对准识别图，识别后显示 3D 模型与知识热点。',
    modelPosition: defaultModelPosition,
    modelScale: defaultModelScale,
    accentColor: entry.themeColor ?? '#8b5cf6',
  };
}

export function resolveWebArConfig(entry: EntryManifest): ResolvedWebArConfig {
  const legacyScene = buildLegacyScene(entry);
  const provider =
    entry.webar?.provider ??
    (entry.sceneType === 'mindar-image' ? 'mindar' : '8thwall');
  const scenes =
    entry.webar?.scenes?.map((scene) => ({
      ...scene,
      provider: scene.provider ?? provider,
      modelPosition: mergeVector3(scene.modelPosition, defaultModelPosition),
      modelScale: mergeVector3(scene.modelScale, defaultModelScale),
      accentColor: scene.accentColor ?? entry.themeColor ?? '#8b5cf6',
    })) ?? [legacyScene];
  const defaultSceneId = entry.webar?.defaultSceneId ?? scenes[0]?.id ?? legacyScene.id;
  const placementSceneId =
    scenes.find((candidate) => candidate.trackingMode === 'surface-placement')?.id ??
    defaultSceneId;
  const defaultSourceSceneMap: Record<EntryLaunchSource, WebArSceneId> = {
    manual: defaultSceneId,
    qr: defaultSceneId,
    nfc: placementSceneId,
  };
  const sourceSceneMap = {
    ...defaultSourceSceneMap,
    ...entry.webar?.sourceSceneMap,
  };

  return {
    provider,
    defaultSceneId,
    sourceSceneMap,
    scenes,
  };
}

export function resolveWebArScene(
  entry: EntryManifest,
  source: EntryLaunchSource,
): ResolvedWebArScene {
  const config = resolveWebArConfig(entry);
  const sceneId = config.sourceSceneMap[source] ?? config.defaultSceneId;

  return (
    config.scenes.find((scene) => scene.id === sceneId) ??
    config.scenes.find((scene) => scene.id === config.defaultSceneId) ??
    config.scenes[0]
  );
}

export function getSourceLabel(source: EntryLaunchSource) {
  switch (source) {
    case 'nfc':
      return 'NFC 入口';
    case 'qr':
      return '扫码入口';
    default:
      return '手动进入';
  }
}

export function getTrackingModeLabel(scene: ResolvedWebArScene) {
  return scene.trackingMode === 'image-target' ? '识图触发' : '平面放置';
}

export function formatVector3(value: Vector3Value) {
  return `${value.x} ${value.y} ${value.z}`;
}
