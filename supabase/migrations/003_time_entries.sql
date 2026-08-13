-- Orbit — Extra Working Hours.
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run. The same DDL is appended to supabase/schema.sql, which is the
-- canonical script for a FRESH project — schema.sql uses
-- `create table if not exists`, so it never modifies a live database.
--
-- Conventions inherited from public.projects, all deliberate:
--
--   * `id` has NO default — ids are client-generated UUID v4, so a row created
--     offline upserts with no remapping.
--   * `updated_at` has NO trigger — sync resolves conflicts last-write-wins on
--     the CLIENT's timestamp. A moddatetime trigger would restamp every upsert
--     with server time and corrupt the merge order.
--   * `entry_date` is `date` and the clock fields are `time`, matching what
--     <input type="date"> and <input type="time"> round-trip. A timestamptz
--     comes back with an offset that empties the input.
--   * There is no `sync_status` column — that flag answers "is this row dirty on
--     THIS device", which is meaningless server-side.

create table if not exists public.time_entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,

  entry_date  date not null,

  -- Intentionally NOT a foreign key to public.projects.
  -- Push order isn't guaranteed across tables, so a pull can deliver an entry
  -- before its project row exists. A real FK would reject the whole upsert
  -- chunk; the UI tolerates an id that doesn't resolve instead.
  project_id  uuid,

  work_type   text not null default 'development'
              check (work_type in ('development', 'meeting', 'support', 'deployment', 'other')),

  start_time  time,
  end_time    time,

  -- Computed on the client and stored. NOT a generated column: toRow sends
  -- every key explicitly and PostgREST rejects writes to generated columns.
  -- It also has to survive an overnight shift (19:10 → 02:00 = 410 minutes),
  -- which a naive end-minus-start in SQL would get wrong.
  minutes     integer not null default 0 check (minutes >= 0),

  reason      text not null default '',

  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),

  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz
);

-- The sync pull: where user_id = auth.uid() and updated_at > <watermark>
create index if not exists time_entries_user_updated_idx
  on public.time_entries (user_id, updated_at desc);

-- The month view: where user_id = auth.uid() and entry_date between ...
create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, entry_date desc);

alter table public.time_entries enable row level security;

-- Same boundary as projects: the anon key is public by design, so this policy
-- is the actual security control.
drop policy if exists "own rows" on public.time_entries;
create policy "own rows" on public.time_entries
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
