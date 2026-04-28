-- Schema mirrors supabase/schema.sql; kept in sync for docker-compose bootstrap.
-- (The canonical copy is supabase/schema.sql for hosted Supabase; this file
-- runs once on a fresh local Postgres volume.)

create extension if not exists "pgcrypto";

create table if not exists participations (
  event_id text primary key,
  count    integer not null default 0
);

create table if not exists participation_clients (
  event_id   text not null,
  client_id  uuid not null,
  created_at timestamptz not null default now(),
  unique (event_id, client_id)
);

create index if not exists idx_participation_clients_event
  on participation_clients (event_id);

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null,
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table comments add column if not exists client_id uuid;

create index if not exists idx_comments_event_created
  on comments (event_id, created_at desc);

create index if not exists idx_comments_client_created
  on comments (client_id, created_at desc);

alter table participations enable row level security;
alter table participation_clients enable row level security;
alter table comments enable row level security;

drop policy if exists participations_read on participations;
create policy participations_read on participations
  for select using (true);

drop policy if exists comments_read on comments;
create policy comments_read on comments
  for select using (true);

-- Grants: anon reads counts + comments; service_role does everything via API routes.
grant select on participations, comments to anon;
grant all on participations, participation_clients, comments to service_role;

-- Aggregated view: derives per-event counts from participation_clients atomically.
-- Eliminates the read-modify-write race in the participate API.
create or replace view participation_counts as
  select event_id, count(*)::int as count
  from participation_clients
  group by event_id;

grant select on participation_counts to anon, authenticated, service_role;
