-- 08_verify.sql
-- Purpose: read-only proof that 01–07 landed. Every query should return what the
--          comment above it says.
-- Run order: 08 (after 07). Re-run any time.
-- safe to run twice: it only selects.

-- All seven labels present.
select 'enum' as check, enum_range(null::public.report_status) as value;

-- Two named constraints on reports: the five-value check and the reason check.
select 'constraint' as check, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.reports'::regclass and contype = 'c'
order by conname;

-- No row should show pending or resolved any more.
select 'status counts' as check, status::text as status, count(*) as rows
from public.reports
group by status::text
order by status::text;

-- All review columns present.
select 'column' as check, column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'reports'
  and column_name in ('status_reason', 'status_changed_at', 'status_changed_by',
                      'verified_at', 'verified_by', 'resolved_at', 'official_note',
                      'is_confidential')
order by column_name;

-- The four triggers on reports.
select 'trigger' as check, tgname as name
from pg_trigger
where tgrelid = 'public.reports'::regclass and not tgisinternal
order by tgname;

-- The policy set on reports.
select 'policy' as check, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'reports'
order by policyname;

-- The history table exists with the app's columns.
select 'history column' as check, column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'report_status_history'
order by column_name;

-- Admins (use one of these ids to promote, see README).
select 'admin' as check, id, full_name, role
from public.profiles
where role = 'admin'
order by full_name;

-- Manual smoke test — uncomment, replace the id, run. Expect one row with the
-- new status; then set it back. (Never leave the row moved.)
-- update public.reports set status = 'under_verification'
-- where id = '<report id>' returning id, status;
