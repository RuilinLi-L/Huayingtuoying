import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const root = resolve('public/assets');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);
const catalog = { models: {}, audio: {} };
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
for (const id of [
  'violin',
  'viola',
  'cello',
  'bass',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
  'oboe-player',
]) {
  const directory = id === 'oboe-player' ? 'models/characters/oboe' : `models/${id}`;
  const source = join(
    root,
    directory,
    id === 'oboe-player' ? 'scene.mobile.glb' : 'scene.optimized.glb',
  );
  const document = await io.read(source);
  for (const texture of document.getRoot().listTextures()) {
    if (!texture.getImage()) continue;
    const pipeline = sharp(texture.getImage()).resize({
      width: 1024,
      height: 1024,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const hasAlpha = (await sharp(texture.getImage()).metadata()).hasAlpha;
    const image = hasAlpha
      ? await pipeline.png().toBuffer()
      : await pipeline.jpeg({ quality: 80 }).toBuffer();
    texture.setImage(image).setMimeType(hasAlpha ? 'image/png' : 'image/jpeg');
  }
  // Decode compression before writing: the same GLB works in both AR engines.
  for (const extension of document.getRoot().listExtensionsUsed()) {
    if (extension.extensionName === 'EXT_meshopt_compression') extension.dispose();
  }
  await document.transform(dedup(), prune());
  const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer();
  for (const accessor of document.getRoot().listAccessors()) accessor.setBuffer(buffer);
  if (id !== 'oboe-player')
    await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const bytes = await io.writeBinary(document);
  const filename = `mobile.${hash(bytes)}.glb`;
  await writeFile(join(root, directory, filename), bytes);
  catalog.models[id] = `/assets/${directory}/${filename}`;
  console.log('model', id, bytes.length);
}

const audioRoot = join(root, 'audio/The Sleeping Beauty Waltz');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const files = (await readdir(audioRoot)).filter((name) => name.endsWith('.mp3')).sort();
const sampleRate = 44100,
  channels = 2,
  segmentFrames = sampleRate * 8;
for (const name of files) {
  const source = join(audioRoot, name);
  const id = name.split('_')[0].toLowerCase().replace('trumbone', 'trombone');
  const fingerprint = hash(
    Buffer.concat([await readFile(source), Buffer.from('mobile-v3-flac-44100-16bit-8s')]),
  );
  const directory = join(root, 'audio/stream', `${id}.${fingerprint}`);
  await mkdir(directory, { recursive: true });
  const pcm = execFileSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-i',
      source,
      '-f',
      's16le',
      '-ar',
      String(sampleRate),
      '-ac',
      String(channels),
      'pipe:1',
    ],
    { maxBuffer: 150_000_000 },
  );
  const frames = pcm.length / (2 * channels);
  const segments = [];
  for (let startFrame = 0, index = 0; startFrame < frames; startFrame += segmentFrames, index++) {
    const frameCount = Math.min(segmentFrames, frames - startFrame);
    const filename = `${String(index).padStart(3, '0')}.flac`;
    const output = join(directory, filename);
    try {
      await stat(output);
    } catch {
      execFileSync(
        ffmpeg,
        [
          '-v',
          'error',
          '-y',
          '-f',
          's16le',
          '-ar',
          String(sampleRate),
          '-ac',
          String(channels),
          '-i',
          'pipe:0',
          '-c:a',
          'flac',
          '-compression_level',
          '8',
          output,
        ],
        { input: pcm.subarray(startFrame * 4, (startFrame + frameCount) * 4) },
      );
    }
    segments.push({
      file: filename,
      startFrame,
      frameCount,
      trimStartFrames: 0,
      bytes: (await stat(output)).size,
    });
  }
  // FLAC has no encoder priming delay: each independently decoded segment is
  // sample-exact. Keep trim metadata for future codecs; never concatenate MP3 frames.
  const manifest = {
    version: 1,
    sampleRate,
    channels,
    totalFrames: frames,
    segmentFrames,
    segments,
  };
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest));
  const singleName = `preview.${fingerprint}.mp3`;
  await writeFile(join(directory, singleName), await readFile(join(audioRoot, 'mobile', name)));
  catalog.audio[id] = {
    file: `/assets/audio/stream/${basename(directory)}/${singleName}`,
    segmentManifest: `/assets/audio/stream/${basename(directory)}/manifest.json`,
  };
  console.log(
    'audio',
    id,
    'first8s',
    segments.slice(0, 1).reduce((n, s) => n + s.bytes, 0),
    'total',
    segments.reduce((n, s) => n + s.bytes, 0),
  );
}
await writeFile('src/data/mediaAssets.json', JSON.stringify(catalog, null, 2) + '\n');
