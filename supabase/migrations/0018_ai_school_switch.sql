-- 0018: one school-wide switch for AI, and one school-wide daily cap (#151)
--
-- 0017 tied AI to lesson folders, which tied it to classes. That was the wrong
-- boundary: a class here is only the grade and class a child picks on their
-- own profile — 29 of 170 children have set one, and any child can pick
-- another — and the check never looked at whether a song was in the folder
-- anyway. So: a teacher turns AI on or off for everyone, signed-in children
-- use it while it is on, and the cap is counted for the whole school.
--
-- song_folders.ai_enabled is left in place here and dropped in a later
-- migration: the app deployed before this change still selects it.

-- A single row: the singleton key can only be true.
create table if not exists public.ai_settings (
  singleton       boolean primary key default true check (singleton),
  friend_enabled  boolean not null default false,
  updated_at      timestamptz not null default now()
);

insert into public.ai_settings default values on conflict do nothing;

alter table public.ai_settings enable row level security;

-- Signed-in users read it (the editor needs to know whether to offer AI);
-- only teachers change it. No insert or delete: there is one row.
drop policy if exists "signed in reads ai settings" on public.ai_settings;
create policy "signed in reads ai settings"
  on public.ai_settings for select
  to authenticated
  using (true);

drop policy if exists "teacher updates ai settings" on public.ai_settings;
create policy "teacher updates ai settings"
  on public.ai_settings for update
  to authenticated
  using (public.current_user_is_teacher())
  with check (public.current_user_is_teacher());

-- Same contract as in 0017 — 'ok', 'signed-out', 'not-enabled' or 'limit' —
-- so the API route needs no change. Only who may ask, and how it's counted,
-- are new:
-- - a teacher may always ask (to try it before turning it on), in their own
--   bucket;
-- - a child may ask while the switch is on, from one school-wide allowance.
-- Usage is still a count per day and bucket, never per child.
create or replace function public.ai_take_quota()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- About 100 asks a day from each of ten classes. At Claude Haiku 5.5 rates
  -- that is around ¥70 on the busiest day.
  school_limit  constant integer := 1000;
  teacher_limit constant integer := 300;
  me uuid := auth.uid();
  is_teacher boolean;
  my_bucket text;
  my_limit integer;
  used integer;
begin
  if me is null then
    return 'signed-out';
  end if;

  select p.is_teacher into is_teacher from public.profiles p where p.id = me;

  if coalesce(is_teacher, false) then
    my_bucket := 'teacher';
    my_limit := teacher_limit;
  else
    if not coalesce((select s.friend_enabled from public.ai_settings s), false) then
      return 'not-enabled';
    end if;
    my_bucket := 'school';
    my_limit := school_limit;
  end if;

  insert into public.ai_usage_daily as u (day, bucket, count)
    values ((now() at time zone 'Asia/Tokyo')::date, my_bucket, 1)
  on conflict (day, bucket) do update
    set count = u.count + 1
    where u.count < my_limit
  returning u.count into used;

  if used is null then
    return 'limit';
  end if;
  return 'ok';
end;
$$;

revoke all on function public.ai_take_quota() from public, anon;
grant execute on function public.ai_take_quota() to authenticated;
