-- 0015: let a child say what they were going for in a song (#137)
--
-- The point of the app is trial-and-error and expression, and "what did you
-- work on here?" is the child putting their own intent into words — the part a
-- finished song can't show on its own. Optional: making it required would add a
-- form to every save, and the aim is more attempts, not more filling in.

alter table public.songs add column if not exists description text;

-- Same shape as the title/author checks: a ceiling well above the client's, so
-- the client limit is the UX and this is the backstop (the anon key can POST
-- straight to PostgREST).
alter table public.songs drop constraint if exists songs_description_len;
alter table public.songs add constraint songs_description_len
  check (description is null or char_length(description) <= 400);

-- A description is the child's writing about their work, like the title — so
-- editing it counts as editing the song and reorders the feed. Hidden and
-- is_template flips still don't, which is what this trigger was added for.
create or replace function public.songs_touch_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := old.updated_at;
  if (new.title, new.author, new.description, new.song_data)
     is distinct from (old.title, old.author, old.description, old.song_data) then
    new.updated_at := now();
  end if;
  return new;
end;
$function$;
