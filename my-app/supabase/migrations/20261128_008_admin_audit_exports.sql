-- supabase/migrations/20261128_008_admin_audit_exports.sql
-- Purpose: the admin audit trail. Every status change and confidential-flag
--          change is logged by a trigger; the app writes the export entries.
--          Adds the indexes the admin reports table filters and sorts on.
-- Run order: 8 of 8 (after 20261128_007_report_confidential.sql).
-- safe to run twice

-- ---------------------------------------------------------------------------
-- admin_audit_log: append-only from the app's point of view (no update/delete).
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity, entity_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins can read the audit log" on public.admin_audit_log;
create policy "Admins can read the audit log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can write the audit log" on public.admin_audit_log;
create policy "Admins can write the audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check (public.is_admin());

grant select, insert on public.admin_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: log status and confidential-flag changes. (The app records exports
-- itself, because a row count and filter set are only known there.)
-- Keep this separate from reports_log_status so each trigger stays single-purpose.
-- ---------------------------------------------------------------------------
create or replace function public.reports_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.admin_audit_log (admin_id, action, entity, entity_id, details)
    values (
      auth.uid(), 'report.status_change', 'report', new.id,
      jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.status_reason)
    );
  end if;

  if new.is_confidential is distinct from old.is_confidential then
    insert into public.admin_audit_log (admin_id, action, entity, entity_id, details)
    values (
      auth.uid(), 'report.confidential_change', 'report', new.id,
      jsonb_build_object('is_confidential', new.is_confidential)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists reports_audit_changes on public.reports;
create trigger reports_audit_changes
  after update on public.reports
  for each row execute function public.reports_audit_changes();

-- ---------------------------------------------------------------------------
-- Indexes for the admin reports table (filter by status, sort by created_at).
-- ---------------------------------------------------------------------------
create index if not exists reports_created_at_asc_idx on public.reports (created_at);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
