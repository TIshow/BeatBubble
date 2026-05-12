# BeatBubble — Claude Code Guide

## Product Goal
BeatBubble is a classroom-friendly grid-based song maker.
Key differentiators:
- Supports sustained notes (long notes) via duration editing
- Pitch range constraints for grade-level use
- Melody + drum lanes for easy composition

## Non-negotiable Requirements
- Pitch is represented as **NoteName string** (e.g. "C4", "F#3"). Do not switch to MIDI-only storage.
- Sustained notes are represented by **one note with durationSteps**, not by duplicating cells.
- Melody overlap rule: **last write wins** (new note replaces overlapping notes of the same pitch).
- `src/core/*` must stay **pure & immutable** (no DOM, no AudioContext, no time).
- AudioContext can only be created/resumed by a **user gesture** (Play button).

## Project Structure
- `src/core/` : data model + pure ops (types/defaults/utils/ops/legacy)
- `src/audio/` : Web Audio scheduling + synthesis
- `src/ui/` : grid helpers + color mapping
- `src/hooks/` : custom hooks (drag interaction, locale)
- `src/lib/` : Supabase client (`supabase.ts`), i18n translations (`i18n.ts`)
- `src/app/` : Next.js pages/components and styles
  - `components/` : SaveModal, NotePanel
  - `songs/` : community songs feed page (`/songs`)

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
- Loop playback over totalSteps(song)

## UI Interaction Rules
- Click empty cell: add melody note (duration=1)
- Click existing note: remove that note
- Drag from note start cell: change duration (extend to the right)
- Drum lane: click toggles a hit (no duration)

## i18n
- Locale is `"ja"` (Japanese) by default, toggled to `"en"` via the locale button
- Persisted in `localStorage` under key `"beatbubble-locale"`
- All UI strings come from `src/lib/i18n.ts` via `useLocale()` hook
- Both `/` and `/songs` pages support locale toggle

## Save / Feed
- Songs are saved to Supabase table `songs` (columns: id, title, author, song_data jsonb, created_at)
- Public read + insert RLS policies (no auth required)
- `/songs` page lists the 50 most recent songs; each card links to `/?load=<id>`
- Editor loads a song via `?load=<id>` on mount, then cleans the URL with `replaceState`
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Manual Test Checklist (must pass)
- Place melody note -> Play -> sound starts on correct step
- Extend note duration -> Play -> sustain length matches
- Add drum hits -> Play -> rhythm aligns to grid
- Stop -> audio stops immediately, no multiple intervals
- Pitch constraints block out-of-range notes
- Save song -> appears on /songs page
- Click "あそぶ" on /songs -> song loads in editor
- Locale toggle switches all strings on both pages
