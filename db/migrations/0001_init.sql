-- PitchSafe schema for Neon Postgres.
--
-- The Worker connects as the database owner (through Cloudflare Hyperdrive), and for
-- every request opens a transaction that runs
--   SET LOCAL ROLE pitchsafe_app;
--   SELECT set_config('app.user_id', <verified Clerk user id>, true);
-- pitchsafe_app owns nothing and cannot bypass RLS, so every query is limited to the
-- caller's rows by the policies below, even if application code forgot a filter.

create or replace function public.current_player_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.user_id', true), '')
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles ---------------------------------------------------------------------

create table public.profiles (
  user_id         text primary key default public.current_player_id() check (char_length(user_id) between 1 and 64),
  position        text check (position in ('GK', 'DEF', 'MID', 'FWD')),
  display_name    text not null default '' check (char_length(display_name) <= 40),
  cleat_type      text check (cleat_type in ('FG_BLADED', 'FG_CONICAL', 'AG', 'SG', 'MG', 'INDOOR')),
  surface_type    text check (surface_type in ('NATURAL_GOOD', 'NATURAL_POOR', '3G_TURF', '2G_TURF', 'HARD_GROUND', 'INDOOR')),
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  consented_at    timestamptz not null default now(),
  age_confirmed   boolean not null check (age_confirmed),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Training sessions ------------------------------------------------------------

create table public.training_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default public.current_player_id()
                 references public.profiles (user_id) on delete cascade,
  session_date date not null check (session_date between date '1990-01-01' and current_date + 2),
  session_type text not null check (session_type in ('training', 'match', 'gym')),
  duration_min smallint not null check (duration_min between 1 and 300),
  rpe          smallint not null check (rpe between 1 and 10),
  load         integer generated always as (duration_min * rpe) stored,
  notes        text not null default '' check (char_length(notes) <= 500),
  created_at   timestamptz not null default now()
);

create index training_sessions_user_date_idx
  on public.training_sessions (user_id, session_date desc, created_at desc);

-- Weekly recovery check-ins (one per player per week) ---------------------------
-- The score is generated from the answers so it can never disagree with them (PRD 2.2.3).

create table public.recovery_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.current_player_id()
                references public.profiles (user_id) on delete cascade,
  week_start  date not null check (extract(isodow from week_start) = 1 and week_start between date '1990-01-01' and current_date + 9),
  sleep_hours numeric(3, 1) not null check (sleep_hours between 0 and 12),
  soreness    smallint not null check (soreness between 1 and 10),
  stress      smallint not null check (stress between 1 and 10),
  nutrition   smallint not null check (nutrition between 1 and 10),
  score       numeric(3, 1) generated always as (
                round(
                  (
                    (case
                       when sleep_hours >= 8 then 10
                       when sleep_hours >= 7 then 8
                       when sleep_hours >= 6 then 5
                       else 2
                     end)
                    + (10 - soreness) + (10 - stress) + nutrition
                  )::numeric / 4,
                  1
                )
              ) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create trigger recovery_checkins_set_updated_at
  before update on public.recovery_checkins
  for each row execute function public.set_updated_at();

-- Injury history -----------------------------------------------------------------

create table public.injuries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.current_player_id()
                references public.profiles (user_id) on delete cascade,
  body_part   text not null check (body_part in (
                'Head', 'Neck', 'Shoulder (L)', 'Shoulder (R)', 'Wrist (L)', 'Wrist (R)', 'Lower back', 'Groin',
                'Hip (L)', 'Hip (R)', 'Quadriceps (L)', 'Quadriceps (R)', 'Hamstring (L)', 'Hamstring (R)',
                'Knee (L)', 'Knee (R)', 'Calf (L)', 'Calf (R)', 'Ankle (L)', 'Ankle (R)', 'Foot (L)', 'Foot (R)')),
  injury_type text not null check (injury_type in ('Strain', 'Sprain', 'Tear', 'Fracture', 'Contusion', 'Other')),
  severity    text not null check (severity in ('mild', 'moderate', 'severe')),
  injury_date date not null check (injury_date between date '1990-01-01' and current_date + 2),
  return_date date check (return_date is null or (return_date >= injury_date and return_date <= current_date + 367)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index injuries_user_date_idx on public.injuries (user_id, injury_date desc);

create trigger injuries_set_updated_at
  before update on public.injuries
  for each row execute function public.set_updated_at();

-- Per-player row caps, far above real use (5,000 sessions is about 13 years of daily training)

create or replace function public.enforce_row_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer := tg_argv[0]::integer;
  n integer;
begin
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name) into n using new.user_id;
  if n >= cap then
    raise exception 'Row limit reached for this account' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger training_sessions_row_cap before insert on public.training_sessions
  for each row execute function public.enforce_row_cap('5000');
create trigger recovery_checkins_row_cap before insert on public.recovery_checkins
  for each row execute function public.enforce_row_cap('1000');
create trigger injuries_row_cap before insert on public.injuries
  for each row execute function public.enforce_row_cap('500');

-- The restricted role the Worker switches to for player queries ---------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'pitchsafe_app') then
    create role pitchsafe_app nologin nobypassrls noinherit;
  end if;
end;
$$;

-- The migrating (owner) role must be able to SET ROLE to it
grant pitchsafe_app to current_user;

revoke all on public.profiles, public.training_sessions, public.recovery_checkins, public.injuries from public;
revoke all on function public.current_player_id(), public.set_updated_at(), public.enforce_row_cap() from public;
grant usage on schema public to pitchsafe_app;
grant execute on function public.current_player_id() to pitchsafe_app;

-- Least privilege: inserts are column-level so ids, timestamps and the consent time
-- cannot be set by the application
grant select, delete on public.profiles to pitchsafe_app;
grant insert (user_id, position, display_name, cleat_type, surface_type, consent_version, age_confirmed) on public.profiles to pitchsafe_app;
grant update (position, display_name, cleat_type, surface_type) on public.profiles to pitchsafe_app;

grant select, delete on public.training_sessions to pitchsafe_app;
grant insert (session_date, session_type, duration_min, rpe, notes) on public.training_sessions to pitchsafe_app;

grant select, delete on public.recovery_checkins to pitchsafe_app;
grant insert (week_start, sleep_hours, soreness, stress, nutrition) on public.recovery_checkins to pitchsafe_app;
-- week_start is included because an upsert sets every column it inserts (the value is unchanged)
grant update (week_start, sleep_hours, soreness, stress, nutrition) on public.recovery_checkins to pitchsafe_app;

grant select, delete on public.injuries to pitchsafe_app;
grant insert (body_part, injury_type, severity, injury_date, return_date) on public.injuries to pitchsafe_app;
grant update (return_date) on public.injuries to pitchsafe_app;

-- Row-level security: every policy keys on the player id set for the transaction

alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.recovery_checkins enable row level security;
alter table public.injuries enable row level security;

create policy profiles_owner on public.profiles
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);

create policy training_sessions_owner on public.training_sessions
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);

create policy recovery_checkins_owner on public.recovery_checkins
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);

create policy injuries_owner on public.injuries
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);
