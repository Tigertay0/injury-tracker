-- PitchSafe schema. Users sign in with Clerk; Supabase trusts Clerk session tokens
-- (third-party auth), so auth.jwt() ->> 'sub' is the Clerk user id on every row.
-- Every table is owner-only through RLS. The anon role gets nothing.

create or replace function public.clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '')
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
  user_id         text primary key default public.clerk_user_id(),
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
  user_id      text not null default public.clerk_user_id()
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
  user_id     text not null default public.clerk_user_id()
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
  user_id     text not null default public.clerk_user_id()
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

-- Privileges: least privilege per role, then RLS on top --------------------------

revoke all on public.profiles, public.training_sessions, public.recovery_checkins, public.injuries from anon, authenticated;

-- Inserts are column-level so clients cannot set ids, timestamps or the consent time
grant select, delete on public.profiles to authenticated;
grant insert (position, display_name, cleat_type, surface_type, consent_version, age_confirmed) on public.profiles to authenticated;
grant update (position, display_name, cleat_type, surface_type) on public.profiles to authenticated;

grant select, delete on public.training_sessions to authenticated;
grant insert (session_date, session_type, duration_min, rpe, notes) on public.training_sessions to authenticated;

grant select, delete on public.recovery_checkins to authenticated;
grant insert (week_start, sleep_hours, soreness, stress, nutrition) on public.recovery_checkins to authenticated;
-- week_start is included because an upsert sets every column it inserts (the value is unchanged)
grant update (week_start, sleep_hours, soreness, stress, nutrition) on public.recovery_checkins to authenticated;

grant select, delete on public.injuries to authenticated;
grant insert (body_part, injury_type, severity, injury_date, return_date) on public.injuries to authenticated;
grant update (return_date) on public.injuries to authenticated;

revoke execute on function public.clerk_user_id() from public, anon;
grant execute on function public.clerk_user_id() to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Per-player row caps, so the public Data API cannot be used to fill the database.
-- Far above real use: 5,000 sessions is about 13 years of daily training.
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
revoke execute on function public.enforce_row_cap() from public, anon, authenticated;

create trigger training_sessions_row_cap before insert on public.training_sessions
  for each row execute function public.enforce_row_cap('5000');
create trigger recovery_checkins_row_cap before insert on public.recovery_checkins
  for each row execute function public.enforce_row_cap('1000');
create trigger injuries_row_cap before insert on public.injuries
  for each row execute function public.enforce_row_cap('500');

alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.recovery_checkins enable row level security;
alter table public.injuries enable row level security;

-- Policies: (select ...) wrapper so the JWT is read once per statement, not per row

create policy "Players read their own profile" on public.profiles
  for select to authenticated using ((select public.clerk_user_id()) = user_id);
create policy "Players create their own profile" on public.profiles
  for insert to authenticated with check ((select public.clerk_user_id()) = user_id);
create policy "Players update their own profile" on public.profiles
  for update to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);
create policy "Players delete their own profile" on public.profiles
  for delete to authenticated using ((select public.clerk_user_id()) = user_id);

create policy "Players read their own sessions" on public.training_sessions
  for select to authenticated using ((select public.clerk_user_id()) = user_id);
create policy "Players log their own sessions" on public.training_sessions
  for insert to authenticated with check ((select public.clerk_user_id()) = user_id);
create policy "Players delete their own sessions" on public.training_sessions
  for delete to authenticated using ((select public.clerk_user_id()) = user_id);

create policy "Players read their own check-ins" on public.recovery_checkins
  for select to authenticated using ((select public.clerk_user_id()) = user_id);
create policy "Players add their own check-ins" on public.recovery_checkins
  for insert to authenticated with check ((select public.clerk_user_id()) = user_id);
create policy "Players update their own check-ins" on public.recovery_checkins
  for update to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);
create policy "Players delete their own check-ins" on public.recovery_checkins
  for delete to authenticated using ((select public.clerk_user_id()) = user_id);

create policy "Players read their own injuries" on public.injuries
  for select to authenticated using ((select public.clerk_user_id()) = user_id);
create policy "Players log their own injuries" on public.injuries
  for insert to authenticated with check ((select public.clerk_user_id()) = user_id);
create policy "Players update their own injuries" on public.injuries
  for update to authenticated
  using ((select public.clerk_user_id()) = user_id)
  with check ((select public.clerk_user_id()) = user_id);
create policy "Players delete their own injuries" on public.injuries
  for delete to authenticated using ((select public.clerk_user_id()) = user_id);
