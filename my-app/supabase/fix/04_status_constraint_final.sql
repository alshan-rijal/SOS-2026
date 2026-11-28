-- 04_status_constraint_final.sql
-- Purpose: close the constraint down to the five workflow values and require a
--          real reason for cannot_fix. Warns if any old value is left.
-- Run order: 04 (after 03; run alone, then 05).
-- safe to run twice: the check is dropped dynamically and re-added.

-- Warn (do not fail) if any row still holds an old value — run 03 first if so.
do $$
declare
  n bigint;
begin
  select count(*) into n
  from public.reports
  where status::text in ('pending', 'resolved');
  if n > 0 then
    raise notice 'reports still hold old status values (pending/resolved): % row(s). Run 03_status_data_migration.sql first.', n;
  end if;
end $$;

-- Drop every status-related check on reports dynamically (never by guessed name).
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.reports drop constraint %I', c.conname);
  end loop;
end $$;

-- The five workflow values only.
alter table public.reports
  add constraint reports_status_check
  check (status::text in (
    'reported', 'under_verification', 'in_progress', 'fixed', 'cannot_fix'
  ));

-- cannot_fix must carry a real reason (at least ten characters, trimmed).
alter table public.reports drop constraint if exists reports_cannot_fix_reason_check;
alter table public.reports
  add constraint reports_cannot_fix_reason_check
  check (status::text <> 'cannot_fix' or char_length(btrim(coalesce(status_reason, ''))) >= 10);
