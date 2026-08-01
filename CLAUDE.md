# BeatBubble — Claude Code Guide

## Product Definition
**BeatBubble is a creative environment where primary-school children learn
trial-and-error and expression through music.**

Read that literally, because it decides things:

- **through music** — music is the medium, not the subject. What is being
  learned is having an intention and iterating toward it.
- **trial-and-error** — the unit of value is an attempt, not a finished song.
  Anything that raises the number of attempts a child makes is on-mission;
  anything that lets them skip attempting is not.
- **expression** — the child must have something of their own to say. There is
  no correct answer to compare against.
- **environment** — inhabited and altered, not a tool that is finished. Low
  floor (a 6-year-old starts in seconds), high ceiling (there is somewhere to
  iterate *toward*), and the constraints in between are scaffolding the child
  dissolves as they grow, not a permanent ceiling.

### What this rules out
Deliberate non-goals. Each is attractive and each breaks the definition:

- **AI that produces finished songs.** It skips the trial-and-error entirely —
  the one thing this exists to create. AI may scaffold ("what if you tried
  changing just the ending?"); it must not answer.
- **Scoring or ranking songs.** Turns expression into correctness.
- **Streaks, XP, leaderboards.** They replace "I want to make this" with "I
  have to keep my streak", and among named classmates they add social
  comparison. Badges that *reveal what is possible* or *name what a child
  already did* are fine; badges that steer behaviour are not.
- **Accumulating children's behavioural data as a product asset.** Knowing
  whether the environment works needs a few aggregate numbers, not a log of
  each child. See "見守れる練習場" below.
- **Growing into an LMS.** Assignment/grading plumbing serves administration;
  it does not increase a single child's attempts. The teacher features that
  exist are there so the space can be supervised safely — hygiene, not the
  point.

### How we know it is working
Not "how many songs were saved". Signals that map to the definition:

- children using it **outside class hours**, unprompted (they want to keep
  trying — the strongest signal we have)
- revisions per song (trial-and-error, literally)
- how differently children answer the *same* prompt (expression)
- how often work is opened, taken apart and built on

Keep these aggregate. The measurement must not become the surveillance this
document rules out.

## 見守れる練習場 (a supervised place to practise)
Children's lives are moving into places adults can't see — games, VR, chat.
Because this app is the school's, it can be the opposite: somewhere they
practise being a person online *while a trusted adult is in the room*. That is
the frame for every moderation decision here — not a monitoring console.

Design for mistakes that are **small, visible, recoverable, and teachable**,
rather than trying to prevent them:

- **Shrink the blast radius** before policing content. A hurtful title seen by
  one class is a conversation; the same title seen school-wide is an incident.
- **Friction and reflection, not bans.** A sensitive title gets 「ちょっと まって
  ね」 and the child decides (`src/lib/validation.ts`). Only explicit slurs and
  "die/kill" are hard-blocked.
- **Repair over punishment.** Hiding a song is reversible and keeps the record;
  deleting destroys the evidence a teacher needs for the conversation.
- **Visibility means "an adult is in the room", never covert.** Teachers can see
  which account made a song, and children are told so when they save.
- **Separate expression from targeting.** Saying something dark in your own song
  is fine; aiming it at a named classmate is the thing to make hard.

Non-goals: behaviour scores, rankings of children, silent tracking, and "zero
incidents" as a target — zero means either nobody is using it or they have
learned to hide. The working outcome is: *a problem surfaces, the child can put
it right, and it happens with the teacher present.*

## Non-negotiable Requirements
**IMPORTANT — these are hard constraints. YOU MUST NOT violate them:**
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
- `src/analysis/` : research/analytics — pure `Song`→feature extraction (`metrics.ts`); consumes `src/core`, not used at app runtime
- `src/audio/` : Web Audio scheduling + synthesis (`engine.ts`)
- `src/discovery/` : pure detection of musical relationships a child can stumble on
  (`detector`/`rules`/`timeline`/`eligibility`), plus the reveal queue and storage.
  Names the thing found — never says a title is wrong (see Product Definition).
- `src/challenges/` : open-ended prompts (「あめの音」「おばけが ちかづいてくる」) and
  the analysis that makes the scene react. No scoring: the child decides when it's done.
- `src/ui/` : grid helpers, color mapping, `noteLabel.ts` (locale-aware ドレミ/ABC)
- `src/hooks/` : custom hooks — `useSong` (song state + undo history), `useDragInteraction`,
  `useLocale` (a `useSyncExternalStore` over localStorage, so every caller shares one value)
- `src/lib/` : Supabase client (`supabase.ts`), i18n translations (`i18n.ts`, exports `Translations`)
- `src/app/` : Next.js pages/components and styles
  - `components/` : `Header`, `SettingsPanel`, `Grid`, `NotePanel`, `SaveModal`
  - `styles/` : per-concern global CSS (`base/header/settings/grid/note-panel/modal/songs`), assembled by `globals.css` via `@import`
  - `page.tsx` : editor — wires state/handlers and composes the components
  - `songs/` : community songs feed page (`/songs`)
  - `discoveries/` : the album of what a child has found (`/discoveries`)
  - `teacher/` : moderation view for teachers only (`/teacher`) — see 見守れる練習場
  - `components/AccountProvider.tsx` : who is signed in, and everything hanging off it.
    `AccountMenu` reads it directly; pages call `useAccount()`. Identity is NOT
    threaded as props — that is what made a menu item go missing on three pages.

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

## Design Conventions
Playful, rounded, kid-friendly. Keep new UI consistent with these:
- **Theming**: use the CSS custom properties in `styles/base.css` (`--background`, `--foreground`, `--grid-bg`, `--grid-line`, `--header-bg`, `--beat-line`, `--cell-size` 40px, `--label-width` 48px). Light + dark are handled via `prefers-color-scheme` overriding these vars — **never hardcode theme colors**; reference `var(--…)`.
- **Note/drum colors**: come from `src/ui/color.ts` (`colorForNote`/`colorForDrum`, HSL by note letter). Don't inline note colors elsewhere.
- **Accent gradients**: `linear-gradient(135deg, …)` per action — play=green, stop=red, undo=amber, settings/reset=purple (`#667eea→#764ba2`), save=teal, title/songs=rainbow, black-keys=dark. Reuse the matching gradient for new accents.
- **Shapes**: pill buttons (`border-radius: 20px`), rounded bubble notes (8–12px), rounded chips/cards.
- **Responsive**: three breakpoints — `≥900px` desktop (single-row header), `600–899px` tablet, `<600px` mobile (stacked header, full-width transport); songs grid also tightens at `≤480px`. Preserve these breakpoints.
- **CSS location**: edit the matching `src/app/styles/*.css` file (classes are global, not CSS Modules); keep each file's rules in their original relative order.

## i18n
- Locale is `"ja"` (Japanese) by default, switched via the **account menu** (avatar circle, top right — `AccountMenu`; also holds profile / login / logout)
- Persisted in `localStorage` under key `"beatbubble-locale"`
- All UI strings come from `src/lib/i18n.ts` via `useLocale()` hook
- **Note names are localized**: ja shows ドレミ (`noteLabel`), en shows ABC — display only; storage stays NoteName
- Both `/` and `/songs` pages share the account menu (locale switch works signed out too)

## Save / Feed
- Songs are saved to Supabase table `songs` (columns: id, title, author, song_data jsonb, created_at, updated_at, grade, class_name)
  - `updated_at` is server-controlled (trigger): bumped only when title/author/song_data change (overwrite-save, rename) — not by hidden/is_template flips
  - `grade`/`class_name` are a **snapshot of the author's profile at save time** (trigger `songs_class_snapshot`): populated on insert from `profiles`, frozen on update, null for anonymous saves. The client never sends them.
- Public read + insert RLS policies (no auth required)
- `/songs` page: server-side text search (`ilike` title/author, debounced) + grade/class filters (`song_class_options()` RPC feeds the dropdowns; hidden when no class data); all fold into `useSongFeed`, paginated 24/page via `.range()` (infinite scroll + "もっと見る" fallback); each card links to `/?load=<id>`
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
