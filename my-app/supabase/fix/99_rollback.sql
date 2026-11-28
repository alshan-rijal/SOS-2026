-- 99_rollback.sql
-- WARNING: this undoes 04–07. It deletes the status history and the admin audit
-- log (their data is lost), removes the confidential flag, and moves status
-- values back to the old vocabulary. It never drops public.profiles or
-- public.reports and never removes enum values (Postgres cannot). Run the files
-- again (02 onward) to re-apply. One file per SQL Editor run.

-- ---------------------------------------------------------------------------
-- Drop the triggers created by 04–07.
-- ---------------------------------------------------------------------------
drop trigger if exists reports_log_status on public.reports;
drop trigger if exists reports_log_initial_status on public.reports;
drop trigger if exists reports_guard_review_fields on public.reports;
drop trigger if exists reports_block_admin_insert on public.reports;
drop trigger if exists report_verifications_block_admin_insert on public.report_verifications;

do $$
begin
  if to_regclass('public.event_participants') is not null then
    drop trigger if exists event_participants_block_admin_insert on public.event_participants;
  end if;
  if to_regclass('public.events') is not null then
    drop trigger if exists events_block_admin_insert on public.events;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Drop the storage policies and the confidential bucket created by 06.
-- ---------------------------------------------------------------------------
drop policy if exists "Confidential photos readable by owner and admins" on storage.objects;
drop policy if exists "Owners upload their confidential photos" on storage.objects;
drop policy if exists "Owners replace their confidential photos" on storage.objects;
drop policy if exists "Owners delete their confidential photos" on storage.objects;

delete from storage.buckets where id = 'issue-photos-confidential';

-- ---------------------------------------------------------------------------
-- Drop the policies created by 04–07 and restore the schema.sql baseline.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read the audit log" on public.admin_audit_log;
drop policy if exists "Admins can write the audit log" on public.admin_audit_log;

drop policy if exists "Reports are visible unless confidential" on public.reports;
drop policy if exists "Owners can update their reported reports" on public.reports;
drop policy if exists "Admins can update any report" on public.reports;
drop policy if exists "Owners can delete their reported reports" on public.reports;
drop policy if exists "Admins can delete any report" on public.reports;
drop policy if exists "Signed-in users can create reports" on public.reports;

drop policy if exists "Verified reports are visible" on public.report_verifications;
drop policy if exists "Verifications follow their report's visibility" on public.report_verifications;
drop policy if exists "Signed-in users can verify a visible report" on public.report_verifications;

drop policy if exists "Status history follows its report's visibility" on public.report_status_history;
drop policy if exists "Admins can add status history" on public.report_status_history;

create policy "Reports are publicly readable"
  on public.reports for select to anon, authenticated using (true);
create policy "Signed-in users can create reports"
  on public.reports for insert to authenticated with check (auth.uid() = user_id);
create policy "Reporters can update their own reports"
  on public.reports for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Reporters can delete their own reports"
  on public.reports for delete to authenticated using (auth.uid() = user_id);

create policy "Verifications are publicly readable"
  on public.report_verifications for select to anon, authenticated using (true);
create policy "Signed-in users can verify a report"
  on public.report_verifications for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can remove their own verification"
  on public.report_verifications for delete to authenticated using (auth.uid() = user_id);

create policy "Status history is publicly readable"
  on public.report_status_history for select to anon, authenticated using (true);
create policy "Reporters can add history to their own reports"
  on public.report_status_history for insert to authenticated
  with check (exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Drop the functions created by 04–07 (public.is_admin() is left: it came from
-- 001 and the events policies depend on it).
-- ---------------------------------------------------------------------------
drop function if exists public.reports_log_status();
drop function if exists public.reports_log_initial_status();
drop function if exists public.reports_guard_review_fields();
drop function if exists public.block_admin_write();
drop function if exists public.public_report_stats();

-- ---------------------------------------------------------------------------
-- Drop the tables and columns created by 05–07.
-- ---------------------------------------------------------------------------
drop table if exists public.admin_audit_log;
drop table if exists public.report_status_history;

drop index if exists public.reports_is_confidential_idx;
alter table public.reports drop column if exists is_confidential;

-- ---------------------------------------------------------------------------
-- Map the data back, then re-open the constraint to all seven values.
-- ---------------------------------------------------------------------------
update public.reports set status = 'pending'  where status::text = 'reported';
update public.reports set status = 'resolved' where status::text = 'fixed';

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

alter table public.reports
  add constraint reports_status_check
  check (status::text in (
    'pending', 'in_progress', 'resolved',
    'reported', 'under_verification', 'fixed', 'cannot_fix'
  ));

alter table public.reports alter column status set default 'pending';

-- Note: profiles.role and the reports review columns (status_reason, official_note,
-- status_changed_*, verified_*, resolved_at) are left in place — dropping them
-- would lose data and break public.is_admin().
