import rawEntries from './entries.json';
import type { EntryManifest } from '../types/manifest';

export const entries = rawEntries as EntryManifest[];
