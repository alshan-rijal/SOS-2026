-- supabase/rollback/20261128_006_008_rollback.sql
-- Purpose: undo migrations 006, 007 and 008 in reverse order.
-- Run order: run by itself, after the three migrations, as one script.
-- safe to run twice
--
-- WARNING
-- -------
-- This maps the five workflow statuses back to the original three
-- (reported -> pending, fixed -> resolved, under_verification/cannot_fix -> pending)
-- so the old app keeps working. It does NOT delete profiles, reports, report
-- history, verifications or storage objects. No user data is dropped.
--
-- The original reports.status / report_status_history.status enum type
-- (public.report_status) is NOT restored: the columns stay `text`, because
-- recreating an enum that no longer covers the data would fail. The old app
-- compares status by value, so text is fine.
--
-- The private issue-photos-confidential bucket is dropped, along with any files
-- it holds. Export the confidential photos first if you need them.

-- ---------------------------------------------------------------------------
-- 008: audit table, its trigger and the extra indexes.
-- ---------------------------------------------------------------------------
drop trigger if exists reports_audit_changes on public.reports;
drop function if exists public.reports_audit_changes();

drop policy if exists "Admins can read the audit log" on public.admin_audit_log;
drop policy if exists "Admins can write the audit log" on public.admin_audit_log;
drop table if exists public.admin_audit_log;

drop index if exists public.reports_created_at_asc_idx;
drop index if exists public.reports_status_created_idx;

-- ---------------------------------------------------------------------------
-- 007: confidential flag, its policies, the stats function and the bucket.
-- ---------------------------------------------------------------------------
-- Put the old permissive policies back before removing the column they key on.
drop policy if exists "Reports are visible unless confidential" on public.reports;
drop policy if exists "Owners can update their reported reports" on public.reports;
drop policy if exists "Admins can update any report" on public.reports;
drop policy if exists "Owners can delete their reported reports" on public.reports;
drop policy if exists "Admins can delete any report" on public.reports;

create policy "Reports are publicly readable"
  on public.reports for select to anon, authenticated using (true);

create policy "Signed-in users can create reports"
  on public.reports for insert to authenticated with check (auth.uid() = user_id);

create policy "Reporters can update their own reports"
  on public.reports for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Reporters can delete their own reports"
  on public.reports for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Verifications follow their report's visibility" on public.report_verifications;
drop policy if exists "Signed-in users can verify a visible report" on public.report_verifications;
create policy "Verifications are publicly readable"
  on public.report_verifications for select to anon, authenticated using (true);
create policy "Signed-in users can verify a report"
  on public.report_verifications for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Status history follows its report's visibility" on public.report_status_history;
create policy "Status history is publicly readable"
  on public.report_status_history for select to anon, authenticated using (true);

drop function if exists public.public_report_stats();

drop policy if exists "Confidential photos readable by owner and admins" on storage.objects;
drop policy if exists "Owners upload their confidential photos" on storage.objects;
drop policy if exists "Owners replace their confidential photos" on storage.objects;
drop policy if exists "Owners delete their confidential photos" on storage.objects;
delete from storage.objects where bucket_id = 'issue-photos-confidential';
delete from storage.buckets where id = 'issue-photos-confidential';

drop index if exists public.reports_is_confidential_idx;
alter table public.reports drop column if exists is_confidential;

-- ---------------------------------------------------------------------------
-- 006: triggers, check constraints, review columns and history columns.
-- ---------------------------------------------------------------------------
drop trigger if exists reports_log_status on public.reports;
drop function if exists public.reports_log_status();

drop trigger if exists reports_guard_review_fields on public.reports;
drop function if exists public.reports_guard_review_fields();

drop function if exists public.report_status_rank(text);

-- Map statuses back to the original three.
update public.reports set status = 'pending' where status in ('reported', 'under_verification', 'cannot_fix');
update public.reports set status = 'resolved' where status = 'fixed';
update public.report_status_history set status = 'pending' where status in ('reported', 'under_verification', 'cannot_fix');
update public.report_status_history set status = 'resolved' where status = 'fixed';

alter table public.reports drop constraint if exists reports_cannot_fix_reason_check;
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check check (status in ('pending', 'in_progress', 'resolved'));
alter table public.reports alter column status set default 'pending';

alter table public.report_status_history drop column if exists from_status;
alter table public.report_status_history drop column if exists to_status;
alter table public.report_status_history drop column if exists reason;
alter table public.report_status_history drop column if exists changed_by;

alter table public.reports drop column if exists status_reason;
alter table public.reports drop column if exists status_changed_at;
alter table public.reports drop column if exists status_changed_by;
alter table public.reports drop column if exists verified_at;
alter table public.reports drop column if exists verified_by;
alter table public.reports drop column if exists resolved_at;
alter table public.reports drop column if exists official_note;

-- profiles.role and public.is_admin() predate 006 (they come from 001) and are
-- deliberately left in place.
