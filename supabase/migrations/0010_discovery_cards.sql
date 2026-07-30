-- #108 — "discovery cards" earned by experimenting with musical patterns.
--
-- Song data and user progression stay separate:
--   * discovery_cards is the stable ID registry (labels/rules live in code)
--   * user_discovery_cards stores one first-discovery fact per user/card
--
-- Anonymous editor sessions stay client-local. Only authenticated users may
-- read or insert progression, and only for themselves.

create table if not exists public.discovery_cards (
  id text primary key,
  rule_version smallint not null,
  sort_order smallint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discovery_cards_id_format check (id ~ '^[a-z][a-z0-9_]*$'),
  constraint discovery_cards_rule_version_positive check (rule_version > 0)
);

insert into public.discovery_cards (id, rule_version, sort_order)
values
  ('interval_third', 1, 10),
  ('open_fifth', 1, 20),
  ('close_tension', 1, 30),
  ('stepwise_run', 1, 40),
  ('call_and_response', 1, 50),
  ('rest_then_burst', 1, 60),
  ('rhythm_loop', 1, 70),
  ('sustain_contrast', 1, 80)
on conflict (id) do update
set
  rule_version = excluded.rule_version,
  sort_order = excluded.sort_order,
  active = true;

create table if not exists public.user_discovery_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.discovery_cards(id) on delete restrict,
  discovered_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.discovery_cards enable row level security;
alter table public.user_discovery_cards enable row level security;

-- Card IDs contain no user data. Clients may read the registry, but only
-- migrations/service-role operations may create, change, or retire cards.
drop policy if exists "discovery cards read" on public.discovery_cards;
create policy "discovery cards read" on public.discovery_cards
  for select to anon, authenticated
  using (active = true);

-- Progress is private to its owner.
drop policy if exists "own discovery cards read" on public.user_discovery_cards;
create policy "own discovery cards read" on public.user_discovery_cards
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own discovery cards insert" on public.user_discovery_cards;
create policy "own discovery cards insert" on public.user_discovery_cards
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- The first-discovery timestamp is server-controlled even if a client includes
-- one in its payload. The active-card check also prevents acquiring a retired
-- card through a stale or modified client.
create or replace function public.user_discovery_cards_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.discovery_cards c
    where c.id = new.card_id and c.active
  ) then
    raise exception 'unknown or inactive discovery card';
  end if;
  new.discovered_at := now();
  return new;
end;
$$;

drop trigger if exists user_discovery_cards_guard_insert
  on public.user_discovery_cards;
create trigger user_discovery_cards_guard_insert
  before insert on public.user_discovery_cards
  for each row execute function public.user_discovery_cards_guard();

-- Be explicit about Data API privileges. There is intentionally no
-- UPDATE/DELETE grant or policy: an earned card is permanent.
revoke all on public.discovery_cards from anon, authenticated;
grant select on public.discovery_cards to anon, authenticated;

revoke all on public.user_discovery_cards from anon, authenticated;
grant select, insert on public.user_discovery_cards to authenticated;
