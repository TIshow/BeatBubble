-- User profiles for signed-in teachers and students.
-- Applied to the BeatBubble Supabase project via the management API.
--
-- Additive & backward compatible: anonymous use is unaffected. auth.users
-- holds identity; this table holds optional app attributes (school / grade /
-- class / gender) that a signed-in user can fill in. `is_teacher` distinguishes
-- teachers from students and is set manually by an admin (default false); a
-- normal user cannot promote themselves (guarded by the trigger below).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_teacher boolean not null default false,
  display_name text,
  school text,
  grade smallint,
  class_name text,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (display_name is null or char_length(display_name) <= 60),
  constraint profiles_school_len check (school is null or char_length(school) <= 100),
  constraint profiles_grade_range check (grade is null or (grade between 1 and 6)),
  constraint profiles_class_len check (class_name is null or char_length(class_name) <= 40),
  constraint profiles_gender_values
    check (gender is null or gender in ('male', 'female', 'other', 'undisclosed'))
);

alter table public.profiles enable row level security;

-- A user may read / insert / update only their own row. No public read: profile
-- attributes are private; the songs feed already carries its own `author` text.
-- Inserts are normally done by the trigger below; the explicit policy (with
-- is_teacher forced false) only covers a client-side upsert fallback.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select to public using (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to public with check (auth.uid() = id and is_teacher = false);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to public using (auth.uid() = id) with check (auth.uid() = id);

-- Maintain updated_at, and stop non-privileged callers from changing
-- is_teacher. SECURITY INVOKER (default) so current_user reflects the caller:
-- PostgREST requests run as 'authenticated'/'anon'; dashboard SQL (postgres)
-- and service_role are not in that set and may set is_teacher.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if current_user in ('authenticated', 'anon') then
    new.is_teacher := old.is_teacher;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Auto-create an empty profile when a new auth user signs up, seeding the
-- display name from the OAuth metadata. SECURITY DEFINER so it can insert past
-- RLS. on conflict keeps it idempotent with the backfill below.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before this migration.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from auth.users u
on conflict (id) do nothing;
