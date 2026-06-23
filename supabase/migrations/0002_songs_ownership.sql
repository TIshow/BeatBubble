-- #34 — song ownership for optional Google sign-in.
-- Applied to the BeatBubble Supabase project via the management API.
--
-- Additive & backward compatible: anonymous saves (user_id null) keep working
-- exactly as before; signing in lets a user own the songs they save.

alter table public.songs
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists songs_user_id_idx on public.songs(user_id);

-- Insert: anon may post (user_id null); a signed-in user may only post as self.
drop policy if exists "public insert visible" on public.songs;
create policy "insert own or anon" on public.songs
  for insert to public
  with check (hidden = false and (user_id is null or user_id = auth.uid()));

-- Owners may edit / delete only their own VISIBLE rows
-- (moderated/hidden rows stay locked; the `using (hidden=false)` clause also
--  prevents an owner from un-hiding a moderated song).
create policy "owner update" on public.songs
  for update to public
  using (auth.uid() = user_id and hidden = false)
  with check (auth.uid() = user_id and hidden = false);

create policy "owner delete" on public.songs
  for delete to public
  using (auth.uid() = user_id and hidden = false);
