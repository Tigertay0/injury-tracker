-- Tighten the recovery check-in UPDATE grant.
--
-- 0001_init.sql granted UPDATE on week_start because an upsert was thought to need
-- it. Postgres only checks UPDATE on the columns named in DO UPDATE SET, and the
-- check-in upsert (worker/repo.ts saveCheckIn) never sets week_start, so the app
-- role does not need to change it. Dropping it also means a check-in can never be
-- moved to another week after it is saved.

revoke update (week_start) on public.recovery_checkins from pitchsafe_app;
