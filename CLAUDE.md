# BeatBubble — Claude Code Guide

## Product Goal
BeatBubble is a classroom-friendly grid-based song maker.
Key differentiators:
- Supports sustained notes (long notes) via duration editing
- Pitch range constraints for grade-level use
- Melody + drum lanes for easy composition
- Solfège (ドレミ) note labels for Japanese learners
- Adjustable grid length and beginner-friendly settings panel

## Non-negotiable Requirements
- Pitch is represented as **NoteName string** (e.g. "C4", "F#3"). Do not switch to MIDI-only storage.
- Sustained notes are represented by **one note with durationSteps**, not by duplicating cells.
- Melody overlap rule: **last write wins** (new note replaces overlapping notes of the same pitch).
- `src/core/*` must stay **pure & immutable** (no DOM, no AudioContext, no time).
- AudioContext can only be created/resumed by a **user gesture** (Play button).
- Grid length lives in `song.blocks`; everything derives from `totalSteps(song) = blocks * stepsPerBeat`. Do not hardcode the column count.
- The persisted `Song` is **versioned**; load through `migrateSong()` so older saves keep working (never read raw `song_data`).

## Data Model (`src/core/types.ts`)
- `Song`: `{ version, bpm, stepsPerBeat, blocks, instrument, constraints, melody, drums }`
  - `blocks`: grid length. **1 block = 1 beat = `stepsPerBeat` cells** (the group bounded by beat-start lines).
- `constraints`: `{ minNote, maxNote, allowAccidentals, allowedNotes, tempoLocked, blocksLocked, drumsEnabled }`
- Version history (handled by `migrateSong`): v1 `bars` → v2/v3 `blocks`/`cells` → **current = `blocks`**.

## Project Structure
- `src/core/` : data model + pure ops + migration (types/defaults/utils/ops/id/legacy)
  - `legacy.ts` : `migrateSong()` (version upgrades) + old-format import
- `src/audio/` : Web Audio scheduling + synthesis (`engine.ts`)
- `src/ui/` : grid helpers, color mapping, `noteLabel.ts` (locale-aware ドレミ/ABC)
- `src/hooks/` : custom hooks — `useSong` (song state + undo history), `useDragInteraction`, `useLocale`
- `src/lib/` : Supabase client (`supabase.ts`), i18n translations (`i18n.ts`, exports `Translations`)
- `src/app/` : Next.js pages/components and styles
  - `components/` : `Header`, `SettingsPanel`, `Grid`, `NotePanel`, `SaveModal`
  - `styles/` : per-concern global CSS (`base/header/settings/grid/note-panel/modal/songs`), assembled by `globals.css` via `@import`
  - `page.tsx` : editor — wires state/handlers and composes the components
  - `songs/` : community songs feed page (`/songs`)

> Note: classes in `styles/*.css` are **global** (not CSS Modules). Keep each file's rules in their original relative order — some overrides are source-order dependent.

## Development Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Format: `pnpm format`

## Audio Scheduling Rules
- Use **lookahead scheduling** (interval ~25ms, lookahead ~100–200ms)
- Calculate timing from:
  - secondsPerBeat = 60 / bpm
  - secondsPerStep = secondsPerBeat / stepsPerBeat
- Loop playback over `totalSteps(song)`

## UI Interaction Rules
- Click empty cell: add melody note (duration=1)
- Click existing note: remove that note
- Drag from note start cell: change duration (extend to the right)
- Drum lane: click toggles a hit (no duration)
- **Settings panel** (⚙ せってい toggle in the header) holds: tempo, instrument, range, blocks, black keys, note filter, reset
  - Reset is a two-step confirm; Undo stays in the header (frequent action)
  - Length control: ◀ N ▶ steps `blocks` by 1 (= one beat = 4 cells); shrinking drops out-of-range notes/drums and clamps overrunning durations
  - Black keys toggle flips `allowAccidentals`; turning off removes accidental notes and prunes `allowedNotes`

## i18n
- Locale is `"ja"` (Japanese) by default, toggled to `"en"` via the locale button
- Persisted in `localStorage` under key `"beatbubble-locale"`
- All UI strings come from `src/lib/i18n.ts` via `useLocale()` hook
- **Note names are localized**: ja shows ドレミ (`noteLabel`), en shows ABC — display only; storage stays NoteName
- Both `/` and `/songs` pages support locale toggle

## Save / Feed
- Songs are saved to Supabase table `songs` (columns: id, title, author, song_data jsonb, created_at)
- Public read + insert RLS policies (no auth required)
- `/songs` page lists the 50 most recent songs; each card links to `/?load=<id>`
- Editor loads a song via `?load=<id>` on mount **through `migrateSong()`**, then cleans the URL with `replaceState`
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Manual Test Checklist (must pass)
- Place melody note -> Play -> sound starts on correct step
- Extend note duration -> Play -> sustain length matches
- Add drum hits -> Play -> rhythm aligns to grid
- Stop -> audio stops immediately, no multiple intervals
- Pitch constraints block out-of-range notes
- Black keys toggle adds/removes accidental rows; turning off drops accidental notes
- Change blocks -> grid grows/shrinks by 4 cells per step; shrinking removes out-of-range notes
- Save song -> appears on /songs page
- Click "あそぶ" on /songs -> song loads in editor (older saves migrate cleanly)
- Locale toggle switches all strings AND note labels (ドレミ ↔ ABC) on both pages
