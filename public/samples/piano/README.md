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

## Replacing these files

`vercel.json` serves `/samples/*` as `immutable` for a year, so browsers
never re-check them — that's what keeps a page load from re-requesting 44
files (see #100). The trade-off: overwriting a file in place would leave
already-cached devices on the old audio forever.

So to change a sample, **put the new set under a fresh path** (e.g.
`/samples/piano/v2/`), point `PIANO_BASE_URL` at it, and **delete the old
directory in the same PR** — `public/` ships as-is, so one version in the
repo means one version deployed, no stale leftovers.

A tab left open across that deploy requests the old path, gets a 404, and
falls back to the 8bit voice until it reloads (the custom `Storage` in
`engine.ts` rejects on non-200 precisely so that fallback engages).
