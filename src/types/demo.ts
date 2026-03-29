export type MusicianSection = 'woodwind' | 'brass' | 'strings';
export type OrchestraModeId =
  | 'standby'
  | 'solo-focus'
  | 'creative-mix'
  | 'string-quartet'
  | 'wind-quintet'
  | 'full-orchestra';
export type OrchestraSceneId =
  | 'qintai'
  | 'youth-garden'
  | 'rehearsal-hall'
  | 'stadium';
export type NfcAdapterMode = 'mock' | 'reserved';
export type NfcSnapshotSource = 'mock' | 'hardware' | 'deep-link';

export interface StagePosition {
  x: number;
  y: number;
  depth: number;
}

export interface MusicianProfile {
  id: string;
  name: string;
  instrument: string;
  section: MusicianSection;
  shortLabel: string;
  color: string;
  position: StagePosition;
  roleSummary: string;
  knowledgeSummary: string;
  knowledgeDetail: string;
  featuredWorks: string[];
}

export interface OrchestraSceneDefinition {
  id: OrchestraSceneId;
  name: string;
  shortLabel: string;
  description: string;
  atmosphere: string;
  palette: {
    base: string;
    glow: string;
    haze: string;
  };
}

export interface TrackDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  audioSrc: string;
  durationLabel: string;
  modeIds: OrchestraModeId[];
}

export interface CompositionStemDefinition {
  id: string;
  musicianId: string;
  name: string;
  file: string;
  stereoPan?: number;
  gain?: number;
}

export interface CompositionDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  stems: CompositionStemDefinition[];
}

export interface OrchestraModeDefinition {
  id: OrchestraModeId;
  name: string;
  title: string;
  description: string;
  highlightIds: string[];
  trackIds: string[];
  unlockLabel: string;
}

export interface ComboRule {
  id: string;
  name: string;
  modeId: OrchestraModeId;
  requiredIds?: string[];
  exactCount?: number;
  minCount?: number;
  priority: number;
}

export interface NfcSessionSnapshot {
  baseAnchorId: string;
  placedMusicianIds: string[];
  detectedCount: number;
  source: NfcSnapshotSource;
  updatedAt: string;
}

export interface NfcSessionAdapter {
  mode: NfcAdapterMode;
  isAvailable: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSnapshot: () => Promise<NfcSessionSnapshot>;
  subscribe: (listener: (snapshot: NfcSessionSnapshot) => void) => () => void;
}
