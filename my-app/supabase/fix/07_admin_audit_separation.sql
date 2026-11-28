-- 07_admin_audit_separation.sql
-- Purpose: the admin audit trail, the indexes the admin filters use, guards that
--          stop admin accounts filing public reports, and a stricter
--          verification policy.
-- Run order: 07 (after 06; run alone, then 08).
-- safe to run twice: create table if not exists, create or replace,
--                    drop trigger/policy if exists before create.

-- ---------------------------------------------------------------------------
-- admin_audit_log — append-only: admins read and insert, nobody updates/deletes.
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
-- Indexes for the admin reports table.
-- ---------------------------------------------------------------------------
create index if not exists reports_created_at_asc_idx on public.reports (created_at);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Guard: an admin account may not file public content. No guard for the SQL
-- Editor / service role (auth.uid() is null). One function, the noun passed as
-- a trigger argument.
-- ---------------------------------------------------------------------------
create or replace function public.block_admin_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_admin() then
    raise exception 'Admin accounts cannot %', coalesce(TG_ARGV[0], 'file reports');
  end if;
  return new;
end;
$$;

-- reports (always present)
drop trigger if exists reports_block_admin_insert on public.reports;
create trigger reports_block_admin_insert
  before insert on public.reports
  for each row execute function public.block_admin_write('file reports');

-- report_verifications (always present)
drop trigger if exists report_verifications_block_admin_insert on public.report_verifications;
create trigger report_verifications_block_admin_insert
  before insert on public.report_verifications
  for each row execute function public.block_admin_write('verify reports');

-- event_participants and events only if the events migrations ran.
do $$
begin
  if to_regclass('public.event_participants') is not null then
    drop trigger if exists event_participants_block_admin_insert on public.event_participants;
    create trigger event_participants_block_admin_insert
      before insert on public.event_participants
      for each row execute function public.block_admin_write('join events');
  end if;

  if to_regclass('public.events') is not null then
    drop trigger if exists events_block_admin_insert on public.events;
    create trigger events_block_admin_insert
      before insert on public.events
      for each row execute function public.block_admin_write('create events');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verification insert policy: own row, not an admin, visible report, not your own.
-- ---------------------------------------------------------------------------
drop policy if exists "Signed-in users can verify a report" on public.report_verifications;
drop policy if exists "Signed-in users can verify a visible report" on public.report_verifications;
create policy "Signed-in users can verify a visible report"
  on public.report_verifications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_admin()
    and exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.is_confidential = false or public.is_admin())
        and r.user_id is distinct from auth.uid()
    )
  );
