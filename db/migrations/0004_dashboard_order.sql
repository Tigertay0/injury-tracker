-- The order a player arranged their dashboard tiles in: tile ids, first to last. An empty
-- list means "the default order". The database only caps the length; which ids exist is
-- the app's business (it drops unknown ids and adds new tiles when it reads the list), so a
-- later release can add or remove a tile without a migration.

-- Fail fast instead of queueing behind a long transaction while profiles is altered below
-- (the migrator runs this file in one transaction).
set local lock_timeout = '5s';

alter table public.profiles add column dashboard_order text[] not null default '{}';

alter table public.profiles
  add constraint profiles_dashboard_order_cap check (cardinality(dashboard_order) <= 30);

-- Column-level, like the rest of the profile: the app role can change this and nothing new
grant update (dashboard_order) on public.profiles to pitchsafe_app;
