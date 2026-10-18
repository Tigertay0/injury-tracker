-- Archived custom drills are never deleted, so the row cap has to leave room for them on top of
-- the 100 active drills the API allows. At 500 a player who keeps archiving is locked out for good.
drop trigger custom_drills_row_cap on public.custom_drills;

create trigger custom_drills_row_cap before insert on public.custom_drills
  for each row execute function public.enforce_row_cap('5000');
