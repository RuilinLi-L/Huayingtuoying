import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
const media = JSON.parse(await readFile('src/data/mediaAssets.json', 'utf8'));
const allowed = new Set(Object.values(media.models).map((url) => 'dist' + url));
async function walk(path) {
  const files = [];
  for (const e of await readdir(path, { withFileTypes: true })) {
    const p = join(path, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}
for (const path of await walk('dist/assets/models')) {
  if (!allowed.has(path) && !path.includes('/softmind/')) await rm(path);
}
await rm('dist/assets/audio/The Sleeping Beauty Waltz', { recursive: true, force: true });
const directories = new Set(
  Object.values(media.audio).map((a) => a.segmentManifest.split('/').slice(-2, -1)[0]),
);
for (const entry of await readdir('dist/assets/audio/stream', { withFileTypes: true }))
  if (entry.isDirectory() && !directories.has(entry.name))
    await rm(join('dist/assets/audio/stream', entry.name), { recursive: true });
// Only the world-tracking binary is requested by this product. Keep its license intact.
for (const name of ['xr-face.js', 'resources'])
  await rm(join('dist/vendor/8thwall-1.0.0', name), { recursive: true, force: true });
for (const name of await readdir('dist/vendor/mindar'))
  if (/face|compiler|image-three/.test(name)) await rm(join('dist/vendor/mindar', name));
