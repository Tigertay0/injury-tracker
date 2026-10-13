-- Drills done in a training session. Built-in drill ids come from shared/drills.ts.
-- The composite foreign key ties every row to a session owned by the same player,
-- so a player can never attach drills to someone else's session.

alter table public.training_sessions
  add constraint training_sessions_id_user_key unique (id, user_id);

create table public.session_drills (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.current_player_id()
                references public.profiles (user_id) on delete cascade,
  session_id  uuid not null,
  drill_id    text not null check (drill_id ~ '^[a-z0-9_]{2,40}$'),
  minutes     smallint not null check (minutes between 1 and 300),
  created_at  timestamptz not null default now(),
  foreign key (session_id, user_id) references public.training_sessions (id, user_id) on delete cascade,
  unique (session_id, drill_id)
);

create index session_drills_user_session_idx on public.session_drills (user_id, session_id);

create trigger session_drills_row_cap before insert on public.session_drills
  for each row execute function public.enforce_row_cap('20000');

revoke all on public.session_drills from public;
grant select, delete on public.session_drills to pitchsafe_app;
grant insert (session_id, drill_id, minutes) on public.session_drills to pitchsafe_app;

alter table public.session_drills enable row level security;

create policy session_drills_owner on public.session_drills
  for all to pitchsafe_app
  using ((select public.current_player_id()) = user_id)
  with check ((select public.current_player_id()) = user_id);
