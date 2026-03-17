import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outputDir = resolve(projectRoot, 'public', 'assets', 'audio');
const sampleRate = 44100;
const durationSeconds = 4;

const tracks = {
  'violin-melody.wav': [659.25, 880, 987.77],
  'violin-harmony.wav': [440, 523.25, 587.33],
  'violin-rhythm.wav': [220, 220, 196],
  'flute-air.wav': [783.99, 880, 1046.5],
  'flute-pad.wav': [392, 440, 523.25],
  'flute-pulse.wav': [261.63, 261.63, 329.63],
  'ensemble-strings.wav': [523.25, 659.25, 783.99],
  'ensemble-winds.wav': [293.66, 392, 440],
  'ensemble-percussion.wav': [146.83, 196, 246.94],
};

function createWaveBuffer(frequencies) {
  const totalSamples = sampleRate * durationSeconds;
  const pcmData = Buffer.alloc(totalSamples * 2);

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / sampleRate;
    const section = Math.floor((time / durationSeconds) * frequencies.length);
    const frequency = frequencies[Math.min(section, frequencies.length - 1)];
    const envelope = Math.min(1, time * 4, (durationSeconds - time) * 4);
    const signal =
      Math.sin(2 * Math.PI * frequency * time) * 0.42 * Math.max(envelope, 0);
    const sample = Math.max(-1, Math.min(1, signal));
    pcmData.writeInt16LE(Math.round(sample * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

await mkdir(outputDir, { recursive: true });

await Promise.all(
  Object.entries(tracks).map(([filename, frequencies]) =>
    writeFile(resolve(outputDir, filename), createWaveBuffer(frequencies)),
  ),
);

console.log(`Generated ${Object.keys(tracks).length} demo wav files in ${outputDir}`);
