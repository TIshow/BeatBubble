-- #31 — server-side safety for the public `songs` feed.
-- Applied to the BeatBubble Supabase project via the management API.
-- Kept here for version control / reproducibility.
--
-- Summary:
--   * `hidden` moderation flag — hidden rows disappear from the public feed/load.
--   * CHECK constraints enforce title/author length + non-empty and a song_data
--     size ceiling SERVER-SIDE (the client limits in src/lib/validation.ts are a
--     looser UX layer that can be bypassed via the anon key).
--   * RLS tightened so the public can only read/insert VISIBLE rows. There are no
--     UPDATE/DELETE policies, so anon cannot modify or delete; moderation is done
--     with the service role (dashboard / SQL).

alter table public.songs
  add column if not exists hidden boolean not null default false;

alter table public.songs
  add constraint songs_title_len
    check (char_length(title) between 1 and 100 and btrim(title) <> ''),
  add constraint songs_author_len
    check (char_length(author) between 1 and 60 and btrim(author) <> ''),
  add constraint songs_song_data_size
    check (length(song_data::text) <= 200000);

drop policy if exists "public read" on public.songs;
drop policy if exists "public insert" on public.songs;

create policy "public read visible" on public.songs
  for select to public using (hidden = false);

create policy "public insert visible" on public.songs
  for insert to public with check (hidden = false);

-- Moderation runbook (service role / SQL editor):
--   hide a song:    update public.songs set hidden = true  where id = '<uuid>';
--   restore a song: update public.songs set hidden = false where id = '<uuid>';
--
-- Deferred (tracked in #31):
--   * Rate limiting — belongs at the edge (Edge Function / gateway), NOT a naive
--     Postgres window trigger, which would block legitimate classroom bursts
--     (a whole class saving at once).
--   * Report inflow — a `reports` table + a client "report" button so reports
--     drive the `hidden` flag.
