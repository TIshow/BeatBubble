-- Only teachers may make a song a template. Applied to the BeatBubble project.
--
-- Gated by a trigger on the false→true transition (not RLS with_check), so
-- editing or unsetting an existing template is unaffected — an RLS check on the
-- resulting row would wrongly block a non-teacher from editing a template they
-- already own. Unsetting (true→false) and non-template edits pass through.

create or replace function public.songs_enforce_template_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_template and (tg_op = 'INSERT' or not old.is_template) then
    if not exists (select 1 from public.profiles p where p.id = new.user_id and p.is_teacher) then
      raise exception 'only teachers can make a song a template';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists songs_enforce_template_teacher on public.songs;
create trigger songs_enforce_template_teacher
  before insert or update on public.songs
  for each row execute function public.songs_enforce_template_teacher();
