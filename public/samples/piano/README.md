# Piano samples — Splendid Grand Piano

Steinway grand piano samples released into the **public domain** by AKAI
(early 2000s), mapped to SFZ by kinwie, converted to ogg/m4a and published
by the [smpldsnds project](https://github.com/smpldsnds/sfzinstruments-splendid-grand-piano)
(also the source of these files).

This is the MF velocity layer only, covering BeatBubble's pitch range
(C2–C7). Both `.ogg` (Chrome/Edge/Firefox) and `.m4a` (Safari/iPad) are
hosted because Safari cannot decode ogg.

Loaded by `src/audio/engine.ts` via smplr's `SplendidGrandPiano` with
`baseUrl: "/samples/piano"`. Self-hosted (rather than the smpldsnds CDN)
so school networks that whitelist only the app's domain can load them.
