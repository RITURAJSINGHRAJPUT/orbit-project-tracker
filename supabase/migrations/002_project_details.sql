-- Orbit v2 — the project-management expansion.
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is guarded.
--
-- Why this is a separate file: supabase/schema.sql uses
-- `create table if not exists`, so re-running it does NOT add columns to an
-- existing table. schema.sql stays the canonical DDL for a *fresh* project and
-- has been updated in parallel; this file is what migrates a live one.

-- ── 1. Widen the enum CHECK constraints ──────────────────────────────────────
--
-- These were declared inline and unnamed, so Postgres auto-named them.
-- Verify with \d public.projects before running if you're unsure.

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in (
    'draft', 'requirement-gathering', 'planning', 'in-progress',
    'on-hold', 'testing', 'completed', 'cancelled', 'archived'
  ));

alter table public.projects drop constraint if exists projects_type_check;
alter table public.projects add constraint projects_type_check
  check (type in (
    'website', 'web-app', 'mobile-app', 'pwa', 'ai-automation',
    'api', 'design', 'internal-tool', 'other'
  ));

-- ── 2. Migrate existing status values ────────────────────────────────────────
-- Must run AFTER the constraint is widened, or the update violates the old one.
-- Mirrors V1_STATUS_MIGRATION in lib/db/dexie.ts — keep the two in step.

update public.projects set status = 'planning'    where status = 'pending';
update public.projects set status = 'in-progress' where status = 'ongoing';

alter table public.projects alter column status set default 'draft';

-- ── 3. New scalar columns ────────────────────────────────────────────────────

alter table public.projects
  add column if not exists poc_name          text not null default '',
  add column if not exists poc_phone         text not null default '',
  add column if not exists short_description text not null default '',
  add column if not exists requirements      text not null default '',
  add column if not exists deliverables      text not null default '',
  add column if not exists client_company    text not null default '',
  add column if not exists client_gst        text not null default '',
  add column if not exists client_address    text not null default '',
  add column if not exists client_website    text not null default '',
  add column if not exists client_notes      text not null default '',
  add column if not exists internal_notes    text not null default '',
  add column if not exists meeting_notes     text not null default '';

-- Dates stay `date`, not timestamptz: <input type="date"> round-trips
-- 'YYYY-MM-DD' exactly, while a timestamptz comes back with a time and offset
-- that empties the input.
alter table public.projects
  add column if not exists expected_end_date date,
  add column if not exists actual_end_date   date;

-- ── 4. New nested columns ────────────────────────────────────────────────────
--
-- jsonb, following the existing `links` column. The mapper passes these through
-- opaquely, so no per-key SQL is needed.
--
-- Note these are fixed-shape objects (four known phases, seven document slots),
-- NOT append-only lists. An append-only array here would be re-uploaded whole on
-- every edit, so activity/comments must become child tables instead.

alter table public.projects
  add column if not exists phases    jsonb not null default '{}'::jsonb,
  add column if not exists team      jsonb not null default '{}'::jsonb,
  add column if not exists documents jsonb not null default '{}'::jsonb,
  add column if not exists budget    jsonb not null default '{}'::jsonb;

-- ── 5. Backfill the nested defaults for existing rows ────────────────────────
-- The column default only applies to new rows, so existing ones need this.

update public.projects
set phases = jsonb_build_object(
  'discovery',   jsonb_build_object('status','not-started','startDate',null,'endDate',null,'progress',0,'notes',''),
  'design',      jsonb_build_object('status','not-started','startDate',null,'endDate',null,'progress',0,'notes',''),
  'development', jsonb_build_object('status','not-started','startDate',null,'endDate',null,'progress',0,'notes',''),
  'testing',     jsonb_build_object('status','not-started','startDate',null,'endDate',null,'progress',0,'notes','')
)
where phases = '{}'::jsonb;

update public.projects
set team = jsonb_build_object(
  'projectManager','', 'teamLead','', 'qa','',
  'developers', '[]'::jsonb, 'designers', '[]'::jsonb
)
where team = '{}'::jsonb;

update public.projects
set documents = jsonb_build_object(
  'proposal', jsonb_build_object('url',''),
  'nda',      jsonb_build_object('url',''),
  'brd',      jsonb_build_object('url',''),
  'design',   jsonb_build_object('url',''),
  'contract', jsonb_build_object('url',''),
  'invoice',  jsonb_build_object('url',''),
  'other',    jsonb_build_object('url','')
)
where documents = '{}'::jsonb;

update public.projects
set budget = jsonb_build_object('estimated', null, 'final', null, 'received', null)
where budget = '{}'::jsonb;
