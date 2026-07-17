-- 0009: normalize class names to half-width digits (#89)
--
-- Kids typed the same class as 2 / ２ / 2組 / 4年2組 / 5‐1, so one class
-- splits into several filter options on /songs. Normalize at the database so
-- every write path is covered (the client sends class_name as typed and shows
-- whatever the upsert returns).
--
-- Rule:
--   1. full-width digits → half-width; trim (incl. full-width space); '' → null
--   2. if the string contains digits, keep the LAST digit run, leading zeros
--      stripped: ２→2, 2組→2, 4年2組→2 (grade lives in its own column),
--      5‐1→1
--   3. no digits at all (e.g. 'A') → keep as typed, just trimmed

create or replace function public.normalize_class_name(raw text)
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare
  s text;
  digits text;
begin
  if raw is null then
    return null;
  end if;
  s := btrim(translate(raw, '０１２３４５６７８９', '0123456789'), ' 　' || E'\t');
  if s = '' then
    return null;
  end if;
  digits := (regexp_match(s, '([0-9]+)[^0-9]*$'))[1];
  if digits is not null then
    return coalesce(nullif(ltrim(digits, '0'), ''), '0');
  end if;
  return s;
end;
$$;

-- Normalize on every profile write. The songs snapshot trigger copies
-- class_name from profiles on insert, so clean profiles keep songs clean.
create or replace function public.profiles_normalize_class()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.class_name := public.normalize_class_name(new.class_name);
  return new;
end;
$$;

drop trigger if exists profiles_normalize_class on public.profiles;
create trigger profiles_normalize_class
  before insert or update on public.profiles
  for each row execute function public.profiles_normalize_class();

-- Fix existing data.
update public.profiles
set class_name = public.normalize_class_name(class_name)
where class_name is distinct from public.normalize_class_name(class_name);

-- songs.class_name is a frozen snapshot: songs_class_snapshot_upd reverts any
-- update, and songs_touch_updated_at must not treat this correction as an
-- edit. Disable both just for this one statement.
alter table public.songs disable trigger songs_class_snapshot_upd;
alter table public.songs disable trigger songs_touch_updated_at;

update public.songs
set class_name = public.normalize_class_name(class_name)
where class_name is distinct from public.normalize_class_name(class_name);

alter table public.songs enable trigger songs_class_snapshot_upd;
alter table public.songs enable trigger songs_touch_updated_at;
