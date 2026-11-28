-- supabase/migrations/20261128_002_events_tables.sql
-- Purpose: create the events tables and their indexes. Column names match
--          lib/events/supabase.js exactly.
-- Run order: 2 of 5.
-- safe to run twice

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null default '',
  description text not null default '',
  event_date date not null,
  start_time time not null,
  end_time time not null,
  address text not null default '',
  ward text not null default '',
  latitude double precision,
  longitude double precision,
  radius_m integer not null default 150,
  max_participants integer,
  what_to_bring text not null default '',
  cover_url text,
  organization_name text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  status text not null default 'pending_review',
  review_notes text,
  rejection_reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tolerate a partial events table created by an earlier pass: add every column
-- that could be missing. On a fresh table these are all no-ops.
alter table public.events add column if not exists organizer_id uuid;
alter table public.events add column if not exists type text;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists event_date date;
alter table public.events add column if not exists start_time time;
alter table public.events add column if not exists end_time time;
alter table public.events add column if not exists address text;
alter table public.events add column if not exists ward text;
alter table public.events add column if not exists latitude double precision;
alter table public.events add column if not exists longitude double precision;
alter table public.events add column if not exists radius_m integer;
alter table public.events add column if not exists max_participants integer;
alter table public.events add column if not exists what_to_bring text;
alter table public.events add column if not exists cover_url text;
alter table public.events add column if not exists organization_name text;
alter table public.events add column if not exists contact_name text;
alter table public.events add column if not exists contact_phone text;
alter table public.events add column if not exists contact_email text;
alter table public.events add column if not exists status text;
alter table public.events add column if not exists review_notes text;
alter table public.events add column if not exists rejection_reason text;
alter table public.events add column if not exists reviewed_by uuid;
alter table public.events add column if not exists reviewed_at timestamptz;
alter table public.events add column if not exists submitted_at timestamptz;
alter table public.events add column if not exists created_at timestamptz;
alter table public.events add column if not exists updated_at timestamptz;

-- Value and range checks, each added only once.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_type_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_type_check check (
      type in (
        'blood_donation', 'tree_plantation', 'flower_plantation', 'cleanliness',
        'food_donation', 'clothes_donation', 'health_camp', 'awareness', 'other'
      )
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_status_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_status_check check (
      status in (
        'draft', 'pending_review', 'changes_requested',
        'approved', 'rejected', 'cancelled'
      )
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_latitude_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_latitude_check check (latitude is null or latitude between -90 and 90);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_longitude_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_longitude_check check (longitude is null or longitude between -180 and 180);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_radius_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_radius_check check (radius_m between 50 and 500);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'events_time_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_time_check check (end_time > start_time);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- event_applications: the private review answers, one row per event.
-- ---------------------------------------------------------------------------
create table if not exists public.event_applications (
  event_id uuid primary key references public.events (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  document_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_applications add column if not exists answers jsonb;
alter table public.event_applications add column if not exists document_paths text[];
alter table public.event_applications add column if not exists created_at timestamptz;
alter table public.event_applications add column if not exists updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- event_participants: one row per person who joined an event.
-- ---------------------------------------------------------------------------
create table if not exists public.event_participants (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_participants add column if not exists created_at timestamptz;

-- ---------------------------------------------------------------------------
-- event_status_history: the review timeline shown on My events.
-- ---------------------------------------------------------------------------
create table if not exists public.event_status_history (
  id bigint generated by default as identity primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.event_status_history add column if not exists from_status text;
alter table public.event_status_history add column if not exists to_status text;
alter table public.event_status_history add column if not exists changed_by uuid;
alter table public.event_status_history add column if not exists note text;
alter table public.event_status_history add column if not exists created_at timestamptz;

-- ---------------------------------------------------------------------------
-- notifications: written only by trigger (see 004). Read and dismissed by the
-- owner in the header bell.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists events_status_event_date_idx on public.events (status, event_date);
create index if not exists events_organizer_id_idx on public.events (organizer_id);
create index if not exists event_participants_user_id_idx on public.event_participants (user_id);
create index if not exists notifications_user_id_read_at_idx on public.notifications (user_id, read_at);
