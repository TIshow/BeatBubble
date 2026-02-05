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
- `src/app/` : Next.js pages/components and styles

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

## Manual Test Checklist (must pass)
- Place melody note -> Play -> sound starts on correct step
- Extend note duration -> Play -> sustain length matches
- Add drum hits -> Play -> rhythm aligns to grid
- Stop -> audio stops immediately, no multiple intervals
- Pitch constraints block out-of-range notes
