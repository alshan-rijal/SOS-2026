-- 00_diagnose.sql
-- Purpose: read-only snapshot of the report status schema before any fix.
-- Run order: 00 (run this first, then 01; one file per SQL Editor run).
-- safe to run twice: it only selects.

-- The enum's current labels (all seven should appear after 01).
select 'enum report_status' as check, enum_range(null::public.report_status) as value;

-- Is reports.status an enum or text?
select 'reports.status type' as check, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'reports' and column_name = 'status';

-- Every check constraint on reports, with its definition and column.
select 'reports check' as check, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.reports'::regclass and contype = 'c'
order by conname;

-- How many rows hold each status today.
select 'status counts' as check, status::text as status, count(*) as rows
from public.reports
group by status::text
order by status::text;

-- Triggers, policies and views that touch reports.
select 'reports trigger' as check, tgname as name
from pg_trigger
where tgrelid = 'public.reports'::regclass and not tgisinternal
order by tgname;

select 'policy' as check, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('reports', 'report_status_history', 'report_verifications')
order by tablename, policyname;

select 'view' as check, viewname as name
from pg_views
where schemaname = 'public'
order by viewname;

-- Who is an admin (needed for the "promote an admin" step).
select 'admin' as check, id, full_name, role
from public.profiles
where role = 'admin'
order by full_name;

-- Which of the objects the fix files create already exist.
select 'object exists' as check,
       to_regclass('public.report_status_history') as report_status_history,
       to_regclass('public.report_verifications') as report_verifications,
       to_regclass('public.admin_audit_log') as admin_audit_log;

-- Which of the new report columns already exist.
select 'report column' as check, column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'reports'
  and column_name in ('is_confidential', 'status_reason', 'official_note',
                      'status_changed_at', 'status_changed_by', 'verified_at',
                      'verified_by', 'resolved_at')
order by column_name;
