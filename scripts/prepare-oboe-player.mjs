import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { dedup, getBounds, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

// Keep the artist's original outside public/. Only this derived asset ships.
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-oboe-player.mjs /path/to/original.glb');
const output = resolve('public/assets/models/characters/oboe/scene.mobile.glb');
if (resolve(source) === output) throw new Error('Source and output must differ.');
const io = new NodeIO();
const document = await io.read(source);
const triangleCount = () => document.getRoot().listMeshes().reduce((sum, mesh) =>
  sum + mesh.listPrimitives().reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
const originalTriangles = triangleCount();
await MeshoptSimplifier.ready;
await document.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.085, error: 0.01 }));
for (const texture of document.getRoot().listTextures()) {
  const image = texture.getImage();
  if (!image) continue;
  const resized = await sharp(image).resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, chromaSubsampling: '4:4:4' }).toBuffer();
  texture.setImage(resized).setMimeType('image/jpeg');
}
const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0];
const bounds = getBounds(scene);
const height = bounds.max[1] - bounds.min[1];
const root = document.createNode('OboePlayer_FeetOrigin').setScale([1 / height, 1 / height, 1 / height])
  .setTranslation([-(bounds.min[0] + bounds.max[0]) / (2 * height), -bounds.min[1] / height,
    -(bounds.min[2] + bounds.max[2]) / (2 * height)]);
for (const node of scene.listChildren()) { scene.removeChild(node); root.addChild(node); }
scene.addChild(root);
await document.transform(dedup(), prune());
await mkdir(dirname(output), { recursive: true });
await io.write(output, document);
const report = {
  originalBytes: (await stat(source)).size, outputBytes: (await stat(output)).size,
  originalTriangles, outputTriangles: triangleCount(), bounds: getBounds(scene),
  textures: document.getRoot().listTextures().map(t => ({ size: t.getSize(), mimeType: t.getMimeType() })),
  animations: document.getRoot().listAnimations().length,
  copyright: document.getRoot().getAsset().copyright,
};
await writeFile(resolve('public/assets/models/characters/oboe/asset-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
