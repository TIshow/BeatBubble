-- 0013: let teachers resolve an account to its school email (#117)
--
-- The school issues and manages the pupils' addresses, so the email — not the
-- typed name, not even the display name — is how staff identify a child. 162 of
-- 164 accounts are on the school domain.
--
-- Emails live in auth.users, which PostgREST doesn't expose, so this needs a
-- function either way. It deliberately does NOT copy emails into public.profiles:
-- that table is readable by each child for their own row, and a future policy
-- change there would leak addresses. Keeping them in auth.users behind one
-- teacher-gated function means there is exactly one way to read them, and it
-- checks every time.
create or replace function public.teacher_user_emails(user_ids uuid[])
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  if not public.current_user_is_teacher() then
    raise exception 'only teachers may look up email addresses';
  end if;
  return query
    select u.id, u.email::text
    from auth.users u
    where u.id = any(user_ids);
end;
$$;

revoke all on function public.teacher_user_emails(uuid[]) from public;
grant execute on function public.teacher_user_emails(uuid[]) to authenticated;
