-- Snapshot the author's grade/class onto each song so the feed can be filtered
-- by class (e.g. "3年2組"). Applied to the BeatBubble Supabase project.
--
-- Denormalized on purpose: a song made in 3年 stays a 3年 work after the child
-- moves up a grade. Server-controlled via a trigger — the client never sends
-- these (can't be spoofed), and they're frozen at creation (updates preserve
-- them). Anonymous songs (user_id null) have no class.

alter table public.songs add column if not exists grade smallint;
alter table public.songs add column if not exists class_name text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'songs_grade_range') then
    alter table public.songs
      add constraint songs_grade_range check (grade is null or (grade between 1 and 6));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'songs_class_name_len') then
    alter table public.songs
      add constraint songs_class_name_len check (class_name is null or char_length(class_name) <= 40);
  end if;
end $$;

-- INSERT: copy the author's current grade/class from their profile.
-- UPDATE: keep the snapshot frozen, ignoring any client-sent change.
create or replace function public.songs_class_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null then
      select p.grade, p.class_name
        into new.grade, new.class_name
        from public.profiles p
        where p.id = new.user_id;
    end if;
  else
    new.grade := old.grade;
    new.class_name := old.class_name;
  end if;
  return new;
end;
$$;

drop trigger if exists songs_class_snapshot_ins on public.songs;
create trigger songs_class_snapshot_ins
  before insert on public.songs
  for each row execute function public.songs_class_snapshot();

-- Backfill existing songs from their author's current profile. Runs before the
-- UPDATE trigger exists, so the preserve-old-values branch can't undo it.
-- (The updated_at trigger only bumps on title/author/song_data changes, so
--  ordering of the feed is unaffected.)
update public.songs s
set grade = p.grade, class_name = p.class_name
from public.profiles p
where s.user_id = p.id and s.user_id is not null;

drop trigger if exists songs_class_snapshot_upd on public.songs;
create trigger songs_class_snapshot_upd
  before update on public.songs
  for each row execute function public.songs_class_snapshot();

-- Distinct grade/class pairs present in the visible feed, for the filter UI.
-- Done in the DB (not by fetching every row) so it stays cheap as songs grow.
create or replace function public.song_class_options()
returns table (grade smallint, class_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct s.grade, s.class_name
  from public.songs s
  where s.hidden = false and (s.grade is not null or s.class_name is not null)
  order by s.grade nulls last, s.class_name nulls last;
$$;

grant execute on function public.song_class_options() to anon, authenticated;
