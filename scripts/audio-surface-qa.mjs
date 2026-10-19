import assert from 'node:assert/strict';
import { SegmentedAudioEngine } from '../src/lib/audio/SegmentedAudioEngine.ts';
import { findHorizontalSurface } from '../src/ar/surface.ts';

const origin = { x: 0, y: 1.5, z: 0 },
  direction = { x: 0, y: -0.6, z: -0.8 };
const patch = (y, z) =>
  Array.from({ length: 25 }, (_, i) => ({
    confidence: 0.9,
    position: { x: ((i % 5) - 2) * 0.05, y, z: z + (Math.floor(i / 5) - 2) * 0.05 },
  }));
assert.equal(findHorizontalSurface(patch(0.75, -1), origin, direction)?.y, 0.75);
assert.equal(
  findHorizontalSurface([...patch(0, -2), ...patch(0.75, -1)], origin, direction)?.y,
  0.75,
);
assert.equal(
  findHorizontalSurface(
    patch(0.75, -1).map((p) => ({ ...p, confidence: 0.2 })),
    origin,
    direction,
  ),
  null,
);
assert.equal(
  findHorizontalSurface(
    patch(0.75, -1).map((p) => ({ ...p, position: { ...p.position, z: -1 } })),
    origin,
    direction,
  ),
  null,
);
assert.equal(
  findHorizontalSurface(
    patch(0.75, -1).map((p) => ({ ...p, position: { ...p.position, z: p.position.x - 1 } })),
    origin,
    direction,
  ),
  null,
);
assert.equal(findHorizontalSurface(patch(0.75, -1).slice(0, 4), origin, direction), null);
assert.equal(findHorizontalSurface(patch(0.75, -1), origin, { x: 0, y: 0, z: -1 }), null);
console.log(
  'PASS actual horizontal patches, nearest tabletop, low confidence, sparse points and wall rejection',
);

let interval,
  contexts = [],
  gate = null,
  fail = false,
  requested = [];
globalThis.window = {
  setInterval: (fn) => ((interval = fn), 1),
  clearInterval: () => (interval = null),
};
globalThis.location = { href: 'http://test.local/stage' };
class Node {
  gain = {
    value: 1,
    setTargetAtTime(value) {
      this.value = value;
    },
  };
  pan = { value: 0 };
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
}
class Context {
  currentTime = 0;
  state = 'running';
  destination = {};
  sources = [];
  constructor() {
    contexts.push(this);
  }
  createGain() {
    return new Node();
  }
  createStereoPanner() {
    return new Node();
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
  async decodeAudioData(bytes) {
    const [id, index] = new Uint8Array(bytes);
    return { id, index, duration: 4 };
  }
  createBufferSource() {
    const context = this;
    const s = {
      connect() {},
      disconnect() {},
      stop() {
        s.stopped = true;
      },
      start(at, offset, duration) {
        Object.assign(s, { at, offset, duration });
        context.sources.push(s);
      },
    };
    this.currentTime += 0.001;
    return s;
  }
}
globalThis.AudioContext = Context;
globalThis.fetch = async (url, { signal } = {}) => {
  const path = new URL(url, location.href).pathname;
  requested.push(path);
  if (path.endsWith('manifest.json'))
    return {
      ok: true,
      json: async () => ({
        version: 1,
        sampleRate: 44100,
        totalFrames: 44100 * 40,
        segmentFrames: 44100 * 4,
        segments: Array.from({ length: 10 }, (_, i) => ({
          file: `${i}.flac`,
          startFrame: i * 4 * 44100,
          frameCount: 4 * 44100,
          trimStartFrames: 0,
        })),
      }),
    };
  const [, id, file] = path.split('/'),
    index = Number(file.split('.')[0]);
  if (gate && gate.matches(id, index))
    await new Promise((resolve, reject) => {
      gate.waiters.push(resolve);
      signal?.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), {
        once: true,
      });
    });
  return { ok: !fail, arrayBuffer: async () => new Uint8Array([Number(id), index]).buffer };
};
const stems = Array.from({ length: 12 }, (_, id) => ({
  id: String(id),
  name: String(id),
  segmentManifest: `/${id}/manifest.json`,
  file: 'unused',
  defaultEnabled: true,
}));
const ids = stems.map((s) => s.id),
  flush = () => new Promise((r) => setImmediate(r));
