-- 0016: class folders a child can ていしゅつ a song into (#143, step 1: DB only)
--
-- A class's songs include everything its children made at home, so the class
-- filter can't answer "which works came from this lesson". A folder is that
-- unit: a teacher makes one per lesson, and a child files a song into it by
-- choosing to — saving is trying, ていしゅつ is "this one is my answer".
--
-- A folder is a lens, not a permission boundary: who can see a song is still
-- songs.visibility. Class-only visibility is #99's question, not this one's.

create table if not exists public.song_folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- The teacher's prompt, shown at the top of the folder.
  prompt      text,
  grade       smallint not null,
  -- Null means every class in the grade, so a specialist teacher can run one
  -- folder across a year group.
  class_name  text,
  -- Nullable so a folder outlives the teacher account that made it: the work
  -- inside belongs to the children.
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  -- Closed folders drop out of the ていしゅつ choices but keep showing their
  -- work. Not a lock: see songs_folder_guard below.
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint song_folders_name_len check (char_length(name) between 1 and 40),
  constraint song_folders_prompt_len check (prompt is null or char_length(prompt) <= 200),
  constraint song_folders_grade_range check (grade between 1 and 6),
  constraint song_folders_class_len check (class_name is null or char_length(class_name) <= 40)
);

-- Same cleaning as profiles (0009), so a folder's class compares equal to the
-- class a child picked on their profile.
create or replace function public.song_folders_normalize()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.name := btrim(new.name);
  new.prompt := nullif(btrim(new.prompt), '');
  new.class_name := public.normalize_class_name(new.class_name);
  return new;
end;
$$;

drop trigger if exists song_folders_normalize on public.song_folders;
create trigger song_folders_normalize
  before insert or update on public.song_folders
  for each row execute function public.song_folders_normalize();

alter table public.song_folders enable row level security;

-- Readable by everyone, like the feed it groups.
drop policy if exists "anyone reads folders" on public.song_folders;
create policy "anyone reads folders"
  on public.song_folders for select
  to public
  using (true);

-- Only teachers make, rename, close and remove folders. Any teacher, not just
-- the creator: a class teacher and a music specialist share the same lessons.
drop policy if exists "teacher creates folders" on public.song_folders;
create policy "teacher creates folders"
  on public.song_folders for insert
  to authenticated
  with check (public.current_user_is_teacher() and created_by = (select auth.uid()));

drop policy if exists "teacher updates folders" on public.song_folders;
create policy "teacher updates folders"
  on public.song_folders for update
  to authenticated
  using (public.current_user_is_teacher())
  with check (public.current_user_is_teacher());

drop policy if exists "teacher deletes folders" on public.song_folders;
create policy "teacher deletes folders"
  on public.song_folders for delete
  to authenticated
  using (public.current_user_is_teacher());

-- Deleting a folder must never delete children's work: it just leaves it.
alter table public.songs
  add column if not exists folder_id uuid
  references public.song_folders(id) on delete set null;

create index if not exists songs_folder_id_idx
  on public.songs (folder_id)
  where folder_id is not null;

-- Who may put a song into a folder. RLS already limits writes to the owner's
-- own songs; this adds what a policy can't express about the folder itself.
-- SECURITY DEFINER so it reads the owner's profile the same way whoever is
-- calling: the check must not quietly change meaning if the profiles policies
-- do (same reasoning as profiles_companion_guard in 0014).
create or replace function public.songs_folder_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.song_folders%rowtype;
  owner_teacher boolean;
  owner_grade smallint;
  owner_class text;
begin
  -- Only moving *into* a folder is checked. Taking a song out is always
  -- allowed, and an overwrite-save that leaves folder_id alone must keep
  -- working after its folder has been closed — closing is not a lock.
  if new.folder_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.folder_id is not distinct from old.folder_id then
    return new;
  end if;

  -- A folder is sorted by class, and an anonymous save has none.
  if new.user_id is null then
    raise exception 'sign in to submit a song to a folder';
  end if;

  select * into f from public.song_folders where id = new.folder_id;
  if not found then
    -- Say so here: left to fall through, a missing folder would read as
    -- "another class", which is the wrong thing to tell a child.
    raise exception 'no such folder';
  end if;
  if f.archived then
    raise exception 'this folder is closed';
  end if;

  select p.is_teacher, p.grade, p.class_name
    into owner_teacher, owner_grade, owner_class
    from public.profiles p
    where p.id = new.user_id;

  -- Teachers file anything (their templates live in folders too). A child
  -- files only into their own class's folders: a song dropped into another
  -- class's lesson is the kind of aimed act 見守れる練習場 makes hard.
  if coalesce(owner_teacher, false) then
    return new;
  end if;
  if owner_grade is distinct from f.grade
     or (f.class_name is not null and owner_class is distinct from f.class_name) then
    raise exception 'this folder is for another class';
  end if;
  return new;
end;
$$;

drop trigger if exists songs_folder_guard on public.songs;
create trigger songs_folder_guard
  before insert or update of folder_id on public.songs
  for each row execute function public.songs_folder_guard();

revoke all on function public.songs_folder_guard() from public;
