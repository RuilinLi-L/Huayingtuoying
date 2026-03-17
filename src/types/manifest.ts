export type SceneType = 'mindar-image' | 'webar';
export type FallbackMode = 'poster' | 'model';
export type EntryLaunchSource = 'manual' | 'qr' | 'nfc';
export type WebArProvider = 'mindar' | '8thwall';
export type WebArTrackingMode = 'image-target' | 'surface-placement';
export type WebArSceneId = string;

export interface EntryMedia {
  type: 'image' | 'audio' | 'link';
  src: string;
  alt?: string;
  label?: string;
}

export interface AudioStem {
  id: string;
  name: string;
  file: string;
  defaultEnabled: boolean;
  group: string;
  stereoPan?: number;
  gain?: number;
}

export interface KnowledgeCard {
  id: string;
  anchor: string;
  title: string;
  summary: string;
  media?: EntryMedia[];
}

export interface Vector3Value {
  x: number;
  y: number;
  z: number;
}

export interface WebArImageTarget {
  previewImage: string;
  trackingTargetSrc: string;
  targetIndex?: number;
}

export interface WebArSceneConfig {
  id: WebArSceneId;
  provider?: WebArProvider;
  trackingMode: WebArTrackingMode;
  startMode?: 'manual' | 'auto';
  target?: WebArImageTarget;
  placementPrompt?: string;
  modelPosition?: Vector3Value;
  modelScale?: Vector3Value;
  accentColor?: string;
}

export interface WebArConfig {
  provider?: WebArProvider;
  defaultSceneId?: WebArSceneId;
  sourceSceneMap?: Partial<Record<EntryLaunchSource, WebArSceneId>>;
  scenes?: WebArSceneConfig[];
}

export interface EntryManifest {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  orchestraZone?: string;
  themeColor?: string;
  sceneType: SceneType;
  targetImage: string;
  trackingTargetSrc?: string;
  posterImage: string;
  modelUrl: string;
  audioStems: AudioStem[];
  knowledgeCards: KnowledgeCard[];
  fallbackMode: FallbackMode;
  webar?: WebArConfig;
}
