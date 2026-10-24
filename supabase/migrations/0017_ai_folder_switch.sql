-- 0017: a teacher turns AI on per lesson folder, and use is capped per class per day (#151)
--
-- AI help (the questioner) is offered only to a class with an open folder
-- whose teacher turned it on — a lesson-level decision, so a lesson with AI
-- and one without can be compared. Off by default: nothing changes for a
-- folder until a teacher chooses it.

alter table public.song_folders
  add column if not exists ai_enabled boolean not null default false;

-- How many AI requests each class made each day. Counted per class, not per
-- child: CLAUDE.md rules out keeping a record of each child's behaviour, and a
-- class-wide cap needs nothing finer. No row names a child.
create table if not exists public.ai_usage_daily (
  day     date    not null,
  -- "<grade>-<class>" for a class (class may be empty), "teacher" for teachers
  bucket  text    not null,
  count   integer not null default 0,
  primary key (day, bucket)
);

-- No policies: nothing reads or writes this except the function below.
alter table public.ai_usage_daily enable row level security;

-- Called by the server before each AI request, as the signed-in user. Checks
-- the user may use AI right now and takes one from their class's daily
-- allowance in the same statement, so two requests can't both take the last.
--
-- Returns 'ok', 'signed-out', 'not-enabled' (no open AI folder for their class)
-- or 'limit'. The cap lives here rather than in the caller: the function is
-- callable from a browser too, and a caller-supplied cap could be raised.
-- Calling it directly can only spend the caller's own class's allowance, which
-- pressing the button would do as well.
create or replace function public.ai_take_quota()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 30 children asking ~10 times each. At Claude Haiku 5.5 rates that is
  -- about ¥20 for a class on its busiest day.
  daily_limit constant integer := 300;
  me uuid := auth.uid();
  is_teacher boolean;
  my_grade smallint;
  my_class text;
  my_bucket text;
  used integer;
begin
  if me is null then
    return 'signed-out';
  end if;

  select p.is_teacher, p.grade, p.class_name
    into is_teacher, my_grade, my_class
    from public.profiles p
    where p.id = me;

  if coalesce(is_teacher, false) then
    my_bucket := 'teacher';
  else
    if my_grade is null or not exists (
      select 1
      from public.song_folders f
      where f.ai_enabled
        and not f.archived
        and f.grade = my_grade
        and (f.class_name is null or f.class_name = my_class)
    ) then
      return 'not-enabled';
    end if;
    my_bucket := my_grade::text || '-' || coalesce(my_class, '');
  end if;

  insert into public.ai_usage_daily as u (day, bucket, count)
    values ((now() at time zone 'Asia/Tokyo')::date, my_bucket, 1)
  on conflict (day, bucket) do update
    set count = u.count + 1
    where u.count < daily_limit
  returning u.count into used;

  if used is null then
    return 'limit';
  end if;
  return 'ok';
end;
$$;

-- Signed-in users only. Supabase grants new functions to anon by default, so
-- revoking from public alone left it callable signed out (harmless — it said
-- 'signed-out' — but there is no reason to expose it).
revoke all on function public.ai_take_quota() from public, anon;
grant execute on function public.ai_take_quota() to authenticated;
