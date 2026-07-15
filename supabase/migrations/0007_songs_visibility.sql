-- Song visibility: draft / unlisted / public. Applied to the BeatBubble
-- Supabase project. Separate from `hidden` (moderation): visibility is
-- owner-controlled, hidden is admin-controlled and owners can't clear it.
--
-- Foundation only: existing behaviour is unchanged. Every row defaults to
-- 'public', and the feed query restricts to 'public', so today's public songs
-- stay public. The save flow keeps inserting public songs until the draft UX
-- lands (so no song is ever stranded without a way to publish).
--
-- Visibility rule (enforced partly by RLS, partly by the feed query):
--   public   → in the feed AND reachable by link
--   unlisted → NOT in the feed, reachable by /?load=<id> (RLS allows the read;
--              the feed query filters visibility='public' to keep it out)
--   draft    → owner only

alter table public.songs add column if not exists visibility text not null default 'public';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'songs_visibility_values') then
    alter table public.songs
      add constraint songs_visibility_values check (visibility in ('draft', 'unlisted', 'public'));
  end if;
  -- draft/unlisted require an owner (an anonymous private song is unreachable).
  if not exists (select 1 from pg_constraint where conname = 'songs_visibility_owner') then
    alter table public.songs
      add constraint songs_visibility_owner check (visibility = 'public' or user_id is not null);
  end if;
  -- Templates must be public (they're meant to be reusable by everyone).
  if not exists (select 1 from pg_constraint where conname = 'songs_template_public') then
    alter table public.songs
      add constraint songs_template_public check (is_template = false or visibility = 'public');
  end if;
end $$;

-- Public + unlisted are world-readable; drafts are not. The feed query further
-- restricts to 'public' so unlisted is reachable only by direct link.
drop policy if exists "public read visible" on public.songs;
create policy "public read visible" on public.songs
  for select to public
  using (hidden = false and visibility in ('public', 'unlisted'));

-- Owners can read their own songs at any visibility (for the "mine" tab).
drop policy if exists "owner read own" on public.songs;
create policy "owner read own" on public.songs
  for select to public
  using (auth.uid() = user_id and hidden = false);

-- Insert: anon may post only public; a signed-in user may post any visibility
-- for their own rows. (Preserves the existing hidden/ownership/template checks.)
drop policy if exists "insert own or anon" on public.songs;
create policy "insert own or anon" on public.songs
  for insert to public
  with check (
    hidden = false
    and (user_id is null or user_id = auth.uid())
    and (is_template = false or user_id = auth.uid())
    and (visibility = 'public' or user_id = auth.uid())
  );
