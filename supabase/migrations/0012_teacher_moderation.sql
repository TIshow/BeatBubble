-- 0012: give teachers a moderation view of published songs (#117)
--
-- Teachers could read profiles (0011) but still couldn't act: songs are
-- readable only when `hidden = false`, and updatable only by their owner. When
-- a child published an abusive title from an account nobody could trace, the
-- only fix was editing the database by hand.
--
-- Two additions, both deliberately narrow:

-- 1. Teachers see everything that was PUBLISHED, including songs already
--    hidden (so hiding stays reversible). Other children's drafts stay
--    private: an unpublished sketch can't hurt anyone, and a teacher reading
--    it would be surveillance rather than moderation.
drop policy if exists "teacher reads published songs" on public.songs;
create policy "teacher reads published songs"
  on public.songs for select
  to authenticated
  using (public.current_user_is_teacher() and visibility <> 'draft');

-- 2. Hiding is a function, not an UPDATE policy. RLS can't restrict WHICH
--    columns an update touches, so a policy broad enough to let a teacher hide
--    a song would also let them rewrite its title and notes. This exposes only
--    the one flag. (songs_touch_updated_at already ignores `hidden`, so
--    moderation doesn't reorder the feed.)
create or replace function public.set_song_hidden(song_id uuid, hide boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.current_user_is_teacher() then
    raise exception 'only teachers may hide songs';
  end if;
  update public.songs set hidden = hide where id = song_id;
end;
$$;

revoke all on function public.set_song_hidden(uuid, boolean) from public;
grant execute on function public.set_song_hidden(uuid, boolean) to authenticated;
