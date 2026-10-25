# BeatBubble — Claude Code Guide

> **This file and `AGENTS.md` are the same document with a different title line.**
> Claude Code reads this one, Codex reads the other. Update both together — they
> have drifted twice, and each time an agent worked from a stale map.

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
- `src/ai/` : the AI friend (#151) — `scoreText.ts` (a song as text for the model: notes
  only), the companion's prompt and checks (`friend.ts`, `guard.ts`), the model call
  (`askFriend.ts`, `model.ts`) and `friendEndpoint.ts` behind `POST /api/ai/friend`.
  `listen.ts` / `questions.ts` are earlier ideas kept for their check scripts, not used by the app
- `src/audio/` : Web Audio scheduling + synthesis (`engine.ts`)
- `src/discovery/` : **pure detection** of musical relationships a child can stumble on
  (`detector`/`timeline`/`eligibility`), plus the reveal queue and progress storage.
  Names the thing found — never says a song is wrong (see Product Definition).
  - `rules/` : detection rules grouped by musical concern (harmony/melody/rhythm)
- `src/creatures/` : **presentation only** — maps a `DiscoveryId` to its sound creature
  (art, name, reveal effect) and stores an anonymous companion choice. It never
  detects anything; keeping that split is what lets the rules be unit-tested.
- `src/challenges/` : open-ended prompts (「あめの音」「おばけが ちかづいてくる」) and
  the analysis that makes the scene react. No scoring: the child decides when it's done.
- `src/ui/` : grid helpers, color mapping, `noteLabel.ts` (locale-aware ドレミ/ABC),
  `floatingPosition.ts` (draggable companion placement)
- `src/hooks/` : custom hooks — `useSong` (song state + undo history), `useDragInteraction`,
  discovery/companion persistence, playback feedback, and
  `useLocale` (a `useSyncExternalStore` over localStorage, so every caller shares one value)
