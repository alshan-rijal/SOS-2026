-- 01_enum_values.sql
-- Purpose: make sure the enum public.report_status contains the four new values.
--          Nothing else — this file must run on its own so the new labels are
--          committed before any later file uses them (Postgres cannot use a new
--          enum value in the same transaction that added it).
-- Run order: 01 (after 00; run alone, then 02).
-- safe to run twice: each add is guarded by a pg_enum check.

-- Add 'reported' if it is not already a label of public.report_status.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'report_status' and e.enumlabel = 'reported'
  ) then
    alter type public.report_status add value 'reported';
  end if;
end $$;

-- Add 'under_verification' if missing.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'report_status' and e.enumlabel = 'under_verification'
  ) then
    alter type public.report_status add value 'under_verification';
  end if;
end $$;

-- Add 'fixed' if missing.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'report_status' and e.enumlabel = 'fixed'
  ) then
    alter type public.report_status add value 'fixed';
  end if;
end $$;

-- Add 'cannot_fix' if missing.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'report_status' and e.enumlabel = 'cannot_fix'
  ) then
    alter type public.report_status add value 'cannot_fix';
  end if;
end $$;
