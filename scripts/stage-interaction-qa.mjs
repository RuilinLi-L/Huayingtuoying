// Compatibility entrypoint: the composite-mask stage was replaced by independent sprites.
process.env.STAGE_BASE_URL ??= process.env.MOTION_BASE_URL;
await import('./stage-v2-qa.mjs');
