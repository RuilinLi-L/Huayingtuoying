import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distModelsDir = resolve(projectRoot, 'dist', 'assets', 'models');
const originalModelEntries = [
  'bass',
  'bassoon',
  'cello',
  'clarinet',
  'flute',
  'horn',
  'instrument-placeholder',
  'oboe',
  'trombone',
  'trumpet',
  'tuba',
  'viola',
  'violin',
];

if (existsSync(distModelsDir)) {
  await Promise.all(
    originalModelEntries.map((modelId) =>
      rm(join(distModelsDir, modelId, 'scene.glb'), { force: true }),
    ),
  );
}
