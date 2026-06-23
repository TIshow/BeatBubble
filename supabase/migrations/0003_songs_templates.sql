-- #36 templates: any signed-in owner can publish one of their songs as a
-- template for others (incl. anonymous students) to start from.
-- Applied to the BeatBubble Supabase project via the management API.

alter table public.songs
  add column if not exists is_template boolean not null default false;

create index if not exists songs_is_template_idx
  on public.songs(is_template) where is_template;

-- Harden insert so a template can only be created by its (signed-in) owner.
-- Normal saves never set is_template, so anonymous saves are unaffected.
drop policy if exists "insert own or anon" on public.songs;
create policy "insert own or anon" on public.songs
  for insert to public
  with check (
    hidden = false
    and (user_id is null or user_id = auth.uid())
    and (is_template = false or user_id = auth.uid())
  );

-- (The existing "owner update" policy already lets an owner toggle is_template
--  on their own visible rows; the public read policy exposes templates to all.)
