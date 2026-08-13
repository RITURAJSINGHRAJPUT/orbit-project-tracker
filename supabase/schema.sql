-- Orbit — Supabase schema
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: everything is guarded with "if not exists" / "drop if exists".
--
-- Design notes that matter:
--
--   * `id` has NO default. Ids are UUID v4 generated on the client
--     (lib/store/useProjectStore.ts) so rows created offline carry a
--     collision-free primary key and upsert cleanly with no id remapping.
--
--   * `updated_at` has NO trigger, deliberately. Sync resolves conflicts
--     last-write-wins using the CLIENT's timestamp. A moddatetime trigger would
--     restamp every upsert with server time, making a stale offline edit look
--     newer than a recent one and silently corrupting merge order.
--
--   * `start_date` / `due_date` are `date`, not `timestamptz`. The form's
--     <input type="date"> produces 'YYYY-MM-DD'; a timestamptz column returns
--     '...T00:00:00+00:00', which breaks the date input on the way back and
--     shifts by timezone. `date` round-trips byte-identically.
--
--   * There is no `sync_status` column. That flag answers "is this row dirty on
--     THIS device", which is meaningless server-side.

create table if not exists public.projects (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,

  title       text not null,
  client      text not null default '',
  description text not null default '',

  status      text not null default 'draft'
              check (status in ('draft', 'requirement-gathering', 'planning', 'in-progress',
                                'on-hold', 'testing', 'completed', 'cancelled', 'archived')),
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high', 'critical')),
  type        text not null default 'web-app'
              check (type in ('website','web-app','mobile-app','pwa','ai-automation',
                              'api','design','internal-tool','other')),

  progress    integer not null default 0 check (progress between 0 and 100),

  poc_name          text not null default '',
  poc_phone         text not null default '',
  short_description text not null default '',
  requirements      text not null default '',
  deliverables      text not null default '',

  client_company    text not null default '',
  client_gst        text not null default '',
  client_address    text not null default '',
  client_website    text not null default '',
  client_notes      text not null default '',

  start_date        date,
  due_date          date,
  expected_end_date date,
  actual_end_date   date,

  created_at  timestamptz not null,
  updated_at  timestamptz not null,

  tech_stack  text[] not null default '{}',
  modules     text[] not null default '{}',
  tags        text[] not null default '{}',
  -- Fixed-shape nested objects, following the `links` precedent. Deliberately
  -- NOT append-only lists: the whole row re-uploads on every edit, so a growing
  -- array here would make upload cost grow with its length. Activity and
  -- comments therefore need child tables, not columns.
  links       jsonb  not null default '{}'::jsonb,
  phases      jsonb  not null default '{}'::jsonb,
  team        jsonb  not null default '{}'::jsonb,
  documents   jsonb  not null default '{}'::jsonb,
  budget      jsonb  not null default '{}'::jsonb,

  notes          text not null default '',
  internal_notes text not null default '',
  meeting_notes  text not null default '',

  -- Tombstone. Deletes are soft so they can propagate to other devices;
  -- a hard delete would simply resurrect on the next pull.
  deleted_at  timestamptz
);

-- The pull query is: where user_id = auth.uid() and updated_at > <watermark>
create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

-- Single-user app: you can only ever see and write your own rows. The anon key
-- is public by design — this policy is the actual security boundary.
drop policy if exists "own rows" on public.projects;
create policy "own rows" on public.projects
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Extra Working Hours
--
-- Kept in step with supabase/migrations/003_time_entries.sql, which is what
-- migrates a LIVE database — the `create table if not exists` above means
-- re-running this file never alters an existing one. See that migration for the
-- reasoning behind each convention.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.time_entries (
  id          uuid primary key,                    -- client-generated
  user_id     uuid not null references auth.users (id) on delete cascade,

  entry_date  date not null,
  project_id  uuid,                                -- deliberately not an FK

  work_type   text not null default 'development'
              check (work_type in ('development', 'meeting', 'support', 'deployment', 'other')),

  start_time  time,
  end_time    time,
  minutes     integer not null default 0 check (minutes >= 0),

  reason      text not null default '',
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),

  created_at  timestamptz not null,
  updated_at  timestamptz not null,                -- client-authoritative, NO trigger
  deleted_at  timestamptz
);

create index if not exists time_entries_user_updated_idx
  on public.time_entries (user_id, updated_at desc);
create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, entry_date desc);

alter table public.time_entries enable row level security;

drop policy if exists "own rows" on public.time_entries;
create policy "own rows" on public.time_entries
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
