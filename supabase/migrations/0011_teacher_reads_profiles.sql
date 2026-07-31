-- 0011: let teachers see who made which song (#117)
--
-- A song's `author` is free text the child types, so it can't identify anyone:
-- 79 of 438 songs carry a name that differs from the account's profile, and a
-- child has already published under another child's name. Teachers need the
-- account behind a song to have that conversation.
--
-- profiles was readable only by its owner, so there was no way for a teacher to
-- resolve songs.user_id to a name. Add a teacher-only read.
--
-- The obvious policy — EXISTS (select 1 from profiles where id = auth.uid() and
-- is_teacher) — recurses: evaluating a profiles policy would query profiles.
-- A SECURITY DEFINER function runs as the owner and bypasses RLS, breaking the
-- cycle.

create or replace function public.current_user_is_teacher()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    (select p.is_teacher from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- Only signed-in users may ask; nobody may redefine the answer.
revoke all on function public.current_user_is_teacher() from public;
grant execute on function public.current_user_is_teacher() to authenticated;

-- Additive: the existing "own profile read" policy still covers children, and
-- permissive policies are OR'd. Children keep seeing only their own row, anon
-- keeps seeing none — verified in a rolled-back transaction before applying.
drop policy if exists "teacher reads all profiles" on public.profiles;
create policy "teacher reads all profiles"
  on public.profiles for select
  to authenticated
  using (public.current_user_is_teacher());
