# Independent orchestra stage

The stage uses a background and 12 independent transparent sprites in `public/assets/ui/stage-v2/`. All 12 musicians are unmodified, 1079 × 1553 PNGs supplied in `12人.zip`; they replace the earlier generated figures. Original filenames, instrument mappings and SHA-256 checksums are in `stage-v2-sources.json`. Figure placement accounts for transparent padding and card portraits are cropped with CSS, without repainting or resampling the source files. Only the empty stage background comes from the built-in imagegen editor; its prompt and reference are in `stage-v2-generation.json`. Original composite artwork remains available in `public/assets/ui/stage/`.

`stageArtwork.ts` defines each musician's asset and back-to-front placement on a 393 × 277 logical canvas. Cards reuse those images. The background contains no characters or controls. All text, card borders, resets and fullscreen controls are native elements. Inactive images are filtered directly; there are no polygon darkening overlays.

Stage pointer selection samples cached image alpha in reverse drawing order, accounting for object-fit letterboxing. Transparent areas pass through to visible characters behind them. Native buttons provide keyboard and assistive technology access. The same rendering and selection state is used in fullscreen, with a CSS fallback for browsers without the Fullscreen API.

The normal entry has an empty lineup. Explicit URL lineups remain supported and silent until a user gesture. Adding the first musician starts playback, subsequent voices join at the current transport position. Removing the last musician and resetting all voices stop and rewind. A section reset removes only that family. Manual pause persists through lineup edits. The session coordinates all updates through one audio path with request-version checks, so a cancelled decode cannot restore old playback or stale loading/error state.

Run `node scripts/stage-v2-qa.mjs` against the production preview at port 4190, or set `STAGE_BASE_URL`. The legacy `stage-interaction-qa.mjs` entrypoint forwards to this suite. Tests use Chromium and native Web Audio, and save screenshots, an alpha-channel report, interaction recording and results in `screenshots/stage-v2/`. Do not add unit tests for this repository.

## Original artwork acceptance — 2026-10-26

- TypeScript and production build passed. The existing large model-viewer bundle warning remains.
- All 18 end-to-end scenarios passed with normal browser autoplay restrictions. Each card requests the matching instrument audio file; native Web Audio sources confirm playback, pausing and reset behavior.
- The served PNGs match all 12 original archive entries by SHA-256. The `originals/` URL namespace avoids cached versions of the earlier generated sprites.
- Visually reviewed all 12 source figures, the empty and selected stage, 320/393/430 px card layouts, and portrait/landscape fullscreen. Character dimming follows the original alpha edge, selected card borders follow their own containers, and the background has no baked-in fullscreen icon.
- `screenshots/stage-v2/qa-report.json` contains the results; `stage-walkthrough.webm` records the interaction. `stage-393.png` and `fullscreen-1280.png` show the selected state; `default-empty-393.png` shows initial entry.