- `src/lib/` : Supabase client and repositories, `browserStorage.ts` (storage access that
  can't throw in private mode), i18n translations (`i18n.ts`, exports `Translations`),
  `folders.ts` (lesson-folder type and order), `classes.ts` (the grade/class pickers —
  one list for the profile form and the folder form; see Lesson folders)
- `src/app/` : Next.js pages/components and styles
  - `components/` : shared editor components (`Header`, `SettingsPanel`, `Grid`,
    `NotePanel`, `SaveModal`); `SongGrid` (the song-card grid, shared by the feed and
    a folder page so a card behaves the same in both); `TeacherFolders`; discovery and
    companion UI live in `components/discovery/` and `components/companion/`
  - `styles/` : per-concern global CSS (`base/header/settings/grid/note-panel/modal/discoveries/companion/songs`), assembled by `globals.css` via `@import`
  - `page.tsx` : editor — wires state/handlers and composes the components
  - `songs/` : community songs feed page (`/songs`)
  - `songs/folders/[id]/` : one lesson folder — the teacher's prompt, its templates,
    then the songs handed in (`/songs/folders/<id>`)
  - `discoveries/` : 「おとのずかん」— the album of creatures met so far (`/discoveries`)
  - `teacher/` : moderation view for teachers only (`/teacher`) — see 見守れる練習場
  - `components/AccountProvider.tsx` : who is signed in, and everything hanging off it.
    `AccountMenu` reads it directly; pages call `useAccount()`. Identity is NOT
    threaded as props — that is what made a menu item go missing on three pages.

> Note: classes in `styles/*.css` are **global** (not CSS Modules). Keep each file's rules in their original relative order — some overrides are source-order dependent.

## おとのいきもの (sound creatures)
The discovery layer is dressed as creatures a child *meets* by making music, not
as cards they earn. `src/discovery` decides **what** was found; `src/creatures`
decides **how it looks**. Keep that seam: detection stays pure and testable.

Rules that are easy to get wrong:

- **Only a first meeting animates.** A match re-fires on every loop of the song,
  so animating every match dropped a full-size creature onto the middle of the
  grid while the child was working. Meeting a creature you have already met is
  not news. (This deliberately narrows the original plan of "a quiet reaction
  every time" — that reaction was never built quiet.)
- **A creature is never a score.** No ranking, no completion pressure. The
  editor chip is a plain link labelled ずかん; the count lives in the album.
- **Nothing is "wrong".** Dissonance, silence and repetition each have a
  creature. The album names what a child did; it never grades it.
- **Companion is one creature the child chose**, shown floating in the editor and
  draggable. Signed-in choices live in `profiles.companion_discovery_id` (a DB
  trigger refuses a creature the user has not met); anonymous choices stay in
  session storage and are never written to the database.

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
- Songs are saved to Supabase table `songs` (columns: id, title, author, description, song_data jsonb, user_id, visibility, is_template, hidden, folder_id, created_at, updated_at, grade, class_name)
  - `updated_at` is server-controlled (trigger): bumped only when title/author/song_data/description change (overwrite-save, rename) — not by hidden/is_template/visibility/folder flips, so none of those reorder the feed
  - `grade`/`class_name` are a **snapshot of the author's profile at save time** (trigger `songs_class_snapshot`): populated on insert from `profiles`, frozen on update, null for anonymous saves. The client never sends them.
- Public read + insert RLS policies (no auth required)
- `/songs` page: server-side text search (`ilike` title/author, debounced) + grade/class filters (`song_class_options()` RPC feeds the dropdowns; hidden when no class data); all fold into `useSongFeed`, paginated 24/page via `.range()` (infinite scroll + "もっと見る" fallback); each card links to `/?load=<id>`
- Editor loads a song via `?load=<id>` on mount **through `migrateSong()`**, then cleans the URL with `replaceState`
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `ANTHROPIC_API_KEY` (server only — read by `/api/ai/friend`, never sent to the browser)

## Lesson folders (授業のフォルダ, #143)
A folder collects one lesson's work. Teachers make and close them on `/teacher`;
children submit (ていしゅつ) songs into the open ones for their class. Rules that
are easy to get wrong:

- **Saving is trying; ていしゅつ is "this one is my answer".** A folder holds only
  what a child chose to hand in. "Don't submit" is the default, and starting from
  a template filed in a folder does **not** file the new song — children open
  templates to play at home too. Submitting later from a card's ⋯ is the main
  path: make several tries, then pick one.
- **A draft can't be handed in as a draft.** Drafts are seen by nobody — not the
  class, not `/teacher` — so submitting one publishes it. The save dialog swaps its
  buttons for a single 「📁 ていしゅつ する」; the card menu asks first. Unlisted
  stays unlisted: that is a submission for the teacher only.
- **Closing a folder (`archived`) is not a lock.** It only leaves the choices;
  overwrite-saving a submitted song keeps it in the folder.
- **A folder is a lens, not a permission boundary.** Who can see a song is still
  `visibility` (class-only visibility is #99). Deleting a folder never deletes
  songs (`folder_id` is `on delete set null`).
- **The database is the gate** (`songs_folder_guard`, migration 0016). A child files
  only into an open folder for their own grade and class (or their grade's
  whole-grade folders); teachers file anywhere, since templates go in folders too.
  The guard compares the folder's class with the profile's, which is why
  `src/lib/classes.ts` is the one picker list for both forms.
- **No "who hasn't submitted" list, no deadlines, no grading.** A roster diff turns
  the folder into compliance tracking — the LMS this document rules out.
- Pages: `/songs/folders/<id>` (works signed out, so it can go on the classroom
  screen); shortcuts on `/songs` for the viewer's class; `/teacher` filters its
  song list by folder, unlisted included.

## AI のともだち (#151)
Tapping the companion gets one short line from it about the song, the way a
friend beside the child would talk. Rules that are easy to get wrong:

- **Three kinds, one per tap (#161): noticed → impression → something to try.**
  A notice says something true about the notes and may ask lightly (「どんな
  つもり？」). An impression is the companion's own reaction to a fact
  (「高い ドに いきなり とんで、びっくりした」) — never the song's mood or scene,
  which the model can't hear (#151). A suggestion proposes one change to try and
  ends by asking what happens — never which note, and never that it would be
  better: choosing is the child's part ("AI may scaffold; it must not answer").
- **The prompt asks; the checks make it true.** Praise and verdicts in any kind,
  "change" outside a suggestion, a named target note, score notation, ここ and
  beat numbers are dropped by `src/ai/guard.ts` / `friend.ts`. Lines are dropped
  whole, never trimmed.
- **Only the notes leave the browser.** `scoreToText` reads a `Song`, which has
  no title, author or description; a title can name a classmate.
- **One switch for the school** (`ai_settings.friend_enabled`, migration 0018),
  on `/teacher`. Not per class: a class here is only what a child picked on their
  profile. Teachers can try it while it is off. The server checks the switch and
  a school-wide daily cap (`ai_take_quota()`) before every request; the editor's
  check only decides whether a tap asks.
- **Counts, not records.** `ai_usage_daily` counts requests per day for the
  school and for teachers; nothing names a child, and the lines are not stored.
- **A tap asks, and the same notes are never asked twice.** The editor keeps the
  (up to three) lines for the current score and says the next one per tap; it
  asks again only once the score text changes. Nothing is sent while a child works.
- **The examples in the prompt are shuffled per request** (`REACTION_SEEDS`,
  `TRY_SEEDS`): the model takes the first example that fits, so in a fixed order
  most songs got the same reaction and the same suggestion. They stay in the
  system prompt — moved into the user message, the model thought four times as
  long (a 7-second wait).
- **Only AI-written words carry the AI mark.** The companion's fixed lines (empty
  song, nothing to say, failure, daily limit) are its own and are not marked.
- **It can be wrong.** In checks about 1 line in 6 misstated the song (a note
  name; 「いっしょに」 for notes that play in turn). Low stakes — it is the child's
  own song — but never treat a line as fact or build on it.
- **Prompt changes need a check run**: `pnpm friend-check` (written songs and
  teacher templates, never children's work; a few yen). Telling the model not to
  say a word made it say it more — `ここ` is caught by the check instead.

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
- Play a third for the first time -> creature reveal appears; play it again ->
  nothing appears (repeat meetings must stay silent)
- Pick a companion in /discoveries -> it floats in the editor and can be dragged
- Save a song while signed in -> the modal says a teacher can see who made it
- /teacher shows nothing for a child, and the account menu offers 先生ページ
  only to a teacher (RLS is the real gate; the link is convenience)
- Teacher makes a folder on /teacher -> a child of that class sees it on /songs,
  and the save dialog offers 「フォルダに ていしゅつ」 with ていしゅつ しない selected
- Pick a folder in the save dialog -> the buttons become one 「📁 ていしゅつ する」,
  and the song appears on the folder page
- Submit a draft from a card's ⋯ -> it asks before publishing; take it back ->
  it leaves the folder page at once
- Close the folder -> it leaves the save choices, and its songs still show
- AI switch on (or as a teacher), tap the companion: an empty song -> its own line,
  no AI mark, no request; with notes -> 「どれどれ…」 then a noticed line marked AI;
  tap again -> an impression, then something to try, with no new request; drag it
  -> no line
- AI switch off -> a child's companion only moves, and its label has no tap hint
