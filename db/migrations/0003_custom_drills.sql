-- PitchSafe Plus: drills a player makes (custom_drills), the daily count of AI movement
-- estimates (ai_usage), and sessions that can log a custom drill next to a built-in one.
--
-- Custom drills are append-only for the app role: it can create one and archive it, but
-- never edit or delete it, so a session keeps the movement load it was logged with.
-- Archived drills stay in the table (and stay valid targets for old sessions); only
-- deleting the profile removes them, through the cascade.

-- Fail fast instead of queueing behind a long transaction while session_drills is altered
-- below (the migrator runs this file in one transaction).
set local lock_timeout = '5s';

-- Custom drills ----------------------------------------------------------------

create table public.custom_drills (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default public.current_player_id()
                 references public.profiles (user_id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  description  text not null default '' check (char_length(description) <= 500),
  category     text not null check (category in (
                 'warm_up', 'technical', 'possession', 'small_sided', 'tactical', 'finishing',
                 'crossing', 'speed', 'conditioning', 'strength', 'goalkeeper', 'cool_down')),
  intensity    smallint not null check (intensity between 1 and 10),
  sprint       numeric(3, 2) not null check (sprint between 0 and 1),
  hsr          numeric(3, 2) not null check (hsr between 0 and 1),
  cod          numeric(3, 2) not null check (cod between 0 and 1),
  jump         numeric(3, 2) not null check (jump between 0 and 1),
  contact      numeric(3, 2) not null check (contact between 0 and 1),
  strength     numeric(3, 2) not null check (strength between 0 and 1),
  ai_estimated boolean not null default false,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  -- Lets session_drills point at a drill and its owner together (same trick as training_sessions)
  unique (id, user_id)
);

create index custom_drills_user_idx on public.custom_drills (user_id, created_at);

create trigger custom_drills_row_cap before insert on public.custom_drills
  for each row execute function public.enforce_row_cap('500');

revoke all on public.custom_drills from public;
grant select on public.custom_drills to pitchsafe_app;
grant insert (name, description, category, intensity, sprint, hsr, cod, jump, contact, strength, ai_estimated)
  on public.custom_drills to pitchsafe_app;
grant update (archived_at) on public.custom_drills to pitchsafe_app;

alter table public.custom_drills enable row level security;

create policy custom_drills_owner on public.custom_drills
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);

-- AI estimate usage: one counter per player per day ----------------------------------

create table public.ai_usage (
  user_id   text not null default public.current_player_id()
              references public.profiles (user_id) on delete cascade,
  day       date not null,
  estimates smallint not null default 0 check (estimates between 0 and 1000),
  primary key (user_id, day)
);

revoke all on public.ai_usage from public;
grant select on public.ai_usage to pitchsafe_app;
grant insert (day, estimates) on public.ai_usage to pitchsafe_app;
grant update (estimates) on public.ai_usage to pitchsafe_app;

alter table public.ai_usage enable row level security;

create policy ai_usage_owner on public.ai_usage
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);

-- Sessions can log a custom drill instead of a built-in one -------------------------

alter table public.session_drills alter column drill_id drop not null;
alter table public.session_drills add column custom_drill_id uuid;

-- Each row is exactly one kind of drill
alter table public.session_drills
  add constraint session_drills_one_kind check ((drill_id is null) <> (custom_drill_id is null));

-- The composite key ties the drill to the same player as the row, so a player can never log
-- someone else's drill. It cascades on delete on purpose: the app role cannot delete custom
-- drills, so they only ever go with their profile. Deleting a profile cascades through
-- custom_drills and session_drills in the same statement, and a plain NO ACTION check could
-- fail there depending on which cascade Postgres fires first (account deletion must not
-- depend on that order).
alter table public.session_drills
  add constraint session_drills_custom_fk foreign key (custom_drill_id, user_id)
  references public.custom_drills (id, user_id) on delete cascade;

alter table public.session_drills
  add constraint session_drills_custom_once unique (session_id, custom_drill_id);

-- Deleting a custom drill (profile cascade) looks its rows up through this foreign key
create index session_drills_custom_drill_idx on public.session_drills (custom_drill_id, user_id)
  where custom_drill_id is not null;

grant insert (custom_drill_id) on public.session_drills to pitchsafe_app;
