-- updated_at for songs: bumped when the song content (song_data / title /
-- author) changes — i.e. an overwrite-save or rename. Moderation/metadata
-- flags (hidden, is_template) do not count as edits.
--
-- Server-controlled: the trigger first restores the old value, so a client
-- can neither spoof updated_at directly nor forget to set it.

alter table public.songs
  add column if not exists updated_at timestamptz not null default now();

-- Existing rows: treat creation as the last update.
update public.songs set updated_at = coalesce(created_at, now());

create or replace function public.songs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := old.updated_at;
  if (new.title, new.author, new.song_data)
     is distinct from (old.title, old.author, old.song_data) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists songs_touch_updated_at on public.songs;
create trigger songs_touch_updated_at
  before update on public.songs
  for each row execute function public.songs_touch_updated_at();
