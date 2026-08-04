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

  status      text not null default 'pending'
              check (status in ('pending', 'ongoing', 'completed', 'archived')),
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high', 'critical')),
  type        text not null default 'web-app'
              check (type in ('website', 'web-app', 'mobile-app', 'ai-automation',
                              'api', 'internal-tool', 'other')),

  progress    integer not null default 0 check (progress between 0 and 100),

  start_date  date,
  due_date    date,

  created_at  timestamptz not null,
  updated_at  timestamptz not null,

  tech_stack  text[] not null default '{}',
  modules     text[] not null default '{}',
  tags        text[] not null default '{}',
  links       jsonb  not null default '{}'::jsonb,
  notes       text   not null default '',

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
