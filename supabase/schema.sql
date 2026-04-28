-- GBC Timeline Supabase schema
-- Apply via Supabase Dashboard → SQL Editor (idempotent)

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

create index if not exists idx_comments_event_created
  on comments (event_id, created_at desc);

-- RLS
alter table participations enable row level security;
alter table participation_clients enable row level security;
alter table comments enable row level security;

-- Anon: read participations + comments. All writes go through service role (API routes).
drop policy if exists participations_read on participations;
create policy participations_read on participations
  for select using (true);

drop policy if exists comments_read on comments;
create policy comments_read on comments
  for select using (true);

-- No insert/update/delete policies for anon ⇒ default deny.
-- participation_clients is internal; no anon access.
