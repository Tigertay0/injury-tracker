-- A player can keep 5000 sessions with up to 12 drills each, so the drill row cap must be
-- 5000 * 12. At 20000 the cap trips first and rolls back the whole session insert.
drop trigger session_drills_row_cap on public.session_drills;

create trigger session_drills_row_cap before insert on public.session_drills
  for each row execute function public.enforce_row_cap('60000');