const aligned = (sources, expectedCount) => {
  const first = sources.filter((s) => s.buffer.index === sources[0].buffer.index);
  assert.equal(first.length, expectedCount);
  assert.equal(new Set(first.map((s) => s.at)).size, 1);
  assert.equal(new Set(first.map((s) => s.offset)).size, 1);
};
const engine = new SegmentedAudioEngine();
await engine.play(stems);
let ctx = contexts.at(-1);
aligned(ctx.sources, 12);
for (let id = 0; id < 12; id++) {
  const pair = ctx.sources.filter((s) => s.buffer.id === id);
  assert.ok(Math.abs(pair[0].at + pair[0].duration - pair[1].at) < 1e-8);
}
ctx.currentTime = 2.08;
engine.pause();
assert.ok(Math.abs(engine.getCurrentTime() - 2) < 1e-8);
assert.ok(ctx.sources.every((s) => s.stopped));
await engine.resume();
let count = ctx.sources.length;
engine.seek(18);
await flush();
await flush();
aligned(ctx.sources.slice(count), 12);
assert.ok(Math.abs(engine.getCurrentTime() - 18) < 0.1);
assert.ok(requested.some((p) => p.endsWith('/4.flac')));
engine.pause();
await engine.setActiveStems(stems, ids.slice(0, 11), { playWhenReady: true });
ctx.currentTime += 1;
const before = engine.getCurrentTime();
gate = { matches: (id) => id === '11', waiters: [] };
const adding = engine.setActiveStems(stems, ids, { playWhenReady: true });
await flush();
assert.equal(engine.isPlaying(), false);
assert.equal(engine.isBuffering(), true);
assert.ok(Math.abs(engine.getCurrentTime() - before) < 1e-8);
const waits = gate.waiters;
gate = null;
waits.forEach((r) => r());
await adding;
assert.equal(engine.isPlaying(), true);
assert.ok(Math.abs(engine.getCurrentTime() - before) < 0.1);
engine.dispose();
assert.equal(ctx.state, 'closed');
assert.equal(interval, null);
console.log(
  'PASS shared audio clock, gapless scheduling, seek, pause, adding a voice at current progress and disposal',
);

const stalled = new SegmentedAudioEngine();
gate = { matches: (_id, i) => i >= 2, waiters: [] };
await stalled.play(stems);
ctx = contexts.at(-1);
await flush();
ctx.currentTime = 8.07;
interval();
assert.equal(stalled.isBuffering(), true);
assert.equal(stalled.isPlaying(), false);
assert.ok(ctx.sources.every((s) => s.stopped));
const paused = stalled.getCurrentTime();
const waiting = gate.waiters;
gate = null;
waiting.forEach((r) => r());
await flush();
await flush();
assert.equal(stalled.isPlaying(), true);
assert.ok(Math.abs(stalled.getCurrentTime() - paused) < 0.1);
stalled.dispose();
console.log('PASS all voices pause together on underrun and resume from the same progress');

const cancelled = new SegmentedAudioEngine();
gate = { matches: () => true, waiters: [] };
const pending = cancelled.play(stems);
await flush();
ctx = contexts.at(-1);
cancelled.pause();
gate = null;
await pending;
assert.equal(ctx.sources.length, 0);
assert.equal(cancelled.isPlaying(), false);
fail = true;
assert.match(await cancelled.resume(), /加载失败/);
assert.equal(ctx.sources.length, 0);
fail = false;
await cancelled.resume();
assert.equal(cancelled.isPlaying(), true);
cancelled.dispose();
console.log(
  'PASS cancelled downloads never start playback; failed segments retry without partial voices',
);
