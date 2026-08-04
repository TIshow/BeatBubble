-- 0014: remember one discovered sound creature as the editor companion (#133)
--
-- The selection belongs to the account profile, so loading it adds no separate
-- request. Anonymous selections remain session-local and never reach this
-- column. Null means the user deliberately chose "no companion".

alter table public.profiles
  add column if not exists companion_discovery_id text
  references public.discovery_cards(id) on delete set null;

-- A modified client must not select a creature the user has not discovered.
-- SECURITY DEFINER lets the trigger perform the ownership check consistently;
-- the caller can still update only their own profile through the existing RLS.
create or replace function public.profiles_companion_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.companion_discovery_id is not null and not exists (
    select 1
    from public.user_discovery_cards udc
    where udc.user_id = new.id
      and udc.card_id = new.companion_discovery_id
  ) then
    raise exception 'companion must be one of the user discoveries';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_companion_guard_insert
  on public.profiles;
create trigger profiles_companion_guard_insert
  before insert on public.profiles
  for each row execute function public.profiles_companion_guard();

drop trigger if exists profiles_companion_guard_update
  on public.profiles;
create trigger profiles_companion_guard_update
  before update of companion_discovery_id on public.profiles
  for each row execute function public.profiles_companion_guard();

revoke all on function public.profiles_companion_guard() from public;
