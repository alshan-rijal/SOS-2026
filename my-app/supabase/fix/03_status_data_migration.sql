-- 03_status_data_migration.sql
-- Purpose: move existing rows from the old vocabulary to the new one
--          (pending -> reported, resolved -> fixed) using status::text so it
--          works whether the column is an enum or text.
-- Run order: 03 (after 02; run alone, then 04).
-- safe to run twice: the updates only match the old values, which no longer
--                    exist after the first run.

-- pending -> reported
update public.reports set status = 'reported' where status::text = 'pending';

-- resolved -> fixed
update public.reports set status = 'fixed' where status::text = 'resolved';

-- Anything else that still holds an old value (defensive; 'in_progress' is valid
-- in both vocabularies and is left alone).
update public.reports set status = 'reported'
where status::text not in ('reported', 'under_verification', 'in_progress', 'fixed', 'cannot_fix');

-- Result: one row per status afterwards.
select 'after migration' as check, status::text as status, count(*) as rows
from public.reports
group by status::text
order by status::text;

-- Diagnostic: any policy, view or function definition in this database that
-- still compares the old literals. On a schema.sql-only database this returns
-- nothing; the app-side old literals live in lib/reports.js, not in SQL.
select 'uses old literal' as check, 'policy' as kind, tablename || '.' || policyname as name
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') ~* '''(pending|resolved)''' or coalesce(with_check, '') ~* '''(pending|resolved)''')
union all
select 'uses old literal', 'view', viewname
from pg_views
where schemaname = 'public' and definition ~* '''(pending|resolved)'''
union all
select 'uses old literal', 'function', p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and pg_get_functiondef(p.oid) ~* '''(pending|resolved)''';
