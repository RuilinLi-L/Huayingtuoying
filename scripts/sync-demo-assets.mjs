import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const copyTargets = [
  {
    from: resolve(projectRoot, 'node_modules', 'aframe', 'dist', 'aframe-master.min.js'),
    to: resolve(projectRoot, 'public', 'vendor', 'aframe.min.js'),
  },
  {
    from: resolve(projectRoot, 'node_modules', 'mind-ar', 'dist'),
    to: resolve(projectRoot, 'public', 'vendor', 'mindar'),
  },
  {
    from: resolve(
      projectRoot,
      'node_modules',
      'mind-ar',
      'examples',
      'image-tracking',
      'assets',
      'card-example',
      'card.mind',
    ),
    to: resolve(projectRoot, 'public', 'assets', 'markers', 'default-card.mind'),
  },
  {
    from: resolve(
      projectRoot,
      'node_modules',
      'mind-ar',
      'examples',
      'image-tracking',
      'assets',
      'card-example',
      'card.png',
    ),
    to: resolve(projectRoot, 'public', 'assets', 'markers', 'default-card.png'),
  },
  {
    from: resolve(
      projectRoot,
      'node_modules',
      'mind-ar',
      'examples',
      'image-tracking',
      'assets',
      'card-example',
      'softmind',
    ),
    to: resolve(projectRoot, 'public', 'assets', 'models', 'softmind'),
  },
];

for (const target of copyTargets) {
  await mkdir(dirname(target.to), { recursive: true });
  await cp(target.from, target.to, { recursive: true, force: true });
}

console.log('Demo vendor and AR assets synced.');
