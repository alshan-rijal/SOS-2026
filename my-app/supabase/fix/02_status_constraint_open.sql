-- 02_status_constraint_open.sql
-- Purpose: open the status constraint so every old *and* new value is accepted
--          during the switch, move the column default to 'reported', and add
--          the review columns migration 006 never created. No data is changed.
-- Run order: 02 (after 01; run alone, then 03).
-- safe to run twice: the check is dropped dynamically and re-added, the columns
--                    use add column if not exists, the default is re-set.

-- Drop every check constraint on reports whose definition mentions status,
-- whatever it is named, so a guessed name can never miss.
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

-- The permissive constraint: all seven values, old and new.
alter table public.reports
  add constraint reports_status_check
  check (status::text in (
    'pending', 'in_progress', 'resolved',
    'reported', 'under_verification', 'fixed', 'cannot_fix'
  ));

-- New reports start life as 'reported'.
alter table public.reports alter column status set default 'reported';

-- The review columns from migration 006. All nullable so existing rows stay valid.
alter table public.reports add column if not exists status_reason text;
alter table public.reports add column if not exists status_changed_at timestamptz;
alter table public.reports add column if not exists status_changed_by uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists verified_at timestamptz;
alter table public.reports add column if not exists verified_by uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists official_note text;
